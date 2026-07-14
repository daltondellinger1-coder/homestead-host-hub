import { PAYMENT_METHOD_LABELS, PaymentAllocation, PaymentMethod, PaymentStatus, SOURCE_LABELS, BookingSource } from '@/types/property';

export interface ExportablePaymentEvent {
  id: string;
  date: string;
  unitName: string;
  guestName: string;
  source: BookingSource;
  status: PaymentStatus;
  amount: number;
  note?: string;
  paymentMethod?: PaymentMethod | null;
  paymentMethodOther?: string | null;
  needsMethodReview?: boolean;
  allocations?: PaymentAllocation[];
}

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Build a CSV that preserves split-allocation detail: one row per allocation
 * for split payments; single row otherwise. Keeps the payment id/date/unit
 * so bookkeepers can re-aggregate.
 */
export function buildPaymentsCsv(events: ExportablePaymentEvent[]): string {
  const header = [
    'payment_id','date','unit','guest','source','status','payment_amount',
    'allocation_method','allocation_method_other','allocation_amount',
    'needs_method_review','note',
  ];
  const lines: string[] = [header.join(',')];

  for (const e of events) {
    const meaningful = (e.allocations ?? []).filter(a => a.amount > 0);
    const rows: Array<{ method: string; other: string; amount: number }> =
      meaningful.length > 1
        ? meaningful.map(a => ({
            method: PAYMENT_METHOD_LABELS[a.method],
            other: a.method === 'other' ? (a.otherDescription ?? '') : '',
            amount: a.amount,
          }))
        : [{
            method: e.paymentMethod ? PAYMENT_METHOD_LABELS[e.paymentMethod] : '',
            other: e.paymentMethod === 'other' ? (e.paymentMethodOther ?? '') : '',
            amount: e.amount,
          }];

    for (const r of rows) {
      lines.push([
        csvEscape(e.id),
        csvEscape(e.date),
        csvEscape(e.unitName),
        csvEscape(e.guestName),
        csvEscape(SOURCE_LABELS[e.source]),
        csvEscape(e.status),
        csvEscape(e.amount),
        csvEscape(r.method),
        csvEscape(r.other),
        csvEscape(r.amount),
        csvEscape(e.needsMethodReview ? 'yes' : ''),
        csvEscape(e.note ?? ''),
      ].join(','));
    }
  }
  return lines.join('\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
