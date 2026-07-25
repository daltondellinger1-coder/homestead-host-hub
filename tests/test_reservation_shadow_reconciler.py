import importlib.util
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

MODULE_PATH = Path(__file__).parents[1] / "scripts" / "reservation_shadow_reconciler.py"
SPEC = importlib.util.spec_from_file_location("reservation_shadow_reconciler", MODULE_PATH)
shadow = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(shadow)


class ReservationShadowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root / "source.json"
        self.state = self.root / "state.json"
        self.archive = self.root / "archive"
        self.config = self.root / "config.json"
        self.config.write_text(json.dumps({
            "schema_version": 1,
            "property_group": "Homestead Hill",
            "shadow_days": 3,
            "minimum_stable_minutes": 30,
            "canonical_reservations": [
                {"unit": "Unit 1", "guest": "Exact Guest", "check_in": "2026-07-01", "check_out": "2026-07-31"},
                {"unit": "Unit 2", "guest": "Changed Guest", "check_in": "2026-07-01", "check_out": "2026-08-08"},
            ],
        }))

    def tearDown(self):
        self.temp.cleanup()

    def args(self, when):
        return shadow.parser().parse_args([
            "--source", str(self.source), "--state", str(self.state),
            "--config", str(self.config), "--archive", str(self.archive),
            "--now", when, "--no-agent-os",
        ])

    def write_source(self, changed=False):
        rows = [
            ("Unit 1", "Exact Guest", "Jul 1-31, 2026"),
            ("Unit 2", "Changed Guest", "Jul 1-26, 2026"),
            ("Unit 3", "New Guest", "Aug 10-15, 2026"),
        ]
        self.source.write_text(json.dumps({
            "checked_at": "2026-07-25T22:00:00Z",
            "changed": changed,
            "errors": {},
            "sources": {"airbnb": {"reservations": [{
                "status": "Confirmed", "guest": guest,
                "property_group": "Homestead Hill", "unit": unit,
                "mapping_status": "mapped", "dates": dates,
            } for unit, guest, dates in rows]}},
        }))

    def test_unchanged_monitor_bootstraps_two_read_packet_without_writes(self):
        self.write_source(changed=False)
        result = shadow.run(self.args("2026-07-25T22:01:00Z"))
        state = json.loads(self.state.read_text())
        self.assertTrue(result["stable"])
        self.assertTrue(result["packet_created"])
        self.assertEqual(state["canonical_writes"], 0)
        self.assertEqual(state["outbound_sends"], 0)
        self.assertTrue(state["requires_final_go_live_approval"])
        self.assertIn("EXCEPTION: Unit 2", result["packet"])
        self.assertIn("ADD LATER: Unit 3", result["packet"])

    def test_changed_source_requires_a_second_read_and_is_restart_safe(self):
        self.write_source(changed=True)
        first = shadow.run(self.args("2026-07-25T22:00:00Z"))
        self.assertFalse(first["stable"])
        self.assertFalse(first["packet_created"])
        second = shadow.run(self.args("2026-07-25T22:31:00Z"))
        self.assertTrue(second["stable"])
        self.assertTrue(second["packet_created"])
        third = shadow.run(self.args("2026-07-25T22:32:00Z"))
        self.assertFalse(third["packet_created"])
        self.assertEqual(len(list(self.archive.glob("day-*.md"))), 1)

    def test_other_property_and_text_signals_never_become_candidates(self):
        self.write_source(changed=False)
        data = json.loads(self.source.read_text())
        data["sources"]["airbnb"]["reservations"].append({
            "status": "Confirmed", "guest": "College Guest",
            "property_group": "College Town Comfort", "unit": "Unit B",
            "mapping_status": "mapped_airbnb_listing", "dates": "Aug 1-3, 2026",
        })
        data["sources"]["grasshopper"] = {"signal_records": [{"summary": "Unit 14 maybe"}]}
        self.source.write_text(json.dumps(data))
        result = shadow.run(self.args("2026-07-25T22:01:00Z"))
        self.assertNotIn("College Guest", result["packet"])
        self.assertNotIn("Unit 14 maybe", result["packet"])

    def test_source_error_fails_closed(self):
        self.write_source(changed=False)
        data = json.loads(self.source.read_text())
        data["errors"] = {"airbnb": "login expired"}
        self.source.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, "contains errors"):
            shadow.run(self.args("2026-07-25T22:01:00Z"))
        self.assertFalse(self.state.exists())


if __name__ == "__main__":
    unittest.main()
