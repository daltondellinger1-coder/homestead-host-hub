import { useEffect, useState } from 'react';
import { supabase as appSupabase } from '@/integrations/supabase/client';

// The Homestead Hill website lives in a separate Supabase project
// (qihhgwslsjicjtrqvzsv). It syncs each unit's Airbnb iCal feed into a
// calendar_events table with source='airbnb'. RLS on calendar_events
// has a public SELECT policy, so the anon key below (baked into the
// public website bundle) is safe to embed here.
const WEBSITE_SUPABASE_URL = 'https://qihhgwslsjicjtrqvzsv.supabase.co';
const WEBSITE_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpaGhnd3Nsc2ppY2p0cnF2enN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNDExNzcsImV4cCI6MjA4MzYxNzE3N30.NFz2lT0h-L5gt84L5wAwTfGvKUvSko039--1fIsQ7c0';

export interface AirbnbBlock {
  id: string;
  unitId: string;   // app's unit UUID
  checkIn: string;  // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  summary: string;  // e.g. "Reserved", "Airbnb (Not available)"
}

function slugifyUnitName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Loads Airbnb blocks from the website's calendar_events table and maps
 * them to the app's unit UUIDs by matching slugified unit names.
 *
 * Returns a Map keyed by app unit UUID so callers can do O(1) lookups.
 * Blocks with past check_out dates are filtered out.
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

        // 2. Cross-project fetch of calendar_events from the website.
        const todayStr = new Date().toISOString().split('T')[0];
        const url =
          `${WEBSITE_SUPABASE_URL}/rest/v1/calendar_events?` +
          `select=id,unit_id,start_date,end_date,summary,source` +
          `&source=eq.airbnb&end_date=gte.${todayStr}` +
          `&order=unit_id,start_date`;
        const res = await fetch(url, {
          headers: {
            apikey: WEBSITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${WEBSITE_SUPABASE_ANON_KEY}`,
            Accept: 'application/json',
          },
        });
        if (!res.ok) {
          throw new Error(`calendar_events fetch: ${res.status} ${await res.text()}`);
        }
        const rows: {
          id: string;
          unit_id: string;
          start_date: string;
          end_date: string;
          summary: string | null;
        }[] = await res.json();

        // 3. Group by app unit UUID.
        const map = new Map<string, AirbnbBlock[]>();
        for (const r of rows) {
          const appUnitId = slugToUnitId.get(r.unit_id.toLowerCase());
          if (!appUnitId) continue; // unknown unit slug — skip
          const list = map.get(appUnitId) ?? [];
          list.push({
            id: r.id,
            unitId: appUnitId,
            checkIn: r.start_date,
            checkOut: r.end_date,
            summary: r.summary || 'Airbnb',
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
