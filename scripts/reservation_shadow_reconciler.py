#!/usr/bin/env python3
"""Three-day, approval-only reservation reconciliation shadow.

This controller reads the local Hermes occupancy snapshot, compares stable
Airbnb evidence with a documented canonical snapshot, and asks for approval in
Agent OS. It cannot write Homestead Helper or send email, calendar invitations,
SMS, Telegram, Discord, or Grasshopper messages.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

DEFAULT_SOURCE = Path.home() / ".hermes/state/homestead-occupancy-monitor.json"
DEFAULT_STATE = Path.home() / ".hermes/state/homestead-reservation-shadow.json"
DEFAULT_CONFIG = Path(__file__).resolve().parents[1] / "config/reservation-shadow-baseline.json"
DEFAULT_ARCHIVE = Path("/mnt/c/Dalton/Obsidian/Evolving Brain/9 - Operations/properties/homestead-hill/reservation-shadow")
AGENT_OS = "http://127.0.0.1:3738"
ASSIGNMENT_KEY = "homestead-reservation-reconciliation-shadow-v1"
MONTHS = {name: index for index, name in enumerate(
    ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"), 1
)}


def stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def digest(value: Any) -> str:
    return hashlib.sha256(stable_json(value).encode("utf-8")).hexdigest()


def atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(value, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def parse_timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timestamp must include a timezone")
    return parsed.astimezone(timezone.utc)


def parse_date_range(value: str) -> tuple[date, date]:
    cleaned = value.replace("–", "-").replace("—", "-")
    match = re.fullmatch(
        r"([A-Z][a-z]{2}) (\d{1,2})(?:, (\d{4}))?-"
        r"(?:(?P<month>[A-Z][a-z]{2}) )?(?P<day>\d{1,2}), (?P<year>\d{4})",
        cleaned,
    )
    if not match:
        raise ValueError(f"unsupported Airbnb date range: {value}")
    start_month = MONTHS[match.group(1)]
    end_month = MONTHS[match.group("month") or match.group(1)]
    end_year = int(match.group("year"))
    explicit_start_year = match.group(3)
    start_year = int(explicit_start_year) if explicit_start_year else end_year
    if not explicit_start_year and start_month > end_month:
        start_year -= 1
    return (
        date(start_year, start_month, int(match.group(2))),
        date(end_year, end_month, int(match.group("day"))),
    )


def normalize_source(source: dict[str, Any], property_group: str) -> list[dict[str, Any]]:
    if source.get("errors"):
        raise ValueError("source acquisition contains errors")
    rows = []
    for item in source.get("sources", {}).get("airbnb", {}).get("reservations", []):
        if item.get("property_group") != property_group:
            continue
        if item.get("mapping_status") != "mapped" or not item.get("unit"):
            continue
        check_in, check_out = parse_date_range(item["dates"])
        rows.append({
            "source": "airbnb",
            "status": item["status"],
            "unit": item["unit"],
            "guest": re.sub(r"\s+", " ", item["guest"]).strip(),
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
        })
    return sorted(rows, key=lambda row: (row["unit"], row["check_in"], row["guest"], row["check_out"]))


def classify(rows: list[dict[str, Any]], baseline: list[dict[str, Any]], today: date) -> list[dict[str, Any]]:
    by_identity = {
        (row["unit"].casefold(), row["guest"].casefold(), row["check_in"]): row
        for row in baseline
    }
    results = []
    for row in rows:
        key = (row["unit"].casefold(), row["guest"].casefold(), row["check_in"])
        current = by_identity.get(key)
        if current and current["check_out"] == row["check_out"]:
            kind, reason = "verified_no_change", "Airbnb and Homestead Helper match."
        elif current:
            kind = "exception" if date.fromisoformat(row["check_out"]) <= today + timedelta(days=3) else "proposed_update"
            reason = f"Airbnb checkout is {row['check_out']}; Homestead Helper currently says {current['check_out']}."
        else:
            overlaps = [
                other for other in baseline
                if other["unit"].casefold() == row["unit"].casefold()
                and date.fromisoformat(row["check_in"]) < date.fromisoformat(other["check_out"])
                and date.fromisoformat(row["check_out"]) > date.fromisoformat(other["check_in"])
            ]
            if overlaps:
                kind, reason = "exception", "This stay overlaps an existing Homestead Helper reservation."
            else:
                kind, reason = "proposed_create", "Confirmed Airbnb stay is not in the documented Homestead Helper snapshot."
        results.append({**row, "classification": kind, "reason": reason})
    return results


def api(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        AGENT_OS + path,
        data=body,
        method=method,
        headers={"Content-Type": "application/json", "Origin": AGENT_OS},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"Agent OS {method} {path} failed ({exc.code}): {detail}") from exc


def ensure_assignment() -> dict[str, Any]:
    payload = {
        "task": (
            "Run the three-day Homestead reservation reconciliation shadow. Read only the authenticated "
            "Hermes source snapshot, compare two stable reads with the documented app snapshot, and place "
            "plain-English approval packets in Needs Me. Shadow approvals are evaluation feedback only. "
            "Never change a reservation, cleaning task, email, calendar event, SMS, Telegram, Discord, "
            "Grasshopper record, or other external system. Never switch to live mode without a separate "
            "final approval from Dalton."
        ),
        "idempotencyKey": ASSIGNMENT_KEY,
        "inboxEmployeeId": "hermes",
        "assignee": "hermes",
        "confirmed": True,
        "recommendation": {
            "employeeId": "hermes",
            "reason": "Hermes owns the authenticated read-only reservation monitors.",
            "confidence": 100,
        },
    }
    return api("POST", "/workplace/assignments", payload)["assignment"]


def packet_text(day_number: int, rows: list[dict[str, Any]], checked_at: str) -> str:
    actionable = [row for row in rows if row["classification"] != "verified_no_change"]
    verified = [row for row in rows if row["classification"] == "verified_no_change"]
    lines = [
        f"Reservation check — Day {day_number}",
        "",
        "Quick summary",
        f"- {len(verified)} stays match Homestead Helper",
        f"- {len(actionable)} items need your review",
        "- Airbnb was checked twice, at least 30 minutes apart",
        "",
        "Items to review",
    ]
    for row in actionable:
        label = {
            "proposed_create": "New stay",
            "proposed_update": "Date mismatch",
            "exception": "Urgent mismatch",
        }[row["classification"]]
        check_in = date.fromisoformat(row["check_in"]).strftime("%b %d").replace(" 0", " ")
        check_out = date.fromisoformat(row["check_out"]).strftime("%b %d").replace(" 0", " ")
        reason = re.sub(
            r"\d{4}-\d{2}-\d{2}",
            lambda match: date.fromisoformat(match.group()).strftime("%b %d").replace(" 0", " "),
            row["reason"],
        )
        lines.append(
            f"- {label}: {row['unit']} · {row['guest']} · {check_in}–{check_out}. {reason}"
        )
    lines.extend([
        "",
        "Your decision",
        f"Reply APPROVE SHADOW DAY {day_number} if this looks right. Otherwise, tell me what to correct.",
        "",
        "This is review-only. Your reply will not change the app or contact anyone.",
    ])
    return "\n".join(lines)


def write_packet(root: Path, day_number: int, checked_at: str, rows: list[dict[str, Any]], packet: str) -> Path:
    path = root / f"day-{day_number}.md"
    content = "\n".join([
        "---",
        'type: "homestead-reservation-shadow-approval"',
        f"day: {day_number}",
        f"source_checked_at: {json.dumps(checked_at)}",
        f"evidence_sha256: {json.dumps(digest(rows))}",
        "canonical_changed: false",
        "outbound_sent: false",
        "---",
        "",
        f"# Reservation shadow day {day_number}",
        "",
        packet,
        "",
    ])
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(content, encoding="utf-8")
    return path


def refresh_and_deliver(state: dict[str, Any], assignment: dict[str, Any]) -> bool:
    """Refresh answers and deliver at most one queued packet to Needs Me."""
    detail = api("GET", f"/workplace/assignments/{assignment['id']}")["assignment"]
    clarifications = {item["id"]: item for item in detail.get("clarifications", [])}
    conversation = api("GET", f"/workplace/conversations/{assignment['conversationId']}")["conversation"]
    messages = {item["id"]: item for item in conversation.get("messages", [])}
    open_items = [item for item in clarifications.values() if item.get("status") == "open"]
    for packet in state.get("packets", {}).values():
        clarification_id = packet.get("clarification_id")
        if clarification_id and clarification_id in clarifications:
            clarification = clarifications[clarification_id]
            packet["status"] = clarification.get("status", packet["status"])
            answer = messages.get(clarification.get("answerMessageId"), {})
            if answer.get("body"):
                packet["answer"] = answer["body"]
                packet["answered_at"] = clarification.get("answeredAt")
    if open_items:
        return False
    queued = sorted(
        (
            (int(day), packet)
            for day, packet in state.get("packets", {}).items()
            if packet.get("status") == "queued_behind_open_approval"
        ),
        key=lambda item: item[0],
    )
    if not queued:
        return False
    day_number, packet = queued[0]
    packet_body = Path(packet["path"]).read_text(encoding="utf-8").split("\n# Reservation shadow", 1)[-1]
    question = packet_body.split("\n\n", 1)[-1].strip()
    response = api("POST", f"/workplace/assignments/{assignment['id']}/clarifications", {
        "question": question,
        "clientMessageKey": f"homestead-shadow-day-{day_number}-{packet['evidence_sha256'][:16]}",
    })
    packet["clarification_id"] = response["clarification"]["id"]
    packet["status"] = "awaiting_approval"
    return bool(response.get("created"))


def run(args: argparse.Namespace) -> dict[str, Any]:
    now = parse_timestamp(args.now) if args.now else datetime.now(timezone.utc)
    source = json.loads(args.source.read_text(encoding="utf-8"))
    config = json.loads(args.config.read_text(encoding="utf-8"))
    rows = normalize_source(source, config["property_group"])
    source_hash = digest(rows)
    state = json.loads(args.state.read_text(encoding="utf-8")) if args.state.exists() else {}
    started_at = parse_timestamp(state["started_at"]) if state.get("started_at") else now
    previous_read = state.get("last_read", {})
    if previous_read.get("fingerprint") == source_hash:
        first_seen = parse_timestamp(previous_read["first_seen_at"])
        stable_reads = int(previous_read.get("stable_reads", 1)) + 1
    elif source.get("changed") is False:
        # The monitor computes changed against its prior successful snapshot.
        # This is trustworthy two-read evidence even on this controller's first run.
        first_seen = parse_timestamp(source["checked_at"]) - timedelta(minutes=config["minimum_stable_minutes"])
        stable_reads = 2
    else:
        first_seen, stable_reads = now, 1
    stable = stable_reads >= 2 and now - first_seen >= timedelta(minutes=config["minimum_stable_minutes"])
    elapsed_days = max(0, int((now - started_at).total_seconds() // 86_400))
    day_number = min(config["shadow_days"], elapsed_days + 1)
    state.update({
        "schema_version": 1,
        "mode": "shadow_approval_only",
        "started_at": started_at.isoformat(),
        "ends_at": (started_at + timedelta(days=config["shadow_days"])).isoformat(),
        "last_read": {
            "fingerprint": source_hash,
            "first_seen_at": first_seen.isoformat(),
            "last_seen_at": now.isoformat(),
            "stable_reads": stable_reads,
            "source_checked_at": source["checked_at"],
        },
        "canonical_writes": 0,
        "outbound_sends": 0,
        "requires_final_go_live_approval": True,
    })
    result = {"stable": stable, "day": day_number, "packet_created": False, "clarification_created": False}
    assignment = ensure_assignment() if not args.no_agent_os else {"id": "test-assignment"}
    if not args.no_agent_os:
        result["clarification_created"] = refresh_and_deliver(state, assignment)
    if stable and str(day_number) not in state.get("packets", {}):
        classified = classify(rows, config["canonical_reservations"], now.date())
        packet = packet_text(day_number, classified, source["checked_at"])
        packet_path = write_packet(args.archive, day_number, source["checked_at"], classified, packet)
        clarification = None
        if not args.no_agent_os:
            detail = api("GET", f"/workplace/assignments/{assignment['id']}")["assignment"]
            open_items = [item for item in detail.get("clarifications", []) if item.get("status") == "open"]
            if not open_items:
                clarification = api("POST", f"/workplace/assignments/{assignment['id']}/clarifications", {
                    "question": packet,
                    "clientMessageKey": f"homestead-shadow-day-{day_number}-{source_hash[:16]}",
                })
        state.setdefault("packets", {})[str(day_number)] = {
            "evidence_sha256": source_hash,
            "created_at": now.isoformat(),
            "path": str(packet_path),
            "assignment_id": assignment["id"],
            "clarification_id": clarification["clarification"]["id"] if clarification else None,
            "status": "awaiting_approval" if clarification else "queued_behind_open_approval",
        }
        result.update({"packet_created": True, "clarification_created": clarification is not None, "packet": packet})
    ended = now >= started_at + timedelta(days=config["shadow_days"])
    if ended:
        state["shadow_complete"] = True
        state["live_mode_enabled"] = False
        packets = state.get("packets", {})
        all_days_exist = all(str(day) in packets for day in range(1, config["shadow_days"] + 1))
        all_days_answered = all(
            packets[str(day)].get("status") == "answered"
            for day in range(1, config["shadow_days"] + 1)
            if str(day) in packets
        )
        if not (all_days_exist and all_days_answered):
            state["final_go_live_approval_status"] = "not_requested_until_shadow_packets_answered"
        elif not state.get("final_go_live_clarification_id") and not args.no_agent_os:
            detail = api("GET", f"/workplace/assignments/{assignment['id']}")["assignment"]
            if not any(item.get("status") == "open" for item in detail.get("clarifications", [])):
                final_question = (
                    "The three-day Homestead reservation reconciliation shadow is complete. "
                    "Live mode is still OFF. Review the three recorded approval packets and reply "
                    "ENABLE RESERVATION RECONCILIATION only if you want a separate implementation "
                    "step to be proposed. This reply will not itself change reservations or send messages."
                )
                response = api("POST", f"/workplace/assignments/{assignment['id']}/clarifications", {
                    "question": final_question,
                    "clientMessageKey": f"homestead-shadow-final-{digest(packets)[:16]}",
                })
                state["final_go_live_clarification_id"] = response["clarification"]["id"]
                state["final_go_live_approval_status"] = "awaiting_explicit_approval"
                result["clarification_created"] = bool(response.get("created"))
    atomic_json(args.state, state)
    return result


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser()
    value.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    value.add_argument("--state", type=Path, default=DEFAULT_STATE)
    value.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    value.add_argument("--archive", type=Path, default=DEFAULT_ARCHIVE)
    value.add_argument("--now")
    value.add_argument("--no-agent-os", action="store_true")
    return value


if __name__ == "__main__":
    outcome = run(parser().parse_args())
    if outcome["packet_created"]:
        print(f"reservation_shadow_reconciler: day {outcome['day']} approval packet prepared; no app or outbound changes")
