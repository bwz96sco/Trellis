#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Claude adapter for one explicit approved Research worker Dispatch."""
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
_RESEARCH_DISPATCH_RE = re.compile(
    r"^Research dispatch: (dsp_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-"
    r"[89ab][0-9a-f]{3}-[0-9a-f]{12})$"
)
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
    match = _RESEARCH_DISPATCH_RE.fullmatch(prompt)
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


def _require_object(value: Any, label: str) -> dict:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    return value


def _require_list(value: Any, label: str) -> list:
    if not isinstance(value, list):
        raise ValueError(f"{label} must be an array")
    return value


def _require_string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError(f"{label} must be a non-empty string")
    return value


def _research_response_id(value: Any, prefix: str, label: str) -> str:
    candidate = _require_string(value, label)
    pattern = re.compile(
        rf"^{prefix}_[0-9a-fA-F]{{8}}-[0-9a-fA-F]{{4}}-[1-8][0-9a-fA-F]{{3}}-"
        rf"[89abAB][0-9a-fA-F]{{3}}-[0-9a-fA-F]{{12}}$"
    )
    if pattern.fullmatch(candidate) is None:
        raise ValueError(f"{label} must be a {prefix}_ UUID")
    return candidate


def _validate_c07_failure(payload: dict) -> dict:
    if payload.get("schemaVersion") != 1:
        raise ValueError("typed preflight failure has an invalid schema version")
    if payload.get("command") != "research dispatch context":
        raise ValueError("typed preflight failure has an invalid command")
    if payload.get("valid") is not False:
        raise ValueError("typed preflight failure must set valid to false")
    if payload.get("safeAction") != "report-to-root-no-write":
        raise ValueError("typed preflight failure has an invalid safe action")
    error = _require_object(payload.get("error"), "typed preflight error")
    return {
        "code": _bounded_preflight_text(error.get("code"), "preflight error code"),
        "message": _bounded_preflight_text(
            error.get("message"), "preflight error message"
        ),
    }


def _validate_dispatch_context_response(payload: dict, dispatch_id: str) -> dict:
    if payload.get("command") != "research dispatch context":
        raise ValueError("preflight response has an invalid command")
    if payload.get("valid") is not True:
        raise ValueError("preflight response must set valid to true")
    ledger_head = payload.get("ledgerHead")
    if isinstance(ledger_head, bool) or not isinstance(ledger_head, int) or ledger_head < 0:
        raise ValueError("preflight response ledger head is invalid")
    warnings = _require_list(payload.get("warnings"), "preflight warnings")
    for warning in warnings:
        item = _require_object(warning, "preflight warning")
        _bounded_preflight_text(item.get("code"), "preflight warning code")
        _bounded_preflight_text(item.get("message"), "preflight warning message")

    context = _require_object(payload.get("context"), "preflight context")
    expected_context_keys = {
        "schemaVersion",
        "host",
        "dispatch",
        "activation",
        "approval",
        "capability",
        "procedure",
        "repository",
        "context",
        "artifacts",
        "allowedWritePaths",
        "expectedOutputs",
        "checks",
        "authority",
        "outputContract",
    }
    if set(context) != expected_context_keys:
        raise ValueError("preflight context has an invalid normalized shape")
    if context.get("schemaVersion") != 1 or context.get("host") != "claude":
        raise ValueError("preflight context host or schema does not match Claude")

    dispatch = _require_object(context.get("dispatch"), "context.dispatch")
    actual_dispatch_id = _research_response_id(
        dispatch.get("id"), "dsp", "context.dispatch.id"
    )
    if actual_dispatch_id != dispatch_id:
        raise ValueError("preflight Dispatch identity does not match the envelope")
    run_id = _research_response_id(dispatch.get("runId"), "run", "context.dispatch.runId")
    quest_id = _research_response_id(
        dispatch.get("questId"), "qst", "context.dispatch.questId"
    )

    activation = _require_object(context.get("activation"), "context.activation")
    _research_response_id(activation.get("id"), "act", "context.activation.id")
    _require_string(activation.get("capabilityId"), "context.activation.capabilityId")
    if activation.get("mode") not in {"automatic", "explicit"}:
        raise ValueError("context.activation.mode is invalid")
    for key in ("requestDigest", "procedureDigest", "policyDigest", "scopeHash"):
        _require_string(activation.get(key), f"context.activation.{key}")

    approval = _require_object(context.get("approval"), "context.approval")
    approval_id = _research_response_id(approval.get("id"), "apr", "context.approval.id")
    if approval.get("mode") not in {"automatic", "interactive"}:
        raise ValueError("context.approval.mode is invalid")
    _require_string(approval.get("expiresAt"), "context.approval.expiresAt")

    capability = _require_object(context.get("capability"), "context.capability")
    capability_id = _require_string(capability.get("id"), "context.capability.id")
    if capability_id != activation.get("capabilityId"):
        raise ValueError("context capability does not match activation")
    for key in ("stage", "kind", "activation", "workerAuthority", "networkPolicy", "repositoryScope"):
        _require_string(capability.get(key), f"context.capability.{key}")
    if capability.get("workerAuthority") != "proposal-only":
        raise ValueError("context capability worker authority is invalid")
    if isinstance(capability.get("maxDurationMinutes"), bool) or not isinstance(
        capability.get("maxDurationMinutes"), int
    ):
        raise ValueError("context capability duration is invalid")
    if isinstance(capability.get("maxDispatches"), bool) or not isinstance(
        capability.get("maxDispatches"), int
    ):
        raise ValueError("context capability dispatch limit is invalid")
    _require_list(capability.get("approvalRequiredFor"), "context.capability.approvalRequiredFor")
    capability_procedure = _require_object(
        capability.get("procedure"), "context.capability.procedure"
    )
    _require_string(capability_procedure.get("id"), "context.capability.procedure.id")
    _require_string(
        capability_procedure.get("version"), "context.capability.procedure.version"
    )

    procedure = _require_object(context.get("procedure"), "context.procedure")
    manifest = _require_object(procedure.get("manifest"), "context.procedure.manifest")
    if manifest.get("schemaVersion") != 1:
        raise ValueError("context Procedure manifest schema is invalid")
    if (
        manifest.get("id") != capability_procedure.get("id")
        or manifest.get("version") != capability_procedure.get("version")
        or manifest.get("stage") != capability.get("stage")
        or manifest.get("kind") != capability.get("kind")
    ):
        raise ValueError("context Procedure manifest does not match capability")
    _require_list(manifest.get("inputs"), "context.procedure.manifest.inputs")
    _require_list(manifest.get("outputs"), "context.procedure.manifest.outputs")
    _require_string(procedure.get("digest"), "context.procedure.digest")
    _require_string(procedure.get("instructions"), "context.procedure.instructions")
    if procedure.get("digest") != activation.get("procedureDigest"):
        raise ValueError("context Procedure digest does not match activation")
    if procedure.get("source") not in {"project", "bundled"}:
        raise ValueError("context Procedure source is invalid")

    repository = _require_object(context.get("repository"), "context.repository")
    _research_response_id(repository.get("id"), "rep", "context.repository.id")
    _require_string(repository.get("path"), "context.repository.path")
    for key in ("context", "artifacts", "allowedWritePaths", "expectedOutputs", "checks"):
        _require_list(context.get(key), f"context.{key}")
    for artifact in context["artifacts"]:
        item = _require_object(artifact, "context artifact")
        _require_object(item.get("ref"), "context artifact ref")
        _require_string(item.get("path"), "context artifact path")
    for key in ("allowedWritePaths", "expectedOutputs", "checks"):
        for value in context[key]:
            _require_string(value, f"context.{key} entry")

    expected_authority = {
        "readScope": "declared-context-only",
        "writeScope": "allowed-write-paths-only",
        "network": False,
        "externalCost": False,
        "multipleRepositories": False,
        "canonicalResearchMutation": False,
        "proposalReview": False,
        "gitHistoryMutation": False,
        "capabilityChaining": False,
        "procedureLaunch": False,
        "dispatchLaunch": False,
        "nestedAgents": False,
        "sandboxExpansion": False,
        "recordResult": False,
    }
    authority = _require_object(context.get("authority"), "context.authority")
    if authority != expected_authority:
        raise ValueError("preflight response authority does not match bounded execution")

    output = _require_object(context.get("outputContract"), "context.outputContract")
    if output.get("type") != "result-plus-pending-proposal":
        raise ValueError("preflight response output contract is invalid")
    if (
        output.get("dispatchId") != actual_dispatch_id
        or output.get("runId") != run_id
        or output.get("questId") != quest_id
    ):
        raise ValueError("preflight output relations do not match the Dispatch")
    result_id = _research_response_id(output.get("resultId"), "res", "output.resultId")
    proposal_id = _research_response_id(
        output.get("proposalId"), "prp", "output.proposalId"
    )
    suffix = approval_id[4:]
    if result_id != f"res_{suffix}" or proposal_id != f"prp_{suffix}":
        raise ValueError("preflight output IDs do not match the selected approval")
    return context


def _local_preflight_failure(message: str) -> dict:
    return {"code": "PREFLIGHT_EXECUTION_FAILED", "message": message}


def _run_dispatch_context(
    control_root: Path, dispatch_id: str
) -> tuple[dict | None, dict | None]:
    argv = [
        "trellis",
        "research",
        "dispatch",
        "context",
        dispatch_id,
        "--host",
        "claude",
        "--root",
        str(control_root),
        "--json",
    ]
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
        return _validate_dispatch_context_response(payload, dispatch_id), None
    except ValueError as error:
        return None, _local_preflight_failure(str(error))


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

Execute the embedded Procedure under the immutable authority ceiling. Return raw Result plus pending Proposal JSON only.
"""


def _preflight_explicit_dispatch(
    input_data: dict, cwd: str, original_prompt: str
) -> tuple[str | None, dict | None]:
    dispatch_id = _parse_dispatch_envelope(original_prompt)
    if dispatch_id is None:
        return None, _local_preflight_failure(
            "the worker prompt must be exactly one canonical Research dispatch line"
        )
    control_root = _find_research_control_root(input_data, cwd)
    if control_root is None:
        return None, _local_preflight_failure(
            "the Research control-plane root could not be found"
        )
    context, failure = _run_dispatch_context(control_root, dispatch_id)
    if context is None:
        return None, failure
    return _build_validated_dispatch_prompt(context), None


def _sanitize_denial_text(value: Any, fallback: str) -> str:
    if not isinstance(value, str):
        return fallback
    sanitized = " ".join(value.split())
    sanitized = "".join(
        character
        for character in sanitized
        if ord(character) >= 32 and ord(character) != 127
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
        return value.strip()
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
    if (
        os.environ.get("TRELLIS_HOOKS") == "0"
        or os.environ.get("TRELLIS_DISABLE_HOOKS") == "1"
    ):
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
