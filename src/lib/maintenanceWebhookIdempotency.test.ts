import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const functionSource = readFileSync(resolve(process.cwd(), 'supabase/functions/tally-maintenance-webhook/index.ts'), 'utf8');
const migrationsDir = resolve(process.cwd(), 'supabase/migrations');

describe('maintenance webhook idempotency contract', () => {
  it('returns the existing request and marks duplicate submissions as duplicate_ignored', () => {
    expect(functionSource).toContain('tally_event_id');
    expect(functionSource).toContain('maybeSingle()');
    expect(functionSource).toContain('duplicate_ignored');
    expect(functionSource).toContain('notification_sent: false');
  });

  it('adds a partial unique index for non-null Tally event IDs', () => {
    const migrationPath = resolve(migrationsDir, '20260523123000_unique_maintenance_tally_event_id.sql');
    expect(existsSync(migrationPath)).toBe(true);
    const migration = readFileSync(migrationPath, 'utf8');
    expect(migration).toMatch(/create unique index if not exists/i);
    expect(migration).toContain('maintenance_requests');
    expect(migration).toContain('tally_event_id');
    expect(migration).toMatch(/where\s+tally_event_id\s+is\s+not\s+null/i);
  });
});
