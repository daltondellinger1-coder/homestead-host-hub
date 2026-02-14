import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Payment } from '@/types/property';
import { Plus, Trash2 } from 'lucide-react';

interface ScheduledPayment {
  date: string;
  amount: string;
  note: string;
}

interface InlinePaymentSchedulerProps {
  payments: ScheduledPayment[];
  onChange: (payments: ScheduledPayment[]) => void;
  defaultAmount?: string;
  startDate?: string;
}

export type { ScheduledPayment };

export function scheduledToPayments(scheduled: ScheduledPayment[]): Payment[] {
  return scheduled
    .filter(p => p.date && p.amount)
    .map(p => ({
      id: crypto.randomUUID(),
      amount: parseFloat(p.amount),
      date: p.date,
      status: 'upcoming' as const,
      note: p.note.trim() || undefined,
    }));
}

export default function InlinePaymentScheduler({ payments, onChange, defaultAmount, startDate }: InlinePaymentSchedulerProps) {
  const addRow = () => {
    // Auto-advance date: use last row's date + 1 month, or startDate
    let nextDate = '';
    if (payments.length > 0) {
      const lastDate = payments[payments.length - 1].date;
      if (lastDate) {
        const d = new Date(lastDate + 'T00:00:00');
        d.setMonth(d.getMonth() + 1);
        nextDate = d.toISOString().split('T')[0];
      }
    } else if (startDate) {
      nextDate = startDate;
    }

    onChange([...payments, { date: nextDate, amount: defaultAmount ?? '', note: '' }]);
  };

  const updateRow = (index: number, field: keyof ScheduledPayment, value: string) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeRow = (index: number) => {
    onChange(payments.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Scheduled Payments ({payments.length})
        </Label>
        <Button type="button" size="sm" variant="ghost" className="h-6 text-xs px-2 text-primary" onClick={addRow}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {payments.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">
          No payments scheduled. Click "Add" to schedule payments, or add them later from the unit card.
        </p>
      )}

      {payments.map((p, i) => (
        <div key={i} className="flex items-start gap-1.5 bg-muted/30 rounded-lg p-2">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <Input
                type="date"
                value={p.date}
                onChange={e => updateRow(i, 'date', e.target.value)}
                className="h-7 text-xs"
                placeholder="Date"
              />
              <Input
                type="number"
                value={p.amount}
                onChange={e => updateRow(i, 'amount', e.target.value)}
                className="h-7 text-xs"
                placeholder="Amount ($)"
              />
            </div>
            <Input
              value={p.note}
              onChange={e => updateRow(i, 'note', e.target.value)}
              className="h-7 text-xs"
              placeholder="Note (optional)"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
            onClick={() => removeRow(i)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
