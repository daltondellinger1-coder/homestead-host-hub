import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, ExternalLink, Info, CheckCircle2, FileWarning, Clock, BadgeCheck, Inbox, Banknote, Undo2, ChevronRight } from 'lucide-react';
import {
  fetchDrawDashboard,
  formatCurrency,
  projectedAllIn,
  unitBudgetRemaining,
  unitFundingGap,
  classifyDrawReadiness,
  sourceConfidence,
  computeDecisionSummary,
  applyDrawFunding,
  type DrawDashboardData,
  type LedgerRow,
  type UnitSummaryRow,
  type DrawReadiness,
  type SourceConfidence,
  type AppliedDrawFunding,
} from '@/lib/drawDashboard';
import {
  fetchIncomingItems,
  statusLabel,
  statusTone,
  actionLabel,
  isDrawFundingCandidate,
  isFundingCandidateReconciled,
  type IncomingItem,
  type IncomingStatus,
  type IncomingRecommendedAction,
} from '@/lib/drawIncoming';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

function StatCard({
  label,
  value,
  tone,
  help,
}: {
  label: string;
  value: string;
  tone?: 'pos' | 'neg' | 'neutral';
  help?: string;
}) {
  const toneClass =
    tone === 'pos' ? 'text-emerald-400' : tone === 'neg' ? 'text-red-400' : 'text-foreground';
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground font-body">{label}</div>
      <div className={`font-heading text-xl sm:text-2xl mt-1 ${toneClass}`}>{value}</div>
      {help && <div className="text-[11px] text-muted-foreground font-body mt-1">{help}</div>}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'pos' | 'neg' | 'neutral' | 'muted';
}) {
  const toneClass =
    tone === 'pos'
      ? 'text-emerald-400'
      : tone === 'neg'
        ? 'text-red-400'
        : tone === 'muted'
          ? 'text-muted-foreground'
          : 'text-foreground';
  return (
    <>
      <div className="text-muted-foreground">{label}</div>
      <div className={`text-right font-medium ${toneClass}`}>{value}</div>
    </>
  );
}

function ConfidenceBadge({ c }: { c: SourceConfidence }) {
  const map: Record<SourceConfidence, { label: string; cls: string; Icon: typeof BadgeCheck }> = {
    verified: { label: 'Evidence linked', cls: 'bg-emerald-500/15 text-emerald-400', Icon: BadgeCheck },
    'needs-evidence': { label: 'Needs evidence', cls: 'bg-amber-500/15 text-amber-400', Icon: FileWarning },
    estimate: { label: 'Estimate / open', cls: 'bg-muted/30 text-muted-foreground', Icon: Clock },
    drawn: { label: 'Funded / drawn', cls: 'bg-secondary/15 text-secondary', Icon: CheckCircle2 },
  };
  const { label, cls, Icon } = map[c];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-1 rounded-full font-body ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

const RECONCILE_TOLERANCE = 1; // dollars

function unitLedgerRows(ledger: LedgerRow[], unit: string): LedgerRow[] {
  return ledger.filter((r) => r.unit.trim().toLowerCase() === unit.trim().toLowerCase());
}

function unitReconciles(u: UnitSummaryRow, rows: LedgerRow[]): boolean {
  const sumActual = rows.reduce((s, r) => s + r.actual, 0);
  const sumOpen = rows.reduce((s, r) => s + r.openCommitted, 0);
  return (
    Math.abs(sumActual - u.actual) <= RECONCILE_TOLERANCE &&
    Math.abs(sumOpen - u.openCommitted) <= RECONCILE_TOLERANCE
  );
}

function UnitCostBreakdown({ u, rows }: { u: UnitSummaryRow; rows: LedgerRow[] }) {
  const reconciles = unitReconciles(u, rows);
  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground font-body italic">
          No individual ledger rows found for this unit in the source sheet.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1 sm:mx-0">
          <table className="w-full text-xs font-body">
            <thead className="text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">Category / Scope</th>
                <th className="text-right p-2">Budget</th>
                <th className="text-right p-2">Actual</th>
                <th className="text-right p-2">Open</th>
                <th className="text-right p-2">Projected</th>
                <th className="text-right p-2">Remaining</th>
                <th className="text-left p-2 hidden md:table-cell">Vendor</th>
                <th className="text-left p-2 hidden md:table-cell">Status</th>
                <th className="text-left p-2">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const projected = projectedAllIn(r);
                const overBudget = r.variance < 0;
                return (
                  <tr key={i} className="border-t border-border/20 align-top">
                    <td className="p-2">
                      <div className="text-foreground">{r.category || '—'}</div>
                      {r.scope && (
                        <div className="text-[10px] text-muted-foreground">{r.scope}</div>
                      )}
                    </td>
                    <td className="p-2 text-right">{formatCurrency(r.budget)}</td>
                    <td className="p-2 text-right">{formatCurrency(r.actual)}</td>
                    <td className="p-2 text-right">{formatCurrency(r.openCommitted)}</td>
                    <td className="p-2 text-right">{formatCurrency(projected)}</td>
                    <td className={`p-2 text-right ${overBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatCurrency(r.variance)}
                    </td>
                    <td className="p-2 hidden md:table-cell text-muted-foreground truncate max-w-[140px]">
                      {r.vendor || '—'}
                    </td>
                    <td className="p-2 hidden md:table-cell text-muted-foreground truncate max-w-[160px]">
                      {r.status || '—'}
                    </td>
                    <td className="p-2">
                      {r.receiptLink && /^https?:\/\//.test(r.receiptLink) ? (
                        <a
                          href={r.receiptLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-secondary hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!reconciles && rows.length > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] text-amber-300 font-body">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Visible detail may not fully reconcile to summary; check source sheet formulas/manual
            rows. (Summary actual {formatCurrency(u.actual)} vs sum of rows{' '}
            {formatCurrency(rows.reduce((s, r) => s + r.actual, 0))}.)
          </span>
        </div>
      )}
    </div>
  );
}
function UnitSummaryTableRow({ u, ledger }: { u: UnitSummaryRow; ledger: LedgerRow[] }) {
  const [open, setOpen] = useState(false);
  const projected = projectedAllIn(u);
  const remaining = unitBudgetRemaining(u);
  const overBudget = remaining < 0;
  const gap = unitFundingGap(u);
  const needsFunding = gap < 0;
  const rows = useMemo(() => unitLedgerRows(ledger, u.unit), [ledger, u.unit]);
  return (
    <>
      <tr
        className="border-t border-border/30 cursor-pointer hover:bg-muted/10"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <td className="p-3">
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`}
          />
        </td>
        <td className="p-3">
          <button
            type="button"
            className="text-left hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
          >
            {u.unit}
            <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              {open ? 'Hide costs' : `View costs (${rows.length})`}
            </span>
          </button>
        </td>
        <td className="p-3 text-right">{formatCurrency(u.budget)}</td>
        <td className="p-3 text-right">{formatCurrency(u.actual)}</td>
        <td className="p-3 text-right">{formatCurrency(u.openCommitted)}</td>
        <td className="p-3 text-right">{formatCurrency(projected)}</td>
        <td className={`p-3 text-right ${overBudget ? 'text-red-400' : 'text-emerald-400'}`}>
          {formatCurrency(remaining)}
        </td>
        <td className="p-3 text-right">{formatCurrency(u.drawsApplied)}</td>
        <td className="p-3 text-right">{formatCurrency(u.ownerCashApplied)}</td>
        <td className={`p-3 text-right ${needsFunding ? 'text-red-400' : 'text-emerald-400'}`}>
          {formatCurrency(gap)}
        </td>
      </tr>
      {open && (
        <tr className="border-t border-border/20 bg-muted/5">
          <td></td>
          <td colSpan={9} className="p-3">
            <UnitCostBreakdown u={u} rows={rows} />
          </td>
        </tr>
      )}
    </>
  );
}


function UnitSummaryCard({ u, ledger }: { u: UnitSummaryRow; ledger: LedgerRow[] }) {
  const [open, setOpen] = useState(false);
  const projected = projectedAllIn(u);
  const remaining = unitBudgetRemaining(u);
  const overBudget = remaining < 0;
  const gap = unitFundingGap(u);
  const needsFunding = gap < 0;
  const rows = useMemo(() => unitLedgerRows(ledger, u.unit), [ledger, u.unit]);
  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center justify-between gap-2"
        aria-expanded={open}
      >
        <div className="font-heading text-base flex items-center gap-1.5">
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`}
          />
          {u.unit}
        </div>
        <div className="flex items-center gap-2">
          {needsFunding ? (
            <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-red-500/15 text-red-400 font-body">
              Needs funding
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-body">
              Funded
            </span>
          )}
        </div>
      </button>
      <div className="grid grid-cols-2 gap-y-1.5 text-sm font-body">
        <Row label="Budget" value={formatCurrency(u.budget)} tone="neutral" />
        <Row label="Actual spent" value={formatCurrency(u.actual)} tone="neutral" />
        <Row label="Open committed" value={formatCurrency(u.openCommitted)} tone="neutral" />
        <Row label="Projected all-in" value={formatCurrency(projected)} tone="neutral" />
        <Row
          label={overBudget ? 'Over budget' : 'Budget remaining'}
          value={formatCurrency(remaining)}
          tone={overBudget ? 'neg' : 'pos'}
        />
        <Row
          label={needsFunding ? 'Funding gap' : 'Funding surplus'}
          value={formatCurrency(gap)}
          tone={needsFunding ? 'neg' : 'pos'}
        />
        <Row label="Draws applied" value={formatCurrency(u.drawsApplied)} tone="muted" />
        <Row label="Recorded owner cash" value={formatCurrency(u.ownerCashApplied)} tone="muted" />
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-[11px] font-body text-secondary hover:underline text-left flex items-center gap-1"
      >
        <ChevronRight className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`} />
        {open ? 'Hide costs' : `View costs (${rows.length})`}
      </button>
      {open && (
        <div className="pt-2 border-t border-border/30">
          <UnitCostBreakdown u={u} rows={rows} />
        </div>
      )}
    </div>
  );
}

function LedgerCard({ r }: { r: LedgerRow }) {
  const conf = sourceConfidence(r);
  return (
    <div className="glass-card rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-heading text-sm">{r.unit}</div>
          <div className="text-xs text-muted-foreground font-body">{r.category}</div>
        </div>
        <ConfidenceBadge c={conf} />
      </div>
      {r.scope && <div className="text-sm font-body">{r.scope}</div>}
      <div className="grid grid-cols-2 gap-y-1 text-xs font-body">
        <Row label="Budget" value={formatCurrency(r.budget)} tone="neutral" />
        <Row label="Actual" value={formatCurrency(r.actual)} tone="neutral" />
        <Row label="Open committed" value={formatCurrency(r.openCommitted)} tone="neutral" />
        <Row
          label={r.variance < 0 ? 'Over budget' : 'Budget remaining'}
          value={formatCurrency(r.variance)}
          tone={r.variance < 0 ? 'neg' : 'pos'}
        />
      </div>
      {(r.vendor || r.receiptLink || r.status) && (
        <div className="flex items-center justify-between gap-2 text-xs font-body pt-1 border-t border-border/30">
          <span className="text-muted-foreground truncate">
            {r.vendor || '—'}{r.status ? ` · ${r.status}` : ''}
          </span>
          {r.receiptLink && /^https?:\/\//.test(r.receiptLink) ? (
            <a
              href={r.receiptLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-secondary hover:underline whitespace-nowrap"
            >
              Receipt <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ReadinessGroup({ rows, emptyText }: { rows: LedgerRow[]; emptyText: string }) {
  if (rows.length === 0) {
    return <div className="text-xs text-muted-foreground font-body text-center py-4">{emptyText}</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-2">
      {rows.map((r, i) => (
        <div key={i} className="glass-card rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-heading text-sm">{r.unit}</div>
              <div className="text-xs text-muted-foreground font-body truncate">
                {r.category}{r.scope ? ` · ${r.scope}` : ''}
              </div>
            </div>
            <ConfidenceBadge c={sourceConfidence(r)} />
          </div>
          <div className="flex items-center justify-between text-xs font-body">
            <span className="text-muted-foreground">
              Actual {formatCurrency(r.actual)} · Open {formatCurrency(r.openCommitted)}
            </span>
            {r.receiptLink && /^https?:\/\//.test(r.receiptLink) && (
              <a
                href={r.receiptLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-secondary hover:underline whitespace-nowrap"
              >
                Receipt <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function IncomingStatusBadge({ s }: { s: IncomingStatus }) {
  const tone = statusTone(s);
  const cls =
    tone === 'pos'
      ? 'bg-emerald-500/15 text-emerald-400'
      : tone === 'warn'
        ? 'bg-amber-500/15 text-amber-400'
        : 'bg-muted/30 text-muted-foreground';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-1 rounded-full font-body ${cls}`}>
      {statusLabel(s)}
    </span>
  );
}

const ACTION_ORDER: IncomingRecommendedAction[] = [
  'approve-to-tracker',
  'change-unit-category',
  'mark-not-homestead',
  'needs-more-proof',
];

function IncomingActions({ recommended }: { recommended: IncomingRecommendedAction }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
      {ACTION_ORDER.map((a) => {
        const isRec = a === recommended;
        return (
          <button
            key={a}
            type="button"
            disabled
            title="Review action — backend write not enabled yet"
            className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-md font-body border ${
              isRec
                ? 'border-secondary/50 text-secondary bg-secondary/10'
                : 'border-border/40 text-muted-foreground bg-muted/10'
            } cursor-not-allowed opacity-80`}
          >
            {isRec ? `${actionLabel(a)} · suggested` : `Review · ${actionLabel(a)}`}
          </button>
        );
      })}
    </div>
  );
}

function IncomingCard({ item }: { item: IncomingItem }) {
  return (
    <div className="glass-card rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-heading text-sm truncate">{item.vendor || item.sourceId}</div>
          <div className="text-[11px] text-muted-foreground font-body truncate">
            {item.sourceType} · {item.date || 'no date'} · {item.sourceId || 'no id'}
          </div>
        </div>
        <div className="text-right">
          <div className="font-heading text-sm">{formatCurrency(item.amount)}</div>
          <div className="text-[10px] text-muted-foreground font-body uppercase">{item.confidence}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <IncomingStatusBadge s={item.derivedStatus} />
        <span className="text-[11px] text-muted-foreground font-body">
          {item.unit || 'Unit ?'} · {item.category || 'Category ?'}
        </span>
      </div>
      {item.warnings.length > 0 && (
        <ul className="text-[11px] text-amber-400 font-body list-disc list-inside space-y-0.5">
          {item.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
      {item.notes && <div className="text-[11px] text-muted-foreground font-body">{item.notes}</div>}
      {item.evidenceUrl && /^https?:\/\//.test(item.evidenceUrl) && (
        <a
          href={item.evidenceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-secondary hover:underline"
        >
          Evidence <ExternalLink className="h-3 w-3" />
        </a>
      )}
      <IncomingActions recommended={item.recommendedAction} />
    </div>
  );
}

// Acknowledged candidate IDs are hidden from the funding-confirmation card list
// but STILL count in the dashboard math — funding totals always come from
// (base sheet totals) + (non-reconciled draw funding candidates). Acknowledge
// is a UI-only "I've seen this" toggle, never a math gate.
const ACK_STORAGE_KEY = 'hh.draws.acknowledgedFunding.v1';

function loadAcknowledged(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
function saveAcknowledged(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(ids));
  } catch { /* ignore quota errors */ }
}

export default function AdminDraws() {
  const [rawData, setRawData] = useState<DrawDashboardData | null>(null);
  const [incoming, setIncoming] = useState<IncomingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>(() => loadAcknowledged());

  useEffect(() => {
    saveAcknowledged(acknowledgedIds);
  }, [acknowledgedIds]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchDrawDashboard();
      setRawData(d);
      // Incoming review queue is best-effort; failures must not block the dashboard.
      const inc = await fetchIncomingItems(d.ledger);
      setIncoming(inc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load draw sheet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Non-reconciled lender draw funding candidates are auto-included in the
  // displayed dashboard math (Paid From Draws + Funding Gap). No click needed.
  // Once the source sheet marks them reconciled (duplicateCheck/notes), they
  // drop out automatically so totals don't double-count.
  const autoFunding: AppliedDrawFunding[] = useMemo(() => {
    return incoming
      .filter((it) => isDrawFundingCandidate(it) && !isFundingCandidateReconciled(it))
      .map((it) => ({
        sourceId: it.sourceId,
        amount: it.amount,
        unit: it.unit,
        vendor: it.vendor,
        appliedAt: 'auto',
      }));
  }, [incoming]);

  const applyResult = useMemo(
    () => (rawData ? applyDrawFunding(rawData, autoFunding) : null),
    [rawData, autoFunding],
  );
  const data = applyResult?.data ?? null;
  const totals = data?.totals;
  const summary = useMemo(() => (data ? computeDecisionSummary(data) : null), [data]);

  const fundingCandidates = useMemo(
    () => incoming.filter((it) => isDrawFundingCandidate(it)),
    [incoming],
  );
  const fundingCandidateIds = useMemo(
    () => new Set(fundingCandidates.map((it) => it.sourceId)),
    [fundingCandidates],
  );
  const ackSet = useMemo(() => new Set(acknowledgedIds), [acknowledgedIds]);
  const visibleFundingCandidates = useMemo(
    () => fundingCandidates.filter((it) => !ackSet.has(it.sourceId)),
    [fundingCandidates, ackSet],
  );
  // Generic vendor review queue excludes draw-funding candidates entirely.
  const reviewQueue = useMemo(
    () => incoming.filter((it) => !fundingCandidateIds.has(it.sourceId)),
    [incoming, fundingCandidateIds],
  );

  const acknowledge = (sourceId: string) => {
    setAcknowledgedIds((prev) => (prev.includes(sourceId) ? prev : [...prev, sourceId]));
  };
  const unacknowledge = (sourceId: string) => {
    setAcknowledgedIds((prev) => prev.filter((id) => id !== sourceId));
  };
  const resetAcknowledged = () => setAcknowledgedIds([]);

  const unitOptions = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.ledger.map((l) => l.unit))).sort();
  }, [data]);
  const statusOptions = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.ledger.map((l) => l.status).filter(Boolean))).sort();
  }, [data]);

  const filteredLedger = useMemo(() => {
    if (!data) return [];
    return data.ledger.filter(
      (r) =>
        (unitFilter === 'all' || r.unit === unitFilter) &&
        (statusFilter === 'all' || r.status === statusFilter),
    );
  }, [data, unitFilter, statusFilter]);

  const grouped = useMemo(() => {
    const g: Record<DrawReadiness, LedgerRow[]> = { ready: [], 'needs-evidence': [], 'not-ready': [], drawn: [] };
    if (!data) return g;
    for (const r of data.ledger) g[classifyDrawReadiness(r)].push(r);
    return g;
  }, [data]);

  const netNeedsFunding = (totals?.netFundingPosition ?? 0) < 0;
  const projectOverBudget = (summary?.budgetRemaining ?? 0) < 0;

  return (
    <div className="min-h-screen pattern-bg pb-24 sm:pb-8">
      <div className="sticky top-0 z-30 border-b border-border/40 bg-card/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-heading text-base sm:text-lg truncate">Homestead Hill Draw Dashboard</h1>
              <p className="text-[11px] text-muted-foreground font-body truncate">
                {loading
                  ? 'Loading live sheet…'
                  : data
                    ? `Updated ${new Date(data.fetchedAt).toLocaleString()}`
                    : 'No data'}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="ml-1 hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {error && (
          <div className="glass-card rounded-xl p-4 border border-red-500/40 text-sm font-body">
            <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
              <AlertTriangle className="h-4 w-4" /> Could not load live sheet
            </div>
            <p className="text-muted-foreground">{error}</p>
          </div>
        )}

        {summary && totals && (
          <section className="glass-card rounded-xl p-4 space-y-3 border border-secondary/30">
            <div className="flex items-center gap-2 font-heading text-base">
              <BadgeCheck className="h-4 w-4 text-secondary" /> Decision summary
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-body">
              <div className="rounded-lg bg-muted/10 p-3">
                <div className="text-xs uppercase text-muted-foreground">Budget health</div>
                <div className={`font-heading text-lg ${projectOverBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                  {projectOverBudget
                    ? `Over budget by ${formatCurrency(Math.abs(summary.budgetRemaining))}`
                    : `Under budget by ${formatCurrency(summary.budgetRemaining)}`}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Projected all-in {formatCurrency(summary.projectedAllIn)} vs budget {formatCurrency(totals.totalBudget)}
                </div>
              </div>
              <div className="rounded-lg bg-muted/10 p-3">
                <div className="text-xs uppercase text-muted-foreground">Funding health</div>
                <div className={`font-heading text-lg ${netNeedsFunding ? 'text-red-400' : 'text-emerald-400'}`}>
                  {netNeedsFunding
                    ? `Funding gap ${formatCurrency(Math.abs(summary.fundingGap))}`
                    : `Funding surplus ${formatCurrency(summary.fundingGap)}`}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Recorded owner cash {formatCurrency(summary.recordedOwnerCash)}
                </div>
              </div>
              <div className="rounded-lg bg-muted/10 p-3">
                <div className="text-xs uppercase text-muted-foreground">Draw-ready amount</div>
                <div className="font-heading text-lg text-foreground">
                  {summary.drawReadyCount > 0
                    ? `${formatCurrency(summary.drawReadyAmount)} (${summary.drawReadyCount} items)`
                    : 'Needs review'}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {summary.needsEvidenceCount} item{summary.needsEvidenceCount === 1 ? '' : 's'} need evidence ({formatCurrency(summary.needsEvidenceAmount)})
                </div>
              </div>
              <div className="rounded-lg bg-muted/10 p-3">
                <div className="text-xs uppercase text-muted-foreground">Biggest attention</div>
                {summary.biggestAttention ? (
                  <>
                    <div className="font-heading text-lg text-red-400">
                      {summary.biggestAttention.unit}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {summary.biggestAttention.reason}: {formatCurrency(summary.biggestAttention.amount)}
                    </div>
                  </>
                ) : (
                  <div className="font-heading text-lg text-emerald-400">All units healthy</div>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-secondary/10 border border-secondary/30 p-3 text-sm font-body">
              <span className="text-secondary font-semibold">Next action: </span>
              <span className="text-foreground">{summary.recommendation}</span>
            </div>
            <div className="rounded-lg bg-muted/10 border border-border/40 p-3 text-[11px] font-body text-muted-foreground space-y-1">
              <div className="text-foreground font-semibold text-xs">How automation works</div>
              <div>· Live totals above auto-update from the tracker sheet.</div>
              <div>· Incoming vendor/invoice items appear in the review queue below first.</div>
              <div>· Totals change only after items are approved/entered into the tracker — preventing bad data from moving the numbers.</div>
            </div>
          </section>
        )}

        {totals && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Total Budget" value={formatCurrency(totals.totalBudget)} />
              <StatCard
                label="Actual Spent"
                value={formatCurrency(totals.totalActual)}
                help="Recorded costs to date"
              />
              <StatCard
                label="Open Committed"
                value={formatCurrency(totals.openCommitted)}
                help="Expected, not yet paid"
              />
              <StatCard
                label="Projected All-In"
                value={formatCurrency(totals.totalActual + totals.openCommitted)}
                help="Actual + Open committed"
              />
              <StatCard label="Paid From Draws" value={formatCurrency(totals.totalPaidFromDraws)} />
              <StatCard
                label="Recorded Owner Cash"
                value={formatCurrency(totals.totalPaidFromOwnerCash)}
                help="Explicit owner cash from the sheet. Does not include practical gap coverage."
              />
              <StatCard
                label={netNeedsFunding ? 'Funding Gap (cash needed)' : 'Funding Surplus'}
                value={formatCurrency(totals.netFundingPosition)}
                tone={netNeedsFunding ? 'neg' : 'pos'}
                help={
                  netNeedsFunding
                    ? 'Practical cash exposure until next draw covers actual + open costs.'
                    : 'Draws + recorded owner cash exceed actual + open costs.'
                }
              />
            </div>
            {totals.status && (
              <div className="text-xs font-body text-muted-foreground">
                Status: <span className="text-foreground">{totals.status}</span>
              </div>
            )}
          </>
        )}

        <div className="glass-card rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-foreground font-heading text-sm">
            <Info className="h-4 w-4 text-secondary" /> How to read this dashboard
          </div>
          <ul className="text-xs sm:text-sm font-body text-muted-foreground space-y-1">
            <li><span className="text-foreground font-medium">Actual</span> — money already spent/recorded.</li>
            <li><span className="text-foreground font-medium">Open committed</span> — expected/in-progress costs not yet paid.</li>
            <li><span className="text-foreground font-medium">Projected all-in</span> — Actual + Open committed. Best estimate of total cost.</li>
            <li><span className="text-foreground font-medium">Budget remaining</span> — Budget − Projected all-in. Negative = over budget.</li>
            <li><span className="text-foreground font-medium">Funding gap</span> — Draws + recorded owner cash − Projected all-in. Negative = practical cash still needed until next draw. Not a projected all-in cost.</li>
            <li><span className="text-foreground font-medium">Recorded owner cash</span> — explicit owner cash from the sheet. A $0 here with a funding gap still means owner cash is effectively covering the gap.</li>
          </ul>
        </div>

        {data?.warnings.length ? (
          <div className="glass-card rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-secondary font-heading text-sm">
              <AlertTriangle className="h-4 w-4" /> Data quality notes
            </div>
            <ul className="list-disc list-inside text-sm font-body text-muted-foreground space-y-1">
              {data.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {data && (
          <section className="space-y-2">
            <h2 className="font-heading text-base">Unit summary</h2>
            <p className="text-[11px] text-muted-foreground font-body">
              Tap a unit to see the individual cost ledger rows that make up its totals.
            </p>
            <div className="grid grid-cols-1 sm:hidden gap-3">
              {data.unitSummary.map((u) => (
                <UnitSummaryCard key={u.unit} u={u} ledger={data.ledger} />
              ))}
            </div>
            <div className="hidden sm:block glass-card rounded-xl overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3 w-6"></th>
                    <th className="text-left p-3">Unit / Area</th>
                    <th className="text-right p-3">Budget</th>
                    <th className="text-right p-3">Actual</th>
                    <th className="text-right p-3">Open</th>
                    <th className="text-right p-3">Projected all-in</th>
                    <th className="text-right p-3">Budget Remaining</th>
                    <th className="text-right p-3">Draws</th>
                    <th className="text-right p-3">Recorded Owner Cash</th>
                    <th className="text-right p-3">Funding Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {data.unitSummary.map((u) => (
                    <UnitSummaryTableRow key={u.unit} u={u} ledger={data.ledger} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data && data.ledger.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-heading text-base">Draw readiness</h2>
              <span className="text-[11px] font-body text-muted-foreground">Review before sending to lender</span>
            </div>
            <Tabs defaultValue="ready">
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto">
                <TabsTrigger value="ready" className="text-xs">
                  Ready ({grouped.ready.length})
                </TabsTrigger>
                <TabsTrigger value="needs-evidence" className="text-xs">
                  Needs evidence ({grouped['needs-evidence'].length})
                </TabsTrigger>
                <TabsTrigger value="not-ready" className="text-xs">
                  Not ready ({grouped['not-ready'].length})
                </TabsTrigger>
                <TabsTrigger value="drawn" className="text-xs">
                  Drawn ({grouped.drawn.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="ready" className="mt-3">
                <ReadinessGroup rows={grouped.ready} emptyText="No items currently ready for draw review." />
              </TabsContent>
              <TabsContent value="needs-evidence" className="mt-3">
                <ReadinessGroup rows={grouped['needs-evidence']} emptyText="All actuals have evidence linked." />
              </TabsContent>
              <TabsContent value="not-ready" className="mt-3">
                <ReadinessGroup rows={grouped['not-ready']} emptyText="No open commitments awaiting actuals." />
              </TabsContent>
              <TabsContent value="drawn" className="mt-3">
                <ReadinessGroup rows={grouped.drawn} emptyText="No items have been marked drawn/funded yet." />
              </TabsContent>
            </Tabs>
          </section>
        )}

        {data && fundingCandidates.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-heading text-base flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-400" /> Funded draw confirmations
              </h2>
              <span className="text-[11px] font-body text-muted-foreground">
                {fundingCandidates.length} confirmed · {ackSet.size} acknowledged
              </span>
            </div>
            <div className="glass-card rounded-xl p-3 text-[11px] font-body text-muted-foreground space-y-1">
              <div>
                <span className="text-emerald-300 font-semibold">Included in dashboard funding math from lender funding confirmation.</span>
                {' '}Paid From Draws and Funding Gap above already reflect these deposits — no click required.
              </div>
              <div>
                Vendor receipts/invoices stay <span className="text-foreground font-semibold">support-only</span> and are
                <span className="text-foreground font-semibold"> not</span> marked paid by these confirmations.
                Items drop out of this list automatically once the tracker sheet marks them reconciled.
              </div>
            </div>

            {applyResult && applyResult.unallocated.length > 0 && (
              <div className="glass-card rounded-xl p-3 border border-amber-500/40 text-[11px] font-body text-amber-300">
                {applyResult.unallocated.length} confirmation{applyResult.unallocated.length === 1 ? '' : 's'} could not
                be matched to a single unit (e.g., multi-unit draws like “Common/Exteriors + Unit 12”). Applied to
                overall totals only — unit allocation needs tracker sync.
              </div>
            )}

            {visibleFundingCandidates.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleFundingCandidates.map((it) => (
                  <div key={it.sourceId} className="glass-card rounded-xl p-3 space-y-2 border border-emerald-500/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-heading text-sm truncate">
                          {it.vendor || 'Lender draw'} · {it.unit || 'Overall'}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-body truncate">
                          {it.sourceType} · {it.date || 'no date'} · {it.sourceId || 'no id'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-heading text-base text-emerald-400">
                          {formatCurrency(it.amount)}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-emerald-300/80 font-body">
                          In totals
                        </div>
                      </div>
                    </div>
                    {it.notes && (
                      <div className="text-[11px] text-muted-foreground font-body">{it.notes}</div>
                    )}
                    {it.warnings.length > 0 && (
                      <ul className="text-[11px] text-amber-400 font-body list-disc list-inside space-y-0.5">
                        {it.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => acknowledge(it.sourceId)}
                      className="w-full text-xs font-body px-3 py-2 rounded-md bg-muted/20 text-muted-foreground border border-border/40 hover:bg-muted/30 hover:text-foreground transition-colors"
                    >
                      Acknowledge / hide
                    </button>
                    <div className="text-[10px] text-muted-foreground font-body text-center">
                      Hiding only removes the card — totals stay updated until the tracker marks it reconciled.
                    </div>
                  </div>
                ))}
              </div>
            )}

            {ackSet.size > 0 && (
              <div className="glass-card rounded-xl p-3 space-y-2 border border-secondary/30">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-heading text-foreground">
                    Acknowledged ({ackSet.size}) — still counted in totals
                  </div>
                  <button
                    type="button"
                    onClick={resetAcknowledged}
                    className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <Undo2 className="h-3 w-3" /> Show all
                  </button>
                </div>
                <ul className="space-y-1.5">
                  {fundingCandidates.filter((it) => ackSet.has(it.sourceId)).map((it) => (
                    <li key={it.sourceId} className="flex items-center justify-between gap-2 text-xs font-body">
                      <div className="min-w-0">
                        <div className="truncate text-foreground">
                          {formatCurrency(it.amount)} · {it.unit || 'Overall'}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {it.vendor || it.sourceId}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => unacknowledge(it.sourceId)}
                        className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <Undo2 className="h-3 w-3" /> Unhide
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

        )}

        {data && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-heading text-base flex items-center gap-2">
                <Inbox className="h-4 w-4 text-secondary" /> Incoming items needing review
              </h2>
              <span className="text-[11px] font-body text-muted-foreground">
                {reviewQueue.length} staged · not in totals
              </span>
            </div>
            <div className="glass-card rounded-xl p-3 text-[11px] font-body text-muted-foreground">
              Vendor/invoice items from connected sources (Lowe's, Amazon, Menards, contractor invoices, FlipperForce, Gmail).
              These are vendor backup — <span className="text-foreground font-semibold">support-only / not payment evidence</span> until
              approved and entered into the main sheet. Lender draw funding confirmations are handled separately above.
            </div>
            {reviewQueue.length === 0 ? (
              <div className="glass-card rounded-xl p-6 text-center text-sm font-body text-muted-foreground">
                No vendor items waiting on review.
                <div className="text-[11px] mt-1">
                  Add a dedicated <span className="text-foreground font-semibold">Incoming Review</span> tab with marker <span className="text-foreground font-mono">HH_INCOMING_REVIEW_V1</span> and the expected headers (sourceId, vendor, amount, recommendedAction, …) to populate this queue.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reviewQueue.map((it, i) => (
                  <IncomingCard key={`${it.sourceId}-${i}`} item={it} />
                ))}
              </div>
            )}
          </section>
        )}


        {data && data.ledger.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-heading text-base">Ledger detail</h2>
              <div className="text-xs text-muted-foreground font-body">
                {filteredLedger.length} of {data.ledger.length}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Unit / Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All units</SelectItem>
                  {unitOptions.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile stacked cards */}
            <div className="grid grid-cols-1 sm:hidden gap-3">
              {filteredLedger.map((r, i) => (
                <LedgerCard key={i} r={r} />
              ))}
              {filteredLedger.length === 0 && (
                <div className="text-sm text-muted-foreground font-body text-center py-6">
                  No ledger rows match these filters.
                </div>
              )}
            </div>

            {/* Desktop/tablet wide table */}
            <div className="hidden sm:block glass-card rounded-xl overflow-x-auto">
              <table className="w-full text-xs font-body min-w-[900px]">
                <thead className="text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">Unit</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Scope</th>
                    <th className="text-right p-2">Budget</th>
                    <th className="text-right p-2">Actual</th>
                    <th className="text-right p-2">Open</th>
                    <th className="text-right p-2">Projected</th>
                    <th className="text-right p-2">Budget Remaining</th>
                    <th className="text-left p-2">Confidence</th>
                    <th className="text-left p-2">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.map((r, i) => (
                    <tr key={i} className="border-t border-border/30 align-top">
                      <td className="p-2 whitespace-nowrap">{r.unit}</td>
                      <td className="p-2 whitespace-nowrap">{r.category}</td>
                      <td className="p-2">{r.scope}</td>
                      <td className="p-2 text-right">{formatCurrency(r.budget)}</td>
                      <td className="p-2 text-right">{formatCurrency(r.actual)}</td>
                      <td className="p-2 text-right">{formatCurrency(r.openCommitted)}</td>
                      <td className="p-2 text-right">{formatCurrency(projectedAllIn(r))}</td>
                      <td className={`p-2 text-right ${r.variance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatCurrency(r.variance)}
                      </td>
                      <td className="p-2"><ConfidenceBadge c={sourceConfidence(r)} /></td>
                      <td className="p-2">
                        {r.receiptLink && /^https?:\/\//.test(r.receiptLink) ? (
                          <a
                            href={r.receiptLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-secondary hover:underline"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">{r.receiptLink || '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
