// Parse and normalize staged "Incoming Review" items for the Draw Dashboard.
// Phase 1: read-only review queue. Staged items DO NOT mutate tracker totals.

import { parseCsv, type LedgerRow } from './drawDashboard';

// Dedicated tab in the same spreadsheet. If the tab does not exist or fetch
// fails, the UI shows an empty state — we never block the main dashboard.
//
// ⚠️ Google GViz pitfall: when `sheet=<name>` references a missing tab, GViz
// often silently returns the CSV of the FIRST/DEFAULT sheet instead of an
// error. That means a vanilla "found a vendor header" check would happily
// ingest rows from the main tracker as if they were incoming review items.
// To prevent that, parseIncomingItems() requires a positive marker:
//   • a cell exactly matching INCOMING_MARKER (HH_INCOMING_REVIEW_V1), OR
//   • a title cell containing "Incoming Review" AND a header row that has
//     BOTH a sourceId/orderId column AND a recommendedAction column.
// Without those, we return [] and show the empty state.
export const DRAW_INCOMING_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1O4QXwt5SxDRf9c8FLaqyvK6813DAvO1pb5eiD77fW50/gviz/tq?tqx=out:csv&sheet=Incoming%20Review';

export const INCOMING_MARKER = 'HH_INCOMING_REVIEW_V1';

export type IncomingSourceType =
  | 'lowes'
  | 'amazon'
  | 'menards'
  | 'home-depot'
  | 'contractor-invoice'
  | 'flipperforce'
  | 'gmail'
  | 'other';

export type IncomingPaidStatus = 'paid' | 'invoiced' | 'purchased' | 'open-committed' | 'unknown';
export type IncomingEvidenceStatus = 'linked' | 'missing' | 'pending';
export type IncomingConfidence = 'high' | 'medium' | 'low';

export type IncomingStatus =
  | 'invoice-received'
  | 'purchased'
  | 'paid-verified'
  | 'open-committed'
  | 'needs-evidence'
  | 'possible-duplicate';

export type IncomingRecommendedAction =
  | 'approve-to-tracker'
  | 'change-unit-category'
  | 'mark-not-homestead'
  | 'needs-more-proof';

export interface IncomingItem {
  sourceId: string;
  vendor: string;
  sourceType: IncomingSourceType;
  date: string;
  amount: number;
  unit: string;
  category: string;
  paidStatus: IncomingPaidStatus;
  evidenceStatus: IncomingEvidenceStatus;
  evidenceUrl: string;
  duplicateCheck: string;
  confidence: IncomingConfidence;
  notes: string;
  recommendedAction: IncomingRecommendedAction;
  derivedStatus: IncomingStatus;
  isDuplicate: boolean;
  warnings: string[];
}

function normSourceType(v: string): IncomingSourceType {
  const s = v.toLowerCase().trim();
  if (/lowe/.test(s)) return 'lowes';
  if (/amazon/.test(s)) return 'amazon';
  if (/menard/.test(s)) return 'menards';
  if (/home\s*depot|hd\b/.test(s)) return 'home-depot';
  if (/contractor|invoice/.test(s)) return 'contractor-invoice';
  if (/flipperforce|flipper/.test(s)) return 'flipperforce';
  if (/gmail|email/.test(s)) return 'gmail';
  return 'other';
}

function normPaidStatus(v: string): IncomingPaidStatus {
  const s = v.toLowerCase().trim();
  if (/paid|verified|cleared/.test(s)) return 'paid';
  if (/invoice/.test(s)) return 'invoiced';
  if (/purchas|order/.test(s)) return 'purchased';
  if (/open|committed|pending/.test(s)) return 'open-committed';
  return 'unknown';
}

function normEvidence(v: string, url: string): IncomingEvidenceStatus {
  const s = v.toLowerCase().trim();
  if (/^https?:\/\//.test(url) || /linked|attached|yes/.test(s)) return 'linked';
  if (/pending|sent/.test(s)) return 'pending';
  return 'missing';
}

function normConfidence(v: string): IncomingConfidence {
  const s = v.toLowerCase().trim();
  if (/high|verified|confirmed/.test(s)) return 'high';
  if (/low|guess|unsure/.test(s)) return 'low';
  return 'medium';
}

function normAction(v: string, fallback: IncomingRecommendedAction): IncomingRecommendedAction {
  const s = v.toLowerCase().trim();
  if (/approve/.test(s)) return 'approve-to-tracker';
  if (/change|reassign|unit|category/.test(s)) return 'change-unit-category';
  if (/not.*homestead|reject|exclude/.test(s)) return 'mark-not-homestead';
  if (/proof|evidence|receipt/.test(s)) return 'needs-more-proof';
  return fallback;
}

function parseAmount(v: string): number {
  if (!v) return 0;
  const cleaned = v.replace(/[$,\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function headerIndex(headers: string[], ...candidates: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx >= 0) return idx;
  }
  // fuzzy contains
  for (const c of candidates) {
    const idx = lower.findIndex((h) => h.includes(c.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function deriveStatus(
  paid: IncomingPaidStatus,
  evidence: IncomingEvidenceStatus,
  isDuplicate: boolean,
): IncomingStatus {
  if (isDuplicate) return 'possible-duplicate';
  if (paid === 'paid' && evidence === 'linked') return 'paid-verified';
  if (paid === 'paid' && evidence !== 'linked') return 'needs-evidence';
  if (paid === 'invoiced') return 'invoice-received';
  if (paid === 'purchased') return 'purchased';
  if (paid === 'open-committed') return 'open-committed';
  return 'needs-evidence';
}

function recommendAction(item: {
  paidStatus: IncomingPaidStatus;
  evidenceStatus: IncomingEvidenceStatus;
  isDuplicate: boolean;
  unit: string;
}): IncomingRecommendedAction {
  if (item.isDuplicate) return 'needs-more-proof';
  if (!item.unit || /unknown|unclear|\?/i.test(item.unit)) return 'change-unit-category';
  if (item.evidenceStatus !== 'linked') return 'needs-more-proof';
  if (item.paidStatus === 'paid') return 'approve-to-tracker';
  return 'needs-more-proof';
}

function buildWarnings(item: Omit<IncomingItem, 'warnings' | 'derivedStatus'>): string[] {
  const w: string[] = [];
  if (item.isDuplicate) w.push('Possible duplicate / already tracked in ledger');
  if (!item.unit || /unknown|unclear|\?/i.test(item.unit)) w.push('Unit unclear — confirm assignment');
  if (item.evidenceStatus === 'missing') w.push('Missing evidence/receipt link');
  if (item.paidStatus === 'unknown') w.push('Paid status missing');
  if (item.duplicateCheck && /address|mismatch/i.test(item.duplicateCheck))
    w.push('Delivery address mismatch flagged');
  return w;
}

function collectLedgerIds(ledger: LedgerRow[]): Set<string> {
  const set = new Set<string>();
  for (const r of ledger) {
    // Source IDs commonly appear in notes/receiptLink/vendor; extract order-id-like tokens.
    const haystack = `${r.notes} ${r.receiptLink} ${r.vendor} ${r.scope}`;
    const matches = haystack.match(/[A-Z0-9][A-Z0-9-]{5,}/gi);
    if (matches) for (const m of matches) set.add(m.toUpperCase());
  }
  return set;
}

export interface ParseIncomingOptions {
  ledger?: LedgerRow[];
}

export function parseIncomingItems(csv: string, opts: ParseIncomingOptions = {}): IncomingItem[] {
  if (!csv || !csv.trim()) return [];
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];

  // Positive identification — defends against GViz silently returning the
  // default sheet when the "Incoming Review" tab is missing.
  const topRows = rows.slice(0, 5);
  const flatTop = topRows.flat().map((c) => (c ?? '').trim());
  const hasMarker = flatTop.some((c) => c.toLowerCase() === INCOMING_MARKER.toLowerCase());
  const hasTitle = flatTop.some((c) => /incoming\s+review/i.test(c));

  // Find header row — first row containing 'vendor' or 'sourceid'/'order'
  const headerIdx = rows.findIndex((r) =>
    r.some((c) => /vendor|source\s*id|order\s*id/i.test(c)),
  );
  if (headerIdx < 0) return [];
  const headers = rows[headerIdx];

  const col = {
    sourceId: headerIndex(headers, 'sourceId', 'source id', 'orderId', 'order id', 'order #'),
    vendor: headerIndex(headers, 'vendor', 'payee'),
    sourceType: headerIndex(headers, 'sourceType', 'source type', 'source'),
    date: headerIndex(headers, 'date'),
    amount: headerIndex(headers, 'amount', 'total', 'price'),
    unit: headerIndex(headers, 'unit'),
    category: headerIndex(headers, 'category'),
    paidStatus: headerIndex(headers, 'paidStatus', 'paid status', 'paid'),
    evidenceStatus: headerIndex(headers, 'evidenceStatus', 'evidence status', 'evidence'),
    evidenceUrl: headerIndex(headers, 'evidenceUrl', 'evidence url', 'receipt'),
    duplicateCheck: headerIndex(headers, 'duplicateCheck', 'duplicate', 'dup'),
    confidence: headerIndex(headers, 'confidence'),
    notes: headerIndex(headers, 'notes'),
    recommendedAction: headerIndex(headers, 'recommendedAction', 'recommended action', 'action'),
  };

  // Gate: accept only if the marker is present OR the "Incoming Review"
  // title appears AND both sourceId and recommendedAction columns exist.
  const hasRequiredHeaders = col.sourceId >= 0 && col.recommendedAction >= 0;
  const accepted = hasMarker || (hasTitle && hasRequiredHeaders);
  if (!accepted) return [];

  const ledgerIds = collectLedgerIds(opts.ledger ?? []);


  const items: IncomingItem[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r.some((c) => c && c.trim())) continue;
    const sourceId = (r[col.sourceId] ?? '').trim();
    const vendor = (r[col.vendor] ?? '').trim();
    if (!sourceId && !vendor) continue;

    const evidenceUrl = (r[col.evidenceUrl] ?? '').trim();
    const paidStatus = normPaidStatus(r[col.paidStatus] ?? '');
    const evidenceStatus = normEvidence(r[col.evidenceStatus] ?? '', evidenceUrl);
    const duplicateCheck = (r[col.duplicateCheck] ?? '').trim();

    const isDuplicate =
      /dup|duplicate|already/i.test(duplicateCheck) ||
      (sourceId.length >= 6 && ledgerIds.has(sourceId.toUpperCase()));

    const partial = {
      sourceId,
      vendor,
      sourceType: normSourceType(r[col.sourceType] ?? vendor),
      date: (r[col.date] ?? '').trim(),
      amount: parseAmount(r[col.amount] ?? ''),
      unit: (r[col.unit] ?? '').trim(),
      category: (r[col.category] ?? '').trim(),
      paidStatus,
      evidenceStatus,
      evidenceUrl,
      duplicateCheck,
      confidence: normConfidence(r[col.confidence] ?? ''),
      notes: (r[col.notes] ?? '').trim(),
      isDuplicate,
      recommendedAction: 'needs-more-proof' as IncomingRecommendedAction,
    };
    const recommendedAction = normAction(
      r[col.recommendedAction] ?? '',
      recommendAction(partial),
    );
    const derivedStatus = deriveStatus(paidStatus, evidenceStatus, isDuplicate);
    const warnings = buildWarnings({ ...partial, recommendedAction });
    items.push({ ...partial, recommendedAction, derivedStatus, warnings });
  }
  return items;
}

export async function fetchIncomingItems(
  ledger: LedgerRow[],
  signal?: AbortSignal,
): Promise<IncomingItem[]> {
  try {
    const res = await fetch(DRAW_INCOMING_CSV_URL, { signal, cache: 'no-store' });
    if (!res.ok) return [];
    const csv = await res.text();
    // Google returns an HTML error when the sheet/tab is missing; bail safely.
    if (/<html|<!doctype/i.test(csv.slice(0, 200))) return [];
    return parseIncomingItems(csv, { ledger });
  } catch {
    return [];
  }
}

// A "draw funding confirmation" is a lender packet that funds the project bank
// account — NOT a vendor payment. These should update funding math, not be
// treated as vendor backup. Detection scans a broad haystack because the
// signal can land in any of: sourceId, sourceType, vendor, category,
// paidStatus, evidenceStatus, evidenceUrl, duplicateCheck, notes, action.
const DRAW_FUNDING_STRONG_RE =
  /draw[\s_-]*cover|draw[\s_-]*fund(?:ed|ing)?|lender[\s_-]*draw|lender[\s_-]*release|construction[\s_-]*draw|draw[\s_-]*request[\s_-]*support|funds?\s+released|funds?\s+available|funded\s+to\s+savings|draw[\s_-]*funded[\s_-]*to[\s_-]*savings/i;
const NOT_VENDOR_RE = /not\s+vendor\s+payment|not\s+a?\s*vendor\s+payment|funding[\s_-]*only|draw[\s_-]*funding[\s_-]*status[\s_-]*only/i;

export function isDrawFundingCandidate(item: IncomingItem): boolean {
  const haystack = [
    item.sourceId,
    item.sourceType,
    item.vendor,
    item.category,
    item.paidStatus,
    item.evidenceStatus,
    item.evidenceUrl,
    item.duplicateCheck,
    item.notes,
    item.recommendedAction,
  ]
    .filter(Boolean)
    .join(' \n ');
  if (DRAW_FUNDING_STRONG_RE.test(haystack)) return true;
  if (NOT_VENDOR_RE.test(haystack) && /draw|fund/i.test(haystack)) return true;
  return false;
}

export function statusLabel(s: IncomingStatus): string {
  switch (s) {
    case 'invoice-received': return 'Invoice received';
    case 'purchased': return 'Purchased';
    case 'paid-verified': return 'Paid · verified';
    case 'open-committed': return 'Open committed';
    case 'needs-evidence': return 'Needs evidence';
    case 'possible-duplicate': return 'Possible duplicate';
  }
}

export function statusTone(s: IncomingStatus): 'pos' | 'neg' | 'warn' | 'neutral' {
  if (s === 'paid-verified') return 'pos';
  if (s === 'possible-duplicate' || s === 'needs-evidence') return 'warn';
  if (s === 'open-committed') return 'neutral';
  return 'neutral';
}

export function actionLabel(a: IncomingRecommendedAction): string {
  switch (a) {
    case 'approve-to-tracker': return 'Approve to tracker';
    case 'change-unit-category': return 'Change unit/category';
    case 'mark-not-homestead': return 'Mark not Homestead';
    case 'needs-more-proof': return 'Needs more proof';
  }
}
