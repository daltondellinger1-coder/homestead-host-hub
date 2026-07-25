-- Review-first reservation reconciliation.
--
-- External collectors may stage observations here, but only an explicit
-- admin/property-manager decision can change the canonical reservation table.
-- Approval creates no cleaner assignment and performs no email/SMS delivery.

CREATE TABLE IF NOT EXISTS public.reservation_source_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_version text NOT NULL DEFAULT 'homestead.reservation-observation.v1',
  source text NOT NULL
    CHECK (source IN ('airbnb','furnished_finder','grasshopper','manual','legacy_host_hub','ical')),
  source_record_id text,
  listing_label text,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  guest_name text,
  check_in_date date,
  check_out_date date,
  observation_status text NOT NULL DEFAULT 'unknown'
    CHECK (observation_status IN ('confirmed','inquiry','text_signal','cancelled','unknown')),
  confidence text NOT NULL DEFAULT 'low'
    CHECK (confidence IN ('verified','high','medium','low','conflict')),
  observed_at timestamptz NOT NULL DEFAULT now(),
  evidence_reference text,
  evidence_summary text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','approved','rejected','superseded','needs_mapping')),
  proposed_action text NOT NULL DEFAULT 'create'
    CHECK (proposed_action IN ('create','update','cancel','ignore','map_unit')),
  matched_reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL UNIQUE,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out_date IS NULL OR check_in_date IS NULL OR check_out_date >= check_in_date)
);

CREATE INDEX IF NOT EXISTS reservation_observations_review_queue_idx
  ON public.reservation_source_observations (review_status, check_out_date, observed_at DESC);
CREATE INDEX IF NOT EXISTS reservation_observations_unit_dates_idx
  ON public.reservation_source_observations (unit_id, check_in_date, check_out_date);

ALTER TABLE public.reservation_source_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operations staff review reservation observations"
  ON public.reservation_source_observations;
CREATE POLICY "Operations staff review reservation observations"
  ON public.reservation_source_observations
  FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['admin','property_manager']))
  WITH CHECK (public.has_any_role(ARRAY['admin','property_manager']));

DROP TRIGGER IF EXISTS reservation_source_observations_updated_at
  ON public.reservation_source_observations;
CREATE TRIGGER reservation_source_observations_updated_at
BEFORE UPDATE ON public.reservation_source_observations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.review_reservation_observation(
  _observation_id uuid,
  _decision text,
  _unit_id uuid DEFAULT NULL,
  _guest_name text DEFAULT NULL,
  _check_in_date date DEFAULT NULL,
  _check_out_date date DEFAULT NULL,
  _review_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_observation public.reservation_source_observations;
  v_reservation public.reservations;
  v_reservation_id uuid;
  v_guest_id uuid;
  v_unit_id uuid;
  v_guest_name text;
  v_check_in date;
  v_check_out date;
  v_booking_source text;
  v_legacy_source public.booking_source;
BEGIN
  IF NOT public.has_any_role(ARRAY['admin','property_manager']) THEN
    RAISE EXCEPTION 'Property manager access is required.';
  END IF;
  IF _decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected.';
  END IF;

  SELECT * INTO v_observation
  FROM public.reservation_source_observations
  WHERE id = _observation_id
  FOR UPDATE;

  IF v_observation.id IS NULL THEN
    RAISE EXCEPTION 'Reservation observation was not found.';
  END IF;
  IF v_observation.review_status NOT IN ('pending','needs_mapping') THEN
    RAISE EXCEPTION 'This observation has already been reviewed.';
  END IF;

  IF _decision = 'rejected' THEN
    UPDATE public.reservation_source_observations
    SET review_status = 'rejected',
        proposed_action = 'ignore',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_notes = nullif(trim(coalesce(_review_notes, '')), '')
    WHERE id = _observation_id;
    RETURN NULL;
  END IF;

  IF v_observation.observation_status NOT IN ('confirmed','cancelled') THEN
    RAISE EXCEPTION 'Only a confirmed reservation or cancellation can be approved. Verify this signal first.';
  END IF;

  v_unit_id := coalesce(_unit_id, v_observation.unit_id);
  v_guest_name := nullif(trim(coalesce(_guest_name, v_observation.guest_name, '')), '');
  v_check_in := coalesce(_check_in_date, v_observation.check_in_date);
  v_check_out := coalesce(_check_out_date, v_observation.check_out_date);

  v_booking_source := CASE v_observation.source
    WHEN 'airbnb' THEN 'airbnb'
    WHEN 'ical' THEN 'airbnb'
    WHEN 'furnished_finder' THEN 'furnished_finder'
    WHEN 'grasshopper' THEN 'direct'
    WHEN 'manual' THEN 'direct'
    ELSE 'other'
  END;
  v_legacy_source := CASE v_booking_source
    WHEN 'airbnb' THEN 'airbnb'::public.booking_source
    WHEN 'furnished_finder' THEN 'furnished_finder'::public.booking_source
    WHEN 'direct' THEN 'direct'::public.booking_source
    ELSE 'other'::public.booking_source
  END;

  IF v_observation.matched_reservation_id IS NOT NULL THEN
    SELECT * INTO v_reservation
    FROM public.reservations
    WHERE id = v_observation.matched_reservation_id
    FOR UPDATE;
  ELSIF v_observation.source_record_id IS NOT NULL THEN
    SELECT * INTO v_reservation
    FROM public.reservations
    WHERE booking_source = v_booking_source
      AND external_reservation_id = v_observation.source_record_id
    FOR UPDATE;
  END IF;

  IF v_observation.observation_status = 'cancelled' THEN
    IF v_reservation.id IS NULL THEN
      RAISE EXCEPTION 'A cancellation must be matched to an existing reservation.';
    END IF;
    UPDATE public.reservations
    SET status = 'cancelled',
        source_system = 'reservation_observation:' || v_observation.source,
        data_confidence = v_observation.confidence,
        last_synchronized_at = v_observation.observed_at,
        updated_by = auth.uid(),
        updated_at = now()
    WHERE id = v_reservation.id
    RETURNING id INTO v_reservation_id;
  ELSE
    IF v_unit_id IS NULL THEN RAISE EXCEPTION 'Choose a unit before approval.'; END IF;
    IF v_guest_name IS NULL THEN RAISE EXCEPTION 'Guest name is required before approval.'; END IF;
    IF v_check_in IS NULL OR v_check_out IS NULL OR v_check_out < v_check_in THEN
      RAISE EXCEPTION 'Valid check-in and checkout dates are required before approval.';
    END IF;

    IF v_reservation.id IS NULL THEN
      INSERT INTO public.guests (
        unit_id, name, source, check_in, check_out, is_current, record_type, user_id
      ) VALUES (
        v_unit_id, v_guest_name, v_legacy_source, v_check_in, v_check_out,
        false, 'guest', auth.uid()
      )
      RETURNING id INTO v_guest_id;

      INSERT INTO public.reservations (
        external_reservation_id, guest_id, unit_id, booking_source, status,
        check_in_date, check_out_date, source_system, data_confidence,
        last_synchronized_at, special_notes, created_by, updated_by
      ) VALUES (
        coalesce(v_observation.source_record_id, 'observation:' || v_observation.id::text),
        v_guest_id, v_unit_id, v_booking_source, 'confirmed',
        v_check_in, v_check_out,
        'reservation_observation:' || v_observation.source,
        v_observation.confidence, v_observation.observed_at,
        nullif(trim(coalesce(v_observation.evidence_summary, '')), ''),
        auth.uid(), auth.uid()
      )
      RETURNING id INTO v_reservation_id;
    ELSE
      UPDATE public.guests
      SET unit_id = v_unit_id,
          name = v_guest_name,
          source = v_legacy_source,
          check_in = v_check_in,
          check_out = v_check_out,
          updated_at = now()
      WHERE id = v_reservation.guest_id;

      UPDATE public.reservations
      SET unit_id = v_unit_id,
          booking_source = v_booking_source,
          check_in_date = v_check_in,
          check_out_date = v_check_out,
          source_system = 'reservation_observation:' || v_observation.source,
          data_confidence = v_observation.confidence,
          last_synchronized_at = v_observation.observed_at,
          updated_by = auth.uid(),
          updated_at = now()
      WHERE id = v_reservation.id
      RETURNING id INTO v_reservation_id;
    END IF;
  END IF;

  UPDATE public.reservation_source_observations
  SET unit_id = v_unit_id,
      guest_name = v_guest_name,
      check_in_date = v_check_in,
      check_out_date = v_check_out,
      review_status = 'approved',
      matched_reservation_id = v_reservation_id,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = nullif(trim(coalesce(_review_notes, '')), '')
  WHERE id = _observation_id;

  INSERT INTO public.activity_log (
    actor_user_id, actor_label, action, record_type, record_id, source, new_value
  ) VALUES (
    auth.uid(), 'Property manager', 'reservation_observation.approved',
    'reservation_source_observation', _observation_id, 'user',
    jsonb_build_object(
      'reservation_id', v_reservation_id,
      'source', v_observation.source,
      'outbound_delivery', false
    )
  );

  RETURN v_reservation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.review_reservation_observation(
  uuid, text, uuid, text, date, date, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_reservation_observation(
  uuid, text, uuid, text, date, date, text
) TO authenticated;

-- Seed the current Hermes read-only Airbnb report as reviewable observations.
-- Nothing below changes canonical reservations.
INSERT INTO public.reservation_source_observations (
  source, listing_label, unit_id, guest_name, check_in_date, check_out_date,
  observation_status, confidence, observed_at, evidence_reference,
  evidence_summary, review_status, proposed_action, matched_reservation_id,
  idempotency_key, reviewed_at, review_notes
)
VALUES
  ('airbnb','Unit 1',(SELECT id FROM public.units WHERE name='Unit 1' LIMIT 1),'Samuel Martin','2026-07-19','2026-08-23','confirmed','high','2026-07-25 12:35:21-04','Hermes Cleaner Schedule Automation','Live Airbnb report','pending','update',(SELECT r.id FROM public.reservations r JOIN public.guests g ON g.id=r.guest_id WHERE r.unit_id=(SELECT id FROM public.units WHERE name='Unit 1' LIMIT 1) AND lower(g.name)=lower('Samuel Martin') ORDER BY r.created_at DESC LIMIT 1),'hermes-airbnb-20260725-unit1-samuel',NULL,NULL),
  ('airbnb','Unit 3',(SELECT id FROM public.units WHERE name='Unit 3' LIMIT 1),'Raylon Holmes','2026-07-06','2026-08-08','confirmed','high','2026-07-25 12:35:21-04','Hermes Cleaner Schedule Automation','Live Airbnb report','pending','update',(SELECT r.id FROM public.reservations r WHERE r.unit_id=(SELECT id FROM public.units WHERE name='Unit 3' LIMIT 1) AND r.check_in_date='2026-07-06' LIMIT 1),'hermes-airbnb-20260725-unit3-raylon',NULL,NULL),
  ('airbnb','Unit 3',(SELECT id FROM public.units WHERE name='Unit 3' LIMIT 1),'Lydia Craig','2026-08-16','2026-08-21','confirmed','high','2026-07-25 12:35:21-04','Hermes Cleaner Schedule Automation','Upcoming Airbnb stay','pending','create',NULL,'hermes-airbnb-20260725-unit3-lydia-1',NULL,NULL),
  ('airbnb','Unit 3',(SELECT id FROM public.units WHERE name='Unit 3' LIMIT 1),'Lydia Craig','2026-08-23','2026-08-28','confirmed','high','2026-07-25 12:35:21-04','Hermes Cleaner Schedule Automation','Upcoming Airbnb stay','pending','create',NULL,'hermes-airbnb-20260725-unit3-lydia-2',NULL,NULL),
  ('airbnb','Unit 5',(SELECT id FROM public.units WHERE name='Unit 5' LIMIT 1),'David Allen','2026-07-13','2026-08-10','confirmed','high','2026-07-25 12:35:21-04','Hermes Cleaner Schedule Automation','Live Airbnb report','pending','update',(SELECT r.id FROM public.reservations r WHERE r.unit_id=(SELECT id FROM public.units WHERE name='Unit 5' LIMIT 1) AND r.check_in_date='2026-07-13' LIMIT 1),'hermes-airbnb-20260725-unit5-david',NULL,NULL),
  ('airbnb','Unit 6',(SELECT id FROM public.units WHERE name='Unit 6' LIMIT 1),'Reed Braundmeier','2026-05-04','2026-09-04','confirmed','conflict','2026-07-25 12:35:21-04','Hermes Cleaner Schedule Automation','Airbnb reports Sep 4 checkout; current app reports Sep 10','pending','update',(SELECT r.id FROM public.reservations r WHERE r.unit_id=(SELECT id FROM public.units WHERE name='Unit 6' LIMIT 1) AND r.check_in_date='2026-05-04' LIMIT 1),'hermes-airbnb-20260725-unit6-reed',NULL,NULL),
  ('airbnb','Unit 11',(SELECT id FROM public.units WHERE name='Unit 11' LIMIT 1),'Graham Reed','2026-07-19','2026-07-27','confirmed','verified','2026-07-25 12:35:21-04','Dalton correction plus Hermes Airbnb report','Dalton explicitly confirmed Graham checks out July 27','approved','update',(SELECT r.id FROM public.reservations r JOIN public.guests g ON g.id=r.guest_id WHERE r.unit_id=(SELECT id FROM public.units WHERE name='Unit 11' LIMIT 1) AND lower(g.name)=lower('Graham Reed') ORDER BY r.created_at DESC LIMIT 1),'hermes-airbnb-20260725-unit11-graham',now(),'Previously approved by Dalton and applied'),
  ('airbnb','Unit 11',(SELECT id FROM public.units WHERE name='Unit 11' LIMIT 1),'Ashley Turner','2026-09-24','2026-09-27','confirmed','high','2026-07-25 12:35:21-04','Hermes Cleaner Schedule Automation','Upcoming Airbnb stay','pending','update',(SELECT r.id FROM public.reservations r WHERE r.unit_id=(SELECT id FROM public.units WHERE name='Unit 11' LIMIT 1) AND r.check_in_date='2026-09-24' LIMIT 1),'hermes-airbnb-20260725-unit11-ashley',NULL,NULL),
  ('airbnb','Unit 13',(SELECT id FROM public.units WHERE name='Unit 13' LIMIT 1),'Joshua Barillas','2026-07-13','2026-09-30','confirmed','high','2026-07-25 12:35:21-04','Hermes Cleaner Schedule Automation','Live Airbnb report','pending','create',NULL,'hermes-airbnb-20260725-unit13-joshua',NULL,NULL),
  ('airbnb','Unit 14',(SELECT id FROM public.units WHERE name='Unit 14' LIMIT 1),'Marcy Knudtson','2026-08-28','2026-08-30','confirmed','high','2026-07-25 12:35:21-04','Hermes Cleaner Schedule Automation','Upcoming Airbnb stay','pending','create',NULL,'hermes-airbnb-20260725-unit14-marcy',NULL,NULL),
  ('grasshopper','Unit 14',(SELECT id FROM public.units WHERE name='Unit 14' LIMIT 1),'Paul',NULL,'2026-07-29','text_signal','medium','2026-07-24 00:00:00-04','Dalton-reported guest text','Guest said last night is Tuesday 7/28; likely checkout Wednesday 7/29, still requires confirmation','pending','update',(SELECT r.id FROM public.reservations r WHERE r.unit_id=(SELECT id FROM public.units WHERE name='Unit 14' LIMIT 1) AND r.status <> 'cancelled' ORDER BY r.created_at DESC LIMIT 1),'grasshopper-unit14-paul-checkout-20260729',NULL,NULL),
  ('airbnb','College Town Comfort',NULL,'Daniel Dummer','2026-06-14','2026-08-08','confirmed','high','2026-07-25 12:35:21-04','Hermes Cleaner Schedule Automation','Airbnb listing is not mapped to a Homestead Hill unit','needs_mapping','map_unit',NULL,'hermes-airbnb-20260725-college-daniel',NULL,NULL),
  ('airbnb','College Town Comfort',NULL,'Jacob Warner','2026-08-22','2026-12-12','confirmed','high','2026-07-25 12:35:21-04','Hermes Cleaner Schedule Automation','Airbnb listing is not mapped to a Homestead Hill unit','needs_mapping','map_unit',NULL,'hermes-airbnb-20260725-college-jacob',NULL,NULL)
ON CONFLICT (idempotency_key) DO NOTHING;
