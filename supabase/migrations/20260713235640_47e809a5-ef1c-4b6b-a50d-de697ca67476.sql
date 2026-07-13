-- 1. enum for payment methods
DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'airbnb','stripe','square','venmo','paypal','zelle','cash','check','ach','credit_card','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. extend payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method,
  ADD COLUMN IF NOT EXISTS payment_method_other text,
  ADD COLUMN IF NOT EXISTS needs_method_review boolean NOT NULL DEFAULT false;

-- 3. allocations table for split payments
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  other_description text,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_allocations_payment_id_idx ON public.payment_allocations(payment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_allocations TO authenticated;
GRANT ALL ON public.payment_allocations TO service_role;

ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view payment allocations" ON public.payment_allocations;
CREATE POLICY "Admins can view payment allocations"
  ON public.payment_allocations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage payment allocations" ON public.payment_allocations;
CREATE POLICY "Admins manage payment allocations"
  ON public.payment_allocations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. backfill
UPDATE public.payments p
   SET payment_method = 'airbnb'::public.payment_method,
       needs_method_review = false
  FROM public.guests g
 WHERE p.guest_id = g.id
   AND p.status = 'paid'
   AND g.source = 'airbnb'
   AND p.payment_method IS NULL;

UPDATE public.payments p
   SET needs_method_review = true
  FROM public.guests g
 WHERE p.guest_id = g.id
   AND p.status = 'paid'
   AND g.source <> 'airbnb'
   AND p.payment_method IS NULL;
