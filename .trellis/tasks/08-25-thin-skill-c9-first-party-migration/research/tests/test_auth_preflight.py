from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

import auth_preflight as preflight
import claude_runner as runner


class AuthPreflightTests(unittest.TestCase):
    def raw_status(self, **overrides: object) -> bytes:
        status: dict[str, object] = {
            "loggedIn": True,
            "authMethod": "claude.ai",
            "apiProvider": "firstParty",
        }
        status.update(overrides)
        return json.dumps(status, separators=(",", ":")).encode("utf-8")

    def test_builds_redacted_artifact_with_exact_route_and_raw_digest(self) -> None:
        raw_status = self.raw_status(
            accountEmail="secret@example.test",
            apiKey="secret-api-key",
            authToken="secret-auth-token",
        )
        artifact = preflight.build_auth_artifact(
            raw_status,
            checked_at="2026-08-25T12:00:00Z",
        )

        self.assertEqual(
            set(artifact),
            {
                "schemaVersion",
                "checkedAt",
                "command",
                "status",
                "rawStatusSha256",
                "rawStatusBytes",
            },
        )
        self.assertEqual(artifact["command"], ["claude", "auth", "status", "--json"])
        self.assertEqual(artifact["status"], preflight.REQUIRED_STATUS)
        self.assertEqual(
            artifact["rawStatusSha256"], hashlib.sha256(raw_status).hexdigest()
        )
        self.assertEqual(artifact["rawStatusBytes"], len(raw_status))
        self.assertNotIn("accountEmail", artifact["status"])
        serialized = json.dumps(artifact)
        self.assertNotIn("secret@example.test", serialized)
        self.assertNotIn("secret-api-key", serialized)
        self.assertNotIn("secret-auth-token", serialized)

    def test_rejects_duplicate_keys_and_every_non_first_party_route(self) -> None:
        with self.assertRaisesRegex(preflight.AuthPreflightError, "duplicate JSON key"):
            preflight.build_auth_artifact(
                b'{"loggedIn":true,"loggedIn":true,"authMethod":"claude.ai","apiProvider":"firstParty"}',
                checked_at="2026-08-25T12:00:00Z",
            )

        invalid_statuses = (
            {"loggedIn": False},
            {"authMethod": "apiKey"},
            {"apiProvider": "bedrock"},
            {"apiProvider": None},
        )
        for overrides in invalid_statuses:
            with self.subTest(overrides=overrides), self.assertRaisesRegex(
                preflight.AuthPreflightError, "must be loggedIn=true"
            ):
                preflight.build_auth_artifact(
                    self.raw_status(**overrides),
                    checked_at="2026-08-25T12:00:00Z",
                )

    def test_execute_auth_status_uses_only_exact_command_and_sanitized_environment(self) -> None:
        parent = {
            "PATH": "/bin",
            "PRESERVED": "yes",
            **{key: "blocked" for key in runner.SANITIZED_ENVIRONMENT_KEYS},
        }
        calls: list[tuple[tuple[str, ...], dict[str, str]]] = []

        def fake_executor(command, environment):
            calls.append((tuple(command), dict(environment)))
            return subprocess.CompletedProcess(command, 0, self.raw_status(), b"")

        with mock.patch.dict(os.environ, parent, clear=True):
            raw_status = preflight.execute_auth_status(fake_executor)
            self.assertEqual(dict(os.environ), parent)

        self.assertEqual(raw_status, self.raw_status())
        self.assertEqual(calls[0][0], ("claude", "auth", "status", "--json"))
        self.assertEqual(calls[0][1], {"PATH": "/bin", "PRESERVED": "yes"})

    def test_default_executor_passes_exact_non_model_command_without_launching_process(self) -> None:
        completed = subprocess.CompletedProcess(
            preflight.AUTH_STATUS_COMMAND,
            0,
            self.raw_status(),
            b"",
        )
        with mock.patch.object(preflight.subprocess, "run", return_value=completed) as run:
            raw_status = preflight.execute_auth_status()

        self.assertEqual(raw_status, self.raw_status())
        self.assertEqual(run.call_args.args, (["claude", "auth", "status", "--json"],))
        self.assertNotIn("-p", run.call_args.args[0])
        self.assertNotIn("--model", run.call_args.args[0])
        environment = run.call_args.kwargs["env"]
        self.assertTrue(
            all(key not in environment for key in runner.SANITIZED_ENVIRONMENT_KEYS)
        )

    def test_writes_and_verifies_only_the_redacted_artifact(self) -> None:
        raw_status = self.raw_status(
            accountEmail="secret@example.test",
            apiKey="secret-api-key",
            authToken="secret-auth-token",
        )
        artifact = preflight.build_auth_artifact(
            raw_status,
            checked_at="2026-08-25T12:00:00Z",
        )
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "first-party-auth.json"
            preflight.write_auth_artifact(artifact, path)
            written = path.read_bytes()
            loaded = preflight.load_auth_artifact(path)

        self.assertEqual(loaded, artifact)
        self.assertTrue(written.endswith(b"\n"))
        self.assertNotIn(raw_status, written)
        self.assertNotIn(b"secret@example.test", written)
        self.assertNotIn(b"secret-api-key", written)
        self.assertNotIn(b"secret-auth-token", written)


if __name__ == "__main__":
    unittest.main()
