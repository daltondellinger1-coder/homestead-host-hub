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

describe('GViz missing-tab fallback hardening', () => {
  it('returns [] for main tracker CSV that lacks Incoming Review marker/title', () => {
    // Simulates GViz silently returning the default (tracker) sheet when the
    // "Incoming Review" tab does not exist. It DOES contain vendor/order-like
    // columns, so a naive parser would happily ingest these rows.
    const trackerCsv = `"Homestead Hill — All Unit Cost Tracker","","","","",""
"Unit / Area","Category","Budget Item / Scope","Vendor / Payee","Invoice / Receipt Link","Order #"
"Unit 7","Interior","Paint","Lowe's","https://x","LOW-111"
"Unit 14","Exterior","Roof","Acme","https://y","CONT-222"
`;
    expect(parseIncomingItems(trackerCsv)).toEqual([]);
  });

  it('accepts CSV when the HH_INCOMING_REVIEW_V1 marker is present (case-insensitive)', () => {
    const csv = `"hh_incoming_review_v1","","","","",""
"sourceId","vendor","sourceType","date","amount","recommendedAction"
"LOW-1","Lowe's","Lowe's","2026-06-20","50","approve"
`;
    const items = parseIncomingItems(csv);
    expect(items.length).toBe(1);
    expect(items[0].sourceId).toBe('LOW-1');
  });

  it('rejects when "Incoming Review" title present but recommendedAction column missing', () => {
    const csv = `"Homestead Hill — Incoming Review","","",""
"sourceId","vendor","amount"
"LOW-1","Lowe's","50"
`;
    expect(parseIncomingItems(csv)).toEqual([]);
  });

  it('rejects when "Incoming Review" title present but sourceId column missing', () => {
    const csv = `"Incoming Review","",""
"vendor","amount","recommendedAction"
"Lowe's","50","approve"
`;
    expect(parseIncomingItems(csv)).toEqual([]);
  });
});


import { isDrawFundingCandidate } from './drawIncoming';
import { applyDrawFunding, type DrawDashboardData } from './drawDashboard';

describe('isDrawFundingCandidate', () => {
  const base = {
    sourceId: 'X', vendor: '', date: '', amount: 0, unit: '', category: '',
    paidStatus: 'unknown' as const, evidenceStatus: 'missing' as const, evidenceUrl: '',
    duplicateCheck: '', confidence: 'medium' as const, notes: '',
    recommendedAction: 'needs-more-proof' as const,
    derivedStatus: 'needs-evidence' as const, isDuplicate: false, warnings: [],
  };
  it('detects gmail_draw_cover sourceType', () => {
    expect(isDrawFundingCandidate({ ...base, sourceType: 'gmail_draw_cover' as any })).toBe(true);
  });
  it('detects draw funded notes', () => {
    expect(isDrawFundingCandidate({ ...base, sourceType: 'gmail' as any, notes: 'Draw funded to savings — not vendor payment evidence' })).toBe(true);
  });
  it('ignores plain vendor invoice', () => {
    expect(isDrawFundingCandidate({ ...base, sourceType: 'lowes' as any, notes: 'paint receipt' })).toBe(false);
  });
});

describe('applyDrawFunding', () => {
  const baseData: DrawDashboardData = {
    totals: {
      totalBudget: 100000, totalActual: 50000, totalPaidFromDraws: 0,
      totalPaidFromOwnerCash: 0, openCommitted: 0, netFundingPosition: -50000, status: '',
    },
    unitSummary: [
      { unit: 'Unit 12', budget: 50000, actual: 30000, drawsApplied: 0, ownerCashApplied: 0, openCommitted: 0, variance: 20000, fundingPosition: -30000 },
    ],
    ledger: [], warnings: [], fetchedAt: '2026-06-25T00:00:00Z',
  };

  it('applies approved funding to totals and matching unit', () => {
    const { data, unallocated } = applyDrawFunding(baseData, [
      { sourceId: 'DRAW-1', amount: 11539.23, unit: 'Unit 12', vendor: 'Lender', appliedAt: '' },
    ]);
    expect(data.totals.totalPaidFromDraws).toBeCloseTo(11539.23);
    expect(data.totals.netFundingPosition).toBeCloseTo(-50000 + 11539.23);
    expect(data.unitSummary[0].drawsApplied).toBeCloseTo(11539.23);
    expect(unallocated).toHaveLength(0);
    expect(data.warnings.some((w) => /pending tracker sync/i.test(w))).toBe(true);
  });

  it('flags unallocated when unit does not match', () => {
    const { data, unallocated } = applyDrawFunding(baseData, [
      { sourceId: 'D2', amount: 1000, unit: 'Unknown', vendor: '', appliedAt: '' },
    ]);
    expect(unallocated).toHaveLength(1);
    expect(data.unitSummary[0].drawsApplied).toBe(0);
    expect(data.warnings.some((w) => /could not be matched/i.test(w))).toBe(true);
  });

  it('does not mutate ledger / receipts', () => {
    const { data } = applyDrawFunding(baseData, [
      { sourceId: 'D3', amount: 500, unit: 'Unit 12', vendor: '', appliedAt: '' },
    ]);
    expect(data.ledger).toBe(baseData.ledger);
  });
});

describe('isDrawFundingCandidate — real gmail draw-cover row', () => {
  it('detects the staged lender draw packet', () => {
    const item: any = {
      sourceId: 'gmail:19efa3dbd5dca9e5:draw-cover',
      vendor: '',
      sourceType: 'gmail',
      date: '2026-06-25',
      amount: 11539.23,
      unit: 'Unit 12',
      category: 'Draw request support',
      paidStatus: 'unknown',
      evidenceStatus: 'linked',
      evidenceUrl: '',
      duplicateCheck: 'possible_draw_cover_duplicate',
      confidence: 'high',
      notes: '6/25 lender reply says funds were released and are available in the savings account. Treat this as draw-funding status only; do not count attached backup items again or as vendor-paid without separate payment proof.',
      recommendedAction: 'approve-to-tracker',
      derivedStatus: 'possible-duplicate',
      isDuplicate: true,
      warnings: [],
    };
    expect(isDrawFundingCandidate(item)).toBe(true);
  });
});
