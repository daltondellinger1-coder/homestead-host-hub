
CREATE TYPE public.booking_request_status AS ENUM ('pending', 'approved', 'declined');

CREATE TABLE public.booking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  num_guests INTEGER NOT NULL DEFAULT 1,
  preferred_unit_type public.unit_type,
  source public.booking_source NOT NULL DEFAULT 'direct',
  notes TEXT,
  status public.booking_request_status NOT NULL DEFAULT 'pending',
  assigned_unit_id UUID,
  decline_reason TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert booking_requests"
  ON public.booking_requests FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public read booking_requests"
  ON public.booking_requests FOR SELECT TO public USING (true);

CREATE POLICY "Allow public update booking_requests"
  ON public.booking_requests FOR UPDATE TO public USING (true);

CREATE POLICY "Allow public delete booking_requests"
  ON public.booking_requests FOR DELETE TO public USING (true);

CREATE TRIGGER update_booking_requests_updated_at
  BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_booking_requests_status ON public.booking_requests(status);
CREATE INDEX idx_booking_requests_created_at ON public.booking_requests(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_requests;
ALTER TABLE public.booking_requests REPLICA IDENTITY FULL;
