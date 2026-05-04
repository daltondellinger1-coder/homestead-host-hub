-- Status enum
CREATE TYPE public.maintenance_status AS ENUM ('new', 'in_progress', 'done');

-- Table
CREATE TABLE public.maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.maintenance_status NOT NULL DEFAULT 'new',
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  photo_url TEXT,
  reporter_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_requests_unit_id ON public.maintenance_requests(unit_id);
CREATE INDEX idx_maintenance_requests_status ON public.maintenance_requests(status);

-- RLS (matches existing public-access pattern in this project)
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read maintenance_requests"
  ON public.maintenance_requests FOR SELECT USING (true);

CREATE POLICY "Allow public insert maintenance_requests"
  ON public.maintenance_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update maintenance_requests"
  ON public.maintenance_requests FOR UPDATE USING (true);

CREATE POLICY "Allow public delete maintenance_requests"
  ON public.maintenance_requests FOR DELETE USING (true);

-- updated_at trigger
CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;