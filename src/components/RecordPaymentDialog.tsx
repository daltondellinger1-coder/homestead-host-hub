import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Payment, PaymentAllocation, PaymentMethod, PaymentStatus, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/types/property';
import { methodRequired, validatePaymentMethod } from '@/lib/paymentMethods';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface RecordPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (payment: Payment) => void | Promise<void>;
  unitName: string;
  defaultAmount?: number;
}

type Alloc = { method: PaymentMethod; otherDescription: string; amount: string };

export default function RecordPaymentDialog({ open, onClose, onSave, unitName, defaultAmount }: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState(defaultAmount?.toString() ?? '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<PaymentStatus>('paid');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [split, setSplit] = useState(false);
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [methodOther, setMethodOther] = useState('');
  const [allocs, setAllocs] = useState<Alloc[]>([
    { method: 'venmo', otherDescription: '', amount: '' },
    { method: 'cash', otherDescription: '', amount: '' },
  ]);

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount?.toString() ?? '');
    }
  }, [open, defaultAmount]);

  const reset = () => {
    setAmount(defaultAmount?.toString() ?? '');
    setDate(new Date().toISOString().split('T')[0]);
    setStatus('paid');
    setNote('');
    setSplit(false);
    setMethod('');
    setMethodOther('');
    setAllocs([
      { method: 'venmo', otherDescription: '', amount: '' },
      { method: 'cash', otherDescription: '', amount: '' },
    ]);
  };

  const handleSave = async () => {
    if (!amount || !date) return;

    const numAmount = parseFloat(amount);
    const allocations: PaymentAllocation[] = split
      ? allocs
          .filter(a => a.amount && parseFloat(a.amount) > 0)
          .map(a => ({
            method: a.method,
            otherDescription: a.method === 'other' ? a.otherDescription.trim() : undefined,
            amount: parseFloat(a.amount),
          }))
      : [];

    const draft = {
      id: crypto.randomUUID(),
      amount: numAmount,
      date,
      status,
      note: note.trim() || undefined,
      paymentMethod: split ? undefined : (method || undefined),
      paymentMethodOther: split ? undefined : (method === 'other' ? methodOther.trim() || undefined : undefined),
      allocations,
    } as Payment;

    const check = validatePaymentMethod({
      status: draft.status,
      amount: draft.amount,
      paymentMethod: draft.paymentMethod,
      paymentMethodOther: draft.paymentMethodOther,
      allocations: draft.allocations,
    });
    if (!check.ok) {
      toast.error(check.error);
      return;
    }

    setSaving(true);
    try {
      await onSave(draft);
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const showMethodBlock = methodRequired(status);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md font-body max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Record Payment — {unitName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Amount ($)</Label>
            <Input id="pay-amount" type="number" placeholder="1800" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Date</Label>
            <Input id="pay-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as PaymentStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showMethodBlock && (
            <div className="space-y-2 rounded-md border border-border/50 p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Payment Method {split ? '(split)' : ''}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px]"
                  onClick={() => setSplit(s => !s)}
                >
                  {split ? 'Use single method' : 'Split payment'}
                </Button>
              </div>

              {!split && (
                <>
                  <Select value={method} onValueChange={v => setMethod(v as PaymentMethod)}>
                    <SelectTrigger><SelectValue placeholder="Select method…" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {method === 'other' && (
                    <Input placeholder="Describe method (e.g. CashApp)" value={methodOther} onChange={e => setMethodOther(e.target.value)} />
                  )}
                </>
              )}

              {split && (
                <div className="space-y-2">
                  {allocs.map((a, i) => (
                    <div key={i} className="grid grid-cols-[1fr_100px_auto] gap-2 items-start">
                      <div className="space-y-1">
                        <Select value={a.method} onValueChange={v => setAllocs(prev => prev.map((x, j) => j === i ? { ...x, method: v as PaymentMethod } : x))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map(m => (
                              <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {a.method === 'other' && (
                          <Input
                            placeholder="Describe"
                            value={a.otherDescription}
                            onChange={e => setAllocs(prev => prev.map((x, j) => j === i ? { ...x, otherDescription: e.target.value } : x))}
                          />
                        )}
                      </div>
                      <Input
                        type="number"
                        placeholder="$"
                        value={a.amount}
                        onChange={e => setAllocs(prev => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                      />
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={() => setAllocs(prev => prev.filter((_, j) => j !== i))} disabled={allocs.length <= 2}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAllocs(prev => [...prev, { method: 'cash', otherDescription: '', amount: '' }])}>
                    <Plus className="h-3 w-3 mr-1" />Add allocation
                  </Button>
                  <p className="text-[10px] text-muted-foreground">Allocations must total the payment amount (${amount || '0'}).</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="pay-note">Note (optional)</Label>
            <Input id="pay-note" placeholder="e.g. March rent" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={saving} className="font-body">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !amount || !date} className="font-body">
            {saving ? 'Saving...' : 'Save Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
