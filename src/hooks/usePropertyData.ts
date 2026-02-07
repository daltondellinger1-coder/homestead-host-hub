import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Unit, Guest, FutureGuest, Payment, UnitStatus, BookingSource } from '@/types/property';
import { Tables } from '@/integrations/supabase/types';

type DbUnit = Tables<'units'>;
type DbGuest = Tables<'guests'>;
type DbPayment = Tables<'payments'>;

/**
 * Transforms DB rows into the frontend Unit shape (with embedded guest + payments).
 */
function assembleUnits(
  dbUnits: DbUnit[],
  dbGuests: DbGuest[],
  dbPayments: DbPayment[],
): (Unit & { _guestDbId?: string })[] {
  const paymentsByGuest = new Map<string, Payment[]>();
  for (const p of dbPayments) {
    const list = paymentsByGuest.get(p.guest_id) ?? [];
    list.push({
      id: p.id,
      amount: Number(p.amount),
      date: p.date,
      status: p.status,
      note: p.note ?? undefined,
    });
    paymentsByGuest.set(p.guest_id, list);
  }

  const currentGuestByUnit = new Map<string, Guest & { dbId: string }>();
  const futureGuestsByUnit = new Map<string, FutureGuest[]>();

  for (const g of dbGuests) {
    const guestData = {
      dbId: g.id,
      id: g.id,
      name: g.name,
      source: g.source as BookingSource,
      checkIn: g.check_in,
      checkOut: g.check_out ?? '',
      monthlyRate: Number(g.monthly_rate),
      securityDeposit: Number(g.security_deposit),
      securityDepositPaid: g.security_deposit_paid,
      payments: paymentsByGuest.get(g.id) ?? [],
      notes: g.notes ?? undefined,
    };

    if (g.is_current) {
      currentGuestByUnit.set(g.unit_id, guestData);
    } else {
      const list = futureGuestsByUnit.get(g.unit_id) ?? [];
      list.push(guestData);
      futureGuestsByUnit.set(g.unit_id, list);
    }
  }

  return dbUnits
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(u => {
      const guest = currentGuestByUnit.get(u.id);
      const futureGuests = (futureGuestsByUnit.get(u.id) ?? [])
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
      return {
        id: u.id,
        name: u.name,
        status: u.status as UnitStatus,
        currentGuest: guest ? { ...guest, dbId: undefined, id: undefined } as unknown as Guest : null,
        futureGuests,
        _guestDbId: guest?.dbId,
      } as (Unit & { _guestDbId?: string });
    });
}

export function usePropertyData() {
  const [dbUnits, setDbUnits] = useState<DbUnit[]>([]);
  const [dbGuests, setDbGuests] = useState<DbGuest[]>([]);
  const [dbPayments, setDbPayments] = useState<DbPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data (RLS filters by user_id automatically)
  const fetchAll = useCallback(async () => {
    const [unitsRes, guestsRes, paymentsRes] = await Promise.all([
      supabase.from('units').select('*'),
      supabase.from('guests').select('*'),
      supabase.from('payments').select('*'),
    ]);

    if (unitsRes.data) setDbUnits(unitsRes.data);
    if (guestsRes.data) setDbGuests(guestsRes.data);
    if (paymentsRes.data) setDbPayments(paymentsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('property-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setDbUnits(prev => {
            const newUnit = payload.new as DbUnit;
            return prev.some(u => u.id === newUnit.id) ? prev : [...prev, newUnit];
          });
        } else if (payload.eventType === 'UPDATE') {
          setDbUnits(prev => prev.map(u => u.id === (payload.new as DbUnit).id ? payload.new as DbUnit : u));
        } else if (payload.eventType === 'DELETE') {
          setDbUnits(prev => prev.filter(u => u.id !== (payload.old as { id: string }).id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, (payload) => {
        const newGuest = payload.new as DbGuest;
        const oldGuest = payload.old as { id: string };
        if (payload.eventType === 'INSERT') {
          setDbGuests(prev => prev.some(g => g.id === newGuest.id) ? prev : [...prev, newGuest]);
        } else if (payload.eventType === 'UPDATE') {
          setDbGuests(prev => {
            const exists = prev.some(g => g.id === newGuest.id);
            return exists ? prev.map(g => g.id === newGuest.id ? newGuest : g) : [...prev, newGuest];
          });
        } else if (payload.eventType === 'DELETE') {
          setDbGuests(prev => prev.filter(g => g.id !== oldGuest.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setDbPayments(prev => {
            const newPayment = payload.new as DbPayment;
            return prev.some(p => p.id === newPayment.id) ? prev : [newPayment, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          setDbPayments(prev => prev.map(p => p.id === (payload.new as DbPayment).id ? payload.new as DbPayment : p));
        } else if (payload.eventType === 'DELETE') {
          setDbPayments(prev => prev.filter(p => p.id !== (payload.old as { id: string }).id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  // Assemble frontend shape
  const units = useMemo(
    () => assembleUnits(dbUnits, dbGuests, dbPayments),
    [dbUnits, dbGuests, dbPayments],
  );

  // Map unit id → guest db id for payment operations
  const guestIdByUnit = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of dbGuests) {
      if (g.is_current) m.set(g.unit_id, g.id);
    }
    return m;
  }, [dbGuests]);

  const addUnit = useCallback(async (name: string, status: UnitStatus = 'vacant') => {
    const maxOrder = dbUnits.reduce((max, u) => Math.max(max, u.sort_order), 0);
    const { data } = await supabase
      .from('units')
      .insert({ name, status, sort_order: maxOrder + 1 })
      .select()
      .single();
    if (data) setDbUnits(prev => [...prev, data]);
  }, [dbUnits]);

  const updateUnit = useCallback(async (unitId: string, name: string, status: UnitStatus) => {
    const { data } = await supabase
      .from('units')
      .update({ name, status })
      .eq('id', unitId)
      .select()
      .single();
    if (data) setDbUnits(prev => prev.map(u => u.id === unitId ? data : u));
  }, []);

  const reorderUnits = useCallback(async (activeId: string, overId: string) => {
    const oldIndex = dbUnits.findIndex(u => u.id === activeId);
    const newIndex = dbUnits.findIndex(u => u.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder locally first for instant feedback
    const reordered = [...dbUnits].sort((a, b) => a.sort_order - b.sort_order);
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Assign new sort_order values
    const updated = reordered.map((u, i) => ({ ...u, sort_order: i }));
    setDbUnits(updated);

    // Persist to DB
    await Promise.all(
      updated.map(u =>
        supabase.from('units').update({ sort_order: u.sort_order }).eq('id', u.id)
      )
    );
  }, [dbUnits]);

  const removeUnit = useCallback(async (unitId: string) => {
    await supabase.from('units').delete().eq('id', unitId);
    setDbUnits(prev => prev.filter(u => u.id !== unitId));
    setDbGuests(prev => prev.filter(g => g.unit_id !== unitId));
    setDbPayments(prev => prev.filter(p => p.unit_id !== unitId));
  }, []);

  const addGuest = useCallback(async (unitId: string, guest: Guest) => {
    const unitStatus: UnitStatus = guest.source === 'long_term' ? 'rented' : 'occupied';

    // Insert guest
    const { data: guestData } = await supabase
      .from('guests')
      .insert({
        unit_id: unitId,
        name: guest.name,
        source: guest.source,
        check_in: guest.checkIn,
        check_out: guest.checkOut || null,
        monthly_rate: guest.monthlyRate,
        security_deposit: guest.securityDeposit,
        security_deposit_paid: guest.securityDepositPaid,
        notes: guest.notes || null,
        is_current: true,
      })
      .select()
      .single();

    // Update unit status
    const { data: unitData } = await supabase
      .from('units')
      .update({ status: unitStatus })
      .eq('id', unitId)
      .select()
      .single();

    if (guestData) setDbGuests(prev => [...prev, guestData]);
    if (unitData) setDbUnits(prev => prev.map(u => u.id === unitId ? unitData : u));
  }, []);

  const addFutureGuest = useCallback(async (unitId: string, guest: Guest) => {
    const { data: guestData } = await supabase
      .from('guests')
      .insert({
        unit_id: unitId,
        name: guest.name,
        source: guest.source,
        check_in: guest.checkIn,
        check_out: guest.checkOut || null,
        monthly_rate: guest.monthlyRate,
        security_deposit: guest.securityDeposit,
        security_deposit_paid: guest.securityDepositPaid,
        notes: guest.notes || null,
        is_current: false,
      })
      .select()
      .single();

    if (guestData) setDbGuests(prev => [...prev, guestData]);
  }, []);

  const updateGuest = useCallback(async (unitId: string, guest: Guest) => {
    const guestId = guestIdByUnit.get(unitId);
    if (!guestId) return;

    const unitStatus: UnitStatus = guest.source === 'long_term' ? 'rented' : 'occupied';

    const { data: guestData } = await supabase
      .from('guests')
      .update({
        name: guest.name,
        source: guest.source,
        check_in: guest.checkIn,
        check_out: guest.checkOut || null,
        monthly_rate: guest.monthlyRate,
        security_deposit: guest.securityDeposit,
        security_deposit_paid: guest.securityDepositPaid,
        notes: guest.notes || null,
      })
      .eq('id', guestId)
      .select()
      .single();

    const { data: unitData } = await supabase
      .from('units')
      .update({ status: unitStatus })
      .eq('id', unitId)
      .select()
      .single();

    if (guestData) setDbGuests(prev => prev.map(g => g.id === guestId ? guestData : g));
    if (unitData) setDbUnits(prev => prev.map(u => u.id === unitId ? unitData : u));
  }, [guestIdByUnit]);

  const removeGuest = useCallback(async (unitId: string) => {
    const guestId = guestIdByUnit.get(unitId);
    if (!guestId) return;

    // Mark guest as no longer current
    await supabase.from('guests').update({ is_current: false }).eq('id', guestId);

    // Set unit to vacant
    const { data: unitData } = await supabase
      .from('units')
      .update({ status: 'vacant' as UnitStatus })
      .eq('id', unitId)
      .select()
      .single();

    setDbGuests(prev => prev.filter(g => g.id !== guestId));
    setDbPayments(prev => prev.filter(p => p.guest_id !== guestId));
    if (unitData) setDbUnits(prev => prev.map(u => u.id === unitId ? unitData : u));
  }, [guestIdByUnit]);

  const addPayment = useCallback(async (unitId: string, payment: Payment) => {
    const guestId = guestIdByUnit.get(unitId);
    if (!guestId) return;

    const { data } = await supabase
      .from('payments')
      .insert({
        guest_id: guestId,
        unit_id: unitId,
        amount: payment.amount,
        date: payment.date,
        status: payment.status,
        note: payment.note || null,
      })
      .select()
      .single();

    if (data) setDbPayments(prev => [data, ...prev]);
  }, [guestIdByUnit]);

  const markPaymentPaid = useCallback(async (unitId: string, paymentId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('payments')
      .update({ status: 'paid' as const, date: today })
      .eq('id', paymentId)
      .select()
      .single();

    if (data) setDbPayments(prev => prev.map(p => p.id === paymentId ? data : p));
  }, []);

  const updatePayment = useCallback(async (paymentId: string, updates: { amount?: number; date?: string; note?: string; status?: Payment['status'] }) => {
    const { data } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', paymentId)
      .select()
      .single();

    if (data) setDbPayments(prev => prev.map(p => p.id === paymentId ? data : p));
  }, []);

  const deletePayment = useCallback(async (paymentId: string) => {
    await supabase.from('payments').delete().eq('id', paymentId);
    setDbPayments(prev => prev.filter(p => p.id !== paymentId));
  }, []);

  const bulkDeletePayments = useCallback(async (paymentIds: string[]) => {
    if (paymentIds.length === 0) return;
    const batchSize = 50;
    for (let i = 0; i < paymentIds.length; i += batchSize) {
      const batch = paymentIds.slice(i, i + batchSize);
      await supabase.from('payments').delete().in('id', batch);
    }
    setDbPayments(prev => prev.filter(p => !paymentIds.includes(p.id)));
  }, []);

  const resetAllData = useCallback(async () => {
    // Delete in order: payments → guests → units (respects foreign keys)
    await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('guests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('units').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setDbPayments([]);
    setDbGuests([]);
    setDbUnits([]);
  }, []);

  // Computed stats
  const occupiedUnits = units.filter(u => u.status === 'occupied' || u.status === 'rented');
  const totalMonthlyIncome = occupiedUnits.reduce((sum, u) => sum + (u.currentGuest?.monthlyRate ?? 0), 0);
  const vacantCount = units.filter(u => u.status === 'vacant').length;
  const totalDepositsHeld = units.reduce((sum, u) => {
    if (u.currentGuest?.securityDepositPaid) return sum + u.currentGuest.securityDeposit;
    return sum;
  }, 0);

  const upcomingPayments = units
    .filter(u => u.currentGuest)
    .flatMap(u =>
      (u.currentGuest?.payments ?? [])
        .filter(p => p.status === 'upcoming' || p.status === 'pending')
        .map(p => ({ ...p, unitName: u.name, guestName: u.currentGuest!.name }))
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const nextVacancy = units
    .filter(u => u.currentGuest && u.currentGuest.checkOut)
    .map(u => ({ unitName: u.name, checkOut: u.currentGuest!.checkOut }))
    .sort((a, b) => a.checkOut.localeCompare(b.checkOut))[0];

  const allPaymentEvents = units
    .filter(u => u.currentGuest)
    .flatMap(u =>
      (u.currentGuest?.payments ?? []).map(p => ({
        ...p,
        unitId: u.id,
        unitName: u.name,
        guestName: u.currentGuest!.name,
        source: u.currentGuest!.source,
      }))
    );

  const allBookingEvents = units
    .flatMap(u => {
      const events: { type: 'checkin' | 'checkout'; date: string; unitId: string; unitName: string; guestName: string; source: BookingSource; isFuture?: boolean }[] = [];
      // Current guest events
      if (u.currentGuest) {
        const g = u.currentGuest;
        if (g.checkIn) events.push({ type: 'checkin', date: g.checkIn, unitId: u.id, unitName: u.name, guestName: g.name, source: g.source });
        if (g.checkOut) events.push({ type: 'checkout', date: g.checkOut, unitId: u.id, unitName: u.name, guestName: g.name, source: g.source });
      }
      // Future guest events
      for (const fg of u.futureGuests) {
        if (fg.checkIn) events.push({ type: 'checkin', date: fg.checkIn, unitId: u.id, unitName: u.name, guestName: fg.name, source: fg.source, isFuture: true });
        if (fg.checkOut) events.push({ type: 'checkout', date: fg.checkOut, unitId: u.id, unitName: u.name, guestName: fg.name, source: fg.source, isFuture: true });
      }
      return events;
    });

  return {
    units,
    loading,
    refresh: fetchAll,
    addUnit,
    updateUnit,
    reorderUnits,
    removeUnit,
    addGuest,
    addFutureGuest,
    updateGuest,
    removeGuest,
    addPayment,
    markPaymentPaid,
    updatePayment,
    deletePayment,
    bulkDeletePayments,
    resetAllData,
    stats: {
      totalMonthlyIncome,
      occupiedCount: occupiedUnits.length,
      vacantCount,
      totalUnits: units.length,
      totalDepositsHeld,
      upcomingPayments,
      nextVacancy,
    },
    allPaymentEvents,
    allBookingEvents,
  };
}
