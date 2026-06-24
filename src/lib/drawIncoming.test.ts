import { describe, expect, it } from 'vitest';
import {
  parseIncomingItems,
  deriveStatus,
  statusLabel,
  actionLabel,
} from './drawIncoming';
import type { LedgerRow } from './drawDashboard';

const CSV = `"Homestead Hill — Incoming Review","","","","","","","","","","","","",""
"sourceId","vendor","sourceType","date","amount","unit","category","paidStatus","evidenceStatus","evidenceUrl","duplicateCheck","confidence","notes","recommendedAction"
"LOW-998877","Lowe's","Lowe's","2026-06-20","412.55","Unit 7","Interior","paid","linked","https://lowes.com/r/998877","","high","Trim + paint","approve"
"AMZ-12345","Amazon","Amazon","2026-06-21","89.10","","Supplies","paid","missing","","","medium","No unit assigned",""
"MEN-555","Menards","Menards","2026-06-22","210","Unit 14","Exterior","invoiced","pending","","","medium","",""
"CONT-INV-77","Acme Contracting","Contractor invoice","2026-06-22","1500","Unit 14","Exterior","open-committed","missing","","","medium","",""
"DUP-ABC","Lowe's","Lowe's","2026-06-19","100","Unit 7","Interior","paid","linked","https://x","duplicate of prior","high","",""
`;

function ledger(): LedgerRow[] {
  return [];
}

describe('parseIncomingItems', () => {
  const items = parseIncomingItems(CSV, { ledger: ledger() });

  it('parses all incoming rows', () => {
    expect(items.length).toBe(5);
  });

  it('paid + linked evidence → paid-verified, approve-to-tracker', () => {
    const r = items.find((i) => i.sourceId === 'LOW-998877')!;
    expect(r.derivedStatus).toBe('paid-verified');
    expect(r.recommendedAction).toBe('approve-to-tracker');
    expect(r.warnings.length).toBe(0);
    expect(r.amount).toBe(412.55);
    expect(r.sourceType).toBe('lowes');
  });

  it('paid but missing evidence → needs-evidence with warnings', () => {
    const r = items.find((i) => i.sourceId === 'AMZ-12345')!;
    expect(r.derivedStatus).toBe('needs-evidence');
    expect(r.warnings.some((w) => /evidence|receipt/i.test(w))).toBe(true);
    expect(r.warnings.some((w) => /unit/i.test(w))).toBe(true);
    expect(r.recommendedAction).toBe('change-unit-category');
  });

  it('invoiced → invoice-received', () => {
    const r = items.find((i) => i.sourceId === 'MEN-555')!;
    expect(r.derivedStatus).toBe('invoice-received');
  });

  it('open-committed contractor invoice maps correctly', () => {
    const r = items.find((i) => i.sourceId === 'CONT-INV-77')!;
    expect(r.derivedStatus).toBe('open-committed');
    expect(r.sourceType).toBe('contractor-invoice');
  });

  it('duplicateCheck text flags possible-duplicate', () => {
    const r = items.find((i) => i.sourceId === 'DUP-ABC')!;
    expect(r.isDuplicate).toBe(true);
    expect(r.derivedStatus).toBe('possible-duplicate');
  });

  it('returns empty array for empty/missing CSV', () => {
    expect(parseIncomingItems('')).toEqual([]);
    expect(parseIncomingItems('<html>error</html>')).toEqual([]);
  });
});

describe('duplicate detection against ledger source IDs', () => {
  it('flags items whose sourceId appears in a ledger row note/receipt', () => {
    const ledgerRows: LedgerRow[] = [
      {
        unit: 'Unit 7', category: 'Interior', scope: 'Trim',
        budget: 500, actual: 412.55, paidFromDraws: 0, paidFromOwnerCash: 0,
        openCommitted: 0, variance: 87.45, fundingPosition: 0,
        vendor: "Lowe's", receiptLink: 'https://lowes.com/r/LOW-998877',
        drawNumber: '', status: '', source: '', notes: 'order LOW-998877',
      },
    ];
    const items = parseIncomingItems(CSV, { ledger: ledgerRows });
    const r = items.find((i) => i.sourceId === 'LOW-998877')!;
    expect(r.isDuplicate).toBe(true);
    expect(r.derivedStatus).toBe('possible-duplicate');
  });
});

describe('staged items do not change ledger totals', () => {
  it('parseIncomingItems is pure and does not mutate ledger input', () => {
    const ledgerRows: LedgerRow[] = [
      {
        unit: 'Unit 7', category: 'Interior', scope: '', budget: 1000,
        actual: 100, paidFromDraws: 0, paidFromOwnerCash: 0,
        openCommitted: 50, variance: 850, fundingPosition: 0,
        vendor: '', receiptLink: '', drawNumber: '', status: '', source: '', notes: '',
      },
    ];
    const before = JSON.stringify(ledgerRows);
    parseIncomingItems(CSV, { ledger: ledgerRows });
    expect(JSON.stringify(ledgerRows)).toBe(before);
  });
});

describe('badge mapping helpers', () => {
  it('statusLabel + actionLabel return readable text', () => {
    expect(statusLabel('paid-verified')).toMatch(/Paid/);
    expect(statusLabel('possible-duplicate')).toMatch(/Duplicate/i);
    expect(actionLabel('approve-to-tracker')).toMatch(/Approve/);
    expect(actionLabel('mark-not-homestead')).toMatch(/not Homestead/);
  });
  it('deriveStatus prioritizes duplicates', () => {
    expect(deriveStatus('paid', 'linked', true)).toBe('possible-duplicate');
  });
});
