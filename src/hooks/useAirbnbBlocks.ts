import { useEffect, useState } from 'react';
import { supabase as appSupabase } from '@/integrations/supabase/client';

// The Homestead Hill public website lives in a separate Supabase project
// (qihhgwslsjicjtrqvzsv). Its calendar_events table is intentionally not
// publicly selectable; public callers must use SECURITY DEFINER RPCs that
// return sanitized blocked date ranges only.
const WEBSITE_SUPABASE_URL = 'https://qihhgwslsjicjtrqvzsv.supabase.co';
const WEBSITE_SUPABASE_ANON_KEY =
  'eyJhbG...Q7c0';

export interface AirbnbBlock {
  id: string;
  unitId: string;   // app's unit UUID
  checkIn: string;  // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  summary: string;  // e.g. "Channel block", "Reserved"
}

function slugifyUnitName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type BlockedRangeRow = {
  unit_id: string;
  start_date: string;
  end_date: string;
};

/**
 * Loads public blocked ranges from the Homestead Hill website project and maps
 * them to this app's unit UUIDs by matching slugified unit names.
 *
 * Returns a Map keyed by app unit UUID so callers can do O(1) lookups.
 * Blocks with past end dates are filtered out by the website RPC.
 */
export function useAirbnbBlocks() {
  const [blocksByUnit, setBlocksByUnit] = useState<Map<string, AirbnbBlock[]>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 1. Fetch the app's units so we can map slug → UUID.
        const { data: units, error: unitsErr } = await appSupabase
          .from('units')
          .select('id, name');
        if (unitsErr) throw new Error(`units fetch: ${unitsErr.message}`);

        const slugToUnitId = new Map<string, string>();
        for (const u of units ?? []) {
          slugToUnitId.set(slugifyUnitName(u.name), u.id);
        }

        // 2. Cross-project fetch through the public sanitized blocked-range RPC.
        const res = await fetch(`${WEBSITE_SUPABASE_URL}/rest/v1/rpc/get_all_blocked_ranges`, {
          method: 'POST',
          headers: {
            apikey: WEBSITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${WEBSITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          throw new Error(`get_all_blocked_ranges fetch: ${res.status} ${await res.text()}`);
        }
        const rows: BlockedRangeRow[] = await res.json();

        // 3. Group by app unit UUID.
        const map = new Map<string, AirbnbBlock[]>();
        for (const r of rows) {
          const appUnitId = slugToUnitId.get(r.unit_id.toLowerCase());
          if (!appUnitId) continue; // unknown unit slug — skip
          const list = map.get(appUnitId) ?? [];
          list.push({
            id: `${r.unit_id}:${r.start_date}:${r.end_date}`,
            unitId: appUnitId,
            checkIn: r.start_date,
            checkOut: r.end_date,
            summary: 'Channel block',
          });
          map.set(appUnitId, list);
        }

        if (!cancelled) {
          setBlocksByUnit(map);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('useAirbnbBlocks load failed:', err);
        if (!cancelled) {
          setError(err.message ?? String(err));
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { blocksByUnit, loading, error };
}
