# Reservation observation intake

This endpoint is the only supported write boundary between read-only collectors
and Homestead Helper's reservation review queue. It stages evidence for a
property manager. It never changes a canonical reservation, creates a cleaning
assignment, or sends an email, text, or calendar invitation.

## Endpoint

```text
POST https://zcvkdtrsqxgwgkseqapa.supabase.co/functions/v1/reservation-observation-intake
x-reservation-observation-secret: <RESERVATION_OBSERVATION_INTAKE_SECRET>
content-type: application/json
```

Keep the secret in the caller's credential store and the Supabase Edge Function
secret store. Never put it in a workflow export, source file, browser variable,
Obsidian note, or Agent OS transcript.

## Contract

```json
{
  "schema_version": "homestead.reservation-observation.v1",
  "source": "airbnb",
  "source_record_id": "HMABC123",
  "listing_label": "Homestead Hill Unit 11",
  "proposed_unit_mapping": "Unit 11",
  "guest_name": "Example Guest",
  "check_in_date": "2026-08-01",
  "check_out_date": "2026-08-08",
  "status": "confirmed",
  "observed_at": "2026-07-25T20:00:00Z",
  "confidence": "high",
  "evidence_reference": "airbnb/reservations/HMABC123",
  "evidence_summary": "Confirmed reservation shown in host dashboard.",
  "conflicts": [],
  "idempotency_key": "airbnb:HMABC123:2026-07-25T20:00:00Z",
  "raw_payload": {}
}
```

Required fields are `source`, `status`, `observed_at`, `confidence`, and
`idempotency_key`. Supported statuses are `confirmed`, `inquiry`,
`text_signal`, `cancelled`, and `unknown`.

An exact unit name resolves to a unit ID. Unknown or absent mappings are staged
as `needs_mapping`. Inquiries and text signals remain review evidence and the
approval RPC refuses to turn them into reservations.

## Idempotency and review preservation

- A first stable idempotency key creates one staged observation.
- Repeating that key refreshes the observation only while it is pending.
- An approved, rejected, or superseded observation is terminal; a collector
  retry returns `terminal_ignored` and cannot overwrite the human decision.
- Every request attempt records an internal intake event.
- Every success response explicitly reports `canonical_changed: false` and
  `outbound_sent: false`.

## Grasshopper boundary

Grasshopper's historical conversation archive belongs in append-only Obsidian
source records plus living per-unit dossiers. Only a normalized reservation
signal should cross this endpoint. A message can propose a date with
`status: text_signal`, but it cannot become a stay until a manager verifies it
against a booking source and approves a confirmed observation.

