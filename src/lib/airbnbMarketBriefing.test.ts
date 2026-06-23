import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildAirbnbMarketBriefing, homesteadUnits, marketComps } from '@/data/airbnbMarket';


describe('Airbnb market briefing model', () => {
  it('adds one of the allowed pricing recommendations to every Homestead Hill listing', () => {
    const allowed = ['hold', 'raise 5%', 'lower 5%', 'improve listing before pricing change'];

    expect(homesteadUnits.every((unit) => allowed.includes(unit.pricingRecommendation))).toBe(true);
    expect(homesteadUnits.find((unit) => unit.unit === 'Unit 5')?.pricingRecommendation).toBe('improve listing before pricing change');
  });

  it('builds a Supabase-shaped briefing payload from listing and competitor rows', () => {
    const briefing = buildAirbnbMarketBriefing({
      listings: [
        {
          id: 'listing-unit-5',
          name: 'Unit 5',
          source: 'homestead_hill',
          bedrooms: 2,
          bathrooms: 1,
          target_guest: 'Traveling workers',
          pricing_recommendation: 'improve listing before pricing change',
          owner_action: 'Add photo proof before changing price.',
          data_status: 'Verified',
          amenities: ['Full kitchen'],
          amenity_map: { Parking: true },
          missing_or_unclear: ['Laundry'],
          photo_actions: ['Show parking'],
          comp_type: null,
          notes: null,
          rating: 4.75,
          reviews: 4,
        },
        {
          id: 'comp-hideaway',
          name: 'Vincennes Hideaway',
          source: 'competitor',
          bedrooms: 2,
          bathrooms: 1,
          target_guest: null,
          pricing_recommendation: null,
          owner_action: null,
          data_status: null,
          amenities: ['Full-place privacy'],
          amenity_map: {},
          missing_or_unclear: [],
          photo_actions: [],
          comp_type: 'direct',
          notes: 'Direct comp',
          rating: null,
          reviews: null,
        },
      ],
      priceSnapshots: [
        { listing_id: 'listing-unit-5', nightly_price: 130, weekly_price: null, monthly_price: 1855, weekly_discount_pct: null, monthly_discount_pct: 41.8, snapshot_date: '2026-06-23' },
        { listing_id: 'comp-hideaway', nightly_price: 95, weekly_price: 665, monthly_price: 2850, weekly_discount_pct: null, monthly_discount_pct: null, snapshot_date: '2026-06-23' },
      ],
      availabilitySnapshots: [
        { listing_id: 'listing-unit-5', available_30_day: true, next_available_date: '2026-07-01', snapshot_date: '2026-06-23' },
      ],
      weeklyBriefing: {
        week_start: '2026-06-22',
        headline: 'Unit 5 is a strong monthly value.',
        owner_read: 'Improve listing proof before cutting price.',
        next_actions: ['Add every HH Airbnb link and 30-day screenshot'],
      },
    });

    expect(briefing.homesteadUnits).toHaveLength(1);
    expect(briefing.marketComps).toHaveLength(1);
    expect(briefing.homesteadUnits[0].monthlyPrice).toBe(1855);
    expect(briefing.homesteadUnits[0].pricingRecommendation).toBe('improve listing before pricing change');
    expect(briefing.homesteadUnits[0].availability?.available30Day).toBe(true);
    expect(briefing.homesteadUnits[0].availability?.nextAvailableDate).toBe('2026-07-01');
    expect(briefing.weeklyBriefing?.nextActions).toContain('Add every HH Airbnb link and 30-day screenshot');
  });

  it('keeps the Airbnb Market page wired to Supabase data with a static fallback', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/AirbnbMarket.tsx'), 'utf8');

    expect(source).toContain('useAirbnbMarketBriefing');
    expect(source).toContain('recommendedMove');
    expect(source).toContain('Loading market briefing');
  });

  it('builds clean price and availability rows from the manual snapshot form values', async () => {
    const { buildManualSnapshotRows } = await import('@/data/airbnbMarket');

    const rows = buildManualSnapshotRows({
      listingId: 'listing-unit-5',
      snapshotDate: '2026-06-23',
      nightlyPrice: '130',
      weeklyPrice: '',
      monthlyPrice: '1855',
      weeklyDiscountPct: '',
      monthlyDiscountPct: '41.8',
      available30Day: 'yes',
      nextAvailableDate: '2026-07-01',
    });

    expect(rows.price).toEqual({
      listing_id: 'listing-unit-5',
      snapshot_date: '2026-06-23',
      nightly_price: 130,
      weekly_price: null,
      monthly_price: 1855,
      weekly_discount_pct: null,
      monthly_discount_pct: 41.8,
    });
    expect(rows.availability).toEqual({
      listing_id: 'listing-unit-5',
      snapshot_date: '2026-06-23',
      available_30_day: true,
      next_available_date: '2026-07-01',
    });
  });

  it('exposes the manual snapshot admin panel on the Airbnb Market page', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/AirbnbMarket.tsx'), 'utf8');

    expect(source).toContain('Record snapshot');
    expect(source).toContain('Save price + availability snapshot');
    expect(source).toContain('useAirbnbMarketSnapshotAdmin');
    expect(source).toContain('Generate weekly briefing');
    expect(source).toContain('generateAirbnbWeeklyBriefing');
  });

  it('generates a weekly owner briefing from latest snapshots and listing readiness', async () => {
    const { generateAirbnbWeeklyBriefing } = await import('@/data/airbnbMarket');

    const briefing = generateAirbnbWeeklyBriefing({
      weekStart: '2026-06-22',
      homesteadUnits: [
        {
          ...homesteadUnits[0],
          unit: 'Unit 5',
          monthlyPrice: 1855,
          monthlyDiscountPct: 41.8,
          pricingRecommendation: 'improve listing before pricing change',
          missingOrUnclear: ['Laundry access', 'Fast WiFi proof', 'Parking photo'],
          photoActions: ['Lead with bright living room', 'Show parking and exterior entry'],
          availability: { available30Day: true, nextAvailableDate: '2026-07-01', snapshotDate: '2026-06-23' },
        },
        {
          ...homesteadUnits[1],
          unit: 'Unit 11',
          monthlyPrice: undefined,
          pricingRecommendation: 'hold',
          availability: { snapshotDate: '2026-06-23' },
        },
      ],
      marketComps: [
        { name: 'Budget Comp', compType: 'budget', monthlyEstimate: 2250, nightlyPrice: 75, contractorAmenities: ['Laundry'], amenityMap: { Laundry: true }, notes: 'Budget pressure' },
        { name: 'Crew Threat', compType: 'crew', monthlyEstimate: 2640, nightlyPrice: 88, contractorAmenities: ['Laundry', 'Workspace'], amenityMap: { Laundry: true, Workspace: true }, notes: 'Crew-stay threat' },
        { name: 'Premium Ceiling', compType: 'premium', monthlyEstimate: 4650, nightlyPrice: 155, contractorAmenities: ['Historic'], amenityMap: {}, notes: 'Premium ceiling' },
      ],
    });

    expect(briefing).toEqual({
      week_start: '2026-06-22',
      headline: 'Unit 5 is $785 below the watched monthly comp median, but listing proof still comes before a price move.',
      owner_read: 'Market direction: HH has monthly value. Unit 5 recommendation: improve listing before pricing change. Other HH units: verify monthly price/availability before changing price.',
      next_actions: [
        'Unit 5: fix Laundry access, Fast WiFi proof, Parking photo before changing price.',
        'Unit 5: keep the 41.8% monthly discount visible for traveling workers and contractors.',
        'Unit 11: capture monthly price and 30-day availability screenshot.',
      ],
    });

  describe('competitor listing URLs', () => {
    it('maps a direct Supabase listing_url into MarketComp.listingUrl and drops generic search URLs', () => {
      const briefing = buildAirbnbMarketBriefing({
        listings: [
          {
            id: 'comp-with-direct', name: 'Direct Comp', source: 'competitor',
            bedrooms: 2, bathrooms: 1, target_guest: null, pricing_recommendation: null,
            owner_action: null, data_status: null, amenities: [], amenity_map: {},
            missing_or_unclear: [], photo_actions: [], comp_type: 'direct', notes: null,
            rating: null, reviews: null,
            listing_url: 'https://www.airbnb.com/rooms/123456',
          },
          {
            id: 'comp-with-search', name: 'Search-URL Comp', source: 'competitor',
            bedrooms: 2, bathrooms: 1, target_guest: null, pricing_recommendation: null,
            owner_action: null, data_status: null, amenities: [], amenity_map: {},
            missing_or_unclear: [], photo_actions: [], comp_type: 'direct', notes: null,
            rating: null, reviews: null,
            listing_url: 'https://www.airbnb.com/s/Vincennes--IN/homes?query=Whatever',
          },
          {
            id: 'comp-no-url', name: 'Unlinked Comp', source: 'competitor',
            bedrooms: 1, bathrooms: 1, target_guest: null, pricing_recommendation: null,
            owner_action: null, data_status: null, amenities: [], amenity_map: {},
            missing_or_unclear: [], photo_actions: [], comp_type: 'verify', notes: null,
            rating: null, reviews: null,
          },
        ],
        priceSnapshots: [],
      });

      const direct = briefing.marketComps.find((c) => c.name === 'Direct Comp');
      const search = briefing.marketComps.find((c) => c.name === 'Search-URL Comp');
      const unlinked = briefing.marketComps.find((c) => c.name === 'Unlinked Comp');
      expect(direct?.listingUrl).toBe('https://www.airbnb.com/rooms/123456');
      expect(direct?.id).toBe('comp-with-direct');
      expect(search?.listingUrl).toBeUndefined();
      expect(unlinked?.listingUrl).toBeUndefined();
    });

    it('ships seed comps with NO search URLs — only direct Airbnb listing URLs are allowed in seed data', () => {
      const searchUrls = marketComps.filter((c) => typeof c.listingUrl === 'string' && /\/s\//.test(c.listingUrl));
      expect(searchUrls).toEqual([]);
      // Any seed URL that IS present must be a direct listing URL.
      marketComps.forEach((c) => {
        if (c.listingUrl) {
          expect(c.listingUrl).toMatch(/^https:\/\/www\.airbnb\.com\/(rooms\/\d+|h\/[A-Za-z0-9_-]+)/);
        }
      });
    });

    it('falls back to the known direct /rooms/<id> URL by comp name when the DB row has no listing_url or has a search URL', async () => {
      const { KNOWN_COMP_LISTING_URLS } = await import('@/data/airbnbMarket');
      const cases = [
        { name: 'Downtown Loft Apartment', listing_url: undefined },
        { name: 'Small Town Urban Oasis', listing_url: 'https://www.airbnb.com/s/Vincennes--IN/homes' },
        { name: 'Upstairs get away', listing_url: null }, // case-insensitive match
        { name: '2Bed/1Bath Apartment Centrally Located', listing_url: null },
        { name: 'Country Loft with a view', listing_url: null },
      ];
      const briefing = buildAirbnbMarketBriefing({
        listings: cases.map((c, i) => ({
          id: `comp-${i}`, name: c.name, source: 'competitor',
          bedrooms: 1, bathrooms: 1, target_guest: null, pricing_recommendation: null,
          owner_action: null, data_status: null, amenities: [], amenity_map: {},
          missing_or_unclear: [], photo_actions: [], comp_type: 'direct', notes: null,
          rating: null, reviews: null, listing_url: c.listing_url ?? null,
        })),
        priceSnapshots: [],
      });

      const expected: Record<string, string> = {
        'Downtown Loft Apartment': KNOWN_COMP_LISTING_URLS['downtown loft apartment'],
        'Small Town Urban Oasis': KNOWN_COMP_LISTING_URLS['small town urban oasis'],
        'Upstairs get away': KNOWN_COMP_LISTING_URLS['upstairs get away'],
        '2Bed/1Bath Apartment Centrally Located': KNOWN_COMP_LISTING_URLS['2bed/1bath apartment centrally located'],
        'Country Loft with a view': KNOWN_COMP_LISTING_URLS['country loft with a view'],
      };
      for (const [name, url] of Object.entries(expected)) {
        const got = briefing.marketComps.find((c) => c.name === name);
        expect(got?.listingUrl).toBe(url);
        expect(got?.listingUrl).toMatch(/^https:\/\/www\.airbnb\.com\/rooms\/\d+$/);
      }
    });

    it('does NOT fall back to known-bad (404) listing URLs for Vincennes Hideaway or Unique Historical Apartment', async () => {
      const { KNOWN_COMP_LISTING_URLS, knownDirectListingUrlForComp } = await import('@/data/airbnbMarket');
      const bad = ['1324918599263697867', '911846172806023965'];
      // The fallback map must not carry the dead room IDs at all.
      for (const url of Object.values(KNOWN_COMP_LISTING_URLS)) {
        for (const id of bad) expect(url).not.toContain(id);
      }
      expect(knownDirectListingUrlForComp('Vincennes Hideaway')).toBeUndefined();
      expect(knownDirectListingUrlForComp('Unique Historical Apartment')).toBeUndefined();

      // A Supabase row with null listing_url for either name must produce no listingUrl.
      const briefing = buildAirbnbMarketBriefing({
        listings: [
          {
            id: 'comp-vh', name: 'Vincennes Hideaway', source: 'competitor',
            bedrooms: 2, bathrooms: 1, target_guest: null, pricing_recommendation: null,
            owner_action: null, data_status: null, amenities: [], amenity_map: {},
            missing_or_unclear: [], photo_actions: [], comp_type: 'direct', notes: null,
            rating: null, reviews: null, listing_url: null,
          },
          {
            id: 'comp-uha', name: 'Unique Historical Apartment', source: 'competitor',
            bedrooms: 2, bathrooms: 1, target_guest: null, pricing_recommendation: null,
            owner_action: null, data_status: null, amenities: [], amenity_map: {},
            missing_or_unclear: [], photo_actions: [], comp_type: 'premium', notes: null,
            rating: null, reviews: null, listing_url: null,
          },
        ],
        priceSnapshots: [],
      });
      expect(briefing.marketComps.find((c) => c.name === 'Vincennes Hideaway')?.listingUrl).toBeUndefined();
      expect(briefing.marketComps.find((c) => c.name === 'Unique Historical Apartment')?.listingUrl).toBeUndefined();
    });

    it('seed comps expose the exact verified direct /rooms/<id> URL for the five working comps, and leave the two 404 comps unlinked', () => {
      const verified: Record<string, string> = {
        'Downtown Loft Apartment': 'https://www.airbnb.com/rooms/1104379617410107961',
        'Small Town Urban Oasis': 'https://www.airbnb.com/rooms/975590388116613421',
        'Upstairs Get Away': 'https://www.airbnb.com/rooms/1017325527624458850',
        'Apartment Centrally Located': 'https://www.airbnb.com/rooms/1157372418473093874',
        'Country Loft with a View': 'https://www.airbnb.com/rooms/1558714513062967677',
      };
      for (const [name, url] of Object.entries(verified)) {
        const c = marketComps.find((m) => m.name === name);
        expect(c, `seed comp "${name}" must exist`).toBeDefined();
        expect(c?.listingUrl).toBe(url);
      }
      // The two 404'd comps must ship with no listingUrl in seed data.
      expect(marketComps.find((m) => m.name === 'Vincennes Hideaway')?.listingUrl).toBeUndefined();
      expect(marketComps.find((m) => m.name === 'Unique Historical Apartment')?.listingUrl).toBeUndefined();
      // And no seed comp anywhere may carry the dead room IDs.
      const bad = ['1324918599263697867', '911846172806023965'];
      for (const c of marketComps) {
        if (c.listingUrl) {
          for (const id of bad) expect(c.listingUrl).not.toContain(id);
        }
      }
    });


    it('only renders the Open Airbnb link when the comp URL is a direct listing URL, and exposes the admin panel for owners to add missing URLs', () => {
      const source = readFileSync(resolve(process.cwd(), 'src/pages/AirbnbMarket.tsx'), 'utf8');

      expect(source).toContain('isDirectAirbnbListingUrl');
      expect(source).toContain('target="_blank"');
      expect(source).toContain('rel="noopener noreferrer"');
      expect(source).toContain('Open Airbnb ↗');
      expect(source).toContain('Exact listing link needed');
      // The Open Airbnb button must be guarded by the direct-URL check, not raw c.listingUrl.
      expect(source).toMatch(/hasDirect[\s\S]*?Open Airbnb/);
      // Admin path for owners to add/update a direct Airbnb listing URL must be present.
      expect(source).toContain('useUpdateCompListingUrl');
      expect(source).toContain('Add or update comp Airbnb listing URL');
    });
  });
});

});
