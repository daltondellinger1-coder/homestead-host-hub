import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260724190000_maintenance_sms_broadcasts.sql'),
  'utf8',
);
const smsFunction = readFileSync(
  resolve(process.cwd(), 'supabase/functions/maintenance-sms/index.ts'),
  'utf8',
);
const offerFunction = readFileSync(
  resolve(process.cwd(), 'supabase/functions/maintenance-offer/index.ts'),
  'utf8',
);
const managerPanel = readFileSync(
  resolve(process.cwd(), 'src/components/HandymanBroadcastPanel.tsx'),
  'utf8',
);
const offerPage = readFileSync(
  resolve(process.cwd(), 'src/pages/MaintenanceOffer.tsx'),
  'utf8',
);
const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const maintenanceHook = readFileSync(resolve(process.cwd(), 'src/hooks/useMaintenanceRequests.ts'), 'utf8');
const maintenanceNotifications = readFileSync(
  resolve(process.cwd(), 'supabase/functions/maintenance-notifications/index.ts'),
  'utf8',
);
const consentMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260725113000_handyman_sms_consent.sql'),
  'utf8',
);
const consentFunction = readFileSync(
  resolve(process.cwd(), 'supabase/functions/handyman-sms-consent/index.ts'),
  'utf8',
);
const signupPage = readFileSync(resolve(process.cwd(), 'src/pages/HandymanSmsSignup.tsx'), 'utf8');
const privacyPage = readFileSync(resolve(process.cwd(), 'src/pages/SmsPrivacy.tsx'), 'utf8');
const termsPage = readFileSync(resolve(process.cwd(), 'src/pages/SmsTerms.tsx'), 'utf8');

describe('maintenance handyman SMS dispatch contracts', () => {
  it('allows only one open broadcast and selects the winner under row locks', () => {
    expect(migration).toContain('maintenance_broadcasts_one_open_per_request');
    expect(migration).toMatch(/WHERE status = 'open'/);
    expect(migration).toMatch(/FROM public\.maintenance_offers o[\s\S]+FOR UPDATE/);
    expect(migration).toMatch(/FROM public\.maintenance_broadcasts[\s\S]+FOR UPDATE/);
    expect(migration).toMatch(/status = 'open'[\s\S]+accepted_vendor_id IS NULL[\s\S]+RETURNING id INTO v_updated_id/);
  });

  it('makes repeated winner clicks idempotent and rejects late acceptors', () => {
    expect(migration).toContain("v_offer.status = 'accepted'");
    expect(migration).toContain("'already_accepted', true");
    expect(migration).toContain("'already_filled'");
    expect(migration).toContain("status = CASE WHEN id = v_offer.id THEN 'accepted' ELSE 'lost' END");
  });

  it('queues winner, loser, and cancellation texts in the assignment transaction', () => {
    expect(migration).toContain("'winner_confirmation'");
    expect(migration).toContain("'job_filled'");
    expect(migration).toContain("'broadcast_cancelled'");
    expect(migration).toContain('maintenance_sms_outbox_one_kind_per_offer');
  });

  it('stores only token hashes and exposes a public expiring acceptance page', () => {
    expect(smsFunction).toContain('await sha256(token)');
    expect(smsFunction).not.toMatch(/token:\s*token/);
    expect(offerFunction).toContain('accept_maintenance_offer');
    expect(appSource).toContain('path="/maintenance-offer/:token"');
    expect(offerPage).toContain('The first confirmed acceptance gets the job');
  });

  it('keeps live SMS gated and requires explicit consent plus a valid phone', () => {
    expect(smsFunction).toContain('MAINTENANCE_SMS_ENABLED');
    expect(smsFunction).toContain('sms_consent_status === "consented"');
    expect(smsFunction).toContain('normalizeUsPhone');
    expect(managerPanel).toContain('Twilio activation is still being finished');
    expect(managerPanel).toContain('confirmed text consent');
  });

  it('preserves the routine and emergency approval limits before broadcast', () => {
    expect(smsFunction).toContain('emergency ? 500 : 250');
    expect(smsFunction).toContain('"approved", "emergency_override"');
    expect(smsFunction).toContain('code: "approval_required"');
  });

  it('retries provider failures without undoing an accepted job', () => {
    expect(smsFunction).toContain('.lt("attempt_count", 5)');
    expect(smsFunction).toContain('next_attempt_at: retryAt');
    expect(offerFunction).toContain('next_attempt_at: new Date(Date.now() + 120_000)');
    expect(offerFunction).not.toContain('update({ status: "open"');
    expect(smsFunction).toContain('liveOffer?.status !== "pending"');
    expect(smsFunction).toContain('liveBroadcast?.status !== "open"');
  });

  it('notifies management for manual intake and winner assignment', () => {
    expect(maintenanceHook).toContain("event: 'new_request'");
    expect(maintenanceNotifications).toContain('r.role === "property_manager"');
    expect(offerFunction).toContain('event: "assigned"');
  });

  it('records explicit public opt-in evidence and publishes carrier disclosures', () => {
    expect(appSource).toContain('path="/handyman-sms-signup"');
    expect(appSource).toContain('path="/privacy-policy"');
    expect(appSource).toContain('path="/sms-terms"');
    expect(signupPage).toContain('Message frequency varies');
    expect(signupPage).toContain('Message and data rates may apply');
    expect(signupPage).toContain('Reply STOP to opt out or HELP for help');
    expect(signupPage).toContain('Consent is not a condition of purchasing goods or services');
    expect(privacyPage).toContain('do not sell, rent, or share mobile numbers');
    expect(termsPage).toContain('Homestead Hill Maintenance Network');
    expect(consentMigration).toContain('vendor_sms_consent_events');
    expect(consentFunction).toContain('sms_consent_status: "consented"');
    expect(consentFunction).toContain('disclosure_version: version');
  });

  it('identifies the legal sender and includes opt-out and help in job offers', () => {
    expect(smsFunction).toContain('We Flip Houses LLC — Homestead Hill job');
    expect(smsFunction).toContain('Reply STOP to opt out or HELP for help');
  });
});
