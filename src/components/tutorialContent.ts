export type TutorialIconName =
  | 'mountain'
  | 'layout-grid'
  | 'more-horizontal'
  | 'plus'
  | 'bed-double'
  | 'search'
  | 'inbox'
  | 'calendar'
  | 'dollar'
  | 'target'
  | 'wrench'
  | 'filter'
  | 'alert'
  | 'camera'
  | 'check-circle'
  | 'lightbulb'
  | 'credit-card'
  | 'split'
  | 'clipboard-check'
  | 'file-text'
  | 'hammer'
  | 'sparkles';

export interface TutorialStepContent {
  icon: TutorialIconName;
  title: string;
  description: string;
}

export const propertyManagerTutorialSteps: TutorialStepContent[] = [
  {
    icon: 'mountain',
    title: 'Welcome to Homestead Helper',
    description:
      'Your home base for 15 units — units, guests, payments, finances, and maintenance. This walkthrough covers everything currently shipped. Reopen it any time from the ⋮ menu (top-right) → "Help / Tutorial".',
  },
  {
    icon: 'layout-grid',
    title: 'Dashboard & Navigation',
    description:
      'Property managers see Units, Calendar, Requests, and Fix in the bottom bar. Finances, Airbnb Market, and (for admins) the Draw Dashboard live in the ⋮ overflow menu top-right. Maintenance-only users are routed straight to the Maintenance Portal.',
  },
  {
    icon: 'layout-grid',
    title: 'Unit Cards',
    description:
      'Each card shows current guest/tenant, rent, and next due date. Tap "More details" for check-in/out, deposits, and upcoming bookings. Drag cards to reorder. Unit 12 (office) and Unit 15 (long-term) are excluded from availability and short-term KPIs.',
  },
  {
    icon: 'more-horizontal',
    title: 'Quick Actions (⋯)',
    description:
      'Tap the three dots on any unit card to edit the unit, view lease history, add or change guest, record a payment, or end a lease.',
  },
  {
    icon: 'plus',
    title: 'Adding Units & Guests',
    description:
      'Use the gold "+" button to add a new unit (1BR / 2BR / Cottage) or book a future guest. Empty units show a big "Add Guest" button directly on the card.',
  },
  {
    icon: 'bed-double',
    title: 'Next Available & Search',
    description:
      'The three "Next Available" cards jump to the calendar for each unit type. "Find Available Units by Date" shows every open unit for a date range with night count, estimated revenue, and neighbor bookings — book straight from the result.',
  },
  {
    icon: 'inbox',
    title: 'Booking Requests Inbox',
    description:
      'Public requests from homestead-hill.com land in the Requests tab (banner on the dashboard when new). "Approve & Book" only lists units actually free for those exact dates — no double-booking. "Decline" clears the request.',
  },
  {
    icon: 'calendar',
    title: 'Calendar / Booking Timeline',
    description:
      'Gantt-style timeline of all bookings with payment markers. Use the arrows to move months, tap "Today" to snap back, pull down to refresh.',
  },
  {
    icon: 'credit-card',
    title: 'Booking Source vs Payment Method',
    description:
      'Booking source = where the booking came from (Airbnb, direct, referral). Payment method = how the money arrived (Airbnb payout, Stripe, Zelle, Cash, Check, Venmo, PayPal, Bank Transfer, Other). They are separate fields — set both when you record a payment.',
  },
  {
    icon: 'dollar',
    title: 'Recording & Editing Payments',
    description:
      'Open a unit → ⋯ → Record Payment (or use the inline scheduler). Enter amount, Received Date, optional Rent Due Date, status, and note. Status can be toggled to Paid later from the unit or Finance History. Payment Method is REQUIRED whenever status is Paid.',
  },
  {
    icon: 'split',
    title: 'Split Payments & Method "Other"',
    description:
      'For a single Paid payment split across methods (e.g. $800 Zelle + $200 Cash), enable Split and add allocations. Allocation totals MUST equal the payment amount — the dialog blocks save if they don\'t. Choosing "Other" reveals a required description field.',
  },
  {
    icon: 'alert',
    title: 'Needs Payment Method Review',
    description:
      'Legacy paid payments without a method are flagged "Needs payment method". A banner appears in Finance History with a filter to view just those rows. Open each, pick the correct method (or split), save — the flag clears automatically.',
  },
  {
    icon: 'filter',
    title: 'Finance History — Filters & Totals',
    description:
      'Finances → History supports filtering by unit, status, payment method, date range, and the review queue. Method totals reconcile at the bottom so Airbnb / Stripe / Zelle / Cash etc. sum to the filtered gross. Split payments show a "Multiple" chip; open the row for the full allocation breakdown.',
  },
  {
    icon: 'calendar',
    title: 'Report by: Received Date vs Due Date',
    description:
      'NEW: the "Report by" selector switches every filter, sort, method total, and CSV export between the payment Received Date and the Rent Due Date. Rent Due Date is optional — legacy rows with no due date show "Due date not recorded" and are excluded from Due-basis reports (never inferred).',
  },
  {
    icon: 'file-text',
    title: 'CSV Export & Receipts',
    description:
      'Export runs off the current filters + chosen date basis. The CSV includes both received_date and due_date columns plus a report_date matching the selected basis, method, allocation detail (one row per split), notes, unit, and guest — auditable end-to-end.',
  },
  {
    icon: 'target',
    title: 'Finances Dashboard, Management & Weekly',
    description:
      'Finances shows income vs expected with month / year / custom range comparisons. Management tab tracks each unit vs revenue target, occupancy, and Hannah\'s management fee. Weekly tab is the Friday summary — this week\'s income, next 30–60 day bookings, and vacancy gaps.',
  },
];

export const maintenanceTutorialSteps: TutorialStepContent[] = [
  {
    icon: 'wrench',
    title: 'Maintenance Portal Basics',
    description:
      'Work-order only view. Maintenance-only accounts land here on sign-in. Property managers/admins reach it via the Fix tab. See tenant reports, open the request, update status, add notes, and mark done.',
  },
  {
    icon: 'inbox',
    title: 'Intake: How Requests Arrive',
    description:
      'Tenants submit via the Tally form (QR codes on-property) or staff log directly via "Log Maintenance". Each request captures unit, description, urgency, reporter, and any tenant photos. New items appear immediately.',
  },
  {
    icon: 'alert',
    title: 'Triage — Start with New & Urgent',
    description:
      'Urgent items float to the top: gas leak, water leak, lockout, no heat/AC, electrical. Handle those before routine repairs. New → In Progress → Done is the required timeline.',
  },
  {
    icon: 'filter',
    title: 'Filter by Unit',
    description:
      'Use the unit dropdown when on-site or investigating one building. Switch back to "All units" before you leave so you don\'t miss another request.',
  },
  {
    icon: 'clipboard-check',
    title: 'Open & Assign the Work Order',
    description:
      'Tap a card for full description, photos, reporter, and timestamp. Review photos before driving over to bring the right tools/parts. Assignment and status changes are logged on the request timeline.',
  },
  {
    icon: 'check-circle',
    title: 'Keep Status Updated',
    description:
      'Move to In Progress when you start or schedule work. Mark Done only after the issue is fixed, the area is safe/clean, and any follow-up parts or vendor work are noted.',
  },
  {
    icon: 'camera',
    title: 'Notes, Photos & Proof',
    description:
      'Use Notes for what you found, what you fixed, parts used, and anything still open. Compare before/after photos and state the outcome clearly so the office knows what happened.',
  },
  {
    icon: 'lightbulb',
    title: 'Tips & Tricks',
    description:
      'Refresh if a request you expect is missing. Check Done before starting duplicate work. Don\'t delete or archive real requests unless Dalton/admin says so. When in doubt, leave a note instead of guessing.',
  },
];

export const adminTutorialSteps: TutorialStepContent[] = [
  ...propertyManagerTutorialSteps,
  ...maintenanceTutorialSteps,
  {
    icon: 'hammer',
    title: 'Draw Dashboard (Admin)',
    description:
      '⋮ menu → Draw Dashboard (/admin/draws). Mobile-first view of remodel budget, actual, open cost, projected (Actual + Open), Budget Remaining, and Funding Gap. Leads with Draw Readiness and a Draw-Safe Amount card. Watch the Unit 7 proxy overlap warning.',
  },
  {
    icon: 'clipboard-check',
    title: 'Cash Control & Evidence Rules',
    description:
      'Rows are grouped Actual / Open / Budget so budgets never inflate projected totals. Draw funding candidates from Incoming Review auto-apply as pending/approved with Acknowledge/Hide. Only rows marked readyForDraw (and not yet submittedToDerek) count toward the Draw-Ready amount. Reconciliation warnings fire when unit totals don\'t match.',
  },
  {
    icon: 'file-text',
    title: 'Draw Reports & CSV',
    description:
      'Unit drill-downs expose category, scope, vendor, budget, actual, open, and evidence/confidence badges. Export produces an auditable ledger. Incoming Review requires the HH_INCOMING_REVIEW_V1 marker and duplicate detection prevents double-counting.',
  },
  {
    icon: 'bed-double',
    title: 'Airbnb Market (Read-Only)',
    description:
      '⋮ menu → Airbnb Market. Five-signal snapshot per HH unit plus verified competitor comps. "Open Airbnb ↗" only appears for direct room URLs — search links are hidden. All data is manually curated; no automated Airbnb sync.',
  },
  {
    icon: 'sparkles',
    title: 'What Changed Recently',
    description:
      'NEW — Payment Method on every Paid payment (with Split + Other), a Needs-Review queue for legacy rows, an optional Rent Due Date on payments, and Finance History "Report by: Received Date vs Due Date" that also drives the CSV export. Historical rows without a due date stay blank — never inferred.',
  },
  {
    icon: 'mountain',
    title: 'You\'re Good to Go!',
    description:
      'That\'s the full tour. Tap the three dots (⋮) top-right anytime to reopen this walkthrough. Maintenance staff can reopen theirs from the Tutorial button in the Maintenance Portal header.',
  },
];
