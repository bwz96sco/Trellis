from __future__ import annotations

import importlib.util
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

RESEARCH_ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = RESEARCH_ROOT / "tools/evaluation_harness.py"
SPEC = importlib.util.spec_from_file_location("c7_evaluation_harness", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("could not load evaluation harness")
HARNESS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HARNESS)
FROZEN_SOURCE_ADMIN = (
    HARNESS.C1_BASELINE
    / "files/skills/research-quest-admin/scripts/research_quest_admin.py"
)
BUILT_CLI = HARNESS.REPO_ROOT / "packages/cli/dist/cli/index.js"


class EvaluationHarnessTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = Path(tempfile.mkdtemp(prefix="c7-evaluation-harness-"))
        self.research = self.temp / "research"
        shutil.copytree(RESEARCH_ROOT, self.research)

    def tearDown(self) -> None:
        shutil.rmtree(self.temp)

    def read_draft(self, run_id: str) -> tuple[Path, dict[str, object]]:
        path = self.research / "outputs" / run_id / "run-record.draft.json"
        return path, json.loads(path.read_text(encoding="utf-8"))

    def write_draft(self, path: Path, record: dict[str, object]) -> None:
        path.write_text(
            json.dumps(record, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    def set_plan_ready(self) -> None:
        plan_path = self.research / "evaluation-plan.json"
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        plan["status"] = "deterministic-ready-provider-not-authorized"
        plan.pop("stopReason", None)
        plan_path.write_text(
            json.dumps(plan, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        proof_path = self.research / "deterministic-proof.json"
        proof = json.loads(proof_path.read_text(encoding="utf-8"))
        proof["status"] = "pending-verification"
        proof_path.write_text(
            json.dumps(proof, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    def set_plan_blocked(self) -> None:
        plan_path = self.research / "evaluation-plan.json"
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        plan["status"] = "blocked-zero-tolerance-before-provider"
        plan_path.write_text(
            json.dumps(plan, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    def test_validates_frozen_plan_cases_and_no_provider_state(self) -> None:
        counts = HARNESS.validate_research(self.research)
        self.assertEqual(counts, {"cases": 9, "runs": 0, "boundaries": 3})

    def test_blocked_plan_refuses_prepare_and_append(self) -> None:
        with self.assertRaisesRegex(HARNESS.EvidenceError, "blocked by deterministic"):
            HARNESS.prepare_run(
                "literature-01-a-blocked",
                "literature-01",
                "A",
                self.research,
            )

        self.set_plan_ready()
        run_id = "literature-01-a-blocked-append"
        HARNESS.prepare_run(run_id, "literature-01", "A", self.research)
        draft_path, _ = self.read_draft(run_id)
        self.set_plan_blocked()

        with self.assertRaisesRegex(HARNESS.EvidenceError, "blocked by deterministic"):
            HARNESS.append_run(draft_path, self.research)
        self.assertEqual((self.research / "runs.jsonl").read_bytes(), b"")

    def test_appends_once_and_preserves_prior_bytes_on_duplicate(self) -> None:
        self.set_plan_ready()
        run_id = "quest-admin-01-a-deterministic"
        output = HARNESS.prepare_run(run_id, "quest-admin-01", "A", self.research)
        evidence_path = output / "evidence/command.json"
        evidence_path.write_text('{"status":"pass"}\n', encoding="utf-8")
        draft_path, record = self.read_draft(run_id)
        record["completion"] = {"outcome": "pass", "summary": "Deterministic preview/write exercise completed."}
        record["assertionEvidence"] = [
            {
                "assertionId": assertion_id,
                "status": "pass",
                "evidenceRefs": [f"outputs/{run_id}/evidence/command.json"],
                "note": "Observed in the isolated fixture.",
            }
            for assertion_id in record["declaredAssertions"]
        ]
        record["outputRefs"] = [f"outputs/{run_id}/evidence/command.json"]
        self.write_draft(draft_path, record)

        self.assertEqual(HARNESS.append_run(draft_path, self.research), run_id)
        runs_path = self.research / "runs.jsonl"
        committed = runs_path.read_bytes()
        with self.assertRaisesRegex(HARNESS.EvidenceError, "duplicate runId"):
            HARNESS.append_run(draft_path, self.research)
        self.assertEqual(runs_path.read_bytes(), committed)
        self.assertEqual(len(committed.splitlines()), 1)

    def test_rejects_cross_run_output_paths(self) -> None:
        self.set_plan_ready()
        run_id = "literature-01-a-isolation"
        HARNESS.prepare_run(run_id, "literature-01", "A", self.research)
        draft_path, record = self.read_draft(run_id)
        record["outputRefs"] = ["outputs/literature-01-b-other/artifacts/note.md"]
        self.write_draft(draft_path, record)

        with self.assertRaisesRegex(HARNESS.EvidenceError, "escapes the run output root"):
            HARNESS.append_run(draft_path, self.research)
        self.assertEqual((self.research / "runs.jsonl").read_bytes(), b"")

    def test_rejects_provider_run_before_explicit_authorization(self) -> None:
        self.set_plan_ready()
        run_id = "literature-01-a-provider"
        HARNESS.prepare_run(run_id, "literature-01", "A", self.research)
        draft_path, record = self.read_draft(run_id)
        record["overhead"]["modelCalls"] = 1
        record["execution"]["host"] = "claude"
        record["execution"]["provider"] = "unapproved-provider"
        record["execution"]["model"] = "unapproved-model"
        self.write_draft(draft_path, record)

        with self.assertRaisesRegex(HARNESS.EvidenceError, "before explicit authorization"):
            HARNESS.append_run(draft_path, self.research)
        self.assertEqual((self.research / "runs.jsonl").read_bytes(), b"")

    def test_rejects_unaccounted_provider_activity(self) -> None:
        self.set_plan_ready()
        run_id = "literature-01-a-provider-zero-count"
        HARNESS.prepare_run(run_id, "literature-01", "A", self.research)
        draft_path, record = self.read_draft(run_id)
        record["execution"]["host"] = "claude"
        record["execution"]["provider"] = "unapproved-provider"
        record["execution"]["model"] = "unapproved-model"
        self.write_draft(draft_path, record)

        with self.assertRaisesRegex(HARNESS.EvidenceError, "count at least one model call attempt"):
            HARNESS.append_run(draft_path, self.research)
        self.assertEqual((self.research / "runs.jsonl").read_bytes(), b"")

    def test_failed_proof_cannot_be_bypassed_by_plan_status(self) -> None:
        plan_path = self.research / "evaluation-plan.json"
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        plan["status"] = "deterministic-ready-provider-not-authorized"
        plan.pop("stopReason", None)
        plan_path.write_text(json.dumps(plan, indent=2, sort_keys=True) + "\n", encoding="utf-8")

        with self.assertRaisesRegex(HARNESS.EvidenceError, "blocked by deterministic"):
            HARNESS.prepare_run(
                "literature-01-a-proof-blocked",
                "literature-01",
                "A",
                self.research,
            )

    def test_rejects_all_cross_run_evidence_paths(self) -> None:
        mutations = (
            ("artifactRefs", lambda record, path: record["artifactRefs"].append(path)),
            (
                "assertionEvidence",
                lambda record, path: record["assertionEvidence"][0]["evidenceRefs"].append(path),
            ),
            (
                "recovery",
                lambda record, path: record["recovery"]["evidenceRefs"].append(path),
            ),
        )
        for label, mutate in mutations:
            with self.subTest(label=label):
                research = self.temp / f"research-{label}"
                shutil.copytree(RESEARCH_ROOT, research)
                plan_path = research / "evaluation-plan.json"
                plan = json.loads(plan_path.read_text(encoding="utf-8"))
                plan["status"] = "deterministic-ready-provider-not-authorized"
                plan.pop("stopReason", None)
                plan_path.write_text(json.dumps(plan, indent=2, sort_keys=True) + "\n", encoding="utf-8")
                proof_path = research / "deterministic-proof.json"
                proof = json.loads(proof_path.read_text(encoding="utf-8"))
                proof["status"] = "pending-verification"
                proof_path.write_text(json.dumps(proof, indent=2, sort_keys=True) + "\n", encoding="utf-8")
                run_id = f"literature-01-a-{label.lower()}"
                HARNESS.prepare_run(run_id, "literature-01", "A", research)
                draft_path = research / "outputs" / run_id / "run-record.draft.json"
                record = json.loads(draft_path.read_text(encoding="utf-8"))
                mutate(record, "outputs/literature-01-b-other/evidence/proof.json")
                self.write_draft(draft_path, record)
                with self.assertRaisesRegex(HARNESS.EvidenceError, "escapes the run output root"):
                    HARNESS.append_run(draft_path, research)
                self.assertEqual((research / "runs.jsonl").read_bytes(), b"")

    def test_detects_copied_fixture_byte_drift(self) -> None:
        self.set_plan_ready()
        run_id = "quest-admin-01-a-fixture-drift"
        output = HARNESS.prepare_run(run_id, "quest-admin-01", "A", self.research)
        fixture = output / "workspace/fixtures/research-quest.yaml"
        fixture.write_text("changed\n", encoding="utf-8")

        with self.assertRaisesRegex(HARNESS.EvidenceError, "copied fixture byte drift"):
            HARNESS.validate_outputs(
                self.research,
                HARNESS.load_cases(self.research, HARNESS.load_plan(self.research)),
            )

    def test_rejects_duplicate_keys_in_run_ledger(self) -> None:
        (self.research / "runs.jsonl").write_text(
            '{"runId":"first","runId":"second"}\n',
            encoding="utf-8",
        )
        with self.assertRaisesRegex(HARNESS.EvidenceError, "duplicate JSON keys"):
            HARNESS.read_runs(self.research)

    def test_characterizes_frozen_source_admin_writer_guard_gap(self) -> None:
        helper_text = FROZEN_SOURCE_ADMIN.read_text(encoding="utf-8")
        for authority_marker in ("TRELLIS_RESEARCH_ROOT", "writer.json", "cutover-fences"):
            self.assertNotIn(authority_marker, helper_text)

        control_root = self.temp / "trellis-control"
        (control_root / ".trellis").mkdir(parents=True)
        source_root = control_root / "source"
        shutil.copytree(
            self.research / "cases/fixtures/quest-admin-02",
            source_root,
        )
        cli_environment = dict(os.environ)
        cli_environment["NODE_OPTIONS"] = ""

        def run_cli(*args: str) -> dict[str, object]:
            result = subprocess.run(
                ["node", str(BUILT_CLI), *args, "--json"],
                cwd=HARNESS.REPO_ROOT,
                env=cli_environment,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)

        run_cli(
            "research",
            "init",
            "--name",
            "C7 source-admin authority proof",
            "--root",
            str(control_root),
        )
        run_cli(
            "research",
            "repo",
            "add",
            "--id",
            "rep_11111111-1111-4111-8111-111111111111",
            "--name",
            "Source fixture",
            "--kind",
            "code",
            "--locator",
            "source",
            "--root",
            str(control_root),
        )
        preview = run_cli(
            "research",
            "quest",
            "import",
            "--source",
            str(source_root / "research-quest.yaml"),
            "--events",
            str(source_root / "research-events.jsonl"),
            "--root",
            str(control_root),
        )
        committed = run_cli(
            "research",
            "quest",
            "import",
            "--source",
            str(source_root / "research-quest.yaml"),
            "--events",
            str(source_root / "research-events.jsonl"),
            "--preview-token",
            str(preview["previewToken"]),
            "--write",
            "--root",
            str(control_root),
        )
        writer_path = (
            control_root
            / ".trellis/research/quests"
            / str(committed["questId"])
            / "writer.json"
        )
        writer = json.loads(writer_path.read_text(encoding="utf-8"))
        self.assertEqual(writer["data"]["authority"]["writer"], "trellis")

        status_file = source_root / "notes/_quest/QUEST_STATUS.md"
        self.assertFalse(status_file.exists())
        source_before = {
            str(path.relative_to(source_root)): path.read_bytes()
            for path in source_root.rglob("*")
            if path.is_file()
        }
        environment = dict(os.environ)
        environment["PYTHONDONTWRITEBYTECODE"] = "1"
        environment["TRELLIS_RESEARCH_ROOT"] = str(control_root)
        result = subprocess.run(
            [
                "uv",
                "run",
                "python",
                str(FROZEN_SOURCE_ADMIN),
                "status",
                "--root",
                str(source_root),
                "--write",
            ],
            cwd=FROZEN_SOURCE_ADMIN.parents[3],
            env=environment,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(status_file.is_file())
        source_after = {
            str(path.relative_to(source_root)): path.read_bytes()
            for path in source_root.rglob("*")
            if path.is_file()
        }
        self.assertEqual(set(source_after) - set(source_before), {"notes/_quest/QUEST_STATUS.md"})

    def test_rejects_missing_zero_tolerance_assertion(self) -> None:
        case_path = self.research / "cases/ideation-01.json"
        case = json.loads(case_path.read_text(encoding="utf-8"))
        case["assertions"] = [
            assertion for assertion in case["assertions"] if assertion["id"] != "no-auto-next-stage"
        ]
        case_path.write_text(json.dumps(case, indent=2, sort_keys=True) + "\n", encoding="utf-8")

        with self.assertRaisesRegex(HARNESS.EvidenceError, "zero-tolerance"):
            HARNESS.validate_research(self.research)


if __name__ == "__main__":
    unittest.main()
