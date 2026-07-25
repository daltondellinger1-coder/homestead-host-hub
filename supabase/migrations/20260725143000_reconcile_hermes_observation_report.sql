-- Reconcile the first versioned Hermes observation report without touching
-- canonical reservations or performing any outbound delivery.

UPDATE public.reservation_source_observations
SET review_status = 'superseded',
    proposed_action = 'ignore',
    confidence = 'verified',
    evidence_summary = 'Hermes identifies College Town Comfort as an unrelated Oakland City listing. It is excluded from Homestead Hill unit mapping.',
    review_notes = 'Automatically excluded by the source adapter contract; no reservation was changed.'
WHERE idempotency_key IN (
  'hermes-airbnb-20260725-college-daniel',
  'hermes-airbnb-20260725-college-jacob'
);

UPDATE public.reservation_source_observations
SET check_out_date = NULL,
    confidence = 'low',
    evidence_summary = 'Unresolved text signal. Grasshopper was not readable, so the checkout date and source record are unknown.',
    review_notes = 'Requires a live Grasshopper read or direct confirmation before it can be marked confirmed.'
WHERE idempotency_key = 'grasshopper-unit14-paul-checkout-20260729';

INSERT INTO public.reservation_source_observations (
  source, source_record_id, listing_label, unit_id, guest_name,
  check_in_date, check_out_date, observation_status, confidence, observed_at,
  evidence_reference, evidence_summary, review_status, proposed_action,
  idempotency_key, review_notes
)
VALUES
  (
    'furnished_finder', '951987', 'Property 951987 (lead text: Unit 1)',
    (SELECT id FROM public.units WHERE name='Unit 1' LIMIT 1),
    'Salvatore M', '2026-07-12', '2026-10-17', 'inquiry', 'medium',
    '2026-07-25 12:56:28-04',
    'Hermes occupancy observation v1.0.0',
    'Inquiry only. It overlaps Samuel Martin in Unit 1 and must not be treated as a confirmed stay.',
    'superseded', 'ignore', 'hermes-ff-20260725-951987-salvatore',
    'Classified as an inquiry; no reservation was created.'
  ),
  (
    'furnished_finder', '951988', 'Property 951988 (lead text: Unit 1)',
    (SELECT id FROM public.units WHERE name='Unit 1' LIMIT 1),
    'Kristin T', '2026-06-08', '2026-07-31', 'inquiry', 'medium',
    '2026-07-25 12:56:28-04',
    'Hermes occupancy observation v1.0.0',
    'Inquiry only with an unresolved listing-to-unit mismatch. It must not be treated as a confirmed stay.',
    'superseded', 'ignore', 'hermes-ff-20260725-951988-kristin',
    'Classified as an inquiry; no reservation was created.'
  )
ON CONFLICT (idempotency_key) DO NOTHING;
