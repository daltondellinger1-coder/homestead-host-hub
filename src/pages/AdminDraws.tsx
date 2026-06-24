import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, ExternalLink, Info } from 'lucide-react';
import {
  fetchDrawDashboard,
  formatCurrency,
  type DrawDashboardData,
  type LedgerRow,
  type UnitSummaryRow,
} from '@/lib/drawDashboard';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

function budgetRemaining(u: UnitSummaryRow) {
  // Budget − Actual − Open committed (positive = under budget)
  return u.budget - u.actual - u.openCommitted;
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

function UnitSummaryCard({ u }: { u: UnitSummaryRow }) {
  const remaining = budgetRemaining(u);
  const overBudget = remaining < 0;
  const needsFunding = u.fundingPosition < 0;
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
        <Row
          label={overBudget ? 'Over budget' : 'Budget remaining'}
          value={formatCurrency(remaining)}
          tone={overBudget ? 'neg' : 'pos'}
        />
        <Row
          label={needsFunding ? 'Funding gap' : 'Funding surplus'}
          value={formatCurrency(u.fundingPosition)}
          tone={needsFunding ? 'neg' : 'pos'}
        />
        <Row label="Draws applied" value={formatCurrency(u.drawsApplied)} tone="muted" />
        <Row label="Owner cash" value={formatCurrency(u.ownerCashApplied)} tone="muted" />
      </div>
    </div>
  );
}

function LedgerCard({ r }: { r: LedgerRow }) {
  return (
    <div className="glass-card rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-heading text-sm">{r.unit}</div>
          <div className="text-xs text-muted-foreground font-body">{r.category}</div>
        </div>
        {r.status && (
          <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-muted/30 text-foreground font-body whitespace-nowrap">
            {r.status}
          </span>
        )}
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
      {(r.vendor || r.receiptLink) && (
        <div className="flex items-center justify-between text-xs font-body pt-1 border-t border-border/30">
          <span className="text-muted-foreground truncate">{r.vendor || '—'}</span>
          {r.receiptLink && /^https?:\/\//.test(r.receiptLink) ? (
            <a
              href={r.receiptLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-secondary hover:underline whitespace-nowrap"
            >
              Receipt <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-muted-foreground">{r.receiptLink || ''}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminDraws() {
  const [data, setData] = useState<DrawDashboardData | null>(null);
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

  const netNeedsFunding = (totals?.netFundingPosition ?? 0) < 0;

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
            <p className="text-muted-foreground mt-1">
              No cached snapshot is bundled with the app. Check your connection and retry.
            </p>
          </div>
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
              <StatCard label="Paid From Draws" value={formatCurrency(totals.totalPaidFromDraws)} />
              <StatCard label="Owner Cash" value={formatCurrency(totals.totalPaidFromOwnerCash)} />
              <StatCard
                label={netNeedsFunding ? 'Funding Gap' : 'Funding Surplus'}
                value={formatCurrency(totals.netFundingPosition)}
                tone={netNeedsFunding ? 'neg' : 'pos'}
                help={
                  netNeedsFunding
                    ? 'Draws + owner cash below actual + open. More funding needed.'
                    : 'Draws + owner cash above actual + open costs.'
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
            <li><span className="text-foreground font-medium">Budget remaining</span> — Budget − Actual − Open committed. Positive = under budget; negative = over budget.</li>
            <li><span className="text-foreground font-medium">Funding gap</span> — Draws + owner cash applied minus actual + open costs. Negative means more draw/cash is needed (not a projected all-in cost).</li>
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
                    <th className="text-right p-3">Open Committed</th>
                    <th className="text-right p-3">Budget Remaining</th>
                    <th className="text-right p-3">Draws</th>
                    <th className="text-right p-3">Owner Cash</th>
                    <th className="text-right p-3">Funding Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {data.unitSummary.map((u) => {
                    const remaining = budgetRemaining(u);
                    const overBudget = remaining < 0;
                    const needsFunding = u.fundingPosition < 0;
                    return (
                      <tr key={u.unit} className="border-t border-border/30">
                        <td className="p-3">{u.unit}</td>
                        <td className="p-3 text-right">{formatCurrency(u.budget)}</td>
                        <td className="p-3 text-right">{formatCurrency(u.actual)}</td>
                        <td className="p-3 text-right">{formatCurrency(u.openCommitted)}</td>
                        <td className={`p-3 text-right ${overBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                          {formatCurrency(remaining)}
                        </td>
                        <td className="p-3 text-right">{formatCurrency(u.drawsApplied)}</td>
                        <td className="p-3 text-right">{formatCurrency(u.ownerCashApplied)}</td>
                        <td className={`p-3 text-right ${needsFunding ? 'text-red-400' : 'text-emerald-400'}`}>
                          {formatCurrency(u.fundingPosition)}
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
              <table className="w-full text-xs font-body min-w-[800px]">
                <thead className="text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">Unit</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Scope</th>
                    <th className="text-right p-2">Budget</th>
                    <th className="text-right p-2">Actual</th>
                    <th className="text-right p-2">Open</th>
                    <th className="text-right p-2">Budget Remaining</th>
                    <th className="text-left p-2">Status</th>
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
                      <td className={`p-2 text-right ${r.variance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatCurrency(r.variance)}
                      </td>
                      <td className="p-2">{r.status}</td>
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
