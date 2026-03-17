
-- Revenue targets per unit per month
CREATE TABLE public.revenue_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  monthly_target numeric NOT NULL,
  effective_from date NOT NULL DEFAULT '2025-01-01',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read revenue_targets" ON public.revenue_targets FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert revenue_targets" ON public.revenue_targets FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update revenue_targets" ON public.revenue_targets FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete revenue_targets" ON public.revenue_targets FOR DELETE TO public USING (true);

-- Management fee records (monthly)
CREATE TABLE public.management_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL, -- first day of month, e.g. '2025-03-01'
  gross_collected numeric NOT NULL DEFAULT 0,
  fee_percentage numeric NOT NULL DEFAULT 5,
  fee_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(month)
);

ALTER TABLE public.management_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read management_fees" ON public.management_fees FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert management_fees" ON public.management_fees FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update management_fees" ON public.management_fees FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete management_fees" ON public.management_fees FOR DELETE TO public USING (true);

-- Enable realtime for management_fees
ALTER PUBLICATION supabase_realtime ADD TABLE public.revenue_targets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.management_fees;
