import { DollarSign, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsOverviewProps {
  totalMonthlyIncome: number;
  occupiedCount: number;
  vacantCount: number;
  totalUnits: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

export default function StatsOverview({ totalMonthlyIncome, occupiedCount, vacantCount, totalUnits }: StatsOverviewProps) {
  return (
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
  );
}
