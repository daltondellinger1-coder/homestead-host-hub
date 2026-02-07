
-- Drop user-scoped RLS policies on units
DROP POLICY IF EXISTS "Users can view their own units" ON public.units;
DROP POLICY IF EXISTS "Users can create their own units" ON public.units;
DROP POLICY IF EXISTS "Users can update their own units" ON public.units;
DROP POLICY IF EXISTS "Users can delete their own units" ON public.units;

-- Drop user-scoped RLS policies on guests
DROP POLICY IF EXISTS "Users can view their own guests" ON public.guests;
DROP POLICY IF EXISTS "Users can create their own guests" ON public.guests;
DROP POLICY IF EXISTS "Users can update their own guests" ON public.guests;
DROP POLICY IF EXISTS "Users can delete their own guests" ON public.guests;

-- Drop user-scoped RLS policies on payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete their own payments" ON public.payments;

-- Restore public access RLS policies for units
CREATE POLICY "Allow public read units" ON public.units FOR SELECT USING (true);
CREATE POLICY "Allow public insert units" ON public.units FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update units" ON public.units FOR UPDATE USING (true);
CREATE POLICY "Allow public delete units" ON public.units FOR DELETE USING (true);

-- Restore public access RLS policies for guests
CREATE POLICY "Allow public read guests" ON public.guests FOR SELECT USING (true);
CREATE POLICY "Allow public insert guests" ON public.guests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update guests" ON public.guests FOR UPDATE USING (true);
CREATE POLICY "Allow public delete guests" ON public.guests FOR DELETE USING (true);

-- Restore public access RLS policies for payments
CREATE POLICY "Allow public read payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow public insert payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update payments" ON public.payments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete payments" ON public.payments FOR DELETE USING (true);

-- Drop user_id columns (no longer needed)
ALTER TABLE public.units DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.guests DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.payments DROP COLUMN IF EXISTS user_id;
