import { useState, useMemo } from 'react';
import { usePropertyData } from '@/hooks/usePropertyData';
import { SOURCE_LABELS, BookingSource } from '@/types/property';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TrendingUp, TrendingDown, PieChart as PieIcon, BarChart3, DollarSign, CalendarIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

type FilterMode = 'month' | 'year' | 'custom' | 'all';

export default function FinancialReportsContent() {
  const { allPaymentEvents, loading } = usePropertyData();

  const [filterMode, setFilterMode] = useState<FilterMode>('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);

  const years = useMemo(() => {
    const ySet = new Set<number>();
    allPaymentEvents.forEach(e => {
      const y = new Date(e.date + 'T00:00:00').getFullYear();
      ySet.add(y);
    });
    const currentYear = new Date().getFullYear();
    ySet.add(currentYear);
    return Array.from(ySet).sort((a, b) => b - a);
  }, [allPaymentEvents]);

  const filterLabel = useMemo(() => {
    switch (filterMode) {
      case 'all': return 'All Time';
      case 'year': return String(selectedYear);
      case 'month': return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
      case 'custom':
        if (customFrom && customTo) return `${format(customFrom, 'MMM d')} – ${format(customTo, 'MMM d, yyyy')}`;
        if (customFrom) return `From ${format(customFrom, 'MMM d, yyyy')}`;
        return 'Custom Range';
    }
  }, [filterMode, selectedYear, selectedMonth, customFrom, customTo]);

  const filtered = useMemo(() => {
    return allPaymentEvents.filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      switch (filterMode) {
        case 'all': return true;
        case 'year': return d.getFullYear() === selectedYear;
        case 'month': return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
        case 'custom': {
          if (customFrom && d < customFrom) return false;
          if (customTo) {
            const endOfDay = new Date(customTo);
            endOfDay.setHours(23, 59, 59, 999);
            if (d > endOfDay) return false;
          }
          return true;
        }
      }
    });
  }, [allPaymentEvents, filterMode, selectedYear, selectedMonth, customFrom, customTo]);

  // Compute the previous period for comparison
  const previousPeriodFiltered = useMemo(() => {
    return allPaymentEvents.filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      switch (filterMode) {
        case 'all': return false; // no comparison for all time
        case 'year': return d.getFullYear() === selectedYear - 1;
        case 'month': {
          const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
          const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
          return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
        }
        case 'custom': {
          if (!customFrom || !customTo) return false;
          const durationMs = customTo.getTime() - customFrom.getTime();
          const prevFrom = new Date(customFrom.getTime() - durationMs - 86400000);
          const prevTo = new Date(customFrom.getTime() - 86400000);
          return d >= prevFrom && d <= prevTo;
        }
      }
    });
  }, [allPaymentEvents, filterMode, selectedYear, selectedMonth, customFrom, customTo]);

  const previousPeriodLabel = useMemo(() => {
    switch (filterMode) {
      case 'all': return '';
      case 'year': return String(selectedYear - 1);
      case 'month': {
        const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
        return `${MONTH_NAMES[prevMonth]} ${prevYear}`;
      }
      case 'custom': return 'previous period';
    }
  }, [filterMode, selectedYear, selectedMonth]);

  const prevPaidEvents = useMemo(() => previousPeriodFiltered.filter(e => e.status === 'paid'), [previousPeriodFiltered]);

  const paidEvents = useMemo(() => filtered.filter(e => e.status === 'paid'), [filtered]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; paid: number; upcoming: number; sortKey: string }>();
    filtered.forEach(e => {
      const d = new Date(e.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = filterMode === 'month'
        ? `Week ${Math.ceil(d.getDate() / 7)}`
        : filterMode === 'all' || filterMode === 'custom'
        ? `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
        : MONTH_NAMES[d.getMonth()];
      if (!map.has(key)) map.set(key, { month: label, paid: 0, upcoming: 0, sortKey: key });
      const entry = map.get(key)!;
      if (e.status === 'paid') entry.paid += e.amount;
      else entry.upcoming += e.amount;
    });
    return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filtered, filterMode]);

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

  const unitData = useMemo(() => {
    const map = new Map<string, number>();
    paidEvents.forEach(e => {
      map.set(e.unitName, (map.get(e.unitName) ?? 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([unit, total]) => ({ unit, total }))
      .sort((a, b) => b.total - a.total);
  }, [paidEvents]);

  const totalCollected = paidEvents.reduce((s, e) => s + e.amount, 0);
  const totalExpected = filtered.reduce((s, e) => s + e.amount, 0);
  const totalOutstanding = totalExpected - totalCollected;
  const paidMonthsWithData = monthlyData.filter(m => m.paid > 0);
  const avgMonthly = paidMonthsWithData.length > 0
    ? paidMonthsWithData.reduce((s, m) => s + m.paid, 0) / paidMonthsWithData.length
    : 0;

  // Previous period stats
  const prevCollected = prevPaidEvents.reduce((s, e) => s + e.amount, 0);
  const prevExpected = previousPeriodFiltered.reduce((s, e) => s + e.amount, 0);
  const prevOutstanding = prevExpected - prevCollected;
  const prevMonthlyMap = new Map<string, number>();
  previousPeriodFiltered.filter(e => e.status === 'paid').forEach(e => {
    const d = new Date(e.date + 'T00:00:00');
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    prevMonthlyMap.set(key, (prevMonthlyMap.get(key) ?? 0) + e.amount);
  });
  const prevAvgMonthly = prevMonthlyMap.size > 0
    ? Array.from(prevMonthlyMap.values()).reduce((s, v) => s + v, 0) / prevMonthlyMap.size
    : 0;

  const hasPrevPeriod = filterMode !== 'all' && previousPeriodFiltered.length > 0;

  const pctChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const ChangeIndicator = ({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) => {
    if (!hasPrevPeriod) return null;
    const change = pctChange(current, previous);
    if (Math.abs(change) < 0.5) {
      return (
        <span className="flex items-center gap-0.5 text-[10px] font-body text-muted-foreground">
          <Minus className="h-3 w-3" /> 0%
        </span>
      );
    }
    const isPositive = change > 0;
    // For "outstanding", going up is bad (invert)
    const isGood = invert ? !isPositive : isPositive;
    return (
      <span className={cn(
        'flex items-center gap-0.5 text-[10px] font-body font-semibold',
        isGood ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'
      )}>
        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(change).toFixed(0)}%
      </span>
    );
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground font-body text-sm animate-pulse">Loading financial data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Mode selector */}
        <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
          {(['month', 'year', 'custom', 'all'] as FilterMode[]).map(mode => (
            <Button
              key={mode}
              size="sm"
              variant="ghost"
              className={cn(
                'h-8 px-3 font-body text-xs capitalize transition-colors',
                filterMode === mode
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
              )}
              onClick={() => setFilterMode(mode)}
            >
              {mode === 'all' ? 'All Time' : mode}
            </Button>
          ))}
        </div>

        {/* Year picker (for month and year modes) */}
        {(filterMode === 'year' || filterMode === 'month') && (
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[90px] h-9 text-xs font-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Month picker */}
        {filterMode === 'month' && (
          <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[100px] h-9 text-xs font-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Custom date range */}
        {filterMode === 'custom' && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-9 text-xs font-body gap-1.5', !customFrom && 'text-muted-foreground')}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {customFrom ? format(customFrom, 'MMM d, yyyy') : 'Start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-9 text-xs font-body gap-1.5', !customTo && 'text-muted-foreground')}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {customTo ? format(customTo, 'MMM d, yyyy') : 'End date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Period label */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-xs text-muted-foreground font-body">Showing: <span className="text-foreground font-medium">{filterLabel}</span></p>
        {hasPrevPeriod && (
          <p className="text-[10px] text-muted-foreground/70 font-body">vs {previousPeriodLabel}</p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { icon: DollarSign, label: 'Collected', value: fmtFull(totalCollected), color: 'text-[hsl(var(--success))]', current: totalCollected, previous: prevCollected, invert: false },
          { icon: TrendingUp, label: 'Expected', value: fmtFull(totalExpected), color: 'text-foreground', current: totalExpected, previous: prevExpected, invert: false },
          { icon: BarChart3, label: 'Outstanding', value: fmtFull(totalOutstanding), color: totalOutstanding > 0 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--success))]', current: totalOutstanding, previous: prevOutstanding, invert: true },
          { icon: PieIcon, label: 'Avg Monthly', value: fmt(avgMonthly), color: 'text-secondary', current: avgMonthly, previous: prevAvgMonthly, invert: false },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="glass-card stat-glow rounded-lg p-3 sm:p-4"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-md bg-secondary/10 shrink-0">
                <card.icon className="h-3.5 w-3.5 text-secondary" />
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground font-body truncate">{card.label}</p>
            </div>
            <div className="min-w-0">
              <p className={`text-sm sm:text-lg font-heading font-semibold truncate ${card.color}`}>{card.value}</p>
              {hasPrevPeriod && (
                <div className="flex items-center gap-1.5 mt-1">
                  <ChangeIndicator current={card.current} previous={card.previous} invert={card.invert} />
                  <span className="text-[9px] text-muted-foreground/60 font-body truncate">
                    vs {card.label === 'Avg Monthly' ? fmt(card.previous) : fmtFull(card.previous)}
                  </span>
                </div>
              )}
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
              <XAxis dataKey="month" tick={{ fill: 'hsl(215 15% 55%)', fontSize: 11, fontFamily: 'DM Sans' }} axisLine={{ stroke: 'hsl(222 30% 16%)' }} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215 15% 55%)', fontSize: 11, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(222 30% 14% / 0.5)' }} />
              <Bar dataKey="paid" name="Collected" fill="hsl(152, 55%, 40%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="upcoming" name="Upcoming" fill="hsl(38, 60%, 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground font-body">No payment data for this period</div>
        )}
      </motion.div>

      {/* Source + Unit breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <PieIcon className="h-4 w-4 text-secondary" />
            <h2 className="font-heading text-base font-semibold">Income by Source</h2>
          </div>
          {sourceData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={3} dataKey="value" stroke="hsl(222 47% 7%)" strokeWidth={2}>
                    {sourceData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend formatter={(value: string) => (<span className="text-xs font-body text-muted-foreground">{value}</span>)} iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
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
            </>
          ) : (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground font-body">No collected payments yet</div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }} className="glass-card rounded-xl p-5">
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
                  <motion.div key={u.unit} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.4 + i * 0.03 }}>
                    <div className="flex items-center justify-between text-xs font-body mb-1">
                      <span className="font-medium">{u.unit}</span>
                      <span className="tabular-nums text-muted-foreground">{fmtFull(u.total)}</span>
                    </div>
                    <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, hsl(38, 60%, 55%), hsl(32, 55%, 45%))` }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground font-body">No collected payments yet</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
