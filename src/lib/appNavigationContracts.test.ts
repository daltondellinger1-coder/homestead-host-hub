import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const authSource = readFileSync(resolve(process.cwd(), 'src/pages/Auth.tsx'), 'utf8');
const financeSource = readFileSync(resolve(process.cwd(), 'src/pages/Finances.tsx'), 'utf8');
const operationsSource = readFileSync(resolve(process.cwd(), 'src/pages/Operations.tsx'), 'utf8');
const extendStaySource = readFileSync(resolve(process.cwd(), 'src/pages/ExtendStay.tsx'), 'utf8');

describe('role entry points', () => {
  it('offers a dedicated cleaner login and route', () => {
    expect(authSource).toContain('Cleaner Login');
    expect(authSource).toContain('to="/auth/cleaner"');
    expect(appSource).toContain('path="/auth/cleaner"');
  });

  it('lets operations assign an active cleaner to a cleaning task', () => {
    expect(operationsSource).toContain('operations.assignCleaner(cleaning.id, cleaner)');
    expect(operationsSource).toContain('Cleaner for ${cleaning.unit?.name');
  });
});

describe('finance deep links', () => {
  it('opens payments in history and reports in reports', () => {
    expect(financeSource).toContain("location.pathname === '/payments'");
    expect(financeSource).toContain("location.pathname === '/reports'");
    expect(financeSource).toContain("? 'history'");
    expect(financeSource).toContain("? 'reports'");
  });
});

describe('guest stay extension', () => {
  it('preselects the QR-code unit and blocks incomplete requests', () => {
    expect(extendStaySource).toContain('searchParams.get("unit")');
    expect(extendStaySource).toContain('disabled={!canSend}');
    expect(extendStaySource).toContain('https://homestead-hill.com/?unit=');
    expect(extendStaySource).toContain('Briana and the Homestead Hill team');
  });
});
