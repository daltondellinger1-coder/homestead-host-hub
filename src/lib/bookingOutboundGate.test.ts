import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const hookSource = readFileSync(resolve(process.cwd(), 'src/hooks/useBookingRequests.ts'), 'utf8');
const extensionCardSource = readFileSync(
  resolve(process.cwd(), 'src/components/ExtensionRequestCard.tsx'),
  'utf8',
);

describe('booking request outbound gate', () => {
  it('keeps every legacy guest email behind one default-off build flag', () => {
    expect(hookSource).toContain("import.meta.env.VITE_BOOKING_EMAIL_DELIVERY_ENABLED === 'true'");
    expect(hookSource.match(/bookingEmailDeliveryEnabled/g)?.length).toBeGreaterThanOrEqual(4);
    expect(hookSource).toContain('Guest email was not sent.');
  });

  it('tells operators that approval and decline do not currently send email', () => {
    expect(extensionCardSource).toContain(
      'Guest email delivery is paused and will not send automatically.',
    );
  });
});
