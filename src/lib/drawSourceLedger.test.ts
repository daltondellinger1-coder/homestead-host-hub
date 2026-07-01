import { describe, expect, it } from 'vitest';
import { buildSourceEventLedger, extractGmailMessageId, extractGmailThreadId } from './drawSourceLedger';
import { parseDrawLedger } from './drawLedger';

const HEADERS = [
  'sourceId','vendor','sourceType','date','amount','unit','category',
  'paidStatus','evidenceStatus','evidenceUrl','duplicateCheck','confidence',
  'notes','recommendedAction','submittedDate','grossSubmittedAmount',
  'expectedFundedAmount','fundedAmount','fundedDate','duplicateRule','notes',
  'sourceCostTrackerId',
].join(',');

const CSV = `"HH_INCOMING_REVIEW_V1","","","","","","","","","","","","","","","","","","","","",""
${HEADERS}
"draw3:packet:gross","Mixed vendors / draw support packet","Draw packet / cover email","2026-06-24","0","Common/Exteriors + Laundry + Unit 12","Tree, Unit 12, Laundry","draw packet sent / funded separately","packet backup only","Gmail thread 19efa3857cbe4f19 / message 19efeaed3d5ac310","funding_packet_backup_only","high","Gross draw packet $11,539.23 sent to Derek.","No action / support-only packet row","2026-06-24","11539.23","9231.38","9231.38","2026-06-25","Do not submit packet or its child receipts again unless Derek rejects/short-pays","Derek released funds for Draw #3.","gmail:19efa3dbd5dca9e5:draw-cover"
"draw3:item:tree","Southern Indiana Tree Cutters","Invoice/receipt","2026-06-11","4800","Common/Exteriors","Tree trimming","submitted to lender / vendor payment not reconfirmed","draw support item; packet backup only","FlipperForce property-level 2818 Washington Ave","already_in_tracker","high","Tree trimming actual already exists.","No action / already counted","2026-06-24","4800","3840","3840","2026-06-25","Covered by Draw #3 packet; do not submit again","Included in gross Draw #3 packet total $11,539.23.","Common/Exteriors|Exterior|Tree Trimming"
"draw3:item:unit12-jones","Jones Electric LLC / Kayton Jones","Invoice/estimate + check written","2026-06-22","3312","Unit 12","MEP / Electrical","paid by check / pending clear","draw support item; invoice/check evidence","Gmail message 19e98348bb39c37f / QuickBooks Estimate 1082","already_in_tracker","high","Unit 12 Jones Electric amount is already tracked.","No action / already counted","2026-06-24","3312","2649.6","2649.6","2026-06-25","Covered by Draw #3 packet; do not submit again","Included in Draw #3 packet.","Unit 12|MEP / Electrical|Jones Electric Estimate 1082"
"draw3:item:unit12-lowes","Lowe's","Receipts","2026-06-04","752.08","Unit 12","Materials / Lowe's","receipt-backed actual","draw support item; packet backup only","https://www.lowes.com/quotes/241188810","already_in_tracker","high","Unit 12 Lowe's receipts.","No action / already counted","2026-06-24","752.08","601.66","601.66","2026-06-25","Covered by Draw #3 packet; do not submit again","Receipts included in Draw #3.","Unit 12|Materials / Lowe's|Lowe's PO HH12 receipts quote 241188810"
"draw3:item:unit12-amazon","Amazon Business","Receipt / allocation","2026-06-17","878.95","Unit 12","Materials / Amazon","purchased / allocated","draw support item; packet backup only","Amazon Business PO HH12 allocation","already_in_tracker","high","Unit 12 Amazon allocation.","No action / already counted","2026-06-24","878.95","703.16","703.16","2026-06-25","Covered by Draw #3 packet; do not submit again","Unit 12 material allocation.","Unit 12|Materials / Amazon|Amazon Business PO HH12 allocation"
"draw3:item:unit12-hvac","Amazon Business","Receipt / order summary","2026-06-24","743.10","Unit 12","Materials / HVAC","purchased / logged in FlipperForce","draw support item; packet backup only","Amazon summaries / FlipperForce","already_in_tracker","high","Unit 12 HVAC allocation.","No action / already counted","2026-06-24","743.10","594.48","594.48","2026-06-25","Covered by Draw #3 packet; do not submit again","Amazon Senville allocation.","Unit 12|Materials / HVAC|Amazon Senville"
"draw3:item:laundry-amazon-plumbing","Amazon Business","Receipt / allocation","2026-06-17","309.99","Laundry Unit/Current Office","Materials / Amazon plumbing","purchased / allocated","draw support item; packet backup only","Amazon Business PO HH12 allocation","already_in_tracker","high","Office/Laundry Amazon plumbing allocation.","No action / already counted","2026-06-24","309.99","247.99","247.99","2026-06-25","Covered by Draw #3 packet; do not submit again","Included in packet.","Draw Draft — Laundry Unit/Current Office|Materials / Amazon"
"draw3:item:laundry-hvac","Amazon Business","Receipt / order summary","2026-06-24","743.11","Laundry Unit/Current Office","Materials / HVAC","purchased / logged in FlipperForce","draw support item; packet backup only","Amazon summaries / FlipperForce","already_in_tracker","high","Office/Laundry HVAC allocation.","No action / already counted","2026-06-24","743.11","594.49","594.49","2026-06-25","Covered by Draw #3 packet; do not submit again","Amazon Senville allocation.","Laundry Unit/Current Office|Materials / HVAC|Amazon Senville"
"notready:cane-unit14","Cane Claycomb","Invoice/support","2026-06-19","1500","Unit 14","Exterior","unpaid / open committed","support only / no payment proof","FlipperForce link","not_submitted_missing_payment_proof","medium","No Derek submission found for Cane.","Needs payment proof before draw","","","","","","Not submitted to Derek — missing payment proof","Open committed/unpaid.","ff:cane"
"notready:stafford-unit12","Dennis Stafford / Stafford","Bid / placeholder","2026-06-14","2000","Unit 12","Contractor labor","bid / not paid","support only / placeholder","All Unit Cost Tracker row 133","not_submitted_placeholder_only","medium","No Derek submission found for Stafford.","Needs invoice/payment proof before draw","","","","","","Not submitted to Derek — placeholder only","Bid / not paid.","stafford"
"notready:tim-laundry","Tim Kirk / TK Repair and Maintenance","Quote","2026-06-11","4600","Laundry Unit/Current Office","Contractor / General","quoted / open committed","support only / no payment proof","WFH Gmail message 19eb451b164d8dd0","not_submitted_missing_payment_proof","high","No Derek submission found for Tim Kirk.","Needs invoice/payment proof before draw","","","","","","Not submitted to Derek — quote/open commitment only","Quote/open commitment only.","tim"
"notready:jones-laundry","Jones Electric LLC / Kayton Jones","Estimate","2026-06-18","4130","Laundry Unit/Current Office","MEP / Electrical","approved estimate / open committed","support only / no payment proof","WFH Gmail messages 19edc3d4444c195a / 19edc71d990bd0fb","not_submitted_missing_payment_proof","high","No Derek submission found for Jones/Kayton $4,130 estimate.","Needs invoice/payment proof before draw","","","","","","Not submitted to Derek — estimate/open commitment only","Estimate/open commitment only.","jones-laundry"
"gmail:19f04b962bda2261:rcs-washer-dryer","RCS Superstore","Receipt / order acknowledgment","2026-06-26","3149.01","Laundry Unit/Current Office","Appliances / Laundry","paid by VISA / next draw draft only — not submitted to Derek","receipt-backed actual; next draw draft support, not lender-submitted yet","Gmail message 19f04b962bda2261 / attachment Scan.pdf","next_draw_draft_not_submitted","high","Derek threads show Draw #3 but not this RCS item.","Include in next draw packet / not yet submitted","","","","","","Not submitted to Derek yet — next draw draft","","rcs"
`;

describe('draw source-event ledger', () => {
  const summary = parseDrawLedger(CSV, '2026-07-01T00:00:00.000Z');
  const sourceLedger = buildSourceEventLedger(summary.rows);

  it('extracts Gmail source IDs from Derek evidence text', () => {
    const text = 'Gmail thread 19efa3857cbe4f19 / message 19efeaed3d5ac310';
    expect(extractGmailThreadId(text)).toBe('19efa3857cbe4f19');
    expect(extractGmailMessageId(text)).toBe('19efeaed3d5ac310');
  });

  it('backfills Draw #3 with Derek thread/message evidence and matching child total', () => {
    const draw3 = sourceLedger.drawPackets.find((p) => p.drawPacketId === 'draw-3');
    expect(draw3).toBeDefined();
    expect(draw3!.derekThreadId).toBe('19efa3857cbe4f19');
    expect(draw3!.derekMessageId).toBe('19efeaed3d5ac310');
    expect(draw3!.grossRequestedAmount).toBeCloseTo(11539.23, 2);
    expect(draw3!.totalChildAmount).toBeCloseTo(11539.23, 2);
    expect(draw3!.totalMatchesGross).toBe(true);
  });

  it('allows packet child items to inherit Derek submission evidence from the draw packet', () => {
    const liveLikeCsv = CSV.replace('"draw3:item:unit12-jones","Jones Electric LLC / Kayton Jones","Invoice/estimate + check written","2026-06-22","3312","Unit 12","MEP / Electrical","paid by check / pending clear","draw support item; invoice/check evidence","Gmail message 19e98348bb39c37f / QuickBooks Estimate 1082","already_in_tracker","high","Unit 12 Jones Electric amount is already tracked.","No action / already counted","2026-06-24","3312","2649.6","2649.6","2026-06-25","Covered by Draw #3 packet; do not submit again","Included in Draw #3 packet.","Unit 12|MEP / Electrical|Jones Electric Estimate 1082"', '"draw3:item:unit12-jones","Jones Electric LLC / Kayton Jones","Invoice/estimate + check written","2026-06-22","3312","Unit 12","MEP / Electrical","paid by check / pending clear","draw support item; invoice/check evidence","Gmail message 19e98348bb39c37f / QuickBooks Estimate 1082","already_in_tracker","high","Unit 12 Jones Electric amount is already tracked.","No action / already counted","","3312","2649.6","","","Covered by Draw #3 packet; do not submit again","Included in Draw #3 packet.","Unit 12|MEP / Electrical|Jones Electric Estimate 1082"');
    const liveLike = parseDrawLedger(liveLikeCsv);
    const jones = liveLike.sourceEventLedger.invoiceReceiptLedger.find((r) => r.ledgerId === 'draw3:item:unit12-jones')!;
    expect(jones.status).toBe('submitted');
    expect(jones.drawPacketId).toBe('draw-3');
    expect(jones.statusEvidence).toContain('Gmail message 19efeaed3d5ac310');
  });

  it('keeps the five known non-submitted items out of submitted/funded states', () => {
    const ids = [
      'notready:cane-unit14',
      'notready:stafford-unit12',
      'notready:tim-laundry',
      'notready:jones-laundry',
      'gmail:19f04b962bda2261:rcs-washer-dryer',
    ];
    for (const id of ids) {
      const record = sourceLedger.invoiceReceiptLedger.find((r) => r.ledgerId === id)!;
      expect(record.status).not.toBe('submitted');
      expect(record.status).not.toBe('funded');
    }
  });

  it('treats RCS $3,149.01 as next draw draft, not submitted', () => {
    const rcs = sourceLedger.invoiceReceiptLedger.find((r) => r.ledgerId === 'gmail:19f04b962bda2261:rcs-washer-dryer')!;
    expect(rcs.amount).toBeCloseTo(3149.01, 2);
    expect(rcs.status).toBe('next_draw_draft');
    expect(rcs.statusEvidence).toMatch(/Next draw draft only/i);
  });

  it('rejects paid invoice without Derek email as submitted', () => {
    const badCsv = `"HH_INCOMING_REVIEW_V1"\n${HEADERS}\n"paid:no-derek","Vendor","gmail","2026-06-20","100","Unit 1","Materials","paid","linked","https://mail/x","new_draw_candidate","high","paid receipt only","Add to next draw","","","80","","","","",""`;
    const bad = parseDrawLedger(badCsv);
    expect(bad.rowsByBucket['submitted-to-derek'].length).toBe(0);
    expect(bad.rowsByBucket['ready-to-submit'].length).toBe(1);
  });

  it('flags submitted/funded impossible states', () => {
    const badCsv = `"HH_INCOMING_REVIEW_V1"\n${HEADERS}\n"bad:submitted","Vendor","gmail","2026-06-20","100","Unit 1","Materials","paid","linked","https://mail/x","already_in_tracker","high","claims submitted without Derek message","No action","2026-06-24","100","80","","","Covered by Draw #9 packet; do not submit again","",""\n"bad:funded","Vendor 2","gmail","2026-06-21","200","Unit 1","Materials","funded","linked","https://mail/y","already_in_tracker","high","funded but no packet","No action","","","","200","","","",""`;
    const bad = parseDrawLedger(badCsv);
    const codes = bad.sourceEventLedger.exceptions.map((e) => e.code);
    expect(codes).toContain('submitted_missing_derek_source');
    expect(codes).toContain('funded_missing_submitted_draw');
  });
});
