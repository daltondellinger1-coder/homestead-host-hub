# Booking Intake Endpoint — n8n Contract

`booking-intake` is the single controlled entry point for booking-request events. n8n and any provider integration must call this endpoint rather than writing to `booking_requests` directly.

## Endpoint

```text
POST https://<Homestead-Helper-Supabase-project>.supabase.co/functions/v1/booking-intake
x-booking-intake-secret: <BOOKING_INTAKE_SECRET>
content-type: application/json
```

The function is configured without Supabase JWT verification **only** because it verifies `BOOKING_INTAKE_SECRET` itself. Set that secret in Supabase before deployment. Never put it in the n8n workflow JSON, source repository, or an app client bundle; store it in n8n Credentials.

## Canonical payload

```json
{
  "source": "hospitable",
  "booking_source": "airbnb",
  "external_booking_id": "booking_123",
  "external_listing_id": "listing_7",
  "guest_name": "Test Guest",
  "guest_email": "guest@example.com",
  "guest_phone": "+15555550123",
  "check_in": "2026-08-01",
  "check_out": "2026-08-31",
  "guest_count": 2,
  "source_status": "inquiry",
  "message": "Interested in a month-long work stay.",
  "source_updated_at": "2026-07-20T14:00:00Z"
}
```

Required fields: `source`, `external_booking_id`, `external_listing_id`, `guest_name`, `guest_email`, `check_in`, `check_out`.

`booking_source` is optional and must be one of the existing app values: `airbnb`, `vrbo`, `furnished_finder`, `direct`, `long_term`, `lease`, `other`, or `extension`. Unknown values safely fall back to `other`.

## Preconditions

1. Add an admin-managed `booking_listing_mappings` row for every source/listing → Homestead unit relationship.
2. Configure `BOOKING_INTAKE_SECRET` in Supabase.
3. Create an n8n credential for that secret.

An unrecognized listing returns HTTP `202` with `review_required: true`; it does not create a request against the wrong unit.

## Guaranteed behavior

- `external_source + external_booking_id` identifies one booking request.
- A second event for an **unreviewed** request updates that same request.
- A request that a human has approved or declined is returned as `terminal_ignored`; provider retries cannot overwrite the decision.
- Every accepted, rejected, exceptional, or failed intake attempt is logged in `booking_intake_events`.
- The endpoint never sends guest email or approves/declines a stay.

## n8n workflow after deployment

```text
Provider trigger → normalize fields → HTTP Request (booking-intake) → IF review_required/error → internal alert queue
```

Use a Manual Trigger with the sample payload first. The acceptance test is:

1. First request returns `201` / `action: created`.
2. Same external booking ID with changed guest count returns `200` / `action: updated` and does not create a duplicate.
3. Unknown listing returns `202` / `listing_mapping_not_found`.
4. After a staff member approves/declines it, the same input returns `200` / `action: terminal_ignored`.
