import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaymentStatus, BookingSource, SOURCE_LABELS } from '@/types/property';
import { motion } from 'framer-motion';

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

interface PaymentCalendarProps {
  events: PaymentEvent[];
  onMarkPaid: (unitId: string, paymentId: string) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

export default function PaymentCalendar({ events, onMarkPaid }: PaymentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const eventsByDay = useMemo(() => {
    const map: Record<number, PaymentEvent[]> = {};
    events.forEach(ev => {
      const d = new Date(ev.date + 'T00:00:00');
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(ev);
      }
    });
    return map;
  }, [events, year, month]);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Summary for the month
  const monthEvents = events.filter(ev => {
    const d = new Date(ev.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const totalExpected = monthEvents.reduce((s, e) => s + e.amount, 0);
  const totalPaid = monthEvents.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const totalPending = monthEvents.filter(e => e.status !== 'paid').reduce((s, e) => s + e.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-heading text-lg font-semibold min-w-[180px] text-center">{monthLabel}</h2>
          <Button variant="ghost" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} className="font-body text-xs h-7 ml-2">
            Today
          </Button>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs font-body">
          <span className="text-muted-foreground">Expected: <span className="font-semibold text-foreground">{formatCurrency(totalExpected)}</span></span>
          <span className="text-success">Paid: <span className="font-semibold">{formatCurrency(totalPaid)}</span></span>
          {totalPending > 0 && (
            <span className="text-secondary">Pending: <span className="font-semibold">{formatCurrency(totalPending)}</span></span>
          )}
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border/50">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-2 font-body">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const dayEvents = day ? eventsByDay[day] ?? [] : [];
          return (
            <div
              key={i}
              className={`min-h-[90px] border-b border-r border-border/30 p-1.5 ${
                day === null ? 'bg-muted/30' : ''
              } ${isToday(day ?? 0) ? 'bg-secondary/8' : ''}`}
            >
              {day !== null && (
                <>
                  <span className={`text-xs font-body ${isToday(day) ? 'font-bold text-secondary' : 'text-muted-foreground'}`}>
                    {day}
                  </span>
                  <div className="space-y-0.5 mt-0.5">
                    {dayEvents.map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => ev.status !== 'paid' ? onMarkPaid(ev.unitId, ev.id) : undefined}
                        className={`w-full text-left rounded px-1.5 py-0.5 text-[10px] font-body leading-tight truncate transition-colors ${
                          ev.status === 'paid'
                            ? 'bg-success/15 text-success cursor-default'
                            : 'bg-secondary/15 text-secondary hover:bg-secondary/25 cursor-pointer'
                        }`}
                        title={`${ev.unitName} · ${ev.guestName} · ${formatCurrency(ev.amount)}${ev.status !== 'paid' ? ' (click to mark paid)' : ''}`}
                      >
                        <span className="font-medium">{ev.unitName}</span> {formatCurrency(ev.amount)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile summary */}
      <div className="sm:hidden px-5 py-3 border-t border-border/50 flex items-center gap-4 text-xs font-body">
        <span className="text-muted-foreground">Expected: <span className="font-semibold text-foreground">{formatCurrency(totalExpected)}</span></span>
        <span className="text-success">Paid: <span className="font-semibold">{formatCurrency(totalPaid)}</span></span>
      </div>
    </motion.div>
  );
}
