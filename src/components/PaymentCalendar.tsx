import { useState, useMemo, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, LogIn, LogOut, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentStatus, BookingSource, SOURCE_LABELS } from '@/types/property';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentEvent {
  id: string;
  amount: number;
  date: string;
  status: PaymentStatus;
  note?: string;
  unitId: string;
  unitName: string;
  guestName: string;
  source: BookingSource;
}

interface BookingEvent {
  type: 'checkin' | 'checkout';
  date: string;
  unitId: string;
  unitName: string;
  guestName: string;
  source: BookingSource;
}

interface PaymentCalendarProps {
  events: PaymentEvent[];
  bookingEvents: BookingEvent[];
  onMarkPaid: (unitId: string, paymentId: string) => void;
}

type CalendarEvent =
  | { kind: 'payment'; data: PaymentEvent }
  | { kind: 'booking'; data: BookingEvent };

const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAYS_MED = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

export default function PaymentCalendar({ events, bookingEvents, onMarkPaid }: PaymentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = useCallback(() => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); }, [year, month]);
  const nextMonth = useCallback(() => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); }, [year, month]);
  const goToday = () => { setCurrentDate(new Date()); setSelectedDay(new Date().getDate()); };

  // Swipe gesture handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const swiped = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swiped.current = false;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || swiped.current) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const MIN_SWIPE = 50;
    // Only trigger if horizontal swipe is dominant
    if (Math.abs(dx) > MIN_SWIPE && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true;
      if (dx > 0) prevMonth();
      else nextMonth();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [prevMonth, nextMonth]);

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    const addToDay = (day: number, ev: CalendarEvent) => {
      if (!map[day]) map[day] = [];
      map[day].push(ev);
    };
    events.forEach(ev => {
      const d = new Date(ev.date + 'T00:00:00');
      if (d.getFullYear() === year && d.getMonth() === month) {
        addToDay(d.getDate(), { kind: 'payment', data: ev });
      }
    });
    bookingEvents.forEach(ev => {
      const d = new Date(ev.date + 'T00:00:00');
      if (d.getFullYear() === year && d.getMonth() === month) {
        addToDay(d.getDate(), { kind: 'booking', data: ev });
      }
    });
    Object.values(map).forEach(arr =>
      arr.sort((a, b) => {
        const order = { booking: 0, payment: 1 };
        return order[a.kind] - order[b.kind];
      })
    );
    return map;
  }, [events, bookingEvents, year, month]);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Monthly summary
  const monthPayments = events.filter(ev => {
    const d = new Date(ev.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const totalExpected = monthPayments.reduce((s, e) => s + e.amount, 0);
  const totalPaid = monthPayments.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const totalPending = monthPayments.filter(e => e.status !== 'paid').reduce((s, e) => s + e.amount, 0);
  const monthBookings = bookingEvents.filter(ev => {
    const d = new Date(ev.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const checkInCount = monthBookings.filter(b => b.type === 'checkin').length;
  const checkOutCount = monthBookings.filter(b => b.type === 'checkout').length;

  const selectedEvents = selectedDay ? eventsByDay[selectedDay] ?? [] : [];

  const getDots = (dayEvents: CalendarEvent[]) => {
    const hasCheckIn = dayEvents.some(e => e.kind === 'booking' && e.data.type === 'checkin');
    const hasCheckOut = dayEvents.some(e => e.kind === 'booking' && e.data.type === 'checkout');
    const hasPaidPayment = dayEvents.some(e => e.kind === 'payment' && e.data.status === 'paid');
    const hasUnpaidPayment = dayEvents.some(e => e.kind === 'payment' && e.data.status !== 'paid');
    return { hasCheckIn, hasCheckOut, hasPaidPayment, hasUnpaidPayment };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="glass-card rounded-xl px-3.5 py-3 sm:p-4">
          <p className="text-[10px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-body mb-0.5">Expected</p>
          <p className="text-base sm:text-lg font-heading font-semibold">{formatCurrency(totalExpected)}</p>
        </div>
        <div className="glass-card rounded-xl px-3.5 py-3 sm:p-4">
          <p className="text-[10px] sm:text-[10px] uppercase tracking-wider text-success font-body mb-0.5">Collected</p>
          <p className="text-base sm:text-lg font-heading font-semibold text-success">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="glass-card rounded-xl px-3.5 py-3 sm:p-4">
          <p className="text-[10px] sm:text-[10px] uppercase tracking-wider text-secondary font-body mb-0.5">Pending</p>
          <p className="text-base sm:text-lg font-heading font-semibold text-secondary">{formatCurrency(totalPending)}</p>
        </div>
        <div className="glass-card rounded-xl px-3.5 py-3 sm:p-4">
          <p className="text-[10px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-body mb-0.5">Activity</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-sm font-body text-success">
              <LogIn className="h-3.5 w-3.5" />{checkInCount}
            </span>
            <span className="flex items-center gap-1 text-sm font-body text-destructive">
              <LogOut className="h-3.5 w-3.5" />{checkOutCount}
            </span>
          </div>
        </div>
      </div>

      <div
        className="glass-card rounded-xl overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation */}
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

        {/* Compact legend */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-border/30 flex items-center gap-4 sm:gap-5 text-xs font-body text-muted-foreground overflow-x-auto">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-full bg-success" /> Check-in
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Check-out
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-full bg-success/50" /> Paid
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-full bg-secondary" /> Due
          </span>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border/50">
          {DAYS_SHORT.map((d, i) => (
            <div key={`${d}-${i}`} className="text-center text-xs font-semibold text-muted-foreground py-2.5 font-body">
              <span className="sm:hidden">{d}</span>
              <span className="hidden sm:inline">{DAYS_MED[i]}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dayEvents = day ? eventsByDay[day] ?? [] : [];
            const dots = day ? getDots(dayEvents) : null;
            const isSelected = day === selectedDay;
            const hasDots = dots && (dots.hasCheckIn || dots.hasCheckOut || dots.hasPaidPayment || dots.hasUnpaidPayment);

            return (
              <div
                key={i}
                onClick={() => day && dayEvents.length > 0 && setSelectedDay(isSelected ? null : day)}
                className={`
                  min-h-[88px] sm:min-h-[110px] border-b border-r border-border/20 p-1.5 sm:p-2 transition-all relative
                  ${day === null ? 'bg-muted/10' : ''}
                  ${isSelected ? 'bg-secondary/10 ring-1 ring-secondary/40 z-10' : ''}
                  ${day && dayEvents.length > 0 && !isSelected ? 'cursor-pointer hover:bg-muted/30' : ''}
                `}
              >
                {day !== null && (
                  <div className="flex flex-col h-full">
                    {/* Day number */}
                    <div className="flex items-start justify-between">
                      {isToday(day) ? (
                        <span className="font-bold text-xs sm:text-sm text-background bg-secondary rounded-full h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center font-body">
                          {day}
                        </span>
                      ) : (
                        <span className={`text-sm sm:text-sm font-body leading-none pl-0.5 pt-0.5 ${hasDots ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                          {day}
                        </span>
                      )}
                    </div>

                    {/* Event indicators - mobile: dots + pills, desktop: tags */}
                    {hasDots && (
                      <>
                        {/* Mobile: colored dots under the number */}
                        <div className="flex items-center gap-1.5 mt-1.5 sm:hidden flex-wrap">
                          {dots.hasCheckIn && (
                            <span className="h-2 w-2 rounded-full bg-success ring-1 ring-success/30" />
                          )}
                          {dots.hasCheckOut && (
                            <span className="h-2 w-2 rounded-full bg-destructive ring-1 ring-destructive/30" />
                          )}
                          {dots.hasPaidPayment && (
                            <span className="h-2 w-2 rounded-full bg-success/50" />
                          )}
                          {dots.hasUnpaidPayment && (
                            <span className="h-2 w-2 rounded-full bg-secondary ring-1 ring-secondary/30" />
                          )}
                        </div>

                        {/* Mobile: compact event pills */}
                        <div className="flex flex-col gap-0.5 mt-1 sm:hidden">
                          {dayEvents.slice(0, 2).map((ev, idx) => {
                            if (ev.kind === 'booking') {
                              const b = ev.data;
                              const isCheckIn = b.type === 'checkin';
                              return (
                                <div
                                  key={`mb-${idx}`}
                                  className={`rounded px-1 py-0.5 text-[11px] font-body font-semibold truncate leading-tight ${
                                    isCheckIn
                                      ? 'bg-success/15 text-success'
                                      : 'bg-destructive/15 text-destructive'
                                  }`}
                                >
                                  {isCheckIn ? '→' : '←'} {b.unitName}
                                </div>
                              );
                            }
                            const p = ev.data;
                            return (
                              <div
                                key={`mp-${idx}`}
                                className={`rounded px-1 py-0.5 text-[11px] font-body font-semibold truncate leading-tight ${
                                  p.status === 'paid'
                                    ? 'bg-success/15 text-success'
                                    : 'bg-secondary/15 text-secondary'
                                }`}
                              >
                                {p.unitName}
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <span className="text-[10px] text-muted-foreground pl-0.5 font-medium">+{dayEvents.length - 2}</span>
                          )}
                        </div>

                        {/* Desktop: full event tags */}
                        <div className="hidden sm:flex flex-col gap-1 mt-1.5">
                          {dayEvents.slice(0, 3).map((ev, idx) => {
                            if (ev.kind === 'booking') {
                              const b = ev.data;
                              const isCheckIn = b.type === 'checkin';
                              return (
                                <div
                                  key={`db-${idx}`}
                                  className={`rounded-md px-2 py-1 text-[11px] font-body leading-tight truncate ${
                                    isCheckIn
                                      ? 'bg-success/12 text-success'
                                      : 'bg-destructive/12 text-destructive'
                                  }`}
                                  title={`${isCheckIn ? 'Check-in' : 'Check-out'}: ${b.guestName} (${b.unitName})`}
                                >
                                  {isCheckIn ? <LogIn className="h-3 w-3 inline mr-1" /> : <LogOut className="h-3 w-3 inline mr-1" />}
                                  <span className="font-medium">{b.unitName}</span>
                                  <span className="text-[10px] ml-1 opacity-70">{b.guestName}</span>
                                </div>
                              );
                            }
                            const p = ev.data;
                            return (
                              <button
                                key={p.id}
                                onClick={e => {
                                  e.stopPropagation();
                                  if (p.status !== 'paid') onMarkPaid(p.unitId, p.id);
                                }}
                                className={`w-full text-left rounded-md px-2 py-1 text-[11px] font-body leading-tight truncate transition-colors ${
                                  p.status === 'paid'
                                    ? 'bg-success/15 text-success cursor-default'
                                    : 'bg-secondary/15 text-secondary hover:bg-secondary/25 cursor-pointer'
                                }`}
                                title={`${p.unitName} · ${p.guestName} · ${formatCurrency(p.amount)}${p.status !== 'paid' ? ' (click to mark paid)' : ''}`}
                              >
                                <span className="font-medium">{p.unitName}</span>{' '}
                                <span>{formatCurrency(p.amount)}</span>
                              </button>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <span className="text-[10px] font-body text-muted-foreground pl-1">+{dayEvents.length - 3} more</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail panel */}
      <AnimatePresence>
        {selectedDay !== null && selectedEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="glass-card rounded-xl p-4 sm:p-5"
          >
            <h3 className="font-heading text-base font-semibold mb-3">
              {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <div className="space-y-2.5">
              {selectedEvents.map((ev, idx) => {
                if (ev.kind === 'booking') {
                  const b = ev.data;
                  const isCheckIn = b.type === 'checkin';
                  return (
                    <div
                      key={`detail-b-${idx}`}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 font-body ${
                        isCheckIn ? 'bg-success/8' : 'bg-destructive/8'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${isCheckIn ? 'bg-success/15' : 'bg-destructive/15'}`}>
                        {isCheckIn ? (
                          <LogIn className="h-4 w-4 text-success" />
                        ) : (
                          <LogOut className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{isCheckIn ? 'Check-in' : 'Check-out'}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{b.guestName} · {b.unitName} · {SOURCE_LABELS[b.source]}</p>
                      </div>
                    </div>
                  );
                }
                const p = ev.data;
                return (
                  <div
                    key={`detail-p-${p.id}`}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 font-body ${
                      p.status === 'paid' ? 'bg-success/8' : 'bg-secondary/8'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${p.status === 'paid' ? 'bg-success/15' : 'bg-secondary/15'}`}>
                      <DollarSign className={`h-4 w-4 ${p.status === 'paid' ? 'text-success' : 'text-secondary'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {p.unitName} · {formatCurrency(p.amount)}
                        <span className={`ml-2 text-xs capitalize ${p.status === 'paid' ? 'text-success' : 'text-secondary'}`}>
                          {p.status}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{p.guestName} · {SOURCE_LABELS[p.source]}{p.note ? ` · ${p.note}` : ''}</p>
                    </div>
                    {p.status !== 'paid' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-body shrink-0 px-3"
                        onClick={() => onMarkPaid(p.unitId, p.id)}
                      >
                        Mark Paid
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
