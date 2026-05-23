import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const useAuthRolesSource = readFileSync(
  resolve(process.cwd(), 'src/hooks/useAuthRoles.ts'),
  'utf8',
);
const migrationSource = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260523054000_fix_first_admin_claim.sql'),
  'utf8',
);

describe('first property-manager admin claim', () => {
  it('attempts the first-admin claim only from the property-manager login lane after no role is found', () => {
    expect(useAuthRolesSource).toContain("getStoredLoginLane() === 'property-manager'");
    expect(useAuthRolesSource).toContain(".rpc('claim_admin_if_first')");
    expect(useAuthRolesSource.indexOf("nextRoles.length === 0")).toBeLessThan(
      useAuthRolesSource.indexOf(".rpc('claim_admin_if_first')"),
    );
  });

  it('does not let pending email-only admin seed rows block the first real admin claim', () => {
    expect(migrationSource).toContain('AND user_id IS NOT NULL');
    expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.claim_admin_if_first()');
  });
});
