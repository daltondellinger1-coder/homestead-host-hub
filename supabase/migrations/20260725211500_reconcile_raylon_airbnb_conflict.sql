-- Preserve the latest authenticated Airbnb evidence as a manager-review
-- conflict. This migration does not change the canonical reservation, create a
-- cleaning assignment, or perform any outbound delivery.

UPDATE public.reservation_source_observations
SET review_status = 'superseded',
    proposed_action = 'ignore',
    review_notes = 'Superseded by the authenticated Airbnb snapshot captured at 2026-07-25T21:08:01.838656Z, which shows a July 26 checkout. The canonical reservation was not changed.'
WHERE idempotency_key = 'hermes-airbnb-20260725-unit3-raylon'
  AND review_status IN ('pending', 'needs_mapping');

INSERT INTO public.reservation_source_observations (
  source, listing_label, unit_id, guest_name, check_in_date, check_out_date,
  observation_status, confidence, observed_at, evidence_reference,
  evidence_summary, raw_payload, review_status, proposed_action,
  matched_reservation_id, idempotency_key, review_notes
)
VALUES (
  'airbnb',
  'Homestead Hill - Unit 3',
  (SELECT id FROM public.units WHERE name = 'Unit 3' LIMIT 1),
  'Raylon Holmes',
  '2026-07-06',
  '2026-07-26',
  'confirmed',
  'conflict',
  '2026-07-25T21:08:01.838656Z',
  'Hermes authenticated Airbnb occupancy monitor',
  'The current Airbnb host reservations view shows Jul 6–26, 2026, while the canonical Homestead Helper reservation still shows an Aug 8 checkout. Manager verification is required before any canonical change.',
  jsonb_build_object(
    'source_view', 'Airbnb host reservations',
    'visible_status', 'Currently hosting',
    'visible_dates', 'Jul 6–26, 2026',
    'canonical_checkout_at_observation', '2026-08-08',
    'canonical_changed', false,
    'outbound_sent', false
  ),
  'pending',
  'update',
  (
    SELECT r.id
    FROM public.reservations r
    LEFT JOIN public.guests g ON g.id = r.guest_id
    WHERE r.unit_id = (SELECT id FROM public.units WHERE name = 'Unit 3' LIMIT 1)
      AND r.check_in_date = '2026-07-06'
      AND lower(coalesce(g.name, '')) LIKE '%raylon%'
    ORDER BY r.created_at DESC
    LIMIT 1
  ),
  'hermes-airbnb-20260725T210801Z-unit3-raylon',
  'Review only. No reservation, cleaning assignment, notification, email, calendar event, or text was changed.'
)
ON CONFLICT (idempotency_key) DO NOTHING;
