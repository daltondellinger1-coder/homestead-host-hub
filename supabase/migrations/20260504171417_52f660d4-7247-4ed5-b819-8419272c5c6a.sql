-- 1. Maintenance request enhancements
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS tally_event_id text,
  ADD COLUMN IF NOT EXISTS priority_urgent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS maintenance_requests_tally_event_id_key
  ON public.maintenance_requests(tally_event_id)
  WHERE tally_event_id IS NOT NULL;

-- Migrate existing single photo_url into the array
UPDATE public.maintenance_requests
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL
  AND photo_url <> ''
  AND (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL);

-- 2. Add 'archived' status
ALTER TYPE public.maintenance_status ADD VALUE IF NOT EXISTS 'archived';

-- 3. Webhook payload log
CREATE TABLE IF NOT EXISTS public.webhook_payload_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'tally',
  raw_payload jsonb,
  processed_status text NOT NULL,
  error_text text,
  related_request_id uuid
);

ALTER TABLE public.webhook_payload_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read webhook_payload_log"
  ON public.webhook_payload_log FOR SELECT USING (true);
CREATE POLICY "Allow public insert webhook_payload_log"
  ON public.webhook_payload_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete webhook_payload_log"
  ON public.webhook_payload_log FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS webhook_payload_log_received_at_idx
  ON public.webhook_payload_log(received_at DESC);