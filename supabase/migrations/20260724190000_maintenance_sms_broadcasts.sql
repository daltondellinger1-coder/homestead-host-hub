CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- A dispatch roster needs more than one active person per trade. Ranking is
-- still useful in the UI, but it must not limit a trade to one primary and one
-- backup record.
DROP INDEX IF EXISTS public.vendors_active_trade_rank_unique;
CREATE INDEX IF NOT EXISTS vendors_active_trade_rank_idx
  ON public.vendors (lower(trade), vendor_rank)
  WHERE active = true;

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS sms_consent_status text NOT NULL DEFAULT 'unknown'
    CHECK (sms_consent_status IN ('unknown', 'consented', 'opted_out')),
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_opted_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_consent_notes text;

CREATE TABLE IF NOT EXISTS public.maintenance_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'filled', 'cancelled', 'expired', 'delivery_failed')),
  max_authorized_cost numeric(12,2) NOT NULL CHECK (max_authorized_cost >= 0),
  manager_note text,
  expires_at timestamptz NOT NULL,
  accepted_vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status = 'filled' AND accepted_vendor_id IS NOT NULL AND accepted_at IS NOT NULL)
    OR status <> 'filled'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS maintenance_broadcasts_one_open_per_request
  ON public.maintenance_broadcasts (request_id)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS maintenance_broadcasts_request_created_idx
  ON public.maintenance_broadcasts (request_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.maintenance_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.maintenance_broadcasts(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  recipient_name text NOT NULL,
  recipient_phone_e164 text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'lost', 'declined', 'cancelled', 'expired', 'send_failed')),
  initial_message_status text NOT NULL DEFAULT 'queued'
    CHECK (initial_message_status IN ('queued', 'sending', 'sent', 'failed', 'skipped')),
  initial_provider_message_id text,
  initial_sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS maintenance_offers_broadcast_status_idx
  ON public.maintenance_offers (broadcast_id, status);

CREATE TABLE IF NOT EXISTS public.maintenance_sms_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.maintenance_broadcasts(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.maintenance_offers(id) ON DELETE CASCADE,
  recipient_phone_e164 text NOT NULL,
  message_kind text NOT NULL
    CHECK (message_kind IN ('job_offer', 'winner_confirmation', 'job_filled', 'broadcast_cancelled')),
  message_body text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_sms_outbox_dispatch_idx
  ON public.maintenance_sms_outbox (status, next_attempt_at, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS maintenance_sms_outbox_one_kind_per_offer
  ON public.maintenance_sms_outbox (offer_id, message_kind)
  WHERE offer_id IS NOT NULL;

ALTER TABLE public.maintenance_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_sms_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operations staff read maintenance broadcasts"
ON public.maintenance_broadcasts FOR SELECT TO authenticated
USING (public.has_any_role(ARRAY['admin', 'property_manager']));

CREATE POLICY "Operations staff read maintenance offers"
ON public.maintenance_offers FOR SELECT TO authenticated
USING (public.has_any_role(ARRAY['admin', 'property_manager']));

CREATE POLICY "Operations staff read maintenance SMS delivery"
ON public.maintenance_sms_outbox FOR SELECT TO authenticated
USING (public.has_any_role(ARRAY['admin', 'property_manager']));

-- The winner is selected in one database transaction. A repeated click from
-- the winner is idempotent, while every other offer receives already_filled.
-- Winner and loser SMS messages are placed in the durable outbox in the same
-- transaction as the assignment.
CREATE OR REPLACE FUNCTION public.accept_maintenance_offer(_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer public.maintenance_offers;
  v_broadcast public.maintenance_broadcasts;
  v_vendor public.vendors;
  v_request public.maintenance_requests;
  v_unit_name text;
  v_winner_name text;
  v_now timestamptz := now();
  v_updated_id uuid;
BEGIN
  SELECT o.* INTO v_offer
    FROM public.maintenance_offers o
   WHERE o.token_hash = _token_hash
   FOR UPDATE;

  IF v_offer.id IS NULL THEN
    RETURN jsonb_build_object('result', 'invalid');
  END IF;

  SELECT * INTO v_broadcast
    FROM public.maintenance_broadcasts
   WHERE id = v_offer.broadcast_id
   FOR UPDATE;

  SELECT * INTO v_vendor FROM public.vendors WHERE id = v_offer.vendor_id;
  SELECT * INTO v_request FROM public.maintenance_requests WHERE id = v_broadcast.request_id;
  SELECT name INTO v_unit_name FROM public.units WHERE id = v_request.unit_id;

  IF v_offer.status = 'accepted' AND v_broadcast.accepted_vendor_id = v_offer.vendor_id THEN
    RETURN jsonb_build_object(
      'result', 'accepted',
      'already_accepted', true,
      'winner_name', coalesce(v_vendor.name, v_offer.recipient_name),
      'request_title', v_request.title,
      'unit_name', coalesce(v_unit_name, 'Homestead Hill'),
      'accepted_at', v_broadcast.accepted_at
    );
  END IF;

  IF v_broadcast.expires_at <= v_now AND v_broadcast.status = 'open' THEN
    UPDATE public.maintenance_broadcasts
       SET status = 'expired', updated_at = v_now
     WHERE id = v_broadcast.id;
    UPDATE public.maintenance_offers
       SET status = 'expired', updated_at = v_now
     WHERE broadcast_id = v_broadcast.id AND status = 'pending';
    RETURN jsonb_build_object('result', 'expired');
  END IF;

  IF v_broadcast.status <> 'open' OR v_broadcast.accepted_vendor_id IS NOT NULL THEN
    SELECT name INTO v_winner_name FROM public.vendors WHERE id = v_broadcast.accepted_vendor_id;
    RETURN jsonb_build_object(
      'result', CASE WHEN v_broadcast.status = 'filled' THEN 'already_filled' ELSE v_broadcast.status END,
      'winner_name', v_winner_name,
      'request_title', v_request.title,
      'unit_name', coalesce(v_unit_name, 'Homestead Hill')
    );
  END IF;

  IF v_offer.status <> 'pending' THEN
    RETURN jsonb_build_object('result', v_offer.status);
  END IF;

  UPDATE public.maintenance_broadcasts
     SET status = 'filled',
         accepted_vendor_id = v_offer.vendor_id,
         accepted_at = v_now,
         updated_at = v_now
   WHERE id = v_broadcast.id
     AND status = 'open'
     AND accepted_vendor_id IS NULL
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    SELECT name INTO v_winner_name
      FROM public.vendors v
      JOIN public.maintenance_broadcasts b ON b.accepted_vendor_id = v.id
     WHERE b.id = v_broadcast.id;
    RETURN jsonb_build_object('result', 'already_filled', 'winner_name', v_winner_name);
  END IF;

  UPDATE public.maintenance_offers
     SET status = CASE WHEN id = v_offer.id THEN 'accepted' ELSE 'lost' END,
         responded_at = CASE WHEN id = v_offer.id THEN v_now ELSE responded_at END,
         updated_at = v_now
   WHERE broadcast_id = v_broadcast.id
     AND status = 'pending';

  UPDATE public.maintenance_requests
     SET vendor_id = v_offer.vendor_id,
         assigned_to_name = coalesce(v_vendor.name, v_offer.recipient_name),
         assigned_to_email = v_vendor.email,
         vendor_contacted_at = v_now,
         status = 'in_progress'
   WHERE id = v_broadcast.request_id;

  INSERT INTO public.maintenance_sms_outbox (
    broadcast_id, offer_id, recipient_phone_e164, message_kind, message_body
  ) VALUES (
    v_broadcast.id,
    v_offer.id,
    v_offer.recipient_phone_e164,
    'winner_confirmation',
    'You got the job: ' || coalesce(v_unit_name, 'Homestead Hill') || ' — ' ||
      left(v_request.title, 120) || '. Authorized up to $' ||
      trim(to_char(v_broadcast.max_authorized_cost, 'FM999999990.00')) ||
      '. Dalton or Briana will contact you if more approval is needed.'
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.maintenance_sms_outbox (
    broadcast_id, offer_id, recipient_phone_e164, message_kind, message_body
  )
  SELECT
    v_broadcast.id,
    o.id,
    o.recipient_phone_e164,
    'job_filled',
    'Update: ' || coalesce(v_unit_name, 'Homestead Hill') || ' — ' ||
      left(v_request.title, 120) || ' was accepted by ' ||
      coalesce(v_vendor.name, v_offer.recipient_name) || '. No action is needed.'
  FROM public.maintenance_offers o
  WHERE o.broadcast_id = v_broadcast.id
    AND o.id <> v_offer.id
    AND o.initial_message_status = 'sent'
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'result', 'accepted',
    'already_accepted', false,
    'winner_name', coalesce(v_vendor.name, v_offer.recipient_name),
    'request_title', v_request.title,
    'unit_name', coalesce(v_unit_name, 'Homestead Hill'),
    'accepted_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_maintenance_offer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_maintenance_offer(text) TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_maintenance_broadcast(_broadcast_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broadcast public.maintenance_broadcasts;
  v_request public.maintenance_requests;
  v_unit_name text;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_broadcast
    FROM public.maintenance_broadcasts
   WHERE id = _broadcast_id
   FOR UPDATE;
  IF v_broadcast.id IS NULL THEN
    RETURN jsonb_build_object('result', 'not_found');
  END IF;
  IF v_broadcast.status <> 'open' THEN
    RETURN jsonb_build_object('result', v_broadcast.status);
  END IF;

  SELECT * INTO v_request FROM public.maintenance_requests WHERE id = v_broadcast.request_id;
  SELECT name INTO v_unit_name FROM public.units WHERE id = v_request.unit_id;

  UPDATE public.maintenance_broadcasts
     SET status = 'cancelled', updated_at = v_now
   WHERE id = v_broadcast.id;
  UPDATE public.maintenance_offers
     SET status = 'cancelled', updated_at = v_now
   WHERE broadcast_id = v_broadcast.id AND status = 'pending';
  UPDATE public.maintenance_sms_outbox
     SET status = 'cancelled', updated_at = v_now
   WHERE broadcast_id = v_broadcast.id
     AND message_kind = 'job_offer'
     AND status IN ('queued', 'failed');

  INSERT INTO public.maintenance_sms_outbox (
    broadcast_id, offer_id, recipient_phone_e164, message_kind, message_body
  )
  SELECT
    v_broadcast.id,
    o.id,
    o.recipient_phone_e164,
    'broadcast_cancelled',
    'Update: ' || coalesce(v_unit_name, 'Homestead Hill') || ' — ' ||
      left(v_request.title, 120) || ' was cancelled. No action is needed.'
  FROM public.maintenance_offers o
  WHERE o.broadcast_id = v_broadcast.id
    AND o.initial_message_status = 'sent'
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('result', 'cancelled');
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_maintenance_broadcast(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_maintenance_broadcast(uuid) TO service_role;
