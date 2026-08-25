from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

import claude_runner as runner


class ClaudeRunnerTests(unittest.TestCase):
    def result_payload(self, **overrides: object) -> dict[str, object]:
        payload: dict[str, object] = {
            "type": "result",
            "is_error": False,
            "result": "bounded output",
            "uuid": "result-uuid",
            "session_id": "session-1",
            "stop_reason": "end_turn",
            "num_turns": 1,
            "duration_ms": 20,
            "duration_api_ms": 15,
            "total_cost_usd": 0.01,
            "usage": {"input_tokens": 10, "output_tokens": 4},
            "modelUsage": {
                "claude-sonnet-5": {"inputTokens": 10, "outputTokens": 4}
            },
            "permission_denials": [],
        }
        payload.update(overrides)
        return payload

    def execution(self, payload: dict[str, object], exit_code: int = 0) -> runner.ProcessExecution:
        return runner.ProcessExecution(
            launched=True,
            pid=123,
            exit_code=exit_code,
            signal=None,
            stdout=json.dumps(payload).encode(),
            stderr=b"",
        )

    def test_build_command_is_exact_single_turn_contract(self) -> None:
        command = runner.build_command("task", "system", "session")
        self.assertEqual(
            command,
            [
                "claude",
                "--safe-mode",
                "-p",
                "task",
                "--model",
                "claude-sonnet-5",
                "--system-prompt",
                "system",
                "--output-format",
                "json",
                "--session-id",
                "session",
                "--no-session-persistence",
                "--tools",
                "",
                "--disallowedTools",
                "mcp__*",
                "--disable-slash-commands",
                "--permission-mode",
                "dontAsk",
                "--max-turns",
                "1",
            ],
        )

    def test_accepts_exact_usable_result(self) -> None:
        classified = runner.classify_execution(
            self.execution(self.result_payload()), expected_session_id="session-1"
        )
        self.assertEqual(classified.classification, "usable-completion")
        self.assertTrue(classified.usable_model_result)
        self.assertFalse(classified.retry_eligible)
        self.assertEqual(classified.provider_result["resolvedModel"], "claude-sonnet-5")
        self.assertEqual(classified.provider_result["rawResult"]["uuid"], "result-uuid")

    def test_rejects_model_substitution_without_retry(self) -> None:
        payload = self.result_payload(
            modelUsage={"claude-opus-5": {"inputTokens": 10, "outputTokens": 4}}
        )
        classified = runner.classify_execution(
            self.execution(payload), expected_session_id="session-1"
        )
        self.assertEqual(classified.classification, "nonretryable-failure")
        self.assertTrue(classified.usable_model_result)
        self.assertFalse(classified.retry_eligible)
        self.assertIn("model substitution", classified.reason)

    def test_rejects_permission_or_tool_activity(self) -> None:
        denied = self.result_payload(permission_denials=[{"tool": "Read"}])
        classified = runner.classify_execution(
            self.execution(denied), expected_session_id="session-1"
        )
        self.assertEqual(classified.classification, "nonretryable-failure")
        self.assertFalse(classified.retry_eligible)

        tool_use = self.result_payload(usage={"input_tokens": 10, "server_tool_use": {"web": 1}})
        classified = runner.classify_execution(
            self.execution(tool_use), expected_session_id="session-1"
        )
        self.assertEqual(classified.classification, "nonretryable-failure")
        self.assertIn("tool activity", classified.reason)

    def test_only_no_output_infrastructure_failure_is_retryable(self) -> None:
        empty = runner.ProcessExecution(
            launched=True,
            pid=123,
            exit_code=1,
            signal=None,
            stdout=b"",
            stderr=b"connection reset",
        )
        classified = runner.classify_execution(empty, expected_session_id="session-1")
        self.assertEqual(classified.classification, "infrastructure-failure")
        self.assertFalse(classified.usable_model_result)
        self.assertTrue(classified.retry_eligible)

        auth = runner.ProcessExecution(
            launched=True,
            pid=123,
            exit_code=1,
            signal=None,
            stdout=b"",
            stderr=b"Authentication failed: not logged in",
        )
        classified = runner.classify_execution(auth, expected_session_id="session-1")
        self.assertEqual(classified.classification, "nonretryable-failure")
        self.assertFalse(classified.retry_eligible)

    def test_usable_partial_result_is_not_retryable(self) -> None:
        payload = self.result_payload(is_error=True, result="partial but usable text")
        classified = runner.classify_execution(
            self.execution(payload, exit_code=1), expected_session_id="session-1"
        )
        self.assertEqual(classified.classification, "nonretryable-failure")
        self.assertTrue(classified.usable_model_result)
        self.assertFalse(classified.retry_eligible)

    def test_duplicate_json_key_is_rejected(self) -> None:
        execution = runner.ProcessExecution(
            launched=True,
            pid=123,
            exit_code=0,
            signal=None,
            stdout=b'{"type":"result","type":"result"}',
            stderr=b"",
        )
        classified = runner.classify_execution(execution, expected_session_id="session-1")
        self.assertEqual(classified.classification, "infrastructure-failure")
        self.assertTrue(classified.retry_eligible)
        self.assertIn("duplicate JSON key", classified.reason)


if __name__ == "__main__":
    unittest.main()
