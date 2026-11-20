import json
import tempfile
import unittest
from pathlib import Path

from scripts.grasshopper_archive import run


FIXTURE = Path(__file__).parent / "fixtures" / "grasshopper-sample.jsonl"


class GrasshopperArchiveTest(unittest.TestCase):
    def test_duplicate_free_rerun_and_source_linked_dossier(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / "archive"
            first = run(FIXTURE, root, cursor="cursor-1")
            self.assertEqual(first["records_appended"], 4)
            self.assertEqual(first["duplicates_prevented"], 0)

            second = run(FIXTURE, root, cursor="cursor-1")
            self.assertEqual(second["records_appended"], 0)
            self.assertEqual(second["duplicates_prevented"], 4)

            archived = list((root / "raw").glob("*.jsonl"))
            self.assertEqual(len(archived), 1)
            self.assertEqual(len(archived[0].read_text(encoding="utf-8").splitlines()), 4)

            dossier = (root / "unit-dossiers" / "unit-3.md").read_text(encoding="utf-8")
            self.assertIn("air conditioner is not working", dossier)
            self.assertIn("[[../sources/gh-msg-1001|source]]", dossier)
            self.assertIn("Maintenance notified", dossier)

            unmapped = (root / "unmapped-review-inbox.md").read_text(encoding="utf-8")
            self.assertIn("gh-call-1003", unmapped)

            manifest = json.loads((root / "archive-manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["record_count"], 4)
            self.assertEqual(manifest["duplicates_prevented_last_run"], 4)
            self.assertEqual(manifest["unmapped_records"], 1)
            self.assertFalse(manifest["canonical_changed"])
            self.assertFalse(manifest["outbound_sent"])

            signals = [
                json.loads(line)
                for line in (root / "reservation-observations.jsonl").read_text(encoding="utf-8").splitlines()
            ]
            self.assertEqual(len(signals), 1)
            self.assertEqual(signals[0]["schema_version"], "homestead.reservation-observation.v1")
            self.assertEqual(signals[0]["status"], "text_signal")
            self.assertFalse(signals[0]["canonical_changed"])
            self.assertFalse(signals[0]["outbound_sent"])

    def test_conflicting_duplicate_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / "archive"
            run(FIXTURE, root)
            conflict = Path(temporary) / "conflict.jsonl"
            record = json.loads(FIXTURE.read_text(encoding="utf-8").splitlines()[0])
            record["body"] = "Changed body for the same source ID"
            conflict.write_text(json.dumps(record) + "\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "conflicting duplicate"):
                run(conflict, root)


if __name__ == "__main__":
    unittest.main()
