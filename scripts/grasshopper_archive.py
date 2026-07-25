#!/usr/bin/env python3
"""Build a restart-safe, read-only Grasshopper archive in Obsidian.

The collector boundary is newline-delimited JSON. This program never connects
to Grasshopper and never sends or changes anything there. It only accepts
records already captured by an authenticated, read-only collector.
"""

from __future__ import annotations

import argparse
import calendar
import hashlib
import json
import os
import re
import tempfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

SCHEMA_VERSION = 1
KINDS = {"message", "call", "voicemail", "attachment"}
DIRECTIONS = {"inbound", "outbound", "unknown"}
UNIT_PATTERN = re.compile(r"\b(?:homestead\s+hill\s*[-–—:]?\s*)?unit\s*(1[0-4]|[1-9])\b", re.I)
MAINTENANCE_PATTERN = re.compile(
    r"\b(?:leak|plumb|toilet|sink|shower|drain|water|hvac|air condition|heat|"
    r"thermostat|electric|outlet|breaker|light|lock|door|window|appliance|"
    r"refrigerator|fridge|stove|oven|washer|dryer|repair|maintenance|broken)\b",
    re.I,
)
COMPLAINT_PATTERN = re.compile(
    r"\b(?:complain|problem|issue|unhappy|dirty|noise|smell|odor|mold|bug|"
    r"roach|bedbug|not working|doesn['’]?t work|didn['’]?t work|broken|"
    r"too hot|too cold|no hot water|no heat|no air)\b",
    re.I,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_timestamp(value: Any) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("timestamp is required")
    candidate = value.strip().replace("Z", "+00:00")
    parsed = datetime.fromisoformat(candidate)
    if parsed.tzinfo is None:
        raise ValueError("timestamp must include a timezone")
    return parsed.astimezone(timezone.utc)


def stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def record_digest(record: dict[str, Any]) -> str:
    return hashlib.sha256(stable_json(record).encode("utf-8")).hexdigest()


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def validate_record(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("each input line must be a JSON object")
    record = dict(value)
    source_id = record.get("source_id")
    if not isinstance(source_id, str) or not source_id.strip():
        raise ValueError("source_id is required")
    record["source_id"] = source_id.strip()
    if record.get("kind") not in KINDS:
        raise ValueError(f"{record['source_id']}: invalid kind")
    if record.get("direction", "unknown") not in DIRECTIONS:
        raise ValueError(f"{record['source_id']}: invalid direction")
    record["direction"] = record.get("direction", "unknown")
    record["timestamp"] = parse_timestamp(record.get("timestamp")).isoformat()
    participants = record.get("participants", [])
    if not isinstance(participants, list) or not all(isinstance(item, str) for item in participants):
        raise ValueError(f"{record['source_id']}: participants must be a list of strings")
    record["participants"] = participants
    attachment_refs = record.get("attachment_refs", [])
    if not isinstance(attachment_refs, list) or not all(isinstance(item, str) for item in attachment_refs):
        raise ValueError(f"{record['source_id']}: attachment_refs must be a list of strings")
    record["attachment_refs"] = attachment_refs
    for field in ("conversation_id", "body", "unit_hint", "occupant_name", "outcome"):
        if field in record and record[field] is not None and not isinstance(record[field], str):
            raise ValueError(f"{record['source_id']}: {field} must be a string")
    return record


def load_input(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            records.append(validate_record(json.loads(line)))
        except (ValueError, json.JSONDecodeError) as exc:
            raise ValueError(f"{path}:{line_number}: {exc}") from exc
    return records


def iter_archive(root: Path) -> Iterable[tuple[dict[str, Any], Path]]:
    for path in sorted((root / "raw").glob("*.jsonl")):
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if not line.strip():
                continue
            try:
                yield validate_record(json.loads(line)), path
            except (ValueError, json.JSONDecodeError) as exc:
                raise ValueError(f"{path}:{line_number}: existing archive is invalid: {exc}") from exc


def month_key(timestamp: str) -> str:
    return parse_timestamp(timestamp).strftime("%Y-%m")


def append_records(root: Path, records: list[dict[str, Any]]) -> tuple[int, int, list[str]]:
    existing: dict[str, str] = {}
    for record, _ in iter_archive(root):
        source_id = record["source_id"]
        digest = record_digest(record)
        if source_id in existing and existing[source_id] != digest:
            raise ValueError(f"archive already contains conflicting source_id {source_id}")
        existing[source_id] = digest

    new_by_month: dict[str, list[dict[str, Any]]] = defaultdict(list)
    duplicates = 0
    conflicts: list[str] = []
    seen_this_run: dict[str, str] = {}
    for record in records:
        source_id = record["source_id"]
        digest = record_digest(record)
        prior_digest = existing.get(source_id) or seen_this_run.get(source_id)
        if prior_digest:
            duplicates += 1
            if prior_digest != digest:
                conflicts.append(source_id)
            continue
        seen_this_run[source_id] = digest
        new_by_month[month_key(record["timestamp"])].append(record)

    if conflicts:
        raise ValueError("conflicting duplicate source_id values: " + ", ".join(sorted(set(conflicts))))

    appended = 0
    for month, month_records in sorted(new_by_month.items()):
        archive_path = root / "raw" / f"{month}.jsonl"
        archive_path.parent.mkdir(parents=True, exist_ok=True)
        with archive_path.open("a", encoding="utf-8", newline="\n") as handle:
            for record in month_records:
                handle.write(stable_json(record) + "\n")
                handle.flush()
                os.fsync(handle.fileno())
                appended += 1
    return appended, duplicates, conflicts


def unit_for(record: dict[str, Any]) -> str | None:
    hint = (record.get("unit_hint") or "").strip()
    hint_match = UNIT_PATTERN.search(hint)
    if hint_match:
        return f"Unit {int(hint_match.group(1))}"
    body_matches = {int(value) for value in UNIT_PATTERN.findall(record.get("body") or "")}
    if len(body_matches) == 1:
        return f"Unit {body_matches.pop()}"
    return None


def source_slug(source_id: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", source_id).strip("-")
    return safe[:140] or hashlib.sha256(source_id.encode()).hexdigest()


def compact(value: str | None, limit: int = 220) -> str:
    text = re.sub(r"\s+", " ", value or "").strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def source_note(record: dict[str, Any]) -> str:
    attachments = record.get("attachment_refs") or []
    body = record.get("body") or ""
    lines = [
        "---",
        'type: "grasshopper-source-record"',
        f'schema_version: {SCHEMA_VERSION}',
        f'source_id: {json.dumps(record["source_id"], ensure_ascii=False)}',
        f'timestamp: {json.dumps(record["timestamp"])}',
        f'kind: {json.dumps(record["kind"])}',
        f'direction: {json.dumps(record["direction"])}',
        f'conversation_id: {json.dumps(record.get("conversation_id"))}',
        f'record_sha256: "{record_digest(record)}"',
        "---",
        "",
        f"# Grasshopper source {record['source_id']}",
        "",
        f"- Participants: {', '.join(record['participants']) or 'Unknown'}",
        f"- Unit hint: {record.get('unit_hint') or 'None'}",
        f"- Occupant: {record.get('occupant_name') or 'Unknown'}",
        f"- Attachments: {', '.join(attachments) or 'None'}",
        "",
        "## Content",
        "",
        body or "_No text content captured._",
        "",
    ]
    return "\n".join(lines)


def render_dossier(unit: str, records: list[dict[str, Any]], synced_at: str) -> str:
    ordered = sorted(records, key=lambda item: (item["timestamp"], item["source_id"]))
    occupants = sorted({item["occupant_name"].strip() for item in ordered if item.get("occupant_name")})
    maintenance = [item for item in ordered if MAINTENANCE_PATTERN.search(item.get("body") or "")]
    complaints = [item for item in ordered if COMPLAINT_PATTERN.search(item.get("body") or "")]

    def timeline(items: list[dict[str, Any]]) -> list[str]:
        if not items:
            return ["- None captured."]
        return [
            (
                f"- {item['timestamp']} — {item['kind']} / {item['direction']} — "
                f"{compact(item.get('body')) or 'No text'} "
                f"([[../sources/{source_slug(item['source_id'])}|source]])"
            )
            for item in items
        ]

    lines = [
        "---",
        'type: "homestead-unit-grasshopper-dossier"',
        f'unit: "{unit}"',
        f'last_built_at: "{synced_at}"',
        f"source_record_count: {len(ordered)}",
        "---",
        "",
        f"# {unit} Grasshopper dossier",
        "",
        "This is a source-linked working dossier. Messages are evidence, not canonical reservation data.",
        "",
        "## Known occupants",
        "",
        *([f"- {name}" for name in occupants] or ["- None explicitly identified."]),
        "",
        "## Complaints and feedback",
        "",
        *timeline(complaints),
        "",
        "## Maintenance issues",
        "",
        *timeline(maintenance),
        "",
        "## Outcomes",
        "",
        *(
            [
                f"- {item['timestamp']} — {compact(item.get('outcome'))} "
                f"([[../sources/{source_slug(item['source_id'])}|source]])"
                for item in ordered
                if item.get("outcome")
            ]
            or ["- None explicitly captured."]
        ),
        "",
        "## Complete message and call timeline",
        "",
        *timeline(ordered),
        "",
    ]
    return "\n".join(lines)


def render_unmapped(records: list[dict[str, Any]], synced_at: str) -> str:
    ordered = sorted(records, key=lambda item: (item["timestamp"], item["source_id"]), reverse=True)
    lines = [
        "---",
        'type: "grasshopper-unmapped-review-inbox"',
        f'last_built_at: "{synced_at}"',
        f"record_count: {len(ordered)}",
        "---",
        "",
        "# Grasshopper unmapped review inbox",
        "",
        "These records do not have one unambiguous Homestead Hill unit. Review them manually; do not infer a stay.",
        "",
    ]
    lines.extend(
        (
            f"- {item['timestamp']} — {compact(item.get('body')) or item['kind']} — "
            f"{', '.join(item['participants']) or 'unknown participant'} "
            f"([[sources/{source_slug(item['source_id'])}|source]])"
        )
        for item in ordered
    )
    if not ordered:
        lines.append("- Empty.")
    lines.append("")
    return "\n".join(lines)


def month_range(start: datetime, end: datetime) -> list[str]:
    year, month = start.year, start.month
    result: list[str] = []
    while (year, month) <= (end.year, end.month):
        result.append(f"{year:04d}-{month:02d}")
        month += 1
        if month == 13:
            year += 1
            month = 1
    return result


def validate_reservation_signal(signal: Any, source_id: str) -> dict[str, Any]:
    if not isinstance(signal, dict):
        raise ValueError(f"{source_id}: reservation_signal must be an object")
    required = {"source", "status", "observed_at", "confidence", "idempotency_key"}
    missing = sorted(required - set(signal))
    if missing:
        raise ValueError(f"{source_id}: reservation_signal missing {', '.join(missing)}")
    if signal.get("source") != "grasshopper":
        raise ValueError(f"{source_id}: reservation_signal source must be grasshopper")
    normalized = dict(signal)
    normalized["schema_version"] = "homestead.reservation-observation.v1"
    normalized["source_record_id"] = normalized.get("source_record_id") or source_id
    normalized["canonical_changed"] = False
    normalized["outbound_sent"] = False
    return normalized


def build_outputs(root: Path, duplicate_count: int, cursor: str | None) -> dict[str, Any]:
    synced_at = utc_now()
    all_records = [record for record, _ in iter_archive(root)]
    by_unit: dict[str, list[dict[str, Any]]] = defaultdict(list)
    unmapped: list[dict[str, Any]] = []
    signals: list[dict[str, Any]] = []

    for record in all_records:
        slug = source_slug(record["source_id"])
        note_path = root / "sources" / f"{slug}.md"
        note_content = source_note(record)
        if note_path.exists():
            existing = note_path.read_text(encoding="utf-8")
            digest_line = f'record_sha256: "{record_digest(record)}"'
            if digest_line not in existing:
                raise ValueError(f"source note conflicts with archive record {record['source_id']}")
        else:
            atomic_write(note_path, note_content)

        unit = unit_for(record)
        if unit:
            by_unit[unit].append(record)
        else:
            unmapped.append(record)
        if "reservation_signal" in record:
            signals.append(validate_reservation_signal(record["reservation_signal"], record["source_id"]))

    for unit_number in range(1, 15):
        unit = f"Unit {unit_number}"
        atomic_write(root / "unit-dossiers" / f"unit-{unit_number}.md", render_dossier(unit, by_unit[unit], synced_at))
    atomic_write(root / "unmapped-review-inbox.md", render_unmapped(unmapped, synced_at))
    atomic_write(
        root / "reservation-observations.jsonl",
        "".join(stable_json(signal) + "\n" for signal in sorted(signals, key=lambda item: item["idempotency_key"])),
    )

    timestamps = sorted(parse_timestamp(item["timestamp"]) for item in all_records)
    observed_months = sorted({month_key(item["timestamp"]) for item in all_records})
    missing_months: list[str] = []
    if timestamps:
        missing_months = sorted(set(month_range(timestamps[0], timestamps[-1])) - set(observed_months))
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "last_successful_sync": synced_at,
        "requested_coverage_start": "2023-01-01",
        "earliest_timestamp": timestamps[0].isoformat() if timestamps else None,
        "latest_timestamp": timestamps[-1].isoformat() if timestamps else None,
        "record_count": len(all_records),
        "records_by_kind": {
            kind: sum(1 for item in all_records if item["kind"] == kind) for kind in sorted(KINDS)
        },
        "observed_months": observed_months,
        "coverage_gaps": missing_months,
        "duplicates_prevented_last_run": duplicate_count,
        "unmapped_records": len(unmapped),
        "unit_record_counts": {unit: len(records) for unit, records in sorted(by_unit.items())},
        "reservation_observations_emitted": len(signals),
        "collector_cursor": cursor,
        "canonical_changed": False,
        "outbound_sent": False,
    }
    atomic_write(root / "archive-manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    atomic_write(
        root / "checkpoint.json",
        json.dumps(
            {
                "schema_version": SCHEMA_VERSION,
                "last_successful_sync": synced_at,
                "collector_cursor": cursor,
                "record_count": len(all_records),
                "archive_manifest_sha256": hashlib.sha256(stable_json(manifest).encode()).hexdigest(),
            },
            indent=2,
        )
        + "\n",
    )
    return manifest


def run(input_path: Path, root: Path, cursor: str | None = None) -> dict[str, Any]:
    records = load_input(input_path)
    appended, duplicates, _ = append_records(root, records)
    manifest = build_outputs(root, duplicates, cursor)
    return {
        "records_received": len(records),
        "records_appended": appended,
        "duplicates_prevented": duplicates,
        "manifest": manifest,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Read-only collector JSONL export")
    parser.add_argument("--root", required=True, type=Path, help="Obsidian archive root")
    parser.add_argument("--cursor", help="Opaque collector cursor recorded after successful output")
    args = parser.parse_args()
    result = run(args.input, args.root, args.cursor)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
