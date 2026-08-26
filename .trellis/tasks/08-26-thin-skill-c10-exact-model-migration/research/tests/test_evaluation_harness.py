from __future__ import annotations

import copy
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
import uuid
from pathlib import Path

RESEARCH = Path(__file__).resolve().parents[1]
TOOLS = RESEARCH / "tools"
sys.path.insert(0, str(TOOLS))

import auth_preflight
import claude_runner
import evaluation_harness as harness


class HarnessFixture(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.repo = Path(self.temporary.name) / "repo"
        self.research = self.repo / ".trellis" / "tasks" / "c10-test" / "research"
        self.research.parent.mkdir(parents=True)
        for directory in ("cases", "source-baseline"):
            shutil.copytree(RESEARCH / directory, self.research / directory)
        for filename in (
            "predecessor.json",
            "evaluation-plan.json",
            "run-record.schema.json",
            "runs.jsonl",
        ):
            shutil.copy2(RESEARCH / filename, self.research / filename)
        (self.research / "outputs").mkdir()
        auth_preflight.write_auth_artifact(
            auth_preflight.build_auth_artifact(
                b'{"loggedIn":true,"authMethod":"claude.ai","apiProvider":"firstParty"}',
                checked_at="2026-08-26T12:00:00Z",
            ),
            self.research / "first-party-auth.json",
        )
        plan = json.loads((self.research / "evaluation-plan.json").read_text())
        proof_relative = Path(plan["guardedSingleWriterEvidence"]["proofPath"])
        proof_target = self.repo / proof_relative
        proof_target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(harness.repository_root(RESEARCH) / proof_relative, proof_target)
        for entry in plan["acceptedPackages"].values():
            source = harness.repository_root(RESEARCH) / entry["root"]
            target = self.repo / entry["root"]
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copytree(source, target)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def usable_executor(
        self,
        command: list[str] | tuple[str, ...],
        cwd: Path,
        timeout: float,
    ) -> claude_runner.ProcessExecution:
        del cwd, timeout
        session_id = command[command.index("--session-id") + 1]
        payload = {
            "type": "result",
            "is_error": False,
            "result": "bounded fake output",
            "uuid": str(uuid.uuid4()),
            "session_id": session_id,
            "stop_reason": "end_turn",
            "num_turns": 1,
            "duration_ms": 20,
            "duration_api_ms": 15,
            "total_cost_usd": 0.01,
            "usage": {"input_tokens": 10, "output_tokens": 4},
            "modelUsage": {
                "claude-sonnet-5": {
                    "inputTokens": 10,
                    "outputTokens": 4,
                    "provider": "firstParty",
                }
            },
            "permission_denials": [],
        }
        return claude_runner.ProcessExecution(
            launched=True,
            pid=4242,
            exit_code=0,
            signal=None,
            stdout=json.dumps(payload).encode(),
            stderr=b"",
        )

    def infrastructure_executor(
        self,
        command: list[str] | tuple[str, ...],
        cwd: Path,
        timeout: float,
    ) -> claude_runner.ProcessExecution:
        del command, cwd, timeout
        return claude_runner.ProcessExecution(
            launched=True,
            pid=4242,
            exit_code=1,
            signal=None,
            stdout=b"",
            stderr=b"connection reset",
        )

    def run_fake(
        self,
        run_id: str,
        case_id: str,
        arm: str,
        executor=None,
    ) -> dict[str, object]:
        harness.prepare_run(run_id, case_id, arm, self.research)
        return harness.run_live_attempt(
            run_id=run_id,
            case_id=case_id,
            arm=arm,
            authorization_ref=harness.AUTHORIZATION_REF,
            acknowledge_provider_launch=True,
            research_root=self.research,
            executor=executor or self.usable_executor,
        )

    def ledger_records(self) -> list[dict[str, object]]:
        return [json.loads(line) for line in (self.research / "runs.jsonl").read_text().splitlines()]


class StaticEvidenceTests(HarnessFixture):
    def test_plan_case_inventory_and_zero_provider_boundary(self) -> None:
        plan, cases = harness.validate_static_evidence(self.research)
        self.assertEqual(tuple(plan["cases"]), harness.CASE_IDS)
        self.assertEqual(plan["providerAuthorization"]["plannedCalls"], 18)
        self.assertEqual(plan["providerAuthorization"]["infrastructureOnlyRetryLimit"], 6)
        self.assertEqual(plan["providerAuthorization"]["hardCapAttempts"], 24)
        self.assertTrue(plan["liveGate"]["allApplicableAssertionsMustPass"])
        for case_id in harness.LIVE_CASE_IDS:
            self.assertEqual(cases[case_id]["plannedInvocationUnits"], {"A": 1, "B": 1, "C": 1})
        self.assertEqual(cases["evaluation-01"]["plannedInvocationUnits"], {"A": 1, "B": 1, "C": 1})
        for case_id in harness.DETERMINISTIC_CASE_IDS:
            self.assertEqual(cases[case_id]["plannedInvocationUnits"], {"A": 0, "B": 0, "C": 0})
        self.assertEqual((self.research / "runs.jsonl").read_bytes(), b"")

    def test_forward_identities_are_current_c10_and_production_resolved(self) -> None:
        plan = harness.load_plan(self.research)
        self.assertEqual(plan["evaluationId"], harness.EVALUATION_ID)
        self.assertEqual(
            plan["providerAuthorization"]["authorizationRef"],
            harness.AUTHORIZATION_REF,
        )
        self.assertEqual(
            plan["firstPartyRouting"],
            {
                "command": [
                    claude_runner.DIRECT_CLAUDE_EXECUTABLE,
                    "auth",
                    "status",
                    "--json",
                ],
                "directExecutable": {
                    "path": claude_runner.DIRECT_CLAUDE_EXECUTABLE,
                    "version": claude_runner.EXPECTED_CLAUDE_VERSION,
                    "cmuxWrapperForbidden": (
                        "/Applications/cmux.app/Contents/Resources/bin/claude"
                    ),
                },
                "evidencePath": "first-party-auth.json",
                "requiredStatus": auth_preflight.REQUIRED_STATUS,
                "sanitizedEnvironmentKeys": list(
                    claude_runner.SANITIZED_ENVIRONMENT_KEYS
                ),
                "forcedEnvironment": claude_runner.FORCED_ENVIRONMENT,
            },
        )
        self.assertTrue(plan["liveGate"]["firstPlannedSlotIsExactModelProbe"])
        self.assertEqual(
            plan["runnerContract"]["binary"],
            claude_runner.DIRECT_CLAUDE_EXECUTABLE,
        )
        self.assertEqual(
            plan["runnerContract"]["expectedVersion"],
            claude_runner.EXPECTED_CLAUDE_VERSION,
        )
        self.assertEqual(
            plan["runnerContract"]["expectedApiProvider"],
            claude_runner.EXPECTED_API_PROVIDER,
        )
        self.assertTrue(plan["runnerContract"]["advisorDisabled"])
        self.assertTrue(plan["runnerContract"]["promptSuggestionsDisabled"])
        self.assertIn("--effort", plan["runnerContract"]["flags"])
        self.assertEqual(
            plan["runnerContract"]["flags"][
                plan["runnerContract"]["flags"].index("--effort") + 1
            ],
            "low",
        )
        source = plan["sourceBaseline"]
        self.assertEqual(source["commit"], "86df5a676c52950592ff9fe5966b9c1753160cb5")
        self.assertEqual(source["tree"], "aa0282da9c63f8f17dd94b672b3fd6843647a0bd")
        self.assertEqual(
            source["aggregateDigest"],
            "sha256:7ad7bf1547605ce8c243bcb51dd03715e1ebfb7ef4c7ea528053ee41386fcd89",
        )
        self.assertEqual(plan["acceptedPackages"]["research-literature"]["identity"]["version"], "1.1.0")
        self.assertEqual(plan["acceptedPackages"]["research-ideation"]["identity"]["version"], "1.1.0")
        serialized = json.dumps(plan)
        self.assertNotIn("c1-source", serialized)
        self.assertNotIn("c6-execution-package", serialized)

    def test_validate_does_not_require_auth_artifact_before_preflight(self) -> None:
        (self.research / "first-party-auth.json").unlink()
        plan, cases = harness.validate_static_evidence(self.research)
        self.assertEqual(plan["evaluationId"], harness.EVALUATION_ID)
        self.assertEqual(tuple(cases), harness.CASE_IDS)

    def test_duplicate_json_keys_are_rejected(self) -> None:
        path = self.research / "evaluation-plan.json"
        data = path.read_bytes()
        path.write_bytes(b'{"schemaVersion":1,' + data.lstrip()[1:])
        with self.assertRaisesRegex(harness.HarnessError, "duplicate JSON key"):
            harness.load_plan(self.research)

    def test_input_and_package_byte_drift_fail_closed(self) -> None:
        input_path = self.research / "cases/inputs/literature-01/task.md"
        input_path.write_bytes(input_path.read_bytes() + b"drift")
        with self.assertRaisesRegex(harness.HarnessError, "identity drifted"):
            harness.validate_static_evidence(self.research)

    def test_schema_has_strict_append_record_variants(self) -> None:
        schema = harness.strict_json_file(self.research / "run-record.schema.json")
        self.assertEqual(len(schema["oneOf"]), 4)
        self.assertFalse(schema["$defs"]["attemptReservation"]["additionalProperties"])
        self.assertFalse(schema["$defs"]["attemptResult"]["additionalProperties"])
        self.assertFalse(schema["$defs"]["caseEvaluation"]["additionalProperties"])
        self.assertFalse(schema["$defs"]["correction"]["additionalProperties"])
        self.assertEqual(
            schema["$id"], "https://trellis.local/schemas/c10-run-record.schema.json"
        )
        self.assertEqual(schema["title"], "C10 append-only evaluation ledger record")
        self.assertEqual(
            schema["$defs"]["attemptReservation"]["properties"]["authorizationRef"]["const"],
            harness.AUTHORIZATION_REF,
        )
        self.assertIn(
            "c8-source-baseline",
            schema["$defs"]["identitySnapshot"]["properties"]["methodIdentity"][
                "properties"
            ]["kind"]["enum"],
        )


class WorkspaceTests(HarnessFixture):
    def test_prepare_requires_valid_auth_evidence_before_output_creation(self) -> None:
        (self.research / "first-party-auth.json").unlink()

        with self.assertRaisesRegex(harness.HarnessError, "first-party auth evidence"):
            harness.prepare_run("lit-a", "literature-01", "A", self.research)

        self.assertFalse((self.research / "outputs/lit-a").exists())
        self.assertEqual((self.research / "runs.jsonl").read_bytes(), b"")

    def test_arms_materialize_only_their_own_frozen_method(self) -> None:
        bare = harness.prepare_run("lit-a", "literature-01", "A", self.research)
        source = harness.prepare_run("lit-b", "literature-01", "B", self.research)
        package = harness.prepare_run("lit-c", "literature-01", "C", self.research)
        self.assertFalse((bare / "workspace/method").exists())
        self.assertTrue((source / "workspace/method/source/skills/research-literature/SKILL.md").is_file())
        self.assertFalse((source / "workspace/method/package").exists())
        self.assertTrue((package / "workspace/method/package/SKILL.md").is_file())
        self.assertTrue((package / "workspace/method/package/skill.json").is_file())
        self.assertFalse((package / "workspace/method/source").exists())
        self.assertNotIn("outputs/lit-b", (bare / "workspace/prompts/system.md").read_text())
        self.assertNotIn("outputs/lit-c", (bare / "workspace/prompts/task.md").read_text())
        self.assertTrue(
            (bare / "workspace/prompts/system.md")
            .read_text(encoding="utf-8")
            .startswith("# C10 isolated single-turn execution\n")
        )
        self.assertEqual(
            source.joinpath("workspace-manifest.json")
            .read_text(encoding="utf-8")
            .count('"kind": "c8-source-baseline"'),
            1,
        )

    def test_workspace_paths_are_unique_and_immutable(self) -> None:
        harness.prepare_run("unique-run", "literature-01", "A", self.research)
        with self.assertRaisesRegex(harness.HarnessError, "already exists"):
            harness.prepare_run("unique-run", "literature-01", "A", self.research)
        prompt = self.research / "outputs/unique-run/workspace/prompts/task.md"
        prompt.write_text(prompt.read_text() + "drift")
        plan, cases = harness.validate_static_evidence(self.research)
        with self.assertRaisesRegex(harness.HarnessError, "workspace bytes drifted"):
            harness.verify_prepared_workspace(
                "unique-run", "literature-01", "A", self.research, plan, cases["literature-01"]
            )

    def test_quest_cases_cannot_prepare_provider_workspace(self) -> None:
        with self.assertRaisesRegex(harness.HarnessError, "forbidden for deterministic"):
            harness.prepare_run("quest-live", "quest-admin-01", "A", self.research)


class LedgerAndRunnerIntegrationTests(HarnessFixture):
    def test_fake_executor_accounts_reservation_before_result(self) -> None:
        result = self.run_fake("lit-a", "literature-01", "A")
        records = self.ledger_records()
        self.assertEqual([record["recordKind"] for record in records], ["attempt-reservation", "attempt-result"])
        self.assertEqual(result["supersedesRecordId"], records[0]["recordId"])
        self.assertEqual(records[0]["attemptId"], records[1]["attemptId"])
        self.assertEqual(
            records[1]["process"]["command"][0],
            claude_runner.DIRECT_CLAUDE_EXECUTABLE,
        )
        self.assertNotIn("--add-dir", records[1]["process"]["command"])
        harness.validate_static_evidence(self.research)

    def test_wrong_authorization_never_calls_executor_or_writes_ledger(self) -> None:
        harness.prepare_run("lit-a", "literature-01", "A", self.research)
        calls = 0

        def forbidden_executor(command, cwd, timeout):
            nonlocal calls
            calls += 1
            raise AssertionError("executor must not be called")

        with self.assertRaisesRegex(harness.HarnessError, "authorization acknowledgement"):
            harness.run_live_attempt(
                run_id="lit-a",
                case_id="literature-01",
                arm="A",
                authorization_ref="wrong",
                acknowledge_provider_launch=True,
                research_root=self.research,
                executor=forbidden_executor,
            )
        self.assertEqual(calls, 0)
        self.assertEqual((self.research / "runs.jsonl").read_bytes(), b"")

    def test_missing_auth_evidence_never_calls_executor_or_reserves_attempt(self) -> None:
        harness.prepare_run("lit-a", "literature-01", "A", self.research)
        (self.research / "first-party-auth.json").unlink()
        calls = 0

        def forbidden_executor(command, cwd, timeout):
            nonlocal calls
            calls += 1
            raise AssertionError("executor must not be called")

        with self.assertRaisesRegex(harness.HarnessError, "first-party auth evidence"):
            harness.run_live_attempt(
                run_id="lit-a",
                case_id="literature-01",
                arm="A",
                authorization_ref=harness.AUTHORIZATION_REF,
                acknowledge_provider_launch=True,
                research_root=self.research,
                executor=forbidden_executor,
            )
        self.assertEqual(calls, 0)
        self.assertEqual((self.research / "runs.jsonl").read_bytes(), b"")

    def test_only_infrastructure_failure_can_be_retried(self) -> None:
        self.run_fake("lit-a", "literature-01", "A", self.infrastructure_executor)
        result = harness.run_live_attempt(
            run_id="lit-a",
            case_id="literature-01",
            arm="A",
            authorization_ref=harness.AUTHORIZATION_REF,
            acknowledge_provider_launch=True,
            research_root=self.research,
            executor=self.usable_executor,
        )
        self.assertEqual(result["attemptNumber"], 2)
        self.assertEqual(result["retryNumber"], 1)
        with self.assertRaisesRegex(harness.HarnessError, "only after a no-output infrastructure failure"):
            harness.run_live_attempt(
                run_id="lit-a",
                case_id="literature-01",
                arm="A",
                authorization_ref=harness.AUTHORIZATION_REF,
                acknowledge_provider_launch=True,
                research_root=self.research,
                executor=self.infrastructure_executor,
            )

    def test_six_retry_limit_is_hard(self) -> None:
        harness.prepare_run("lit-a", "literature-01", "A", self.research)
        for expected_attempt in range(1, 8):
            result = harness.run_live_attempt(
                run_id="lit-a",
                case_id="literature-01",
                arm="A",
                authorization_ref=harness.AUTHORIZATION_REF,
                acknowledge_provider_launch=True,
                research_root=self.research,
                executor=self.infrastructure_executor,
            )
            self.assertEqual(result["attemptNumber"], expected_attempt)
        before = (self.research / "runs.jsonl").read_bytes()
        with self.assertRaises(harness.HarnessError):
            harness.run_live_attempt(
                run_id="lit-a",
                case_id="literature-01",
                arm="A",
                authorization_ref=harness.AUTHORIZATION_REF,
                acknowledge_provider_launch=True,
                research_root=self.research,
                executor=self.infrastructure_executor,
            )
        self.assertEqual((self.research / "runs.jsonl").read_bytes(), before)
        self.assertEqual(len(self.ledger_records()), 14)

    def test_duplicate_attempt_id_and_immutable_correction_are_rejected(self) -> None:
        self.run_fake("lit-a", "literature-01", "A")
        records = self.ledger_records()
        plan, cases = harness.validate_static_evidence(self.research)
        duplicate = copy.deepcopy(records[0])
        duplicate["recordId"] = str(uuid.uuid4())
        duplicate["logicalRunId"] = "lit-b"
        duplicate["caseId"] = "literature-01"
        duplicate["arm"] = "B"
        duplicate["outputDirectory"] = f"outputs/lit-b/attempts/{duplicate['attemptId']}"
        duplicate["identitySnapshot"] = harness.identity_snapshot(
            self.research, plan, cases["literature-01"], "B"
        )
        duplicate_path = self.research / "duplicate.json"
        duplicate_path.write_text(json.dumps(duplicate))
        with self.assertRaisesRegex(harness.HarnessError, "duplicate attemptId"):
            harness.append_run(duplicate_path, self.research)

        correction_id = str(uuid.uuid4())
        replacement = copy.deepcopy(records[1])
        replacement["recordId"] = correction_id
        replacement["createdAt"] = harness.utc_now()
        replacement["process"]["cwd"] = "outputs/other/workspace"
        correction = {
            "schemaVersion": 1,
            "recordKind": "correction",
            "recordId": correction_id,
            "createdAt": replacement["createdAt"],
            "supersedesRecordId": records[1]["recordId"],
            "reason": "test correction",
            "replacement": replacement,
        }
        correction_path = self.research / "correction.json"
        correction_path.write_text(json.dumps(correction))
        with self.assertRaisesRegex(harness.HarnessError, "immutable provider-attempt accounting"):
            harness.append_run(correction_path, self.research)

    def test_evaluator_barrier_opens_only_after_all_three_usable_arms(self) -> None:
        self.run_fake("lit-a", "literature-01", "A")
        with self.assertRaisesRegex(harness.HarnessError, "barrier closed"):
            harness.evaluator_inputs("literature-01", self.research)
        self.run_fake("lit-b", "literature-01", "B")
        self.run_fake("lit-c", "literature-01", "C")
        inputs = harness.evaluator_inputs("literature-01", self.research)
        self.assertEqual(set(inputs), {"A", "B", "C"})
        self.assertEqual(len({item["outputDirectory"] for item in inputs.values()}), 3)

    def test_case_evaluation_and_summary_do_not_overclaim_global_gate(self) -> None:
        for arm in harness.ARMS:
            self.run_fake(f"lit-{arm.lower()}", "literature-01", arm)
        inputs = harness.evaluator_inputs("literature-01", self.research)
        case = harness.load_cases(self.research)["literature-01"]
        arms = {}
        for arm in harness.ARMS:
            arms[arm] = {
                "resultRecordId": inputs[arm]["resultRecordId"],
                "outputSha256": inputs[arm]["outputSha256"],
                "assertions": [
                    {
                        "assertionId": assertion["id"],
                        "status": "pass",
                        "evidence": [f"{inputs[arm]['outputDirectory']}/stdout.json"],
                    }
                    for assertion in case["assertions"]
                ],
            }
        evaluation = {
            "schemaVersion": 1,
            "recordKind": "case-evaluation",
            "recordId": str(uuid.uuid4()),
            "createdAt": harness.utc_now(),
            "caseId": "literature-01",
            "evaluator": {"kind": "root", "id": "test-root"},
            "arms": arms,
            "zeroTolerancePass": True,
            "notes": "fake deterministic evaluator",
        }
        path = self.research / "evaluation.json"
        path.write_text(json.dumps(evaluation))
        harness.append_run(path, self.research)
        summary = harness.build_summary(self.research)
        self.assertEqual(summary["ledger"]["usableLogicalCalls"], 3)
        self.assertEqual(summary["ledger"]["caseEvaluations"], 1)
        self.assertEqual(summary["liveGate"]["status"], "live-incomplete")
        self.assertFalse(summary["liveGate"]["fullMigrationClaimAllowed"])

    def test_quality_failure_blocks_full_gate_after_all_zero_tolerance_checks_pass(self) -> None:
        for case_id in harness.LIVE_CASE_IDS:
            for arm in harness.ARMS:
                self.run_fake(f"{case_id}-{arm.lower()}", case_id, arm)
            inputs = harness.evaluator_inputs(case_id, self.research)
            case = harness.load_cases(self.research)[case_id]
            arms = {}
            for arm in harness.ARMS:
                arms[arm] = {
                    "resultRecordId": inputs[arm]["resultRecordId"],
                    "outputSha256": inputs[arm]["outputSha256"],
                    "assertions": [
                        {
                            "assertionId": assertion["id"],
                            "status": (
                                "fail"
                                if case_id == "literature-01"
                                and arm == "A"
                                and assertion["id"] == "question-scope-locked"
                                else "pass"
                            ),
                            "evidence": [f"{inputs[arm]['outputDirectory']}/stdout.json"],
                        }
                        for assertion in case["assertions"]
                    ],
                }
            evaluation = {
                "schemaVersion": 1,
                "recordKind": "case-evaluation",
                "recordId": str(uuid.uuid4()),
                "createdAt": harness.utc_now(),
                "caseId": case_id,
                "evaluator": {"kind": "root", "id": "test-root"},
                "arms": arms,
                "zeroTolerancePass": True,
                "notes": "one non-zero-tolerance quality assertion fails",
            }
            path = self.research / f"{case_id}-evaluation.json"
            path.write_text(json.dumps(evaluation))
            harness.append_run(path, self.research)

        summary = harness.build_summary(self.research)
        self.assertEqual(summary["liveGate"]["status"], "failed-quality")
        self.assertTrue(summary["liveGate"]["zeroTolerancePassed"])
        self.assertFalse(summary["liveGate"]["qualityAndOverheadPassed"])
        self.assertFalse(summary["liveGate"]["fullMigrationClaimAllowed"])


class SummaryAndProofTests(HarnessFixture):
    def test_empty_ledger_summary_and_decision_are_explicitly_pending(self) -> None:
        summary = harness.build_summary(self.research)
        self.assertEqual(summary["liveGate"]["status"], "live-not-started")
        self.assertEqual(summary["liveGate"]["usableCalls"], 0)
        self.assertEqual(summary["ledger"]["launchedProcesses"], 0)
        self.assertFalse(summary["liveGate"]["fullMigrationClaimAllowed"])
        summary_path, decision_path = harness.write_summary_and_decision(self.research)
        self.assertTrue(summary_path.is_file())
        decision = decision_path.read_text()
        self.assertIn("Decision: **PENDING**", decision)
        self.assertIn("0/18 usable calls", decision)
        self.assertNotIn("Decision: **PASS**", decision)
        self.assertTrue(decision.startswith("# C10 exact-model migration decision\n"))

    def resolver_stdout(self) -> bytes:
        plan = harness.load_plan(self.research)
        payload = {
            "schemaVersion": 1,
            "command": "research skill list",
            "skills": [
                {
                    "id": package_id,
                    "version": entry["identity"]["version"],
                    "source": "bundled",
                    "identity": entry["identity"],
                }
                for package_id, entry in plan["acceptedPackages"].items()
            ],
        }
        return json.dumps(payload).encode()

    def test_proof_is_written_only_after_all_deterministic_checks_pass(self) -> None:
        commands: list[list[str]] = []

        def passing_runner(command, cwd):
            del cwd
            commands.append(list(command))
            stdout = self.resolver_stdout() if "research" in command and "list" in command else b"ok"
            return subprocess.CompletedProcess(command, 0, stdout=stdout, stderr=b"")

        proof_path = harness.generate_deterministic_proof(
            self.research, command_runner=passing_runner
        )
        proof = harness.strict_json_file(proof_path)
        self.assertEqual(proof["status"], "passed")
        self.assertEqual(proof["proofId"], harness.PROOF_ID)
        self.assertEqual(
            proof["predecessorEvidence"]["commit"],
            "cacbd39cf8ae30783e2f0383ba9153502ebb12f3",
        )
        self.assertEqual(
            proof["firstPartyRoutingEvidence"]["status"],
            auth_preflight.REQUIRED_STATUS,
        )
        self.assertFalse(proof["providerBoundary"]["providerProcessLaunched"])
        self.assertEqual(proof["providerBoundary"]["runsJsonlBytes"], 0)
        self.assertFalse(proof["liveGate"]["fullMigrationClaimAllowed"])
        self.assertTrue(any("build" in command for command in commands))
        resolver_index = next(i for i, command in enumerate(commands) if "research" in command and "list" in command)
        cli_build_index = next(i for i, command in enumerate(commands) if command[:3] == ["pnpm", "--filter", "@mindfoldhq/trellis"])
        self.assertLess(cli_build_index, resolver_index)
        self.assertFalse(any(Path(command[0]).name == "claude" for command in commands))
        self.assertEqual(
            [check["id"] for check in proof["checks"][:2]],
            [
                "predecessor-git-object-verification",
                "first-party-auth-artifact-verification",
            ],
        )
        auth_command = next(
            check["command"]
            for check in proof["checks"]
            if check["id"] == "first-party-auth-artifact-verification"
        )
        self.assertIn("--verify", auth_command)
        self.assertNotIn("auth status", " ".join(auth_command))
        plan = harness.load_plan(self.research)
        harness.validate_deterministic_proof(
            proof,
            research_root=self.research,
            plan=plan,
        )
        case_path = self.research / "cases/literature-01.json"
        case_path.write_bytes(case_path.read_bytes() + b" ")
        with self.assertRaisesRegex(harness.HarnessError, "harness artifact identities are stale"):
            harness.validate_deterministic_proof(
                proof,
                research_root=self.research,
                plan=plan,
            )

    def test_failed_check_leaves_no_proof(self) -> None:
        def failing_runner(command, cwd):
            del cwd
            return subprocess.CompletedProcess(command, 1, stdout=b"", stderr=b"failed")

        with self.assertRaisesRegex(harness.HarnessError, "before proof creation"):
            harness.generate_deterministic_proof(
                self.research, command_runner=failing_runner
            )
        self.assertFalse((self.research / "deterministic-proof.json").exists())

    def test_proof_refuses_nonempty_ledger(self) -> None:
        (self.research / "runs.jsonl").write_text("{}\n")
        calls = 0

        def forbidden_runner(command, cwd):
            nonlocal calls
            calls += 1
            raise AssertionError

        with self.assertRaisesRegex(harness.HarnessError, "ledger to remain exactly empty"):
            harness.generate_deterministic_proof(
                self.research, command_runner=forbidden_runner
            )
        self.assertEqual(calls, 0)


if __name__ == "__main__":
    unittest.main()
