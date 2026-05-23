-- Prevent duplicate Tally retries from creating duplicate maintenance work orders.
-- Allows manually logged requests to keep tally_event_id null.
create unique index if not exists maintenance_requests_tally_event_id_unique
  on public.maintenance_requests (tally_event_id)
  where tally_event_id is not null;
