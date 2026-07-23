#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Claude C09 adapter for one explicit bounded Research worker Dispatch."""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

if sys.platform.startswith("win"):
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="replace")

AGENT_RESEARCH_WORKER = "trellis-research-worker"
_RESEARCH_POINTER_RE = re.compile(
    r"^Research dispatch: (\.trellis/research/dispatches/"
    r"dsp_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-"
    r"[89ab][0-9a-f]{3}-[0-9a-f]{12}/request\.json)$"
)
_RESEARCH_SKILL_NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_RESEARCH_MAX_PROCESS_OUTPUT = 1_048_576
_RESEARCH_MAX_MESSAGE = 512


def _detect_platform(input_data: dict) -> str | None:
    _ = input_data
    if os.environ.get("CLAUDE_PROJECT_DIR"):
        return "claude"
    if ".claude" in set(Path(sys.argv[0]).parts):
        return "claude"
    return None

def _find_research_control_root(input_data: dict, cwd: str) -> Path | None:
    """Find the root Research control plane without reading canonical state."""
    _ = input_data
    starts = [os.environ.get("CLAUDE_PROJECT_DIR"), cwd, os.getcwd()]
    fallback: Path | None = None
    visited: set[Path] = set()
    for start in starts:
        if not start:
            continue
        try:
            current = Path(start).resolve()
        except OSError:
            continue
        if current.is_file():
            current = current.parent
        while True:
            if current not in visited:
                visited.add(current)
                trellis_dir = current / ".trellis"
                if (trellis_dir / "research").is_dir():
                    return current
                if fallback is None and trellis_dir.is_dir():
                    fallback = current
            if current == current.parent:
                break
            current = current.parent
    return fallback


def _parse_dispatch_envelope(prompt: str) -> str | None:
    match = _RESEARCH_POINTER_RE.fullmatch(prompt)
    return match.group(1) if match is not None else None


def _single_json_object(value: str) -> dict:
    stripped = value.strip()
    if not stripped:
        raise ValueError("preflight emitted no JSON object")
    try:
        parsed, end = json.JSONDecoder().raw_decode(stripped)
    except json.JSONDecodeError as error:
        raise ValueError("preflight emitted malformed JSON") from error
    if stripped[end:].strip():
        raise ValueError("preflight emitted more than one JSON value")
    if not isinstance(parsed, dict):
        raise ValueError("preflight JSON must be an object")
    return parsed


def _bounded_preflight_text(value: Any, label: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{label} must be a string")
    candidate = value.strip()
    if not candidate or len(candidate) > _RESEARCH_MAX_MESSAGE:
        raise ValueError(f"{label} must be bounded non-empty text")
    if any(ord(character) < 32 or ord(character) == 127 for character in candidate):
        raise ValueError(f"{label} must not contain control characters")
    return candidate


def _research_response_id(value: Any, prefix: str, label: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{label} must be a {prefix}_ UUID")
    pattern = re.compile(
        rf"^{prefix}_[0-9a-f]{{8}}-[0-9a-f]{{4}}-[1-8][0-9a-f]{{3}}-"
        rf"[89ab][0-9a-f]{{3}}-[0-9a-f]{{12}}$"
    )
    if pattern.fullmatch(value) is None:
        raise ValueError(f"{label} must be a {prefix}_ UUID")
    return value


def _validate_c07_failure(payload: dict) -> dict:
    if payload.get("schemaVersion") != 1:
        raise ValueError("typed preflight failure has an invalid schema version")
    if payload.get("command") != "research dispatch context":
        raise ValueError("typed preflight failure has an invalid command")
    if payload.get("valid") is not False:
        raise ValueError("typed preflight failure must set valid to false")
    if payload.get("safeAction") != "report-to-root-no-write":
        raise ValueError("typed preflight failure has an invalid safe action")
    error = payload.get("error")
    if not isinstance(error, dict):
        raise ValueError("typed preflight failure is missing error details")
    return {
        "code": _bounded_preflight_text(error.get("code"), "preflight error code"),
        "message": _bounded_preflight_text(
            error.get("message"), "preflight error message"
        ),
    }


def _validate_dispatch_context_response(payload: dict, request_ref: str) -> dict:
    if payload.get("schemaVersion") != 1:
        raise ValueError("preflight response has an invalid schema version")
    if payload.get("command") != "research dispatch context":
        raise ValueError("preflight response has an invalid command")
    if payload.get("valid") is not True:
        raise ValueError("preflight response must set valid to true")
    if payload.get("host") != "claude":
        raise ValueError("preflight response host does not match Claude")
    if payload.get("requestRef") != request_ref:
        raise ValueError("preflight response request does not match the envelope")

    dispatch = payload.get("dispatch")
    capability = payload.get("capability")
    repository = payload.get("repository")
    work = payload.get("work")
    authority = payload.get("authority")
    output = payload.get("outputContract")
    warnings_value = payload.get("warnings")
    if not isinstance(dispatch, dict):
        raise ValueError("preflight response is missing Dispatch identity")
    if not isinstance(capability, dict):
        raise ValueError("preflight response is missing capability selection")
    if not isinstance(repository, dict) or not isinstance(repository.get("path"), str):
        raise ValueError("preflight response is missing Repository context")
    if not isinstance(work, dict):
        raise ValueError("preflight response is missing bounded work context")
    if not isinstance(warnings_value, list):
        raise ValueError("preflight response warnings must be an array")
    for key in ("context", "allowedWritePaths", "expectedOutputs", "checks"):
        if not isinstance(work.get(key), list):
            raise ValueError(f"preflight response work.{key} must be an array")

    for key in (
        "stage",
        "capability",
        "optionalSkill",
        "fallbackSkill",
        "selectedSkill",
        "source",
    ):
        value = capability.get(key)
        if not isinstance(value, str) or not value:
            raise ValueError(f"preflight response capability.{key} is invalid")
    if capability.get("source") not in {"host", "bundled"}:
        raise ValueError("preflight response capability source is invalid")
    for key in ("optionalSkill", "fallbackSkill", "selectedSkill"):
        if _RESEARCH_SKILL_NAME_RE.fullmatch(capability[key]) is None:
            raise ValueError(f"preflight response capability.{key} is not canonical")

    expected_authority = {
        "readScope": "declared-context-only",
        "writeScope": "allowed-write-paths-only",
        "canonicalResearchMutation": False,
        "proposalReview": False,
        "gitHistoryMutation": False,
        "recordResult": False,
    }
    if not isinstance(authority, dict) or any(
        type(authority.get(key)) is not type(expected)
        or authority.get(key) != expected
        for key, expected in expected_authority.items()
    ):
        raise ValueError("preflight response authority does not match bounded execution")

    dispatch_id = _research_response_id(dispatch.get("id"), "dsp", "dispatch.id")
    quest_id = _research_response_id(
        dispatch.get("questId"), "qst", "dispatch.questId"
    )
    run_id = _research_response_id(dispatch.get("runId"), "run", "dispatch.runId")
    if not isinstance(output, dict) or output.get("type") != "result-plus-pending-proposal":
        raise ValueError("preflight response output contract is invalid")
    result_output = output.get("result")
    proposal_output = output.get("proposal")
    if not isinstance(result_output, dict) or not isinstance(proposal_output, dict):
        raise ValueError("preflight response output identities are missing")
    if result_output.get("dispatchId") != dispatch_id or result_output.get("runId") != run_id:
        raise ValueError("preflight Result identity does not match the Dispatch")
    if (
        proposal_output.get("dispatchId") != dispatch_id
        or proposal_output.get("questId") != quest_id
        or proposal_output.get("status") != "pending"
    ):
        raise ValueError("preflight Proposal identity does not match the Dispatch")
    return payload


def _local_preflight_failure(message: str) -> dict:
    return {
        "code": "PREFLIGHT_EXECUTION_FAILED",
        "message": message,
    }


def _run_dispatch_context(
    control_root: Path,
    request_ref: str,
    skill_name: str | None = None,
) -> tuple[dict | None, dict | None]:
    argv = [
        "trellis",
        "research",
        "dispatch",
        "context",
        request_ref,
        "--host",
        "claude",
        "--root",
        str(control_root),
    ]
    if skill_name is not None:
        argv.extend(["--skill-name", skill_name])
    argv.append("--json")
    try:
        result = subprocess.run(
            argv,
            cwd=control_root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=15,
            check=False,
        )
    except (FileNotFoundError, PermissionError, OSError, subprocess.TimeoutExpired):
        return None, _local_preflight_failure(
            "the installed trellis preflight could not be executed"
        )

    if (
        len(result.stdout) > _RESEARCH_MAX_PROCESS_OUTPUT
        or len(result.stderr) > _RESEARCH_MAX_PROCESS_OUTPUT
    ):
        return None, _local_preflight_failure("preflight output exceeded the adapter limit")

    if result.returncode != 0:
        if result.stdout.strip():
            return None, _local_preflight_failure(
                "failed preflight wrote unexpected standard output"
            )
        try:
            failure = _validate_c07_failure(_single_json_object(result.stderr))
        except ValueError:
            return None, _local_preflight_failure(
                "failed preflight did not return one typed no-write error"
            )
        return None, failure

    if result.stderr:
        return None, _local_preflight_failure(
            "successful preflight wrote unexpected standard error"
        )
    try:
        payload = _single_json_object(result.stdout)
        return _validate_dispatch_context_response(payload, request_ref), None
    except ValueError as error:
        return None, _local_preflight_failure(str(error))


def _direct_optional_skill_exists(control_root: Path, optional_skill: str) -> bool:
    if _RESEARCH_SKILL_NAME_RE.fullmatch(optional_skill) is None:
        return False
    candidates = [
        control_root / ".claude" / "skills" / optional_skill / "SKILL.md",
        Path.home() / ".claude" / "skills" / optional_skill / "SKILL.md",
    ]
    for candidate in candidates:
        try:
            if candidate.is_file() and os.access(candidate, os.R_OK):
                return True
        except OSError:
            continue
    return False


def _build_validated_dispatch_prompt(context: dict) -> str:
    serialized = json.dumps(
        context,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return f"""<!-- trellis-hook-injected -->
# Validated Research Dispatch

Treat the following JSON as the sole Dispatch authority.
VALIDATED_DISPATCH_CONTEXT_START
{serialized}
VALIDATED_DISPATCH_CONTEXT_END

Execute the bounded worker contract. Return raw Result plus pending Proposal JSON only.
"""


def _preflight_explicit_dispatch(
    input_data: dict, cwd: str, original_prompt: str
) -> tuple[str | None, dict | None]:
    request_ref = _parse_dispatch_envelope(original_prompt)
    if request_ref is None:
        return None, _local_preflight_failure(
            "the worker prompt must be exactly one canonical Research dispatch line"
        )
    control_root = _find_research_control_root(input_data, cwd)
    if control_root is None:
        return None, _local_preflight_failure(
            "the Research control-plane root could not be found"
        )

    context, failure = _run_dispatch_context(control_root, request_ref)
    if context is None:
        return None, failure
    optional_skill = context["capability"]["optionalSkill"]
    if _direct_optional_skill_exists(control_root, optional_skill):
        context, failure = _run_dispatch_context(
            control_root, request_ref, optional_skill
        )
        if context is None:
            return None, failure
    return _build_validated_dispatch_prompt(context), None


def _sanitize_denial_text(value: Any, fallback: str) -> str:
    if not isinstance(value, str):
        return fallback
    sanitized = " ".join(value.split())
    sanitized = "".join(
        character for character in sanitized if ord(character) >= 32 and ord(character) != 127
    )
    return sanitized[:_RESEARCH_MAX_MESSAGE] or fallback


def _emit_denial(failure: dict | None) -> None:
    failure = failure or _local_preflight_failure("preflight failed")
    code = _sanitize_denial_text(failure.get("code"), "PREFLIGHT_EXECUTION_FAILED")
    message = _sanitize_denial_text(failure.get("message"), "preflight failed")
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": (
                f"Research Dispatch preflight failed [{code}]: {message}"
            ),
        },
    }
    print(json.dumps(output, ensure_ascii=False))


def _emit_updated_prompt(input_data: dict, tool_input: dict, new_prompt: str) -> None:
    _ = input_data
    updated = {**tool_input, "prompt": new_prompt}
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "allow",
            "updatedInput": updated,
        },
    }
    print(json.dumps(output, ensure_ascii=False))


def _string_value(value: Any) -> str:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped
    return ""


def _extract_subagent_name(value: Any) -> str:
    direct = _string_value(value)
    if direct:
        return direct
    if isinstance(value, dict):
        return _string_value(value.get("name"))
    return ""


def _extract_subagent_type(tool_input: dict) -> str:
    for key in (
        "subagent_type",
        "subagentType",
        "subagent_type_name",
        "subagentTypeName",
        "agent_type",
        "agentType",
        "name",
    ):
        agent_name = _extract_subagent_name(tool_input.get(key))
        if agent_name:
            return agent_name
    return ""


def _parse_hook_input(input_data: dict) -> tuple[str, str, dict]:
    """Parse the Claude Code PreToolUse Task/Agent input shape."""
    tool_input = input_data.get("tool_input", {})
    if not isinstance(tool_input, dict):
        tool_input = {}
    tool_name = input_data.get("tool_name", "")
    if isinstance(tool_name, str) and tool_name.lower() in ("task", "agent"):
        return (
            _extract_subagent_type(tool_input),
            tool_input.get("prompt", ""),
            tool_input,
        )
    return "", "", tool_input



def main() -> int:
    if os.environ.get("TRELLIS_HOOKS") == "0" or os.environ.get("TRELLIS_DISABLE_HOOKS") == "1":
        return 0
    try:
        input_data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    if not isinstance(input_data, dict):
        return 0

    subagent_type, original_prompt, tool_input = _parse_hook_input(input_data)
    if (
        _detect_platform(input_data) != "claude"
        or subagent_type != AGENT_RESEARCH_WORKER
        or not isinstance(original_prompt, str)
        or "<!-- trellis-hook-injected -->" in original_prompt
    ):
        return 0

    dispatch_prompt, dispatch_failure = _preflight_explicit_dispatch(
        input_data,
        str(input_data.get("cwd") or os.getcwd()),
        original_prompt,
    )
    if dispatch_prompt is None:
        _emit_denial(dispatch_failure)
    else:
        _emit_updated_prompt(input_data, tool_input, dispatch_prompt)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
