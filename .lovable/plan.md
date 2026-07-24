## Goal

Apply `20260723154000_homestead_helper_v1.sql` exactly once to the Lovable Cloud production database, then verify. No code changes, no outbound email/SMS, no data deletions.

## Step 1 — Apply the migration (single transaction)

Submit the entire attached file (1,136 lines) as one migration. The SQL is additive (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING` / `ON CONFLICT DO UPDATE` on seed rows), so a partial re-run is safe, but I will only run it once. If any statement fails the whole migration rolls back and I stop and report.

What it does (summary — full SQL already staged verbatim in the migration tool call):

- **Roles enum:** adds `property_manager`, `cleaner` to `public.app_role`.
- **Admin seed:** inserts Briana admin row for `booking@homestead-hill.com` only if no active admin exists for that email.
- **Guest / unit enrichments:** adds nullable columns to `guests` and `units`; backfills `units.operational_status` from legacy `status`.
- **New tables (12):** `reservations`, `vendors`, `cleaning_tasks`, `operational_tasks`, `checklist_runs`, `approval_rules`, `approval_requests`, `activity_log`, `notifications`, `automation_events`, `cleaner_access_tokens`, `import_runs`. All get RLS + policies.
- **Maintenance requests:** adds vendor/priority/cost/approval/completion columns (all nullable or defaulted).
- **Approval thresholds seeded:** maintenance $250, emergency_maintenance $500 (override allowed), supply_purchase $250, plus six always-approve rules at $0.
- **Functions / triggers:** `has_any_role`, `prevent_reservation_overlap`, `sync_cleaning_task_for_reservation`, `apply_cleaning_status_transition`, `apply_maintenance_approval_threshold`, `log_operational_change`, `create_reservation_with_guest`, `decide_approval_request`, plus `updated_at` triggers on the new tables.
- **Storage:** creates private `cleaning-photos` bucket (10 MB, jpeg/png/webp) with staff-only read + insert policies; replaces legacy public `maintenance-photos` read policy with a staff-only signed-in read policy.
- **One-time backfill:** copies active/future rows from `guests` into `reservations` as `legacy:<guest_id>` (originals untouched; ON CONFLICT DO NOTHING keeps it idempotent).
- **Notifications table:** only in-app rows are written by triggers — no email/SMS is dispatched.

## Step 2 — Read-only verification (after migration succeeds)

Run these `read_query` checks and report results:

1. New tables exist and are RLS-enabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname='public'
      AND tablename IN ('reservations','vendors','cleaning_tasks','operational_tasks',
                        'checklist_runs','approval_rules','approval_requests','activity_log',
                        'notifications','automation_events','cleaner_access_tokens','import_runs')
    ORDER BY tablename;
   ```
2. New columns landed on `guests`, `units`, `maintenance_requests` (spot-check via `information_schema.columns`).
3. Enum values present:
   ```sql
   SELECT unnest(enum_range(NULL::public.app_role))::text;
   ```
4. Functions present:
   ```sql
   SELECT proname FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('has_any_role','prevent_reservation_overlap','sync_cleaning_task_for_reservation',
                      'apply_cleaning_status_transition','apply_maintenance_approval_threshold',
                      'log_operational_change','create_reservation_with_guest','decide_approval_request');
   ```
5. Triggers present on `reservations`, `cleaning_tasks`, `maintenance_requests` (via `pg_trigger`).
6. Policies attached to each new table (`pg_policies`), including cleaner-scoped policies on `cleaning_tasks` and the replaced `maintenance-photos` policy on `storage.objects`.
7. `cleaning-photos` bucket exists and `public = false`:
   ```sql
   SELECT id, public, file_size_limit FROM storage.buckets WHERE id='cleaning-photos';
   ```
8. Briana admin row:
   ```sql
   SELECT email, role, active, display_name FROM public.user_roles
    WHERE lower(email)='booking@homestead-hill.com';
   ```
9. Approval thresholds match spec:
   ```sql
   SELECT category, threshold_amount, enabled, emergency_override_allowed
     FROM public.approval_rules
    WHERE category IN ('maintenance','emergency_maintenance','supply_purchase')
    ORDER BY category;
   ```
   Expected: maintenance=250 / true / false; emergency_maintenance=500 / true / true; supply_purchase=250 / true / false.
10. Pre/post row counts on `guests`, `units`, `payments`, `maintenance_requests` unchanged (only additive columns).

## Failure handling

If any statement errors, Postgres rolls back the whole migration. I stop, report the exact error and the failing statement, and do not retry without your say-so.

## Out of scope

No app code, no edge function changes, no outbound email/SMS, no data deletion, no changes to unrelated functions or secrets.

Switch to build mode to apply.
