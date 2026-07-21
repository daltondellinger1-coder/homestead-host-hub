-- Booking intake foundation for n8n/provider webhooks.
-- Homestead Helper owns the unit mapping and the canonical request record.

CREATE TABLE IF NOT EXISTS public.booking_listing_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source TEXT NOT NULL,
  external_listing_id TEXT NOT NULL,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (external_source, external_listing_id)
);

ALTER TABLE public.booking_listing_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage booking listing mappings"
  ON public.booking_listing_mappings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_booking_listing_mappings_updated_at
  BEFORE UPDATE ON public.booking_listing_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS external_booking_id TEXT,
  ADD COLUMN IF NOT EXISTS external_listing_id TEXT,
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS booking_requests_external_identity_key
  ON public.booking_requests (external_source, external_booking_id)
  WHERE external_source IS NOT NULL AND external_booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS booking_requests_external_listing_idx
  ON public.booking_requests (external_source, external_listing_id);

CREATE TABLE IF NOT EXISTS public.booking_intake_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source TEXT,
  external_booking_id TEXT,
  external_listing_id TEXT,
  booking_request_id UUID REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('created', 'updated', 'terminal_ignored', 'review_required', 'rejected_secret', 'invalid_payload', 'error')),
  error_text TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_intake_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read booking intake events"
  ON public.booking_intake_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS booking_intake_events_created_at_idx
  ON public.booking_intake_events (created_at DESC);
