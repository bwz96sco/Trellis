from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

RESEARCH = Path(__file__).resolve().parents[1]
TOOLS = RESEARCH / "tools"
sys.path.insert(0, str(TOOLS))

import auth_preflight
import verify_predecessor as predecessor


class PredecessorVerificationTests(unittest.TestCase):
    def test_authenticates_committed_c8_and_every_reusable_copy(self) -> None:
        manifest = predecessor.verify_predecessor(RESEARCH)

        self.assertEqual(manifest["evaluationId"], predecessor.C9_EVALUATION_ID)
        predecessor_identity = manifest["predecessor"]
        self.assertEqual(predecessor_identity["commit"], predecessor.C8_COMMIT)
        self.assertEqual(predecessor_identity["taskPath"], predecessor.C8_TASK_PATH)
        self.assertEqual(
            predecessor_identity["evaluationId"], predecessor.C8_EVALUATION_ID
        )
        self.assertEqual(predecessor_identity["status"], predecessor.C8_STATUS)
        self.assertEqual(
            predecessor_identity["sourceAggregateDigest"],
            "sha256:7ad7bf1547605ce8c243bcb51dd03715e1ebfb7ef4c7ea528053ee41386fcd89",
        )
        self.assertEqual(
            {
                package_id: (
                    identity["version"],
                    identity["packageDigest"],
                    identity["instructionDigest"],
                    identity["memberInventoryDigest"],
                )
                for package_id, identity in predecessor_identity[
                    "acceptedPackageIdentities"
                ].items()
            },
            {
                "research-idea-evaluation": (
                    "1.0.0",
                    "sha256:dc58cc3abc0993956a4fc5b0fb873ff09b560af6468b9bb2bb4bc3db8891454a",
                    "sha256:4294c16a649778a1e763c143ee82893a1b7d370b3513fdd3ce5a9b97aaf8a03a",
                    "sha256:880ef7179d8245730322dcc78c178425fbe56f8d6dc06597487b43f0069ef436",
                ),
                "research-ideation": (
                    "1.1.0",
                    "sha256:ece95cbc55dcd51fb28c6e4d729b873a067a938967b8c25a79fded7fbe3ed3d9",
                    "sha256:7f569076fced3487d81957a73b597893e878bf79eb49b51d20e5e9b2bce9346a",
                    "sha256:d9dfaec07f25eacdb91364c78fca2947786ce4d281631cff9f8695969ce7544c",
                ),
                "research-literature": (
                    "1.1.0",
                    "sha256:620aa58ae0f9f7d837e92dbcf5d30892e4a9fb67bd49365ad56a9ef7d98093ce",
                    "sha256:2bd56e1e71f9710aad654b3658a630da9ace9c9c97b1f4d5e3c128e59da6c92a",
                    "sha256:0528e9227f1c17f75f36ddf5a7fce03c05aa698301e78510e1aff712dfc494ed",
                ),
                "research-quest-admin": (
                    "1.0.0",
                    "sha256:97e2a3dd3e1731b8899c502131c6d1017482f6c24737f39c8b7c45257fb9c37d",
                    "sha256:cf0ea546c6d2d2b9dfde7f00c7578705c993fb30d76df194cfe19569596593e5",
                    "sha256:0ed9fa66664d261a53da5dc81101e083b4299c14da128895858ade8590340727",
                ),
            },
        )
        immutable = {
            record["role"]: (record["bytes"], record["sha256"])
            for record in manifest["immutableEvaluationArtifacts"]
        }
        self.assertEqual(
            immutable,
            {
                "ledger": (
                    56681,
                    "54838a5df96b5d1557facb668c0548cc8295770960b7e1efe2d9f9b47ec0c2ca",
                ),
                "summary": (
                    1093,
                    "532bed12657f8020314a5cdbfa5ac1fc07c842c717f7a941a353ffb116ee2219",
                ),
                "decision": (
                    464,
                    "85cff2e68c0ba7dfb7de1a1996c7e2aa0099aedb4e71943966980a51dc0f2318",
                ),
            },
        )
        copied_paths = {record["c9Path"] for record in manifest["copiedInputs"]}
        self.assertIn("source-baseline/manifest.json", copied_paths)
        self.assertIn("cases/literature-01.json", copied_paths)
        self.assertIn("package-blueprints.json", copied_paths)
        self.assertNotIn("evaluation-plan.json", copied_paths)

    def test_allows_only_valid_auth_runtime_evidence_outside_static_inventory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            research = Path(temporary) / "research"
            shutil.copytree(RESEARCH, research)
            auth_path = research / predecessor.AUTH_EVIDENCE_PATH
            auth_path.unlink(missing_ok=True)
            auth_preflight.write_auth_artifact(
                auth_preflight.build_auth_artifact(
                    b'{"loggedIn":true,"authMethod":"claude.ai","apiProvider":"firstParty"}',
                    checked_at="2026-08-25T12:00:00Z",
                ),
                auth_path,
            )

            manifest = predecessor.verify_predecessor(
                research,
                repo_root=predecessor.RESEARCH_ROOT.parents[3],
            )
            static_paths = {
                record["c9Path"]
                for section in ("copiedInputs", "derivedFiles")
                for record in manifest[section]
            }
            self.assertNotIn(predecessor.AUTH_EVIDENCE_PATH, static_paths)

            (research / "unexpected-runtime.json").write_text("{}\n", encoding="utf-8")
            with self.assertRaisesRegex(
                predecessor.PredecessorError,
                "static inventory differs",
            ):
                predecessor.verify_predecessor(
                    research,
                    repo_root=predecessor.RESEARCH_ROOT.parents[3],
                )

    def test_rejects_current_c9_copy_drift_against_git_object_bytes(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            research = Path(temporary) / "research"
            shutil.copytree(RESEARCH, research)
            path = research / "case-sources/manifest.json"
            path.write_bytes(path.read_bytes() + b"drift")

            with self.assertRaisesRegex(
                predecessor.PredecessorError,
                "copied C9 input differs from C8 Git bytes",
            ):
                predecessor.verify_predecessor(
                    research,
                    repo_root=predecessor.RESEARCH_ROOT.parents[3],
                )

    def test_rejects_omitted_copied_or_excluded_predecessor_records(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            research = Path(temporary) / "research"
            shutil.copytree(RESEARCH, research)
            manifest_path = research / "predecessor.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["copiedInputs"].pop()
            manifest["excludedPredecessorArtifacts"].pop()
            manifest_path.write_text(
                json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(
                predecessor.PredecessorError,
                "copied input provenance inventory is incomplete",
            ):
                predecessor.verify_predecessor(
                    research,
                    repo_root=predecessor.RESEARCH_ROOT.parents[3],
                )

    def test_rejects_unbound_file_inside_copied_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            research = Path(temporary) / "research"
            shutil.copytree(RESEARCH, research)
            (research / "cases/unbound.json").write_text("{}\n", encoding="utf-8")

            with self.assertRaisesRegex(
                predecessor.PredecessorError,
                "directory inventory contains missing or unbound paths",
            ):
                predecessor.verify_predecessor(
                    research,
                    repo_root=predecessor.RESEARCH_ROOT.parents[3],
                )

    def test_excludes_every_c8_provider_output_and_failure_record(self) -> None:
        manifest = predecessor.verify_predecessor(RESEARCH)
        excluded = manifest["excludedPredecessorArtifacts"]
        paths = {record["c8Path"] for record in excluded}

        self.assertIn(
            f"{predecessor.C8_RESEARCH_PATH}/provider-unavailable.json",
            paths,
        )
        self.assertIn(
            f"{predecessor.C8_RESEARCH_PATH}/claude-cli-runner-evidence.md",
            paths,
        )
        self.assertTrue(
            any(
                path.startswith(f"{predecessor.C8_RESEARCH_PATH}/outputs/")
                for path in paths
            )
        )
        self.assertTrue(
            all(
                record["category"]
                in {
                    "provider-output",
                    "terminal-evaluation",
                    "predecessor-deterministic-proof",
                    "provider-failure-evidence",
                }
                for record in excluded
            )
        )


if __name__ == "__main__":
    unittest.main()
