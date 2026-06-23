import { describe, it, expect } from 'vitest';
import {
  pricePositionVsCompMedian,
  availabilityLabel,
  longStayProofScore,
  trustLabel,
  recommendedMove,
  buildTopSummary,
  compRangeSummary,
} from './airbnbMarketSignals';
import type { HomesteadUnit, MarketComp } from '@/data/airbnbMarket';

const comp = (name: string, monthlyEstimate?: number): MarketComp => ({
  name,
  compType: 'direct',
  monthlyEstimate,
  contractorAmenities: [],
  amenityMap: {},
  notes: '',
});

const unit = (overrides: Partial<HomesteadUnit> = {}): HomesteadUnit => ({
  unit: 'Unit X',
  bedrooms: 2,
  baths: 1,
  bestFor: '',
  status: 'verify',
  amenities: [],
  amenityMap: {},
  missingOrUnclear: [],
  photoActions: [],
  ownerAction: '',
  dataStatus: '',
  pricingRecommendation: 'hold',
  ...overrides,
});

describe('compRangeSummary', () => {
  it('returns count, median, min, max for monthly comps', () => {
    const result = compRangeSummary([comp('a', 2250), comp('b', 2640), comp('c', 2850), comp('d', 2970), comp('e', 4650)]);
    expect(result).toEqual({ count: 5, median: 2850, min: 2250, max: 4650 });
  });
  it('ignores comps without a monthly estimate', () => {
    expect(compRangeSummary([comp('a'), comp('b', 2000)])).toEqual({ count: 1, median: 2000, min: 2000, max: 2000 });
  });
});

describe('pricePositionVsCompMedian', () => {
  const comps = [comp('a', 2250), comp('b', 2640), comp('c', 2850), comp('d', 2970), comp('e', 4650)];

  it('flags Below market with percent and dollar delta', () => {
    const pos = pricePositionVsCompMedian(1855, comps);
    expect(pos.label).toBe('Below market');
    expect(pos.median).toBe(2850);
    expect(pos.deltaDollar).toBe(-995);
    expect(Math.round(pos.deltaPct!)).toBe(-35);
    expect(pos.summary).toBe('$1,855/mo — 35% below comp median');
  });

  it('flags At market when within 3% of median', () => {
    expect(pricePositionVsCompMedian(2850, comps).label).toBe('At market');
    expect(pricePositionVsCompMedian(2900, comps).label).toBe('At market');
  });

  it('flags Above market', () => {
    expect(pricePositionVsCompMedian(3500, comps).label).toBe('Above market');
  });

  it('returns Unknown when monthly or comps missing', () => {
    expect(pricePositionVsCompMedian(undefined, comps).label).toBe('Unknown');
    expect(pricePositionVsCompMedian(1855, []).label).toBe('Unknown');
  });
});

describe('availabilityLabel', () => {
  it('maps each availability state', () => {
    expect(availabilityLabel(unit())).toBe('Unknown');
    expect(availabilityLabel(unit({ availability: { available30Day: true } }))).toBe('Open 30 days');
    expect(availabilityLabel(unit({ availability: { available30Day: false, nextAvailableDate: '2026-07-15' } }))).toBe('Partially open');
    expect(availabilityLabel(unit({ availability: { available30Day: false } }))).toBe('Blocked');
  });
});

describe('longStayProofScore', () => {
  it('scores all five categories', () => {
    const full = unit({ amenityMap: { Laundry: true, Parking: true, WiFi: true, 'Full kitchen': true, 'Crew beds': true } });
    expect(longStayProofScore(full)).toEqual({ score: 5, missingPhrase: 'Listing proof looks complete' });
  });
  it('counts WiFi or Workspace as the same proof bucket', () => {
    const u = unit({ amenityMap: { Workspace: true } });
    expect(longStayProofScore(u).score).toBe(1);
  });
  it('returns short missing phrase listing only failed checks', () => {
    const u = unit({ amenityMap: { 'Full kitchen': true } });
    const r = longStayProofScore(u);
    expect(r.score).toBe(1);
    expect(r.missingPhrase).toBe('Missing proof: laundry, parking, WiFi/workspace, beds/crew fit');
  });
});

describe('trustLabel', () => {
  it('maps rating + review counts to a trust tier', () => {
    expect(trustLabel(undefined, undefined)).toBe('No trust yet');
    expect(trustLabel(4.9, 0)).toBe('No trust yet');
    expect(trustLabel(4.8, 12)).toBe('Strong trust');
    expect(trustLabel(4.5, 5)).toBe('Some trust');
    expect(trustLabel(4.75, 4)).toBe('Some trust');
    expect(trustLabel(4.2, 20)).toBe('Low trust');
  });
});

describe('recommendedMove', () => {
  it('formats every pricing recommendation', () => {
    expect(recommendedMove(unit({ pricingRecommendation: 'hold' }))).toBe('Hold');
    expect(recommendedMove(unit({ pricingRecommendation: 'raise 5%' }))).toBe('Raise 5%');
    expect(recommendedMove(unit({ pricingRecommendation: 'lower 5%' }))).toBe('Lower 5%');
    expect(recommendedMove(unit({ pricingRecommendation: 'improve listing before pricing change' }))).toBe('Improve listing before pricing change');
  });
});

describe('buildTopSummary', () => {
  it('counts units by price position and needs-proof flag', () => {
    const comps = [comp('a', 2500), comp('b', 2800), comp('c', 3000)];
    const units = [
      unit({ unit: 'U1', monthlyPrice: 1800, pricingRecommendation: 'improve listing before pricing change' }),
      unit({ unit: 'U2', monthlyPrice: 2800, pricingRecommendation: 'hold' }),
      unit({ unit: 'U3', monthlyPrice: 3500, pricingRecommendation: 'lower 5%' }),
      unit({ unit: 'U4', pricingRecommendation: 'improve listing before pricing change' }),
    ];
    expect(buildTopSummary(units, comps)).toEqual({
      belowMarket: 1,
      atMarket: 1,
      aboveMarket: 1,
      unknownPosition: 1,
      needsProof: 2,
    });
  });
});
