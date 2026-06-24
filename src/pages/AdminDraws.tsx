import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  fetchDrawDashboard,
  formatCurrency,
  type DrawDashboardData,
} from '@/lib/drawDashboard';
import { Button } from '@/components/ui/button';

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' | 'neutral' }) {
  const toneClass =
    tone === 'pos' ? 'text-emerald-400' : tone === 'neg' ? 'text-red-400' : 'text-foreground';
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground font-body">{label}</div>
      <div className={`font-heading text-xl sm:text-2xl mt-1 ${toneClass}`}>{value}</div>
    </div>
  );
}

export default function AdminDraws() {
  const [data, setData] = useState<DrawDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              <StatCard label="Total Actual" value={formatCurrency(totals.totalActual)} />
              <StatCard label="Paid From Draws" value={formatCurrency(totals.totalPaidFromDraws)} />
              <StatCard label="Owner Cash" value={formatCurrency(totals.totalPaidFromOwnerCash)} />
              <StatCard label="Open Committed" value={formatCurrency(totals.openCommitted)} />
              <StatCard
                label="Net Funding Position"
                value={formatCurrency(totals.netFundingPosition)}
                tone={totals.netFundingPosition < 0 ? 'neg' : 'pos'}
              />
            </div>
            {totals.status && (
              <div className="text-xs font-body text-muted-foreground">
                Status: <span className="text-foreground">{totals.status}</span>
              </div>
            )}
          </>
        )}

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
                <div key={u.unit} className="glass-card rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-heading text-sm">{u.unit}</div>
                    <div
                      className={`text-sm font-body ${u.fundingPosition < 0 ? 'text-red-400' : 'text-emerald-400'}`}
                    >
                      {formatCurrency(u.fundingPosition)}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs font-body text-muted-foreground">
                    <div>Budget</div><div className="text-right text-foreground">{formatCurrency(u.budget)}</div>
                    <div>Actual</div><div className="text-right text-foreground">{formatCurrency(u.actual)}</div>
                    <div>Draws</div><div className="text-right text-foreground">{formatCurrency(u.drawsApplied)}</div>
                    <div>Owner Cash</div><div className="text-right text-foreground">{formatCurrency(u.ownerCashApplied)}</div>
                    <div>Open Committed</div><div className="text-right text-foreground">{formatCurrency(u.openCommitted)}</div>
                    <div>Variance</div><div className="text-right text-foreground">{formatCurrency(u.variance)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block glass-card rounded-xl overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Unit / Area</th>
                    <th className="text-right p-3">Budget</th>
                    <th className="text-right p-3">Actual</th>
                    <th className="text-right p-3">Draws</th>
                    <th className="text-right p-3">Owner Cash</th>
                    <th className="text-right p-3">Open Committed</th>
                    <th className="text-right p-3">Variance</th>
                    <th className="text-right p-3">Funding</th>
                  </tr>
                </thead>
                <tbody>
                  {data.unitSummary.map((u) => (
                    <tr key={u.unit} className="border-t border-border/30">
                      <td className="p-3">{u.unit}</td>
                      <td className="p-3 text-right">{formatCurrency(u.budget)}</td>
                      <td className="p-3 text-right">{formatCurrency(u.actual)}</td>
                      <td className="p-3 text-right">{formatCurrency(u.drawsApplied)}</td>
                      <td className="p-3 text-right">{formatCurrency(u.ownerCashApplied)}</td>
                      <td className="p-3 text-right">{formatCurrency(u.openCommitted)}</td>
                      <td className="p-3 text-right">{formatCurrency(u.variance)}</td>
                      <td className={`p-3 text-right ${u.fundingPosition < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatCurrency(u.fundingPosition)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data && data.ledger.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-heading text-base">Ledger detail</h2>
            <div className="glass-card rounded-xl overflow-x-auto">
              <table className="w-full text-xs font-body min-w-[800px]">
                <thead className="text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">Unit</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Scope</th>
                    <th className="text-right p-2">Budget</th>
                    <th className="text-right p-2">Actual</th>
                    <th className="text-right p-2">Draws</th>
                    <th className="text-right p-2">Open</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.map((r, i) => (
                    <tr key={i} className="border-t border-border/30 align-top">
                      <td className="p-2 whitespace-nowrap">{r.unit}</td>
                      <td className="p-2 whitespace-nowrap">{r.category}</td>
                      <td className="p-2">{r.scope}</td>
                      <td className="p-2 text-right">{formatCurrency(r.budget)}</td>
                      <td className="p-2 text-right">{formatCurrency(r.actual)}</td>
                      <td className="p-2 text-right">{formatCurrency(r.paidFromDraws)}</td>
                      <td className="p-2 text-right">{formatCurrency(r.openCommitted)}</td>
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
