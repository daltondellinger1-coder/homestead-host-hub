import { describe, expect, it } from 'vitest';
import { buildMaintenanceQaPayload, getSyntheticRequestFilter, summarizeMaintenanceQaResult } from './maintenanceQa';

describe('maintenance QA helper contract', () => {
  it('builds a synthetic Unit 5 payload with a stable event id and safe test marker', () => {
    const payload = buildMaintenanceQaPayload({ unitName: 'Unit 5', eventId: 'qa-unit-5-123' });

    expect(payload.eventId).toBe('qa-unit-5-123');
    expect(JSON.stringify(payload)).toContain('AUTOMATION TEST ONLY');
    expect(payload.data.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Unit', value: 'Unit 5' }),
      expect.objectContaining({ label: 'Issue title', value: 'AUTOMATION TEST ONLY - Unit 5 webhook smoke test' }),
      expect.objectContaining({ label: 'Urgent', value: 'No' }),
    ]));
  });

  it('uses only the synthetic marker and known IDs for cleanup filters', () => {
    expect(getSyntheticRequestFilter(['request-1', 'request-2'])).toEqual({
      ids: ['request-1', 'request-2'],
      marker: 'AUTOMATION TEST ONLY',
    });
  });

  it('summarizes pass/fail status without exposing secrets', () => {
    const summary = summarizeMaintenanceQaResult({
      httpStatus: 200,
      requestId: 'req-123',
      logId: 'log-456',
      notificationOk: true,
      cleanupDeleted: 2,
    });

    expect(summary.status).toBe('pass');
    expect(summary.lines.join('\n')).toContain('request req-123');
    expect(summary.lines.join('\n')).toContain('deleted 2 synthetic row(s)');
    expect(summary.lines.join('\n')).not.toMatch(/secret|token|key/i);
  });
});
