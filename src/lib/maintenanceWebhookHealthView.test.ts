import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const pagePath = resolve(process.cwd(), 'src/pages/MaintenanceHealth.tsx');
const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const maintenanceSource = readFileSync(resolve(process.cwd(), 'src/pages/Maintenance.tsx'), 'utf8');

describe('maintenance webhook health view contract', () => {
  it('adds an admin route linked from maintenance for webhook and notification health', () => {
    expect(appSource).toContain('path="/maintenance/health"');
    expect(maintenanceSource).toContain('/maintenance/health');
    expect(maintenanceSource).toContain('Webhook Health');
  });

  it('shows recent Tally webhook and notification log status without exposing secrets', () => {
    expect(existsSync(pagePath)).toBe(true);
    const pageSource = readFileSync(pagePath, 'utf8');

    expect(pageSource).toContain('Maintenance Webhook Health');
    expect(pageSource).toContain('webhook_payload_log');
    expect(pageSource).toContain('maintenance-notifications');
    expect(pageSource).toContain('processed_status');
    expect(pageSource).toContain('related_request_id');
    expect(pageSource).toContain('Refresh');
    expect(pageSource).toContain('maintenance-webhook-health-check');
    expect(pageSource).toContain('Run Unit 5 re-test');
    expect(pageSource).toContain('Cleanup synthetic row');
    expect(pageSource).toContain('AUTOMATION TEST ONLY');
    expect(pageSource).not.toMatch(/secret|api[_-]?key|token/i);
  });
});
