

## Add Unit Types and "Next Available" Quick-Glance Cards

### What This Does
When you get a booking email, you'll see three cards at the top of the dashboard — one for each unit type (1BR, 2BR, Cottage) — instantly showing you the next available unit and when it opens up. No scrolling or scanning needed.

### How It Works

1. **Add a "unit type" field to units** — a new database column with three options: `1br`, `2br`, `cottage`. Existing units will default to `1br` (you can re-assign them afterward via Edit Unit).

2. **Update the Add Unit and Edit Unit dialogs** — both will include a "Unit Type" dropdown so you can categorize each unit when creating or editing.

3. **Build "Next Available" summary cards** — three new cards will appear at the top of the dashboard (above the existing Monthly Income / Occupancy stats). Each card shows:
   - The unit type label (e.g. "1 Bedroom")
   - The name of the next available unit (vacant now, or soonest checkout)
   - When it's available ("Available now" or "Opens Mar 15")
   - A count like "2 of 5 vacant"

4. **Availability logic** — for each unit type, the system will:
   - First look for units that are currently vacant (immediately available)
   - If none are vacant, find the occupied/rented unit with the earliest checkout date
   - Skip units in "planning" or "storage" status

### Technical Details

**Database Migration:**
- Add `unit_type` enum type: `1br`, `2br`, `cottage`
- Add `unit_type` column to `units` table, defaulting to `1br`, not null

**Files to modify:**
- `src/types/property.ts` — add `UnitType` type and labels map
- `src/components/AddUnitDialog.tsx` — add unit type selector, pass type to `onSave`
- `src/components/EditUnitDialog.tsx` — add unit type selector
- `src/hooks/usePropertyData.ts` — include `unit_type` in add/update unit functions; expose unit type data
- `src/components/StatsOverview.tsx` — add three "Next Available" cards below the existing two stats cards, computing availability per type from the units array
- `src/components/Dashboard.tsx` — pass units data to StatsOverview for availability computation

**No new pages or tabs** — everything stays on the dashboard, visible at a glance.

