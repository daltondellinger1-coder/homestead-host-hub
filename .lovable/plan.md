## Maintenance Work Order System

You picked the lightest path. The tenant-facing form is a third-party tool (Tally, Jotform, or Google Forms with file upload). Host Hub gets a simple **Maintenance** tab to track open/in-progress/done work orders. No website changes, no edge functions for the form itself, no photo storage to set up — the form vendor stores the photos and links them in the email.

### How it flows

```text
Tenant scans QR in unit
        ↓
Third-party form (per-unit URL with unit prefilled)
        ↓
Form vendor emails: you + maintenance contact
   (subject + photos + unit + description)
        ↓
You open Host Hub → Maintenance tab
        ↓
Click "+ Log request" → paste/type details, attach link
        ↓
Track: New → In Progress → Done (+ notes)
```

### What I'll build in Host Hub

**1. New `maintenance_requests` table**
- `id`, `unit_id` (FK to units), `title`, `description`, `status` (`new` | `in_progress` | `done`), `reported_at`, `completed_at`, `notes`, `photo_url` (optional text — paste the link from the form email), `reporter_name`, `created_at`, `updated_at`
- Public RLS (matches the rest of your tables)

**2. Maintenance page (`/maintenance`)**
- Three sections: **New**, **In Progress**, **Done** (collapsible, recent first)
- Each card shows: unit name, title, reported date, photo thumbnail (if URL pasted)
- Tap a card → dialog with full description, notes field, status toggle, delete
- Filter by unit
- Empty state explains the QR/form workflow

**3. Bottom nav + desktop nav entry**
- Add "Maintenance" with a wrench icon
- Badge with count of `new` requests (red dot, like an inbox)

**4. "Log request" dialog**
- Unit picker (defaults to most-recent), title, description, optional photo URL, reporter name
- Lets you quickly turn an email/text/call into a tracked work order

**5. Unit card integration**
- On each unit card, small indicator if that unit has open maintenance ("🔧 2 open")
- Tap → filters Maintenance page to that unit

### What you set up outside the app (one-time, ~15 min)

I'll give you exact step-by-step instructions in chat after the build, but the gist:

1. **Pick a form tool**:
   - **Tally** (recommended — free, generous, supports file uploads, hidden fields, email notifications)
   - **Jotform** (free tier supports photos, slicker)
   - **Google Forms** (free, photos work but uglier and requires Google sign-in for uploads — not great for tenants)
2. **Build one form** with fields: Name, Issue title, Description, Photos (required, allow multiple), Unit (hidden field, prefilled from URL)
3. **Configure two email notifications** on submit: one to you, one to maintenance contact. Email includes all answers + photo links.
4. **Generate 13 QR codes** (one per rentable unit, excluding 12 and 15) — each QR encodes the form URL with `?unit=Unit+1` etc. so the unit field auto-fills. I'll provide a script that generates all 13 QR PNGs at once for printing.
5. Print + post in each unit (laminated card on fridge or inside cabinet door is typical).

### Why this approach over building a custom form

- **Zero infrastructure** for photo storage (Tally/Jotform handle it; photos stay accessible via link in email)
- **Built-in email notifications** to multiple recipients with zero edge-function work
- **You can change the form** (add fields, tweak wording) without touching the app
- **Tenants get a polished, mobile-optimized form** for free
- Tradeoff: you manually log requests into Host Hub from the email. For ~15 units this is seconds per request and gives you a clean tracker without the maintenance burden.

### Out of scope (not building)

- Auto-creating Host Hub records from form submissions (would need website edge function + webhook — say the word later if email-to-app gets tedious)
- Priority levels, assignee field, cost tracking, recurring/preventive maintenance
- SMS notifications
- Vendor directory

### Files I'll create/edit

**New:**
- `supabase/migrations/<timestamp>_maintenance_requests.sql` — table + RLS
- `src/hooks/useMaintenanceRequests.ts` — CRUD hook with realtime
- `src/pages/Maintenance.tsx` — main page
- `src/components/MaintenanceRequestCard.tsx` — list card
- `src/components/MaintenanceRequestDialog.tsx` — detail/edit dialog
- `src/components/LogMaintenanceDialog.tsx` — quick-add form
- `scripts/generate-qr-codes.md` — one-time QR generation instructions (using a free online QR generator since you only do this once)

**Edited:**
- `src/integrations/supabase/types.ts` (auto)
- `src/components/MobileBottomNav.tsx` — add Maintenance tab + badge
- `src/App.tsx` — add `/maintenance` route
- `src/components/UnitCard.tsx` — small open-requests indicator

### After I ship

I'll give you a chat message with:
1. A direct link to sign up for Tally and a screenshot-by-screenshot guide to building the form (5 min)
2. The exact URL format with the `?unit=` parameter
3. A free QR generator link + the 13 URLs ready to paste
4. A printable PDF template suggestion for the in-unit cards
