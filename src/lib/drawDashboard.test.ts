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

  it('extracts totals using the Total Budget row', () => {
    expect(data.totals.totalBudget).toBe(171024.53);
    expect(data.totals.totalActual).toBe(32379.26);
    expect(data.totals.totalPaidFromDraws).toBe(23837.41);
    expect(data.totals.totalPaidFromOwnerCash).toBe(0);
    expect(data.totals.openCommitted).toBe(38796.96);
    expect(data.totals.netFundingPosition).toBe(-47338.81);
    expect(data.totals.status).toBe('Owner cash gap');
  });

  it('parses unit summary rows with Common/Exteriors actual = 4800', () => {
    const common = data.unitSummary.find((u) => u.unit === 'Common/Exteriors');
    expect(common).toBeDefined();
    expect(common!.actual).toBe(4800);
    expect(common!.budget).toBe(25000);
  });

  it('parses ledger rows and flags Unit 14 receipt/QBO verification warning', () => {
    expect(data.ledger.length).toBeGreaterThan(0);
    expect(data.warnings.some((w) => /Unit 14/.test(w))).toBe(true);
  });

  it('flags negative funding position', () => {
    expect(data.warnings.some((w) => /Net funding position is negative/.test(w))).toBe(true);
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
});
