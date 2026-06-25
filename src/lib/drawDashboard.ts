// Parse the Homestead Hill draw tracker Google Sheet CSV into structured data.

export const DRAW_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1O4QXwt5SxDRf9c8FLaqyvK6813DAvO1pb5eiD77fW50/gviz/tq?tqx=out:csv&gid=949151202';

export interface DrawTotals {
  totalBudget: number;
  totalActual: number;
  totalPaidFromDraws: number;
  totalPaidFromOwnerCash: number;
  openCommitted: number;
  netFundingPosition: number;
  status: string;
}

export interface UnitSummaryRow {
  unit: string;
  budget: number;
  actual: number;
  drawsApplied: number;
  ownerCashApplied: number;
  openCommitted: number;
  variance: number;
  fundingPosition: number;
}

export interface LedgerRow {
  unit: string;
  category: string;
  scope: string;
  budget: number;
  actual: number;
  paidFromDraws: number;
  paidFromOwnerCash: number;
  openCommitted: number;
  variance: number;
  fundingPosition: number;
  vendor: string;
  receiptLink: string;
  drawNumber: string;
  status: string;
  source: string;
  notes: string;
}

export interface DrawDashboardData {
  totals: DrawTotals;
  unitSummary: UnitSummaryRow[];
  ledger: LedgerRow[];
  warnings: string[];
  fetchedAt: string;
}

// Minimal RFC 4180 CSV parser
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (c === '\r') {
        // skip
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function num(v: string | undefined): number {
  if (!v) return 0;
  const cleaned = v.replace(/[$,\s]/g, '');
  if (cleaned === '' || cleaned === '-') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function findRow(rows: string[][], predicate: (r: string[]) => boolean): number {
  return rows.findIndex(predicate);
}

export function parseDrawDashboard(csv: string, fetchedAt = new Date().toISOString()): DrawDashboardData {
  const rows = parseCsv(csv);

  // Locate the totals row containing "Total Budget"
  const totalsIdx = findRow(rows, (r) => r.some((c) => c.trim() === 'Total Budget'));
  const t = totalsIdx >= 0 ? rows[totalsIdx] : [];
  const totals: DrawTotals = {
    totalBudget: num(t[1]),
    totalActual: num(t[3]),
    totalPaidFromDraws: num(t[5]),
    totalPaidFromOwnerCash: num(t[7]),
    openCommitted: num(t[9]),
    netFundingPosition: num(t[11]),
    status: (t[13] ?? '').trim(),
  };

  // Locate Unit summary header
  const unitSummaryHeaderIdx = findRow(
    rows,
    (r) => r[0]?.trim() === 'Unit / Area' && /budget/i.test(r[1] ?? '') && !/category/i.test(r[1] ?? ''),
  );

  // Locate ledger header: Unit/Area + Category
  const ledgerHeaderIdx = findRow(
    rows,
    (r) => r[0]?.trim() === 'Unit / Area' && r[1]?.trim() === 'Category',
  );

  const unitSummary: UnitSummaryRow[] = [];
  if (unitSummaryHeaderIdx >= 0) {
    const end = ledgerHeaderIdx > unitSummaryHeaderIdx ? ledgerHeaderIdx : rows.length;
    for (let i = unitSummaryHeaderIdx + 1; i < end; i++) {
      const r = rows[i];
      const name = (r[0] ?? '').trim();
      if (!name) continue;
      unitSummary.push({
        unit: name,
        budget: num(r[1]),
        actual: num(r[2]),
        drawsApplied: num(r[3]),
        ownerCashApplied: num(r[4]),
        openCommitted: num(r[5]),
        variance: num(r[6]),
        fundingPosition: num(r[7]),
      });
    }
  }

  const ledger: LedgerRow[] = [];
  if (ledgerHeaderIdx >= 0) {
    for (let i = ledgerHeaderIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      const unit = (r[0] ?? '').trim();
      if (!unit) continue;
      ledger.push({
        unit,
        category: (r[1] ?? '').trim(),
        scope: (r[2] ?? '').trim(),
        budget: num(r[3]),
        actual: num(r[4]),
        paidFromDraws: num(r[5]),
        paidFromOwnerCash: num(r[6]),
        openCommitted: num(r[7]),
        variance: num(r[8]),
        fundingPosition: num(r[9]),
        vendor: (r[10] ?? '').trim(),
        receiptLink: (r[11] ?? '').trim(),
        drawNumber: (r[12] ?? '').trim(),
        status: (r[13] ?? '').trim(),
        source: (r[14] ?? '').trim(),
        notes: (r[15] ?? '').trim(),
      });
    }
  }

  const warnings: string[] = [];

  // Reconcile unit summary rows against ledger detail. The source sheet's
  // Unit summary row sometimes carries stale or hand-entered Actual / Open
  // values that don't match the visible ledger rows (e.g. Laundry/Current
  // Office). For the dashboard we derive Actual / Open / Draws / Owner cash
  // from the ledger detail so the unit card always reconciles to the
  // click-through detail. Budget falls back to the summary row when present.
  const RECONCILE_TOLERANCE = 1;
  const ledgerByUnit = new Map<string, LedgerRow[]>();
  for (const l of ledger) {
    const key = l.unit.trim().toLowerCase();
    if (!ledgerByUnit.has(key)) ledgerByUnit.set(key, []);
    ledgerByUnit.get(key)!.push(l);
  }

  const reconciledUnitSummary: UnitSummaryRow[] = unitSummary.map((u) => {
    const rows = ledgerByUnit.get(u.unit.trim().toLowerCase()) ?? [];
    if (!rows.length) return u;
    const sumActual = rows.reduce((s, r) => s + r.actual, 0);
    const sumOpen = rows.reduce((s, r) => s + r.openCommitted, 0);
    const sumDraws = rows.reduce((s, r) => s + r.paidFromDraws, 0);
    const sumOwner = rows.reduce((s, r) => s + r.paidFromOwnerCash, 0);
    const sumBudget = rows.reduce((s, r) => s + r.budget, 0);
    const budget = u.budget > 0 ? u.budget : sumBudget;
    // Only override draws/owner cash from ledger if the ledger actually carries
    // that data; otherwise keep the summary value to avoid zeroing it out.
    const drawsApplied = sumDraws > 0 ? sumDraws : u.drawsApplied;
    const ownerCashApplied = sumOwner > 0 ? sumOwner : u.ownerCashApplied;
    const actual = sumActual;
    const openCommitted = sumOpen;

    if (
      Math.abs(u.actual - sumActual) > RECONCILE_TOLERANCE ||
      Math.abs(u.openCommitted - sumOpen) > RECONCILE_TOLERANCE
    ) {
      warnings.push(
        `${u.unit}: source summary row (Actual ${formatCurrency(u.actual)}, Open ${formatCurrency(u.openCommitted)}) differs from ledger detail (Actual ${formatCurrency(sumActual)}, Open ${formatCurrency(sumOpen)}). Dashboard is using ledger detail totals.`,
      );
    }

    return {
      unit: u.unit,
      budget,
      actual,
      drawsApplied,
      ownerCashApplied,
      openCommitted,
      variance: budget - actual - openCommitted,
      fundingPosition: drawsApplied + ownerCashApplied - actual - openCommitted,
    };
  });

  // Recompute top-level totals from reconciled unit summary so the dashboard
  // header doesn't carry stale summary values either.
  if (reconciledUnitSummary.length) {
    const tBudget = reconciledUnitSummary.reduce((s, u) => s + u.budget, 0);
    const tActual = reconciledUnitSummary.reduce((s, u) => s + u.actual, 0);
    const tDraws = reconciledUnitSummary.reduce((s, u) => s + u.drawsApplied, 0);
    const tOwner = reconciledUnitSummary.reduce((s, u) => s + u.ownerCashApplied, 0);
    const tOpen = reconciledUnitSummary.reduce((s, u) => s + u.openCommitted, 0);
    totals.totalBudget = tBudget || totals.totalBudget;
    totals.totalActual = tActual;
    totals.totalPaidFromDraws = tDraws || totals.totalPaidFromDraws;
    totals.totalPaidFromOwnerCash = tOwner || totals.totalPaidFromOwnerCash;
    totals.openCommitted = tOpen;
    totals.netFundingPosition = totals.totalPaidFromDraws + totals.totalPaidFromOwnerCash - tActual - tOpen;
  }

  // Per-unit data-quality checks: planning-estimate dollars, budget visibility
  // gap (Unit 12 case), and whole-unit/source-level proxy overlap (Unit 7 case).
  for (const u of reconciledUnitSummary) {
    const rows = ledgerByUnit.get(u.unit.trim().toLowerCase()) ?? [];
    if (!rows.length) continue;

    const openRows = rows.filter((r) => r.openCommitted > 0 && r.actual === 0);
    const planningRows = openRows.filter(isPlanningEstimateOpenRow);
    const planningSubtotal = planningRows.reduce((s, r) => s + r.openCommitted, 0);
    if (planningSubtotal > 0) {
      warnings.push(
        `${u.unit}: open committed includes ${formatCurrency(planningSubtotal)} of planning estimates / placeholders / proxy rows (soft dollars, not receipt-backed).`,
      );
    }

    const wholeUnitRows = openRows.filter(isWholeUnitProxyRow);
    const sourceLevelRows = openRows.filter(isSourceLevelProxyRow);
    const hasProxy = wholeUnitRows.length > 0 || sourceLevelRows.length > 0;
    const otherOpen = openRows.filter(
      (r) => !wholeUnitRows.includes(r) && !sourceLevelRows.includes(r),
    );
    if (hasProxy && (otherOpen.length > 0 || wholeUnitRows.length + sourceLevelRows.length > 1)) {
      warnings.push(
        `${u.unit}: open committed mixes whole-unit / source-level proxy rows with category-level rows — values may overlap or double-count. Review before drawing.`,
      );
    }

    const sumLedgerBudget = rows.reduce((s, r) => s + r.budget, 0);
    if (
      u.budget > 0 &&
      sumLedgerBudget > 0 &&
      Math.abs(u.budget - sumLedgerBudget) > Math.max(500, u.budget * 0.1)
    ) {
      warnings.push(
        `${u.unit}: summary budget ${formatCurrency(u.budget)} but visible ledger budget rows only total ${formatCurrency(sumLedgerBudget)} — using summary budget; ledger rows do not fully represent the full unit budget.`,
      );
    }
  }

  const unit14NeedsVerification = ledger.some(
    (l) => l.unit === 'Unit 14' && /needs receipt|needs receipt-qbo|imported/i.test(l.status),
  );
  if (unit14NeedsVerification) {
    warnings.push('Unit 14 actuals are imported from the source budget tab and still need receipt/QBO verification.');
  }
  if (totals.netFundingPosition < 0) {
    warnings.push(
      `Current funding gap ${formatCurrency(totals.netFundingPosition)}. Draws + recorded owner cash do not yet cover actuals + open commitments — additional draw or owner cash needed.`,
    );
  }

  return { totals, unitSummary: reconciledUnitSummary, ledger, warnings, fetchedAt };
}

// ----- Open-row cost classification helpers -----
// Some Open Committed rows in the source sheet are placeholders/proxies/working
// estimates rather than firm bids. The dashboard splits and labels them so
// soft dollars don't read as hard committed costs.

const PLANNING_ESTIMATE_RE =
  /placeholder|proxy|working\s*estimate|estimate\s*\/\s*remaining|not\s*actual|budget\s*pulled|likely\s*remaining|high[\s-]?end|source[\s-]?level|needs\s+line[\s-]?item\s+allocation|not\s+yet\s+split/i;

const WHOLE_UNIT_RE = /whole[\s-]?unit|contractor\s*estimate|entire\s+unit|all[\s-]?in\s+estimate/i;

const SOURCE_LEVEL_RE = /source[\s-]?level|lowe'?s?|furnishing|quote/i;

function planningHaystack(r: LedgerRow): string {
  return [r.status, r.notes, r.scope, r.category].filter(Boolean).join(' \n ');
}

export function isPlanningEstimateOpenRow(r: LedgerRow): boolean {
  if (r.openCommitted <= 0) return false;
  return PLANNING_ESTIMATE_RE.test(planningHaystack(r));
}

export function isWholeUnitProxyRow(r: LedgerRow): boolean {
  if (r.openCommitted <= 0) return false;
  const hay = [r.scope, r.category, r.notes, r.vendor].filter(Boolean).join(' \n ');
  return WHOLE_UNIT_RE.test(hay);
}

export function isSourceLevelProxyRow(r: LedgerRow): boolean {
  if (r.openCommitted <= 0) return false;
  const hay = [r.scope, r.notes, r.vendor, r.status].filter(Boolean).join(' \n ');
  return SOURCE_LEVEL_RE.test(hay);
}




export function formatCurrency(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ----- Derived helpers for Decision Summary, projections, and draw readiness -----

export function projectedAllIn(row: { actual: number; openCommitted: number }): number {
  return row.actual + row.openCommitted;
}

export function unitBudgetRemaining(u: UnitSummaryRow): number {
  return u.budget - projectedAllIn(u);
}

export function unitFundingGap(u: UnitSummaryRow): number {
  // (Draws + recorded owner cash) − projected all-in. Negative = funding still needed.
  return u.drawsApplied + u.ownerCashApplied - projectedAllIn(u);
}

export type DrawReadiness = 'ready' | 'needs-evidence' | 'not-ready' | 'drawn';
export type SourceConfidence = 'verified' | 'needs-evidence' | 'estimate' | 'drawn';

const DRAWN_RE = /drawn|funded|reimbursed|paid from draw|paid via draw|closed/i;
const NEEDS_VERIFY_RE = /needs receipt|needs receipt-qbo|imported|missing receipt|no receipt/i;

function hasEvidenceLink(r: LedgerRow): boolean {
  return /^https?:\/\//.test(r.receiptLink);
}

export function classifyDrawReadiness(r: LedgerRow): DrawReadiness {
  const status = r.status || '';
  const notes = r.notes || '';
  const drawn = DRAWN_RE.test(status) || DRAWN_RE.test(notes) || r.paidFromDraws > 0;
  if (drawn && r.actual > 0 && r.openCommitted === 0) return 'drawn';
  if (r.actual > 0) {
    if (NEEDS_VERIFY_RE.test(status) || !hasEvidenceLink(r)) return 'needs-evidence';
    if (drawn) return 'drawn';
    return 'ready';
  }
  if (r.openCommitted > 0) return 'not-ready';
  return 'not-ready';
}

export function sourceConfidence(r: LedgerRow): SourceConfidence {
  const c = classifyDrawReadiness(r);
  if (c === 'drawn') return 'drawn';
  if (c === 'ready') return 'verified';
  if (c === 'needs-evidence') return 'needs-evidence';
  return 'estimate';
}

export interface DecisionSummary {
  budgetRemaining: number;
  projectedAllIn: number;
  fundingGap: number; // negative = gap, positive = surplus
  recordedOwnerCash: number;
  drawReadyCount: number;
  drawReadyAmount: number;
  needsEvidenceCount: number;
  needsEvidenceAmount: number;
  biggestAttention: { unit: string; reason: string; amount: number } | null;
  recommendation: string;
}

export function computeDecisionSummary(data: DrawDashboardData): DecisionSummary {
  const { totals, unitSummary, ledger } = data;
  const projected = totals.totalActual + totals.openCommitted;
  const budgetRemaining = totals.totalBudget - projected;
  const fundingGap = totals.netFundingPosition;

  const readyRows = ledger.filter((r) => classifyDrawReadiness(r) === 'ready');
  const needsEvidence = ledger.filter((r) => classifyDrawReadiness(r) === 'needs-evidence');
  const drawReadyAmount = readyRows.reduce((s, r) => s + Math.max(0, r.actual - r.paidFromDraws), 0);
  const needsEvidenceAmount = needsEvidence.reduce((s, r) => s + Math.max(0, r.actual - r.paidFromDraws), 0);

  let biggest: DecisionSummary['biggestAttention'] = null;
  for (const u of unitSummary) {
    const gap = unitFundingGap(u);
    const remaining = unitBudgetRemaining(u);
    const candidate =
      gap < 0
        ? { unit: u.unit, reason: 'largest funding gap', amount: gap }
        : remaining < 0
          ? { unit: u.unit, reason: 'most over budget', amount: remaining }
          : null;
    if (candidate && (!biggest || candidate.amount < biggest.amount)) biggest = candidate;
  }

  let recommendation: string;
  if (fundingGap < 0 && readyRows.length > 0) {
    recommendation = `Submit ${readyRows.length} draw-ready item${readyRows.length === 1 ? '' : 's'} (${formatCurrency(drawReadyAmount)}) to help close the ${formatCurrency(Math.abs(fundingGap))} funding gap.`;
  } else if (fundingGap < 0) {
    recommendation = `Funding gap of ${formatCurrency(Math.abs(fundingGap))}. Gather evidence for ${needsEvidence.length} item${needsEvidence.length === 1 ? '' : 's'} so they can be drawn.`;
  } else if (needsEvidence.length > 0) {
    recommendation = `Funding healthy. Tighten records: ${needsEvidence.length} item${needsEvidence.length === 1 ? '' : 's'} need evidence (${formatCurrency(needsEvidenceAmount)}).`;
  } else if (budgetRemaining < 0) {
    recommendation = `Project is over budget by ${formatCurrency(Math.abs(budgetRemaining))}. Review scope or change orders.`;
  } else {
    recommendation = 'Funding and budget are healthy. No action required.';
  }

  return {
    budgetRemaining,
    projectedAllIn: projected,
    fundingGap,
    recordedOwnerCash: totals.totalPaidFromOwnerCash,
    drawReadyCount: readyRows.length,
    drawReadyAmount,
    needsEvidenceCount: needsEvidence.length,
    needsEvidenceAmount,
    biggestAttention: biggest,
    recommendation,
  };
}

export async function fetchDrawDashboard(signal?: AbortSignal): Promise<DrawDashboardData> {
  const res = await fetch(DRAW_SHEET_CSV_URL, { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const csv = await res.text();
  return parseDrawDashboard(csv);
}

// Locally-applied draw funding approvals — used for optimistic dashboard math
// before the tracker Google Sheet is updated. Each approval is keyed by the
// incoming sourceId so refresh / re-fetch can still hide approved items.
export interface AppliedDrawFunding {
  sourceId: string;
  amount: number;
  unit: string; // raw unit string from the incoming row (may be '')
  vendor: string;
  appliedAt: string;
}

export interface ApplyDrawFundingResult {
  data: DrawDashboardData;
  unallocated: AppliedDrawFunding[]; // funding that didn't match a unit summary row
}

export function applyDrawFunding(
  data: DrawDashboardData,
  approvals: AppliedDrawFunding[],
): ApplyDrawFundingResult {
  if (!approvals.length) return { data, unallocated: [] };

  const unallocated: AppliedDrawFunding[] = [];
  const totals: DrawTotals = { ...data.totals };
  const unitSummary: UnitSummaryRow[] = data.unitSummary.map((u) => ({ ...u }));

  for (const a of approvals) {
    const amt = Number(a.amount) || 0;
    if (!amt) continue;
    totals.totalPaidFromDraws += amt;
    totals.netFundingPosition += amt;
    const match = a.unit
      ? unitSummary.find((u) => u.unit.trim().toLowerCase() === a.unit.trim().toLowerCase())
      : undefined;
    if (match) {
      match.drawsApplied += amt;
      match.fundingPosition += amt;
    } else {
      unallocated.push(a);
    }
  }

  const warnings = [...data.warnings];
  if (unallocated.length) {
    warnings.push(
      `${unallocated.length} locally-applied draw funding approval${unallocated.length === 1 ? '' : 's'} could not be matched to a unit — applied to overall totals only. Sync the tracker sheet to allocate.`,
    );
  }
  warnings.push(
    `${approvals.length} draw funding approval${approvals.length === 1 ? '' : 's'} applied in dashboard view only — pending tracker sync.`,
  );

  return {
    data: { ...data, totals, unitSummary, warnings },
    unallocated,
  };
}

