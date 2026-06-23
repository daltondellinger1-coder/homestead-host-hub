import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildAirbnbMarketBriefing, homesteadUnits } from '@/data/airbnbMarket';

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
  });
});
