import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260725141000_reservation_review_queue.sql'),
  'utf8',
);
const reviewQueue = readFileSync(
  resolve(process.cwd(), 'src/components/ReservationReviewQueue.tsx'),
  'utf8',
);
const operationsHook = readFileSync(
  resolve(process.cwd(), 'src/hooks/useOperationsData.ts'),
  'utf8',
);

describe('reservation review safety contract', () => {
  it('stages external observations behind an explicit manager review', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.reservation_source_observations');
    expect(migration).toContain("review_status IN ('pending','approved','rejected','superseded','needs_mapping')");
    expect(migration).toContain("public.has_any_role(ARRAY['admin','property_manager'])");
    expect(migration).toContain('FOR UPDATE');
  });

  it('does not turn inquiries or text signals into reservations', () => {
    expect(migration).toContain("observation_status NOT IN ('confirmed','cancelled')");
    expect(migration).toContain('Only a confirmed reservation or cancellation can be approved');
    expect(reviewQueue).toContain('Verify this signal');
  });

  it('keeps all outbound delivery out of the review path', () => {
    expect(reviewQueue).toContain('does not send email, text messages, or calendar invitations');
    expect(reviewQueue).not.toContain('operations-dispatch');
    expect(migration).not.toContain("'email'");
    expect(migration).not.toContain("'sms'");
  });

  it('uses the transactional review RPC from the operations UI', () => {
    expect(operationsHook).toContain("db.rpc('review_reservation_observation'");
    expect(operationsHook).toContain('No messages were sent.');
    expect(reviewQueue).toContain('Approve schedule');
    expect(reviewQueue).toContain('Save review details');
  });

  it('shows source evidence age without pretending it proves collector health', () => {
    expect(reviewQueue).toContain('Latest evidence by source');
    expect(reviewQueue).toContain('Evidence age shows the newest staged record');
    expect(reviewQueue).toContain('not whether the source login is healthy');
    expect(reviewQueue).toContain("'airbnb'");
    expect(reviewQueue).toContain("'furnished_finder'");
    expect(reviewQueue).toContain("'grasshopper'");
  });
});
