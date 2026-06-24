import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, ExternalLink, Info, CheckCircle2, FileWarning, Clock, BadgeCheck, Inbox } from 'lucide-react';
import {
  fetchDrawDashboard,
  formatCurrency,
  projectedAllIn,
  unitBudgetRemaining,
  unitFundingGap,
  classifyDrawReadiness,
  sourceConfidence,
  computeDecisionSummary,
  type DrawDashboardData,
  type LedgerRow,
  type UnitSummaryRow,
  type DrawReadiness,
  type SourceConfidence,
} from '@/lib/drawDashboard';
import {
  fetchIncomingItems,
  statusLabel,
  statusTone,
  actionLabel,
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

function UnitSummaryCard({ u }: { u: UnitSummaryRow }) {
  const projected = projectedAllIn(u);
  const remaining = unitBudgetRemaining(u);
  const overBudget = remaining < 0;
  const gap = unitFundingGap(u);
  const needsFunding = gap < 0;
  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-heading text-base">{u.unit}</div>
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

export default function AdminDraws() {
  const [data, setData] = useState<DrawDashboardData | null>(null);
  const [incoming, setIncoming] = useState<IncomingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchDrawDashboard();
      setData(d);
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

  const totals = data?.totals;
  const summary = useMemo(() => (data ? computeDecisionSummary(data) : null), [data]);

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
            <div className="grid grid-cols-1 sm:hidden gap-3">
              {data.unitSummary.map((u) => (
                <UnitSummaryCard key={u.unit} u={u} />
              ))}
            </div>
            <div className="hidden sm:block glass-card rounded-xl overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
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
                  {data.unitSummary.map((u) => {
                    const projected = projectedAllIn(u);
                    const remaining = unitBudgetRemaining(u);
                    const overBudget = remaining < 0;
                    const gap = unitFundingGap(u);
                    const needsFunding = gap < 0;
                    return (
                      <tr key={u.unit} className="border-t border-border/30">
                        <td className="p-3">{u.unit}</td>
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
                    );
                  })}
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
