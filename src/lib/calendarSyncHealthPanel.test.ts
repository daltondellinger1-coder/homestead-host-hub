import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentSource = readFileSync(resolve(process.cwd(), 'src/components/CalendarSyncHealth.tsx'), 'utf8');
const dashboardSource = readFileSync(resolve(process.cwd(), 'src/components/Dashboard.tsx'), 'utf8');

describe('calendar sync health panel contract', () => {
  it('renders public calendar_events health and warns when no channel blocks are found', () => {
    expect(componentSource).toContain('Channel calendar sync health');
    expect(componentSource).toContain('Upcoming blocks');
    expect(componentSource).toContain('Mapped units');
    expect(componentSource).toContain('Nights / 30d');
    expect(componentSource).toContain('No upcoming Airbnb/channel blocks found');
  });

  it('is displayed above the calendar timeline', () => {
    expect(dashboardSource).toContain('CalendarSyncHealth');
    expect(dashboardSource.indexOf('<CalendarSyncHealth')).toBeLessThan(dashboardSource.indexOf('<BookingTimeline'));
    expect(dashboardSource).toContain('calendarSyncLoading');
    expect(dashboardSource).toContain('calendarSyncError');
  });
});
