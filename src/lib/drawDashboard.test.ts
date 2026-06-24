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

  it('flags negative funding position with new wording', () => {
    expect(data.warnings.some((w) => /funding gap/i.test(w))).toBe(true);
    expect(data.warnings.some((w) => /Net funding position is negative/.test(w))).toBe(false);
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
    expect(s.fundingGap).toBe(-47338.81);
    expect(s.projectedAllIn).toBeCloseTo(32379.26 + 38796.96, 2);
    expect(typeof s.recommendation).toBe('string');
    expect(s.recommendation.length).toBeGreaterThan(0);
    expect(s.biggestAttention).not.toBeNull();
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
