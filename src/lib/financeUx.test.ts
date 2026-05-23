import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/components/FinancialReportsContent.tsx'), 'utf8');

describe('finance UX contract', () => {
  it('adds an always-visible Monthly Income legend', () => {
    expect(source).toContain('Monthly Income legend');
    expect(source).toContain('Collected');
    expect(source).toContain('Upcoming / unpaid');
  });

  it('shows outstanding drilldown grouped by guest for collections follow-up', () => {
    expect(source).toContain('Outstanding by guest');
    expect(source).toContain('byGuest');
    expect(source).toContain('guestName');
  });
});
