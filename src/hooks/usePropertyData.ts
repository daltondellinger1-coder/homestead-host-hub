import { useState, useEffect, useCallback } from 'react';
import { Unit, Guest, Payment, UnitStatus } from '@/types/property';

const STORAGE_KEY = 'homestead-hill-data';

const generateId = () => crypto.randomUUID();

const defaultUnits: Unit[] = [
  {
    id: generateId(),
    name: 'Unit 1',
    status: 'occupied',
    currentGuest: {
      name: 'John Timmerman',
      source: 'airbnb',
      checkIn: '2026-01-03',
      checkOut: '2026-05-02',
      monthlyRate: 1336.53,
      securityDeposit: 0,
      securityDepositPaid: false,
      payments: [
        { id: generateId(), amount: 1207.18, date: '2026-02-04', status: 'paid', note: 'Last payout' },
        { id: generateId(), amount: 1336.53, date: '2026-03-04', status: 'upcoming', note: 'Next payout' },
      ],
    },
  },
  {
    id: generateId(),
    name: 'Unit 2',
    status: 'occupied',
    currentGuest: {
      name: 'Austin',
      source: 'airbnb',
      checkIn: '2026-01-11',
      checkOut: '2026-03-14',
      monthlyRate: 1059.77,
      securityDeposit: 0,
      securityDepositPaid: false,
      payments: [
        { id: generateId(), amount: 1059.77, date: '2026-01-12', status: 'paid', note: 'January payout' },
        { id: generateId(), amount: 1059.77, date: '2026-02-12', status: 'upcoming', note: 'February payout' },
      ],
    },
  },
  {
    id: generateId(),
    name: 'Unit 3',
    status: 'occupied',
    currentGuest: {
      name: 'Khushali',
      source: 'furnished_finder',
      checkIn: '2025-09-08',
      checkOut: '2026-02-28',
      monthlyRate: 1400,
      securityDeposit: 700,
      securityDepositPaid: true,
      payments: [
        { id: generateId(), amount: 1400, date: '2026-02-04', status: 'paid', note: 'February rent' },
        { id: generateId(), amount: 1400, date: '2026-03-01', status: 'upcoming', note: 'March rent' },
      ],
      notes: 'Paid $700 Deposit',
    },
  },
  {
    id: generateId(),
    name: 'Unit 4',
    status: 'occupied',
    currentGuest: {
      name: 'Jason',
      source: 'airbnb',
      checkIn: '2026-01-10',
      checkOut: '2026-05-31',
      monthlyRate: 1333.78,
      securityDeposit: 0,
      securityDepositPaid: false,
      payments: [
        { id: generateId(), amount: 1333.78, date: '2026-01-11', status: 'paid', note: 'January payout' },
        { id: generateId(), amount: 1333.78, date: '2026-02-11', status: 'upcoming', note: 'February payout' },
      ],
    },
  },
  {
    id: generateId(),
    name: 'Unit 5',
    status: 'occupied',
    currentGuest: {
      name: 'Kevin',
      source: 'furnished_finder',
      checkIn: '2025-05-05',
      checkOut: '2026-02-15',
      monthlyRate: 500,
      securityDeposit: 800,
      securityDepositPaid: true,
      payments: [
        { id: generateId(), amount: 799.16, date: '2026-02-01', status: 'paid', note: 'February rent' },
        { id: generateId(), amount: 500, date: '2026-02-21', status: 'upcoming', note: 'Next payment' },
      ],
      notes: 'Kevin paid $800 deposit on 4/21/25',
    },
  },
  {
    id: generateId(),
    name: 'Unit 6',
    status: 'occupied',
    currentGuest: {
      name: 'Igor',
      source: 'airbnb',
      checkIn: '2026-01-10',
      checkOut: '2026-05-17',
      monthlyRate: 1436.53,
      securityDeposit: 0,
      securityDepositPaid: false,
      payments: [
        { id: generateId(), amount: 1590.44, date: '2026-01-11', status: 'paid', note: 'January payout' },
        { id: generateId(), amount: 1436.53, date: '2026-02-11', status: 'upcoming', note: 'February payout' },
      ],
    },
  },
  {
    id: generateId(),
    name: 'Unit 7',
    status: 'vacant',
    currentGuest: null,
  },
  {
    id: generateId(),
    name: 'Unit 8',
    status: 'rented',
    currentGuest: {
      name: 'Ann',
      source: 'long_term',
      checkIn: '2023-02-01',
      checkOut: '',
      monthlyRate: 480,
      securityDeposit: 0,
      securityDepositPaid: false,
      payments: [
        { id: generateId(), amount: 480, date: '2025-12-05', status: 'paid', note: 'December rent' },
        { id: generateId(), amount: 480, date: '2026-01-01', status: 'upcoming', note: 'January rent' },
      ],
      notes: 'Does month by month lease',
    },
  },
  {
    id: generateId(),
    name: 'Unit 9',
    status: 'planning',
    currentGuest: null,
  },
  {
    id: generateId(),
    name: 'Unit 10',
    status: 'rented',
    currentGuest: {
      name: 'Roy',
      source: 'long_term',
      checkIn: '2025-01-01',
      checkOut: '',
      monthlyRate: 500,
      securityDeposit: 0,
      securityDepositPaid: false,
      payments: [
        { id: generateId(), amount: 500, date: '2026-01-01', status: 'paid', note: 'January rent' },
        { id: generateId(), amount: 500, date: '2026-02-01', status: 'upcoming', note: 'February rent' },
      ],
    },
  },
  {
    id: generateId(),
    name: 'Unit 11',
    status: 'occupied',
    currentGuest: {
      name: 'Kylie',
      source: 'airbnb',
      checkIn: '2025-12-31',
      checkOut: '2026-03-02',
      monthlyRate: 1318.92,
      securityDeposit: 0,
      securityDepositPaid: false,
      payments: [
        { id: generateId(), amount: 1318.92, date: '2026-01-01', status: 'paid', note: 'January payout' },
      ],
    },
  },
  {
    id: generateId(),
    name: 'Unit 12',
    status: 'storage',
    currentGuest: null,
  },
  {
    id: generateId(),
    name: 'Unit 13',
    status: 'occupied',
    currentGuest: {
      name: 'Guyline',
      source: 'lease',
      checkIn: '2024-08-09',
      checkOut: '2026-03-15',
      monthlyRate: 1400,
      securityDeposit: 750,
      securityDepositPaid: true,
      payments: [
        { id: generateId(), amount: 1400, date: '2026-01-11', status: 'paid', note: 'January rent' },
        { id: generateId(), amount: 1400, date: '2026-02-10', status: 'upcoming', note: 'February rent' },
      ],
      notes: 'Guyline paid $750 deposit',
    },
  },
  {
    id: generateId(),
    name: 'Unit 14',
    status: 'storage',
    currentGuest: null,
  },
  {
    id: generateId(),
    name: 'Unit 15',
    status: 'planning',
    currentGuest: null,
  },
];

function loadData(): Unit[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check if it's the old data format (has isVacant) and reset
      if (parsed.length > 0 && 'isVacant' in parsed[0]) {
        localStorage.removeItem(STORAGE_KEY);
        return defaultUnits;
      }
      return parsed;
    }
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

  const addUnit = useCallback((name: string, status: UnitStatus = 'vacant') => {
    setUnits(prev => [...prev, { id: generateId(), name, status, currentGuest: null }]);
  }, []);

  const removeUnit = useCallback((unitId: string) => {
    setUnits(prev => prev.filter(u => u.id !== unitId));
  }, []);

  const addGuest = useCallback((unitId: string, guest: Guest) => {
    setUnits(prev =>
      prev.map(u =>
        u.id === unitId ? { ...u, currentGuest: guest, status: guest.source === 'long_term' ? 'rented' : 'occupied' as UnitStatus } : u
      )
    );
  }, []);

  const updateGuest = useCallback((unitId: string, guest: Guest) => {
    setUnits(prev =>
      prev.map(u =>
        u.id === unitId ? { ...u, currentGuest: guest, status: guest.source === 'long_term' ? 'rented' : 'occupied' as UnitStatus } : u
      )
    );
  }, []);

  const removeGuest = useCallback((unitId: string) => {
    setUnits(prev =>
      prev.map(u =>
        u.id === unitId ? { ...u, currentGuest: null, status: 'vacant' as UnitStatus } : u
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

  // All payment events for calendar
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

  return {
    units,
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
  };
}
