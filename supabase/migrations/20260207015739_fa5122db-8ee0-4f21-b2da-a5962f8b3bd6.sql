
-- Create enum types
CREATE TYPE public.booking_source AS ENUM ('airbnb', 'furnished_finder', 'direct', 'long_term', 'lease', 'other');
CREATE TYPE public.unit_status AS ENUM ('occupied', 'vacant', 'rented', 'planning', 'storage');
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'overdue', 'upcoming');

-- Create units table
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status public.unit_status NOT NULL DEFAULT 'vacant',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create guests table
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source public.booking_source NOT NULL DEFAULT 'other',
  check_in DATE NOT NULL,
  check_out DATE,
  monthly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  security_deposit NUMERIC(10,2) NOT NULL DEFAULT 0,
  security_deposit_paid BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'upcoming',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- For now, allow public access since there's no auth yet
-- These should be tightened when authentication is added
CREATE POLICY "Allow public read units" ON public.units FOR SELECT USING (true);
CREATE POLICY "Allow public insert units" ON public.units FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update units" ON public.units FOR UPDATE USING (true);
CREATE POLICY "Allow public delete units" ON public.units FOR DELETE USING (true);

CREATE POLICY "Allow public read guests" ON public.guests FOR SELECT USING (true);
CREATE POLICY "Allow public insert guests" ON public.guests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update guests" ON public.guests FOR UPDATE USING (true);
CREATE POLICY "Allow public delete guests" ON public.guests FOR DELETE USING (true);

CREATE POLICY "Allow public read payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow public insert payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update payments" ON public.payments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete payments" ON public.payments FOR DELETE USING (true);

-- Create indexes
CREATE INDEX idx_guests_unit_id ON public.guests(unit_id);
CREATE INDEX idx_guests_is_current ON public.guests(is_current);
CREATE INDEX idx_payments_guest_id ON public.payments(guest_id);
CREATE INDEX idx_payments_unit_id ON public.payments(unit_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_date ON public.payments(date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
