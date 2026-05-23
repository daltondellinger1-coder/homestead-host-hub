import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const functionPath = resolve(process.cwd(), 'supabase/functions/maintenance-webhook-health-check/index.ts');

describe('admin maintenance webhook health-check function contract', () => {
  it('exists and supports run_test plus cleanup actions', () => {
    expect(existsSync(functionPath)).toBe(true);
    const source = readFileSync(functionPath, 'utf8');
    expect(source).toContain('run_test');
    expect(source).toContain('cleanup');
    expect(source).toContain('tally-maintenance-webhook');
    expect(source).toContain('TALLY_WEBHOOK_SECRET');
    expect(source).toContain('TALLY_MAINTENANCE_WEBHOOK_SECRET');
    expect(source).toContain('response.ok ?');
  });

  it('requires an active admin role and uses service role only inside the Edge Function', () => {
    const source = readFileSync(functionPath, 'utf8');
    expect(source).toContain('requireAdmin');
    expect(source).toContain('.from("user_roles")');
    expect(source).toContain('.eq("role", "admin")');
    expect(source).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(source).not.toMatch(/console\.log\(.*SECRET|console\.log\(.*KEY/i);
  });
});
