ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS sms_consent_source text,
  ADD COLUMN IF NOT EXISTS sms_consent_disclosure_version text;

CREATE TABLE IF NOT EXISTS public.vendor_sms_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('consented', 'opted_out')),
  full_name text NOT NULL,
  company text,
  phone_e164 text NOT NULL,
  email text,
  disclosure_version text NOT NULL,
  source_url text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_sms_consent_events_phone_created_idx
  ON public.vendor_sms_consent_events (phone_e164, created_at DESC);

ALTER TABLE public.vendor_sms_consent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers read vendor SMS consent evidence" ON public.vendor_sms_consent_events;
CREATE POLICY "Managers read vendor SMS consent evidence"
ON public.vendor_sms_consent_events
FOR SELECT TO authenticated
USING (public.has_any_role(ARRAY['admin', 'property_manager']));

DROP POLICY IF EXISTS "Managers manage vendor SMS consent evidence" ON public.vendor_sms_consent_events;
CREATE POLICY "Managers manage vendor SMS consent evidence"
ON public.vendor_sms_consent_events
FOR ALL TO authenticated
USING (public.has_any_role(ARRAY['admin', 'property_manager']))
WITH CHECK (public.has_any_role(ARRAY['admin', 'property_manager']));
