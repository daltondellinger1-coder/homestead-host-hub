import { Unit, SOURCE_LABELS, STATUS_LABELS, UnitStatus } from '@/types/property';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, User, Clock, Shield, Plus, CheckCircle2, XCircle, StickyNote, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';

interface UnitCardProps {
  unit: Unit;
  index: number;
  onAddGuest: (unitId: string) => void;
  onEditGuest: (unitId: string) => void;
  onRecordPayment: (unitId: string) => void;
  onMarkPaid: (unitId: string, paymentId: string) => void;
  onRemoveGuest: (unitId: string) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);

const formatDate = (iso: string) => {
  if (!iso) return 'Month-to-month';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const daysUntil = (iso: string) => {
  if (!iso) return null;
  const diff = new Date(iso + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const statusColors: Record<UnitStatus, { border: string; text: string }> = {
  occupied: { border: 'border-success', text: 'text-success' },
  rented: { border: 'border-primary', text: 'text-primary' },
  vacant: { border: 'border-warning', text: 'text-warning' },
  planning: { border: 'border-muted-foreground', text: 'text-muted-foreground' },
  storage: { border: 'border-muted-foreground', text: 'text-muted-foreground' },
};

export default function UnitCard({ unit, index, onAddGuest, onEditGuest, onRecordPayment, onMarkPaid, onRemoveGuest }: UnitCardProps) {
  const guest = unit.currentGuest;
  const lastPayment = guest?.payments.find(p => p.status === 'paid');
  const nextPayment = guest?.payments.find(p => p.status === 'upcoming' || p.status === 'pending');
  const daysToCheckout = guest?.checkOut ? daysUntil(guest.checkOut) : null;
  const isInactive = unit.status === 'planning' || unit.status === 'storage';
  const colors = statusColors[unit.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className={`glass-card rounded-xl overflow-hidden ${isInactive ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <h3 className="font-heading text-base font-semibold">{unit.name}</h3>
          <Badge variant="outline" className={`${colors.border} ${colors.text} font-body text-[11px] py-0`}>
            {STATUS_LABELS[unit.status]}
          </Badge>
        </div>
        {guest && (
          <Badge variant="secondary" className="font-body text-[11px]">
            {SOURCE_LABELS[guest.source]}
          </Badge>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-3.5 space-y-3">
        {guest ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium">{guest.name}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{formatDate(guest.checkIn)} — {formatDate(guest.checkOut)}</span>
            </div>

            {daysToCheckout !== null && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {daysToCheckout > 0
                    ? `${daysToCheckout} days remaining`
                    : daysToCheckout === 0
                    ? 'Checkout today'
                    : `${Math.abs(daysToCheckout)} days overdue`}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{formatCurrency(guest.monthlyRate)}<span className="text-muted-foreground text-xs"> /mo</span></span>
            </div>

            {guest.securityDeposit > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex items-center gap-1">
                  {formatCurrency(guest.securityDeposit)} deposit
                  {guest.securityDepositPaid ? (
                    <CheckCircle2 className="h-3 w-3 text-success" />
                  ) : (
                    <XCircle className="h-3 w-3 text-destructive" />
                  )}
                </span>
              </div>
            )}

            {guest.notes && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{guest.notes}</span>
              </div>
            )}

            {/* Payments */}
            <div className="pt-2 border-t border-border/50 space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Payments</p>

              {nextPayment && (
                <div className="flex items-center justify-between text-xs bg-primary/5 rounded-md px-3 py-2">
                  <div>
                    <span className="text-muted-foreground">Next: </span>
                    <span className="font-medium">{formatCurrency(nextPayment.amount)}</span>
                    <span className="text-muted-foreground"> · {formatDate(nextPayment.date)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] text-primary hover:text-primary px-2"
                    onClick={() => onMarkPaid(unit.id, nextPayment.id)}
                  >
                    Mark Paid
                  </Button>
                </div>
              )}

              {lastPayment && (
                <div className="text-xs text-muted-foreground px-3">
                  Last: {formatCurrency(lastPayment.amount)} · {formatDate(lastPayment.date)}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 font-body text-xs h-8"
                onClick={() => onRecordPayment(unit.id)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Payment
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="font-body text-xs h-8"
                onClick={() => onEditGuest(unit.id)}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="font-body text-xs text-destructive hover:text-destructive h-8"
                onClick={() => onRemoveGuest(unit.id)}
              >
                End Lease
              </Button>
            </div>
          </>
        ) : isInactive ? (
          <div className="py-3 text-center">
            <p className="text-muted-foreground text-xs">{unit.status === 'storage' ? 'Storage / Bathroom' : 'Under planning'}</p>
          </div>
        ) : (
          <div className="py-4 text-center space-y-2">
            <p className="text-muted-foreground text-sm">No current guest</p>
            <Button
              size="sm"
              className="font-body text-xs"
              onClick={() => onAddGuest(unit.id)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Guest / Lease
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
