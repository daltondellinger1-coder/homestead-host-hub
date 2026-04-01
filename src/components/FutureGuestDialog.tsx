import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Guest, BookingSource, Unit, FutureGuest } from '@/types/property';
import InlinePaymentScheduler, { ScheduledPayment, scheduledToPayments } from '@/components/InlinePaymentScheduler';

interface FutureGuestDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (unitId: string, guest: Guest) => void;
  units: Unit[];
  preselectedUnitId?: string | null;
  prefillCheckIn?: string;
  prefillCheckOut?: string;
  existingGuest?: FutureGuest | null;
}

export default function FutureGuestDialog({ open, onClose, onSave, units, preselectedUnitId, prefillCheckIn, prefillCheckOut, existingGuest }: FutureGuestDialogProps) {
  const [unitId, setUnitId] = useState('');
  const [name, setName] = useState('');
  const [source, setSource] = useState<BookingSource>('direct');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [depositPaid, setDepositPaid] = useState(false);
  const [notes, setNotes] = useState('');
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);

  const isEditing = !!existingGuest;

  // Pre-fill form when editing or when dialog opens
  useEffect(() => {
    if (!open) return;

    if (existingGuest) {
      const ownerUnit = units.find(u => u.futureGuests.some(fg => fg.id === existingGuest.id));
      setUnitId(ownerUnit?.id ?? '');
      setName(existingGuest.name);
      setSource(existingGuest.source);
      setCheckIn(existingGuest.checkIn);
      setCheckOut(existingGuest.checkOut);
      setMonthlyRate(existingGuest.monthlyRate.toString());
      setSecurityDeposit(existingGuest.securityDeposit > 0 ? existingGuest.securityDeposit.toString() : '');
      setDepositPaid(existingGuest.securityDepositPaid);
      setNotes(existingGuest.notes ?? '');
      setScheduledPayments(
        existingGuest.payments.map(p => ({
          date: p.date,
          amount: p.amount.toString(),
          note: p.note || '',
        }))
      );
    } else {
      reset();
      if (preselectedUnitId) {
        setUnitId(preselectedUnitId);
      }
      if (prefillCheckIn) {
        setCheckIn(prefillCheckIn);
      }
      if (prefillCheckOut) {
        setCheckOut(prefillCheckOut);
      }
    }
  }, [open, existingGuest, preselectedUnitId, prefillCheckIn, prefillCheckOut]);

  // Pre-fill check-in from current guest's checkout when selecting a unit (only for new bookings)
  const selectedUnit = units.find(u => u.id === unitId);

  useEffect(() => {
    if (!isEditing && selectedUnit?.currentGuest?.checkOut) {
      setCheckIn(selectedUnit.currentGuest.checkOut);
    }
  }, [unitId, selectedUnit?.currentGuest?.checkOut, isEditing]);

  const reset = () => {
    setUnitId('');
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
    if (!unitId || !name.trim() || !checkIn || !monthlyRate) return;

    const guest: Guest = {
      name: name.trim(),
      source,
      checkIn,
      checkOut,
      monthlyRate: parseFloat(monthlyRate),
      securityDeposit: securityDeposit ? parseFloat(securityDeposit) : 0,
      securityDepositPaid: depositPaid,
      payments: scheduledToPayments(scheduledPayments),
      notes: notes.trim() || undefined,
    };

    onSave(unitId, guest);
    reset();
    onClose();
  };

  const eligibleUnits = units.filter(u => 
    u.status !== 'planning' && u.status !== 'storage'
  );

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md font-body max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEditing ? 'Edit Future Booking' : 'Book Future Guest'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select value={unitId} onValueChange={setUnitId} disabled={isEditing}>
              <SelectTrigger><SelectValue placeholder="Select a unit..." /></SelectTrigger>
              <SelectContent>
                {eligibleUnits.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                    {u.currentGuest ? ` (${u.currentGuest.name}${u.currentGuest.checkOut ? ` → out ${new Date(u.currentGuest.checkOut + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''})` : ' (vacant)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="future-guest-name">Guest Name</Label>
            <Input id="future-guest-name" placeholder="e.g. Jane Smith" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Booking Source</Label>
            <Select value={source} onValueChange={v => setSource(v as BookingSource)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="airbnb">Airbnb</SelectItem>
                <SelectItem value="direct">Direct Booking</SelectItem>
                <SelectItem value="furnished_finder">Furnished Finder</SelectItem>
                <SelectItem value="lease">Lease</SelectItem>
                <SelectItem value="long_term">Long Term</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="vrbo">VRBO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="future-check-in">Check-in</Label>
              <Input id="future-check-in" type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="future-check-out">Check-out <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="future-check-out" type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="future-monthly-rate">Monthly Rate ($)</Label>
            <Input id="future-monthly-rate" type="number" placeholder="1800" value={monthlyRate} onChange={e => setMonthlyRate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="future-deposit">Security Deposit ($)</Label>
            <Input id="future-deposit" type="number" placeholder="0" value={securityDeposit} onChange={e => setSecurityDeposit(e.target.value)} />
          </div>

          {securityDeposit && parseFloat(securityDeposit) > 0 && (
            <div className="flex items-center justify-between">
              <Label htmlFor="future-deposit-paid">Deposit Collected?</Label>
              <Switch id="future-deposit-paid" checked={depositPaid} onCheckedChange={setDepositPaid} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="future-guest-notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="future-guest-notes"
              placeholder="e.g. Booked via Airbnb, arrives after Kevin..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="resize-none h-20"
            />
          </div>

          {/* Inline payment scheduling */}
          <div className="pt-3 border-t border-border/50">
            <InlinePaymentScheduler
              payments={scheduledPayments}
              onChange={setScheduledPayments}
              defaultAmount={monthlyRate}
              startDate={checkIn}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} className="font-body">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!unitId || !name.trim() || !checkIn || !monthlyRate} className="font-body">
            {isEditing ? 'Save Changes' : 'Book Guest'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
