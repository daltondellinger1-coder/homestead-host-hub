import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePropertyData } from '@/hooks/usePropertyData';
import { SOURCE_LABELS, BookingSource } from '@/types/property';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mountain, ArrowLeft, TrendingUp, PieChart as PieIcon, BarChart3, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SOURCE_COLORS: Record<string, string> = {
  airbnb: 'hsl(0, 85%, 60%)',
  furnished_finder: 'hsl(200, 70%, 55%)',
  direct: 'hsl(38, 60%, 55%)',
  long_term: 'hsl(152, 55%, 40%)',
  lease: 'hsl(270, 50%, 55%)',
  other: 'hsl(215, 15%, 55%)',
};

const STATUS_COLORS = {
  paid: 'hsl(152, 55%, 40%)',
  upcoming: 'hsl(38, 60%, 55%)',
  pending: 'hsl(38, 92%, 50%)',
  overdue: 'hsl(0, 72%, 51%)',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

type YearOption = number | 'all';

export default function FinancialReports() {
  const { allPaymentEvents, loading } = usePropertyData();
  const [selectedYear, setSelectedYear] = useState<YearOption>(2026);

  // Available years from payment data
  const years = useMemo(() => {
    const ySet = new Set<number>();
    allPaymentEvents.forEach(e => {
      const y = new Date(e.date + 'T00:00:00').getFullYear();
      ySet.add(y);
    });
    return Array.from(ySet).sort((a, b) => b - a);
  }, [allPaymentEvents]);

  // Filtered events
  const filtered = useMemo(() => {
    if (selectedYear === 'all') return allPaymentEvents;
    return allPaymentEvents.filter(e => new Date(e.date + 'T00:00:00').getFullYear() === selectedYear);
  }, [allPaymentEvents, selectedYear]);

  const paidEvents = useMemo(() => filtered.filter(e => e.status === 'paid'), [filtered]);

  // Monthly income data (bar chart)
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; paid: number; upcoming: number; sortKey: string }>();

    filtered.forEach(e => {
      const d = new Date(e.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = selectedYear === 'all'
        ? `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
        : MONTH_NAMES[d.getMonth()];

      if (!map.has(key)) map.set(key, { month: label, paid: 0, upcoming: 0, sortKey: key });
      const entry = map.get(key)!;
      if (e.status === 'paid') entry.paid += e.amount;
      else entry.upcoming += e.amount;
    });

    return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filtered, selectedYear]);

  // Income by source (pie chart)
  const sourceData = useMemo(() => {
    const map = new Map<BookingSource, number>();
    paidEvents.forEach(e => {
      map.set(e.source, (map.get(e.source) ?? 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([source, value]) => ({
        name: SOURCE_LABELS[source],
        value,
        source,
        color: SOURCE_COLORS[source] ?? SOURCE_COLORS.other,
      }))
      .sort((a, b) => b.value - a.value);
  }, [paidEvents]);

  // Income by unit (horizontal bar)
  const unitData = useMemo(() => {
    const map = new Map<string, number>();
    paidEvents.forEach(e => {
      map.set(e.unitName, (map.get(e.unitName) ?? 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([unit, total]) => ({ unit, total }))
      .sort((a, b) => b.total - a.total);
  }, [paidEvents]);

  // Summary stats
  const totalCollected = paidEvents.reduce((s, e) => s + e.amount, 0);
  const totalExpected = filtered.reduce((s, e) => s + e.amount, 0);
  const totalOutstanding = totalExpected - totalCollected;
  const avgMonthly = monthlyData.length > 0
    ? monthlyData.reduce((s, m) => s + m.paid, 0) / monthlyData.filter(m => m.paid > 0).length
    : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card rounded-lg px-4 py-3 border border-border/60 shadow-xl text-xs font-body">
        <p className="font-heading font-semibold text-sm mb-1.5">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground capitalize">{entry.name}:</span>
            <span className="font-medium">{fmtFull(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
      <div className="glass-card rounded-lg px-4 py-3 border border-border/60 shadow-xl text-xs font-body">
        <p className="font-heading font-semibold text-sm">{d.name}</p>
        <p className="text-muted-foreground mt-0.5">{fmtFull(d.value)}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen pattern-bg">
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 z-10" style={{ background: 'linear-gradient(180deg, hsl(222 47% 10%), hsl(222 47% 8%))' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted/50 -ml-2">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-secondary/15">
                <Mountain className="h-5 w-5 text-secondary" />
              </div>
              <h1 className="text-lg font-heading font-bold tracking-tight text-foreground">Financial Reports</h1>
            </div>
          </div>
          <Select
            value={String(selectedYear)}
            onValueChange={v => setSelectedYear(v === 'all' ? 'all' : parseInt(v))}
          >
            <SelectTrigger className="w-[120px] h-9 text-xs font-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-muted-foreground font-body text-sm animate-pulse">Loading financial data...</div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: DollarSign, label: 'Total Collected', value: fmtFull(totalCollected), color: 'text-[hsl(var(--success))]' },
                { icon: TrendingUp, label: 'Total Expected', value: fmtFull(totalExpected), color: 'text-foreground' },
                { icon: BarChart3, label: 'Outstanding', value: fmtFull(totalOutstanding), color: totalOutstanding > 0 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--success))]' },
                { icon: PieIcon, label: 'Avg Monthly Income', value: fmt(avgMonthly), color: 'text-secondary' },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="glass-card stat-glow rounded-lg p-4 flex items-start gap-3"
                >
                  <div className="p-2 rounded-md bg-secondary/10">
                    <card.icon className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-body">{card.label}</p>
                    <p className={`text-xl font-heading font-semibold mt-0.5 ${card.color}`}>{card.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Monthly Income Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="glass-card rounded-xl p-5"
            >
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="h-4 w-4 text-secondary" />
                <h2 className="font-heading text-base font-semibold">Monthly Income</h2>
              </div>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={monthlyData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: 'hsl(215 15% 55%)', fontSize: 11, fontFamily: 'DM Sans' }}
                      axisLine={{ stroke: 'hsl(222 30% 16%)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'hsl(215 15% 55%)', fontSize: 11, fontFamily: 'DM Sans' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => fmt(v)}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(222 30% 14% / 0.5)' }} />
                    <Bar dataKey="paid" name="Collected" fill="hsl(152, 55%, 40%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="upcoming" name="Upcoming" fill="hsl(38, 60%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground font-body">
                  No payment data for this period
                </div>
              )}
            </motion.div>

            {/* Source + Unit breakdown row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income by Source Pie */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="glass-card rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-5">
                  <PieIcon className="h-4 w-4 text-secondary" />
                  <h2 className="font-heading text-base font-semibold">Income by Source</h2>
                </div>
                {sourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="hsl(222 47% 7%)"
                        strokeWidth={2}
                      >
                        {sourceData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend
                        formatter={(value: string) => (
                          <span className="text-xs font-body text-muted-foreground">{value}</span>
                        )}
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground font-body">
                    No collected payments yet
                  </div>
                )}

                {/* Source breakdown list */}
                {sourceData.length > 0 && (
                  <div className="mt-4 space-y-1.5 border-t border-border/50 pt-4">
                    {sourceData.map(s => (
                      <div key={s.source} className="flex items-center justify-between text-xs font-body">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <span>{s.name}</span>
                        </div>
                        <span className="font-medium tabular-nums">{fmtFull(s.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Income by Unit */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="glass-card rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="h-4 w-4 text-secondary" />
                  <h2 className="font-heading text-base font-semibold">Income by Unit</h2>
                </div>
                {unitData.length > 0 ? (
                  <div className="space-y-2.5">
                    {unitData.map((u, i) => {
                      const maxVal = unitData[0]?.total ?? 1;
                      const pct = (u.total / maxVal) * 100;
                      return (
                        <motion.div
                          key={u.unit}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.4 + i * 0.03 }}
                        >
                          <div className="flex items-center justify-between text-xs font-body mb-1">
                            <span className="font-medium">{u.unit}</span>
                            <span className="tabular-nums text-muted-foreground">{fmtFull(u.total)}</span>
                          </div>
                          <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: `linear-gradient(90deg, hsl(38, 60%, 55%), hsl(32, 55%, 45%))`,
                              }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground font-body">
                    No collected payments yet
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
