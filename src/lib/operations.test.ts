import { describe, expect, it } from 'vitest';
import {
  addDaysKey,
  findOverlappingReservation,
  nextReservationFor,
  sameDayTurnoverUnitIds,
  shouldRetryNotification,
  summarizeOperations,
  UNIT_OPERATIONAL_STATUS,
  type OperationalReservation,
} from './operations';

const reservation = (partial: Partial<OperationalReservation> = {}): OperationalReservation => ({
  id: 'reservation-1',
  unit_id: 'unit-1',
  status: 'confirmed',
  check_in_date: '2026-07-23',
  check_out_date: '2026-07-25',
  ...partial,
});

describe('Homestead Helper operational rules', () => {
  it('detects overlapping confirmed reservations for the same unit', () => {
    const existing = reservation();
    const candidate = reservation({
      id: 'reservation-2',
      check_in_date: '2026-07-24',
      check_out_date: '2026-07-27',
    });
    expect(findOverlappingReservation(candidate, [existing])?.id).toBe(existing.id);
  });

  it('allows back-to-back reservations and ignores cancelled stays', () => {
    const existing = reservation();
    expect(findOverlappingReservation(reservation({
      id: 'reservation-2',
      check_in_date: '2026-07-25',
      check_out_date: '2026-07-27',
    }), [existing])).toBeUndefined();
    expect(findOverlappingReservation(reservation({
      id: 'reservation-3',
      status: 'cancelled',
      check_in_date: '2026-07-24',
    }), [existing])).toBeUndefined();
  });

  it('selects the next reservation after checkout', () => {
    const departing = reservation();
    const later = reservation({ id: 'later', check_in_date: '2026-07-29', check_out_date: '2026-07-31' });
    const next = reservation({ id: 'next', check_in_date: '2026-07-25', check_out_date: '2026-07-28' });
    expect(nextReservationFor(departing, [later, departing, next])?.id).toBe('next');
  });

  it('flags same-day turnovers once per unit', () => {
    const reservations = [
      reservation(),
      reservation({ id: 'next', check_in_date: '2026-07-25', check_out_date: '2026-07-27' }),
    ];
    expect([...sameDayTurnoverUnitIds(reservations)]).toEqual(['unit-1']);
  });

  it('summarizes arrivals, departures, cleaning exceptions, emergencies, and overdue tasks', () => {
    const summary = summarizeOperations(
      [
        reservation({ check_in_date: '2026-07-23', check_out_date: '2026-07-24' }),
        reservation({ id: 'next', check_in_date: '2026-07-24', check_out_date: '2026-07-26' }),
      ],
      [{
        id: 'clean-1',
        unit_id: 'unit-1',
        status: 'awaiting_confirmation',
        checkout_at: '2026-07-24T11:00:00-04:00',
        cleaning_deadline: '2026-07-24T15:00:00-04:00',
      }],
      [{ id: 'maint-1', status: 'new', emergency: true }],
      [{ id: 'task-1', title: 'Call guest', status: 'new', priority: 'urgent', due_at: '2026-07-22T17:00:00-04:00' }],
      '2026-07-23',
    );
    expect(summary.arrivalsToday).toHaveLength(1);
    expect(summary.departuresNextSevenDays).toHaveLength(2);
    expect(summary.cleaningAction).toHaveLength(1);
    expect(summary.openMaintenance).toHaveLength(1);
    expect(summary.overdueTasks).toHaveLength(1);
    expect(summary.sameDayTurnoverUnitIds.has('unit-1')).toBe(true);
    expect(summary.urgentCount).toBe(4);
  });

  it('retries only temporary notification failures within the configured limit', () => {
    expect(shouldRetryNotification('temporary_failure', 0)).toBe(true);
    expect(shouldRetryNotification('temporary_failure', 3)).toBe(false);
    expect(shouldRetryNotification('permanent_failure', 0)).toBe(false);
    expect(shouldRetryNotification('sent', 0)).toBe(false);
  });

  it('supports the seven required unit statuses', () => {
    expect(Object.keys(UNIT_OPERATIONAL_STATUS)).toEqual([
      'occupied',
      'vacant_ready',
      'vacant_dirty',
      'cleaning_scheduled',
      'maintenance_needed',
      'offline',
      'under_renovation',
    ]);
  });

  it('handles seven-day windows without UTC date drift', () => {
    expect(addDaysKey('2026-12-29', 7)).toBe('2027-01-05');
  });
});
