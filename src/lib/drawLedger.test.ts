import { describe, expect, it } from 'vitest';
import {
  parseDrawLedger,
  classifyDrawLedgerRow,
  bucketLabel,
  DRAW_LEDGER_MARKER,
} from './drawLedger';

const HEADERS = [
  'ledgerId','property','unitArea','vendorPayee','docType','docDate','amount',
  'scopeCategory','sourceLink','sourceEvidence','drawStatus','readyForDraw',
  'submittedToDerek','drawRequest','submittedDate','grossSubmittedAmount',
  'expectedFundedAmount','fundedAmount','fundedDate','duplicateRule','notes',
  'sourceCostTrackerId',
].join(',');

const CSV = `"${DRAW_LEDGER_MARKER}","","","","","","","","","","","","","","","","","","","","",""
${HEADERS}
"L-1","HH","Unit 7","Lowe's","receipt","2026-06-01","412.55","Interior","https://x/1","linked","actual","TRUE","FALSE","","","","","","","","Receipt-backed and unsubmitted",""
"L-2","HH","Unit 14","Acme","invoice","2026-06-02","1500","Exterior","https://x/2","linked","actual","TRUE","TRUE","DR-1","2026-06-10","1500","1500","","","","Submitted, awaiting funding",""
"L-3","HH","Unit 12","Bank","draw","2026-05-15","5000","Funding","","","funded","TRUE","TRUE","DR-0","2026-05-20","5000","5000","5000","2026-05-25","","",""
"L-4","HH","Unit 7","Tim Kirk","quote","2026-06-01","4600","Interior","","","open-committed","FALSE","FALSE","","","","","","","","Quote only — not ready",""
"L-5","HH","Laundry","Kayton/Jones","quote","2026-06-01","4130","Laundry","","","open-committed","FALSE","FALSE","","","","","","","","Quote only",""
"L-6","HH","Unit 3","Menards","receipt","2026-06-03","800","Interior","https://x/6","linked","actual","TRUE","TRUE","DR-2","2026-06-15","800","800","VERIFY","","","Funded amount needs verification",""
`;

describe('parseDrawLedger', () => {
  const s = parseDrawLedger(CSV, '2026-06-26T00:00:00.000Z');

  it('parses all rows when marker present', () => {
    expect(s.rows.length).toBe(6);
  });

  it('classifies ready-to-submit (readyForDraw && !submittedToDerek)', () => {
    const r = s.rows.find((x) => x.ledgerId === 'L-1')!;
    expect(classifyDrawLedgerRow(r)).toBe('ready-to-submit');
    expect(s.buckets['ready-to-submit'].count).toBe(1);
    expect(s.buckets['ready-to-submit'].amount).toBeCloseTo(412.55, 2);
  });

  it('classifies submitted-to-derek (submitted && not funded && not VERIFY)', () => {
    const r = s.rows.find((x) => x.ledgerId === 'L-2')!;
    expect(classifyDrawLedgerRow(r)).toBe('submitted-to-derek');
    expect(s.buckets['submitted-to-derek'].count).toBe(1);
  });

  it('classifies funded when fundedAmount is numeric > 0', () => {
    const r = s.rows.find((x) => x.ledgerId === 'L-3')!;
    expect(classifyDrawLedgerRow(r)).toBe('funded');
    expect(s.buckets.funded.amount).toBeCloseTo(5000, 2);
  });

  it('treats quotes / open commitments as needs-proof', () => {
    const tim = s.rows.find((x) => x.ledgerId === 'L-4')!;
    const kj = s.rows.find((x) => x.ledgerId === 'L-5')!;
    expect(classifyDrawLedgerRow(tim)).toBe('needs-proof');
    expect(classifyDrawLedgerRow(kj)).toBe('needs-proof');
    expect(s.buckets['needs-proof'].count).toBe(2);
  });

  it('flags fundedAmount=VERIFY separately with warning', () => {
    const r = s.rows.find((x) => x.ledgerId === 'L-6')!;
    expect(r.fundedAmountVerify).toBe(true);
    expect(classifyDrawLedgerRow(r)).toBe('needs-funded-verification');
    expect(s.buckets['needs-funded-verification'].count).toBe(1);
    expect(s.warnings.some((w) => /VERIFY/.test(w))).toBe(true);
  });

  it('returns empty summary when marker missing (no GViz fallback contamination)', () => {
    const noMarker = CSV.split('\n').slice(1).join('\n');
    const out = parseDrawLedger(noMarker);
    expect(out.rows.length).toBe(0);
    expect(out.buckets['ready-to-submit'].count).toBe(0);
  });

  it('bucketLabel returns human strings for every bucket', () => {
    expect(bucketLabel('ready-to-submit')).toMatch(/ready/i);
    expect(bucketLabel('submitted-to-derek')).toMatch(/do not resubmit/i);
    expect(bucketLabel('funded')).toMatch(/funded/i);
    expect(bucketLabel('needs-proof')).toMatch(/not ready/i);
    expect(bucketLabel('needs-funded-verification')).toMatch(/verification/i);
  });
});

describe('parseDrawLedger — HH_INCOMING_REVIEW_V1 fallback schema', () => {
  const INC_HEADERS = [
    'sourceId','vendor','sourceType','date','amount','unit','category',
    'paidStatus','evidenceStatus','evidenceUrl','duplicateCheck','confidence',
    'notes','recommendedAction','submittedDate','grossSubmittedAmount',
    'expectedFundedAmount','fundedAmount','fundedDate','duplicateRule','notes',
    'sourceCostTrackerId',
  ].join(',');
  const CSV = `"HH_INCOMING_REVIEW_V1","","","","","","","","","","","","","","","","","","","","",""
${INC_HEADERS}
"gmail:19f04b962bda2261:rcs-washer-dryer","RCS Superstore","gmail","2026-06-20","3149.01","Laundry Unit/Current Office","Appliances / Laundry","paid","linked","https://mail/x","new_draw_candidate","high","Speed Queen + delivery","Add to next draw","","","2519.21","","","","Receipt-backed",""
"gmail:already-in-tracker","Acme","gmail","2026-06-10","500","Unit 7","Misc","paid","linked","https://x","already_in_tracker","high","","approve to tracker","","","","","","do not submit again","",""
"notready:tim-laundry","Tim Kirk","quote","2026-06-11","4600","Laundry Unit/Current Office","Contractor / General","quoted / open committed","support only / no payment proof","gmail","already_in_tracker","high","Quote only","No action / already counted","","","","","","Quote/open committed only; not draw-ready until invoice/payment proof","",""
"gmail:19f04b962bda2261:rcs-washer-dryer-draft","RCS Superstore","gmail","2026-06-26","3149.01","Laundry Unit/Current Office","Appliances / Laundry","paid by VISA / included in next draw draft","already reflected in main tracker actuals + next draw draft","gmail","already_in_tracker_draw_draft","high","Paid receipt-backed actual","No action / included in next draw draft","","","2519.21","","","Do not duplicate if included in the next HH draw packet","",""
`;
  const s = parseDrawLedger(CSV);

  it('parses rows from the incoming-review schema', () => {
    expect(s.rows.length).toBe(4);
  });

  it('classifies the RCS washer/dryer receipt as ready-to-submit', () => {
    const r = s.rows.find((x) => x.ledgerId === 'gmail:19f04b962bda2261:rcs-washer-dryer')!;
    expect(r.readyForDraw).toBe(true);
    expect(r.submittedToDerek).toBe(false);
    expect(r.amount).toBeCloseTo(3149.01, 2);
    expect(r.expectedFundedAmount).toBeCloseTo(2519.21, 2);
    expect(r.property).toMatch(/Homestead Hill/);
    expect(classifyDrawLedgerRow(r)).toBe('ready-to-submit');
  });

  it('treats already_in_tracker + explicit do-not-submit rows as submitted-to-derek', () => {
    const r = s.rows.find((x) => x.ledgerId === 'gmail:already-in-tracker')!;
    expect(r.submittedToDerek).toBe(true);
    expect(classifyDrawLedgerRow(r)).toBe('submitted-to-derek');
  });

  it('does not treat already_in_tracker alone as submitted to Derek', () => {
    const r = s.rows.find((x) => x.ledgerId === 'notready:tim-laundry')!;
    expect(r.submittedToDerek).toBe(false);
    expect(r.readyForDraw).toBe(false);
    expect(classifyDrawLedgerRow(r)).toBe('needs-proof');
  });

  it('classifies included-in-next-draw-draft receipts as ready, not submitted', () => {
    const r = s.rows.find((x) => x.ledgerId === 'gmail:19f04b962bda2261:rcs-washer-dryer-draft')!;
    expect(r.submittedToDerek).toBe(false);
    expect(r.readyForDraw).toBe(true);
    expect(classifyDrawLedgerRow(r)).toBe('ready-to-submit');
  });
});

describe('parseDrawLedger — marker glued into first header cell', () => {
  // Live sheet shape: no separate marker row; first header cell is
  // "HH_INCOMING_REVIEW_V1 sourceId".
  const HEADERS_GLUED = [
    'HH_INCOMING_REVIEW_V1 sourceId','vendor','sourceType','date','amount','unit','category',
    'paidStatus','evidenceStatus','evidenceUrl','duplicateCheck','confidence',
    'notes','recommendedAction','submittedDate','grossSubmittedAmount',
    'expectedFundedAmount','fundedAmount','fundedDate','duplicateRule','notes',
    'sourceCostTrackerId',
  ].join(',');
  const CSV = `${HEADERS_GLUED}
"gmail:19f04b962bda2261:rcs-washer-dryer","RCS Superstore","gmail","2026-06-20","3149.01","Laundry Unit/Current Office","Appliances / Laundry","paid","linked","https://mail/x","new_draw_candidate","high","Speed Queen + delivery","Add to next draw","","","2519.21","","","","Receipt-backed",""
`;
  const s = parseDrawLedger(CSV);

  it('still recognizes the marker and parses the row', () => {
    expect(s.rows.length).toBe(1);
    const r = s.rows[0];
    expect(r.ledgerId).toBe('gmail:19f04b962bda2261:rcs-washer-dryer');
    expect(r.amount).toBeCloseTo(3149.01, 2);
    expect(classifyDrawLedgerRow(r)).toBe('ready-to-submit');
  });
});


