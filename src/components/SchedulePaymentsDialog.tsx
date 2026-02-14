import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Payment, PaymentStatus } from '@/types/property';
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle, CalendarDays, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface SchedulePaymentsDialogProps {
  open: boolean;
  onClose: () => void;
  unitName: string;
  unitId: string;
  payments: Payment[];
  defaultAmount?: number;
  onAddPayment: (unitId: string, payment: Payment) => void;
  onUpdatePayment: (paymentId: string, updates: { amount?: number; date?: string; note?: string }) => void;
  onDeletePayment: (paymentId: string) => void;
  onMarkPaid: (unitId: string, paymentId: string) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const formatDate = (iso: string) => {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const statusConfig: Record<PaymentStatus, { icon: typeof CheckCircle2; label: string; className: string }> = {
  paid: { icon: CheckCircle2, label: 'Paid', className: 'text-success' },
  pending: { icon: AlertCircle, label: 'Pending', className: 'text-warning' },
  upcoming: { icon: Clock, label: 'Upcoming', className: 'text-muted-foreground' },
  overdue: { icon: AlertCircle, label: 'Overdue', className: 'text-destructive' },
};

export default function SchedulePaymentsDialog({
  open,
  onClose,
  unitName,
  unitId,
  payments,
  defaultAmount,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onMarkPaid,
}: SchedulePaymentsDialogProps) {
  const [newDate, setNewDate] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');

  // Sort payments: upcoming/pending first (by date asc), then paid (by date desc)
  const upcomingPayments = payments
    .filter(p => p.status === 'upcoming' || p.status === 'pending' || p.status === 'overdue')
    .sort((a, b) => a.date.localeCompare(b.date));

  const paidPayments = payments
    .filter(p => p.status === 'paid')
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleAddPayment = () => {
    if (!newDate || !newAmount) return;

    const payment: Payment = {
      id: crypto.randomUUID(),
      amount: parseFloat(newAmount),
      date: newDate,
      status: 'upcoming',
      note: newNote.trim() || undefined,
    };

    onAddPayment(unitId, payment);
    toast.success(`Scheduled ${formatCurrency(payment.amount)} for ${formatDate(newDate)}`);

    // Advance date to next month for quick scheduling
    const d = new Date(newDate + 'T00:00:00');
    d.setMonth(d.getMonth() + 1);
    setNewDate(d.toISOString().split('T')[0]);
    setNewAmount('');
    setNewNote('');
  };

  const startEditing = (payment: Payment) => {
    setEditingId(payment.id);
    setEditAmount(payment.amount.toString());
    setEditDate(payment.date);
    setEditNote(payment.note ?? '');
  };

  const saveEdit = (paymentId: string) => {
    if (!editAmount || !editDate) return;
    onUpdatePayment(paymentId, {
      amount: parseFloat(editAmount),
      date: editDate,
      note: editNote.trim() || undefined,
    });
    setEditingId(null);
    toast.success('Payment updated');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg font-body max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-secondary" />
            Payments — {unitName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Add New Payment Form */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Schedule New Payment</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="sched-date" className="text-xs">Due Date</Label>
                <Input
                  id="sched-date"
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sched-amount" className="text-xs">Amount ($)</Label>
                <Input
                  id="sched-amount"
                  type="number"
                  placeholder={defaultAmount?.toString() ?? '0'}
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sched-note" className="text-xs">Note (optional)</Label>
              <Input
                id="sched-note"
                placeholder="e.g. March payout - 31 nights"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <Button
              size="sm"
              className="w-full h-9 text-sm font-body"
              onClick={handleAddPayment}
              disabled={!newDate || !newAmount}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Scheduled Payment
            </Button>
          </div>

          {/* Upcoming Payments */}
          {upcomingPayments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Upcoming ({upcomingPayments.length})
              </p>
              <div className="space-y-1.5">
                {upcomingPayments.map(p => {
                  const config = statusConfig[p.status];
                  const Icon = config.icon;
                  const isEditing = editingId === p.id;

                  return (
                    <div key={p.id} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${config.className}`} />
                      {isEditing ? (
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="date"
                              value={editDate}
                              onChange={e => setEditDate(e.target.value)}
                              className="h-7 text-sm"
                            />
                            <Input
                              type="number"
                              value={editAmount}
                              onChange={e => setEditAmount(e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                            />
                          </div>
                          <Input
                            placeholder="Note (optional)"
                            value={editNote}
                            onChange={e => setEditNote(e.target.value)}
                            className="h-7 text-xs"
                          />
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="default" className="h-6 text-xs px-2" onClick={() => saveEdit(p.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-semibold">{formatCurrency(p.amount)}</span>
                              <span className="text-muted-foreground text-xs">· {formatDate(p.date)}</span>
                            </div>
                            {p.note && <p className="text-xs text-muted-foreground truncate">{p.note}</p>}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => startEditing(p)}
                              title="Edit amount"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-primary hover:text-primary px-2"
                              onClick={() => onMarkPaid(unitId, p.id)}
                            >
                              Mark Paid
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => onDeletePayment(p.id)}
                              title="Delete payment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paid Payments */}
          {paidPayments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Paid ({paidPayments.length})
              </p>
              <div className="space-y-1.5">
                {paidPayments.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm px-3 py-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-medium text-foreground">{formatCurrency(p.amount)}</span>
                        <span className="text-xs">· {formatDate(p.date)}</span>
                      </div>
                      {p.note && <p className="text-xs truncate">{p.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {payments.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-6">
              No payments recorded yet. Use the form above to schedule future payments.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
