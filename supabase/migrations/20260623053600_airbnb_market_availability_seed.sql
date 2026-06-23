INSERT INTO public.airbnb_availability_snapshots (listing_id, snapshot_date, available_30_day, next_available_date, source_note)
SELECT l.id, DATE '2026-06-23', v.available_30_day, v.next_available_date, 'Manual seed placeholder from initial market dashboard; verify with Airbnb screenshot'
FROM public.airbnb_market_listings l
JOIN (VALUES
  ('homestead_hill','Unit 5',true,DATE '2026-07-01'),
  ('homestead_hill','Unit 11',NULL,NULL),
  ('homestead_hill','Other HH units',NULL,NULL)
) AS v(source, name, available_30_day, next_available_date)
ON l.source = v.source AND l.name = v.name
ON CONFLICT (listing_id, snapshot_date) DO UPDATE SET
  available_30_day = EXCLUDED.available_30_day,
  next_available_date = EXCLUDED.next_available_date,
  source_note = EXCLUDED.source_note;
