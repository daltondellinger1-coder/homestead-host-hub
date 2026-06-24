import { describe, expect, it } from 'vitest';
import { getPostLoginPath, canAccessPath } from './roleRouting';

describe('role-based login routing', () => {
  it('sends property managers to the full Host Hub dashboard', () => {
    expect(getPostLoginPath(['admin'], 'property-manager')).toBe('/');
    expect(canAccessPath('/finances', ['admin'])).toBe(true);
    expect(canAccessPath('/maintenance', ['admin'])).toBe(true);
  });

  it('sends maintenance users to the maintenance-only portal', () => {
    expect(getPostLoginPath(['maintenance'], 'maintenance')).toBe('/maintenance-portal');
    expect(canAccessPath('/maintenance-portal', ['maintenance'])).toBe(true);
    expect(canAccessPath('/finances', ['maintenance'])).toBe(false);
    expect(canAccessPath('/', ['maintenance'])).toBe(false);
  });

  it('defaults mixed-role users based on the login lane they chose', () => {
    expect(getPostLoginPath(['admin', 'maintenance'], 'maintenance')).toBe('/maintenance-portal');
    expect(getPostLoginPath(['admin', 'maintenance'], 'property-manager')).toBe('/');
  });

  it('does not leave assigned users stranded on the unauthorized page after roles load', () => {
    expect(canAccessPath('/unauthorized', ['admin'])).toBe(false);
    expect(canAccessPath('/unauthorized', ['maintenance'])).toBe(false);
    expect(canAccessPath('/unauthorized', [])).toBe(true);
  });

  it('restricts /admin/draws to admins only', () => {
    expect(canAccessPath('/admin/draws', ['admin'])).toBe(true);
    expect(canAccessPath('/admin/draws', ['maintenance'])).toBe(false);
    expect(canAccessPath('/admin/draws', [])).toBe(false);
  });
});

