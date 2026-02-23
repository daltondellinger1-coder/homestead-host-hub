export type BookingSource = 'airbnb' | 'furnished_finder' | 'direct' | 'long_term' | 'lease' | 'other';

export type UnitStatus = 'occupied' | 'vacant' | 'rented' | 'planning' | 'storage';

export type UnitType = '1br' | '2br' | 'cottage';

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
  checkOut: string; // ISO date or empty for month-to-month
  monthlyRate: number;
  securityDeposit: number;
  securityDepositPaid: boolean;
  payments: Payment[];
  notes?: string;
}

export interface FutureGuest extends Guest {
  id: string; // DB guest id, needed for operations
}

export interface Unit {
  id: string;
  name: string;
  status: UnitStatus;
  unitType: UnitType;
  currentGuest: Guest | null;
  futureGuests: FutureGuest[];
}

export const SOURCE_LABELS: Record<BookingSource, string> = {
  airbnb: 'Airbnb',
  furnished_finder: 'Furnished Finder',
  direct: 'Direct Booking',
  long_term: 'Long Term',
  lease: 'Lease',
  other: 'Other',
};

export const STATUS_LABELS: Record<UnitStatus, string> = {
  occupied: 'Occupied',
  vacant: 'Vacant',
  rented: 'Rented',
  planning: 'Planning',
  storage: 'Storage',
};

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  '1br': '1 Bedroom',
  '2br': '2 Bedroom',
  cottage: 'Cottage',
};

export const UNIT_TYPES: UnitType[] = ['1br', '2br', 'cottage'];
