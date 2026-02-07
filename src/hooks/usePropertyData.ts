import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Unit, Guest, Payment, UnitStatus, BookingSource } from '@/types/property';
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
): Unit[] {
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

  const guestByUnit = new Map<string, Guest & { dbId: string }>();
  for (const g of dbGuests) {
    if (!g.is_current) continue;
    guestByUnit.set(g.unit_id, {
      dbId: g.id,
      name: g.name,
      source: g.source as BookingSource,
      checkIn: g.check_in,
      checkOut: g.check_out ?? '',
      monthlyRate: Number(g.monthly_rate),
      securityDeposit: Number(g.security_deposit),
      securityDepositPaid: g.security_deposit_paid,
      payments: paymentsByGuest.get(g.id) ?? [],
      notes: g.notes ?? undefined,
    });
  }

  return dbUnits
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(u => {
      const guest = guestByUnit.get(u.id);
      return {
        id: u.id,
        name: u.name,
        status: u.status as UnitStatus,
        currentGuest: guest ? { ...guest, dbId: undefined } as unknown as Guest : null,
        _guestDbId: guest?.dbId,
      } as Unit & { _guestDbId?: string };
    });
}

export function usePropertyData() {
  const { user } = useAuth();
  const [dbUnits, setDbUnits] = useState<DbUnit[]>([]);
  const [dbGuests, setDbGuests] = useState<DbGuest[]>([]);
  const [dbPayments, setDbPayments] = useState<DbPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data (RLS filters by user_id automatically)
  const fetchAll = useCallback(async () => {
    const [unitsRes, guestsRes, paymentsRes] = await Promise.all([
      supabase.from('units').select('*'),
      supabase.from('guests').select('*').eq('is_current', true),
      supabase.from('payments').select('*'),
    ]);

    if (unitsRes.data) setDbUnits(unitsRes.data);
    if (guestsRes.data) setDbGuests(guestsRes.data);
    if (paymentsRes.data) setDbPayments(paymentsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
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
    if (!user) return;
    const maxOrder = dbUnits.reduce((max, u) => Math.max(max, u.sort_order), 0);
    const { data } = await supabase
      .from('units')
      .insert({ name, status, sort_order: maxOrder + 1, user_id: user.id })
      .select()
      .single();
    if (data) setDbUnits(prev => [...prev, data]);
  }, [dbUnits, user]);

  const removeUnit = useCallback(async (unitId: string) => {
    await supabase.from('units').delete().eq('id', unitId);
    setDbUnits(prev => prev.filter(u => u.id !== unitId));
    setDbGuests(prev => prev.filter(g => g.unit_id !== unitId));
    setDbPayments(prev => prev.filter(p => p.unit_id !== unitId));
  }, []);

  const addGuest = useCallback(async (unitId: string, guest: Guest) => {
    if (!user) return;
    const unitStatus: UnitStatus = guest.source === 'long_term' ? 'rented' : 'occupied';

    // Insert guest
    const { data: guestData } = await supabase
      .from('guests')
      .insert({
        unit_id: unitId,
        user_id: user.id,
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
  }, [user]);

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
    if (!user) return;
    const guestId = guestIdByUnit.get(unitId);
    if (!guestId) return;

    const { data } = await supabase
      .from('payments')
      .insert({
        guest_id: guestId,
        unit_id: unitId,
        user_id: user.id,
        amount: payment.amount,
        date: payment.date,
        status: payment.status,
        note: payment.note || null,
      })
      .select()
      .single();

    if (data) setDbPayments(prev => [data, ...prev]);
  }, [guestIdByUnit, user]);

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
    .filter(u => u.currentGuest)
    .flatMap(u => {
      const g = u.currentGuest!;
      const events: { type: 'checkin' | 'checkout'; date: string; unitId: string; unitName: string; guestName: string; source: typeof g.source }[] = [];
      if (g.checkIn) events.push({ type: 'checkin', date: g.checkIn, unitId: u.id, unitName: u.name, guestName: g.name, source: g.source });
      if (g.checkOut) events.push({ type: 'checkout', date: g.checkOut, unitId: u.id, unitName: u.name, guestName: g.name, source: g.source });
      return events;
    });

  return {
    units,
    loading,
    addUnit,
    removeUnit,
    addGuest,
    updateGuest,
    removeGuest,
    addPayment,
    markPaymentPaid,
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
