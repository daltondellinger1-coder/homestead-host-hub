import { useState, useMemo } from 'react';
import { Search, X, BedDouble, Building, TreePine, CalendarDays, UserPlus, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Unit, UnitType, UNIT_TYPE_LABELS } from '@/types/property';
import { format, parseISO, isBefore, isAfter, differenceInCalendarDays } from 'date-fns';

interface AvailabilitySearchProps {
  units: Unit[];
  onViewUnit?: (unitId: string, checkInDate: string) => void;
  onBookUnit?: (unitId: string, checkIn: string, checkOut: string) => void;
}

const TYPE_ICONS: Record<UnitType, typeof BedDouble> = {
  '1br': BedDouble,
  '2br': Building,
  cottage: TreePine,
};

interface BookingInfo {
  start: Date;
  end: Date;
  name: string;
  startStr: string;
  endStr: string;
}

interface AvailableUnit {
  unit: Unit;
  status: 'vacant' | 'gap';
  before?: { name: string; checkOut: string } | null;
  after?: { name: string; checkIn: string } | null;
  nights: number;
  estimatedRevenue: number;
}

export default function AvailabilitySearch({ units, onViewUnit, onBookUnit }: AvailabilitySearchProps) {
  const [open, setOpen] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const results = useMemo(() => {
    if (!checkIn || !checkOut) return null;

    const reqStart = parseISO(checkIn);
    const reqEnd = parseISO(checkOut);
    if (isBefore(reqEnd, reqStart)) return null;

    const nights = differenceInCalendarDays(reqEnd, reqStart);
    if (nights <= 0) return null;

    const eligible = units.filter(u => !['planning', 'storage'].includes(u.status));
    const available: AvailableUnit[] = [];

    for (const unit of eligible) {
      const bookings: BookingInfo[] = [];

      if (unit.currentGuest) {
        bookings.push({
          start: parseISO(unit.currentGuest.checkIn),
          end: unit.currentGuest.checkOut ? parseISO(unit.currentGuest.checkOut) : new Date('2099-12-31'),
          name: unit.currentGuest.name,
          startStr: unit.currentGuest.checkIn,
          endStr: unit.currentGuest.checkOut || '',
        });
      }

      for (const fg of unit.futureGuests) {
        bookings.push({
          start: parseISO(fg.checkIn),
          end: fg.checkOut ? parseISO(fg.checkOut) : new Date('2099-12-31'),
          name: fg.name,
          startStr: fg.checkIn,
          endStr: fg.checkOut || '',
        });
      }

      // Sort bookings by start date
      bookings.sort((a, b) => a.start.getTime() - b.start.getTime());

      const hasConflict = bookings.some(b =>
        isBefore(b.start, reqEnd) && isAfter(b.end, reqStart)
      );

      if (!hasConflict) {
        // Find the booking right before and right after the requested range
        const before = bookings
          .filter(b => !isAfter(b.end, reqStart))
          .pop();
        const after = bookings
          .filter(b => !isBefore(b.start, reqEnd))
          .shift();

        const dailyRate = unit.currentGuest?.monthlyRate
          ? unit.currentGuest.monthlyRate / 30
          : (unit.futureGuests[0]?.monthlyRate || 0) / 30;
        const estimatedRevenue = Math.round(dailyRate * nights);

        available.push({
          unit,
          status: !unit.currentGuest && unit.status === 'vacant' ? 'vacant' : 'gap',
          before: before ? { name: before.name, checkOut: before.endStr } : null,
          after: after ? { name: after.name, checkIn: after.startStr } : null,
          nights,
          estimatedRevenue,
        });
      }
    }

    const grouped: Record<UnitType, AvailableUnit[]> = { '1br': [], '2br': [], cottage: [] };
    for (const a of available) {
      grouped[a.unit.unitType].push(a);
    }

    return { grouped, nights };
  }, [checkIn, checkOut, units]);

  const totalAvailable = results ? Object.values(results.grouped).flat().length : 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="w-full font-body text-xs gap-2 border-dashed border-secondary/30 hover:border-secondary/60 hover:bg-secondary/5"
      >
        <Search className="h-3.5 w-3.5" />
        {open ? 'Close Search' : 'Find Available Units by Date'}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-lg p-3 sm:p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Check-in</Label>
                  <Input
                    type="date"
                    value={checkIn}
                    onChange={e => {
                      setCheckIn(e.target.value);
                      if (checkOut && e.target.value && checkOut <= e.target.value) {
                        setCheckOut('');
                      }
                    }}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Check-out</Label>
                  <Input
                    type="date"
                    value={checkOut}
                    min={checkIn || undefined}
                    onChange={e => setCheckOut(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {checkIn && checkOut && results && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-body text-muted-foreground">
                        {format(parseISO(checkIn), 'MMM d')} → {format(parseISO(checkOut), 'MMM d, yyyy')}
                      </p>
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                        <Moon className="h-2.5 w-2.5" />
                        {results.nights} night{results.nights !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className={`text-xs font-heading font-semibold ${totalAvailable > 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                      {totalAvailable} available
                    </span>
                  </div>

                  {totalAvailable === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3 font-body">
                      No units available for these dates
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {(['1br', '2br', 'cottage'] as UnitType[]).map(type => {
                        const typeResults = results.grouped[type];
                        if (typeResults.length === 0) return null;
                        const Icon = TYPE_ICONS[type];
                        return (
                          <div key={type} className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5 text-secondary" />
                              <span className="text-[11px] font-body text-muted-foreground font-medium">
                                {UNIT_TYPE_LABELS[type]} ({typeResults.length})
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {typeResults.map(({ unit, status, before, after, nights, estimatedRevenue }) => (
                                <div
                                  key={unit.id}
                                  className="rounded-md bg-muted/40 px-3 py-2 border border-border/30 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-heading font-semibold">{unit.name}</p>
                                    {estimatedRevenue > 0 && (
                                      <span className="text-[10px] font-body text-secondary font-medium">
                                        ~{formatCurrency(estimatedRevenue)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Context: who's before and after */}
                                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                                    {status === 'vacant' && !before && !after && (
                                      <p className="text-emerald-400">Vacant now — no bookings</p>
                                    )}
                                    {before && (
                                      <p>
                                        ← {before.name} checks out{' '}
                                        {before.checkOut ? format(parseISO(before.checkOut), 'MMM d') : '(no date)'}
                                      </p>
                                    )}
                                    {!before && status === 'vacant' && after && (
                                      <p className="text-emerald-400">Vacant now</p>
                                    )}
                                    {after && (
                                      <p>
                                        → {after.name} checks in{' '}
                                        {format(parseISO(after.checkIn), 'MMM d')}
                                      </p>
                                    )}
                                  </div>

                                  {/* Action buttons */}
                                  <div className="flex gap-1.5 pt-0.5">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                                      onClick={() => onViewUnit?.(unit.id, checkIn)}
                                    >
                                      <CalendarDays className="h-3 w-3" />
                                      View Calendar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-[10px] text-secondary hover:text-secondary gap-1"
                                      onClick={() => onBookUnit?.(unit.id, checkIn, checkOut)}
                                    >
                                      <UserPlus className="h-3 w-3" />
                                      Book
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => { setCheckIn(''); setCheckOut(''); }}
                  >
                    <X className="h-3 w-3 mr-1" /> Clear Search
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
