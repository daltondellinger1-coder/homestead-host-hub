# Homestead Helper Sites migration

## Objective

Move the Homestead Helper web application from Lovable hosting to OpenAI Sites
without interrupting the existing production application.

## What this branch changes

- Removes the Lovable-only component tagging build dependency.
- Builds the React application as a Cloudflare Worker-compatible Sites artifact.
- Preserves single-page application routing for direct links such as
  `/operations`, `/auth`, and `/cleaning/:token`.
- Keeps the existing Supabase client and production database connection.
- Replaces Lovable social metadata with a Homestead Helper social card whose
  absolute URL is derived from the deployed request origin.
- Adds no Sites D1 or R2 storage because Supabase remains the application system
  of record during this hosting migration.

## Cutover boundary

Publishing this branch moves the frontend only. The database, authentication,
storage, and Edge Functions remain on the existing Supabase project so users and
business records are not copied or reset during the hosting change.

Lovable should remain published until the Sites deployment passes:

1. Root, `/auth`, `/operations`, and a synthetic invalid cleaner-link smoke test.
2. A real authorized login.
3. Read-only dashboard and operations data checks.
4. One controlled cleaner-link check.

After the Sites URL is accepted:

1. Set the Supabase `APP_PUBLIC_URL` secret to the Sites production origin.
2. Add the Sites origin to Supabase authentication redirect/site URL settings.
3. Re-run cleaner-link, sign-in, and Edge Function CORS checks.
4. Point the desired custom domain to Sites.
5. Keep Lovable as a rollback host until the controlled cutover is stable.

## Separate backend migration

This branch removes Lovable as the web host. It does not yet move the Lovable
Cloud-managed Supabase project. Moving that backend requires a separate audited
restore of schema, data, authentication users, storage objects, Edge Functions,
and secrets into a Dalton-owned Supabase organization.
