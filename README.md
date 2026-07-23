# Homestead Helper

Homestead Helper is Homestead Hill’s internal property-operations command center. It gives the owner, property manager, maintenance team, and cleaner a role-appropriate view of the property’s 15 furnished-rental units.

The application is built with React, TypeScript, Vite, Tailwind, shadcn/ui, and Supabase. It is connected to Lovable through GitHub.

## Daily workflows

- Today-first operations dashboard
- Unit status board
- Guests and reservations
- Arrivals and departures
- Cleaning, confirmation, completion, and readiness verification
- Maintenance and vendors
- Morning, end-of-day, and weekly checklists
- Tasks, approvals, notifications, and activity history
- Limited cleaner accounts and expiring cleaner links
- Existing bookings, availability, payments, and reporting tools

## Source-of-truth boundaries

- Property operations: Homestead Helper
- Booking-platform reservation details and guest messages: original booking platform until integrations are verified
- Accounting: QuickBooks
- Credentials and access secrets: 1Password
- Shared cleaning visibility: Google Calendar after its connection is verified

Do not store passwords, door codes, Wi-Fi passwords, payment credentials, or recovery information in this application.

## Local development

Copy `.env.example` to `.env`, add the existing Supabase project’s public URL and publishable key, then:

```sh
npm install
npm run dev
```

Run the complete local checks with:

```sh
npm test
npm run build
```

The current lockfile is inherited from Lovable. Use `npm install` rather than `npm ci` until the lockfile is synchronized.

## Operations rollout

The deployment, migration, role assignment, integration setup, acceptance checklist, and rollback procedure are documented in [docs/HOMESTEAD_HELPER_V1.md](docs/HOMESTEAD_HELPER_V1.md).
