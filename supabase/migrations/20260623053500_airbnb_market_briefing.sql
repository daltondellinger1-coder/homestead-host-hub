CREATE TABLE IF NOT EXISTS public.airbnb_market_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('homestead_hill', 'competitor')),
  name text NOT NULL,
  airbnb_url text,
  bedrooms numeric,
  beds numeric,
  bathrooms numeric,
  sleeps numeric,
  target_guest text,
  comp_type text CHECK (comp_type IS NULL OR comp_type IN ('direct', 'budget', 'premium', 'crew', 'verify')),
  pricing_recommendation text CHECK (pricing_recommendation IS NULL OR pricing_recommendation IN ('hold', 'raise 5%', 'lower 5%', 'improve listing before pricing change')),
  owner_action text,
  data_status text,
  amenities text[] NOT NULL DEFAULT '{}',
  amenity_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_or_unclear text[] NOT NULL DEFAULT '{}',
  photo_actions text[] NOT NULL DEFAULT '{}',
  notes text,
  rating numeric,
  reviews integer,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, name)
);

CREATE TABLE IF NOT EXISTS public.airbnb_price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.airbnb_market_listings(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  nightly_price numeric,
  weekly_price numeric,
  monthly_price numeric,
  weekly_discount_pct numeric,
  monthly_discount_pct numeric,
  source_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS public.airbnb_availability_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.airbnb_market_listings(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  available_7_day boolean,
  available_30_day boolean,
  next_available_date date,
  blocked_days_next_30 integer,
  source_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS public.airbnb_weekly_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL UNIQUE,
  headline text NOT NULL,
  owner_read text NOT NULL,
  next_actions text[] NOT NULL DEFAULT '{}',
  pricing_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.airbnb_market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airbnb_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airbnb_availability_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airbnb_weekly_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read airbnb market listings" ON public.airbnb_market_listings FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage airbnb market listings" ON public.airbnb_market_listings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can read airbnb price snapshots" ON public.airbnb_price_snapshots FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage airbnb price snapshots" ON public.airbnb_price_snapshots FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can read airbnb availability snapshots" ON public.airbnb_availability_snapshots FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage airbnb availability snapshots" ON public.airbnb_availability_snapshots FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can read airbnb weekly briefings" ON public.airbnb_weekly_briefings FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage airbnb weekly briefings" ON public.airbnb_weekly_briefings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

WITH seed_listings (source, name, bedrooms, beds, bathrooms, sleeps, target_guest, comp_type, pricing_recommendation, owner_action, data_status, amenities, amenity_map, missing_or_unclear, photo_actions, notes, rating, reviews, sort_order) AS (
  VALUES
    ('homestead_hill','Unit 5',2,2,1,4,'Two workers, supervisor, or small crew needing a clean 30+ day base.',NULL,'improve listing before pricing change','Push as the anchor 2BR monthly contractor option before cutting price.','Verified monthly display: $1,855/month discounted from $3,190.',ARRAY['Full kitchen','WiFi','Free parking','Smart lock','TV','AC','Long-term stays'],'{"Monthly friendly":true,"Full kitchen":true,"Laundry":"unclear","Parking":true,"Self check-in":true,"WiFi":true,"Workspace":"unclear","Crew beds":true,"Pets":"unclear","Strong reviews":"unclear","Photo proof":"unclear"}'::jsonb,ARRAY['Laundry access','Dedicated workspace','Fast WiFi proof','Parking photo','Coffee setup'],ARRAY['Lead with bright living room','Move bedroom into first 3 photos','Add kitchen and coffee setup','Show parking and exterior entry','Add work table or laptop-ready shot'],NULL,4.75,4,10),
    ('homestead_hill','Unit 11',1,1,1,NULL,'Solo worker or weekly-to-monthly contractor who wants low-friction furnished housing.',NULL,'hold','Verify the monthly total and discount, then decide whether it becomes a solo-worker monthly unit.','Verified weekly display: $686/week discounted from $770. Monthly still needs a live screenshot.',ARRAY['Furnished stay','Weekly discount visible'],'{"Monthly friendly":"unclear","Full kitchen":"unclear","Laundry":"unclear","Parking":"unclear","Self check-in":"unclear","WiFi":"unclear","Workspace":"unclear","Crew beds":false,"Pets":"unclear","Strong reviews":"unclear","Photo proof":"unclear"}'::jsonb,ARRAY['Monthly price','Monthly discount','Laundry access','Workspace','Parking clarity'],ARRAY['Verify monthly availability screenshot','Add contractor-ready first 5 photos','Show bed, kitchen, bath, parking, work surface'],NULL,NULL,NULL,20),
    ('homestead_hill','Other HH units',1,NULL,1,NULL,'Rollout slots for solo workers, nurses, inspectors, or rotating crews.',NULL,'improve listing before pricing change','Add each Airbnb link and monthly screenshot so the dashboard becomes a full unit-by-unit control room.','Not yet verified. Use this as the rollout placeholder until each listing is collected.',ARRAY['Property-level parking','Quiet apartment setting','Operational owner control'],'{"Monthly friendly":"unclear","Full kitchen":"unclear","Laundry":"unclear","Parking":true,"Self check-in":"unclear","WiFi":"unclear","Workspace":"unclear","Crew beds":"unclear","Pets":"unclear","Strong reviews":"unclear","Photo proof":"unclear"}'::jsonb,ARRAY['Airbnb links','Bedroom count','Monthly price','Amenity tags','Photo order','Review signal'],ARRAY['Create one standard 12-photo shot list per unit','Collect first-photo candidates','Audit amenity tags unit by unit'],NULL,NULL,NULL,30),
    ('competitor','Vincennes Hideaway',2,NULL,1,NULL,NULL,'direct',NULL,NULL,NULL,ARRAY['Newly renovated','Near Main/hospital','Full-place privacy'],'{"Monthly friendly":"unclear","Full kitchen":true,"Laundry":"unclear","Parking":"unclear","WiFi":"unclear","Workspace":"unclear","Crew beds":true}'::jsonb,ARRAY[]::text[],ARRAY[]::text[],'Strong direct comp if monthly availability is open. Lower face-price than Unit 5, but Unit 5 monthly discount changes the math.',NULL,NULL,110),
    ('competitor','Small Town Urban Oasis',3,4,NULL,NULL,NULL,'crew',NULL,NULL,NULL,ARRAY['Washer/dryer','Pets','Workspace','Crew capacity'],'{"Monthly friendly":"unclear","Full kitchen":true,"Laundry":true,"Parking":"unclear","WiFi":"unclear","Workspace":true,"Crew beds":true,"Pets":true,"Strong reviews":true,"Photo proof":true}'::jsonb,ARRAY[]::text[],ARRAY[]::text[],'A serious crew-stay competitor. It beats HH on beds, reviews, laundry, and pet flexibility.',4.82,34,120)
)
INSERT INTO public.airbnb_market_listings (source, name, bedrooms, beds, bathrooms, sleeps, target_guest, comp_type, pricing_recommendation, owner_action, data_status, amenities, amenity_map, missing_or_unclear, photo_actions, notes, rating, reviews, sort_order)
SELECT * FROM seed_listings
ON CONFLICT (source, name) DO UPDATE SET
  bedrooms = EXCLUDED.bedrooms,
  beds = EXCLUDED.beds,
  bathrooms = EXCLUDED.bathrooms,
  sleeps = EXCLUDED.sleeps,
  target_guest = EXCLUDED.target_guest,
  comp_type = EXCLUDED.comp_type,
  pricing_recommendation = EXCLUDED.pricing_recommendation,
  owner_action = EXCLUDED.owner_action,
  data_status = EXCLUDED.data_status,
  amenities = EXCLUDED.amenities,
  amenity_map = EXCLUDED.amenity_map,
  missing_or_unclear = EXCLUDED.missing_or_unclear,
  photo_actions = EXCLUDED.photo_actions,
  notes = EXCLUDED.notes,
  rating = EXCLUDED.rating,
  reviews = EXCLUDED.reviews,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.airbnb_price_snapshots (listing_id, snapshot_date, nightly_price, weekly_price, monthly_price, weekly_discount_pct, monthly_discount_pct, source_note)
SELECT l.id, DATE '2026-06-23', v.nightly, v.weekly, v.monthly, v.weekly_discount, v.monthly_discount, 'Manual seed from initial market dashboard'
FROM public.airbnb_market_listings l
JOIN (VALUES
  ('homestead_hill','Unit 5',130::numeric,NULL::numeric,1855::numeric,NULL::numeric,41.8::numeric),
  ('homestead_hill','Unit 11',NULL::numeric,686::numeric,NULL::numeric,10.9::numeric,NULL::numeric),
  ('competitor','Vincennes Hideaway',95::numeric,665::numeric,2850::numeric,NULL::numeric,NULL::numeric),
  ('competitor','Small Town Urban Oasis',88::numeric,616::numeric,2640::numeric,NULL::numeric,NULL::numeric)
) AS v(source, name, nightly, weekly, monthly, weekly_discount, monthly_discount)
ON l.source = v.source AND l.name = v.name
ON CONFLICT (listing_id, snapshot_date) DO UPDATE SET
  nightly_price = EXCLUDED.nightly_price,
  weekly_price = EXCLUDED.weekly_price,
  monthly_price = EXCLUDED.monthly_price,
  weekly_discount_pct = EXCLUDED.weekly_discount_pct,
  monthly_discount_pct = EXCLUDED.monthly_discount_pct,
  source_note = EXCLUDED.source_note;

INSERT INTO public.airbnb_weekly_briefings (week_start, headline, owner_read, next_actions, pricing_summary)
VALUES (
  DATE '2026-06-22',
  'Unit 5 is a strong monthly value if the listing proves contractor readiness.',
  'Do not cut price first. Add photo and amenity proof, verify Unit 11 monthly, then compare 30-day availability against crew-stay competitors.',
  ARRAY['Add every HH Airbnb link and 30-day screenshot','Standardize first 5 photos for contractor confidence','Audit laundry, workspace, parking, WiFi, and pet tags'],
  '{"unit_5":"improve listing before pricing change","unit_11":"hold"}'::jsonb
)
ON CONFLICT (week_start) DO UPDATE SET
  headline = EXCLUDED.headline,
  owner_read = EXCLUDED.owner_read,
  next_actions = EXCLUDED.next_actions,
  pricing_summary = EXCLUDED.pricing_summary;
