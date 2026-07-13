export type BookingSource = 'airbnb' | 'vrbo' | 'furnished_finder' | 'direct' | 'long_term' | 'lease' | 'other' | 'extension';

export type UnitStatus = 'occupied' | 'vacant' | 'rented' | 'planning' | 'storage';

export type UnitType = '1br' | '2br' | 'cottage';

export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'upcoming';

export type PaymentMethod =
  | 'airbnb'
  | 'stripe'
  | 'square'
  | 'venmo'
  | 'paypal'
  | 'zelle'
  | 'cash'
  | 'check'
  | 'ach'
  | 'credit_card'
  | 'other';

export interface PaymentAllocation {
  id?: string;
  method: PaymentMethod;
  otherDescription?: string;
  amount: number;
}

export interface Payment {
  id: string;
  amount: number;
  date: string; // ISO date
  status: PaymentStatus;
  note?: string;
  paymentMethod?: PaymentMethod;
  paymentMethodOther?: string;
  needsMethodReview?: boolean;
  allocations?: PaymentAllocation[];
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  'airbnb','stripe','square','venmo','paypal','zelle','cash','check','ach','credit_card','other',
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  airbnb: 'Airbnb',
  stripe: 'Stripe',
  square: 'Square',
  venmo: 'Venmo',
  paypal: 'PayPal',
  zelle: 'Zelle',
  cash: 'Cash',
  check: 'Check',
  ach: 'ACH / Bank Transfer',
  credit_card: 'Credit Card',
  other: 'Other',
};

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
  vrbo: 'VRBO',
  furnished_finder: 'Furnished Finder',
  direct: 'Direct Booking',
  long_term: 'Long Term',
  lease: 'Lease',
  other: 'Other',
  extension: 'Stay Extension',
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
