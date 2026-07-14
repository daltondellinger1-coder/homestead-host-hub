import { describe, expect, it } from 'vitest';
import { summarizeMethod, validatePaymentMethod } from './paymentMethods';

describe('validatePaymentMethod', () => {
  it('allows drafts with no method', () => {
    expect(validatePaymentMethod({ status: 'upcoming', amount: 100 }).ok).toBe(true);
    expect(validatePaymentMethod({ status: 'pending', amount: 100 }).ok).toBe(true);
  });

  it('requires a method for paid payments', () => {
    const r = validatePaymentMethod({ status: 'paid', amount: 100 });
    expect(r.ok).toBe(false);
  });

  it('accepts a single method for paid payments', () => {
    expect(
      validatePaymentMethod({ status: 'paid', amount: 100, paymentMethod: 'venmo' }).ok,
    ).toBe(true);
  });

  it('rejects "other" without a custom description', () => {
    const r = validatePaymentMethod({ status: 'paid', amount: 100, paymentMethod: 'other' });
    expect(r.ok).toBe(false);
  });

  it('accepts "other" with description', () => {
    expect(
      validatePaymentMethod({
        status: 'paid', amount: 100,
        paymentMethod: 'other', paymentMethodOther: 'CashApp',
      }).ok,
    ).toBe(true);
  });

  it('requires split allocations to sum to the payment total', () => {
    const bad = validatePaymentMethod({
      status: 'paid', amount: 100,
      allocations: [
        { method: 'venmo', amount: 40 },
        { method: 'cash', amount: 40 },
      ],
    });
    expect(bad.ok).toBe(false);
  });

  it('accepts valid split allocations', () => {
    const ok = validatePaymentMethod({
      status: 'paid', amount: 100,
      allocations: [
        { method: 'venmo', amount: 60 },
        { method: 'cash', amount: 40 },
      ],
    });
    expect(ok.ok).toBe(true);
  });
});

describe('summarizeMethod', () => {
  it('renders "Multiple: A + B" for split payments', () => {
    expect(
      summarizeMethod(null, [
        { method: 'venmo', amount: 60 },
        { method: 'cash', amount: 40 },
      ]),
    ).toBe('Multiple: Venmo + Cash');
  });

  it('renders the custom label for "Other"', () => {
    expect(summarizeMethod('other', [], 'CashApp')).toBe('CashApp');
  });

  it('renders the standard label for single methods', () => {
    expect(summarizeMethod('zelle', [])).toBe('Zelle');
  });
});
