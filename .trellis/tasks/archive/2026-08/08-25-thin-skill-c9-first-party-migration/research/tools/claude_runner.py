#!/usr/bin/env python3
"""Exact, single-turn Claude CLI adapter for the future C9 live evaluation.

Importing this module never starts a process. Callers must append an attempt
reservation before invoking ``execute_process``.
"""

from __future__ import annotations

import json
import os
import signal as signal_module
import subprocess
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

EXPECTED_PROVIDER = "Claude"
EXPECTED_MODEL = "claude-sonnet-5"
SANITIZED_ENVIRONMENT_KEYS = (
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_MODEL",
    "ANTHROPIC_SMALL_FAST_MODEL",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    "ANTHROPIC_DEFAULT_SONNET_MODEL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_API_KEY",
    "CLAUDE_CODE_USE_BEDROCK",
    "CLAUDE_CODE_USE_VERTEX",
    "CLAUDE_CODE_USE_FOUNDRY",
)


class RunnerValidationError(ValueError):
    """Raised when a provider result violates the frozen runner contract."""


@dataclass(frozen=True)
class ProcessExecution:
    launched: bool
    pid: int | None
    exit_code: int | None
    signal: str | None
    stdout: bytes
    stderr: bytes
    timed_out: bool = False
    spawn_error: str | None = None


@dataclass(frozen=True)
class ClassifiedExecution:
    classification: str
    usable_model_result: bool
    retry_eligible: bool
    reason: str
    provider_result: dict[str, Any] | None


ProcessExecutor = Callable[[Sequence[str], Path, float], ProcessExecution]


def build_first_party_environment(
    source: Mapping[str, str] | None = None,
) -> dict[str, str]:
    """Copy an environment and remove every local routing or credential override."""

    environment = dict(os.environ if source is None else source)
    for key in SANITIZED_ENVIRONMENT_KEYS:
        environment.pop(key, None)
    return environment


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise RunnerValidationError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def _reject_non_json_number(value: str) -> None:
    raise RunnerValidationError(f"non-JSON numeric constant: {value}")


def strict_json_object(data: bytes, label: str) -> dict[str, Any]:
    try:
        value = json.loads(
            data.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_keys,
            parse_constant=_reject_non_json_number,
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RunnerValidationError(f"{label} is not one UTF-8 JSON value: {error}") from error
    if not isinstance(value, dict):
        raise RunnerValidationError(f"{label} must be a JSON object")
    return value


def build_command(task_prompt: str, system_prompt: str, session_id: str) -> list[str]:
    """Return the only authorized provider command."""

    if not task_prompt.strip():
        raise RunnerValidationError("task prompt must be nonempty")
    if not system_prompt.strip():
        raise RunnerValidationError("system prompt must be nonempty")
    if not session_id.strip():
        raise RunnerValidationError("session ID must be nonempty")
    return [
        "claude",
        "--safe-mode",
        "-p",
        task_prompt,
        "--model",
        EXPECTED_MODEL,
        "--system-prompt",
        system_prompt,
        "--output-format",
        "json",
        "--session-id",
        session_id,
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
    ]


def execute_process(command: Sequence[str], cwd: Path, timeout_seconds: float) -> ProcessExecution:
    """Execute a reserved attempt and capture exact process bytes.

    This function is intentionally separate so tests and deterministic setup can
    inject a fake executor and never start ``claude``.
    """

    process: subprocess.Popen[bytes] | None = None
    try:
        process = subprocess.Popen(
            list(command),
            cwd=cwd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=build_first_party_environment(),
        )
        stdout, stderr = process.communicate(timeout=timeout_seconds)
        return ProcessExecution(
            launched=True,
            pid=process.pid,
            exit_code=process.returncode,
            signal=_signal_name(process.returncode),
            stdout=stdout,
            stderr=stderr,
        )
    except subprocess.TimeoutExpired:
        if process is None:
            return ProcessExecution(
                launched=False,
                pid=None,
                exit_code=None,
                signal=None,
                stdout=b"",
                stderr=b"",
                timed_out=True,
                spawn_error="timeout before process launch",
            )
        process.kill()
        stdout, stderr = process.communicate()
        return ProcessExecution(
            launched=True,
            pid=process.pid,
            exit_code=process.returncode,
            signal=_signal_name(process.returncode),
            stdout=stdout,
            stderr=stderr,
            timed_out=True,
        )
    except OSError as error:
        return ProcessExecution(
            launched=False,
            pid=None,
            exit_code=None,
            signal=None,
            stdout=b"",
            stderr=str(error).encode("utf-8", errors="replace"),
            spawn_error=str(error),
        )


def _signal_name(return_code: int | None) -> str | None:
    if return_code is None or return_code >= 0:
        return None
    try:
        return signal_module.Signals(-return_code).name
    except ValueError:
        return f"SIG{-return_code}"


def _number_or_none(value: Any, label: str) -> int | float | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0:
        raise RunnerValidationError(f"{label} must be a nonnegative number or null")
    return value


def _positive_numeric_value(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    if isinstance(value, list):
        return bool(value)
    if isinstance(value, dict):
        return any(_positive_numeric_value(item) for item in value.values())
    return bool(value)


def _has_tool_activity(raw: Mapping[str, Any]) -> bool:
    for key in ("tool_uses", "toolUses", "tool_use", "toolUse"):
        if key in raw and _positive_numeric_value(raw[key]):
            return True
    usage = raw.get("usage")
    if isinstance(usage, dict):
        for key, value in usage.items():
            if "tool" in key.lower() and _positive_numeric_value(value):
                return True
    model_usage = raw.get("modelUsage")
    if isinstance(model_usage, dict):
        for model_value in model_usage.values():
            if not isinstance(model_value, dict):
                continue
            for key, value in model_value.items():
                if "tool" in key.lower() and _positive_numeric_value(value):
                    return True
    return False


def normalize_usable_result(
    raw: Mapping[str, Any],
    *,
    expected_session_id: str,
) -> dict[str, Any]:
    """Validate every acceptance condition and preserve the complete raw result."""

    if raw.get("type") != "result":
        raise RunnerValidationError("provider output type must be result")
    if raw.get("is_error") is not False:
        raise RunnerValidationError("provider output is_error must be false")
    result = raw.get("result")
    if not isinstance(result, str) or not result.strip():
        raise RunnerValidationError("provider result text must be nonempty")
    if raw.get("num_turns") != 1:
        raise RunnerValidationError("provider num_turns must equal 1")

    session_id = raw.get("session_id")
    if session_id != expected_session_id:
        raise RunnerValidationError("provider session_id does not match the reserved session")

    model_usage = raw.get("modelUsage")
    if not isinstance(model_usage, dict) or len(model_usage) != 1:
        raise RunnerValidationError("modelUsage must contain exactly one resolved model identity")
    resolved_model = next(iter(model_usage))
    if resolved_model != EXPECTED_MODEL:
        raise RunnerValidationError(
            f"model substitution rejected: expected {EXPECTED_MODEL}, got {resolved_model}"
        )
    explicit_model = raw.get("model")
    if explicit_model is not None and explicit_model != EXPECTED_MODEL:
        raise RunnerValidationError(
            f"model substitution rejected: expected {EXPECTED_MODEL}, got {explicit_model}"
        )

    permission_denials = raw.get("permission_denials", [])
    if permission_denials != []:
        raise RunnerValidationError("permission denial or attempted tool activity was reported")
    if _has_tool_activity(raw):
        raise RunnerValidationError("tool activity was reported")

    usage = raw.get("usage")
    if not isinstance(usage, dict):
        raise RunnerValidationError("provider usage must be an object")

    num_turns = raw["num_turns"]
    if isinstance(num_turns, bool) or not isinstance(num_turns, int):
        raise RunnerValidationError("provider num_turns must be an integer")

    return {
        "type": "result",
        "isError": False,
        "result": result,
        "resultUuid": raw.get("uuid"),
        "sessionId": session_id,
        "stopReason": raw.get("stop_reason"),
        "numTurns": num_turns,
        "durationMs": _number_or_none(raw.get("duration_ms"), "duration_ms"),
        "durationApiMs": _number_or_none(raw.get("duration_api_ms"), "duration_api_ms"),
        "totalCostUsd": _number_or_none(raw.get("total_cost_usd"), "total_cost_usd"),
        "usage": usage,
        "modelUsage": model_usage,
        "resolvedModel": resolved_model,
        "permissionDenials": permission_denials,
        "rawResult": dict(raw),
    }


def _contains_usable_model_output(raw: Mapping[str, Any] | None) -> bool:
    return bool(
        raw is not None
        and raw.get("type") == "result"
        and isinstance(raw.get("result"), str)
        and raw.get("result", "").strip()
    )


def _is_nonretryable_infrastructure_message(text: str) -> bool:
    lowered = text.lower()
    signatures = (
        "authentication failed",
        "not authenticated",
        "not logged in",
        "unauthorized",
        "invalid api key",
        "invalid_api_key",
        "model unavailable",
        "model is unavailable",
        "model not found",
        "unsupported model",
        "unknown model",
    )
    return any(signature in lowered for signature in signatures)


def classify_execution(
    execution: ProcessExecution,
    *,
    expected_session_id: str,
) -> ClassifiedExecution:
    """Classify one reserved attempt without silently converting content failures to retries."""

    raw: dict[str, Any] | None = None
    parse_error: str | None = None
    if execution.stdout:
        try:
            raw = strict_json_object(execution.stdout, "Claude stdout")
        except RunnerValidationError as error:
            parse_error = str(error)

    combined_message = "\n".join(
        part for part in (
            execution.stdout.decode("utf-8", errors="replace"),
            execution.stderr.decode("utf-8", errors="replace"),
            execution.spawn_error or "",
        ) if part
    )
    if _is_nonretryable_infrastructure_message(combined_message):
        return ClassifiedExecution(
            classification="nonretryable-failure",
            usable_model_result=_contains_usable_model_output(raw),
            retry_eligible=False,
            reason="authentication or authorized-model availability failure",
            provider_result=None,
        )

    if raw is not None:
        try:
            normalized = normalize_usable_result(raw, expected_session_id=expected_session_id)
        except RunnerValidationError as error:
            return ClassifiedExecution(
                classification="nonretryable-failure",
                usable_model_result=_contains_usable_model_output(raw),
                retry_eligible=False,
                reason=str(error),
                provider_result=None,
            )
        if execution.exit_code != 0:
            return ClassifiedExecution(
                classification="nonretryable-failure",
                usable_model_result=True,
                retry_eligible=False,
                reason="usable provider result accompanied a nonzero process exit",
                provider_result=normalized,
            )
        return ClassifiedExecution(
            classification="usable-completion",
            usable_model_result=True,
            retry_eligible=False,
            reason="exact one-turn authorized-model result accepted",
            provider_result=normalized,
        )

    reason = "infrastructure failure with no usable model output"
    if execution.timed_out:
        reason = "process timeout with no usable model output"
    elif execution.spawn_error:
        reason = "process spawn failure with no usable model output"
    elif parse_error:
        reason = f"unparseable process output with no usable model result: {parse_error}"
    return ClassifiedExecution(
        classification="infrastructure-failure",
        usable_model_result=False,
        retry_eligible=True,
        reason=reason,
        provider_result=None,
    )
