# Homestead Hill Full-System Test Goal Command

Reusable Hermes command/prompt for end-to-end QA across Homestead Hill public booking, Host Hub admin operations, calendars, payments, finance reports, and maintenance.

## Command Name

`homestead-full-system-test`

## Copy/Paste Goal Command

```text
Hermes, run the Homestead Hill full-system test for the unit(s) I specify.

Scope:
- Public website: https://homestead-hill.com
- Host Hub app: https://homestead-host-hub.lovable.app
- Backend ref: fiunauckxdnaqvlircob
- Use only synthetic AUTOMATION TEST ONLY records.
- Use a far-future low-risk date window, preferably in November, and avoid dates that conflict with any real reservations or blocked dates.
- Do not expose, request, print, or save raw secrets. Use [REDACTED] for secrets.
- Do not send any outbound guest/property-manager/vendor emails or texts without showing me the exact draft and waiting for explicit approval.
- Do not charge a real card or create a real paid booking unless I explicitly approve that exact step.
- Clean up only the synthetic test records after verification unless I ask to preserve evidence.

For each selected unit, test the entire operating path:

1. Preflight / safety
   - Confirm the exact unit name/ID and current live availability.
   - Select a future test stay window in November or another low-risk future month.
   - Check current bookings/calendar blocks first so the synthetic test cannot interfere with real guests.
   - Confirm which external calendar channels are currently connected/live (Airbnb/iCal/other). If Airbnb cannot be verified directly, label it as not directly verified and verify the app-side outbound block/export state instead.

2. Public booking request
   - Create a synthetic booking through https://homestead-hill.com as a realistic guest.
   - Use clear marker: AUTOMATION TEST ONLY from Hermes.
   - Use test guest name, test email/phone, and a realistic but obviously synthetic note.
   - Verify the request lands in the expected backend row/log/inbox/admin queue as pending, not an active guest unless approval conversion is part of the test.

3. Admin approval / conversion
   - In Host Hub admin, approve or convert the synthetic request using the normal property-manager workflow.
   - Verify the app creates the correct guest/reservation/booking record, unit assignment, dates, status, source, and audit/timeline entries.
   - Note every UX friction point: too many clicks, unclear labels, missing confirmation, missing context, or confusing status changes.

4. Calendar blocking
   - Verify the booking blocks the unit calendar inside Host Hub.
   - Verify it appears on the calendar view with enough property-manager context: guest, unit, source, status, check-in/out, balance/payment status, and next action.
   - Verify outbound calendar/channel sync behavior where accessible.
   - For Airbnb: verify directly if authenticated access is available; otherwise verify the app-side exported/blocking feed state and clearly state Airbnb direct verification was not available.

5. Payments and finance reporting
   - Verify payment/deposit/rent/fees are recorded in the expected tables/state.
   - Do not run a real charge unless explicitly approved.
   - Verify the Finances tab/report reflects the synthetic booking correctly: expected revenue, paid/unpaid/balance, deposits, fees/taxes if implemented, unit/property breakdown, and date filtering.
   - Confirm property-manager KPIs are present and understandable: occupancy, upcoming arrivals/departures, open balances, revenue by unit, unpaid/needs-attention items, and maintenance load.

6. Maintenance request system
   - Submit a fresh synthetic maintenance request for the same unit using the real public/QR/Tally intake path when available.
   - Use marker: AUTOMATION TEST ONLY from Hermes.
   - Include realistic tenant/guest issue, phone, and photo if required.
   - Verify webhook log, maintenance_requests row, notifications log, admin dashboard visibility, maintenance portal visibility, lifecycle/status updates, assignment workflow, notes/timeline, and completion photo behavior.

7. Ease-of-use / property-manager QA
   - Evaluate simplicity, efficiency, and clarity for a property manager running daily operations.
   - Track number of clicks, confusing screens, missing next actions, missing KPIs, unclear status labels, duplicate data entry, dead ends, and anything that could cause a missed guest/maintenance/payment task.
   - Check browser console after each major navigation/interaction and capture screenshots for any bug.

8. Cleanup
   - Before cleanup, summarize what was created and ask whether to preserve evidence or remove the synthetic records.
   - If cleanup is approved or previously authorized for this run, delete only rows/logs/files matching the synthetic marker and exact test IDs.
   - Never delete real rows or broad date ranges.

Final report format:
- TL;DR pass/fail per unit
- Unit/date/test IDs used
- Booking flow result
- Admin approval result
- Calendar/App/Airbnb sync result
- Payments/Finances result
- Maintenance flow result
- Property-manager UX/KPI findings
- Bugs found with severity, reproduction steps, evidence, and recommended fix
- Cleanup status and any preserved evidence links/screenshots
```

## Default Test Data Pattern

Use per-unit unique values so cleanup and auditing are safe:

- Guest name: `Automation Test Guest - <Unit Name>`
- Email: `booking+automation-<unit-slug>-<yyyymmdd>@homestead-hill.com` if accepted; otherwise use a safe test inbox Dalton provides.
- Phone: `812-555-01XX`
- Booking note: `AUTOMATION TEST ONLY from Hermes: full-system booking/calendar/payment QA for <Unit Name>. Delete after verification.`
- Maintenance reporter: `Automation Maintenance Test - <Unit Name>`
- Maintenance issue title: realistic unit-specific issue, e.g. `Bathroom sink slow drain - full-system QA`
- Maintenance description: `AUTOMATION TEST ONLY from Hermes: realistic maintenance QA tied to synthetic booking for <Unit Name>. Delete after verification.`

## Required Approval Gates

Stop and ask Dalton before:

1. Approving/confirming anything that could block a real external calendar if current availability cannot be verified.
2. Running a real payment/card charge.
3. Sending any guest, tenant, vendor, cleaner, admin, or property-manager email/text.
4. Deleting records unless cleanup scope is exact and synthetic-marker-scoped.
5. Making code/schema/config changes discovered during QA.

## Current Known System Boundaries

- Host Hub Supabase backend ref: `fiunauckxdnaqvlircob`.
- Direct Airbnb verification may require logged-in browser/API access. If unavailable, verify internal calendar/export state and report Airbnb direct verification as blocked, not passed.
- Payments may be simulated unless a safe Stripe/Square/test-mode path is available and confirmed.
- Tally/maintenance testing must use the live form and verify both `webhook_payload_log.processed_status = ok` and `maintenance_requests` rows.

## Unit Rollout Mode

For all current and future units:

1. Build/read the canonical unit list first from Host Hub/backend/app, not from memory.
2. Run one pilot unit end-to-end.
3. Fix or document blockers.
4. Run the remaining units in small batches with unique synthetic markers.
5. Produce a unit-by-unit QA matrix and aggregate KPI/UX recommendations.
