import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const edgeFunctionSource = readFileSync(
  resolve(process.cwd(), 'supabase/functions/maintenance-notifications/index.ts'),
  'utf8',
);

describe('maintenance notifications edge function auth contract', () => {
  it('uses Supabase getUser for bearer JWT validation instead of unavailable getClaims', () => {
    expect(edgeFunctionSource).not.toContain('.auth.getClaims(');
    expect(edgeFunctionSource).toContain('.auth.getUser(');
  });
});
