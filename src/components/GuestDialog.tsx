import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Guest, BookingSource } from '@/types/property';
import InlinePaymentScheduler, { ScheduledPayment, scheduledToPayments } from '@/components/InlinePaymentScheduler';

interface GuestDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (guest: Guest) => void;
  unitName: string;
  existingGuest?: Guest | null;
}

export default function GuestDialog({ open, onClose, onSave, unitName, existingGuest }: GuestDialogProps) {
  const isEditing = !!existingGuest;

  const [name, setName] = useState('');
  const [source, setSource] = useState<BookingSource>('direct');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [depositPaid, setDepositPaid] = useState(false);
  const [notes, setNotes] = useState('');
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);

  // Populate fields when editing
  useEffect(() => {
    if (existingGuest && open) {
      setName(existingGuest.name);
      setSource(existingGuest.source);
      setCheckIn(existingGuest.checkIn);
      setCheckOut(existingGuest.checkOut);
      setMonthlyRate(existingGuest.monthlyRate.toString());
      setSecurityDeposit(existingGuest.securityDeposit > 0 ? existingGuest.securityDeposit.toString() : '');
      setDepositPaid(existingGuest.securityDepositPaid);
      setNotes(existingGuest.notes ?? '');
      setScheduledPayments([]);
    } else if (!existingGuest && open) {
      reset();
    }
  }, [existingGuest, open]);

  const reset = () => {
    setName('');
    setSource('direct');
    setCheckIn('');
    setCheckOut('');
    setMonthlyRate('');
    setSecurityDeposit('');
    setDepositPaid(false);
    setNotes('');
    setScheduledPayments([]);
  };

  const handleSave = () => {
    if (!name.trim() || !checkIn || !monthlyRate) return;

    const guest: Guest = {
      name: name.trim(),
      source,
      checkIn,
      checkOut,
      monthlyRate: parseFloat(monthlyRate),
      securityDeposit: securityDeposit ? parseFloat(securityDeposit) : 0,
      securityDepositPaid: depositPaid,
      payments: isEditing ? (existingGuest?.payments ?? []) : scheduledToPayments(scheduledPayments),
      notes: notes.trim() || undefined,
    };

    onSave(guest);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md font-body max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEditing ? 'Edit Guest' : 'Add Guest'} — {unitName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="guest-name">Guest Name</Label>
            <Input id="guest-name" placeholder="e.g. Jane Smith" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Booking Source</Label>
            <Select value={source} onValueChange={v => setSource(v as BookingSource)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="airbnb">Airbnb</SelectItem>
                <SelectItem value="furnished_finder">Furnished Finder</SelectItem>
                <SelectItem value="direct">Direct Booking</SelectItem>
                <SelectItem value="long_term">Long Term</SelectItem>
                <SelectItem value="lease">Lease</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="check-in">Check-in</Label>
              <Input id="check-in" type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="check-out">Check-out <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="check-out" type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="monthly-rate">Monthly Rate ($)</Label>
            <Input id="monthly-rate" type="number" placeholder="1800" value={monthlyRate} onChange={e => setMonthlyRate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deposit">Security Deposit ($)</Label>
            <Input id="deposit" type="number" placeholder="0" value={securityDeposit} onChange={e => setSecurityDeposit(e.target.value)} />
          </div>

          {securityDeposit && parseFloat(securityDeposit) > 0 && (
            <div className="flex items-center justify-between">
              <Label htmlFor="deposit-paid">Deposit Collected?</Label>
              <Switch id="deposit-paid" checked={depositPaid} onCheckedChange={setDepositPaid} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="guest-notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="guest-notes"
              placeholder="e.g. Month-to-month lease, paid deposit on..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="resize-none h-20"
            />
          </div>

          {/* Inline payment scheduling - only for new guests */}
          {!isEditing && (
            <div className="pt-3 border-t border-border/50">
              <InlinePaymentScheduler
                payments={scheduledPayments}
                onChange={setScheduledPayments}
                defaultAmount={monthlyRate}
                startDate={checkIn}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} className="font-body">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !checkIn || !monthlyRate} className="font-body">
            {isEditing ? 'Save Changes' : 'Save Guest'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
