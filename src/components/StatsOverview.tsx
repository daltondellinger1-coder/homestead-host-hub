import { DollarSign, Home, KeyRound, CalendarClock } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsOverviewProps {
  totalMonthlyIncome: number;
  occupiedCount: number;
  vacantCount: number;
  totalUnits: number;
  totalDepositsHeld: number;
  nextVacancy?: { unitName: string; checkOut: string };
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="glass-card stat-glow rounded-lg p-4 flex items-start gap-3"
  >
    <div className="p-2 rounded-md bg-secondary/15">
      <Icon className="h-4 w-4 text-secondary" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground font-body">{label}</p>
      <p className="text-xl font-heading font-semibold mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);

const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function StatsOverview({ totalMonthlyIncome, occupiedCount, vacantCount, totalUnits, totalDepositsHeld, nextVacancy }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={DollarSign}
        label="Monthly Income"
        value={formatCurrency(totalMonthlyIncome)}
        sub={`${occupiedCount} units generating revenue`}
        delay={0}
      />
      <StatCard
        icon={Home}
        label="Occupancy"
        value={`${occupiedCount} / ${totalUnits}`}
        sub={vacantCount > 0 ? `${vacantCount} vacant` : 'Fully occupied'}
        delay={0.05}
      />
      <StatCard
        icon={KeyRound}
        label="Deposits Held"
        value={formatCurrency(totalDepositsHeld)}
        delay={0.1}
      />
      <StatCard
        icon={CalendarClock}
        label="Next Vacancy"
        value={nextVacancy ? nextVacancy.unitName : 'None'}
        sub={nextVacancy ? formatDate(nextVacancy.checkOut) : 'All leases active'}
        delay={0.15}
      />
    </div>
  );
}
