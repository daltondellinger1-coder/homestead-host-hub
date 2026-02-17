import { Unit, FutureGuest, SOURCE_LABELS, STATUS_LABELS, UnitStatus } from '@/types/property';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, User, Clock, Shield, Plus, CheckCircle2, XCircle, StickyNote, Pencil, Trash2, History, UserPlus, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

interface UnitCardProps {
  unit: Unit;
  index: number;
  onAddGuest: (unitId: string) => void;
  onEditGuest: (unitId: string) => void;
  onEditUnit: (unitId: string) => void;
  onRecordPayment: (unitId: string) => void;
  onMarkPaid: (unitId: string, paymentId: string) => void;
  onRemoveGuest: (unitId: string) => void;
  onDeleteUnit: (unitId: string) => void;
  onViewHistory: (unitId: string) => void;
  onSchedulePayments: (unitId: string, futureGuestId?: string) => void;
  onEditFutureGuest: (unitId: string, futureGuestId: string) => void;
  onDeleteFutureGuest: (futureGuestId: string) => void;
  onDeleteCurrentGuest: (unitId: string) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

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

export default function UnitCard({ unit, index, onAddGuest, onEditGuest, onEditUnit, onRecordPayment, onMarkPaid, onRemoveGuest, onDeleteUnit, onViewHistory, onSchedulePayments, onEditFutureGuest, onDeleteFutureGuest, onDeleteCurrentGuest }: UnitCardProps) {
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
      <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-border/50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading text-base sm:text-lg font-semibold">{unit.name}</h3>
              <Badge variant="outline" className={`${colors.border} ${colors.text} font-body text-[11px] py-0 shrink-0`}>
                {STATUS_LABELS[unit.status]}
              </Badge>
              {guest && (
                <Badge variant="secondary" className="font-body text-[11px] py-0 shrink-0">
                  {SOURCE_LABELS[guest.source]}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onViewHistory(unit.id)}
              title="Lease history"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onEditUnit(unit.id)}
              title="Edit unit"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteUnit(unit.id)}
              title="Delete unit"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 sm:px-5 py-3.5 sm:py-4 space-y-3">
        {guest ? (
          <>
            <div className="flex items-center gap-2.5 text-sm sm:text-base">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{guest.name}</span>
            </div>

            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{formatDate(guest.checkIn)} — {formatDate(guest.checkOut)}</span>
            </div>

            {daysToCheckout !== null && (
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
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

            <div className="flex items-center gap-2.5 text-base sm:text-lg">
              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-semibold">{formatCurrency(guest.monthlyRate)}<span className="text-muted-foreground text-sm font-normal"> /mo</span></span>
            </div>

            {guest.securityDeposit > 0 && (
              <div className="flex items-center gap-2.5 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex items-center gap-1.5">
                  {formatCurrency(guest.securityDeposit)} deposit
                  {guest.securityDepositPaid ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                </span>
              </div>
            )}

            {guest.notes && (
              <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <StickyNote className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{guest.notes}</span>
              </div>
            )}

            {/* Payments */}
            <div
              className="pt-3 border-t border-border/50 space-y-2 cursor-pointer rounded-lg -mx-1 px-1 hover:bg-muted/20 transition-colors"
              onClick={() => onSchedulePayments(unit.id)}
              title="Click to manage payments"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Payments</p>
                <Button size="sm" variant="default" className="h-7 text-xs px-3 font-semibold" onClick={(e) => { e.stopPropagation(); onSchedulePayments(unit.id); }}>
                  Manage
                </Button>
              </div>

              {nextPayment && (
                <div className="flex items-center justify-between gap-2 text-sm bg-muted/40 rounded-lg px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <span className="text-muted-foreground">Next: </span>
                    <span className="font-medium">{formatCurrency(nextPayment.amount)}</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="text-muted-foreground text-xs">{formatDate(nextPayment.date)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs px-3 shrink-0 font-semibold"
                    onClick={(e) => { e.stopPropagation(); onMarkPaid(unit.id, nextPayment.id); }}
                  >
                    Mark Paid
                  </Button>
                </div>
              )}

              {lastPayment && (
                <div className="text-sm text-muted-foreground px-3">
                  Last: {formatCurrency(lastPayment.amount)} · {formatDate(lastPayment.date)}
                </div>
              )}
            </div>

            {/* Future Guests */}
            {unit.futureGuests.length > 0 && (
              <div className="pt-3 border-t border-border/50 space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="h-3 w-3" />
                  Upcoming Bookings ({unit.futureGuests.length})
                </p>
                {unit.futureGuests.map((fg) => (
                  <div key={fg.id} className="bg-primary/5 border border-primary/10 rounded-lg px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{fg.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="font-body text-[10px] py-0">
                          {SOURCE_LABELS[fg.source]}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => onEditFutureGuest(unit.id, fg.id)}
                          title="Edit booking"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteFutureGuest(fg.id)}
                          title="Delete booking"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>{formatDate(fg.checkIn)} — {formatDate(fg.checkOut)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs">
                        <span className="font-medium">{formatCurrency(fg.monthlyRate)}</span>
                        <span className="text-muted-foreground"> /mo</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-primary hover:text-primary px-1.5"
                        onClick={() => onSchedulePayments(unit.id, fg.id)}
                      >
                        <CalendarDays className="h-3 w-3 mr-1" />
                        Payments {fg.payments.length > 0 ? `(${fg.payments.length})` : ''}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="font-body text-xs sm:text-sm h-9 px-3"
                onClick={() => onRecordPayment(unit.id)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Payment
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="font-body text-xs sm:text-sm h-9 px-3"
                onClick={() => onEditGuest(unit.id)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="font-body text-xs sm:text-sm text-destructive hover:text-destructive h-9 px-3"
                onClick={() => onRemoveGuest(unit.id)}
              >
                End Lease
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="font-body text-xs sm:text-sm text-muted-foreground hover:text-destructive h-9 px-3 ml-auto"
                onClick={() => onDeleteCurrentGuest(unit.id)}
                title="Delete guest & all records"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : isInactive ? (
          <div className="py-4 text-center">
            <p className="text-muted-foreground text-sm">{unit.status === 'storage' ? 'Storage / Bathroom' : 'Under planning'}</p>
          </div>
        ) : (
          <div className="py-5 text-center space-y-3">
            <p className="text-muted-foreground text-base">No current guest</p>
            <Button
              size="sm"
              className="font-body text-sm h-9"
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
