
-- Add user_id to units table
ALTER TABLE public.units ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to guests table  
ALTER TABLE public.guests ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to payments table
ALTER TABLE public.payments ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing permissive-to-all RLS policies on units
DROP POLICY IF EXISTS "Allow public delete units" ON public.units;
DROP POLICY IF EXISTS "Allow public insert units" ON public.units;
DROP POLICY IF EXISTS "Allow public read units" ON public.units;
DROP POLICY IF EXISTS "Allow public update units" ON public.units;

-- Drop existing permissive-to-all RLS policies on guests
DROP POLICY IF EXISTS "Allow public delete guests" ON public.guests;
DROP POLICY IF EXISTS "Allow public insert guests" ON public.guests;
DROP POLICY IF EXISTS "Allow public read guests" ON public.guests;
DROP POLICY IF EXISTS "Allow public update guests" ON public.guests;

-- Drop existing permissive-to-all RLS policies on payments
DROP POLICY IF EXISTS "Allow public delete payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public insert payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public read payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public update payments" ON public.payments;

-- Create user-scoped RLS policies for units
CREATE POLICY "Users can view their own units"
  ON public.units FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own units"
  ON public.units FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own units"
  ON public.units FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own units"
  ON public.units FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create user-scoped RLS policies for guests
CREATE POLICY "Users can view their own guests"
  ON public.guests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own guests"
  ON public.guests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own guests"
  ON public.guests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own guests"
  ON public.guests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create user-scoped RLS policies for payments
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments"
  ON public.payments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
