

## Plan: Connect homestead-hill.com to this app for booking requests

### What this does
Your existing **homestead-hill.com** site hosts the public booking form (since the branding/emails are already set up there). When a guest submits a request, it lands in **this app's** Requests inbox where you approve or deny. Approving creates the booking on your calendar instantly.

### How the two projects connect
Both projects are on Lovable Cloud, so they each have their own backend. We have two options for sharing booking requests between them:

**Option A — Shared database table (cleanest):** The website writes booking requests directly into *this* app's database via the public Supabase API (using this project's URL + anon key). One source of truth, no syncing needed.

**Option B — Webhook:** Website keeps its own data and POSTs to an edge function on this app whenever a request comes in. More moving parts.

I'd recommend **Option A** — simpler, real-time, and matches how the rest of this app already works.

### What gets built here (this app)
1. **`booking_requests` table** with public INSERT (so the website can submit) and full RLS for you to read/update.
   - Fields: name, email, phone, check_in, check_out, num_guests, preferred_unit_type, source, notes, status (pending/approved/declined), assigned_unit_id, decline_reason, timestamps
2. **Requests inbox** — new tab + pending-count badge on the Units dashboard
3. **Request card** — shows guest details, # of nights, live availability check (which units are free for those dates), Approve / Decline buttons
4. **Approve flow** — opens the existing Future Guest dialog pre-filled with the request's data; you pick the unit + rate, save → booking created, request marked approved
5. **Decline flow** — optional reason, marks declined
6. **Realtime updates** — new requests appear instantly without refresh
7. **Tutorial step** explaining the new inbox

### What gets built on homestead-hill.com (separate project)
A booking request form page (e.g. `/book`) that:
- Collects: name, email, phone, dates, # guests, unit preference, source, notes
- On submit → inserts into this app's `booking_requests` table using this project's public anon key
- Sends the existing branded confirmation email from the website's email setup
- Shows a "We got it!" success page

I'll build the form there in a separate step **after** the inbox here is working — that way you can test end-to-end with a real submission.

### Email confirmation
Since homestead-hill.com already has email set up, the **guest confirmation email** ("we received your request") sends from there on submit — no email setup needed in this app. If you later want an **approval email** ("your booking is confirmed") to go out when you click approve here, we can add that as a follow-up (would need email setup in this app, or we can have this app ping the website to send it).

### Files in this project
**New:**
- `src/components/RequestsInbox.tsx`
- `src/components/RequestCard.tsx`
- `src/hooks/useBookingRequests.ts`
- DB migration for `booking_requests` table + RLS

**Modified:**
- `src/components/Dashboard.tsx` — add Requests view + pending badge
- `src/components/MobileBottomNav.tsx` — add Requests entry
- `src/components/FutureGuestDialog.tsx` — accept optional prefill from a request + callback to mark request approved on save
- `src/components/OnboardingTutorial.tsx` — new step

### Order
1. Build inbox + table + approval flow here (this project)
2. You confirm it looks good
3. Switch to homestead-hill.com project to add the form that writes here

### Heads-up
- The website will need this project's Supabase URL + anon key (both are public, safe to use in frontend code) — I'll grab them when we switch projects.
- No accounts needed on either side; matches your existing public-RLS pattern.

