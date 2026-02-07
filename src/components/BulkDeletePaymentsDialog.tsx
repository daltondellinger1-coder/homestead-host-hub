import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, AlertTriangle } from 'lucide-react';

interface PaymentEvent {
  id: string;
  date: string;
  amount: number;
  status: string;
  unitId: string;
  unitName: string;
  guestName: string;
}

interface BulkDeletePaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allPayments: PaymentEvent[];
  units: { id: string; name: string }[];
  onBulkDelete: (paymentIds: string[]) => Promise<void>;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

export default function BulkDeletePaymentsDialog({
  open,
  onOpenChange,
  allPayments,
  units,
  onBulkDelete,
}: BulkDeletePaymentsDialogProps) {
  const [mode, setMode] = useState<'month' | 'unit'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Available months from payment data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allPayments.forEach(p => {
      const [y, m] = p.date.split('-');
      months.add(`${y}-${m}`);
    });
    return [...months].sort().reverse();
  }, [allPayments]);

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Sorted units for the select
  const sortedUnits = useMemo(() => {
    return [...units].sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [units]);

  // Matched payments based on current filters
  const matchedPayments = useMemo(() => {
    let result = [...allPayments];

    if (mode === 'month' && selectedMonth) {
      result = result.filter(p => p.date.startsWith(selectedMonth));
    } else if (mode === 'unit' && selectedUnit) {
      result = result.filter(p => p.unitId === selectedUnit);
    } else {
      return [];
    }

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    return result;
  }, [allPayments, mode, selectedMonth, selectedUnit, statusFilter]);

  const totalAmount = matchedPayments.reduce((s, p) => s + p.amount, 0);

  const handleDelete = async () => {
    if (matchedPayments.length === 0) return;
    setDeleting(true);
    try {
      await onBulkDelete(matchedPayments.map(p => p.id));
      setShowConfirm(false);
      onOpenChange(false);
      // Reset
      setSelectedMonth('');
      setSelectedUnit('');
      setStatusFilter('all');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedMonth('');
      setSelectedUnit('');
      setStatusFilter('all');
      setMode('month');
    }
    onOpenChange(open);
  };

  const selectionLabel = mode === 'month' && selectedMonth
    ? formatMonth(selectedMonth)
    : mode === 'unit' && selectedUnit
    ? sortedUnits.find(u => u.id === selectedUnit)?.name ?? ''
    : '';

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="glass-card border-border/50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Bulk Delete Payments
            </DialogTitle>
            <DialogDescription className="font-body text-sm">
              Delete multiple payment records at once by month or by unit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Mode selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-body font-medium text-muted-foreground">Delete by</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={mode === 'month' ? 'default' : 'outline'}
                  className="flex-1 font-body text-sm h-9"
                  onClick={() => { setMode('month'); setSelectedUnit(''); }}
                >
                  Month
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'unit' ? 'default' : 'outline'}
                  className="flex-1 font-body text-sm h-9"
                  onClick={() => { setMode('unit'); setSelectedMonth(''); }}
                >
                  Unit
                </Button>
              </div>
            </div>

            {/* Month picker */}
            {mode === 'month' && (
              <div className="space-y-1.5">
                <label className="text-xs font-body font-medium text-muted-foreground">Select month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-9 text-sm font-body">
                    <SelectValue placeholder="Choose a month..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map(m => (
                      <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Unit picker */}
            {mode === 'unit' && (
              <div className="space-y-1.5">
                <label className="text-xs font-body font-medium text-muted-foreground">Select unit</label>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="h-9 text-sm font-body">
                    <SelectValue placeholder="Choose a unit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedUnits.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-body font-medium text-muted-foreground">Payment status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {(selectedMonth || selectedUnit) && (
              <div className="rounded-lg bg-muted/40 border border-border/50 p-3 space-y-1">
                <p className="text-sm font-body font-medium">
                  {matchedPayments.length} payment{matchedPayments.length !== 1 ? 's' : ''} matched
                </p>
                <p className="text-xs font-body text-muted-foreground">
                  Total: {formatCurrency(totalAmount)}
                </p>
                {matchedPayments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['paid', 'upcoming', 'pending', 'overdue'].map(status => {
                      const count = matchedPayments.filter(p => p.status === status).length;
                      if (count === 0) return null;
                      return (
                        <span key={status} className="text-[10px] font-body bg-muted rounded px-1.5 py-0.5 capitalize">
                          {count} {status}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="destructive"
              className="font-body"
              disabled={matchedPayments.length === 0}
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete {matchedPayments.length} Payment{matchedPayments.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="glass-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Bulk Delete
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              This will permanently delete <strong>{matchedPayments.length}</strong> payment record{matchedPayments.length !== 1 ? 's' : ''}{' '}
              {selectionLabel ? (
                <>for <strong>{selectionLabel}</strong></>
              ) : null}{' '}
              totaling <strong>{formatCurrency(totalAmount)}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body" disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-body"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
