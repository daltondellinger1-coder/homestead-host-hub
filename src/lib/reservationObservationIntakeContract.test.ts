import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const functionPath = resolve(
  root,
  'supabase/functions/reservation-observation-intake/index.ts',
);
const migrationPath = resolve(
  root,
  'supabase/migrations/20260725170000_reservation_observation_intake.sql',
);
const configPath = resolve(root, 'supabase/config.toml');

describe('reservation observation intake contract', () => {
  it('ships the endpoint, audit migration, and JWT-free secret-protected config', () => {
    expect(existsSync(functionPath)).toBe(true);
    expect(existsSync(migrationPath)).toBe(true);
    const source = readFileSync(functionPath, 'utf8');
    const config = readFileSync(configPath, 'utf8');
    expect(source).toContain('RESERVATION_OBSERVATION_INTAKE_SECRET');
    expect(source).toContain('x-reservation-observation-secret');
    expect(source).toContain('Reservation observation intake is not configured');
    expect(source).toContain('return json({ error: "Unauthorized" }, 401)');
    expect(config).toMatch(
      /\[functions\.reservation-observation-intake\]\s*\nverify_jwt = false/,
    );
  });

  it('accepts the stable observation contract and resolves units without canonical writes', () => {
    const source = readFileSync(functionPath, 'utf8');
    for (const field of [
      'schema_version',
      'source_record_id',
      'listing_label',
      'proposed_unit_mapping',
      'guest_name',
      'check_in_date',
      'check_out_date',
      'observed_at',
      'confidence',
      'evidence_reference',
      'conflicts',
      'idempotency_key',
    ]) {
      expect(source).toContain(field);
    }
    expect(source).toContain('.from("reservation_source_observations")');
    expect(source).not.toContain('.from("reservations")');
    expect(source).not.toContain('.from("cleaning_tasks")');
    expect(source).not.toContain('operations-dispatch');
  });

  it('preserves reviewed observations and declares that no delivery occurred', () => {
    const source = readFileSync(functionPath, 'utf8');
    expect(source).toContain('terminal_ignored');
    expect(source).toContain('human decision preserved');
    expect(source).toContain('["pending", "needs_mapping"]');
    expect(source).toContain('canonical_changed: false');
    expect(source).toContain('outbound_sent: false');
  });

  it('records a manager-readable audit event for every intake outcome', () => {
    const source = readFileSync(functionPath, 'utf8');
    const migration = readFileSync(migrationPath, 'utf8');
    expect(source).toContain('.from("reservation_observation_intake_events")');
    for (const outcome of [
      'created',
      'updated',
      'terminal_ignored',
      'rejected_secret',
      'invalid_payload',
    ]) {
      expect(source).toContain(`"${outcome}"`);
      expect(migration).toContain(`'${outcome}'`);
    }
    expect(migration).toContain("public.has_any_role(ARRAY['admin','property_manager'])");
  });
});

