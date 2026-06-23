import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildManualSnapshotRows, type AirbnbMarketWeeklyBriefingRow, type ManualSnapshotFormValues } from '@/data/airbnbMarket';

type SupabaseWriteAny = typeof supabase & {
  from: (table: string) => {
    insert: (row: unknown) => Promise<{ error: { message: string } | null }>;
    upsert: (row: unknown, options?: { onConflict?: string }) => Promise<{ error: { message: string } | null }>;
    update: (row: unknown) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

const db = supabase as SupabaseWriteAny;

export function useAirbnbMarketSnapshotAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ManualSnapshotFormValues) => {
      const rows = buildManualSnapshotRows(values);
      const priceResult = await db.from('airbnb_price_snapshots').upsert(rows.price, { onConflict: 'listing_id,snapshot_date' });
      if (priceResult.error) throw new Error(priceResult.error.message);

      const availabilityResult = await db.from('airbnb_availability_snapshots').upsert(rows.availability, { onConflict: 'listing_id,snapshot_date' });
      if (availabilityResult.error) throw new Error(availabilityResult.error.message);

      return rows;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airbnb-market-briefing'] });
    },
  });
}

export function useAirbnbMarketWeeklyBriefingAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (briefing: AirbnbMarketWeeklyBriefingRow) => {
      const result = await db.from('airbnb_weekly_briefings').upsert(briefing, { onConflict: 'week_start' });
      if (result.error) throw new Error(result.error.message);
      return briefing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airbnb-market-briefing'] });
    },
  });
}
