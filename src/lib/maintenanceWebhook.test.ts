import { describe, expect, it } from 'vitest';
import {
  buildMaintenanceInsert,
  getTallyEventId,
  HH_MAINTENANCE_QR_BRAND,
  HH_MAINTENANCE_QR_UNITS,
  maintenanceQrTargetUrl,
} from './maintenanceWebhook';

const unitMap = new Map([
  ['Unit 1', 'unit-1-id'],
  ['unit 2', 'unit-2-id'],
]);

describe('maintenance webhook parsing', () => {
  it('normalizes a Tally submission into a maintenance request insert', () => {
    const payload = {
      eventId: 'evt_123',
      data: {
        fields: [
          { key: 'unit', label: 'Unit', value: 'Unit 1' },
          { key: 'issue_title', label: 'Issue title', value: 'Kitchen faucet leaking' },
          { key: 'description', label: 'Describe the issue', value: 'Slow drip under sink' },
          { key: 'your_name', label: 'Your name', value: 'AUTOMATION TEST ONLY' },
          { key: 'phone', label: 'Your phone number', value: '555-0100' },
          {
            key: 'photos',
            label: 'Photo(s) of the issue',
            value: [
              { url: 'https://example.com/photo-1.jpg' },
              { url: 'https://example.com/photo-2.jpg' },
            ],
          },
          { key: 'urgency', label: 'Is this urgent?', value: 'Yes — active leak / no heat / safety issue' },
        ],
      },
    };

    expect(buildMaintenanceInsert(payload, unitMap)).toEqual({
      unit_id: 'unit-1-id',
      title: 'Kitchen faucet leaking',
      description: 'Slow drip under sink\n\nPhone: 555-0100',
      photo_url: 'https://example.com/photo-1.jpg',
      photo_urls: ['https://example.com/photo-1.jpg', 'https://example.com/photo-2.jpg'],
      reporter_name: 'AUTOMATION TEST ONLY',
      status: 'new',
      tally_event_id: 'evt_123',
      priority_urgent: true,
    });
  });

  it('accepts submissionId and responseId as duplicate-safe event IDs', () => {
    expect(getTallyEventId({ data: { submissionId: 'sub_1' } })).toBe('sub_1');
    expect(getTallyEventId({ data: { responseId: 'resp_1' } })).toBe('resp_1');
  });

  it('throws a useful error when the prefilled unit is missing or unknown', () => {
    expect(() => buildMaintenanceInsert({ data: { fields: [] } }, unitMap)).toThrow('Missing unit field');
    expect(() => buildMaintenanceInsert({ data: { fields: [{ label: 'Unit', value: 'Unit 99' }] } }, unitMap)).toThrow('Unit not found: Unit 99');
  });
});

describe('branded maintenance QR contract', () => {
  it('uses Homestead Hill public-site colors and all active units except office/long-term exclusions', () => {
    expect(HH_MAINTENANCE_QR_BRAND).toMatchObject({
      navy: '#071222',
      gold: '#cda360',
      cream: '#FCFBF8',
      fontFamily: 'DM Sans',
      heading: 'Maintenance Issue?',
    });
    expect(HH_MAINTENANCE_QR_UNITS).toEqual([
      'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'Unit 6', 'Unit 7',
      'Unit 8', 'Unit 9', 'Unit 10', 'Unit 11', 'Unit 13', 'Unit 14',
    ]);
  });

  it('builds QR target URLs with the unit hidden field encoded for Tally', () => {
    expect(maintenanceQrTargetUrl('https://tally.so/r/ABC123', 'Unit 10')).toBe('https://tally.so/r/ABC123?unit=Unit+10');
    expect(maintenanceQrTargetUrl('https://tally.so/r/ABC123?foo=bar', 'Unit 1')).toBe('https://tally.so/r/ABC123?foo=bar&unit=Unit+1');
  });
});
