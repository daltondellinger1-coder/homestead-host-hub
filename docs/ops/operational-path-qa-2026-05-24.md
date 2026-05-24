# Homestead Hill / Host Hub Operational Path QA — 2026-05-24

Scope: public site, Host Hub admin, calendar, requests, finances, maintenance, maintenance portal, backend read verification, automated tests/build/lint.

Marker policy: initial sweep made no new writes. After Dalton approved cleanup, marker-scoped synthetic rows were deleted from production data.

Update after fix/cleanup:
- Fixed `MaintenanceHealth` and the admin health-check Edge Function source to use `webhook_payload_log.received_at` instead of nonexistent `created_at`.
- Pushed commit `f27c116` to GitHub `main` for the `received_at` fix, then pushed `a60731c` with a harmless deploy marker to force a fresh Lovable bundle.
- Deleted marker-scoped test data only: 2 `booking_requests`, 1 generated `guest`, and 1 generated `payment` tied to the Unit 5 automation guest.
- Verified no remaining `Automation` / `Hermes` / `AUTOMATION TEST ONLY` rows in `booking_requests`, `guests`, or `payments` via authenticated REST checks.
- Published Lovable production again. Live HTML now serves `assets/index-B0snZRQX.js`; that bundle contains `id,received_at`, does not contain `id,created_at`, and `/maintenance/health` loads recent webhook rows.

## Automated checks

| Check | Result | Notes |
|---|---:|---|
| `npm test` | PASS | 14 test files / 31 tests passed. Covers role routing, first admin claim, calendar sync health, finance UX, maintenance QA/webhook/idempotency/notifications/tutorial. |
| `npm run build` | PASS with warning | Production build completed. Vite warns main JS chunk is ~1.49 MB / 420 KB gzip. |
| `npm run lint` | FAIL | 36 errors / 11 warnings. Most are `no-explicit-any`; also `no-empty-object-type`, `no-require-imports`, and one hook dependency warning. |
| HTTP availability sweep | PASS | Public routes and Host Hub app routes returned HTTP 200. |

## Live UI path matrix

| Area / path | Status | Evidence / notes |
|---|---:|---|
| Public site home/nav | PASS | Home loaded; nav links present; console clean on public home. |
| Public units/amenities/gallery/location/FAQ/contact routes | PASS | HTTP 200 for each route. |
| Public booking form: unit selection + date gating | PASS/PARTIAL | Form loads; unit selector works; check-in date is disabled until a unit is selected, then date picker opens. I did **not** submit a booking request because that can trigger outbound notifications/email. |
| Host Hub auth/session | PASS | Existing logged-in session loaded live data. |
| Host Hub Units dashboard | PASS | 15 units rendered; KPI cards show monthly income and occupancy; unit cards render current/vacant/planning/storage states. |
| Unit cards: read/payment/detail entry points | PARTIAL | Mark Paid / Manage Payments / More Details buttons are present. I did not submit real payment/status changes against real guests. |
| Calendar view | PASS | Calendar view renders channel sync health banner and per-unit calendar blocks. |
| Booking Requests: pending | PASS | Pending tab renders empty state and 0 pending. |
| Booking Requests: approved | PASS/PARTIAL | Approved tab renders existing approved automation rows, including `Automation Test Guest - Unit 5` and another Hermes test row. These are still present. |
| Booking Requests: declined | PASS | Declined tab renders real declined request with reason. |
| Finances: reports | PASS | Reports tab loads month/year/custom/all-time controls, KPI cards, charts/sections. |
| Finances: weekly | PASS | Weekly report loads occupancy outlook, upcoming/overdue/vacancy KPIs and unit table. |
| Finances: management | PASS/PARTIAL | Management dashboard renders KPIs, fee tier, save fee control, unit performance. I did not save a fee record. |
| Finances: history | PASS/PARTIAL | Payment history renders totals, filters, table, bulk delete control. I did not bulk delete. |
| Maintenance admin list | PASS | Maintenance route renders one New request: Unit 13 gas leak. |
| Maintenance request detail/read | PASS/PARTIAL | Detail dialog opens with description, photo link, urgent switch, status buttons, notes, archive/delete. I did not alter the real gas leak request. |
| Maintenance portal | PASS/PARTIAL | Portal route loads maintenance-only work order view and onboarding tutorial; work order list appears. No status changes made against real request. |
| Maintenance webhook health | PASS | Live production now serves the fresh bundle and `/maintenance/health` loads recent `webhook_payload_log` rows. Verified visible counts: 12 Tally logs, 13 Notifications, 13 Needs review, with dated rows rendered from `received_at`. |
| Backend read via authenticated browser token | PASS/PARTIAL | Read-only REST check found: units 15, guests 28, payments 74, booking_requests 3, maintenance_requests 1, webhook_payload_log 63. `notification_log` and `airbnb_blocks` table names were not found via REST. |
| Direct Airbnb/channel verification | NOT VERIFIED | No authenticated Airbnb/channel access used. App-side blocks/calendar view rendered. |
| Real payment/charge flow | NOT VERIFIED | Intentionally not run; no real card/charge approval. |
| Outbound email/text notification flow | NOT VERIFIED | Intentionally not run; outbound messages require explicit draft approval. |
| Cleanup destructive path | NOT RUN | Existing synthetic rows observed, but no deletion performed without approval. |

## Bugs / blockers found

### 1. Maintenance Webhook Health deployment lag — resolved
- Severity: High
- Category: Functional / Ops visibility
- URL: `https://homestead-host-hub.lovable.app/maintenance/health`
- Original issue: page showed 0 Tally logs / 0 Notifications / 0 Needs review because the old production bundle queried `webhook_payload_log.created_at`.
- Fix: source now selects/orders `received_at`; Lovable production was republished after a no-op deploy marker commit.
- Final verification: live bundle `assets/index-B0snZRQX.js` contains `id,received_at` and not `id,created_at`; health page renders 25 recent rows.

### 2. Lint gate is red
- Severity: Medium
- Category: Code quality / CI readiness
- Actual: `npm run lint` fails with 36 errors.
- Most common cause: `@typescript-eslint/no-explicit-any` across dashboard/finance/hooks/edge functions.
- Other errors: empty interface types in shadcn UI wrappers and `require()` in tailwind config.
- Recommended fix: either properly type the app-specific rows/responses or relax lint for generated/shadcn/edge-function files intentionally.

### 3. Existing automation rows remain in production data
- Severity: Low/Medium
- Category: Data hygiene
- Observed: Approved requests/payment history include `Automation Test Guest - Unit 5` and prior Hermes automation test rows.
- Recommended action: if Dalton approves, cleanup only marker-scoped rows and generated dependent rows matching the exact automation markers/IDs.

## Cleanup status

- Marker-scoped synthetic rows from prior automation were removed after approval: 2 `booking_requests`, 1 generated `guest`, and 1 generated `payment`.
- Re-verified no remaining `Automation` / `Hermes` / `AUTOMATION TEST ONLY` rows in `booking_requests`, `guests`, or `payments`.
- The maintenance health page now exposes historical webhook log rows; existing log rows are observational/audit history and were not bulk-deleted.
