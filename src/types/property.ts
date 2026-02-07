export type BookingSource = 'airbnb' | 'furnished_finder' | 'direct' | 'other';

export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'upcoming';

export interface Payment {
  id: string;
  amount: number;
  date: string; // ISO date
  status: PaymentStatus;
  note?: string;
}

export interface Guest {
  name: string;
  source: BookingSource;
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  monthlyRate: number;
  securityDeposit: number;
  securityDepositPaid: boolean;
  payments: Payment[];
}

export interface Unit {
  id: string;
  name: string;
  currentGuest: Guest | null;
  isVacant: boolean;
}

export const SOURCE_LABELS: Record<BookingSource, string> = {
  airbnb: 'Airbnb',
  furnished_finder: 'Furnished Finder',
  direct: 'Direct Booking',
  other: 'Other',
};
