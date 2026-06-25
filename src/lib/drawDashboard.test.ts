import { describe, expect, it } from 'vitest';
import {
  parseDrawDashboard,
  parseCsv,
  formatCurrency,
  projectedAllIn,
  unitBudgetRemaining,
  unitFundingGap,
  classifyDrawReadiness,
  sourceConfidence,
  computeDecisionSummary,
  isPlanningEstimateOpenRow,
  isWholeUnitProxyRow,
  isSourceLevelProxyRow,
  type LedgerRow,
} from './drawDashboard';


function makeLedger(p: Partial<LedgerRow> = {}): LedgerRow {
  return {
    unit: 'Unit 1',
    category: 'Interior',
    scope: 'Paint',
    budget: 1000,
    actual: 0,
    paidFromDraws: 0,
    paidFromOwnerCash: 0,
    openCommitted: 0,
    variance: 0,
    fundingPosition: 0,
    vendor: '',
    receiptLink: '',
    drawNumber: '',
    status: '',
    source: '',
    notes: '',
    ...p,
  };
}

const SAMPLE_CSV = `"Homestead Hill — All Unit Cost Tracker Purpose Project totals","Track budget vs actual","","","","","","","","","","","",""
"Total Budget","171024.53","Total Actual","32379.26","","23837.41","Total Paid From Owner Cash","0","","38796.96","Net Funding Position","-47338.81","Status","Owner cash gap"
"How to read funding position","Positive = ...","","","","","","","","","","","",""
"Unit summary","","","","","","","","","","","","",""
"Unit / Area","Budget","Actual","","","Open Committed","Variance (Budget-Actual-Open)","","","","","","",""
"Unit 7","23409.61","0","0","0","21266.28","2143.33","-21266.28","","","","","",""
"Common/Exteriors","25000","4800","0","0","0","20200","-4800","","","","","",""
"Unit 14","22920.58","25640.03","23837.41","0","1500","-4219.45","-3302.62","","","","","",""
"Unit / Area","Category","Budget Item / Scope","","","Paid From Draws","Paid From Owner Cash","","","","Vendor / Payee","Invoice / Receipt Link","Draw #","Status","Source / Account","Notes","","Unique ID"
"Common/Exteriors","Exterior","Tree Trimming","5000","4800","","","","200","-4800","","","","Budget pulled","Source","Notes","6/11/2026","key1"
"Unit 14","Exterior","01. ROOFING","1010","1010","","","","0","-1010","","","","Imported / needs receipt-QBO verification","Source","Seeded","6/11/2026","key2"
`;

describe('parseDrawDashboard', () => {
  const data = parseDrawDashboard(SAMPLE_CSV, '2026-06-24T00:00:00Z');

  it('recomputes totals from ledger-derived unit summary (Actual + Open from detail rows)', () => {
    expect(data.totals.totalActual).toBe(5810);
    expect(data.totals.openCommitted).toBe(21266.28); // Unit 7 has no ledger rows; summary value preserved
    expect(data.totals.totalPaidFromDraws).toBe(23837.41);
    expect(data.totals.totalPaidFromOwnerCash).toBe(0);
    expect(data.totals.status).toBe('Owner cash gap');
  });

  it('uses summary budget but recomputes Actual/Open for Common/Exteriors from ledger', () => {
    const common = data.unitSummary.find((u) => u.unit === 'Common/Exteriors');
    expect(common).toBeDefined();
    expect(common!.budget).toBe(25000); // from summary row
    expect(common!.actual).toBe(4800); // from ledger
    expect(common!.openCommitted).toBe(0); // from ledger
  });

  it('warns when source summary Actual/Open differs materially from ledger detail', () => {
    // Unit 14 summary said Actual 25640.03 but ledger Actual = 1010 → reconcile warning
    expect(
      data.warnings.some((w) => /Unit 14/.test(w) && /ledger detail totals/i.test(w)),
    ).toBe(true);
  });

  it('parses ledger rows and flags Unit 14 receipt/QBO verification warning', () => {
    expect(data.ledger.length).toBeGreaterThan(0);
    expect(data.warnings.some((w) => /Unit 14/.test(w) && /receipt/i.test(w))).toBe(true);
  });

  it('flags negative funding position with new wording', () => {
    expect(data.warnings.some((w) => /funding gap/i.test(w))).toBe(true);
    expect(data.warnings.some((w) => /Net funding position is negative/.test(w))).toBe(false);
  });
});

describe('parseDrawDashboard laundry-style mismatch', () => {
  const LAUNDRY_CSV = `"Homestead Hill","","","","","","","","","","","","",""
"Total Budget","13723.79","Total Actual","2855.19","","0","Total Paid From Owner Cash","0","","14770.68","Net Funding Position","-17625.87","Status","gap"
"Unit summary","","","","","","","","","","","","",""
"Unit / Area","Budget","Actual","","","Open Committed","Variance (Budget-Actual-Open)","","","","","","",""
"Laundry/Current Office","13723.79","2855.19","0","0","14770.68","-3902.08","-17625.87","","","","","",""
"Unit / Area","Category","Budget Item / Scope","","","Paid From Draws","Paid From Owner Cash","","","","Vendor","Link","Draw #","Status","Source","Notes","","ID"
"Laundry/Current Office","Interior","Paint","500","500","0","0","0","0","0","","","","ok","src","n","6/25","k1"
"Laundry/Current Office","Interior","Materials","243.11","243.11","0","0","0","0","0","","","","ok","src","n","6/25","k2"
"Laundry/Current Office","Reno","Build-out bid","12980.68","0","0","0","12980.68","0","0","","","","bid","src","n","6/25","k3"
`;
  const data = parseDrawDashboard(LAUNDRY_CSV);

  it('derives Laundry actual/open from ledger detail not summary row', () => {
    const u = data.unitSummary.find((x) => x.unit === 'Laundry/Current Office')!;
    expect(u.budget).toBe(13723.79);
    expect(u.actual).toBeCloseTo(743.11, 2);
    expect(u.openCommitted).toBeCloseTo(12980.68, 2);
    expect(u.variance).toBeCloseTo(0, 2);
    expect(u.fundingPosition).toBeCloseTo(-13723.79, 2);
  });

  it('warns about laundry summary vs ledger mismatch', () => {
    expect(
      data.warnings.some(
        (w) => /Laundry\/Current Office/.test(w) && /ledger detail totals/i.test(w),
      ),
    ).toBe(true);
  });

  it('recomputes top totals from ledger-derived values', () => {
    expect(data.totals.totalActual).toBeCloseTo(743.11, 2);
    expect(data.totals.openCommitted).toBeCloseTo(12980.68, 2);
  });
});




describe('projectedAllIn / unit helpers', () => {
  it('projectedAllIn = actual + open committed', () => {
    expect(projectedAllIn({ actual: 100, openCommitted: 50 })).toBe(150);
  });
  it('unitBudgetRemaining and unitFundingGap reflect projected all-in', () => {
    const u = {
      unit: 'Unit 1', budget: 1000, actual: 400, drawsApplied: 300,
      ownerCashApplied: 0, openCommitted: 200, variance: 400, fundingPosition: -300,
    };
    expect(unitBudgetRemaining(u)).toBe(400); // 1000 - 600
    expect(unitFundingGap(u)).toBe(-300); // 300 - 600
  });
});

describe('classifyDrawReadiness', () => {
  it('ready when actual > 0 and evidence link present', () => {
    const r = makeLedger({ actual: 500, receiptLink: 'https://example.com/r1' });
    expect(classifyDrawReadiness(r)).toBe('ready');
    expect(sourceConfidence(r)).toBe('verified');
  });
  it('needs-evidence when actual > 0 but no link', () => {
    const r = makeLedger({ actual: 500 });
    expect(classifyDrawReadiness(r)).toBe('needs-evidence');
    expect(sourceConfidence(r)).toBe('needs-evidence');
  });
  it('needs-evidence when status indicates imported/needs verification', () => {
    const r = makeLedger({ actual: 500, receiptLink: 'https://x', status: 'Imported / needs receipt-QBO verification' });
    expect(classifyDrawReadiness(r)).toBe('needs-evidence');
  });
  it('not-ready when only open committed', () => {
    const r = makeLedger({ openCommitted: 200 });
    expect(classifyDrawReadiness(r)).toBe('not-ready');
    expect(sourceConfidence(r)).toBe('estimate');
  });
  it('drawn when status says funded and no open commitment', () => {
    const r = makeLedger({ actual: 500, paidFromDraws: 500, receiptLink: 'https://x', status: 'Funded' });
    expect(classifyDrawReadiness(r)).toBe('drawn');
    expect(sourceConfidence(r)).toBe('drawn');
  });
});

describe('computeDecisionSummary', () => {
  it('produces recommendation referencing funding gap and ready items', () => {
    const data = parseDrawDashboard(SAMPLE_CSV, '2026-06-24T00:00:00Z');
    const s = computeDecisionSummary(data);
    // Reconciled totals come from ledger detail, so funding gap reflects
    // recomputed actual/open rather than the source summary row values.
    expect(s.fundingGap).toBe(data.totals.netFundingPosition);
    expect(s.projectedAllIn).toBeCloseTo(data.totals.totalActual + data.totals.openCommitted, 2);
    expect(typeof s.recommendation).toBe('string');
    expect(s.recommendation.length).toBeGreaterThan(0);
  });
});


describe('parseCsv', () => {
  it('handles quoted commas and escaped quotes', () => {
    const rows = parseCsv('"a,b","c""d"\n"e","f"');
    expect(rows).toEqual([['a,b', 'c"d'], ['e', 'f']]);
  });
});

describe('formatCurrency', () => {
  it('renders negatives with a leading minus and two decimals', () => {
    expect(formatCurrency(-47338.81)).toBe('-$47,338.81');
    expect(formatCurrency(0)).toBe('$0.00');
  });

describe('open-row planning estimate classifiers', () => {
  it('detects placeholder / proxy / working estimate / source-level rows', () => {
    expect(
      isPlanningEstimateOpenRow(makeLedger({ openCommitted: 1000, status: 'placeholder' })),
    ).toBe(true);
    expect(
      isPlanningEstimateOpenRow(makeLedger({ openCommitted: 1000, notes: 'proxy for remaining' })),
    ).toBe(true);
    expect(
      isPlanningEstimateOpenRow(makeLedger({ openCommitted: 1000, notes: 'working estimate, not actual' })),
    ).toBe(true);
    expect(
      isPlanningEstimateOpenRow(makeLedger({ openCommitted: 1000, status: 'source-level pull' })),
    ).toBe(true);
    expect(
      isPlanningEstimateOpenRow(makeLedger({ openCommitted: 1000, notes: 'budget pulled' })),
    ).toBe(true);
    expect(
      isPlanningEstimateOpenRow(makeLedger({ openCommitted: 1000, notes: 'firm bid from Acme' })),
    ).toBe(false);
    expect(
      isPlanningEstimateOpenRow(makeLedger({ openCommitted: 0, notes: 'placeholder' })),
    ).toBe(false);
  });

  it('detects whole-unit and source-level proxy rows', () => {
    expect(
      isWholeUnitProxyRow(makeLedger({ openCommitted: 5000, scope: 'Whole-unit contractor estimate' })),
    ).toBe(true);
    expect(
      isSourceLevelProxyRow(makeLedger({ openCommitted: 5000, vendor: "Lowe's", notes: 'quote' })),
    ).toBe(true);
  });
});

describe('parseDrawDashboard Unit 7-style overlap and Unit 12-style budget visibility', () => {
  const CSV = `"Homestead Hill","","","","","","","","","","","","",""
"Total Budget","0","Total Actual","0","","0","Total Paid From Owner Cash","0","","0","Net Funding Position","0","Status",""
"Unit summary","","","","","","","","","","","","",""
"Unit / Area","Budget","Actual","","","Open Committed","Variance","","","","","","",""
"Unit 7","23409.61","0","0","0","21266.28","2143.33","-21266.28","","","","","",""
"Unit 12","10464.17","0","0","0","0","10464.17","0","","","","","",""
"Unit / Area","Category","Budget Item / Scope","","","Paid From Draws","Paid From Owner Cash","","","","Vendor","Link","Draw #","Status","Source","Notes","","ID"
"Unit 7","Interior","Paint scope estimate","2000","0","0","0","2000","0","0","","","","working estimate","src","category-level placeholder","6/25","u7a"
"Unit 7","Contractor","Whole-unit contractor estimate","15000","0","0","0","15000","0","0","ABC GC","","","placeholder","src","whole-unit proxy","6/25","u7b"
"Unit 7","Furnishing","Source-level Lowe's quote","4266.28","0","0","0","4266.28","0","0","Lowe's","","","source-level pull","src","proxy","6/25","u7c"
"Unit 12","Interior","Paint","2000","0","0","0","0","0","0","","","","bid","src","n","6/25","u12a"
"Unit 12","Interior","Flooring","2580.14","0","0","0","0","0","0","","","","bid","src","n","6/25","u12b"
`;
  const data = parseDrawDashboard(CSV);

  it('warns about Unit 7 planning estimate dollars in open committed', () => {
    expect(
      data.warnings.some((w) => /Unit 7/.test(w) && /planning estimates/i.test(w)),
    ).toBe(true);
  });

  it('warns about Unit 7 whole-unit / source-level proxy overlap', () => {
    expect(
      data.warnings.some((w) => /Unit 7/.test(w) && /overlap|double-count/i.test(w)),
    ).toBe(true);
  });

  it('warns about Unit 12 visible ledger budget rows totaling less than summary budget', () => {
    expect(
      data.warnings.some(
        (w) =>
          /Unit 12/.test(w) &&
          /summary budget/i.test(w) &&
          /ledger budget rows/i.test(w),
      ),
    ).toBe(true);
  });

  it('preserves Unit 12 summary budget rather than collapsing to ledger sum', () => {
    const u12 = data.unitSummary.find((u) => u.unit === 'Unit 12')!;
    expect(u12.budget).toBe(10464.17);
  });
});

