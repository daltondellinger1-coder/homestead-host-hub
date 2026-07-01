// Parse the HH_DRAW_LEDGER_V1 draw ledger from the "Incoming Review" tab
// of the Homestead Hill tracker Google Sheet. This ledger is the source of
// truth for what can/cannot still be sent to Derek for a construction draw.
//
// Row 1: marker (HH_DRAW_LEDGER_V1) / title
// Row 2: headers — ledgerId, property, unitArea, vendorPayee, docType,
//        docDate, amount, scopeCategory, sourceLink, sourceEvidence,
//        drawStatus, readyForDraw, submittedToDerek, drawRequest,
//        submittedDate, grossSubmittedAmount, expectedFundedAmount,
//        fundedAmount, fundedDate, duplicateRule, notes, sourceCostTrackerId

import { parseCsv } from './drawDashboard';
import { buildSourceEventLedger, type SourceEventLedger } from './drawSourceLedger';

export const DRAW_LEDGER_MARKER = 'HH_DRAW_LEDGER_V1';

// gviz CSV by sheet name with cache-busting query token appended at fetch time.
export const DRAW_LEDGER_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1O4QXwt5SxDRf9c8FLaqyvK6813DAvO1pb5eiD77fW50/gviz/tq?tqx=out:csv&sheet=Incoming%20Review';

export interface DrawLedgerRow {
  ledgerId: string;
  property: string;
  unitArea: string;
  vendorPayee: string;
  docType: string;
  docDate: string;
  amount: number;
  scopeCategory: string;
  sourceLink: string;
  sourceEvidence: string;
  drawStatus: string;
  readyForDraw: boolean;
  submittedToDerek: boolean;
  drawRequest: string;
  submittedDate: string;
  grossSubmittedAmount: number;
  expectedFundedAmount: number;
  fundedAmount: number; // 0 if VERIFY or blank
  fundedAmountVerify: boolean; // true if cell literally "VERIFY"
  fundedDate: string;
  duplicateRule: string;
  notes: string;
  sourceCostTrackerId: string;
}

export type DrawLedgerBucket =
  | 'ready-to-submit'
  | 'submitted-to-derek'
  | 'funded'
  | 'needs-proof'
  | 'needs-funded-verification';

export interface DrawLedgerBucketTotals {
  count: number;
  amount: number;
}

export interface DrawLedgerSummary {
  fetchedAt: string;
  rows: DrawLedgerRow[];
  buckets: Record<DrawLedgerBucket, DrawLedgerBucketTotals>;
  rowsByBucket: Record<DrawLedgerBucket, DrawLedgerRow[]>;
  warnings: string[];
  sourceEventLedger: SourceEventLedger;
}

function emptySourceEventLedger(): SourceEventLedger {
  return { invoiceReceiptLedger: [], drawPackets: [], fundingRecords: [], exceptions: [], warnings: [] };
}

const TRUE_RE = /^(true|yes|y|1|x|✓|✔)$/i;
function parseBool(v: string | undefined): boolean {
  if (!v) return false;
  return TRUE_RE.test(v.trim());
}

function parseMoney(v: string | undefined): number {
  if (!v) return 0;
  const cleaned = v.replace(/[$,\s]/g, '');
  if (!cleaned || cleaned === '-') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function isVerifyToken(v: string | undefined): boolean {
  return !!v && /^verify$/i.test(v.trim());
}

function headerIndex(headers: string[], ...candidates: string[]): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const lower = headers.map(norm);
  for (const c of candidates) {
    const idx = lower.indexOf(norm(c));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseDrawLedger(csv: string, fetchedAt = new Date().toISOString()): DrawLedgerSummary {
  const empty = (): DrawLedgerSummary => ({
    fetchedAt,
    rows: [],
    buckets: {
      'ready-to-submit': { count: 0, amount: 0 },
      'submitted-to-derek': { count: 0, amount: 0 },
      funded: { count: 0, amount: 0 },
      'needs-proof': { count: 0, amount: 0 },
      'needs-funded-verification': { count: 0, amount: 0 },
    },
    rowsByBucket: {
      'ready-to-submit': [],
      'submitted-to-derek': [],
      funded: [],
      'needs-proof': [],
      'needs-funded-verification': [],
    },
    warnings: [],
    sourceEventLedger: emptySourceEventLedger(),
  });

  if (!csv || !csv.trim()) return empty();
  const rows = parseCsv(csv);
  if (rows.length < 2) return empty();

  // Positive marker check — accept either the v1 draw ledger marker or the
  // current incoming-review marker (we map it to the same shape below).
  // The live sheet sometimes glues the marker into the first header cell
  // (e.g. "HH_INCOMING_REVIEW_V1 sourceId"), so use substring matching.
  const topFlat = rows.slice(0, 5).flat().map((c) => (c ?? '').trim());
  const v1Lc = DRAW_LEDGER_MARKER.toLowerCase();
  const incLc = 'hh_incoming_review_v1';
  const hasV1Marker = topFlat.some((c) => c.toLowerCase().includes(v1Lc));
  const hasIncomingMarker = topFlat.some((c) => c.toLowerCase().includes(incLc));

  // Header row: v1 has ledgerId + vendorPayee; incoming-review has sourceId + vendor.
  const rawHeaderIdx = rows.findIndex(
    (r) =>
      (r.some((c) => /ledger\s*id/i.test(c)) && r.some((c) => /vendor\s*payee/i.test(c))) ||
      (r.some((c) => /source\s*id/i.test(c)) && r.some((c) => /vendor/i.test(c) && !/vendor\s*payee/i.test(c))),
  );

  if ((!hasV1Marker && !hasIncomingMarker) || rawHeaderIdx < 0) return empty();

  // Strip marker tokens from header cells so "HH_INCOMING_REVIEW_V1 sourceId"
  // is treated as "sourceId" by both exact and normalized header lookups.
  const stripMarker = (c: string) =>
    c
      .replace(new RegExp(DRAW_LEDGER_MARKER, 'ig'), '')
      .replace(/hh_incoming_review_v1/ig, '')
      .trim();
  const headers = rows[rawHeaderIdx].map((c) => stripMarker(c ?? ''));
  const headerIdx = rawHeaderIdx;

  const isIncomingSchema =
    hasIncomingMarker ||
    (headerIndex(headers, 'sourceId') >= 0 && headerIndex(headers, 'ledgerId') < 0);

  // Find ALL columns with a given header name (incoming-review has two "notes" cols).
  const headerIndexes = (...candidates: string[]): number[] => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const wanted = new Set(candidates.map(norm));
    const out: number[] = [];
    headers.forEach((h, i) => {
      if (wanted.has(norm(h))) out.push(i);
    });
    return out;
  };
  const notesIdxs = headerIndexes('notes');

  const col = {
    // Accept ledgerId or sourceId as the row identifier.
    ledgerId: isIncomingSchema
      ? headerIndex(headers, 'sourceId', 'source id')
      : headerIndex(headers, 'ledgerId'),
    property: headerIndex(headers, 'property'),
    unitArea: headerIndex(headers, 'unitArea', 'unit area', 'unit'),
    vendorPayee: headerIndex(headers, 'vendorPayee', 'vendor payee', 'vendor', 'payee'),
    docType: headerIndex(headers, 'docType', 'doc type', 'sourceType', 'source type'),
    docDate: headerIndex(headers, 'docDate', 'doc date', 'date'),
    amount: headerIndex(headers, 'amount'),
    scopeCategory: headerIndex(headers, 'scopeCategory', 'scope category', 'category'),
    // Incoming-review: sourceLink ← evidenceUrl, sourceEvidence ← evidenceStatus.
    sourceLink: isIncomingSchema
      ? headerIndex(headers, 'evidenceUrl', 'evidence url', 'sourceLink', 'source link')
      : headerIndex(headers, 'sourceLink', 'source link'),
    sourceEvidence: isIncomingSchema
      ? headerIndex(headers, 'evidenceStatus', 'evidence status', 'evidence')
      : headerIndex(headers, 'sourceEvidence', 'source evidence', 'evidence'),
    // drawStatus derived from paidStatus on incoming-review (combined with action below).
    drawStatus: isIncomingSchema
      ? headerIndex(headers, 'paidStatus', 'paid status', 'drawStatus', 'status')
      : headerIndex(headers, 'drawStatus', 'draw status', 'status'),
    readyForDraw: headerIndex(headers, 'readyForDraw', 'ready for draw'),
    submittedToDerek: headerIndex(headers, 'submittedToDerek', 'submitted to derek'),
    drawRequest: headerIndex(headers, 'drawRequest', 'draw request'),
    submittedDate: headerIndex(headers, 'submittedDate', 'submitted date'),
    grossSubmittedAmount: headerIndex(headers, 'grossSubmittedAmount', 'gross submitted amount'),
    expectedFundedAmount: headerIndex(headers, 'expectedFundedAmount', 'expected funded amount'),
    fundedAmount: headerIndex(headers, 'fundedAmount', 'funded amount'),
    fundedDate: headerIndex(headers, 'fundedDate', 'funded date'),
    duplicateRule: headerIndex(headers, 'duplicateRule', 'duplicate rule'),
    notes: notesIdxs[0] ?? -1,
    sourceCostTrackerId: headerIndex(headers, 'sourceCostTrackerId', 'source cost tracker id'),
    // Incoming-review-only inputs used to synthesize ready/submitted flags.
    duplicateCheck: headerIndex(headers, 'duplicateCheck', 'duplicate check'),
    recommendedAction: headerIndex(headers, 'recommendedAction', 'recommended action', 'action'),
  };

  const result = empty();

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r.some((c) => c && c.trim())) continue;
    const get = (idx: number) => (idx >= 0 ? (r[idx] ?? '').trim() : '');
    const ledgerId = get(col.ledgerId);
    const vendorPayee = get(col.vendorPayee);
    const amount = parseMoney(r[col.amount]);
    if (!ledgerId && !vendorPayee && amount === 0) continue;

    const fundedAmountRaw = get(col.fundedAmount);
    const fundedAmountVerify = isVerifyToken(fundedAmountRaw);
    const duplicateCheck = get(col.duplicateCheck);
    const supportOnlyFundingRow = /funding[_\s-]*packet[_\s-]*backup[_\s-]*only|funding[_\s-]*allocated[_\s-]*support[_\s-]*only/i.test(
      duplicateCheck,
    );
    const fundedAmount = fundedAmountVerify || supportOnlyFundingRow ? 0 : parseMoney(fundedAmountRaw);

    let readyForDraw = parseBool(r[col.readyForDraw]);
    let submittedToDerek = parseBool(r[col.submittedToDerek]);
    const duplicateRule = get(col.duplicateRule);
    const recommendedAction = get(col.recommendedAction);

    if (isIncomingSchema) {
      const dupBlob = `${duplicateCheck} ${duplicateRule}`.toLowerCase();
      const actionBlob = recommendedAction.toLowerCase();
      const submittedSignal =
        /do[_\s-]*not[_\s-]*submit[_\s-]*again|covered[_\s-]*by[_\s-]*draw/.test(dupBlob);
      const readySignal =
        /new[_\s-]*draw[_\s-]*candidate|draw[_\s-]*draft/.test(dupBlob) ||
        /add to next draw|include receipt|included in next draw draft|included in next draw request/.test(actionBlob);
      if (!submittedToDerek && submittedSignal) submittedToDerek = true;
      if (!readyForDraw && readySignal && !submittedToDerek) readyForDraw = true;
    }

    // Combine multiple notes columns when present (incoming-review can have 2).
    const notes = notesIdxs
      .map((idx) => (r[idx] ?? '').trim())
      .filter(Boolean)
      .join(' | ');

    const property =
      get(col.property) || (isIncomingSchema ? 'Homestead Hill / 2818 Washington Ave' : '');

    // drawStatus: combine paidStatus + recommendedAction on incoming-review.
    const drawStatus = isIncomingSchema
      ? [get(col.drawStatus), recommendedAction].filter(Boolean).join(' · ')
      : get(col.drawStatus);

    const row: DrawLedgerRow = {
      ledgerId,
      property,
      unitArea: get(col.unitArea),
      vendorPayee,
      docType: get(col.docType),
      docDate: get(col.docDate),
      amount,
      scopeCategory: get(col.scopeCategory),
      sourceLink: get(col.sourceLink),
      sourceEvidence: get(col.sourceEvidence),
      drawStatus,
      readyForDraw,
      submittedToDerek,
      drawRequest: get(col.drawRequest),
      submittedDate: get(col.submittedDate),
      grossSubmittedAmount: parseMoney(r[col.grossSubmittedAmount]),
      expectedFundedAmount: parseMoney(r[col.expectedFundedAmount]),
      fundedAmount,
      fundedAmountVerify,
      fundedDate: get(col.fundedDate),
      duplicateRule,
      notes,
      sourceCostTrackerId: get(col.sourceCostTrackerId),
    };
    result.rows.push(row);
  }

  result.sourceEventLedger = buildSourceEventLedger(result.rows);

  for (const r of result.rows) {
    const bucket = classifyDrawLedgerRow(r, result.rows);
    result.rowsByBucket[bucket].push(r);
  }
  for (const key of Object.keys(result.rowsByBucket) as DrawLedgerBucket[]) {
    const list = result.rowsByBucket[key];
    result.buckets[key] = {
      count: list.length,
      amount: list.reduce((s, r) => s + bucketAmount(r, key), 0),
    };
  }

  const verifyCount = result.buckets['needs-funded-verification'].count;
  if (verifyCount > 0) {
    result.warnings.push(
      `${verifyCount} ledger row${verifyCount === 1 ? '' : 's'} have fundedAmount=VERIFY — confirm the lender deposit before treating these as funded.`,
    );
  }

  const exceptionCount = result.sourceEventLedger.exceptions.filter((e) => e.severity === 'error').length;
  if (exceptionCount > 0) {
    result.warnings.push(
      `${exceptionCount} source-event ledger validation error${exceptionCount === 1 ? '' : 's'} — submitted/funded statuses without source evidence are downgraded into review buckets.`,
    );
  }

  return result;
}


export function classifyDrawLedgerRow(r: DrawLedgerRow, allRows?: DrawLedgerRow[]): DrawLedgerBucket {
  if (r.fundedAmountVerify) return 'needs-funded-verification';

  const contextRows = allRows && allRows.length ? allRows : [r];
  const sourceLedger = buildSourceEventLedger(contextRows);
  const record = sourceLedger.invoiceReceiptLedger.find((x) => x.ledgerId === r.ledgerId);
  if (record) {
    if (record.status === 'funded' && r.fundedAmount > 0) return 'funded';
    if (record.status === 'submitted') return 'submitted-to-derek';
    if (record.status === 'draw_ready' || record.status === 'next_draw_draft') return 'ready-to-submit';
    return 'needs-proof';
  }

  if (r.readyForDraw) return 'ready-to-submit';
  return 'needs-proof';
}

// Amount shown per bucket — use funded $ for funded rows so the dollar value
// reflects what was actually reimbursed, not the originally submitted amount.
function bucketAmount(r: DrawLedgerRow, bucket: DrawLedgerBucket): number {
  if (bucket === 'funded') return r.fundedAmount || r.amount;
  if (bucket === 'submitted-to-derek') return r.grossSubmittedAmount || r.amount;
  return r.amount;
}

export function bucketLabel(b: DrawLedgerBucket): string {
  switch (b) {
    case 'ready-to-submit': return 'Ready to submit now';
    case 'submitted-to-derek': return 'Submitted to Derek — do not resubmit';
    case 'funded': return 'Funded / reimbursed';
    case 'needs-proof': return 'Needs proof / not ready';
    case 'needs-funded-verification': return 'Needs funded-amount verification';
  }
}

export async function fetchDrawLedger(signal?: AbortSignal): Promise<DrawLedgerSummary> {
  const url = `${DRAW_LEDGER_CSV_URL}&_=${Date.now()}`;
  try {
    const res = await fetch(url, { signal, cache: 'no-store' });
    if (!res.ok) return parseDrawLedger('');
    const csv = await res.text();
    if (/<html|<!doctype/i.test(csv.slice(0, 200))) return parseDrawLedger('');
    return parseDrawLedger(csv);
  } catch {
    // Snapshot fallback: empty summary so the dashboard still renders.
    return parseDrawLedger('');
  }
}
