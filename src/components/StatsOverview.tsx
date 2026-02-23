import { DollarSign, Home, BedDouble, Building, TreePine } from 'lucide-react';
import { motion } from 'framer-motion';
import { Unit, UnitType, UNIT_TYPE_LABELS, UNIT_TYPES } from '@/types/property';
import { format } from 'date-fns';

interface StatsOverviewProps {
  totalMonthlyIncome: number;
  occupiedCount: number;
  vacantCount: number;
  totalUnits: number;
  units: Unit[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const TYPE_ICONS: Record<UnitType, typeof BedDouble> = {
  '1br': BedDouble,
  '2br': Building,
  cottage: TreePine,
};

interface AvailabilityInfo {
  unitName: string | null;
  availableNow: boolean;
  opensDate: string | null;
  vacantCount: number;
  totalCount: number;
}

function getAvailability(units: Unit[], type: UnitType): AvailabilityInfo {
  const typed = units.filter(u => u.unitType === type && !['planning', 'storage'].includes(u.status));
  const vacant = typed.filter(u => u.status === 'vacant');
  
  if (vacant.length > 0) {
    return {
      unitName: vacant[0].name,
      availableNow: true,
      opensDate: null,
      vacantCount: vacant.length,
      totalCount: typed.length,
    };
  }

  // Find soonest checkout among occupied/rented
  const withCheckout = typed
    .filter(u => u.currentGuest?.checkOut)
    .sort((a, b) => (a.currentGuest!.checkOut).localeCompare(b.currentGuest!.checkOut));

  if (withCheckout.length > 0) {
    return {
      unitName: withCheckout[0].name,
      availableNow: false,
      opensDate: withCheckout[0].currentGuest!.checkOut,
      vacantCount: 0,
      totalCount: typed.length,
    };
  }

  return {
    unitName: null,
    availableNow: false,
    opensDate: null,
    vacantCount: 0,
    totalCount: typed.length,
  };
}

export default function StatsOverview({ totalMonthlyIncome, occupiedCount, vacantCount, totalUnits, units }: StatsOverviewProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Next Available Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {UNIT_TYPES.map((type, i) => {
          const info = getAvailability(units, type);
          const Icon = TYPE_ICONS[type];
          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="glass-card rounded-lg p-2.5 sm:p-3.5"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className="h-3.5 w-3.5 text-secondary shrink-0" />
                <p className="text-[10px] sm:text-xs font-body text-muted-foreground truncate">{UNIT_TYPE_LABELS[type]}</p>
              </div>
              {info.totalCount === 0 ? (
                <p className="text-[10px] sm:text-xs text-muted-foreground italic">No units</p>
              ) : info.availableNow ? (
                <>
                  <p className="text-xs sm:text-sm font-heading font-semibold truncate">{info.unitName}</p>
                  <p className="text-[10px] sm:text-[11px] text-emerald-400 mt-0.5">Available now</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">{info.vacantCount} of {info.totalCount} vacant</p>
                </>
              ) : info.opensDate ? (
                <>
                  <p className="text-xs sm:text-sm font-heading font-semibold truncate">{info.unitName}</p>
                  <p className="text-[10px] sm:text-[11px] text-amber-400 mt-0.5">Opens {format(new Date(info.opensDate + 'T00:00:00'), 'MMM d')}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">0 of {info.totalCount} vacant</p>
                </>
              ) : (
                <>
                  <p className="text-xs sm:text-sm font-heading font-semibold text-muted-foreground">All booked</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">No end dates set</p>
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Existing stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-card stat-glow rounded-lg p-3.5 sm:p-4 flex items-start gap-2.5 sm:gap-3"
        >
          <div className="p-2 rounded-md bg-secondary/10">
            <DollarSign className="h-4 w-4 text-secondary" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-muted-foreground font-body">Monthly Income</p>
            <p className="text-base sm:text-xl font-heading font-semibold mt-0.5">{formatCurrency(totalMonthlyIncome)}</p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">{occupiedCount} occupied</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="glass-card stat-glow rounded-lg p-3.5 sm:p-4 flex items-start gap-2.5 sm:gap-3"
        >
          <div className="p-2 rounded-md bg-secondary/10">
            <Home className="h-4 w-4 text-secondary" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-muted-foreground font-body">Occupancy</p>
            <p className="text-base sm:text-xl font-heading font-semibold mt-0.5">{occupiedCount} / {totalUnits}</p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">{vacantCount > 0 ? `${vacantCount} vacant` : 'Fully occupied'}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
