import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  buildAirbnbMarketBriefing,
  staticAirbnbMarketBriefing,
  type AirbnbMarketAvailabilitySnapshotRow,
  type AirbnbMarketBriefing,
  type AirbnbMarketListingRow,
  type AirbnbMarketPriceSnapshotRow,
  type AirbnbMarketWeeklyBriefingRow,
} from '@/data/airbnbMarket';

type SupabaseAny = typeof supabase & {
  from: (table: string) => {
    select: (columns?: string) => {
      order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: unknown; error: { message: string } | null }>;
    } & Promise<{ data: unknown; error: { message: string } | null }>;
  };
};

const db = supabase as SupabaseAny;

async function orderedRows<T>(table: string, orderBy: string, ascending = true): Promise<T[]> {
  const { data, error } = await db.from(table).select('*').order(orderBy, { ascending });
  if (error) throw new Error(error.message);
  return (data || []) as T[];
}

export function useAirbnbMarketBriefing() {
  return useQuery<AirbnbMarketBriefing>({
    queryKey: ['airbnb-market-briefing'],
    queryFn: async () => {
      const [listings, priceSnapshots, availabilitySnapshots, weeklyBriefings] = await Promise.all([
        orderedRows<AirbnbMarketListingRow>('airbnb_market_listings', 'sort_order'),
        orderedRows<AirbnbMarketPriceSnapshotRow>('airbnb_price_snapshots', 'snapshot_date', false),
        orderedRows<AirbnbMarketAvailabilitySnapshotRow>('airbnb_availability_snapshots', 'snapshot_date', false),
        orderedRows<AirbnbMarketWeeklyBriefingRow>('airbnb_weekly_briefings', 'week_start', false),
      ]);

      return buildAirbnbMarketBriefing({
        listings,
        priceSnapshots,
        availabilitySnapshots,
        weeklyBriefing: weeklyBriefings[0] || null,
      });
    },
    initialData: staticAirbnbMarketBriefing,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
}
