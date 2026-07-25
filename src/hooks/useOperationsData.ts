import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  OperationalCleaning,
  OperationalMaintenance,
  OperationalReservation,
  OperationalTask,
  localDateKey,
  summarizeOperations,
} from '@/lib/operations';
import { toast } from 'sonner';

export interface OperationalUnit {
  id: string;
  name: string;
  label?: string | null;
  operational_status: string;
  cleaning_notes?: string | null;
  maintenance_notes?: string | null;
  updated_at?: string;
}

export interface ApprovalRequest {
  id: string;
  category: string;
  record_type: string;
  amount?: number | null;
  reason: string;
  status: string;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  action: string;
  record_type: string;
  record_id: string;
  actor_label?: string | null;
  source: string;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  company?: string | null;
  trade: string;
  phone?: string | null;
  email?: string | null;
  vendor_rank: string;
  emergency_availability: boolean;
  sms_consent_status?: 'unknown' | 'consented' | 'opted_out';
}

export interface ChecklistRun {
  id: string;
  checklist_type: 'morning' | 'end_of_day' | 'weekly';
  checklist_date: string;
  items: Array<{ id: string; label: string; complete: boolean }>;
  completed_at?: string | null;
  escalation_notes?: string | null;
}

export interface CleanerAssignee {
  user_id: string;
  email?: string | null;
  display_name?: string | null;
}

export const CHECKLIST_TEMPLATES = {
  morning: [
    'Review today’s arrivals',
    'Review today’s departures',
    'Review same-day turnovers',
    'Check unresolved guest issues',
    'Confirm upcoming cleanings',
    'Review cleaner declines and unconfirmed cleanings',
    'Review emergency and routine maintenance',
    'Review overdue tasks',
    'Review approval-required items',
    'Confirm any unit going offline',
  ],
  end_of_day: [
    'Confirm tomorrow’s arrivals',
    'Confirm tomorrow’s departures',
    'Confirm units are ready',
    'Confirm cleanings are scheduled',
    'Confirm access instructions are prepared',
    'Review unresolved guest issues',
    'Review incomplete maintenance',
    'Escalate items requiring Dalton',
    'Confirm no urgent item is unassigned',
    'Add notes for the next day',
  ],
  weekly: [
    'Review seven-day arrivals and departures',
    'Review occupancy and upcoming vacancies',
    'Review units offline',
    'Review repeat maintenance issues',
    'Review supply needs',
    'Review vendor follow-ups',
    'Review unverified cleanings',
    'Review outstanding approvals',
    'Review incomplete guest records',
    'Review data conflicts',
  ],
} as const;

// Operational tables land with the V1 migration and are intentionally queried
// through the ungenerated client until Supabase types are regenerated post-apply.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useOperationsData() {
  const [units, setUnits] = useState<OperationalUnit[]>([]);
  const [reservations, setReservations] = useState<OperationalReservation[]>([]);
  const [cleanings, setCleanings] = useState<OperationalCleaning[]>([]);
  const [maintenance, setMaintenance] = useState<OperationalMaintenance[]>([]);
  const [tasks, setTasks] = useState<OperationalTask[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [checklists, setChecklists] = useState<ChecklistRun[]>([]);
  const [cleaners, setCleaners] = useState<CleanerAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all([
      db.from('units').select('id,name,label,operational_status,cleaning_notes,maintenance_notes,updated_at').order('sort_order'),
      db.from('reservations').select('*,guest:guests(id,name,phone,email),unit:units(id,name,operational_status)').order('check_in_date'),
      db.from('cleaning_tasks').select('*,unit:units(id,name)').order('cleaning_deadline'),
      db.from('maintenance_requests').select('*,unit:units(id,name)').order('created_at', { ascending: false }),
      db.from('operational_tasks').select('*,unit:units(name)').order('due_at'),
      db.from('approval_requests').select('*').eq('status', 'pending').order('created_at'),
      db.from('activity_log').select('id,action,record_type,record_id,actor_label,source,created_at').order('created_at', { ascending: false }).limit(30),
      db.from('vendors').select('*').eq('active', true).order('trade').order('vendor_rank'),
      db.from('checklist_runs').select('*').gte('checklist_date', localDateKey(new Date(Date.now() - 8 * 86400000))),
      db.from('user_roles').select('user_id,email,display_name').eq('role', 'cleaner').eq('active', true).not('user_id', 'is', null).order('display_name'),
    ]);

    const firstOperationalError = results.slice(1).find((result) => result.error)?.error;
    if (firstOperationalError && /relation .* does not exist|column .* does not exist/i.test(firstOperationalError.message ?? '')) {
      setSchemaReady(false);
    } else {
      setSchemaReady(true);
    }

    if (results[0].data) setUnits(results[0].data);
    if (results[1].data) setReservations(results[1].data);
    if (results[2].data) setCleanings(results[2].data);
    if (results[3].data) setMaintenance(results[3].data);
    if (results[4].data) setTasks(results[4].data);
    if (results[5].data) setApprovals(results[5].data);
    if (results[6].data) setActivity(results[6].data);
    if (results[7].data) setVendors(results[7].data);
    if (results[8].data) setChecklists(results[8].data);
    if (results[9].data) setCleaners(results[9].data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const channel = db
      .channel('operations-command-center')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleaning_tasks' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operational_tasks' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, refresh)
      .subscribe();
    return () => {
      db.removeChannel(channel);
    };
  }, [refresh]);

  const mutate = useCallback(async (
    work: () => Promise<{ error?: { message?: string } | null }>,
    success: string,
  ) => {
    const result = await work();
    if (result.error) {
      toast.error(result.error.message ?? 'That change could not be saved.');
      return false;
    }
    toast.success(success);
    await refresh();
    return true;
  }, [refresh]);

  const createReservation = useCallback(async (values: {
    unitId: string;
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    bookingSource: string;
    checkInDate: string;
    checkOutDate: string;
    checkInTime: string;
    checkOutTime: string;
    notes: string;
  }) => mutate(
    () => db.rpc('create_reservation_with_guest', {
      _unit_id: values.unitId,
      _guest_name: values.guestName,
      _guest_phone: values.guestPhone,
      _guest_email: values.guestEmail,
      _booking_source: values.bookingSource,
      _check_in_date: values.checkInDate,
      _check_out_date: values.checkOutDate,
      _check_in_time: values.checkInTime,
      _check_out_time: values.checkOutTime,
      _special_notes: values.notes || null,
    }),
    'Reservation created and cleaning scheduled.',
  ), [mutate]);

  const updateUnitStatus = useCallback((unitId: string, status: string) => mutate(
    () => db.from('units').update({ operational_status: status }).eq('id', unitId),
    'Unit status updated.',
  ), [mutate]);

  const updateReservation = useCallback((id: string, values: Record<string, unknown>, message = 'Reservation updated.') => mutate(
    () => db.from('reservations').update(values).eq('id', id),
    message,
  ), [mutate]);

  const updateCleaning = useCallback((id: string, values: Record<string, unknown>, message: string) => mutate(
    () => db.from('cleaning_tasks').update(values).eq('id', id),
    message,
  ), [mutate]);

  const assignCleaner = useCallback((id: string, cleaner: CleanerAssignee | null) => mutate(
    async () => {
      const result = await db.from('cleaning_tasks').update(cleaner ? {
        assigned_cleaner_user_id: cleaner.user_id,
        assigned_cleaner_name: cleaner.display_name || cleaner.email || 'Cleaner',
        assigned_cleaner_email: cleaner.email || null,
        status: 'awaiting_confirmation',
        confirmation_status: 'pending',
        confirmed_at: null,
        declined_at: null,
      } : {
        assigned_cleaner_user_id: null,
        assigned_cleaner_name: null,
        assigned_cleaner_email: null,
        status: 'needs_scheduling',
        confirmation_status: 'not_requested',
        confirmed_at: null,
        declined_at: null,
      }).eq('id', id);
      if (!result.error && cleaner?.email) {
        const dispatch = await supabase.functions.invoke('operations-dispatch', { body: {} });
        if (dispatch.error) {
          console.warn('The cleaning was assigned, but outbound delivery is waiting for the next dispatch.', dispatch.error);
        }
      }
      return result;
    },
    cleaner ? `Cleaning assigned to ${cleaner.display_name || cleaner.email || 'cleaner'}.` : 'Cleaner assignment removed.',
  ), [mutate]);

  const verifyCleaning = useCallback((id: string, checklist: Record<string, boolean>) => mutate(
    () => db.from('cleaning_tasks').update({
      readiness_checklist: checklist,
      readiness_verification_status: 'passed',
      status: 'ready',
    }).eq('id', id),
    'Readiness verified. The unit is ready.',
  ), [mutate]);

  const completeTask = useCallback((id: string) => mutate(
    () => db.from('operational_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id),
    'Task completed.',
  ), [mutate]);

  const saveChecklist = useCallback(async (
    type: ChecklistRun['checklist_type'],
    items: ChecklistRun['items'],
    complete: boolean,
    escalationNotes = '',
  ) => mutate(
    () => db.from('checklist_runs').upsert({
      checklist_type: type,
      checklist_date: localDateKey(),
      items,
      completed_at: complete ? new Date().toISOString() : null,
      escalation_notes: escalationNotes || null,
    }, { onConflict: 'checklist_type,checklist_date,user_id' }),
    complete ? 'Checklist completed.' : 'Checklist progress saved.',
  ), [mutate]);

  const issueCleanerLink = useCallback(async (cleaningTaskId: string) => {
    const { data, error } = await supabase.functions.invoke('cleaner-task-access', {
      body: { action: 'issue', cleaningTaskId },
    });
    if (error || data?.error || !data?.url) {
      toast.error(data?.error ?? error?.message ?? 'The cleaner link could not be created.');
      return null;
    }
    try {
      await navigator.clipboard.writeText(data.url);
      toast.success('Secure cleaner link copied. It expires in 14 days.');
    } catch {
      toast.success('Secure cleaner link created.');
    }
    return data.url as string;
  }, []);

  const getCleaningPhotoUrls = useCallback(async (paths: string[]) => {
    if (!paths.length) return [];
    const { data, error } = await supabase.storage
      .from('cleaning-photos')
      .createSignedUrls(paths, 30 * 60);
    if (error) throw error;
    return (data ?? [])
      .map((item, index) => ({
        path: paths[index],
        signedUrl: item.signedUrl,
      }))
      .filter((item): item is { path: string; signedUrl: string } => Boolean(item.path && item.signedUrl));
  }, []);

  const assignVendor = useCallback((maintenanceRequestId: string, vendorId: string | null) => mutate(
    () => db.from('maintenance_requests').update({
      vendor_id: vendorId,
      vendor_contacted_at: vendorId ? new Date().toISOString() : null,
    }).eq('id', maintenanceRequestId),
    vendorId ? 'Vendor assigned.' : 'Vendor assignment cleared.',
  ), [mutate]);

  const decideApproval = useCallback((
    approvalRequestId: string,
    decision: 'approved' | 'denied',
    reason = '',
  ) => mutate(
    () => db.rpc('decide_approval_request', {
      _approval_request_id: approvalRequestId,
      _decision: decision,
      _decision_reason: reason || null,
    }),
    decision === 'approved' ? 'Approval granted.' : 'Approval denied.',
  ), [mutate]);

  const createVendor = useCallback((values: {
    name: string;
    company: string;
    trade: string;
    phone: string;
    email: string;
    vendorRank: 'primary' | 'backup';
    emergencyAvailability: boolean;
    smsConsentConfirmed: boolean;
  }) => mutate(
    () => db.from('vendors').insert({
      name: values.name,
      company: values.company || null,
      trade: values.trade,
      phone: values.phone || null,
      email: values.email || null,
      vendor_rank: values.vendorRank,
      emergency_availability: values.emergencyAvailability,
      preferred_contact_method: values.smsConsentConfirmed ? 'text' : 'phone',
      sms_consent_status: values.smsConsentConfirmed ? 'consented' : 'unknown',
      sms_consent_at: values.smsConsentConfirmed ? new Date().toISOString() : null,
    }),
    'Vendor added.',
  ), [mutate]);

  const summary = useMemo(
    () => summarizeOperations(reservations, cleanings, maintenance, tasks),
    [reservations, cleanings, maintenance, tasks],
  );

  return {
    units,
    reservations,
    cleanings,
    maintenance,
    tasks,
    approvals,
    activity,
    vendors,
    checklists,
    cleaners,
    loading,
    schemaReady,
    summary,
    refresh,
    createReservation,
    updateUnitStatus,
    updateReservation,
    updateCleaning,
    assignCleaner,
    verifyCleaning,
    completeTask,
    saveChecklist,
    issueCleanerLink,
    getCleaningPhotoUrls,
    assignVendor,
    decideApproval,
    createVendor,
  };
}
