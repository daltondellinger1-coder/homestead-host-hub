import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dispatch = readFileSync(
  resolve(process.cwd(), 'supabase/functions/operations-dispatch/index.ts'),
  'utf8',
);
const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260725143000_queue_cleaner_assignment_email.sql'),
  'utf8',
);
const operationsHook = readFileSync(resolve(process.cwd(), 'src/hooks/useOperationsData.ts'), 'utf8');

describe('cleaner assignment email and calendar contracts', () => {
  it('queues only assigned, non-cancelled cleanings with an idempotent signature', () => {
    expect(migration).toContain('queue_cleaner_assignment_email');
    expect(migration).toContain("NEW.status = 'cancelled'");
    expect(migration).toContain("'cleaning.assignment:' || NEW.id::text || ':' || v_signature");
    expect(migration).toContain('ON CONFLICT (idempotency_key) DO NOTHING');
  });

  it('uses the booking address as organizer and includes the cleaner app link', () => {
    expect(migration).toContain("'organizerEmail', 'booking@homestead-hill.com'");
    expect(migration).toContain('homestead-helper.daltondellinger1.chatgpt.site/cleaner');
  });

  it('renders a standards-based calendar request as an email attachment', () => {
    expect(dispatch).toContain('"METHOD:REQUEST"');
    expect(dispatch).toContain('"BEGIN:VEVENT"');
    expect(dispatch).toContain('RSVP=TRUE');
    expect(dispatch).toContain('encodeBase64(calendar)');
    expect(dispatch).toContain('filename: "homestead-hill-cleaning.ics"');
  });

  it('requests a dispatch after a successful cleaner assignment', () => {
    expect(operationsHook).toContain("supabase.functions.invoke('operations-dispatch'");
    expect(operationsHook).toContain('if (!result.error && cleaner?.email)');
  });

  it('keeps actual outbound delivery behind the existing production gate', () => {
    expect(dispatch).toContain('OPERATIONS_DELIVERY_ENABLED');
    expect(dispatch).toContain('if (!deliveryEnabled)');
  });
});
