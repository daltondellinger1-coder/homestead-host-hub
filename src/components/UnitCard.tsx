import { Unit, SOURCE_LABELS } from '@/types/property';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, User, Clock, Shield, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface UnitCardProps {
  unit: Unit;
  index: number;
  onAddGuest: (unitId: string) => void;
  onRecordPayment: (unitId: string) => void;
  onMarkPaid: (unitId: string, paymentId: string) => void;
  onRemoveGuest: (unitId: string) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const daysUntil = (iso: string) => {
  const diff = new Date(iso + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function UnitCard({ unit, index, onAddGuest, onRecordPayment, onMarkPaid, onRemoveGuest }: UnitCardProps) {
  const guest = unit.currentGuest;
  const lastPayment = guest?.payments.find(p => p.status === 'paid');
  const nextPayment = guest?.payments.find(p => p.status === 'upcoming' || p.status === 'pending');
  const daysToCheckout = guest ? daysUntil(guest.checkOut) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="glass-card rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <h3 className="font-heading text-lg font-semibold">{unit.name}</h3>
          {unit.isVacant ? (
            <Badge variant="outline" className="border-warning text-warning font-body text-xs">
              Vacant
            </Badge>
          ) : (
            <Badge variant="outline" className="border-success text-success font-body text-xs">
              Occupied
            </Badge>
          )}
        </div>
        {guest && (
          <Badge variant="secondary" className="font-body text-xs">
            {SOURCE_LABELS[guest.source]}
          </Badge>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {guest ? (
          <>
            {/* Guest info */}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{guest.name}</span>
            </div>

            {/* Stay dates */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{formatDate(guest.checkIn)} — {formatDate(guest.checkOut)}</span>
            </div>

            {/* Days remaining */}
            {daysToCheckout !== null && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  {daysToCheckout > 0
                    ? `${daysToCheckout} days remaining`
                    : daysToCheckout === 0
                    ? 'Checkout today'
                    : `${Math.abs(daysToCheckout)} days overdue`}
                </span>
              </div>
            )}

            {/* Monthly rate */}
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{formatCurrency(guest.monthlyRate)}<span className="text-muted-foreground"> /month</span></span>
            </div>

            {/* Security deposit */}
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              {guest.securityDeposit > 0 ? (
                <span className="flex items-center gap-1.5">
                  {formatCurrency(guest.securityDeposit)} deposit
                  {guest.securityDepositPaid ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">No deposit</span>
              )}
            </div>

            {/* Payment history */}
            <div className="pt-2 border-t border-border/50 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payments</p>

              {nextPayment && (
                <div className="flex items-center justify-between text-sm bg-primary/5 rounded-md px-3 py-2">
                  <div>
                    <span className="text-muted-foreground">Next: </span>
                    <span className="font-medium">{formatCurrency(nextPayment.amount)}</span>
                    <span className="text-muted-foreground"> · {formatDate(nextPayment.date)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary hover:text-primary"
                    onClick={() => onMarkPaid(unit.id, nextPayment.id)}
                  >
                    Mark Paid
                  </Button>
                </div>
              )}

              {lastPayment && (
                <div className="flex items-center text-sm text-muted-foreground px-3">
                  <span>Last: {formatCurrency(lastPayment.amount)} · {formatDate(lastPayment.date)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 font-body text-xs"
                onClick={() => onRecordPayment(unit.id)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Record Payment
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="font-body text-xs text-destructive hover:text-destructive"
                onClick={() => onRemoveGuest(unit.id)}
              >
                End Lease
              </Button>
            </div>
          </>
        ) : (
          <div className="py-6 text-center space-y-3">
            <p className="text-muted-foreground text-sm">No current guest</p>
            <Button
              size="sm"
              className="font-body"
              onClick={() => onAddGuest(unit.id)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Guest / Lease
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
