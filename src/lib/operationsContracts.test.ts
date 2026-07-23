import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260723154000_homestead_helper_v1.sql'),
  'utf8',
);
const cleanerFunction = readFileSync(
  resolve(process.cwd(), 'supabase/functions/cleaner-task-access/index.ts'),
  'utf8',
);
const dispatchFunction = readFileSync(
  resolve(process.cwd(), 'supabase/functions/operations-dispatch/index.ts'),
  'utf8',
);
const operationsPage = readFileSync(resolve(process.cwd(), 'src/pages/Operations.tsx'), 'utf8');
const cleanerPage = readFileSync(resolve(process.cwd(), 'src/pages/CleanerPortal.tsx'), 'utf8');

describe('Homestead Helper V1 contracts', () => {
  it('creates reservations atomically with a guest and blocks overlaps', () => {
    expect(migration).toContain('create_reservation_with_guest');
    expect(migration).toContain('prevent_reservation_overlap');
    expect(migration).toContain("ERRCODE = '23P01'");
    expect(migration).toContain("ON CONFLICT (departing_reservation_id)");
  });

  it('updates or cancels the same cleaning task when reservation dates or status change', () => {
    expect(migration).toContain('reservations_sync_cleaning');
    expect(migration).toMatch(/IF NEW\.status = 'cancelled'[\s\S]+UPDATE public\.cleaning_tasks/);
    expect(migration).toContain('google_calendar_event_id');
    expect(dispatchFunction).toContain('method: task.google_calendar_event_id ? "PATCH" : "POST"');
  });

  it('requires readiness verification after cleaner completion', () => {
    expect(migration).toContain("NEW.status := 'readiness_verification_required'");
    expect(migration).toContain("NEW.readiness_verification_status := 'required'");
    expect(migration).toContain("Readiness verification must pass before a unit is marked ready.");
    expect(operationsPage).toContain('Unit presentation acceptable');
  });

  it('uses expiring, hashed, revocable cleaner links without exposing unrelated data', () => {
    expect(cleanerFunction).toContain('crypto.subtle.digest("SHA-256"');
    expect(cleanerFunction).toContain('expires_at');
    expect(cleanerFunction).toContain('revoked_at');
    expect(cleanerFunction).not.toContain('monthly_rate');
    expect(cleanerFunction).not.toContain('payment');
    expect(cleanerFunction).not.toContain('wifi_secret_reference');
    expect(cleanerPage).toContain('Only the work assigned to you');
  });

  it('restricts cleaner uploads to image types and ten megabytes', () => {
    expect(cleanerFunction).toContain('"image/jpeg", "image/png", "image/webp"');
    expect(cleanerFunction).toContain('10 * 1024 * 1024');
    expect(migration).toContain("'cleaning-photos'");
    expect(migration).toContain('10485760');
  });

  it('keeps outbound delivery disabled until production settings are verified', () => {
    expect(dispatchFunction).toContain('OPERATIONS_DELIVERY_ENABLED');
    expect(dispatchFunction).toContain('GOOGLE_CLEANING_CALENDAR_ID');
    expect(dispatchFunction).toContain('RESEND_API_KEY');
    expect(dispatchFunction).toContain('SMS provider is not configured for Version 1.');
    expect(dispatchFunction).toContain('"Idempotency-Key"');
  });

  it('keeps owner decisions separate from property-manager approval requests', () => {
    expect(migration).toContain('Owners manage approval requests');
    expect(migration).toContain('Property managers create pending approvals');
    expect(migration).toContain("status = 'pending'");
    expect(migration).toContain('Owners manage approval rules');
  });

  it('includes phone-friendly controls for the critical manager and cleaner workflows', () => {
    expect(operationsPage).toContain('min-h-11');
    expect(operationsPage).toContain('overflow-x-auto');
    expect(cleanerPage).toContain('min-h-12');
    expect(cleanerPage).toContain('accept="image/jpeg,image/png,image/webp"');
  });
});
