import { describe, expect, it } from 'vitest';
import { isDateBlockedByCalendar, summarizeCalendarSyncHealth } from './calendarSyncHealth';

const blocks = [
  { id: 'b1', unitId: 'u5', checkIn: '2026-05-24', checkOut: '2026-05-27', summary: 'Airbnb' },
  { id: 'b2', unitId: 'u5', checkIn: '2026-06-02', checkOut: '2026-06-04', summary: 'Airbnb' },
];

describe('calendar sync health helpers', () => {
  it('treats check-in through night-before-checkout as blocked', () => {
    expect(isDateBlockedByCalendar('2026-05-24', blocks)).toBe(true);
    expect(isDateBlockedByCalendar('2026-05-26', blocks)).toBe(true);
    expect(isDateBlockedByCalendar('2026-05-27', blocks)).toBe(false);
  });

  it('summarizes mapped calendar blocks for the next 30 days', () => {
    const summary = summarizeCalendarSyncHealth({
      today: new Date('2026-05-23T12:00:00Z'),
      units: [{ id: 'u5', name: 'Unit 5' }, { id: 'u6', name: 'Unit 6' }],
      blocksByUnit: new Map([['u5', blocks]]),
    });

    expect(summary.totalBlocks).toBe(2);
    expect(summary.mappedUnits).toBe(1);
    expect(summary.totalUnits).toBe(2);
    expect(summary.blockedNightsNext30).toBe(5);
    expect(summary.unitsWithBlocks[0]).toMatchObject({ unitName: 'Unit 5', blockedNightsNext30: 5, upcomingBlocks: 2 });
  });
});
