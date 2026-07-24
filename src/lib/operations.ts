export const UNIT_OPERATIONAL_STATUS = {
  occupied: { label: 'Occupied', tone: 'blue' },
  vacant_ready: { label: 'Vacant & ready', tone: 'green' },
  vacant_dirty: { label: 'Vacant & dirty', tone: 'red' },
  cleaning_scheduled: { label: 'Cleaning scheduled', tone: 'amber' },
  maintenance_needed: { label: 'Maintenance needed', tone: 'orange' },
  offline: { label: 'Offline', tone: 'slate' },
  under_renovation: { label: 'Under renovation', tone: 'purple' },
} as const;

export type OperationalUnitStatus = keyof typeof UNIT_OPERATIONAL_STATUS;

export const CLEANING_STATUS_LABELS: Record<string, string> = {
  needs_scheduling: 'Needs scheduling',
  awaiting_confirmation: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  readiness_verification_required: 'Verify readiness',
  ready: 'Ready',
  cleaner_declined: 'Cleaner declined',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export interface OperationalReservation {
  id: string;
  unit_id: string;
  booking_source?: string;
  status: string;
  check_in_date: string;
  check_in_time?: string;
  check_out_date?: string | null;
  check_out_time?: string;
  payment_status?: string;
  readiness_verified?: boolean;
  guest?: { id?: string; name?: string; phone?: string; email?: string } | null;
  unit?: { id?: string; name?: string; operational_status?: OperationalUnitStatus } | null;
}

export interface OperationalCleaning {
  id: string;
  unit_id: string;
  status: string;
  confirmation_status?: string;
  assigned_cleaner_user_id?: string | null;
  checkout_at: string;
  next_check_in_at?: string | null;
  cleaning_deadline: string;
  assigned_cleaner_name?: string | null;
  assigned_cleaner_email?: string | null;
  confirmed_at?: string | null;
  declined_at?: string | null;
  completed_at?: string | null;
  special_notes?: string | null;
  pet_notes?: string | null;
  linen_notes?: string | null;
  supply_notes?: string | null;
  completion_notes?: string | null;
  completion_photo_urls?: string[] | null;
  readiness_verification_status?: string;
  supplies_needed?: string | null;
  damage_found?: string | null;
  maintenance_issue_found?: string | null;
  unit?: { id?: string; name?: string } | null;
}

export interface OperationalTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at?: string | null;
  unit?: { name?: string } | null;
}

export interface OperationalMaintenance {
  id: string;
  title?: string;
  description?: string;
  status: string;
  priority?: string;
  priority_urgent?: boolean;
  emergency?: boolean;
  approval_required?: boolean;
  approval_status?: string;
  vendor_id?: string | null;
  unit?: { name?: string } | null;
}

export interface OperationsSummary {
  urgentCount: number;
  arrivalsToday: OperationalReservation[];
  departuresToday: OperationalReservation[];
  arrivalsNextSevenDays: OperationalReservation[];
  departuresNextSevenDays: OperationalReservation[];
  cleaningAction: OperationalCleaning[];
  openMaintenance: OperationalMaintenance[];
  overdueTasks: OperationalTask[];
  sameDayTurnoverUnitIds: Set<string>;
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function isOpenReservation(status: string) {
  return ['confirmed', 'checked_in', 'extended'].includes(status);
}

export function findOverlappingReservation(
  candidate: Pick<OperationalReservation, 'id' | 'unit_id' | 'check_in_date' | 'check_out_date' | 'status'>,
  reservations: OperationalReservation[],
) {
  if (!isOpenReservation(candidate.status) || !candidate.check_out_date) return undefined;
  return reservations.find((reservation) => (
    reservation.id !== candidate.id
    && reservation.unit_id === candidate.unit_id
    && isOpenReservation(reservation.status)
    && Boolean(reservation.check_out_date)
    && reservation.check_in_date < candidate.check_out_date!
    && reservation.check_out_date! > candidate.check_in_date
  ));
}

export function nextReservationFor(
  departing: OperationalReservation,
  reservations: OperationalReservation[],
) {
  if (!departing.check_out_date) return undefined;
  return reservations
    .filter((reservation) => (
      reservation.id !== departing.id
      && reservation.unit_id === departing.unit_id
      && isOpenReservation(reservation.status)
      && reservation.check_in_date >= departing.check_out_date!
    ))
    .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date))[0];
}

export function sameDayTurnoverUnitIds(reservations: OperationalReservation[]) {
  const ids = new Set<string>();
  for (const departure of reservations) {
    if (!departure.check_out_date || !isOpenReservation(departure.status)) continue;
    const next = nextReservationFor(departure, reservations);
    if (next?.check_in_date === departure.check_out_date) ids.add(departure.unit_id);
  }
  return ids;
}

export function shouldRetryNotification(status: string, retryCount: number, maximumRetries = 3) {
  return status === 'temporary_failure' && retryCount < maximumRetries;
}

export function summarizeOperations(
  reservations: OperationalReservation[],
  cleanings: OperationalCleaning[],
  maintenance: OperationalMaintenance[],
  tasks: OperationalTask[],
  today = localDateKey(),
): OperationsSummary {
  const weekEnd = addDaysKey(today, 7);
  const activeReservations = reservations.filter((reservation) => reservation.status !== 'cancelled');
  const arrivalsToday = activeReservations.filter((reservation) => reservation.check_in_date === today);
  const departuresToday = activeReservations.filter((reservation) => reservation.check_out_date === today);
  const arrivalsNextSevenDays = activeReservations
    .filter((reservation) => reservation.check_in_date >= today && reservation.check_in_date <= weekEnd)
    .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date));
  const departuresNextSevenDays = activeReservations
    .filter((reservation) => (
      Boolean(reservation.check_out_date)
      && reservation.check_out_date! >= today
      && reservation.check_out_date! <= weekEnd
    ))
    .sort((a, b) => reservationDate(a).localeCompare(reservationDate(b)));
  const cleaningAction = cleanings.filter((cleaning) => (
    ['needs_scheduling', 'awaiting_confirmation', 'cleaner_declined', 'overdue', 'readiness_verification_required']
      .includes(cleaning.status)
  ));
  const openMaintenance = maintenance.filter((request) => !['done', 'archived', 'completed', 'verified', 'cancelled'].includes(request.status));
  const overdueTasks = tasks.filter((task) => (
    task.status !== 'completed'
    && task.status !== 'cancelled'
    && Boolean(task.due_at)
    && task.due_at!.slice(0, 10) < today
  ));
  const sameDay = sameDayTurnoverUnitIds(activeReservations);
  const urgentMaintenance = openMaintenance.filter((request) => (
    request.emergency || request.priority === 'emergency' || request.priority_urgent
  ));

  return {
    urgentCount: cleaningAction.length + overdueTasks.length + urgentMaintenance.length + sameDay.size,
    arrivalsToday,
    departuresToday,
    arrivalsNextSevenDays,
    departuresNextSevenDays,
    cleaningAction,
    openMaintenance,
    overdueTasks,
    sameDayTurnoverUnitIds: sameDay,
  };
}

function reservationDate(reservation: OperationalReservation) {
  return reservation.check_out_date ?? '9999-12-31';
}
