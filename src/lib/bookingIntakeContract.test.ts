import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const functionPath = resolve(root, 'supabase/functions/booking-intake/index.ts');
const migrationPath = resolve(root, 'supabase/migrations/20260720090000_booking_intake.sql');
const generatedMigrationPath = resolve(
  root,
  'supabase/migrations/20260722110307_b74bdb01-84aa-4372-a821-b05417ef6b90.sql',
);
const configPath = resolve(root, 'supabase/config.toml');

describe('booking intake foundation contract', () => {
  it('requires a dedicated shared secret instead of accepting unauthenticated writes', () => {
    const source = readFileSync(functionPath, 'utf8');
    expect(source).toContain('BOOKING_INTAKE_SECRET');
    expect(source).toContain('x-booking-intake-secret');
    expect(source).toContain('Booking intake is not configured');
    expect(source).toContain('return json({ error: "Unauthorized" }, 401)');
  });

  it('validates core request fields and preserves human-reviewed requests', () => {
    const source = readFileSync(functionPath, 'utf8');
    for (const field of ['source', 'external_booking_id', 'external_listing_id', 'guest_name', 'guest_email', 'check_in', 'check_out']) {
      expect(source).toContain(`"${field}"`);
    }
    expect(source).toContain('check_out must be after check_in');
    expect(source).toContain('Existing request is ${existing.status}; human decision preserved');
    expect(source).toContain('terminal_ignored');
  });

  it('uses Homestead Helper listing mappings and source booking IDs to prevent duplicates', () => {
    const source = readFileSync(functionPath, 'utf8');
    const migration = readFileSync(migrationPath, 'utf8');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.booking_listing_mappings');
    expect(migration).toContain('UNIQUE (external_source, external_listing_id)');
    expect(migration).toContain('booking_requests_external_identity_key');
    expect(source).toContain('.from("booking_listing_mappings")');
    expect(source).toContain('listing_mapping_not_found');
    expect(source).toContain('.eq("external_booking_id", externalBookingId)');
  });

  it('records outcomes and can be deployed as a JWT-free, secret-protected edge function', () => {
    const source = readFileSync(functionPath, 'utf8');
    const config = readFileSync(configPath, 'utf8');
    expect(source).toContain('.from("booking_intake_events")');
    for (const outcome of ['created', 'updated', 'review_required', 'rejected_secret']) {
      expect(source).toContain(`"${outcome}"`);
    }
    expect(config).toContain('[functions.booking-intake]');
    expect(config).toMatch(/\[functions\.booking-intake\]\s*\nverify_jwt = false/);
  });

  it('includes the required implementation files', () => {
    expect(existsSync(functionPath)).toBe(true);
    expect(existsSync(migrationPath)).toBe(true);
  });

  it('keeps the generated booking-intake migration replay-safe', () => {
    const generatedMigration = readFileSync(generatedMigrationPath, 'utf8');
    expect(generatedMigration).toContain(
      'DROP POLICY IF EXISTS "Admins manage booking listing mappings"',
    );
    expect(generatedMigration).toContain(
      'DROP TRIGGER IF EXISTS update_booking_listing_mappings_updated_at',
    );
    expect(generatedMigration).toContain(
      'DROP POLICY IF EXISTS "Admins read booking intake events"',
    );
  });
});
