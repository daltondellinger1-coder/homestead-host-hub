import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePropertyData } from '@/hooks/usePropertyData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, DollarSign, Home, Target, Save, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isWithinInterval, parseISO } from 'date-fns';

interface RevenueTarget {
  id: string;
  unit_id: string;
  monthly_target: number;
}

interface ManagementFee {
  id: string;
  month: string;
  gross_collected: number;
  fee_percentage: number;
  fee_amount: number;
  notes: string | null;
  created_at: string;
}

export default function ManagementDashboard() {
  const { units, allPaymentEvents, allBookingEvents } = usePropertyData();
  const [selectedMonth, setSelectedMonth] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [revenueTargets, setRevenueTargets] = useState<RevenueTarget[]>([]);
  const [feeRecord, setFeeRecord] = useState<ManagementFee | null>(null);
  const [feePercentage, setFeePercentage] = useState('5');
  const [feeNotes, setFeeNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const monthStart = useMemo(() => parseISO(selectedMonth), [selectedMonth]);
  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);
  const monthLabel = useMemo(() => format(monthStart, 'MMMM yyyy'), [monthStart]);
  const daysInMonth = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }).length, [monthStart, monthEnd]);

  // Fetch revenue targets and fee record
  useEffect(() => {
    const fetchData = async () => {
      const [targetsRes, feeRes] = await Promise.all([
        supabase.from('revenue_targets').select('*'),
        supabase.from('management_fees').select('*').eq('month', selectedMonth).maybeSingle(),
      ]);
      if (targetsRes.data) setRevenueTargets(targetsRes.data as unknown as RevenueTarget[]);
      if (feeRes.data) {
        const fee = feeRes.data as unknown as ManagementFee;
        setFeeRecord(fee);
        setFeePercentage(String(fee.fee_percentage));
        setFeeNotes(fee.notes ?? '');
      } else {
        setFeeRecord(null);
        setFeePercentage('5');
        setFeeNotes('');
      }
    };
    fetchData();
  }, [selectedMonth]);

  // Monthly collected revenue (paid payments in selected month)
  const monthPayments = useMemo(() => {
    const start = format(monthStart, 'yyyy-MM-dd');
    const end = format(monthEnd, 'yyyy-MM-dd');
    return allPaymentEvents.filter(p => p.status === 'paid' && p.date >= start && p.date <= end);
  }, [allPaymentEvents, monthStart, monthEnd]);

  const grossCollected = useMemo(() => monthPayments.reduce((s, p) => s + p.amount, 0), [monthPayments]);

  // Per-unit breakdown
  const unitBreakdown = useMemo(() => {
    return units.map(unit => {
      const target = revenueTargets.find(t => t.unit_id === unit.id);
      const collected = monthPayments.filter(p => p.unitId === unit.id).reduce((s, p) => s + p.amount, 0);
      const allUnitPayments = allPaymentEvents.filter(p => p.unitId === unit.id && p.date >= format(monthStart, 'yyyy-MM-dd') && p.date <= format(monthEnd, 'yyyy-MM-dd'));
      const expected = allUnitPayments.reduce((s, p) => s + p.amount, 0);

      // Occupancy: count days with an active guest
      let occupiedDays = 0;
      const allGuests = [
        ...(unit.currentGuest ? [unit.currentGuest] : []),
        ...unit.futureGuests,
      ];
      for (let d = 0; d < daysInMonth; d++) {
        const day = new Date(monthStart.getTime() + d * 86400000);
        const dayStr = format(day, 'yyyy-MM-dd');
        const hasGuest = allGuests.some(g => {
          const checkIn = g.checkIn;
          const checkOut = g.checkOut || '9999-12-31';
          return dayStr >= checkIn && dayStr < checkOut;
        });
        if (hasGuest) occupiedDays++;
      }
      const occupancyPct = Math.round((occupiedDays / daysInMonth) * 100);

      return {
        id: unit.id,
        name: unit.name,
        target: target?.monthly_target ?? null,
        collected,
        expected,
        occupiedDays,
        occupancyPct,
        status: unit.status,
      };
    });
  }, [units, revenueTargets, monthPayments, allPaymentEvents, monthStart, monthEnd, daysInMonth]);

  // Overall stats
  const totalTarget = useMemo(() => unitBreakdown.reduce((s, u) => s + (u.target ?? 0), 0), [unitBreakdown]);
  const totalExpected = useMemo(() => unitBreakdown.reduce((s, u) => s + u.expected, 0), [unitBreakdown]);
  const unitsWithTargets = unitBreakdown.filter(u => u.target !== null);
  const overallOccupancy = useMemo(() => {
    if (units.length === 0) return 0;
    const totalOccupied = unitBreakdown.reduce((s, u) => s + u.occupiedDays, 0);
    return Math.round((totalOccupied / (units.length * daysInMonth)) * 100);
  }, [unitBreakdown, units.length, daysInMonth]);

  const calculatedFee = useMemo(() => {
    const pct = parseFloat(feePercentage) || 0;
    return Math.round(grossCollected * (pct / 100));
  }, [grossCollected, feePercentage]);

  const saveFeeRecord = useCallback(async () => {
    setSaving(true);
    const pct = parseFloat(feePercentage) || 0;
    const data = {
      month: selectedMonth,
      gross_collected: grossCollected,
      fee_percentage: pct,
      fee_amount: calculatedFee,
      notes: feeNotes || null,
    };

    if (feeRecord) {
      await supabase.from('management_fees').update(data).eq('id', feeRecord.id);
    } else {
      await supabase.from('management_fees').insert(data);
    }
    toast.success(`Management fee for ${monthLabel} saved`);
    // Refresh
    const { data: updated } = await supabase.from('management_fees').select('*').eq('month', selectedMonth).maybeSingle();
    if (updated) {
      setFeeRecord(updated as unknown as ManagementFee);
    }
    setSaving(false);
  }, [feeRecord, selectedMonth, grossCollected, feePercentage, calculatedFee, feeNotes, monthLabel]);

  const navigateMonth = (dir: 'prev' | 'next') => {
    const fn = dir === 'prev' ? subMonths : addMonths;
    setSelectedMonth(format(fn(monthStart, 1), 'yyyy-MM-dd'));
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  const occupancyColor = (pct: number) => {
    if (pct >= 85) return 'text-[hsl(var(--success))]';
    if (pct >= 60) return 'text-[hsl(var(--warning))]';
    return 'text-[hsl(var(--destructive))]';
  };

  const revenueColor = (collected: number, target: number | null) => {
    if (!target) return '';
    const ratio = collected / target;
    if (ratio >= 1) return 'text-[hsl(var(--success))]';
    if (ratio >= 0.75) return 'text-[hsl(var(--warning))]';
    return 'text-[hsl(var(--destructive))]';
  };

  return (
    <div className="space-y-5">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => navigateMonth('prev')} className="font-body">
          <ChevronLeft className="h-4 w-4 mr-1" />Prev
        </Button>
        <h2 className="text-lg font-heading font-bold">{monthLabel}</h2>
        <Button size="sm" variant="ghost" onClick={() => navigateMonth('next')} className="font-body">
          Next<ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body mb-1">
            <DollarSign className="h-3.5 w-3.5" />
            <span>Gross Collected</span>
          </div>
          <p className="text-xl font-heading font-bold">{fmt(grossCollected)}</p>
          {totalTarget > 0 && (
            <p className={`text-[10px] font-body mt-1 ${revenueColor(grossCollected, totalTarget)}`}>
              {Math.round((grossCollected / totalTarget) * 100)}% of {fmt(totalTarget)} target
            </p>
          )}
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body mb-1">
            <Home className="h-3.5 w-3.5" />
            <span>Occupancy</span>
          </div>
          <p className={`text-xl font-heading font-bold ${occupancyColor(overallOccupancy)}`}>{overallOccupancy}%</p>
          <p className="text-[10px] font-body text-muted-foreground mt-1">Target: 85–90%</p>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body mb-1">
            <Target className="h-3.5 w-3.5" />
            <span>Management Fee</span>
          </div>
          <p className="text-xl font-heading font-bold text-[hsl(var(--secondary))]">{fmt(calculatedFee)}</p>
          <p className="text-[10px] font-body text-muted-foreground mt-1">{feePercentage}% of {fmt(grossCollected)}</p>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Outstanding</span>
          </div>
          <p className="text-xl font-heading font-bold text-[hsl(var(--warning))]">{fmt(totalExpected - grossCollected)}</p>
          <p className="text-[10px] font-body text-muted-foreground mt-1">Expected: {fmt(totalExpected)}</p>
        </div>
      </div>

      {/* Fee Calculator */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-heading font-semibold">Management Fee — {monthLabel}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs font-body text-muted-foreground mb-1 block">Fee Tier</label>
            <Select value={feePercentage} onValueChange={setFeePercentage}>
              <SelectTrigger className="h-9 text-xs font-body"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0% — Major failures</SelectItem>
                <SelectItem value="3">3% — Minor KPI misses</SelectItem>
                <SelectItem value="4">4% — Minor KPI misses</SelectItem>
                <SelectItem value="5">5% — All KPIs met</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground mb-1 block">Calculated Fee</label>
            <div className="h-9 px-3 rounded-md border border-input bg-muted/30 flex items-center text-sm font-heading font-bold">
              {fmt(calculatedFee)}
            </div>
          </div>
          <Button size="sm" onClick={saveFeeRecord} disabled={saving} className="h-9 font-body text-xs">
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {feeRecord ? 'Update' : 'Save'} Fee Record
          </Button>
        </div>
        <div>
          <label className="text-xs font-body text-muted-foreground mb-1 block">Notes</label>
          <Textarea
            value={feeNotes}
            onChange={e => setFeeNotes(e.target.value)}
            placeholder="Performance notes for this month..."
            className="text-xs font-body min-h-[60px]"
          />
        </div>
        {feeRecord && (
          <Badge variant="secondary" className="text-[10px] font-body">
            Last saved: {new Date(feeRecord.created_at ?? '').toLocaleDateString()}
          </Badge>
        )}
      </div>

      {/* Per-Unit Breakdown Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 pb-2">
          <h3 className="text-sm font-heading font-semibold">Unit Performance — {monthLabel}</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-body">Unit</TableHead>
              <TableHead className="text-xs font-body text-right">Target</TableHead>
              <TableHead className="text-xs font-body text-right">Collected</TableHead>
              <TableHead className="text-xs font-body text-right">% of Target</TableHead>
              <TableHead className="text-xs font-body text-right">Occupancy</TableHead>
              <TableHead className="text-xs font-body hidden sm:table-cell">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unitBreakdown.map(u => {
              const pctTarget = u.target ? Math.round((u.collected / u.target) * 100) : null;
              return (
                <TableRow key={u.id}>
                  <TableCell className="text-xs font-body font-medium">{u.name}</TableCell>
                  <TableCell className="text-xs font-body text-right tabular-nums">{u.target ? fmt(u.target) : '—'}</TableCell>
                  <TableCell className={`text-xs font-body text-right tabular-nums font-medium ${revenueColor(u.collected, u.target)}`}>
                    {fmt(u.collected)}
                  </TableCell>
                  <TableCell className={`text-xs font-body text-right tabular-nums ${u.target ? revenueColor(u.collected, u.target) : ''}`}>
                    {pctTarget !== null ? `${pctTarget}%` : '—'}
                  </TableCell>
                  <TableCell className={`text-xs font-body text-right tabular-nums ${occupancyColor(u.occupancyPct)}`}>
                    {u.occupancyPct}%
                    <span className="text-muted-foreground ml-1">({u.occupiedDays}d)</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-[10px] font-body capitalize">{u.status}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {/* Totals row */}
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell className="text-xs font-body font-bold">Total</TableCell>
              <TableCell className="text-xs font-body text-right tabular-nums font-bold">{fmt(totalTarget)}</TableCell>
              <TableCell className={`text-xs font-body text-right tabular-nums font-bold ${revenueColor(grossCollected, totalTarget)}`}>
                {fmt(grossCollected)}
              </TableCell>
              <TableCell className={`text-xs font-body text-right tabular-nums font-bold ${totalTarget ? revenueColor(grossCollected, totalTarget) : ''}`}>
                {totalTarget ? `${Math.round((grossCollected / totalTarget) * 100)}%` : '—'}
              </TableCell>
              <TableCell className={`text-xs font-body text-right tabular-nums font-bold ${occupancyColor(overallOccupancy)}`}>
                {overallOccupancy}%
              </TableCell>
              <TableCell className="hidden sm:table-cell" />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
