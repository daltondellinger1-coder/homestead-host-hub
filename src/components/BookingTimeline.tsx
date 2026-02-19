import { useState, useMemo, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Home, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Unit, SOURCE_LABELS, STATUS_LABELS, Payment, PaymentStatus } from '@/types/property';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PaymentEvent {
  id: string;
  amount: number;
  date: string;
  status: PaymentStatus;
  note?: string;
  unitId: string;
  unitName: string;
  guestName: string;
}

interface BookingTimelineProps {
  units: Unit[];
  paymentEvents: PaymentEvent[];
  onMarkPaid?: (unitId: string, paymentId: string) => void;
}

interface BookingBar {
  guestName: string;
  source: string;
  checkIn: Date;
  checkOut: Date | null;
  isCurrent: boolean;
}

const CELL_WIDTH = 44;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

export default function BookingTimeline({ units, paymentEvents, onMarkPaid }: BookingTimelineProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const gridWidth = daysInMonth * CELL_WIDTH;

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDay = isCurrentMonth ? today.getDate() : null;

  const prevMonth = useCallback(() => setCurrentDate(new Date(year, month - 1, 1)), [year, month]);
  const nextMonth = useCallback(() => setCurrentDate(new Date(year, month + 1, 1)), [year, month]);
  const goToday = () => setCurrentDate(new Date());

  // Swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) prevMonth(); else nextMonth();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [prevMonth, nextMonth]);

  // Build booking bars + payments per unit
  const unitData = useMemo(() => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    return units.map(unit => {
      const bars: BookingBar[] = [];

      const addGuest = (g: { name: string; source: string; checkIn: string; checkOut: string }, isCurrent: boolean) => {
        const ci = new Date(g.checkIn + 'T00:00:00');
        const co = g.checkOut ? new Date(g.checkOut + 'T00:00:00') : null;
        if (co && co < monthStart) return;
        if (ci > monthEnd) return;
        bars.push({ guestName: g.name, source: g.source, checkIn: ci, checkOut: co, isCurrent });
      };

      if (unit.currentGuest) addGuest(unit.currentGuest, true);
      unit.futureGuests.forEach(fg => addGuest(fg, false));

      // Payments for this unit in this month
      const unitPayments = paymentEvents.filter(p => {
        if (p.unitId !== unit.id) return false;
        const d = new Date(p.date + 'T00:00:00');
        return d.getFullYear() === year && d.getMonth() === month;
      });

      // Group payments by day
      const paymentsByDay = new Map<number, PaymentEvent[]>();
      unitPayments.forEach(p => {
        const day = new Date(p.date + 'T00:00:00').getDate();
        const list = paymentsByDay.get(day) ?? [];
        list.push(p);
        paymentsByDay.set(day, list);
      });

      return { unit, bars, paymentsByDay };
    });
  }, [units, paymentEvents, year, month]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dayOfWeek = (d: number) => new Date(year, month, d).getDay();
  const isWeekend = (d: number) => { const dow = dayOfWeek(d); return dow === 0 || dow === 6; };

  const getBarStyle = (bar: BookingBar) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month, daysInMonth);

    const startDate = bar.checkIn < monthStart ? monthStart : bar.checkIn;
    const endDate = bar.checkOut
      ? (bar.checkOut > monthEnd ? new Date(year, month, daysInMonth + 1) : bar.checkOut)
      : new Date(year, month, daysInMonth + 1);

    const startDay = startDate.getDate();
    const endDay = endDate > monthEnd ? daysInMonth + 1 : endDate.getDate();

    const left = (startDay - 1) * CELL_WIDTH;
    const width = Math.max((endDay - startDay) * CELL_WIDTH, CELL_WIDTH);

    const startsBeforeMonth = bar.checkIn < monthStart;
    const endsAfterMonth = !bar.checkOut || bar.checkOut > monthEnd;

    return {
      left,
      width: Math.min(width, gridWidth - left), // clamp to grid
      startsBeforeMonth,
      endsAfterMonth,
    };
  };

  const barRowHeight = 28;
  const paymentRowHeight = 28;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navigation */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={prevMonth} className="h-9 w-9 p-0 rounded-lg">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="font-heading text-lg sm:text-xl font-semibold min-w-[160px] sm:min-w-[200px] text-center">
              {monthLabel}
            </h2>
            <Button variant="ghost" size="sm" onClick={nextMonth} className="h-9 w-9 p-0 rounded-lg">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToday} className="font-body text-xs h-8 px-3">
            Today
          </Button>
        </div>

        {/* Legend */}
        <div className="px-4 sm:px-5 py-2 border-b border-border/30 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-body text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-8 rounded-sm bg-secondary/70" /> Current Guest
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-8 rounded-sm bg-muted/60 border border-border/40" /> Future Booking
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full bg-success/80" /> Paid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full bg-secondary ring-1 ring-secondary/50" /> Due
          </span>
        </div>
      </div>

      {/* Unit timeline cards */}
      <div className="space-y-2.5">
        {unitData.map(({ unit, bars, paymentsByDay }) => {
          const hasPayments = paymentsByDay.size > 0;
          const totalRows = Math.max(bars.length, 1);
          const barsHeight = totalRows * barRowHeight + 8;
          const paymentsHeight = hasPayments ? paymentRowHeight + 4 : 0;
          const contentHeight = barsHeight + paymentsHeight;

          return (
            <div key={unit.id} className="glass-card rounded-xl overflow-hidden">
              {/* Unit header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                <div className="p-1.5 rounded-lg bg-secondary/15 shrink-0">
                  <Home className="h-4 w-4 text-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-sm font-semibold truncate">{unit.name}</h3>
                  <p className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">
                    {STATUS_LABELS[unit.status]}
                    {unit.currentGuest && <span className="text-secondary"> · {unit.currentGuest.name}</span>}
                  </p>
                </div>
                {bars.length === 0 && !hasPayments && (
                  <span className="text-[10px] font-body text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    No activity
                  </span>
                )}
              </div>

              {/* Scrollable timeline */}
              <div className="overflow-x-auto">
                <div style={{ width: `${gridWidth}px` }}>
                  {/* Day headers */}
                  <div className="flex border-b border-border/20">
                    {days.map(d => (
                      <div
                        key={d}
                        className={cn(
                          'flex flex-col items-center justify-center shrink-0 py-1',
                          isWeekend(d) && 'bg-muted/20',
                          todayDay === d && 'bg-secondary/10',
                        )}
                        style={{ width: `${CELL_WIDTH}px` }}
                      >
                        <span className={cn(
                          'text-[9px] font-body text-muted-foreground',
                          todayDay === d && 'text-secondary font-bold'
                        )}>
                          {['S','M','T','W','T','F','S'][dayOfWeek(d)]}
                        </span>
                        <span className={cn(
                          'text-[11px] font-body leading-none',
                          todayDay === d
                            ? 'bg-secondary text-secondary-foreground rounded-full h-5 w-5 flex items-center justify-center font-bold'
                            : 'text-muted-foreground'
                        )}>
                          {d}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Content area: bars + payments */}
                  <div style={{ height: `${contentHeight}px`, position: 'relative', width: `${gridWidth}px` }}>
                    {/* Grid columns background */}
                    {days.map(d => (
                      <div
                        key={d}
                        className={cn(
                          'absolute top-0 bottom-0 border-r border-border/10',
                          isWeekend(d) && 'bg-muted/10',
                        )}
                        style={{ left: `${(d - 1) * CELL_WIDTH}px`, width: `${CELL_WIDTH}px` }}
                      />
                    ))}

                    {/* Today line */}
                    {todayDay && (
                      <div
                        className="absolute top-0 bottom-0 w-[2px] bg-secondary/50 z-10 pointer-events-none"
                        style={{ left: `${(todayDay - 1) * CELL_WIDTH + CELL_WIDTH / 2}px` }}
                      />
                    )}

                    {/* Booking bars */}
                    {bars.map((bar, idx) => {
                      const s = getBarStyle(bar);
                      return (
                        <div
                          key={`bar-${bar.guestName}-${idx}`}
                          className={cn(
                            'absolute flex items-center px-2.5 z-20 shadow-sm',
                            bar.isCurrent
                              ? 'bg-secondary/70 text-secondary-foreground'
                              : 'bg-muted/60 border border-border/40 text-foreground'
                          )}
                          style={{
                            left: `${s.left}px`,
                            width: `${s.width}px`,
                            top: `${idx * barRowHeight + 4}px`,
                            height: `${barRowHeight - 6}px`,
                            borderTopLeftRadius: s.startsBeforeMonth ? 0 : 6,
                            borderBottomLeftRadius: s.startsBeforeMonth ? 0 : 6,
                            borderTopRightRadius: s.endsAfterMonth ? 0 : 6,
                            borderBottomRightRadius: s.endsAfterMonth ? 0 : 6,
                          }}
                          title={`${bar.guestName} · ${SOURCE_LABELS[bar.source as keyof typeof SOURCE_LABELS] ?? bar.source}`}
                        >
                          <span className="text-[10px] font-body font-semibold truncate whitespace-nowrap">
                            {bar.guestName}
                          </span>
                        </div>
                      );
                    })}

                    {bars.length === 0 && !hasPayments && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-body text-muted-foreground/40">No bookings this month</span>
                      </div>
                    )}

                    {/* Payment markers row */}
                    {hasPayments && (
                      <>
                        {/* Separator line */}
                        <div
                          className="absolute left-0 right-0 border-t border-border/20"
                          style={{ top: `${barsHeight - 2}px` }}
                        />
                        {days.map(d => {
                          const dayPayments = paymentsByDay.get(d);
                          if (!dayPayments) return null;

                          const allPaid = dayPayments.every(p => p.status === 'paid');
                          const totalAmount = dayPayments.reduce((s, p) => s + p.amount, 0);

                          return (
                            <div
                              key={`pay-${d}`}
                              className={cn(
                                'absolute z-20 flex flex-col items-center justify-center cursor-pointer group',
                              )}
                              style={{
                                left: `${(d - 1) * CELL_WIDTH}px`,
                                width: `${CELL_WIDTH}px`,
                                top: `${barsHeight}px`,
                                height: `${paymentRowHeight}px`,
                              }}
                              onClick={() => {
                                if (onMarkPaid && !allPaid) {
                                  const unpaid = dayPayments.find(p => p.status !== 'paid');
                                  if (unpaid) onMarkPaid(unpaid.unitId, unpaid.id);
                                }
                              }}
                              title={`${formatCurrency(totalAmount)} · ${dayPayments.map(p => `${p.guestName} (${p.status})`).join(', ')}`}
                            >
                              <div className={cn(
                                'h-5 w-5 rounded-full flex items-center justify-center transition-transform group-hover:scale-110',
                                allPaid
                                  ? 'bg-success/20 text-success'
                                  : 'bg-secondary/20 text-secondary ring-1 ring-secondary/40'
                              )}>
                                <DollarSign className="h-3 w-3" />
                              </div>
                              <span className={cn(
                                'text-[8px] font-body font-semibold leading-none mt-0.5',
                                allPaid ? 'text-success/70' : 'text-secondary/80'
                              )}>
                                {formatCurrency(totalAmount)}
                              </span>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {units.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground font-body text-sm">No units yet. Add a unit to see the booking timeline.</p>
        </div>
      )}
    </motion.div>
  );
}
