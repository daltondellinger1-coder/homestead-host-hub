import type { HomesteadUnit, MarketComp, PricingRecommendation } from '@/data/airbnbMarket';

export type PricePositionLabel = 'Below market' | 'At market' | 'Above market' | 'Unknown';
export type AvailabilityLabel = 'Open 30 days' | 'Partially open' | 'Blocked' | 'Unknown';
export type TrustLabel = 'Strong trust' | 'Some trust' | 'Low trust' | 'No trust yet';
export type RecommendedMove = 'Hold' | 'Raise 5%' | 'Lower 5%' | 'Improve listing before pricing change';

export type CompRangeSummary = {
  count: number;
  median?: number;
  min?: number;
  max?: number;
};

export type PricePosition = {
  label: PricePositionLabel;
  median?: number;
  deltaDollar?: number; // monthly - median (negative = below)
  deltaPct?: number; // percent vs median; negative = below
  summary: string; // e.g. "$1,855/mo — 35% below comp median"
};

export type ProofScore = {
  score: 0 | 1 | 2 | 3 | 4 | 5;
  missingPhrase: string;
};

export function compMonthlyValues(comps: MarketComp[]): number[] {
  return comps
    .map((c) => c.monthlyEstimate)
    .filter((v): v is number => typeof v === 'number' && v > 0);
}

export function compRangeSummary(comps: MarketComp[]): CompRangeSummary {
  const values = compMonthlyValues(comps);
  if (!values.length) return { count: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
  return { count: sorted.length, median, min: sorted[0], max: sorted[sorted.length - 1] };
}

const AT_MARKET_PCT = 3;

export function pricePositionVsCompMedian(monthly: number | undefined, comps: MarketComp[]): PricePosition {
  const { median } = compRangeSummary(comps);
  if (!monthly || !median) {
    return { label: 'Unknown', median, summary: monthly ? `$${monthly.toLocaleString()}/mo — comp median unknown` : 'Monthly price unknown' };
  }
  const deltaDollar = monthly - median;
  const deltaPct = (deltaDollar / median) * 100;
  let label: PricePositionLabel;
  if (Math.abs(deltaPct) < AT_MARKET_PCT) label = 'At market';
  else if (deltaPct < 0) label = 'Below market';
  else label = 'Above market';
  const absPct = Math.round(Math.abs(deltaPct));
  const direction = label === 'At market' ? 'at comp median' : `${absPct}% ${label === 'Below market' ? 'below' : 'above'} comp median`;
  return {
    label,
    median,
    deltaDollar: Math.round(deltaDollar),
    deltaPct: Math.round(deltaPct * 10) / 10,
    summary: `$${monthly.toLocaleString()}/mo — ${direction}`,
  };
}

export function availabilityLabel(unit: HomesteadUnit): AvailabilityLabel {
  const a = unit.availability;
  if (!a || a.available30Day === undefined || a.available30Day === null) return 'Unknown';
  if (a.available30Day === true) return 'Open 30 days';
  if (a.nextAvailableDate) return 'Partially open';
  return 'Blocked';
}

const PROOF_CHECKS: { key: 'Laundry' | 'Parking' | 'WiFi/Workspace' | 'Full kitchen' | 'Crew beds'; label: string; test: (u: HomesteadUnit) => boolean }[] = [
  { key: 'Laundry', label: 'laundry', test: (u) => u.amenityMap.Laundry === true },
  { key: 'Parking', label: 'parking', test: (u) => u.amenityMap.Parking === true },
  { key: 'WiFi/Workspace', label: 'WiFi/workspace', test: (u) => u.amenityMap.WiFi === true || u.amenityMap.Workspace === true },
  { key: 'Full kitchen', label: 'kitchen', test: (u) => u.amenityMap['Full kitchen'] === true },
  { key: 'Crew beds', label: 'beds/crew fit', test: (u) => u.amenityMap['Crew beds'] === true },
];

export function longStayProofScore(unit: HomesteadUnit): ProofScore {
  const missing: string[] = [];
  let score = 0;
  for (const c of PROOF_CHECKS) {
    if (c.test(unit)) score += 1;
    else missing.push(c.label);
  }
  const missingPhrase = missing.length === 0 ? 'Listing proof looks complete' : `Missing proof: ${missing.join(', ')}`;
  return { score: score as ProofScore['score'], missingPhrase };
}

export function trustLabel(rating?: number, reviews?: number): TrustLabel {
  if (!rating || !reviews) return 'No trust yet';
  if (rating >= 4.7 && reviews >= 10) return 'Strong trust';
  if (rating >= 4.5 && reviews >= 3) return 'Some trust';
  return 'Low trust';
}

const RECOMMENDATION_LABEL: Record<PricingRecommendation, RecommendedMove> = {
  hold: 'Hold',
  'raise 5%': 'Raise 5%',
  'lower 5%': 'Lower 5%',
  'improve listing before pricing change': 'Improve listing before pricing change',
};

export function recommendedMove(unit: HomesteadUnit): RecommendedMove {
  return RECOMMENDATION_LABEL[unit.pricingRecommendation] ?? 'Hold';
}

export type TopSummary = {
  belowMarket: number;
  atMarket: number;
  aboveMarket: number;
  unknownPosition: number;
  needsProof: number; // units recommended "Improve listing before pricing change"
};

export function buildTopSummary(units: HomesteadUnit[], comps: MarketComp[]): TopSummary {
  const summary: TopSummary = { belowMarket: 0, atMarket: 0, aboveMarket: 0, unknownPosition: 0, needsProof: 0 };
  for (const u of units) {
    const pos = pricePositionVsCompMedian(u.monthlyPrice, comps);
    if (pos.label === 'Below market') summary.belowMarket += 1;
    else if (pos.label === 'At market') summary.atMarket += 1;
    else if (pos.label === 'Above market') summary.aboveMarket += 1;
    else summary.unknownPosition += 1;
    if (recommendedMove(u) === 'Improve listing before pricing change') summary.needsProof += 1;
  }
  return summary;
}

/**
 * Returns true only for direct Airbnb listing URLs:
 *   https://www.airbnb.com/rooms/<numeric id>
 *   https://www.airbnb.com/h/<slug>
 * Generic search URLs like /s/... or any non-airbnb host are rejected, so the
 * dashboard never advertises a search page as if it were a real comp listing.
 */
export function isDirectAirbnbListingUrl(url?: string | null): url is string {
  if (!url || typeof url !== 'string') return false;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  const host = parsed.hostname.toLowerCase();
  if (host !== 'airbnb.com' && !host.endsWith('.airbnb.com')) return false;
  return /^\/(rooms\/\d+|h\/[A-Za-z0-9_-]+)(?:\/|$)/.test(parsed.pathname);
}
