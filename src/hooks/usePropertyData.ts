import { useState, useEffect, useCallback } from 'react';
import { Unit, Guest, Payment } from '@/types/property';

const STORAGE_KEY = 'homestead-hill-data';

const generateId = () => crypto.randomUUID();

const defaultUnits: Unit[] = [
  {
    id: generateId(),
    name: 'Unit A',
    isVacant: false,
    currentGuest: {
      name: 'Sarah Johnson',
      source: 'furnished_finder',
      checkIn: '2025-12-01',
      checkOut: '2026-05-31',
      monthlyRate: 1800,
      securityDeposit: 1800,
      securityDepositPaid: true,
      payments: [
        { id: generateId(), amount: 1800, date: '2026-02-01', status: 'paid', note: 'February rent' },
        { id: generateId(), amount: 1800, date: '2026-01-01', status: 'paid', note: 'January rent' },
        { id: generateId(), amount: 1800, date: '2025-12-01', status: 'paid', note: 'December rent' },
      ],
    },
  },
  {
    id: generateId(),
    name: 'Unit B',
    isVacant: false,
    currentGuest: {
      name: 'Marcus Lee',
      source: 'airbnb',
      checkIn: '2026-01-15',
      checkOut: '2026-03-15',
      monthlyRate: 2200,
      securityDeposit: 0,
      securityDepositPaid: false,
      payments: [
        { id: generateId(), amount: 2200, date: '2026-02-15', status: 'upcoming', note: 'Airbnb payout' },
        { id: generateId(), amount: 2200, date: '2026-01-15', status: 'paid', note: 'Airbnb payout' },
      ],
    },
  },
  {
    id: generateId(),
    name: 'Unit C',
    isVacant: true,
    currentGuest: null,
  },
  {
    id: generateId(),
    name: 'Unit D',
    isVacant: false,
    currentGuest: {
      name: 'Emily & Tom Rodriguez',
      source: 'direct',
      checkIn: '2025-11-01',
      checkOut: '2026-10-31',
      monthlyRate: 1650,
      securityDeposit: 2000,
      securityDepositPaid: true,
      payments: [
        { id: generateId(), amount: 1650, date: '2026-03-01', status: 'upcoming', note: 'March rent' },
        { id: generateId(), amount: 1650, date: '2026-02-01', status: 'paid', note: 'February rent' },
        { id: generateId(), amount: 1650, date: '2026-01-01', status: 'paid', note: 'January rent' },
      ],
    },
  },
];

function loadData(): Unit[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return defaultUnits;
}

function saveData(units: Unit[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
}

export function usePropertyData() {
  const [units, setUnits] = useState<Unit[]>(loadData);

  useEffect(() => {
    saveData(units);
  }, [units]);

  const addUnit = useCallback((name: string) => {
    setUnits(prev => [...prev, { id: generateId(), name, isVacant: true, currentGuest: null }]);
  }, []);

  const removeUnit = useCallback((unitId: string) => {
    setUnits(prev => prev.filter(u => u.id !== unitId));
  }, []);

  const addGuest = useCallback((unitId: string, guest: Guest) => {
    setUnits(prev =>
      prev.map(u =>
        u.id === unitId ? { ...u, currentGuest: guest, isVacant: false } : u
      )
    );
  }, []);

  const removeGuest = useCallback((unitId: string) => {
    setUnits(prev =>
      prev.map(u =>
        u.id === unitId ? { ...u, currentGuest: null, isVacant: true } : u
      )
    );
  }, []);

  const addPayment = useCallback((unitId: string, payment: Payment) => {
    setUnits(prev =>
      prev.map(u => {
        if (u.id !== unitId || !u.currentGuest) return u;
        return {
          ...u,
          currentGuest: {
            ...u.currentGuest,
            payments: [payment, ...u.currentGuest.payments],
          },
        };
      })
    );
  }, []);

  const markPaymentPaid = useCallback((unitId: string, paymentId: string) => {
    setUnits(prev =>
      prev.map(u => {
        if (u.id !== unitId || !u.currentGuest) return u;
        return {
          ...u,
          currentGuest: {
            ...u.currentGuest,
            payments: u.currentGuest.payments.map(p =>
              p.id === paymentId ? { ...p, status: 'paid' as const, date: new Date().toISOString().split('T')[0] } : p
            ),
          },
        };
      })
    );
  }, []);

  // Computed stats
  const totalMonthlyIncome = units.reduce((sum, u) => sum + (u.currentGuest?.monthlyRate ?? 0), 0);
  const occupiedUnits = units.filter(u => !u.isVacant).length;
  const vacantUnits = units.filter(u => u.isVacant).length;
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
    .filter(u => u.currentGuest)
    .map(u => ({ unitName: u.name, checkOut: u.currentGuest!.checkOut }))
    .sort((a, b) => a.checkOut.localeCompare(b.checkOut))[0];

  return {
    units,
    addUnit,
    removeUnit,
    addGuest,
    removeGuest,
    addPayment,
    markPaymentPaid,
    stats: {
      totalMonthlyIncome,
      occupiedUnits,
      vacantUnits,
      totalDepositsHeld,
      upcomingPayments,
      nextVacancy,
    },
  };
}
