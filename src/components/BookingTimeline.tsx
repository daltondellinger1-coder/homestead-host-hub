import { useState, useMemo, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Unit, SOURCE_LABELS, STATUS_LABELS } from '@/types/property';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BookingTimelineProps {
  units: Unit[];
}

interface BookingBar {
  guestName: string;
  source: string;
  checkIn: Date;
  checkOut: Date | null;
  isCurrent: boolean;
}

const CELL_WIDTH = 40; // px per day

export default function BookingTimeline({ units }: BookingTimelineProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
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

  // Build booking bars per unit
  const unitBookings = useMemo(() => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    return units.map(unit => {
      const bars: BookingBar[] = [];

      const addGuest = (g: { name: string; source: string; checkIn: string; checkOut: string }, isCurrent: boolean) => {
        const ci = new Date(g.checkIn + 'T00:00:00');
        const co = g.checkOut ? new Date(g.checkOut + 'T00:00:00') : null;

        // Check overlap with this month
        if (co && co < monthStart) return;
        if (ci > monthEnd) return;

        bars.push({
          guestName: g.name,
          source: g.source,
          checkIn: ci,
          checkOut: co,
          isCurrent,
        });
      };

      if (unit.currentGuest) addGuest(unit.currentGuest, true);
      unit.futureGuests.forEach(fg => addGuest(fg, false));

      return { unit, bars };
    });
  }, [units, year, month]);

  // Day numbers header
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dayOfWeek = (d: number) => new Date(year, month, d).getDay();
  const isWeekend = (d: number) => { const dow = dayOfWeek(d); return dow === 0 || dow === 6; };

  const getBarStyle = (bar: BookingBar) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month, daysInMonth);

    const startDate = bar.checkIn < monthStart ? monthStart : bar.checkIn;
    const endDate = bar.checkOut
      ? (bar.checkOut > monthEnd ? new Date(year, month, daysInMonth + 1) : bar.checkOut)
      : new Date(year, month, daysInMonth + 1); // open-ended goes to end of month

    const startDay = startDate.getDate();
    const endDay = endDate > monthEnd
      ? daysInMonth + 1
      : endDate.getDate();

    const left = (startDay - 1) * CELL_WIDTH;
    const width = (endDay - startDay) * CELL_WIDTH;

    const startsBeforeMonth = bar.checkIn < monthStart;
    const endsAfterMonth = !bar.checkOut || bar.checkOut > monthEnd;

    return {
      left: `${left}px`,
      width: `${Math.max(width, CELL_WIDTH)}px`,
      borderTopLeftRadius: startsBeforeMonth ? '0' : '6px',
      borderBottomLeftRadius: startsBeforeMonth ? '0' : '6px',
      borderTopRightRadius: endsAfterMonth ? '0' : '6px',
      borderBottomRightRadius: endsAfterMonth ? '0' : '6px',
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
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
        <div className="px-4 sm:px-5 py-2 border-b border-border/30 flex items-center gap-4 text-xs font-body text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-8 rounded bg-secondary/70" /> Current Guest
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-8 rounded bg-primary border border-border/50" /> Future Booking
          </span>
        </div>
      </div>

      {/* Timeline rows */}
      <div className="space-y-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {unitBookings.map(({ unit, bars }) => (
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
                  {unit.currentGuest && ` · ${unit.currentGuest.name}`}
                </p>
              </div>
              {bars.length === 0 && (
                <span className="text-[10px] font-body text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  No bookings
                </span>
              )}
            </div>

            {/* Timeline grid */}
            <div className="overflow-x-auto" ref={scrollContainerRef}>
              <div className="relative" style={{ width: `${daysInMonth * CELL_WIDTH}px`, minHeight: '60px' }}>
                {/* Day columns header */}
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
                        'text-[11px] font-body',
                        todayDay === d
                          ? 'bg-secondary text-secondary-foreground rounded-full h-5 w-5 flex items-center justify-center font-bold'
                          : 'text-muted-foreground'
                      )}>
                        {d}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Booking bars */}
                <div className="relative" style={{ minHeight: bars.length > 0 ? `${bars.length * 32 + 8}px` : '32px' }}>
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex">
                    {days.map(d => (
                      <div
                        key={d}
                        className={cn(
                          'shrink-0 border-r border-border/10 h-full',
                          isWeekend(d) && 'bg-muted/10',
                        )}
                        style={{ width: `${CELL_WIDTH}px` }}
                      />
                    ))}
                  </div>

                  {/* Today indicator */}
                  {todayDay && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-secondary/60 z-10"
                      style={{ left: `${(todayDay - 1) * CELL_WIDTH + CELL_WIDTH / 2}px` }}
                    />
                  )}

                  {/* Bars */}
                  {bars.map((bar, idx) => {
                    const style = getBarStyle(bar);
                    return (
                      <div
                        key={`${bar.guestName}-${idx}`}
                        className={cn(
                          'absolute h-6 flex items-center px-2 z-20 transition-colors',
                          bar.isCurrent
                            ? 'bg-secondary/70 text-secondary-foreground'
                            : 'bg-primary border border-border/50 text-foreground'
                        )}
                        style={{
                          ...style,
                          top: `${idx * 32 + 4}px`,
                        }}
                        title={`${bar.guestName} · ${SOURCE_LABELS[bar.source as keyof typeof SOURCE_LABELS] ?? bar.source}`}
                      >
                        <span className="text-[10px] font-body font-medium truncate">
                          {bar.guestName}
                        </span>
                      </div>
                    );
                  })}

                  {/* Empty state */}
                  {bars.length === 0 && (
                    <div className="flex items-center justify-center h-8">
                      <span className="text-[10px] font-body text-muted-foreground/50">—</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {units.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground font-body text-sm">No units yet. Add a unit to see the booking timeline.</p>
        </div>
      )}
    </motion.div>
  );
}
