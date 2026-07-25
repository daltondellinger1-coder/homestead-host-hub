# Grasshopper archive and unit dossiers

The archive builder is ready for a read-only authenticated collector. It does
not connect to Grasshopper itself and cannot send messages or alter call
settings. The collector supplies newline-delimited JSON and this builder writes
the durable Obsidian memory.

## Safety boundary

- Raw source records are append-only and deduplicated by stable `source_id`.
- A rerun reconstructs its dedupe index from the raw archive, so a restart
  between append and checkpoint cannot duplicate a source record.
- Conflicting content under an existing source ID stops the run.
- Uncertain contacts go to `unmapped-review-inbox.md`.
- Unit dossiers are deterministic, source-linked views of the raw archive.
- Grasshopper text never becomes a canonical stay. Only an explicit
  `reservation_signal` supplied by the collector is emitted, and it is forced
  into `homestead.reservation-observation.v1` with `canonical_changed: false`
  and `outbound_sent: false`.

## Collector record

```json
{
  "source_id": "grasshopper-stable-message-id",
  "kind": "message",
  "timestamp": "2026-07-25T16:00:00-04:00",
  "conversation_id": "stable-conversation-id",
  "direction": "inbound",
  "participants": ["Guest name or phone label"],
  "body": "Visible message text",
  "attachment_refs": ["read-only attachment reference"],
  "unit_hint": "Unit 3",
  "occupant_name": "Name only when explicitly known",
  "outcome": "Outcome only when explicitly documented"
}
```

Allowed kinds are `message`, `call`, `voicemail`, and `attachment`. Timestamps
must carry a timezone. A record may omit `unit_hint`; a single explicit unit in
the message body can be mapped, while ambiguous records remain unmapped.

## Run

```bash
python scripts/grasshopper_archive.py \
  --input /path/to/read-only-export.jsonl \
  --root "/mnt/c/Dalton/Obsidian/Evolving Brain/9 - Operations/properties/homestead-hill/grasshopper" \
  --cursor "opaque-collector-cursor"
```

The output root contains:

- `raw/YYYY-MM.jsonl` — append-only source archive
- `sources/*.md` — immutable, linkable source notes
- `unit-dossiers/unit-1.md` through `unit-14.md`
- `unmapped-review-inbox.md`
- `reservation-observations.jsonl` — review-only normalized signals
- `archive-manifest.json` — coverage, counts, gaps, dedupe, and sync status
- `checkpoint.json` — restart cursor and manifest checksum

## Live collector gate

The current Codex task cannot attach to the authenticated browser because its
browser bridge rejects the WSL workspace path before navigation. Do not bypass
that guard. Once a Windows-native browser task is available, the collector can
page backward to 2023, emit stable records in oldest-to-newest batches, and feed
this builder after each page. No Homestead Helper integration should be enabled
until the archive passes a duplicate-free rerun and a source-linked unit
complaint lookup against real records.
