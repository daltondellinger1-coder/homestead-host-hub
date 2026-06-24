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
  const unit14NeedsVerification = ledger.some(
    (l) => l.unit === 'Unit 14' && /needs receipt|needs receipt-qbo|imported/i.test(l.status),
  );
  if (unit14NeedsVerification) {
    warnings.push('Unit 14 actuals are imported from the source budget tab and still need receipt/QBO verification.');
  }
  if (totals.netFundingPosition < 0) {
    warnings.push(
      `Net funding position is negative (${formatCurrency(totals.netFundingPosition)}). Owner cash or draw needed to cover open commitments.`,
    );
  }

  return { totals, unitSummary, ledger, warnings, fetchedAt };
}

export function formatCurrency(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function fetchDrawDashboard(signal?: AbortSignal): Promise<DrawDashboardData> {
  const res = await fetch(DRAW_SHEET_CSV_URL, { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const csv = await res.text();
  return parseDrawDashboard(csv);
}
