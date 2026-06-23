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

export type PricingRecommendation = 'hold' | 'raise 5%' | 'lower 5%' | 'improve listing before pricing change';

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
  pricingRecommendation: PricingRecommendation;
  availability?: {
    available30Day?: boolean;
    nextAvailableDate?: string;
    snapshotDate?: string;
  };
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
  listingUrl?: string;
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
    pricingRecommendation: 'improve listing before pricing change',
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
    pricingRecommendation: 'hold',
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
    pricingRecommendation: 'improve listing before pricing change',
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
    listingUrl: 'https://www.airbnb.com/s/Vincennes--IN/homes?query=Vincennes%20Hideaway',
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
    listingUrl: 'https://www.airbnb.com/s/Vincennes--IN/homes?query=Downtown%20Loft%20Apartment%20Vincennes',
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
    listingUrl: 'https://www.airbnb.com/s/Vincennes--IN/homes?query=Small%20Town%20Urban%20Oasis',
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
    listingUrl: 'https://www.airbnb.com/s/Vincennes--IN/homes?query=Upstairs%20Get%20Away',
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
    listingUrl: 'https://www.airbnb.com/s/Vincennes--IN/homes?query=Apartment%20Centrally%20Located',
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
    listingUrl: 'https://www.airbnb.com/s/Vincennes--IN/homes?query=Unique%20Historical%20Apartment',
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


export type AirbnbMarketListingRow = {
  id: string;
  name: string;
  source: 'homestead_hill' | 'competitor';
  bedrooms?: number | null;
  beds?: number | null;
  bathrooms?: number | null;
  sleeps?: number | null;
  target_guest?: string | null;
  pricing_recommendation?: PricingRecommendation | null;
  owner_action?: string | null;
  data_status?: string | null;
  amenities?: string[] | null;
  amenity_map?: Partial<Record<AmenityKey, boolean | 'unclear'>> | null;
  missing_or_unclear?: string[] | null;
  photo_actions?: string[] | null;
  comp_type?: CompType | null;
  notes?: string | null;
  rating?: number | null;
  reviews?: number | null;
  listing_url?: string | null;
};


export type AirbnbMarketPriceSnapshotRow = {
  listing_id: string;
  nightly_price?: number | null;
  weekly_price?: number | null;
  monthly_price?: number | null;
  weekly_discount_pct?: number | null;
  monthly_discount_pct?: number | null;
  snapshot_date: string;
};

export type AirbnbMarketAvailabilitySnapshotRow = {
  listing_id: string;
  available_30_day?: boolean | null;
  next_available_date?: string | null;
  snapshot_date: string;
};

export type AirbnbMarketWeeklyBriefingRow = {
  week_start: string;
  headline: string;
  owner_read: string;
  next_actions: string[];
};

export type ManualSnapshotFormValues = {
  listingId: string;
  snapshotDate: string;
  nightlyPrice: string;
  weeklyPrice: string;
  monthlyPrice: string;
  weeklyDiscountPct: string;
  monthlyDiscountPct: string;
  available30Day: 'yes' | 'no' | 'unknown';
  nextAvailableDate: string;
};

function optionalNumber(value: string) {
  const trimmed = value.trim();
  return trimmed === '' ? null : Number(trimmed);
}

export function buildManualSnapshotRows(values: ManualSnapshotFormValues): {
  price: AirbnbMarketPriceSnapshotRow;
  availability: AirbnbMarketAvailabilitySnapshotRow;
} {
  return {
    price: {
      listing_id: values.listingId,
      snapshot_date: values.snapshotDate,
      nightly_price: optionalNumber(values.nightlyPrice),
      weekly_price: optionalNumber(values.weeklyPrice),
      monthly_price: optionalNumber(values.monthlyPrice),
      weekly_discount_pct: optionalNumber(values.weeklyDiscountPct),
      monthly_discount_pct: optionalNumber(values.monthlyDiscountPct),
    },
    availability: {
      listing_id: values.listingId,
      snapshot_date: values.snapshotDate,
      available_30_day: values.available30Day === 'unknown' ? null : values.available30Day === 'yes',
      next_available_date: values.nextAvailableDate.trim() || null,
    },
  };
}

export type AirbnbMarketBriefing = {
  homesteadUnits: HomesteadUnit[];
  marketComps: MarketComp[];
  weeklyBriefing?: {
    weekStart: string;
    headline: string;
    ownerRead: string;
    nextActions: string[];
  };
  dataFreshness: typeof dataFreshness;
};

function median(values: number[]) {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function moneyDelta(value: number) {
  return `$${Math.abs(Math.round(value)).toLocaleString()}`;
}

export function generateAirbnbWeeklyBriefing({
  weekStart,
  homesteadUnits,
  marketComps,
}: {
  weekStart: string;
  homesteadUnits: HomesteadUnit[];
  marketComps: MarketComp[];
}): AirbnbMarketWeeklyBriefingRow {
  const unit5 = homesteadUnits.find((unit) => unit.unit === 'Unit 5') || homesteadUnits[0];
  const otherUnits = homesteadUnits.filter((unit) => unit.unit !== unit5?.unit);
  const compMedian = median(marketComps.map((comp) => comp.monthlyEstimate).filter((value): value is number => typeof value === 'number'));
  const unit5Monthly = unit5?.monthlyPrice;
  const unit5Delta = unit5Monthly && compMedian ? compMedian - unit5Monthly : undefined;
  const unit5Recommendation = unit5?.pricingRecommendation || 'hold';
  const marketDirection = unit5Delta && unit5Delta > 0 ? 'HH has monthly value' : unit5Delta && unit5Delta < 0 ? 'competitors are cheaper' : 'pricing needs another snapshot';
  const otherUnitsRead = otherUnits.some((unit) => !unit.monthlyPrice || unit.availability?.available30Day === undefined)
    ? 'verify monthly price/availability before changing price'
    : 'hold unless snapshots move materially';

  const nextActions: string[] = [];
  if (unit5?.missingOrUnclear.length) {
    nextActions.push(`${unit5.unit}: fix ${unit5.missingOrUnclear.slice(0, 3).join(', ')} before changing price.`);
  }
  if (typeof unit5?.monthlyDiscountPct === 'number') {
    nextActions.push(`${unit5.unit}: keep the ${unit5.monthlyDiscountPct.toFixed(1)}% monthly discount visible for traveling workers and contractors.`);
  }
  otherUnits
    .filter((unit) => !unit.monthlyPrice || unit.availability?.available30Day === undefined)
    .slice(0, 2)
    .forEach((unit) => nextActions.push(`${unit.unit}: capture monthly price and 30-day availability screenshot.`));

  return {
    week_start: weekStart,
    headline:
      unit5 && unit5Delta !== undefined
        ? `${unit5.unit} is ${moneyDelta(unit5Delta)} ${unit5Delta >= 0 ? 'below' : 'above'} the watched monthly comp median, but listing proof still comes before a price move.`
        : 'Weekly pricing snapshot needs monthly comp data before making a pricing move.',
    owner_read: `Market direction: ${marketDirection}. Unit 5 recommendation: ${unit5Recommendation}. Other HH units: ${otherUnitsRead}.`,
    next_actions: nextActions.length ? nextActions : ['Capture fresh price and availability snapshots for Unit 5 and the top three comps.'],
  };
}

export function buildAirbnbMarketBriefing({
  listings,
  priceSnapshots,
  availabilitySnapshots = [],
  weeklyBriefing,
}: {
  listings: AirbnbMarketListingRow[];
  priceSnapshots: AirbnbMarketPriceSnapshotRow[];
  availabilitySnapshots?: AirbnbMarketAvailabilitySnapshotRow[];
  weeklyBriefing?: AirbnbMarketWeeklyBriefingRow | null;
}): AirbnbMarketBriefing {
  const latestPriceByListing = new Map<string, AirbnbMarketPriceSnapshotRow>();
  [...priceSnapshots]
    .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    .forEach((snapshot) => latestPriceByListing.set(snapshot.listing_id, snapshot));

  const latestAvailabilityByListing = new Map<string, AirbnbMarketAvailabilitySnapshotRow>();
  [...availabilitySnapshots]
    .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    .forEach((snapshot) => latestAvailabilityByListing.set(snapshot.listing_id, snapshot));

  const hhUnits = listings
    .filter((listing) => listing.source === 'homestead_hill')
    .map((listing): HomesteadUnit => {
      const price = latestPriceByListing.get(listing.id);
      const availability = latestAvailabilityByListing.get(listing.id);
      return {
        unit: listing.name,
        bedrooms: listing.bedrooms ?? 0,
        beds: listing.beds ?? undefined,
        baths: listing.bathrooms ?? 0,
        sleeps: listing.sleeps ?? undefined,
        bestFor: listing.target_guest || 'Monthly workforce housing candidate.',
        monthlyPrice: price?.monthly_price ?? undefined,
        weeklyPrice: price?.weekly_price ?? undefined,
        nightlyPrice: price?.nightly_price ?? undefined,
        monthlyDiscountPct: price?.monthly_discount_pct ?? undefined,
        weeklyDiscountPct: price?.weekly_discount_pct ?? undefined,
        rating: listing.rating ?? undefined,
        reviews: listing.reviews ?? undefined,
        status: listing.pricing_recommendation === 'improve listing before pricing change' ? 'push' : 'verify',
        amenities: listing.amenities || [],
        amenityMap: listing.amenity_map || {},
        missingOrUnclear: listing.missing_or_unclear || [],
        photoActions: listing.photo_actions || [],
        ownerAction: listing.owner_action || 'Review pricing and listing proof.',
        dataStatus: listing.data_status || 'Supabase market snapshot.',
        pricingRecommendation: listing.pricing_recommendation || 'hold',
        availability: availability
          ? {
              available30Day: availability.available_30_day ?? undefined,
              nextAvailableDate: availability.next_available_date ?? undefined,
              snapshotDate: availability.snapshot_date,
            }
          : undefined,
      };
    });

  const comps = listings
    .filter((listing) => listing.source === 'competitor')
    .map((listing): MarketComp => {
      const price = latestPriceByListing.get(listing.id);
      return {
        name: listing.name,
        compType: listing.comp_type || 'verify',
        nightlyPrice: price?.nightly_price ?? undefined,
        weeklyEstimate: price?.weekly_price ?? undefined,
        monthlyEstimate: price?.monthly_price ?? undefined,
        bedrooms: listing.bedrooms ?? undefined,
        beds: listing.beds ?? undefined,
        baths: listing.bathrooms ?? undefined,
        rating: listing.rating ?? undefined,
        reviews: listing.reviews ?? undefined,
        contractorAmenities: listing.amenities || [],
        amenityMap: listing.amenity_map || {},
        notes: listing.notes || 'Watchlist competitor. Needs notes.',
        listingUrl: listing.listing_url || undefined,
      };

    });

  return {
    homesteadUnits: hhUnits.length ? hhUnits : homesteadUnits,
    marketComps: comps.length ? comps : marketComps,
    weeklyBriefing: weeklyBriefing
      ? {
          weekStart: weeklyBriefing.week_start,
          headline: weeklyBriefing.headline,
          ownerRead: weeklyBriefing.owner_read,
          nextActions: weeklyBriefing.next_actions,
        }
      : undefined,
    dataFreshness,
  };
}

export const staticAirbnbMarketBriefing: AirbnbMarketBriefing = {
  homesteadUnits,
  marketComps,
  dataFreshness,
};
