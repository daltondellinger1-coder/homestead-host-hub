import { useState, useMemo } from 'react';
import { Search, X, BedDouble, Building, TreePine, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Unit, UnitType, UNIT_TYPE_LABELS } from '@/types/property';
import { format, parseISO, isWithinInterval, isBefore, isAfter } from 'date-fns';

interface AvailabilitySearchProps {
  units: Unit[];
  onViewUnit?: (unitType: UnitType) => void;
}

const TYPE_ICONS: Record<UnitType, typeof BedDouble> = {
  '1br': BedDouble,
  '2br': Building,
  cottage: TreePine,
};

interface AvailableUnit {
  unit: Unit;
  status: 'vacant' | 'gap';
  gapNote?: string;
}

export default function AvailabilitySearch({ units, onViewUnit }: AvailabilitySearchProps) {
  const [open, setOpen] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const results = useMemo(() => {
    if (!checkIn || !checkOut) return null;

    const reqStart = parseISO(checkIn);
    const reqEnd = parseISO(checkOut);
    if (isBefore(reqEnd, reqStart)) return null;

    const eligible = units.filter(u => !['planning', 'storage'].includes(u.status));

    const available: AvailableUnit[] = [];

    for (const unit of eligible) {
      // Collect all guest bookings (current + future)
      const bookings: { start: Date; end: Date; name: string }[] = [];

      if (unit.currentGuest) {
        bookings.push({
          start: parseISO(unit.currentGuest.checkIn),
          end: unit.currentGuest.checkOut ? parseISO(unit.currentGuest.checkOut) : new Date('2099-12-31'),
          name: unit.currentGuest.name,
        });
      }

      for (const fg of unit.futureGuests) {
        bookings.push({
          start: parseISO(fg.checkIn),
          end: fg.checkOut ? parseISO(fg.checkOut) : new Date('2099-12-31'),
          name: fg.name,
        });
      }

      // Check if requested range overlaps with any booking
      const hasConflict = bookings.some(b => {
        // Overlap: booking starts before request ends AND booking ends after request starts
        return isBefore(b.start, reqEnd) && isAfter(b.end, reqStart);
      });

      if (!hasConflict) {
        if (!unit.currentGuest && unit.status === 'vacant') {
          available.push({ unit, status: 'vacant' });
        } else {
          // It's a gap between bookings
          available.push({
            unit,
            status: 'gap',
            gapNote: unit.currentGuest
              ? `After ${unit.currentGuest.name} checks out ${unit.currentGuest.checkOut ? format(parseISO(unit.currentGuest.checkOut), 'MMM d') : ''}`
              : 'Available in gap between bookings',
          });
        }
      }
    }

    // Group by unit type
    const grouped: Record<UnitType, AvailableUnit[]> = { '1br': [], '2br': [], cottage: [] };
    for (const a of available) {
      grouped[a.unit.unitType].push(a);
    }

    return grouped;
  }, [checkIn, checkOut, units]);

  const totalAvailable = results ? Object.values(results).flat().length : 0;

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
                    onChange={e => setCheckIn(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Check-out</Label>
                  <Input
                    type="date"
                    value={checkOut}
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
                    <p className="text-xs font-body text-muted-foreground">
                      {format(parseISO(checkIn), 'MMM d')} → {format(parseISO(checkOut), 'MMM d, yyyy')}
                    </p>
                    <span className={`text-xs font-heading font-semibold ${totalAvailable > 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                      {totalAvailable} unit{totalAvailable !== 1 ? 's' : ''} available
                    </span>
                  </div>

                  {totalAvailable === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3 font-body">
                      No units available for these dates
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(['1br', '2br', 'cottage'] as UnitType[]).map(type => {
                        const typeResults = results[type];
                        if (typeResults.length === 0) return null;
                        const Icon = TYPE_ICONS[type];
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Icon className="h-3.5 w-3.5 text-secondary" />
                              <span className="text-[11px] font-body text-muted-foreground font-medium">
                                {UNIT_TYPE_LABELS[type]} ({typeResults.length})
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {typeResults.map(({ unit, status, gapNote }) => (
                                <div
                                  key={unit.id}
                                  className="rounded-md bg-muted/40 px-2.5 py-1.5 border border-border/30"
                                >
                                  <p className="text-xs font-heading font-semibold">{unit.name}</p>
                                  {status === 'vacant' ? (
                                    <p className="text-[10px] text-emerald-400">Vacant now</p>
                                  ) : (
                                    <p className="text-[10px] text-amber-400">{gapNote}</p>
                                  )}
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
