import {
  PAYMENT_METHOD_LABELS,
  PaymentAllocation,
  PaymentMethod,
  PaymentStatus,
} from '@/types/property';

const AMOUNT_EPSILON = 0.01;

export interface PaymentMethodDraft {
  status: PaymentStatus;
  amount: number;
  paymentMethod?: PaymentMethod;
  paymentMethodOther?: string;
  allocations?: PaymentAllocation[];
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * A method/allocation is required when the payment is marked paid or when money
 * has otherwise been received. Drafts (upcoming/pending/overdue) may skip it.
 */
export function methodRequired(status: PaymentStatus): boolean {
  return status === 'paid';
}

export function validatePaymentMethod(draft: PaymentMethodDraft): ValidationResult {
  if (!methodRequired(draft.status)) return { ok: true };

  const allocations = draft.allocations?.filter((a) => a.amount > 0) ?? [];

  if (allocations.length > 1) {
    for (const a of allocations) {
      if (a.method === 'other' && !a.otherDescription?.trim()) {
        return { ok: false, error: 'Describe the "Other" allocation method.' };
      }
    }
    const sum = allocations.reduce((s, a) => s + a.amount, 0);
    if (Math.abs(sum - draft.amount) > AMOUNT_EPSILON) {
      return {
        ok: false,
        error: `Split allocations must total the payment amount (got ${sum.toFixed(2)}, expected ${draft.amount.toFixed(2)}).`,
      };
    }
    return { ok: true };
  }

  const method = allocations[0]?.method ?? draft.paymentMethod;
  if (!method) {
    return { ok: false, error: 'Payment method is required for paid payments.' };
  }
  const otherDesc = allocations[0]?.otherDescription ?? draft.paymentMethodOther;
  if (method === 'other' && !otherDesc?.trim()) {
    return { ok: false, error: 'Describe the "Other" payment method.' };
  }
  return { ok: true };
}

export function summarizeMethod(
  method: PaymentMethod | null | undefined,
  allocations: PaymentAllocation[] | undefined,
  otherDescription?: string | null,
): string {
  const meaningful = allocations?.filter((a) => a.amount > 0) ?? [];
  if (meaningful.length > 1) {
    const labels = meaningful.map((a) =>
      a.method === 'other' && a.otherDescription ? a.otherDescription : PAYMENT_METHOD_LABELS[a.method],
    );
    return `Multiple: ${labels.join(' + ')}`;
  }
  if (!method) return '';
  if (method === 'other' && otherDescription) return otherDescription;
  return PAYMENT_METHOD_LABELS[method];
}
