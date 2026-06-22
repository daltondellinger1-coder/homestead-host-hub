export type UnitStatus = 'push' | 'verify' | 'fix';
export type CompType = 'direct' | 'budget' | 'premium' | 'crew' | 'verify';

export type AmenityKey =
  | 'Monthly friendly'
  | 'Full kitchen'
  | 'Laundry'
  | 'Parking'
  | 'Self check-in'
  | 'WiFi'
  | 'Workspace'
  | 'Crew beds'
  | 'Pets'
  | 'Strong reviews'
  | 'Photo proof';

export const amenityKeys: AmenityKey[] = [
  'Monthly friendly',
  'Full kitchen',
  'Laundry',
  'Parking',
  'Self check-in',
  'WiFi',
  'Workspace',
  'Crew beds',
  'Pets',
  'Strong reviews',
  'Photo proof',
];

export type HomesteadUnit = {
  unit: string;
  bedrooms: number;
  beds?: number;
  baths: number;
  sleeps?: number;
  bestFor: string;
  monthlyPrice?: number;
  weeklyPrice?: number;
  nightlyPrice?: number;
  monthlyDiscountPct?: number;
  weeklyDiscountPct?: number;
  rating?: number;
  reviews?: number;
  status: UnitStatus;
  amenities: string[];
  amenityMap: Partial<Record<AmenityKey, boolean | 'unclear'>>;
  missingOrUnclear: string[];
  photoActions: string[];
  ownerAction: string;
  dataStatus: string;
};

export type MarketComp = {
  name: string;
  compType: CompType;
  nightlyPrice?: number;
  weeklyEstimate?: number;
  monthlyEstimate?: number;
  bedrooms?: number;
  beds?: number;
  baths?: number;
  rating?: number;
  reviews?: number;
  contractorAmenities: string[];
  amenityMap: Partial<Record<AmenityKey, boolean | 'unclear'>>;
  notes: string;
};

export const homesteadUnits: HomesteadUnit[] = [
  {
    unit: 'Unit 5',
    bedrooms: 2,
    beds: 2,
    baths: 1,
    sleeps: 4,
    bestFor: 'Two workers, supervisor, or small crew needing a clean 30+ day base.',
    nightlyPrice: 130,
    monthlyPrice: 1855,
    monthlyDiscountPct: 41.8,
    rating: 4.75,
    reviews: 4,
    status: 'push',
    amenities: ['Full kitchen', 'WiFi', 'Free parking', 'Smart lock', 'TV', 'AC', 'Long-term stays'],
    amenityMap: {
      'Monthly friendly': true,
      'Full kitchen': true,
      Laundry: 'unclear',
      Parking: true,
      'Self check-in': true,
      WiFi: true,
      Workspace: 'unclear',
      'Crew beds': true,
      Pets: 'unclear',
      'Strong reviews': 'unclear',
      'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Laundry access', 'Dedicated workspace', 'Fast WiFi proof', 'Parking photo', 'Coffee setup'],
    photoActions: ['Lead with bright living room', 'Move bedroom into first 3 photos', 'Add kitchen and coffee setup', 'Show parking and exterior entry', 'Add work table or laptop-ready shot'],
    ownerAction: 'Push as the anchor 2BR monthly contractor option before cutting price.',
    dataStatus: 'Verified monthly display: $1,855/month discounted from $3,190.',
  },
  {
    unit: 'Unit 11',
    bedrooms: 1,
    beds: 1,
    baths: 1,
    bestFor: 'Solo worker or weekly-to-monthly contractor who wants low-friction furnished housing.',
    weeklyPrice: 686,
    weeklyDiscountPct: 10.9,
    status: 'verify',
    amenities: ['Furnished stay', 'Weekly discount visible'],
    amenityMap: {
      'Monthly friendly': 'unclear',
      'Full kitchen': 'unclear',
      Laundry: 'unclear',
      Parking: 'unclear',
      'Self check-in': 'unclear',
      WiFi: 'unclear',
      Workspace: 'unclear',
      'Crew beds': false,
      Pets: 'unclear',
      'Strong reviews': 'unclear',
      'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Monthly price', 'Monthly discount', 'Laundry access', 'Workspace', 'Parking clarity'],
    photoActions: ['Verify monthly availability screenshot', 'Add contractor-ready first 5 photos', 'Show bed, kitchen, bath, parking, work surface'],
    ownerAction: 'Verify the monthly total and discount, then decide whether it becomes a solo-worker monthly unit.',
    dataStatus: 'Verified weekly display: $686/week discounted from $770. Monthly still needs a live screenshot.',
  },
  {
    unit: 'Other HH units',
    bedrooms: 1,
    baths: 1,
    bestFor: 'Rollout slots for solo workers, nurses, inspectors, or rotating crews.',
    status: 'fix',
    amenities: ['Property-level parking', 'Quiet apartment setting', 'Operational owner control'],
    amenityMap: {
      'Monthly friendly': 'unclear',
      'Full kitchen': 'unclear',
      Laundry: 'unclear',
      Parking: true,
      'Self check-in': 'unclear',
      WiFi: 'unclear',
      Workspace: 'unclear',
      'Crew beds': 'unclear',
      Pets: 'unclear',
      'Strong reviews': 'unclear',
      'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Airbnb links', 'Bedroom count', 'Monthly price', 'Amenity tags', 'Photo order', 'Review signal'],
    photoActions: ['Create one standard 12-photo shot list per unit', 'Collect first-photo candidates', 'Audit amenity tags unit by unit'],
    ownerAction: 'Add each Airbnb link and monthly screenshot so the dashboard becomes a full unit-by-unit control room.',
    dataStatus: 'Not yet verified. Use this as the rollout placeholder until each listing is collected.',
  },
];

export const marketComps: MarketComp[] = [
  {
    name: 'Vincennes Hideaway',
    compType: 'direct',
    nightlyPrice: 95,
    weeklyEstimate: 665,
    monthlyEstimate: 2850,
    bedrooms: 2,
    baths: 1,
    contractorAmenities: ['Newly renovated', 'Near Main/hospital', 'Full-place privacy'],
    amenityMap: { 'Monthly friendly': 'unclear', 'Full kitchen': true, Laundry: 'unclear', Parking: 'unclear', WiFi: 'unclear', Workspace: 'unclear', 'Crew beds': true },
    notes: 'Strong direct comp if monthly availability is open. Lower face-price than Unit 5, but Unit 5 monthly discount changes the math.',
  },
  {
    name: 'Downtown Loft Apartment',
    compType: 'direct',
    nightlyPrice: 99,
    weeklyEstimate: 693,
    monthlyEstimate: 2970,
    bedrooms: 2,
    baths: 2,
    contractorAmenities: ['2 baths', 'Downtown location'],
    amenityMap: { 'Monthly friendly': 'unclear', 'Full kitchen': true, Laundry: 'unclear', Parking: 'unclear', WiFi: 'unclear', Workspace: 'unclear', 'Crew beds': true },
    notes: 'Potentially beats HH on bath count, but may be less quiet/simple than Homestead Hill for long work stays.',
  },
  {
    name: 'Small Town Urban Oasis',
    compType: 'crew',
    nightlyPrice: 88,
    weeklyEstimate: 616,
    monthlyEstimate: 2640,
    bedrooms: 3,
    beds: 4,
    rating: 4.82,
    reviews: 34,
    contractorAmenities: ['Washer/dryer', 'Pets', 'Workspace', 'Crew capacity'],
    amenityMap: { 'Monthly friendly': 'unclear', 'Full kitchen': true, Laundry: true, Parking: 'unclear', WiFi: 'unclear', Workspace: true, 'Crew beds': true, Pets: true, 'Strong reviews': true, 'Photo proof': true },
    notes: 'A serious crew-stay competitor. It beats HH on beds, reviews, laundry, and pet flexibility.',
  },
  {
    name: 'Upstairs Get Away',
    compType: 'budget',
    nightlyPrice: 75,
    weeklyEstimate: 525,
    monthlyEstimate: 2250,
    bedrooms: 2,
    beds: 2,
    baths: 1,
    rating: 4.36,
    reviews: 14,
    contractorAmenities: ['Washer/dryer', 'Pets', 'Roku', 'Bathtub'],
    amenityMap: { 'Monthly friendly': 'unclear', 'Full kitchen': true, Laundry: true, Parking: 'unclear', WiFi: 'unclear', Workspace: 'unclear', 'Crew beds': true, Pets: true, 'Strong reviews': 'unclear', 'Photo proof': 'unclear' },
    notes: 'Budget pressure. HH needs to beat it on cleanliness, reliability, photos, and monthly value.',
  },
  {
    name: 'Apartment Centrally Located',
    compType: 'budget',
    nightlyPrice: 85,
    weeklyEstimate: 595,
    monthlyEstimate: 2550,
    bedrooms: 1,
    contractorAmenities: ['Central location'],
    amenityMap: { 'Monthly friendly': 'unclear', 'Full kitchen': 'unclear', Laundry: 'unclear', Parking: 'unclear', WiFi: 'unclear', Workspace: 'unclear', 'Crew beds': false },
    notes: 'Smaller cheaper option. Less relevant for crews, relevant for solo workers comparing price first.',
  },
  {
    name: 'Unique Historical Apartment',
    compType: 'premium',
    nightlyPrice: 155,
    weeklyEstimate: 1085,
    monthlyEstimate: 4650,
    bedrooms: 2,
    contractorAmenities: ['Historic/downtown appeal'],
    amenityMap: { 'Monthly friendly': 'unclear', 'Full kitchen': true, Laundry: 'unclear', Parking: 'unclear', WiFi: 'unclear', Workspace: 'unclear', 'Crew beds': true, 'Photo proof': true },
    notes: 'Premium leisure-style comp. Useful as a price ceiling, not the main contractor benchmark.',
  },
  {
    name: 'Country Loft with a View',
    compType: 'verify',
    bedrooms: 1,
    beds: 1,
    rating: 5,
    contractorAmenities: ['Workspace', 'Pets', 'Washer/dryer', 'Country setting'],
    amenityMap: { 'Monthly friendly': 'unclear', 'Full kitchen': 'unclear', Laundry: true, Parking: true, WiFi: 'unclear', Workspace: true, Pets: true, 'Strong reviews': true, 'Photo proof': 'unclear' },
    notes: 'Price blocked in search, but amenity package is contractor-relevant. Needs live monthly pricing.',
  },
];

export const contractorWeights = [
  ['Monthly price/value', 25],
  ['Laundry/access', 15],
  ['Parking', 10],
  ['Self check-in', 10],
  ['Full kitchen', 10],
  ['WiFi/workspace', 10],
  ['Beds/crew capacity', 10],
  ['Reviews/trust', 5],
  ['Photo clarity', 5],
] as const;

export const actionBacklog = [
  {
    group: 'Free listing fixes',
    items: ['Add monthly contractor stays to the title/copy', 'Verify every amenity tag', 'Call out self check-in, parking, kitchen, and quiet property', 'Add distances to hospital, university, downtown, and work corridors'],
  },
  {
    group: 'Cheap physical adds',
    items: ['Coffee setup', 'Blackout curtains', 'Laundry basket', 'Desk or work chair', 'Extra towels and linens', 'Exterior parking photo'],
  },
  {
    group: 'Bigger upgrades to evaluate',
    items: ['Laundry access clarity or upgrade', 'One pet-friendly test unit', 'Professional photos', 'Better mattresses and bedding', 'Dedicated workspace package'],
  },
];

export function effectiveNightly(monthly?: number) {
  return monthly ? Math.round(monthly / 30) : undefined;
}

export function effectiveWeeklyNightly(weekly?: number) {
  return weekly ? Math.round(weekly / 7) : undefined;
}

export function contractorFitScore(unit: HomesteadUnit) {
  let score = 0;
  if (unit.monthlyPrice && unit.monthlyPrice <= 2000) score += 25;
  else if (unit.monthlyPrice) score += 16;
  if (unit.amenityMap.Laundry === true) score += 15;
  if (unit.amenityMap.Parking === true) score += 10;
  if (unit.amenityMap['Self check-in'] === true) score += 10;
  if (unit.amenityMap['Full kitchen'] === true) score += 10;
  if (unit.amenityMap.WiFi === true || unit.amenityMap.Workspace === true) score += 10;
  if (unit.amenityMap['Crew beds'] === true) score += 10;
  if (unit.rating && unit.rating >= 4.7) score += 5;
  if (unit.photoActions.length <= 3 || unit.amenityMap['Photo proof'] === true) score += 5;
  else score += 2;
  return Math.min(100, score);
}

export function compTypeLabel(type: CompType) {
  return {
    direct: 'Direct monthly comp',
    budget: 'Budget pressure',
    premium: 'Premium ceiling',
    crew: 'Crew-stay threat',
    verify: 'Needs live pricing',
  }[type];
}

export const dataFreshness = {
  pulled: 'June 2026 Airbnb live/search snapshots',
  caveat: 'Competitor monthly totals are estimates when Airbnb did not expose exact 30-night checkout totals. Unit 5 and Unit 11 discount observations came from live displayed Airbnb pricing windows.',
};
