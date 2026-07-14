import { describe, expect, it } from 'vitest';
import { buildPaymentsCsv } from './paymentExport';

describe('buildPaymentsCsv', () => {
  it('emits one row per allocation for split payments and preserves totals', () => {
    const csv = buildPaymentsCsv([
      {
        id: 'p1', date: '2026-01-05', unitName: 'Unit 5', guestName: 'Jane',
        source: 'direct', status: 'paid', amount: 1500,
        allocations: [
          { method: 'venmo', amount: 900 },
          { method: 'cash', amount: 600 },
        ],
      },
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('Venmo');
    expect(lines[1]).toContain('900');
    expect(lines[2]).toContain('Cash');
    expect(lines[2]).toContain('600');
  });

  it('emits a single row for single-method payments and flags needs review', () => {
    const csv = buildPaymentsCsv([
      {
        id: 'p2', date: '2026-01-06', unitName: 'Unit 3', guestName: 'Bob',
        source: 'airbnb', status: 'paid', amount: 1200,
        paymentMethod: 'airbnb',
      },
      {
        id: 'p3', date: '2026-01-07', unitName: 'Unit 4', guestName: 'Sue',
        source: 'direct', status: 'paid', amount: 800,
        needsMethodReview: true,
      },
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('Airbnb');
    expect(lines[2]).toContain('yes'); // needs_method_review
  });

  it('escapes commas and quotes in notes', () => {
    const csv = buildPaymentsCsv([
      { id: 'p4', date: '2026-01-08', unitName: 'U', guestName: 'G', source: 'direct', status: 'paid', amount: 100, note: 'hello, "world"' },
    ]);
    expect(csv).toContain('"hello, ""world"""');
  });
});
