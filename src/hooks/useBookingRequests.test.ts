import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

function setup(mirrorError: Error | null) {
  const invoke = vi.fn().mockResolvedValue({ error: mirrorError });
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ update });
  const fetch = vi.fn().mockResolvedValue({ ok: true });
  const toast = { error: vi.fn(), success: vi.fn() };
  const request = { id: 'synthetic-request', name: 'Synthetic Guest', email: 'synthetic@example.invalid' };
  let stateIndex = 0;
  const module = { exports: {} as { useBookingRequests: () => { approveExtension: (id: string, input: typeof params) => Promise<boolean> } } };
  const source = readFileSync('src/hooks/useBookingRequests.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(compiled, {
    exports: module.exports,
    require: (name: string) => {
      if (name === 'react') return {
        useState: () => [stateIndex++ === 0 ? [request] : false, vi.fn()],
        useEffect: vi.fn(),
        useCallback: (callback: unknown) => callback,
      };
      if (name === 'sonner') return { toast };
      if (name === '@/integrations/supabase/client') return { supabase: { functions: { invoke }, from } };
      throw new Error(`Unexpected import: ${name}`);
    },
    fetch,
    console: { error: vi.fn() },
    Date,
  });
  return { hook: module.exports.useBookingRequests(), invoke, update, from, fetch, toast };
}

const params = {
  unitId: 'synthetic-unit', unitName: 'Unit 3', unitSlug: 'unit-3',
  startDate: '2026-12-01', endDate: '2026-12-03', amount: 200,
};

describe('extension mirror proxy (isolated, no live calls)', () => {
  it('sends only the same booking ID, unit slug and dates through the existing client', async () => {
    const { hook, invoke, update, fetch } = setup(null);
    expect(await hook.approveExtension('synthetic-request', params)).toBe(true);
    expect(invoke).toHaveBeenCalledWith('website-mirror-extension-block', {
      body: { booking_request_id: 'synthetic-request', unit_slug: 'unit-3', check_in: '2026-12-01', check_out: '2026-12-03' },
    });
    expect(update).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toContain('/send-extension-approval-email');
  });

  it('aborts approval and email delivery when the proxy reports a failure', async () => {
    const { hook, from, fetch, toast } = setup(new Error('Synthetic mirror failure'));
    expect(await hook.approveExtension('synthetic-request', params)).toBe(false);
    expect(from).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Failed to mirror to website calendar — request not approved');
  });
});