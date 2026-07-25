# Homestead Helper execution roadmap

Updated: 2026-07-25

## Operating outcome

Homestead Helper is the shared daily operations app for Dalton, Briana, Wendy,
and approved maintenance vendors. It must remain simple on a phone, preserve a
clear source of truth, and never let an unverified message silently change a
stay or trigger an outbound communication.

## Non-negotiable controls

- GitHub is the code source of truth; Sites is the public host; the owned
  Supabase project is the application backend.
- Airbnb is authoritative for Airbnb reservations. Furnished Finder inquiries
  are not stays. Grasshopper messages are evidence until verified.
- External observations enter a manager review queue before canonical data.
- Cleaner completion never marks a unit ready; a manager verifies readiness.
- Email, calendar, and SMS remain independently gated. No outbound business
  communication is sent without Dalton's explicit approval of the specific
  canary or rollout.
- Historical Grasshopper data is append-only memory. A living unit dossier may
  summarize it but must retain source references, confidence, and conflicts.

## Current release

- Public Sites app: `https://homestead-helper.daltondellinger1.chatgpt.site`
- Release branch: `codex/sites-migration`
- Current production checkpoint before this roadmap: `50c4fcc`
- Owned Supabase project: `zcvkdtrsqxgwgkseqapa`
- Manager reservation review queue is live.
- Graham Reed / Unit 11 / July 27 checkout is the only explicitly approved
  correction from the current reconciliation.
- Ten source observations remain pending review. Paul / Unit 14 remains an
  unresolved text signal. The newer authenticated Airbnb snapshot for Raylon /
  Unit 3 is staged as a July 26 versus August 8 conflict; the canonical stay
  was not changed.
- Delivery gates are off. Historical Wendy emails already sent before the gate
  was restored remain audit history and must not be repeated or corrected
  without approval. Legacy booking-request guest emails now have their own
  default-off build gate.

## Priority 0 — trustworthy operating data

| Workstream | Owner | State | Completion proof |
| --- | --- | --- | --- |
| Normalized collector intake | Codex | In progress | Secret-protected endpoint stages idempotent observations, preserves reviewed decisions, and cannot create reservations or outbound messages |
| Current reservation reconciliation | Dalton/Briana review, Codex support | Ready for review | Every pending item is approved, rejected, or left explicitly unresolved with evidence |
| Grasshopper history backfill | Hermes collector + Codex archive | Archive engine built; live capture blocked by browser bridge | Append-only messages/calls/voicemails/attachments back to 2023 where available; stable source IDs; checkpointed resume; duplicate-free rerun |
| Living unit dossiers | Codex archive engine | Built against fixtures; real backfill pending | One dossier per unit tracks occupants, message history, maintenance, complaints, outcomes, confidence, contradictions, and source links |
| Ongoing source polling | Hermes collectors | Partial; hourly delivery corrected to local-only | Airbnb monitor plus Furnished Finder and Grasshopper incremental checkpoints produce the normalized observation contract without direct app writes |
| Source health visibility | Codex | Pending | Manager can see last successful poll, stale source, error, and unresolved mapping without opening Agent OS |

## Priority 1 — prove the daily workflow

| Workstream | Owner | State | Completion proof |
| --- | --- | --- | --- |
| Reservation to cleaning | Codex | Built; full live UAT pending | Approved reservation creates exactly one cleaning task; date change updates it; cancellation cancels incomplete work |
| Wendy cleaner journey | Codex + Wendy UAT | Built; acceptance pending | Login/link, confirm, decline, start, photos, findings, complete, and expired-link paths pass on Wendy's phone |
| Briana manager journey | Codex + Briana UAT | Built; acceptance pending | Today, units, reservation review, cleaning, readiness, maintenance, approvals, checklists, and activity pass on phone |
| Recovery and role boundaries | Codex | Admin and cleaner accounts verified; full matrix pending | Admin, property manager, cleaner, maintenance, public token, password recovery, and revoked-link tests pass without data leakage |
| No-outbound canary suite | Codex | Focused contracts and live queue audit pass; transactional test pending | Transactional test proves reservation-to-cleaning and review idempotency with delivery flags off and zero notification rows |

## Priority 2 — controlled delivery and maintenance dispatch

| Workstream | Owner | State | Completion proof |
| --- | --- | --- | --- |
| Cleaner email/calendar | Codex | Implemented, disabled | Dalton approves one named synthetic canary; one email and one calendar event are created, updated idempotently, and audited |
| Handyman first-accept | Codex | Implemented, SMS disabled | Consented roster, A2P approval, one controlled broadcast, atomic first acceptance, and loser notification all pass |
| Approval thresholds | Codex | Maintenance wired | Routine $250, emergency $500, supplies $250, and always-approve categories are exercised in UAT |
| Reminder/escalation automation | Hermes + app queue | Not enabled | Read-only supervisor prepares exceptions; app owns recipients, consent, templates, quiet hours, idempotency, and delivery receipts |

## Priority 3 — release hardening

- Complete the role-specific mobile UAT checklist and fix friction before
  adding secondary features.
- Add code splitting and performance budgets for the large application bundle.
- Resolve the repository-wide lint baseline without weakening app-specific
  safety checks.
- Merge the production branch to `main` after the current data and role UAT
  passes; keep GitHub merge, Supabase deployment, and Sites deployment as
  separate verified steps.
- Document backup, restore, monitoring, Edge Function failure, and rollback
  drills.

## Decisions reserved for Dalton

Codex should continue without interruption except when one of these is reached:

1. Approving or rejecting a real reservation observation when evidence is
   ambiguous or would change an occupied unit.
2. Approving a specific outbound email, calendar, or SMS canary and its named
   recipients.
3. Choosing or paying for a provider, domain, phone registration, or other
   external commitment.
4. Approving a destructive cleanup, irreversible production change, or a
   material change to roles, thresholds, retention, or guest communication
   policy.
