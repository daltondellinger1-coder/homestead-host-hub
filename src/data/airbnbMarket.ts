import { isDirectAirbnbListingUrl } from '@/lib/airbnbMarketSignals';

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
  /** Supabase airbnb_market_listings.id when sourced from the DB. Undefined for static fallback rows. */
  id?: string;
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
  id?: string;
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
  /**
   * Direct Airbnb listing URL only (airbnb.com/rooms/... or /h/...). Generic
   * search URLs are intentionally NOT stored here — the dashboard treats a
   * missing URL as "no direct link yet" rather than guess a search page.
   */
  listingUrl?: string;
};

/**
 * Known direct Airbnb listing URLs keyed by canonical (lowercased, trimmed,
 * space-normalized) comp name. These are the authoritative fallback when the
 * Supabase row's `listing_url` is missing OR is a search URL we should reject.
 *
 * Only `airbnb.com/rooms/<id>` URLs allowed — see `isDirectAirbnbListingUrl`.
 */
export const KNOWN_COMP_LISTING_URLS: Record<string, string> = {
  // NOTE: Vincennes Hideaway and Unique Historical Apartment were live-verified
  // as Airbnb 404s. They are intentionally NOT in this map so the app never
  // rehydrates the dead room IDs as a fallback link.
  'downtown loft apartment': 'https://www.airbnb.com/rooms/1104379617410107961',
  'small town urban oasis': 'https://www.airbnb.com/rooms/975590388116613421',
  'upstairs get away': 'https://www.airbnb.com/rooms/1017325527624458850',
  'apartment centrally located': 'https://www.airbnb.com/rooms/1157372418473093874',
  '2bed/1bath apartment centrally located': 'https://www.airbnb.com/rooms/1157372418473093874',
  'country loft with a view': 'https://www.airbnb.com/rooms/1558714513062967677',
};

function canonicalCompName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function knownDirectListingUrlForComp(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  return KNOWN_COMP_LISTING_URLS[canonicalCompName(name)];
}



/** Canonical Homestead Hill unit roster shown on /airbnb-market. */
export const HH_UNIT_NUMBERS: number[] = Array.from({ length: 15 }, (_, i) => i + 1);

/** Builds a "data-needed" placeholder unit so cards always render, even when Supabase is empty. */
export function buildPlaceholderHomesteadUnit(unitName: string): HomesteadUnit {
  return {
    unit: unitName,
    bedrooms: 0,
    baths: 0,
    bestFor: 'Monthly workforce housing candidate. Add listing proof and pricing snapshot.',
    status: 'verify',
    amenities: [],
    amenityMap: {
      'Monthly friendly': 'unclear',
      'Full kitchen': 'unclear',
      Laundry: 'unclear',
      Parking: 'unclear',
      'Self check-in': 'unclear',
      WiFi: 'unclear',
      Workspace: 'unclear',
      'Crew beds': 'unclear',
      Pets: 'unclear',
      'Strong reviews': 'unclear',
      'Photo proof': 'unclear',
    },
    missingOrUnclear: [
      'Listing proof needed',
      'Monthly price needed',
      'Availability snapshot needed',
      'Amenity verification needed',
      'Photos needed',
    ],
    photoActions: ['Capture hero photo', 'Add bed, kitchen, bath, parking, work surface shots'],
    ownerAction: 'Capture an Airbnb listing snapshot and monthly price for this unit.',
    pricingRecommendation: 'hold',
    dataStatus: 'Awaiting first Airbnb market snapshot.',
  };
}

/**
 * Researched per-unit profiles for Homestead Hill Unit 1-15.
 *
 * Source: June 2026 manual Airbnb + aggregator research pass. Only Unit 5,
 * Unit 11, Unit 2, and Unit 3 had verifiable public listings at research time.
 * The remaining units are real HH units with current occupancy/rollout state
 * captured here — they intentionally carry "data needed" amenity markers
 * instead of guessed values, so the dashboard stays honest.
 *
 * NOTE: Per the verified-link rule, no Airbnb room URL is stored here for any
 * HH unit. Room URLs live in Supabase `airbnb_market_listings.listing_url`
 * and only render if `isDirectAirbnbListingUrl` accepts them.
 */
const RESEARCHED_HH_UNITS: Record<number, HomesteadUnit> = {
  1: {
    unit: 'Unit 1',
    bedrooms: 1,
    baths: 1,
    bestFor: 'Future solo contractor or traveling-nurse monthly slot once turnover happens.',
    status: 'fix',
    amenities: ['Currently occupied'],
    amenityMap: {
      'Monthly friendly': 'unclear', 'Full kitchen': 'unclear', Laundry: 'unclear',
      Parking: 'unclear', 'Self check-in': 'unclear', WiFi: 'unclear',
      Workspace: 'unclear', 'Crew beds': false, Pets: 'unclear',
      'Strong reviews': 'unclear', 'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Airbnb listing link (if listed)', 'Monthly price', '30-day availability', 'First 5 photos', 'Laundry/WiFi/workspace proof'],
    photoActions: ['Hold photo work until turnover', 'Plan bed/kitchen/bath/parking/work-surface set for relist'],
    ownerAction: 'Hold as future solo-worker rollout candidate; no pricing energy until turnover.',
    pricingRecommendation: 'improve listing before pricing change',
    dataStatus: 'Occupied 1BR. No verified public Airbnb room URL.',
  },
  2: {
    unit: 'Unit 2',
    bedrooms: 1,
    baths: 1,
    bestFor: 'Solo worker or monthly guest. Second 1BR control alongside Unit 3.',
    status: 'verify',
    amenities: ['Airbnb listing verified', 'Superhost signal', 'Self check-in'],
    amenityMap: {
      'Monthly friendly': 'unclear', 'Full kitchen': true, Laundry: 'unclear',
      Parking: true, 'Self check-in': true, WiFi: true,
      Workspace: 'unclear', 'Crew beds': false, Pets: 'unclear',
      'Strong reviews': true, 'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Monthly checkout total', 'Monthly discount %', 'Laundry tag', 'Workspace photo', '30-day availability screenshot'],
    photoActions: ['Capture monthly availability screenshot', 'Add workspace shot', 'Confirm laundry tag in listing'],
    ownerAction: 'Use as second 1BR control; capture monthly price and availability before any price change.',
    pricingRecommendation: 'hold',
    dataStatus: 'Public Airbnb result verified during research. Direct room URL not yet captured.',
  },
  3: {
    unit: 'Unit 3',
    bedrooms: 1,
    beds: 1,
    baths: 1,
    sleeps: 2,
    bestFor: 'Business traveler — 1BR proof listing with strong reviews.',
    rating: 4.86,
    reviews: 7,
    status: 'push',
    amenities: ['Entire rental unit', 'Superhost', 'Self check-in', 'Full kitchen', 'WiFi', 'Free parking', 'TV', 'AC'],
    amenityMap: {
      'Monthly friendly': 'unclear', 'Full kitchen': true, Laundry: 'unclear',
      Parking: true, 'Self check-in': true, WiFi: true,
      Workspace: 'unclear', 'Crew beds': false, Pets: 'unclear',
      'Strong reviews': true, 'Photo proof': true,
    },
    missingOrUnclear: ['Monthly checkout total', 'Monthly discount %', '30-day availability', 'Laundry tag', 'Workspace photo'],
    photoActions: ['Add explicit workspace shot', 'Add laundry/amenity proof shot', 'Capture monthly availability screenshot'],
    ownerAction: 'Treat as 1BR proof listing; consider a raise only after monthly availability and discount are verified.',
    pricingRecommendation: 'improve listing before pricing change',
    dataStatus: 'Verified Airbnb detail: entire unit, 2 guests, 1BR/1bed/1bath, 4.86 from 7 reviews, Superhost. Reviews mention hospitality, cleanliness, location.',
  },
  4: {
    unit: 'Unit 4',
    bedrooms: 1,
    baths: 1,
    bestFor: 'Next 1BR monthly test slot — vacant, immediate solo workforce rollout candidate.',
    status: 'fix',
    amenities: ['Currently vacant'],
    amenityMap: {
      'Monthly friendly': 'unclear', 'Full kitchen': 'unclear', Laundry: 'unclear',
      Parking: 'unclear', 'Self check-in': 'unclear', WiFi: 'unclear',
      Workspace: 'unclear', 'Crew beds': false, Pets: 'unclear',
      'Strong reviews': 'unclear', 'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Airbnb listing link', 'Furnishing/photo readiness', 'Monthly price', '30-day availability', 'Amenity tags'],
    photoActions: ['Stage furnishing', 'Capture hero + bed/kitchen/bath/parking/work-surface set'],
    ownerAction: 'Build as the next 1BR monthly test after photos and amenities are in place.',
    pricingRecommendation: 'improve listing before pricing change',
    dataStatus: 'Vacant 1BR. No verified public Airbnb room URL.',
  },
  5: {
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
    amenities: ['Entire rental unit', 'Superhost', 'Self check-in', 'Full kitchen', 'WiFi', 'Free parking', 'TV', 'AC', 'Long-term stays'],
    amenityMap: {
      'Monthly friendly': true, 'Full kitchen': true, Laundry: 'unclear',
      Parking: true, 'Self check-in': true, WiFi: true,
      Workspace: 'unclear', 'Crew beds': true, Pets: 'unclear',
      'Strong reviews': 'unclear', 'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Laundry access', 'Dedicated workspace', 'Fast WiFi proof', 'Parking photo', 'Coffee setup'],
    photoActions: ['Lead with bright living room', 'Move bedroom into first 3 photos', 'Add kitchen and coffee setup', 'Show parking and exterior entry', 'Add work table or laptop-ready shot'],
    ownerAction: 'Push as the anchor 2BR monthly contractor option before cutting price. Reviews flag small bath / missing toiletries — address before raising.',
    pricingRecommendation: 'improve listing before pricing change',
    dataStatus: 'Verified Airbnb detail: 4 guests, 2BR/2 beds/1 bath, 4.75 from 4 reviews, Superhost. Monthly display $1,855 discounted from $3,190.',
  },
  6: {
    unit: 'Unit 6',
    bedrooms: 2,
    baths: 1,
    bestFor: 'Future companion to Unit 5 for two-worker / small-crew demand.',
    status: 'fix',
    amenities: ['Currently occupied'],
    amenityMap: {
      'Monthly friendly': 'unclear', 'Full kitchen': 'unclear', Laundry: 'unclear',
      Parking: 'unclear', 'Self check-in': 'unclear', WiFi: 'unclear',
      Workspace: 'unclear', 'Crew beds': 'unclear', Pets: 'unclear',
      'Strong reviews': 'unclear', 'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Airbnb listing link (if active)', 'Monthly price', 'Bed count / photo proof', 'Laundry / WiFi / workspace', '30-day availability'],
    photoActions: ['Plan 2BR proof set after turnover', 'Mirror Unit 5 photo layout'],
    ownerAction: 'Hold while occupied; line up as the second 2BR crew option after Unit 5.',
    pricingRecommendation: 'hold',
    dataStatus: 'Occupied 2BR. No verified public Airbnb room URL.',
  },
  7: {
    unit: 'Unit 7',
    bedrooms: 1,
    baths: 1,
    bestFor: 'Future monthly solo-worker slot once readiness work is done.',
    status: 'fix',
    amenities: ['Planning stage'],
    amenityMap: {
      'Monthly friendly': 'unclear', 'Full kitchen': 'unclear', Laundry: 'unclear',
      Parking: 'unclear', 'Self check-in': 'unclear', WiFi: 'unclear',
      Workspace: 'unclear', 'Crew beds': false, Pets: 'unclear',
      'Strong reviews': 'unclear', 'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Unit readiness scope', 'Airbnb listing link', 'Monthly price', 'Amenity tags', 'Photo set'],
    photoActions: ['Plan furnishing + photo set after scope decision'],
    ownerAction: 'No pricing action — finish readiness scope and amenity decisions first.',
    pricingRecommendation: 'improve listing before pricing change',
    dataStatus: 'Planning-stage 1BR. No public Airbnb URL.',
  },
  8: {
    unit: 'Unit 8',
    bedrooms: 1,
    baths: 1,
    bestFor: 'Future backfill 1BR once current tenant rolls off.',
    status: 'verify',
    amenities: ['Currently rented'],
    amenityMap: {
      'Monthly friendly': 'unclear', 'Full kitchen': 'unclear', Laundry: 'unclear',
      Parking: 'unclear', 'Self check-in': 'unclear', WiFi: 'unclear',
      Workspace: 'unclear', 'Crew beds': false, Pets: 'unclear',
      'Strong reviews': 'unclear', 'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Long-term tenant status', 'Future Airbnb readiness'],
    photoActions: [],
    ownerAction: 'No pricing action while rented. Revisit as backfill candidate.',
    pricingRecommendation: 'hold',
    dataStatus: 'Rented 1BR. Not currently an Airbnb listing.',
  },
  9: {
    unit: 'Unit 9',
    bedrooms: 1,
    baths: 1,
    bestFor: 'Future solo-worker monthly listing once readiness is complete.',
    status: 'fix',
    amenities: ['Planning stage'],
    amenityMap: {
      'Monthly friendly': 'unclear', 'Full kitchen': 'unclear', Laundry: 'unclear',
      Parking: 'unclear', 'Self check-in': 'unclear', WiFi: 'unclear',
      Workspace: 'unclear', 'Crew beds': false, Pets: 'unclear',
      'Strong reviews': 'unclear', 'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Unit readiness scope', 'Airbnb listing link', 'Monthly price', 'Photo set', 'Amenity tags'],
    photoActions: ['Plan furnishing + photo set after scope decision'],
    ownerAction: 'Finish readiness scope, then queue as solo-worker monthly listing.',
    pricingRecommendation: 'improve listing before pricing change',
    dataStatus: 'Planning-stage 1BR. No public Airbnb URL.',
  },
  10: {
    unit: 'Unit 10',
    bedrooms: 1,
    baths: 1,
    bestFor: 'Future backfill 1BR once current tenant rolls off.',
    status: 'verify',
    amenities: ['Currently rented'],
    amenityMap: {
      'Monthly friendly': 'unclear', 'Full kitchen': 'unclear', Laundry: 'unclear',
      Parking: 'unclear', 'Self check-in': 'unclear', WiFi: 'unclear',
      Workspace: 'unclear', 'Crew beds': false, Pets: 'unclear',
      'Strong reviews': 'unclear', 'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Long-term tenant status', 'Future Airbnb readiness'],
    photoActions: [],
    ownerAction: 'No pricing action while rented. Revisit as backfill candidate.',
    pricingRecommendation: 'hold',
    dataStatus: 'Rented 1BR. Not currently an Airbnb listing.',
  },
  11: {
    unit: 'Unit 11',
    bedrooms: 1,
    beds: 1,
    baths: 1,
    sleeps: 2,
    bestFor: 'Solo worker or weekly-to-monthly contractor who wants low-friction furnished housing.',
    nightlyPrice: 55,
    weeklyPrice: 686,
    weeklyDiscountPct: 10.9,
    rating: 5,
    reviews: 1,
    status: 'verify',
    amenities: ['Furnished stay', 'Weekly discount visible'],
    amenityMap: {
      'Monthly friendly': 'unclear', 'Full kitchen': 'unclear', Laundry: 'unclear',
      Parking: 'unclear', 'Self check-in': 'unclear', WiFi: 'unclear',
      Workspace: 'unclear', 'Crew beds': false, Pets: 'unclear',
      'Strong reviews': true, 'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Direct Airbnb room URL', 'Monthly price', 'Monthly discount', 'Laundry', 'Workspace', 'Parking clarity'],
    photoActions: ['Verify direct Airbnb room URL', 'Capture monthly availability screenshot', 'Add contractor-ready first 5 photos'],
    ownerAction: 'Verify the direct Airbnb room URL and monthly total; then decide whether it becomes a solo-worker monthly unit.',
    pricingRecommendation: 'hold',
    dataStatus: 'Aggregator verified: 5.0 from 1 review, 1BR/2 guests, ~$55 avg/night. Weekly display $686/week from $770. Exact Airbnb room URL not verified yet.',
  },
  12: {
    unit: 'Unit 12',
    bedrooms: 0,
    baths: 0,
    bestFor: 'Storage / non-Airbnb-ready. Excluded from pricing moves.',
    status: 'verify',
    amenities: ['Storage use'],
    amenityMap: {
      'Monthly friendly': false, 'Full kitchen': false, Laundry: false,
      Parking: false, 'Self check-in': false, WiFi: false,
      Workspace: false, 'Crew beds': false, Pets: false,
      'Strong reviews': false, 'Photo proof': false,
    },
    missingOrUnclear: ['Conversion decision'],
    photoActions: [],
    ownerAction: 'Treat as storage unless Dalton decides to convert it. Exclude from pricing comparisons.',
    pricingRecommendation: 'hold',
    dataStatus: 'Storage / non-Airbnb-ready. Intentionally excluded from short-term market math.',
  },
  13: {
    unit: 'Unit 13',
    bedrooms: 1,
    baths: 1,
    bestFor: 'Vacant cottage-style 1BR — strong candidate for a polished monthly solo-worker listing.',
    status: 'fix',
    amenities: ['Cottage-style', 'Currently vacant'],
    amenityMap: {
      'Monthly friendly': 'unclear', 'Full kitchen': 'unclear', Laundry: 'unclear',
      Parking: 'unclear', 'Self check-in': 'unclear', WiFi: 'unclear',
      Workspace: 'unclear', 'Crew beds': false, Pets: 'unclear',
      'Strong reviews': 'unclear', 'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Airbnb listing link', 'Monthly price', '30-day availability', 'Polished photo set', 'Amenity tags'],
    photoActions: ['Lead with cottage exterior', 'Add bed/kitchen/bath/parking/work-surface set'],
    ownerAction: 'Polish photos and copy first, then launch as a monthly solo-worker listing.',
    pricingRecommendation: 'improve listing before pricing change',
    dataStatus: 'Vacant cottage-style 1BR. No verified public Airbnb URL.',
  },
  14: {
    unit: 'Unit 14',
    bedrooms: 1,
    baths: 1,
    bestFor: 'Future premium-feeling solo-worker cottage option.',
    status: 'verify',
    amenities: ['Cottage-style', 'Currently occupied'],
    amenityMap: {
      'Monthly friendly': 'unclear', 'Full kitchen': 'unclear', Laundry: 'unclear',
      Parking: 'unclear', 'Self check-in': 'unclear', WiFi: 'unclear',
      Workspace: 'unclear', 'Crew beds': false, Pets: 'unclear',
      'Strong reviews': 'unclear', 'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Future Airbnb readiness', 'Premium amenity proof'],
    photoActions: [],
    ownerAction: 'Hold while occupied. Plan as premium-feeling solo-worker cottage option for relist.',
    pricingRecommendation: 'hold',
    dataStatus: 'Occupied cottage-style 1BR. Not currently an Airbnb listing.',
  },
  15: {
    unit: 'Unit 15',
    bedrooms: 1,
    baths: 1,
    bestFor: 'Future solo-worker monthly listing after scope and photo proof.',
    status: 'fix',
    amenities: ['Planning stage'],
    amenityMap: {
      'Monthly friendly': 'unclear', 'Full kitchen': 'unclear', Laundry: 'unclear',
      Parking: 'unclear', 'Self check-in': 'unclear', WiFi: 'unclear',
      Workspace: 'unclear', 'Crew beds': false, Pets: 'unclear',
      'Strong reviews': 'unclear', 'Photo proof': 'unclear',
    },
    missingOrUnclear: ['Unit readiness scope', 'Airbnb listing link', 'Monthly price', 'Photo set', 'Amenity tags'],
    photoActions: ['Plan furnishing + photo set after scope decision'],
    ownerAction: 'No pricing action — finish readiness scope and photo proof first.',
    pricingRecommendation: 'improve listing before pricing change',
    dataStatus: 'Planning-stage 1BR. No public Airbnb URL.',
  },
};

export const homesteadUnits: HomesteadUnit[] = HH_UNIT_NUMBERS.map(
  (n) => RESEARCHED_HH_UNITS[n] ?? buildPlaceholderHomesteadUnit(`Unit ${n}`),
);



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
    // listingUrl intentionally omitted — previous /rooms/<id> is a verified Airbnb 404.
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
    listingUrl: KNOWN_COMP_LISTING_URLS['downtown loft apartment'],
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
    listingUrl: KNOWN_COMP_LISTING_URLS['small town urban oasis'],
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
    listingUrl: KNOWN_COMP_LISTING_URLS['upstairs get away'],
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
    listingUrl: KNOWN_COMP_LISTING_URLS['apartment centrally located'],
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
    // listingUrl intentionally omitted — previous /rooms/<id> is a verified Airbnb 404.
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
    listingUrl: KNOWN_COMP_LISTING_URLS['country loft with a view'],
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

  // Researched fallback lookup by unit name, so sparse Supabase rows can be
  // merged with the manually-researched static profile in `homesteadUnits`.
  const researchedByName = new Map(homesteadUnits.map((u) => [u.unit, u] as const));

  const GENERIC_BEST_FOR = /^(Monthly workforce housing candidate\.?(\s+Add listing proof and pricing snapshot\.?)?)$/i;
  const GENERIC_OWNER_ACTION = /^(Review pricing and listing proof\.?|Capture an Airbnb listing snapshot and monthly price for this unit\.?)$/i;
  const GENERIC_DATA_STATUS = /^(Supabase market snapshot\.?|Awaiting first Airbnb market snapshot\.?)$/i;

  const meaningfulString = (value: string | null | undefined, generic: RegExp): string | undefined => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (generic.test(trimmed)) return undefined;
    return trimmed;
  };
  const meaningfulArray = <T>(value: T[] | null | undefined): T[] | undefined =>
    Array.isArray(value) && value.length > 0 ? value : undefined;
  const meaningfulMap = <T extends object>(value: T | null | undefined): T | undefined =>
    value && Object.keys(value).length > 0 ? value : undefined;

  const hhUnits = listings
    .filter((listing) => listing.source === 'homestead_hill')
    .map((listing): HomesteadUnit => {
      const price = latestPriceByListing.get(listing.id);
      const availability = latestAvailabilityByListing.get(listing.id);
      const fallback = researchedByName.get(listing.name);

      const bestFor =
        meaningfulString(listing.target_guest, GENERIC_BEST_FOR) ??
        fallback?.bestFor ??
        'Monthly workforce housing candidate.';
      const ownerAction =
        meaningfulString(listing.owner_action, GENERIC_OWNER_ACTION) ??
        fallback?.ownerAction ??
        'Review pricing and listing proof.';
      const dataStatus =
        meaningfulString(listing.data_status, GENERIC_DATA_STATUS) ??
        fallback?.dataStatus ??
        'Supabase market snapshot.';
      const pricingRecommendation: PricingRecommendation =
        listing.pricing_recommendation ?? fallback?.pricingRecommendation ?? 'hold';

      const amenities = meaningfulArray(listing.amenities) ?? fallback?.amenities ?? [];
      const amenityMap = meaningfulMap(listing.amenity_map) ?? fallback?.amenityMap ?? {};
      const missingOrUnclear = meaningfulArray(listing.missing_or_unclear) ?? fallback?.missingOrUnclear ?? [];
      const photoActions = meaningfulArray(listing.photo_actions) ?? fallback?.photoActions ?? [];

      return {
        id: listing.id,
        unit: listing.name,
        bedrooms: listing.bedrooms ?? fallback?.bedrooms ?? 0,
        beds: listing.beds ?? fallback?.beds ?? undefined,
        baths: listing.bathrooms ?? fallback?.baths ?? 0,
        sleeps: listing.sleeps ?? fallback?.sleeps ?? undefined,
        bestFor,
        monthlyPrice: price?.monthly_price ?? fallback?.monthlyPrice ?? undefined,
        weeklyPrice: price?.weekly_price ?? fallback?.weeklyPrice ?? undefined,
        nightlyPrice: price?.nightly_price ?? fallback?.nightlyPrice ?? undefined,
        monthlyDiscountPct: price?.monthly_discount_pct ?? fallback?.monthlyDiscountPct ?? undefined,
        weeklyDiscountPct: price?.weekly_discount_pct ?? fallback?.weeklyDiscountPct ?? undefined,
        rating: listing.rating ?? fallback?.rating ?? undefined,
        reviews: listing.reviews ?? fallback?.reviews ?? undefined,
        status: pricingRecommendation === 'improve listing before pricing change' ? 'push' : (fallback?.status ?? 'verify'),
        amenities,
        amenityMap,
        missingOrUnclear,
        photoActions,
        ownerAction,
        dataStatus,
        pricingRecommendation,
        availability: availability
          ? {
              available30Day: availability.available_30_day ?? undefined,
              nextAvailableDate: availability.next_available_date ?? undefined,
              snapshotDate: availability.snapshot_date,
            }
          : fallback?.availability,
      };
    });


  const comps = listings
    .filter((listing) => listing.source === 'competitor')
    .map((listing): MarketComp => {
      const price = latestPriceByListing.get(listing.id);
      return {
        id: listing.id,
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
        // Only surface URLs that are real Airbnb listing pages — never search pages.
        // If the DB value is missing or a rejected search URL, fall back to our
        // known direct-listing URL keyed by the comp's canonical name.
        listingUrl: isDirectAirbnbListingUrl(listing.listing_url)
          ? listing.listing_url
          : knownDirectListingUrlForComp(listing.name),
      };
    });


  // Always present every Homestead Hill unit (Unit 1 through Unit 15) as its
  // own card, even when Supabase has no row yet. Defensively strip any legacy
  // "Other HH units" placeholder so it can never re-appear in the UI.
  const dbHhUnits = hhUnits.filter((u) => u.unit !== 'Other HH units');
  const seen = new Set(dbHhUnits.map((u) => u.unit));
  const padded: HomesteadUnit[] = [...dbHhUnits];
  for (const n of HH_UNIT_NUMBERS) {
    const name = `Unit ${n}`;
    if (!seen.has(name)) padded.push(buildPlaceholderHomesteadUnit(name));
  }
  padded.sort((a, b) => {
    const an = Number((a.unit.match(/\d+/) ?? ['0'])[0]);
    const bn = Number((b.unit.match(/\d+/) ?? ['0'])[0]);
    return an - bn;
  });

  return {
    homesteadUnits: padded,
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
