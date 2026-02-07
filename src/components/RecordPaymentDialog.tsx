import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Payment, PaymentStatus } from '@/types/property';

interface RecordPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (payment: Payment) => void;
  unitName: string;
  defaultAmount?: number;
}

export default function RecordPaymentDialog({ open, onClose, onSave, unitName, defaultAmount }: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState(defaultAmount?.toString() ?? '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<PaymentStatus>('paid');
  const [note, setNote] = useState('');

  const reset = () => {
    setAmount(defaultAmount?.toString() ?? '');
    setDate(new Date().toISOString().split('T')[0]);
    setStatus('paid');
    setNote('');
  };

  const handleSave = () => {
    if (!amount || !date) return;

    const payment: Payment = {
      id: crypto.randomUUID(),
      amount: parseFloat(amount),
      date,
      status,
      note: note.trim() || undefined,
    };

    onSave(payment);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md font-body">
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

          <div className="space-y-1.5">
            <Label htmlFor="pay-note">Note (optional)</Label>
            <Input id="pay-note" placeholder="e.g. March rent" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} className="font-body">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!amount || !date} className="font-body">
            Save Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
