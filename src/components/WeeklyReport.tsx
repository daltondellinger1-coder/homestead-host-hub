import { useMemo } from 'react';
import { usePropertyData } from '@/hooks/usePropertyData';
import { SOURCE_LABELS } from '@/types/property';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, CalendarDays, AlertTriangle, Users, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, differenceInDays, isBefore, isAfter, parseISO } from 'date-fns';

export default function WeeklyReport() {
  const { units, allPaymentEvents } = usePropertyData();

  const today = useMemo(() => new Date(), []);
  const todayStr = format(today, 'yyyy-MM-dd');

  // Current week (Mon–Sun)
  const weekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const weekEnd = useMemo(() => endOfWeek(today, { weekStartsOn: 1 }), [today]);
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  // Next Friday
  const daysUntilFriday = (5 - today.getDay() + 7) % 7;
  const nextFriday = format(addDays(today, daysUntilFriday === 0 ? 0 : daysUntilFriday), 'EEEE, MMM d');

  // 30-day and 60-day outlook windows
  const day30 = format(addDays(today, 30), 'yyyy-MM-dd');
  const day60 = format(addDays(today, 60), 'yyyy-MM-dd');

  // === SECTION 1: This Week's Collected Revenue ===
  const weekPayments = useMemo(() => {
    return allPaymentEvents.filter(p => p.status === 'paid' && p.date >= weekStartStr && p.date <= weekEndStr);
  }, [allPaymentEvents, weekStartStr, weekEndStr]);

  const weekCollected = weekPayments.reduce((s, p) => s + p.amount, 0);

  // Group by unit
  const weekByUnit = useMemo(() => {
    const map = new Map<string, { unitName: string; total: number; payments: typeof weekPayments }>();
    for (const p of weekPayments) {
      const entry = map.get(p.unitId) ?? { unitName: p.unitName, total: 0, payments: [] };
      entry.total += p.amount;
      entry.payments.push(p);
      map.set(p.unitId, entry);
    }
    return [...map.entries()].sort((a, b) => a[1].unitName.localeCompare(b[1].unitName));
  }, [weekPayments]);

  // === SECTION 2: Upcoming Payments (rest of month) ===
  const upcomingPayments = useMemo(() => {
    return allPaymentEvents.filter(p =>
      (p.status === 'upcoming' || p.status === 'pending') && p.date > weekEndStr && p.date <= day30
    ).sort((a, b) => a.date.localeCompare(b.date));
  }, [allPaymentEvents, weekEndStr, day30]);

  const upcomingTotal = upcomingPayments.reduce((s, p) => s + p.amount, 0);

  // === SECTION 3: Overdue Payments ===
  const overduePayments = useMemo(() => {
    return allPaymentEvents.filter(p => p.status === 'overdue' || (p.status === 'pending' && p.date < todayStr));
  }, [allPaymentEvents, todayStr]);

  const overdueTotal = overduePayments.reduce((s, p) => s + p.amount, 0);

  // === SECTION 4: 30-60 Day Booking Outlook ===
  const bookingOutlook = useMemo(() => {
    return units.map(unit => {
      const allGuests = [
        ...(unit.currentGuest ? [{ ...unit.currentGuest, isFuture: false }] : []),
        ...unit.futureGuests.map(fg => ({ ...fg, isFuture: true })),
      ];

      // Find bookings active in the 30-day and 60-day windows
      const bookingsIn30 = allGuests.filter(g => {
        const checkOut = g.checkOut || '9999-12-31';
        return g.checkIn <= day30 && checkOut > todayStr;
      });

      const bookingsIn60 = allGuests.filter(g => {
        const checkOut = g.checkOut || '9999-12-31';
        return g.checkIn <= day60 && checkOut > todayStr;
      });

      // Calculate booked days in next 30 days
      let bookedDays30 = 0;
      for (let d = 0; d < 30; d++) {
        const dayStr = format(addDays(today, d), 'yyyy-MM-dd');
        const hasGuest = allGuests.some(g => {
          const checkOut = g.checkOut || '9999-12-31';
          return dayStr >= g.checkIn && dayStr < checkOut;
        });
        if (hasGuest) bookedDays30++;
      }

      // Find vacancy gaps in next 60 days
      const gaps: { from: string; to: string; days: number }[] = [];
      let gapStart: string | null = null;
      for (let d = 0; d <= 60; d++) {
        const dayStr = format(addDays(today, d), 'yyyy-MM-dd');
        const hasGuest = allGuests.some(g => {
          const checkOut = g.checkOut || '9999-12-31';
          return dayStr >= g.checkIn && dayStr < checkOut;
        });
        if (!hasGuest && !gapStart) {
          gapStart = dayStr;
        } else if (hasGuest && gapStart) {
          const gapDays = differenceInDays(parseISO(dayStr), parseISO(gapStart));
          if (gapDays >= 2) gaps.push({ from: gapStart, to: dayStr, days: gapDays });
          gapStart = null;
        }
      }
      if (gapStart) {
        const gapDays = differenceInDays(parseISO(day60), parseISO(gapStart));
        if (gapDays >= 2) gaps.push({ from: gapStart, to: day60, days: gapDays });
      }

      // Next checkout
      const nextCheckout = allGuests
        .filter(g => g.checkOut && g.checkOut >= todayStr)
        .sort((a, b) => (a.checkOut || '').localeCompare(b.checkOut || ''))[0];

      return {
        id: unit.id,
        name: unit.name,
        status: unit.status,
        currentGuest: unit.currentGuest?.name ?? null,
        bookedDays30,
        occupancy30: Math.round((bookedDays30 / 30) * 100),
        bookingsIn60: bookingsIn60.length,
        gaps,
        nextCheckout: nextCheckout?.checkOut ?? null,
        nextCheckoutGuest: nextCheckout?.name ?? null,
      };
    });
  }, [units, todayStr, day30, day60, today]);

  // Total vacancy gaps
  const totalGaps = bookingOutlook.reduce((s, u) => s + u.gaps.length, 0);
  const totalGapDays = bookingOutlook.reduce((s, u) => s + u.gaps.reduce((gs, g) => gs + g.days, 0), 0);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  const fmtDate = (iso: string) => format(parseISO(iso), 'MMM d');

  const occupancyColor = (pct: number) => {
    if (pct >= 85) return 'text-[hsl(var(--success))]';
    if (pct >= 60) return 'text-[hsl(var(--warning))]';
    return 'text-[hsl(var(--destructive))]';
  };

  return (
    <div className="space-y-5">
      {/* Report Header */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-heading font-bold">Weekly Report</h2>
            <p className="text-xs text-muted-foreground font-body mt-0.5">{weekLabel}</p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="text-[10px] font-body">
              <Clock className="h-3 w-3 mr-1" />Due: {nextFriday} by 10 AM
            </Badge>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body mb-1">
            <DollarSign className="h-3.5 w-3.5" />
            <span>Collected This Week</span>
          </div>
          <p className="text-xl font-heading font-bold text-[hsl(var(--success))]">{fmt(weekCollected)}</p>
          <p className="text-[10px] font-body text-muted-foreground mt-1">{weekPayments.length} payment{weekPayments.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body mb-1">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Upcoming (30 days)</span>
          </div>
          <p className="text-xl font-heading font-bold">{fmt(upcomingTotal)}</p>
          <p className="text-[10px] font-body text-muted-foreground mt-1">{upcomingPayments.length} pending</p>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body mb-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Overdue</span>
          </div>
          <p className={`text-xl font-heading font-bold ${overdueTotal > 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--success))]'}`}>
            {fmt(overdueTotal)}
          </p>
          <p className="text-[10px] font-body text-muted-foreground mt-1">{overduePayments.length} overdue</p>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body mb-1">
            <Users className="h-3.5 w-3.5" />
            <span>Vacancy Gaps</span>
          </div>
          <p className={`text-xl font-heading font-bold ${totalGaps > 0 ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--success))]'}`}>
            {totalGaps} gap{totalGaps !== 1 ? 's' : ''}
          </p>
          <p className="text-[10px] font-body text-muted-foreground mt-1">{totalGapDays} open days (60d)</p>
        </div>
      </div>

      {/* This Week's Collections */}
      {weekByUnit.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-heading font-semibold">Revenue Collected — {weekLabel}</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-body">Unit</TableHead>
                <TableHead className="text-xs font-body">Guest</TableHead>
                <TableHead className="text-xs font-body">Date</TableHead>
                <TableHead className="text-xs font-body text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekByUnit.flatMap(([unitId, data]) =>
                data.payments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-body font-medium">{p.unitName}</TableCell>
                    <TableCell className="text-xs font-body">{p.guestName}</TableCell>
                    <TableCell className="text-xs font-body">{fmtDate(p.date)}</TableCell>
                    <TableCell className="text-xs font-body text-right tabular-nums font-medium text-[hsl(var(--success))]">{fmt(p.amount)}</TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={3} className="text-xs font-body font-bold">Total</TableCell>
                <TableCell className="text-xs font-body text-right tabular-nums font-bold text-[hsl(var(--success))]">{fmt(weekCollected)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {weekByUnit.length === 0 && (
        <div className="glass-card rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground font-body">No payments collected this week yet.</p>
        </div>
      )}

      {/* 30-60 Day Booking Outlook & Vacancy Gaps */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 pb-2">
          <h3 className="text-sm font-heading font-semibold">Occupancy Outlook — Next 30–60 Days</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-body">Unit</TableHead>
              <TableHead className="text-xs font-body">Current Guest</TableHead>
              <TableHead className="text-xs font-body text-right">30d Occ.</TableHead>
              <TableHead className="text-xs font-body">Next Checkout</TableHead>
              <TableHead className="text-xs font-body">Vacancy Gaps</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookingOutlook.map(u => (
              <TableRow key={u.id}>
                <TableCell className="text-xs font-body font-medium">{u.name}</TableCell>
                <TableCell className="text-xs font-body">
                  {u.currentGuest ?? <span className="text-muted-foreground italic">Vacant</span>}
                </TableCell>
                <TableCell className={`text-xs font-body text-right tabular-nums font-medium ${occupancyColor(u.occupancy30)}`}>
                  {u.occupancy30}%
                </TableCell>
                <TableCell className="text-xs font-body">
                  {u.nextCheckout ? (
                    <span>
                      {fmtDate(u.nextCheckout)}
                      <span className="text-muted-foreground ml-1">({u.nextCheckoutGuest})</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs font-body">
                  {u.gaps.length === 0 ? (
                    <Badge variant="outline" className="text-[10px] font-body text-[hsl(var(--success))] border-[hsl(var(--success))]/30">No gaps</Badge>
                  ) : (
                    <div className="space-y-0.5">
                      {u.gaps.map((g, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] font-body text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30 mr-1">
                          {fmtDate(g.from)}–{fmtDate(g.to)} ({g.days}d)
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Risks & Issues */}
      {(overduePayments.length > 0 || bookingOutlook.some(u => u.gaps.length > 0)) && (
        <div className="glass-card rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-heading font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
            Risks & Action Items
          </h3>
          <ul className="space-y-1.5 text-xs font-body">
            {overduePayments.length > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-[hsl(var(--destructive))] mt-0.5">●</span>
                <span><strong>{overduePayments.length} overdue payment{overduePayments.length !== 1 ? 's' : ''}</strong> totaling {fmt(overdueTotal)} — follow up immediately</span>
              </li>
            )}
            {bookingOutlook.filter(u => u.gaps.length > 0).map(u => (
              <li key={u.id} className="flex items-start gap-2">
                <span className="text-[hsl(var(--warning))] mt-0.5">●</span>
                <span><strong>{u.name}</strong> has {u.gaps.length} vacancy gap{u.gaps.length !== 1 ? 's' : ''} — {u.gaps.map(g => `${fmtDate(g.from)}–${fmtDate(g.to)} (${g.days}d)`).join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
