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

  it('includes both received_date and due_date columns in the header', () => {
    const csv = buildPaymentsCsv([]);
    const [header] = csv.split('\n');
    expect(header).toContain('received_date');
    expect(header).toContain('due_date');
    expect(header).toContain('report_basis');
    expect(header).toContain('report_date');
  });

  it('defaults to Received Date basis: report_date matches received date, due_date column carries the due date', () => {
    const csv = buildPaymentsCsv([
      {
        id: 'p5', date: '2026-02-03', dueDate: '2026-02-01',
        unitName: 'Unit 1', guestName: 'Ann',
        source: 'direct', status: 'paid', amount: 1000, paymentMethod: 'cash',
      },
    ]);
    const [, row] = csv.split('\n');
    const cols = row.split(',');
    // header: payment_id, report_basis, report_date, received_date, due_date, ...
    expect(cols[1]).toBe('received');
    expect(cols[2]).toBe('2026-02-03');
    expect(cols[3]).toBe('2026-02-03');
    expect(cols[4]).toBe('2026-02-01');
  });

  it('Due Date basis: report_date follows dueDate, and is blank when due date is missing', () => {
    const csv = buildPaymentsCsv([
      {
        id: 'p6', date: '2026-02-03', dueDate: '2026-02-01',
        unitName: 'Unit 1', guestName: 'Ann',
        source: 'direct', status: 'paid', amount: 1000, paymentMethod: 'cash',
      },
      {
        id: 'p7', date: '2026-02-10',
        unitName: 'Unit 2', guestName: 'Legacy',
        source: 'direct', status: 'paid', amount: 500, paymentMethod: 'cash',
      },
    ], 'due');
    const rows = csv.split('\n').slice(1);
    const [row1, row2] = rows.map(r => r.split(','));
    expect(row1[1]).toBe('due');
    expect(row1[2]).toBe('2026-02-01'); // reports on due date
    expect(row2[1]).toBe('due');
    expect(row2[2]).toBe(''); // blank when due date unrecorded
    expect(row2[4]).toBe(''); // due_date column also blank
  });
});
