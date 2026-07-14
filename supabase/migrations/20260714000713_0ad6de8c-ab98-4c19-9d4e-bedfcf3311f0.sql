ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS due_date date;
CREATE INDEX IF NOT EXISTS payments_due_date_idx ON public.payments(due_date);
COMMENT ON COLUMN public.payments.due_date IS 'Optional rent-due date. Nullable; historical rows may remain blank.';