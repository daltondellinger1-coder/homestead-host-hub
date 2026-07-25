-- Audit trail for the source-neutral reservation observation intake.
--
-- The intake endpoint can only stage evidence in the manager review queue.
-- It cannot write canonical reservations, create cleaning tasks, or queue
-- outbound notifications.

CREATE TABLE IF NOT EXISTS public.reservation_observation_intake_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text,
  source_record_id text,
  idempotency_key text,
  observation_id uuid REFERENCES public.reservation_source_observations(id) ON DELETE SET NULL,
  outcome text NOT NULL
    CHECK (outcome IN (
      'created',
      'updated',
      'terminal_ignored',
      'rejected_secret',
      'invalid_payload',
      'error'
    )),
  error_text text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservation_observation_intake_events_created_idx
  ON public.reservation_observation_intake_events (created_at DESC);
CREATE INDEX IF NOT EXISTS reservation_observation_intake_events_identity_idx
  ON public.reservation_observation_intake_events (source, source_record_id, idempotency_key);

ALTER TABLE public.reservation_observation_intake_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operations staff read reservation observation intake events"
  ON public.reservation_observation_intake_events;
CREATE POLICY "Operations staff read reservation observation intake events"
  ON public.reservation_observation_intake_events
  FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['admin','property_manager']));

