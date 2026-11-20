# Reservation reconciliation shadow

The reservation reconciliation controller runs for three 24-hour periods before
any live reconciliation is considered.

## What it does

- Reads the local, authenticated Hermes occupancy snapshot.
- Limits canonical candidates to mapped Homestead Hill Airbnb reservations.
- Requires two identical successful reads at least 30 minutes apart.
- Compares them with the documented Homestead Helper snapshot.
- Classifies exact matches, proposed additions, proposed date updates, and
  exceptions.
- Stores a daily evidence packet in Obsidian.
- Places one plain-English approval request at a time in Agent OS **Needs Me**.
- Records Dalton's reply as shadow-evaluation evidence.

## What it cannot do

- It has no Supabase write path.
- It does not call the reservation review RPC.
- It cannot create or modify reservations or cleaning assignments.
- It cannot send email, calendar invitations, SMS, Telegram, Discord, or
  Grasshopper messages.
- Furnished Finder inquiries and Grasshopper text signals never become
  canonical candidates.
- College Town Comfort is excluded from the Homestead Hill candidate set.
- It cannot silently enable live mode.

After three complete days and three answered packets, Agent OS asks for a
separate final decision. Even the phrase in that final response does not enable
live behavior; it only authorizes a separately reviewed implementation step.

## Runtime

- Source: `~/.hermes/state/homestead-occupancy-monitor.json`
- State: `~/.hermes/state/homestead-reservation-shadow.json`
- Evidence:
  `Evolving Brain/9 - Operations/properties/homestead-hill/reservation-shadow/`
- Scheduler: local-only Hermes no-agent job, hourly, offset after the occupancy
  monitor

The controller is idempotent across reruns and restarts. A source acquisition
error fails closed before state or approval creation.
