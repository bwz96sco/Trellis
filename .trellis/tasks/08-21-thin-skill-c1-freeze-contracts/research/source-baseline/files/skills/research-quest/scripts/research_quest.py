#!/usr/bin/env python3
"""Read-only research quest status, normalization, and validation."""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


QUEST_FILE = "research-quest.yaml"
EVENT_LOG = "research-events.jsonl"
FALLBACK_STATUS_FILE = Path("notes/_quest/QUEST_STATUS.md")
QUEST_STATUS_BASENAME = Path("_quest/QUEST_STATUS.md")
VAULT_MARKERS = {
    "AGENTS.md",
    "literature",
    "experiments",
    "ideas",
    "intake",
    "writing",
    "theory",
}

KNOWN_OWNER_SKILLS = {
    "research-quest",
    "research-quest-admin",
    "research-harness",
    "research-project-setup",
    "research-literature",
    "research-opportunity-mining",
    "research-ideation",
    "research-idea-evaluation",
    "research-experiment",
    "research-experiment-campaign",
    "research-computation",
    "research-theory",
    "research-writing",
    "research-figure",
    "research-slides",
    "research-review-case",
    "research-review-campaign",
    "research-innovation-explorer",
    "model-training-workflow",
    "experiment-adapter-builder",
}

CANONICAL_RESEARCH_STAGES = {
    "research-quest",
    "research-project-setup",
    "research-literature",
    "research-opportunity-mining",
    "research-ideation",
    "research-idea-evaluation",
    "research-experiment",
    "research-experiment-campaign",
    "research-computation",
    "research-theory",
    "research-writing",
    "research-figure",
    "research-slides",
    "research-review-case",
    "research-review-campaign",
}

LEGACY_STAGE_ALIASES = {
    "research-harness": "research-quest",
    "research-innovation-explorer": "research-ideation",
}

EVENT_TYPES = {
    "quest_created",
    "stage_opened",
    "artifact_changed",
    "evidence_added",
    "claim_updated",
    "decision_recorded",
    "route_changed",
    "blocker_added",
    "blocker_cleared",
    "validation_run",
    "handoff_created",
    "mempal_checkpoint",
    "task_forest_proposal",
}

CANONICAL_ACTIONS = {
    "continue",
    "route",
    "branch",
    "write",
    "review",
    "finalize",
    "stop",
    "blocked",
    "request_user",
}

BOARD_KEYS = {"current_mainline", "incumbent", "latest_decisive_result", "active_blocker", "stale_routes", "budget_class"}
BRANCH_STATUSES = {"active", "blocked", "parked", "done", "abandoned"}

CLAIM_EVIDENCE_STATUSES = {"supported", "partial"}
PLACEHOLDER_VALUES = {"", "todo", "tbd", "n/a", "na", "none", "unknown", "not_started", "ongoing"}
PLACEHOLDER_PREFIXES = ("placeholder:", "missing:", "todo:", "tbd:")


class QuestError(Exception):
    """Raised when quest files cannot be parsed."""


def strip_comment(line: str) -> str:
    in_single = False
    in_double = False
    escaped = False
    for index, char in enumerate(line):
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == "'" and not in_double:
            in_single = not in_single
        elif char == '"' and not in_single:
            in_double = not in_double
        elif char == "#" and not in_single and not in_double:
            return line[:index]
    return line


def parse_scalar(value: str) -> Any:
    value = value.strip()
    if value == "{}":
        return {}
    if value == "[]":
        return []
    lowered = value.lower()
    if lowered in {"null", "~"}:
        return None
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
        try:
            return json.loads(value) if value.startswith('"') else value[1:-1]
        except json.JSONDecodeError:
            return value[1:-1]
    try:
        return int(value)
    except ValueError:
        pass
    try:
        return float(value)
    except ValueError:
        return value


def split_key_value(content: str) -> tuple[str, str]:
    if ":" not in content:
        raise QuestError(f"Expected key/value line: {content}")
    key, value = content.split(":", 1)
    key = key.strip()
    if not key:
        raise QuestError(f"Empty key in line: {content}")
    return key, value.strip()


def looks_like_mapping_item(value: str) -> bool:
    return bool(re.match(r"^[A-Za-z_][A-Za-z0-9_.-]*\s*:", value))


def preprocess_yaml(text: str) -> list[tuple[int, str]]:
    rows: list[tuple[int, str]] = []
    for raw in text.splitlines():
        line = strip_comment(raw).rstrip()
        if not line.strip():
            continue
        if "\t" in line[: len(line) - len(line.lstrip(" "))]:
            raise QuestError("Tabs are not supported in quest YAML indentation")
        indent = len(line) - len(line.lstrip(" "))
        rows.append((indent, line.strip()))
    return rows


def parse_yaml_block(rows: list[tuple[int, str]], index: int, indent: int) -> tuple[Any, int]:
    if index >= len(rows):
        return {}, index
    row_indent, content = rows[index]
    if row_indent < indent:
        return {}, index
    if content.startswith("- "):
        return parse_yaml_list(rows, index, row_indent)
    return parse_yaml_map(rows, index, row_indent)


def parse_yaml_map(rows: list[tuple[int, str]], index: int, indent: int) -> tuple[dict[str, Any], int]:
    result: dict[str, Any] = {}
    while index < len(rows):
        row_indent, content = rows[index]
        if row_indent < indent:
            break
        if row_indent > indent:
            raise QuestError(f"Unexpected indentation before: {content}")
        if content.startswith("- "):
            break
        key, value = split_key_value(content)
        index += 1
        if value:
            result[key] = parse_scalar(value)
        elif index < len(rows) and rows[index][0] > row_indent:
            result[key], index = parse_yaml_block(rows, index, rows[index][0])
        else:
            result[key] = {}
    return result, index


def parse_yaml_list(rows: list[tuple[int, str]], index: int, indent: int) -> tuple[list[Any], int]:
    result: list[Any] = []
    while index < len(rows):
        row_indent, content = rows[index]
        if row_indent < indent:
            break
        if row_indent > indent:
            raise QuestError(f"Unexpected indentation before: {content}")
        if not content.startswith("- "):
            break
        value = content[2:].strip()
        index += 1
        if not value:
            if index < len(rows) and rows[index][0] > row_indent:
                item, index = parse_yaml_block(rows, index, rows[index][0])
            else:
                item = None
        elif looks_like_mapping_item(value):
            key, raw = split_key_value(value)
            item = {key: parse_scalar(raw)} if raw else {key: {}}
            if index < len(rows) and rows[index][0] > row_indent:
                extra, index = parse_yaml_block(rows, index, rows[index][0])
                if isinstance(extra, dict):
                    item.update(extra)
                else:
                    item[key] = extra
        else:
            item = parse_scalar(value)
        result.append(item)
    return result, index


def load_yaml(path: Path) -> dict[str, Any]:
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise QuestError(f"Missing {path}") from exc
    stripped = text.strip()
    if not stripped:
        return {}
    if stripped.startswith("{"):
        try:
            data = json.loads(stripped)
        except json.JSONDecodeError as exc:
            raise QuestError(f"Invalid JSON-compatible YAML in {path}: {exc}") from exc
        if not isinstance(data, dict):
            raise QuestError(f"{path} must contain a mapping")
        return data
    rows = preprocess_yaml(text)
    data, index = parse_yaml_block(rows, 0, rows[0][0] if rows else 0)
    if index != len(rows):
        raise QuestError(f"Could not parse all YAML rows in {path}")
    if not isinstance(data, dict):
        raise QuestError(f"{path} must contain a mapping")
    return data


def is_legacy_quest(quest: dict[str, Any]) -> bool:
    """Return whether state uses a supported pre-0.2 read shape."""
    schema = quest.get("schema_version")
    if schema is None:
        return True
    try:
        return float(str(schema)) < 0.2
    except ValueError:
        return False


def canonical_legacy_stage(value: Any) -> str | None:
    """Map a legacy stage label only when it names a known owner skill."""
    if not isinstance(value, str) or is_placeholder(value):
        return None
    stage = value.strip()
    if stage in LEGACY_STAGE_ALIASES:
        return LEGACY_STAGE_ALIASES[stage]
    if stage in CANONICAL_RESEARCH_STAGES or stage in {"model-training-workflow", "experiment-adapter-builder"}:
        return stage
    candidate = f"research-{stage}" if not stage.startswith("research-") else stage
    if candidate in LEGACY_STAGE_ALIASES:
        return LEGACY_STAGE_ALIASES[candidate]
    return candidate if candidate in CANONICAL_RESEARCH_STAGES else None


def normalize_quest(quest: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Project legacy fields in memory without changing source state."""
    normalized = copy.deepcopy(quest)
    if not is_legacy_quest(normalized):
        return normalized, []

    warnings = ["WARN legacy quest state projected in memory; source was not rewritten"]
    stage_value = normalized.get("active_stage") or normalized.get("current_stage")
    if stage_value:
        stage = canonical_legacy_stage(stage_value)
        if stage:
            normalized["active_stage"] = stage
        else:
            warnings.append(f"WARN legacy stage is unknown: {stage_value}")

    action = normalized.get("next_action")
    if isinstance(action, str) and not is_placeholder(action):
        projected: dict[str, Any] = {"action": action}
        owner = canonical_legacy_stage(normalized.get("active_stage"))
        if owner:
            projected["owner_skill"] = owner
        normalized["next_action"] = projected

    return normalized, warnings


def read_events(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    events: list[dict[str, Any]] = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError as exc:
            raise QuestError(f"Invalid JSONL at {path}:{line_no}: {exc}") from exc
        if not isinstance(event, dict):
            raise QuestError(f"Event at {path}:{line_no} must be an object")
        events.append(event)
    return events


def is_placeholder(value: Any) -> bool:
    if value is None:
        return True
    if not isinstance(value, str):
        return False
    stripped = value.strip().lower()
    return stripped in PLACEHOLDER_VALUES or stripped.startswith(PLACEHOLDER_PREFIXES)


def clean_path_value(value: Any) -> str | None:
    if not isinstance(value, str) or is_placeholder(value):
        return None
    return value.split("#", 1)[0]


def validate_timestamp(value: Any) -> bool:
    if not isinstance(value, str) or not value:
        return False
    candidate = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError:
        return False
    return parsed.tzinfo is not None and parsed.utcoffset() is not None


def find_note_vault(root: Path) -> Path | None:
    note_root = root / "note"
    if not note_root.is_dir():
        return None
    candidates = [
        child
        for child in sorted(note_root.iterdir())
        if child.is_dir() and not child.name.startswith(".")
    ]
    marker_matches = [
        candidate
        for candidate in candidates
        if any((candidate / marker).exists() for marker in VAULT_MARKERS)
    ]
    if len(marker_matches) == 1:
        return marker_matches[0]
    if len(candidates) == 1:
        return candidates[0]
    return None


def status_file(root: Path) -> Path:
    vault = find_note_vault(root)
    if vault is not None:
        return vault.relative_to(root) / QUEST_STATUS_BASENAME
    return FALLBACK_STATUS_FILE


def validate_relative_path(root: Path, value: Any, label: str, errors: list[str], *, must_exist: bool) -> None:
    cleaned = clean_path_value(value)
    if cleaned is None:
        return
    path = Path(cleaned)
    if path.is_absolute():
        errors.append(f"{label} must be relative: {value}")
        return
    if ".." in path.parts:
        errors.append(f"{label} must not traverse upward: {value}")
        return
    if must_exist and not (root / path).exists():
        errors.append(f"{label} does not exist: {value}")


def owner_required(quest: dict[str, Any]) -> bool:
    try:
        return float(str(quest.get("schema_version", "0"))) >= 0.2
    except ValueError:
        return False


def validate_owner(value: Any, label: str, errors: list[str], *, required: bool) -> None:
    if not value:
        if required:
            errors.append(f"{label} is required")
        return
    if not isinstance(value, str) or value not in KNOWN_OWNER_SKILLS:
        errors.append(f"{label} is unknown: {value}")


def legacy_artifact_paths(value: Any) -> list[str]:
    paths: list[str] = []
    if isinstance(value, dict):
        for nested in value.values():
            paths.extend(legacy_artifact_paths(nested))
    elif isinstance(value, list):
        for nested in value:
            paths.extend(legacy_artifact_paths(nested))
    elif isinstance(value, str):
        paths.append(value)
    return paths


def validate_authoritative_artifacts(
    root: Path, artifacts: Any, errors: list[str], *, require_owners: bool
) -> None:
    if artifacts is None or is_placeholder(artifacts):
        return
    if not isinstance(artifacts, dict):
        errors.append("authoritative_artifacts must be a mapping")
        return
    seen_paths: dict[str, str] = {}
    for key, artifact in artifacts.items():
        label = f"authoritative_artifacts.{key}"
        if isinstance(artifact, str):
            validate_relative_path(root, artifact, label, errors, must_exist=True)
            if require_owners:
                errors.append(f"{label} must contain path and owner_skill")
            else:
                errors.append(f"WARN {label} uses legacy path-only form; add path and owner_skill")
            cleaned = clean_path_value(artifact)
            if cleaned and cleaned in seen_paths:
                errors.append(f"duplicate authoritative artifact path: {cleaned}")
            elif cleaned:
                seen_paths[cleaned] = label
            continue
        if isinstance(artifact, (dict, list)) and not (
            isinstance(artifact, dict) and ({"path", "owner_skill"} & set(artifact))
        ):
            if require_owners:
                errors.append(f"{label} must contain path and owner_skill")
                continue
            legacy_paths = legacy_artifact_paths(artifact)
            if not legacy_paths:
                errors.append(f"WARN {label} is an empty legacy artifact group")
            for legacy_path in legacy_paths:
                validate_relative_path(root, legacy_path, label, errors, must_exist=True)
                cleaned = clean_path_value(legacy_path)
                if cleaned and cleaned in seen_paths:
                    errors.append(f"duplicate authoritative artifact path: {cleaned}")
                elif cleaned:
                    seen_paths[cleaned] = label
            errors.append(f"WARN {label} uses legacy nested form; add owned artifact records")
            continue
        if not isinstance(artifact, dict):
            errors.append(f"{label} must contain path and owner_skill")
            continue
        if not artifact.get("path"):
            errors.append(f"{label}.path is required")
        validate_relative_path(root, artifact.get("path"), f"{label}.path", errors, must_exist=True)
        cleaned = clean_path_value(artifact.get("path"))
        if cleaned and cleaned in seen_paths:
            errors.append(f"duplicate authoritative artifact path: {cleaned}")
        elif cleaned:
            seen_paths[cleaned] = label
        validate_owner(
            artifact.get("owner_skill"),
            f"{label}.owner_skill",
            errors,
            required=require_owners,
        )


def validate_legacy_evidence(root: Path, evidence: Any, errors: list[str]) -> None:
    """Validate legacy evidence pointers without turning missing files into hard errors."""
    if evidence is None or is_placeholder(evidence):
        return
    if not isinstance(evidence, list):
        errors.append("WARN legacy evidence should be a list")
        return

    missing: list[str] = []
    for index, item in enumerate(evidence):
        label = f"evidence[{index}]"
        if not isinstance(item, dict):
            errors.append(f"WARN {label} should be a mapping")
            continue
        cleaned = clean_path_value(item.get("path"))
        if cleaned is None:
            errors.append(f"WARN {label}.path is missing")
            continue
        path = Path(cleaned)
        if path.is_absolute():
            errors.append(f"{label}.path must be relative: {cleaned}")
            continue
        if ".." in path.parts:
            errors.append(f"{label}.path must not traverse upward: {cleaned}")
            continue
        if not (root / path).exists():
            missing.append(cleaned)

    if missing:
        pointers = ", ".join(dict.fromkeys(missing))
        errors.append(f"WARN legacy evidence does not exist: {pointers}")


def validate_branches(root: Path, branches: Any, errors: list[str]) -> set[str]:
    if branches is None or is_placeholder(branches):
        return set()
    if not isinstance(branches, list):
        errors.append("branches must be a list")
        return set()
    branch_ids: set[str] = set()
    for index, branch in enumerate(branches):
        label = f"branches[{index}]"
        if not isinstance(branch, dict):
            errors.append(f"{label} must be a mapping")
            continue
        branch_id = branch.get("id")
        if not branch_id:
            errors.append(f"{label}.id is required")
        elif not isinstance(branch_id, str):
            errors.append(f"{label}.id must be a string")
        elif branch_id in branch_ids:
            errors.append(f"duplicate branch id: {branch_id}")
        else:
            branch_ids.add(branch_id)
        status = branch.get("status")
        if status not in BRANCH_STATUSES:
            errors.append(f"{label}.status is unknown: {status}")
        validate_owner(branch.get("owner_skill"), f"{label}.owner_skill", errors, required=True)
        if status == "active" and not branch.get("objective"):
            errors.append(f"{label}.objective is required for an active branch")
        validate_relative_path(
            root,
            branch.get("expected_artifact"),
            f"{label}.expected_artifact",
            errors,
            must_exist=False,
        )
    return branch_ids


def validate_next_action(root: Path, action: Any, errors: list[str], label: str) -> None:
    if not isinstance(action, dict):
        if not is_placeholder(action):
            errors.append(f"{label} must be a mapping")
        return
    owner = action.get("owner_skill")
    if owner and owner not in KNOWN_OWNER_SKILLS:
        errors.append(f"{label}.owner_skill is unknown: {owner}")
    validate_relative_path(root, action.get("expected_artifact"), f"{label}.expected_artifact", errors, must_exist=False)
    action_value = action.get("action")
    if action_value and isinstance(action_value, str) and action_value not in CANONICAL_ACTIONS:
        errors.append(f"WARN {label}.action is not canonical: {action_value}")


def validate_board(board: Any, errors: list[str]) -> None:
    if board is None or is_placeholder(board):
        return
    if not isinstance(board, dict):
        errors.append("board must be a mapping")
        return
    unknown = set(board.keys()) - BOARD_KEYS
    if unknown:
        errors.append(f"board has unknown keys: {', '.join(sorted(unknown))}")
    stale = board.get("stale_routes")
    if stale is not None and not isinstance(stale, list):
        errors.append("board.stale_routes must be a list")


def validate_decision(root: Path, decision: Any, errors: list[str], label: str) -> None:
    if not isinstance(decision, dict) or not decision:
        return
    if not decision.get("rationale"):
        errors.append(f"{label}.rationale is required")
    for path in decision.get("evidence_paths", []) or []:
        validate_relative_path(root, path, f"{label}.evidence_paths", errors, must_exist=True)
    route = decision.get("next_route")
    if route and route not in KNOWN_OWNER_SKILLS:
        errors.append(f"{label}.next_route is unknown: {route}")


def validate_event(
    root: Path,
    event: dict[str, Any],
    errors: list[str],
    label: str,
    *,
    require_owners: bool,
) -> None:
    event_type = event.get("event_type")
    if event_type not in EVENT_TYPES:
        errors.append(f"{label}.event_type is unknown: {event_type}")
    if not event.get("event_id"):
        errors.append(f"{label}.event_id is required")
    if not validate_timestamp(event.get("timestamp")):
        errors.append(f"{label}.timestamp must be RFC3339 with timezone")
    if not event.get("summary"):
        errors.append(f"{label}.summary is required")
    if require_owners and event.get("milestone") is not True:
        errors.append(f"{label}.milestone must be true; routine activity does not belong in the event log")
    stage = event.get("stage")
    if stage and stage not in KNOWN_OWNER_SKILLS:
        errors.append(f"{label}.stage is unknown: {stage}")
    for index, artifact in enumerate(event.get("artifacts", []) or []):
        if isinstance(artifact, dict):
            validate_relative_path(root, artifact.get("path"), f"{label}.artifacts[{index}].path", errors, must_exist=True)
            validate_owner(
                artifact.get("owner_skill"),
                f"{label}.artifacts[{index}].owner_skill",
                errors,
                required=require_owners,
            )
        else:
            errors.append(f"{label}.artifacts[{index}] must be a mapping")
    for index, evidence in enumerate(event.get("evidence", []) or []):
        if isinstance(evidence, dict):
            validate_relative_path(root, evidence.get("path"), f"{label}.evidence[{index}].path", errors, must_exist=True)
        else:
            errors.append(f"{label}.evidence[{index}] must be a mapping")
    for index, update in enumerate(event.get("claim_updates", []) or []):
        if not isinstance(update, dict):
            errors.append(f"{label}.claim_updates[{index}] must be a mapping")
            continue
        validate_owner(
            update.get("owner_skill"),
            f"{label}.claim_updates[{index}].owner_skill",
            errors,
            required=require_owners,
        )
        if update.get("to_status") in CLAIM_EVIDENCE_STATUSES and not update.get("rationale"):
            errors.append(f"{label}.claim_updates[{index}].rationale is required")
    validate_decision(root, event.get("decision"), errors, f"{label}.decision")
    validate_next_action(root, event.get("next_action"), errors, f"{label}.next_action")


def validate_quest(root: Path, candidate_event: dict[str, Any] | None = None) -> list[str]:
    errors: list[str] = []
    quest_path = root / QUEST_FILE
    event_path = root / EVENT_LOG
    try:
        quest, normalization_warnings = normalize_quest(load_yaml(quest_path))
        errors.extend(normalization_warnings)
    except QuestError as exc:
        return [str(exc)]
    try:
        events = read_events(event_path)
    except QuestError as exc:
        errors.append(str(exc))
        events = []

    active_stage = quest.get("active_stage")
    if active_stage and active_stage not in KNOWN_OWNER_SKILLS:
        errors.append(f"active_stage is unknown: {active_stage}")

    canonical_status = str(status_file(root))
    first_read_values = [str(path) for path in (quest.get("first_read", []) or [])]
    if canonical_status not in first_read_values:
        errors.append(f"WARN first_read should include canonical quest status: {canonical_status}")
    if canonical_status != str(FALLBACK_STATUS_FILE) and str(FALLBACK_STATUS_FILE) in first_read_values:
        errors.append(
            f"WARN first_read uses noncanonical quest path {FALLBACK_STATUS_FILE}; prefer {canonical_status}"
        )

    for index, path in enumerate(quest.get("first_read", []) or []):
        validate_relative_path(root, path, f"first_read[{index}]", errors, must_exist=True)

    require_owners = owner_required(quest)
    validate_authoritative_artifacts(
        root,
        quest.get("authoritative_artifacts", {}),
        errors,
        require_owners=require_owners,
    )
    if is_legacy_quest(quest):
        validate_legacy_evidence(root, quest.get("evidence"), errors)
    branch_ids = validate_branches(root, quest.get("branches", []), errors)

    seen_claim_ids: set[str] = set()
    for index, claim in enumerate(quest.get("claims", []) or []):
        if not isinstance(claim, dict):
            errors.append(f"claims[{index}] must be a mapping")
            continue
        claim_id = claim.get("id")
        if require_owners and not claim_id:
            errors.append(f"claims[{index}].id is required")
        elif claim_id and not isinstance(claim_id, str):
            errors.append(f"claims[{index}].id must be a string")
        elif claim_id in seen_claim_ids:
            errors.append(f"duplicate claim id: {claim_id}")
        elif claim_id:
            seen_claim_ids.add(claim_id)
        validate_owner(
            claim.get("owner_skill"),
            f"claims[{index}].owner_skill",
            errors,
            required=require_owners,
        )
        branch_id = claim.get("branch_id")
        if branch_id and not isinstance(branch_id, str):
            errors.append(f"claims[{index}].branch_id must be a string")
        elif branch_id and branch_id not in branch_ids:
            errors.append(f"claims[{index}].branch_id is unknown: {branch_id}")
        status = str(claim.get("status", "")).lower()
        evidence_paths = claim.get("evidence_paths", []) or []
        if status in CLAIM_EVIDENCE_STATUSES and not evidence_paths:
            errors.append(f"claims[{index}] status {status} requires evidence_paths")
        for path in evidence_paths:
            validate_relative_path(root, path, f"claims[{index}].evidence_paths", errors, must_exist=True)

    validate_decision(root, quest.get("current_decision"), errors, "current_decision")
    validate_next_action(root, quest.get("next_action"), errors, "next_action")
    validate_board(quest.get("board"), errors)

    seen: set[str] = set()
    all_events = list(events)
    if candidate_event is not None:
        all_events.append(candidate_event)
    for index, event in enumerate(all_events):
        label = f"events[{index}]"
        validate_event(root, event, errors, label, require_owners=require_owners)
        event_id_value = event.get("event_id")
        if event_id_value:
            if event_id_value in seen:
                errors.append(f"duplicate event_id: {event_id_value}")
            seen.add(event_id_value)
    return errors


def status_markdown(quest: dict[str, Any], events: list[dict[str, Any]], errors: list[str]) -> str:
    current = quest.get("current_decision") if isinstance(quest.get("current_decision"), dict) else {}
    next_action = quest.get("next_action") if isinstance(quest.get("next_action"), dict) else {}
    claims = [claim for claim in quest.get("claims", []) or [] if isinstance(claim, dict)]
    active_claims = [claim for claim in claims if claim.get("status") in {"candidate", "supported"}]
    weak_claims = [claim for claim in claims if claim.get("status") in {"partial", "unsupported", "deferred"}]
    branches = [branch for branch in quest.get("branches", []) or [] if isinstance(branch, dict)]
    active_branches = [branch for branch in branches if branch.get("status") in {"active", "blocked"}]
    blockers = quest.get("blockers", []) or []
    board = quest.get("board") if isinstance(quest.get("board"), dict) else {}
    recent = events[-5:]
    hard_errors, warnings = split_warnings(errors)
    if hard_errors:
        validator = f"fail ({len(hard_errors)} issue{'s' if len(hard_errors) != 1 else ''})"
    elif warnings:
        validator = f"pass ({len(warnings)} warning{'s' if len(warnings) != 1 else ''})"
    else:
        validator = "pass"

    lines = [
        "# Quest Status",
        "",
        "## Current State",
        "",
        f"Status: {quest.get('status', 'unknown')}",
        "",
        f"Active stage: {quest.get('active_stage', 'unknown')}",
        "",
        f"Objective: {quest.get('objective', 'unknown')}",
        "",
        "## Current Decision",
        "",
    ]
    if current:
        lines.append(f"{current.get('verdict', current.get('id', 'unknown'))}: {current.get('rationale', 'No rationale.')}")
    else:
        lines.append("No current decision recorded.")

    lines.extend(["", "## Next Action", ""])
    if next_action:
        lines.extend(
            [
                f"Owner skill: {next_action.get('owner_skill', 'unknown')}",
                "",
                f"Action: {next_action.get('action', 'unknown')}",
                "",
                f"Acceptance gate: {next_action.get('acceptance_gate', 'unknown')}",
                "",
                f"Expected artifact: {next_action.get('expected_artifact', 'unknown')}",
            ]
        )
    else:
        lines.append("No next action recorded.")

    lines.extend(["", "## Blockers", ""])
    lines.extend(f"- {blocker}" for blocker in blockers) if blockers else lines.append("No blockers recorded.")

    lines.extend(["", "## Legacy Resume Board", ""])
    if board:
        lines.extend(
            [
                f"Current mainline: {board.get('current_mainline', 'unknown')}",
                "",
                f"Incumbent: {board.get('incumbent', 'unknown')}",
                "",
                f"Latest decisive result: {board.get('latest_decisive_result', 'unknown')}",
                "",
                f"Active blocker: {board.get('active_blocker', 'none')}",
                "",
                f"Budget class: {board.get('budget_class', 'unknown')}",
            ]
        )
        stale = board.get("stale_routes")
        if isinstance(stale, list) and stale:
            lines.extend(["", "Stale routes:"])
            lines.extend(f"- {route}" for route in stale)
        elif stale is not None and not isinstance(stale, list):
            lines.extend(["", "Stale routes:", "- Invalid non-list value; see Validator Issues."])
    else:
        lines.append("No legacy board recorded.")

    lines.extend(["", "## First-Read Files", ""])
    first_read = quest.get("first_read", []) or []
    lines.extend(f"- {path}" for path in first_read) if first_read else lines.append("No first-read files recorded.")
    lines.extend(["", "## Last Meaningful Change", ""])
    if recent:
        last = recent[-1]
        lines.append(f"{last.get('event_id', 'unknown')}: {last.get('summary', 'No summary.')}")
    else:
        lines.append("No events recorded yet.")

    lines.extend(["", "## Active Branches", ""])
    if active_branches:
        lines.extend(
            f"- {branch.get('id', 'unknown')} [{branch.get('status', 'unknown')}] — "
            f"{branch.get('owner_skill', 'unknown')}: {branch.get('objective', '')}"
            for branch in active_branches
        )
    else:
        lines.append("No active branches recorded.")

    lines.extend(["", "## Active Claims", ""])
    lines.extend(
        f"- {claim.get('id', 'unknown')}: {claim.get('text', '')} "
        f"[{claim.get('status', 'unknown')}; owner={claim.get('owner_skill', 'unknown')}]"
        for claim in active_claims
    ) if active_claims else lines.append("No active claims recorded.")

    lines.extend(["", "## Unsupported Or Partial Claims", ""])
    lines.extend(
        f"- {claim.get('id', 'unknown')}: {claim.get('text', '')} "
        f"[{claim.get('status', 'unknown')}; owner={claim.get('owner_skill', 'unknown')}]"
        for claim in weak_claims
    ) if weak_claims else lines.append("No unsupported or partial claims recorded.")

    evidence = quest.get("evidence", []) or []
    lines.extend(["", "## Legacy Evidence", ""])
    if isinstance(evidence, list) and evidence:
        for item in evidence:
            if isinstance(item, dict):
                lines.append(f"- {item.get('path', 'unknown')} [{item.get('state', 'unknown')}]")
            else:
                lines.append(f"- {item}")
    else:
        lines.append("No legacy evidence recorded.")

    lines.extend(["", "## Recent Milestones", ""])
    if recent:
        for event in recent:
            lines.append(f"- {event.get('event_id', 'unknown')} [{event.get('event_type', 'unknown')}]: {event.get('summary', '')}")
    else:
        lines.append("No events recorded yet.")

    lines.extend(["", "## Validator Result", "", validator])
    if errors:
        lines.extend(["", "## Validator Issues", ""])
        lines.extend(f"- {error}" for error in errors)
    lines.append("")
    return "\n".join(lines)


def cmd_status(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    quest, _ = normalize_quest(load_yaml(root / QUEST_FILE))
    events = read_events(root / EVENT_LOG)
    errors = validate_quest(root)
    print(status_markdown(quest, events, errors))
    hard, _ = split_warnings(errors)
    return 0 if not hard else 1


def split_warnings(errors: list[str]) -> tuple[list[str], list[str]]:
    hard = [e for e in errors if not e.startswith("WARN ")]
    warnings = [e for e in errors if e.startswith("WARN ")]
    return hard, warnings


def cmd_validate(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    errors = validate_quest(root)
    hard, warnings = split_warnings(errors)
    for warning in warnings:
        print(f"WARN {warning.removeprefix('WARN ')}")
    if hard:
        for error in hard:
            print(f"FAIL {error}")
        return 1
    print("OK")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Inspect local research quest state without writes.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    status = subparsers.add_parser("status", help="Print quest status projection")
    status.add_argument("--root", required=True, help="Research project root")
    status.set_defaults(func=cmd_status)

    validate = subparsers.add_parser("validate", help="Validate quest files without mutation")
    validate.add_argument("--root", required=True, help="Research project root")
    validate.set_defaults(func=cmd_validate)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except QuestError as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
