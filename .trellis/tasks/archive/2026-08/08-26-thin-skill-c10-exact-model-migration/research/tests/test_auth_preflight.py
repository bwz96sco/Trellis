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

    def test_builds_redacted_artifact_with_exact_direct_route(self) -> None:
        raw_status = self.raw_status(
            accountEmail="secret@example.test",
            apiKey="secret-api-key",
            authToken="secret-auth-token",
        )
        artifact = preflight.build_auth_artifact(
            raw_status,
            checked_at="2026-08-26T12:00:00Z",
        )

        self.assertEqual(
            set(artifact),
            {
                "schemaVersion",
                "checkedAt",
                "executable",
                "command",
                "status",
                "rawStatusSha256",
                "rawStatusBytes",
            },
        )
        self.assertEqual(
            artifact["executable"],
            {
                "path": runner.DIRECT_CLAUDE_EXECUTABLE,
                "version": runner.EXPECTED_CLAUDE_VERSION,
            },
        )
        self.assertEqual(
            artifact["command"],
            [runner.DIRECT_CLAUDE_EXECUTABLE, "auth", "status", "--json"],
        )
        self.assertEqual(artifact["status"], preflight.REQUIRED_STATUS)
        self.assertEqual(
            artifact["rawStatusSha256"], hashlib.sha256(raw_status).hexdigest()
        )
        self.assertEqual(artifact["rawStatusBytes"], len(raw_status))
        serialized = json.dumps(artifact)
        self.assertNotIn("secret@example.test", serialized)
        self.assertNotIn("secret-api-key", serialized)
        self.assertNotIn("secret-auth-token", serialized)
        self.assertNotIn("cmux.app", serialized)

    def test_rejects_duplicate_keys_wrong_version_and_non_first_party_route(self) -> None:
        with self.assertRaisesRegex(preflight.AuthPreflightError, "duplicate JSON key"):
            preflight.build_auth_artifact(
                b'{"loggedIn":true,"loggedIn":true,"authMethod":"claude.ai","apiProvider":"firstParty"}',
                checked_at="2026-08-26T12:00:00Z",
            )
        with self.assertRaisesRegex(preflight.AuthPreflightError, "version must equal"):
            preflight.build_auth_artifact(
                self.raw_status(),
                checked_at="2026-08-26T12:00:00Z",
                cli_version="other",
            )

        for overrides in (
            {"loggedIn": False},
            {"authMethod": "apiKey"},
            {"apiProvider": "bedrock"},
            {"apiProvider": None},
        ):
            with self.subTest(overrides=overrides), self.assertRaisesRegex(
                preflight.AuthPreflightError, "must be loggedIn=true"
            ):
                preflight.build_auth_artifact(
                    self.raw_status(**overrides),
                    checked_at="2026-08-26T12:00:00Z",
                )

    def test_version_and_auth_commands_use_direct_binary_and_isolated_environment(self) -> None:
        parent = {
            "PATH": "/bin",
            "PRESERVED": "yes",
            **{key: "blocked" for key in runner.SANITIZED_ENVIRONMENT_KEYS},
        }
        calls: list[tuple[tuple[str, ...], dict[str, str]]] = []

        def fake_executor(command, environment):
            calls.append((tuple(command), dict(environment)))
            stdout = (
                (runner.EXPECTED_CLAUDE_VERSION + "\n").encode()
                if tuple(command) == preflight.CLI_VERSION_COMMAND
                else self.raw_status()
            )
            return subprocess.CompletedProcess(command, 0, stdout, b"")

        with mock.patch.dict(os.environ, parent, clear=True):
            version = preflight.execute_cli_version(fake_executor)
            raw_status = preflight.execute_auth_status(fake_executor)
            self.assertEqual(dict(os.environ), parent)

        expected_environment = {
            "PATH": "/bin",
            "PRESERVED": "yes",
            **runner.FORCED_ENVIRONMENT,
        }
        self.assertEqual(version, runner.EXPECTED_CLAUDE_VERSION)
        self.assertEqual(raw_status, self.raw_status())
        self.assertEqual(calls[0][0], preflight.CLI_VERSION_COMMAND)
        self.assertEqual(calls[1][0], preflight.AUTH_STATUS_COMMAND)
        self.assertEqual(calls[0][1], expected_environment)
        self.assertEqual(calls[1][1], expected_environment)
        self.assertTrue(all("cmux.app" not in item for item in calls[0][0]))

    def test_default_executor_runs_only_exact_non_model_commands(self) -> None:
        version = subprocess.CompletedProcess(
            preflight.CLI_VERSION_COMMAND,
            0,
            (runner.EXPECTED_CLAUDE_VERSION + "\n").encode(),
            b"",
        )
        status = subprocess.CompletedProcess(
            preflight.AUTH_STATUS_COMMAND,
            0,
            self.raw_status(),
            b"",
        )
        with mock.patch.object(
            preflight.subprocess, "run", side_effect=[version, status]
        ) as run:
            self.assertEqual(preflight.execute_cli_version(), runner.EXPECTED_CLAUDE_VERSION)
            self.assertEqual(preflight.execute_auth_status(), self.raw_status())

        self.assertEqual(run.call_count, 2)
        self.assertEqual(run.call_args_list[0].args, ([*preflight.CLI_VERSION_COMMAND],))
        self.assertEqual(run.call_args_list[1].args, ([*preflight.AUTH_STATUS_COMMAND],))
        for call in run.call_args_list:
            self.assertNotIn("-p", call.args[0])
            self.assertNotIn("--model", call.args[0])
            self.assertEqual(
                {key: call.kwargs["env"][key] for key in runner.FORCED_ENVIRONMENT},
                runner.FORCED_ENVIRONMENT,
            )
            self.assertTrue(
                all(
                    key not in call.kwargs["env"] or key in runner.FORCED_ENVIRONMENT
                    for key in runner.SANITIZED_ENVIRONMENT_KEYS
                )
            )

    def test_writes_and_verifies_only_redacted_direct_route_artifact(self) -> None:
        raw_status = self.raw_status(
            accountEmail="secret@example.test",
            apiKey="secret-api-key",
            authToken="secret-auth-token",
        )
        artifact = preflight.build_auth_artifact(
            raw_status,
            checked_at="2026-08-26T12:00:00Z",
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
