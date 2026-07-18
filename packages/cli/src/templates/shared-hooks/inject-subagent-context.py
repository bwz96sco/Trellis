#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Multi-Platform Sub-Agent Context Injection Hook

Injects task-specific context when sub-agents (implement, check, research) are spawned.

Core Design Philosophy:
- Hook is responsible for injecting all context, subagent works autonomously with complete info
- Each agent has a dedicated jsonl file defining its context
- No resume needed, no segmentation, behavior controlled by code not prompt

Trigger: PreToolUse (before Task tool call)

Context Source: Trellis active task resolver points to task directory
- implement.jsonl - Implement agent dedicated context
- check.jsonl     - Check agent dedicated context
- prd.md          - Requirements document
- design.md       - Technical design for complex tasks
- implement.md    - Execution plan for complex tasks
- codex-review-output.txt - Code Review results
"""
from __future__ import annotations

# IMPORTANT: Suppress all warnings FIRST
import warnings
warnings.filterwarnings("ignore")

import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path, PurePosixPath
from typing import Any

# IMPORTANT: Force stdout to use UTF-8 on Windows
# This fixes UnicodeEncodeError when outputting non-ASCII characters
if sys.platform.startswith("win"):
    import io as _io
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    elif hasattr(sys.stdout, "detach"):
        sys.stdout = _io.TextIOWrapper(sys.stdout.detach(), encoding="utf-8", errors="replace")  # type: ignore[union-attr]


# =============================================================================
# Path Constants (change here to rename directories)
# =============================================================================

DIR_WORKFLOW = ".trellis"
DIR_SPEC = "spec"
FILE_TASK_JSON = "task.json"

# =============================================================================
# Subagent Constants (change here to rename subagent types)
# =============================================================================

AGENT_IMPLEMENT = "trellis-implement"
AGENT_CHECK = "trellis-check"
AGENT_RESEARCH = "trellis-research"
AGENT_RESEARCH_WORKER = "trellis-research-worker"

_RESEARCH_OWNER_BY_STAGE = {
    "setup": "trellis-research-setup",
    "framing": "trellis-research-quest",
    "literature": "trellis-research-literature",
    "ideation": "trellis-research-ideation",
    "experiment": "trellis-research-experiment",
    "computation": "trellis-research-computation",
    "theory": "trellis-research-theory",
    "audit": "trellis-research-audit",
    "writing": "trellis-research-writing",
}
_RESEARCH_POINTER_RE = re.compile(
    r"^Research dispatch: (\.trellis/research/dispatches/(dsp_[0-9a-f-]+)/request\.json)$"
)
_RESEARCH_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# Agents that require a task directory
AGENTS_REQUIRE_TASK = (AGENT_IMPLEMENT, AGENT_CHECK)
# All supported agents
AGENTS_ALL = (AGENT_IMPLEMENT, AGENT_CHECK, AGENT_RESEARCH)


def find_repo_root(start_path: str) -> str | None:
    """
    Find git repo root from start_path upwards

    Returns:
        Repo root path, or None if not found
    """
    current = Path(start_path).resolve()
    while current != current.parent:
        if (current / ".git").exists():
            return str(current)
        current = current.parent
    return None


def _detect_platform(input_data: dict) -> str | None:
    if isinstance(input_data.get("cursor_version"), str):
        return "cursor"
    env_map = {
        "ZCODE_PROJECT_DIR": "zcode",
        "CLAUDE_PROJECT_DIR": "claude",
        "CURSOR_PROJECT_DIR": "cursor",
        "CODEBUDDY_PROJECT_DIR": "codebuddy",
        "FACTORY_PROJECT_DIR": "droid",
        "GEMINI_PROJECT_DIR": "gemini",
        "QODER_PROJECT_DIR": "qoder",
        "KIRO_PROJECT_DIR": "kiro",
        "COPILOT_PROJECT_DIR": "copilot",
    }
    for env_name, platform in env_map.items():
        if os.environ.get(env_name):
            return platform
    script_parts = set(Path(sys.argv[0]).parts)
    if ".claude" in script_parts:
        return "claude"
    if ".cursor" in script_parts:
        return "cursor"
    if ".gemini" in script_parts:
        return "gemini"
    if ".qoder" in script_parts:
        return "qoder"
    if ".codebuddy" in script_parts:
        return "codebuddy"
    if ".factory" in script_parts:
        return "droid"
    if ".kiro" in script_parts:
        return "kiro"
    if ".zcode" in script_parts:
        return "zcode"
    return None


def get_current_task(repo_root: str, input_data: dict) -> str | None:
    """Resolve current task directory through the unified active task resolver."""
    scripts_dir = Path(repo_root) / DIR_WORKFLOW / "scripts"
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))
    try:
        from common.active_task import resolve_active_task  # type: ignore[import-not-found]
    except Exception:
        return None

    active = resolve_active_task(
        Path(repo_root),
        input_data,
        platform=_detect_platform(input_data),
    )
    return active.task_path


def read_file_content(base_path: str, file_path: str) -> str | None:
    """Read file content, return None if file doesn't exist"""
    full_path = os.path.join(base_path, file_path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            return None
    return None


def read_directory_contents(
    base_path: str, dir_path: str, max_files: int = 20
) -> list[tuple[str, str]]:
    """
    Read all .md files in a directory

    Args:
        base_path: Base path (usually repo_root)
        dir_path: Directory relative path
        max_files: Max files to read (prevent huge directories)

    Returns:
        [(file_path, content), ...]
    """
    full_path = os.path.join(base_path, dir_path)
    if not os.path.exists(full_path) or not os.path.isdir(full_path):
        return []

    results = []
    try:
        # Only read .md files, sorted by filename
        md_files = sorted(
            [
                f
                for f in os.listdir(full_path)
                if f.endswith(".md") and os.path.isfile(os.path.join(full_path, f))
            ]
        )

        for filename in md_files[:max_files]:
            file_full_path = os.path.join(full_path, filename)
            relative_path = os.path.join(dir_path, filename)
            try:
                with open(file_full_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    results.append((relative_path, content))
            except Exception:
                continue
    except Exception:
        pass

    return results


def read_jsonl_entries(base_path: str, jsonl_path: str) -> list[tuple[str, str]]:
    """
    Read all file/directory contents referenced in jsonl file

    Schema:
        {"file": "path/to/file.md", "reason": "..."}
        {"file": "path/to/dir/", "type": "directory", "reason": "..."}
        {"_example": "..."}          # seed row — skipped (no `file` field)

    Rows without a ``file`` field (e.g. the self-describing seed line written
    by ``task.py create`` before the agent has curated entries) are skipped
    silently. If the resulting entry list is empty, a stderr warning is
    emitted so the operator can debug missing context.

    Returns:
        [(path, content), ...]
    """
    full_path = os.path.join(base_path, jsonl_path)
    if not os.path.exists(full_path):
        print(
            f"[inject-subagent-context] WARN: {jsonl_path} not found — "
            f"sub-agent will receive only task artifacts",
            file=sys.stderr,
        )
        return []

    results = []
    saw_real_entry = False
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    item = json.loads(line)
                    file_path = item.get("file") or item.get("path")
                    entry_type = item.get("type", "file")

                    if not file_path:
                        # Seed / comment row — skip silently
                        continue

                    saw_real_entry = True
                    if entry_type == "directory":
                        # Read all .md files in directory
                        dir_contents = read_directory_contents(base_path, file_path)
                        results.extend(dir_contents)
                    else:
                        # Read single file
                        content = read_file_content(base_path, file_path)
                        if content:
                            results.append((file_path, content))
                except json.JSONDecodeError:
                    continue
    except Exception:
        pass

    if not saw_real_entry:
        print(
            f"[inject-subagent-context] WARN: {jsonl_path} has no curated "
            f"entries (only seed / empty) — sub-agent will receive only "
            f"task artifacts. See workflow.md planning artifact guidance.",
            file=sys.stderr,
        )

    return results




def get_agent_context(repo_root: str, task_dir: str, agent_type: str) -> str:
    """
    Get context from {agent_type}.jsonl for the specified agent.
    Only reads implement.jsonl or check.jsonl (the two JSONL files the task system creates).
    """
    context_parts = []

    agent_jsonl = f"{task_dir}/{agent_type}.jsonl"
    for file_path, content in read_jsonl_entries(repo_root, agent_jsonl):
        context_parts.append(f"=== {file_path} ===\n{content}")

    return "\n\n".join(context_parts)


def get_implement_context(repo_root: str, task_dir: str) -> str:
    """
    Complete context for Implement Agent

    Read order:
    1. All files in implement.jsonl (spec/research manifests)
    2. prd.md (requirements)
    3. design.md if present (technical design)
    4. implement.md if present (execution plan)
    """
    context_parts = []

    # 1. Read implement.jsonl
    base_context = get_agent_context(repo_root, task_dir, "implement")
    if base_context:
        context_parts.append(base_context)

    # 2. Requirements document
    prd_content = read_file_content(repo_root, f"{task_dir}/prd.md")
    if prd_content:
        context_parts.append(f"=== {task_dir}/prd.md (Requirements) ===\n{prd_content}")

    # 3. Technical design for complex tasks
    design_content = read_file_content(repo_root, f"{task_dir}/design.md")
    if design_content:
        context_parts.append(
            f"=== {task_dir}/design.md (Technical Design) ===\n{design_content}"
        )

    # 4. Execution plan for complex tasks
    implement_plan_content = read_file_content(repo_root, f"{task_dir}/implement.md")
    if implement_plan_content:
        context_parts.append(
            f"=== {task_dir}/implement.md (Execution Plan) ===\n{implement_plan_content}"
        )

    return "\n\n".join(context_parts)


def get_check_context(repo_root: str, task_dir: str) -> str:
    """
    Context for Check Agent: check.jsonl + task artifacts.
    """
    context_parts = []

    for file_path, content in read_jsonl_entries(repo_root, f"{task_dir}/check.jsonl"):
        context_parts.append(f"=== {file_path} ===\n{content}")

    prd_content = read_file_content(repo_root, f"{task_dir}/prd.md")
    if prd_content:
        context_parts.append(f"=== {task_dir}/prd.md (Requirements) ===\n{prd_content}")

    design_content = read_file_content(repo_root, f"{task_dir}/design.md")
    if design_content:
        context_parts.append(
            f"=== {task_dir}/design.md (Technical Design) ===\n{design_content}"
        )

    implement_plan_content = read_file_content(repo_root, f"{task_dir}/implement.md")
    if implement_plan_content:
        context_parts.append(
            f"=== {task_dir}/implement.md (Execution Plan) ===\n{implement_plan_content}"
        )

    return "\n\n".join(context_parts)


def get_finish_context(repo_root: str, task_dir: str) -> str:
    """
    Context for Finish phase: reuses check.jsonl + prd.md
    (Finish is a final check, same context source.)
    """
    return get_check_context(repo_root, task_dir)



def build_implement_prompt(original_prompt: str, context: str) -> str:
    """Build complete prompt for Implement"""
    return f"""<!-- trellis-hook-injected -->
# Implement Agent Task

You are the Implement Agent in the Multi-Agent Pipeline.

## Your Context

All the information you need has been prepared for you:

{context}

---

## Your Task

{original_prompt}

---

## Workflow

1. **Understand specs** - All dev specs are injected above, understand them
    2. **Understand task artifacts** - Read requirements, technical design if present, and execution plan if present
    3. **Implement feature** - Implement following specs and task artifacts
4. **Self-check** - Ensure code quality against check specs

## Important Constraints

- Do NOT execute git commit, only code modifications
- Follow all dev specs injected above
- Report list of modified/created files when done"""


def build_check_prompt(original_prompt: str, context: str) -> str:
    """Build complete prompt for Check"""
    return f"""<!-- trellis-hook-injected -->
# Check Agent Task

You are the Check Agent in the Multi-Agent Pipeline (code and cross-layer checker).

## Your Context

All check specs and dev specs you need:

{context}

---

## Your Task

{original_prompt}

---

## Workflow

1. **Get changes** - Run `git diff --name-only` and `git diff` to get code changes
2. **Check against specs** - Check item by item against specs above
3. **Self-fix** - Fix issues directly, don't just report
4. **Run verification** - Run project's lint and typecheck commands

## Important Constraints

- Fix issues yourself, don't just report
- Must execute complete checklist in check specs
- Pay special attention to impact radius analysis (L1-L5)"""


def build_finish_prompt(original_prompt: str, context: str) -> str:
    """Build complete prompt for Finish (final check before PR)"""
    return f"""<!-- trellis-hook-injected -->
# Finish Agent Task

You are performing the final check before creating a PR.

## Your Context

Finish checklist and requirements:

{context}

---

## Your Task

{original_prompt}

---

## Workflow

1. **Review changes** - Run `git diff --name-only` to see all changed files
	2. **Verify task artifacts** - Check requirements in prd.md and, when present, design.md / implement.md
3. **Spec sync** - Analyze whether changes introduce new patterns, contracts, or conventions
   - If new pattern/convention found: read target spec file → update it → update index.md if needed
   - If infra/cross-layer change: follow the 7-section mandatory template from update-spec.md
   - If pure code fix with no new patterns: skip this step
4. **Run final checks** - Execute lint and typecheck
5. **Confirm ready** - Ensure code is ready for PR

## Important Constraints

- You MAY update spec files when gaps are detected (use update-spec.md as guide)
- MUST read the target spec file BEFORE editing (avoid duplicating existing content)
- Do NOT update specs for trivial changes (typos, formatting, obvious fixes)
- If critical CODE issues found, report them clearly (fix specs, not code)
- Verify all acceptance criteria in prd.md are met
- Verify design.md and implement.md constraints when those files are present"""



def get_research_context(repo_root: str, task_dir: str | None) -> str:
    """
    Context for Research Agent — project structure overview for spec directories.

    `task_dir` kept for signature parity with get_implement_context / get_check_context
    so the dispatcher can call them uniformly.
    """
    _ = task_dir
    context_parts = []

    # 1. Project structure overview (dynamically discover spec directories)
    spec_path = f"{DIR_WORKFLOW}/{DIR_SPEC}"
    spec_root = Path(repo_root) / DIR_WORKFLOW / DIR_SPEC

    # Build spec tree dynamically
    tree_lines = [f"{spec_path}/"]
    if spec_root.is_dir():
        pkg_dirs = sorted(d for d in spec_root.iterdir() if d.is_dir())
        for i, pkg_dir in enumerate(pkg_dirs):
            is_last = i == len(pkg_dirs) - 1
            prefix = "└── " if is_last else "├── "
            layers = sorted(d.name for d in pkg_dir.iterdir() if d.is_dir())
            layer_info = f" ({', '.join(layers)})" if layers else ""
            tree_lines.append(f"{prefix}{pkg_dir.name}/{layer_info}")

    spec_tree = "\n".join(tree_lines)

    project_structure = f"""## Project Spec Directory Structure

```
{spec_tree}
```

To get structured package info, run: `python3 ./{DIR_WORKFLOW}/scripts/get_context.py --mode packages`

## Search Tips

- Spec files: `{spec_path}/**/*.md`
- Code search: Use Glob and Grep tools
- Tech solutions: Use mcp__exa__web_search_exa or mcp__exa__get_code_context_exa"""

    context_parts.append(project_structure)

    return "\n\n".join(context_parts)


def build_research_prompt(original_prompt: str, context: str) -> str:
    """Build complete prompt for Research"""
    return f"""# Research Agent Task

You are the Research Agent in the Multi-Agent Pipeline (search researcher).

## Core Principle

**You do one thing: find and explain information.**

You are a documenter, not a reviewer.

## Project Info

{context}

---

## Your Task

{original_prompt}

---

## Workflow

1. **Understand query** - Determine search type (internal/external) and scope
2. **Plan search** - List search steps for complex queries
3. **Execute search** - Execute multiple independent searches in parallel
4. **Organize results** - Output structured report

## Search Tools

| Tool | Purpose |
|------|---------|
| Glob | Search by filename pattern |
| Grep | Search by content |
| Read | Read file content |
| mcp__exa__web_search_exa | External web search |
| mcp__exa__get_code_context_exa | External code/doc search |

## Strict Boundaries

**Only allowed**: Describe what exists, where it is, how it works

**Forbidden** (unless explicitly asked):
- Suggest improvements
- Criticize implementation
- Recommend refactoring
- Modify any files

## Report Format

Provide structured search results including:
- List of files found (with paths)
- Code pattern analysis (if applicable)
- Related spec documents
- External references (if any)"""


def _research_id(value: Any, prefix: str, label: str) -> str:
    if not isinstance(value, str) or not value.startswith(f"{prefix}_"):
        raise ValueError(f"{label} must be a {prefix}_ prefixed UUID")
    if not _RESEARCH_UUID_RE.fullmatch(value[len(prefix) + 1 :]):
        raise ValueError(f"{label} must be a {prefix}_ prefixed UUID")
    return value


def _research_nonempty(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be a non-empty string")
    if len(value) > 16384:
        raise ValueError(f"{label} exceeds the hook context limit")
    return value


def _research_string_list(value: Any, label: str) -> list[str]:
    if not isinstance(value, list):
        raise ValueError(f"{label} must be an array")
    if len(value) > 128:
        raise ValueError(f"{label} exceeds the hook context limit")
    return [
        _research_nonempty(entry, f"{label}[{index}]")
        for index, entry in enumerate(value)
    ]


def _portable_research_path(
    value: Any, label: str, *, allow_parent: bool = False
) -> str:
    candidate = _research_nonempty(value, label)
    if (
        "\0" in candidate
        or "\\" in candidate
        or candidate.startswith("/")
        or re.match(r"^[A-Za-z]:", candidate)
        or any(segment == "" for segment in candidate.split("/"))
    ):
        raise ValueError(f"{label} must be a portable relative path")
    normalized = str(PurePosixPath(candidate))
    if normalized in ("", "."):
        raise ValueError(f"{label} must identify a path")
    if not allow_parent and (normalized == ".." or normalized.startswith("../")):
        raise ValueError(f"{label} must not escape its root")
    return normalized


def _research_timestamp(value: Any, label: str) -> str:
    candidate = _research_nonempty(value, label)
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z", candidate):
        raise ValueError(f"{label} must be an ISO 8601 UTC timestamp")
    try:
        datetime.fromisoformat(candidate.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError(f"{label} must be an ISO 8601 UTC timestamp") from error
    return candidate


def _research_object(
    value: Any,
    label: str,
    allowed: set[str],
    required: set[str] | None = None,
) -> dict:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be a JSON object")
    unknown = set(value) - allowed
    if unknown:
        raise ValueError(f"{label}.{sorted(unknown)[0]} is not supported")
    missing = (required if required is not None else allowed) - set(value)
    if missing:
        raise ValueError(f"{label}.{sorted(missing)[0]} is required")
    return value


def _read_research_object(path: Path, label: str) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ValueError(f"{label} is missing") from error
    except (json.JSONDecodeError, OSError, UnicodeDecodeError) as error:
        raise ValueError(f"{label} is malformed") from error
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be a JSON object")
    return value


def _research_ledger_head(control_root: Path) -> int:
    ledger_path = control_root / ".trellis" / "research" / "events.jsonl"
    if not ledger_path.is_file():
        return 0
    try:
        lines = ledger_path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError) as error:
        raise ValueError("research ledger is unreadable") from error
    expected = 1
    for line in lines:
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError("research ledger contains malformed JSON") from error
        seq = event.get("seq") if isinstance(event, dict) else None
        if isinstance(seq, bool) or not isinstance(seq, int) or seq != expected:
            raise ValueError("research ledger sequence is not contiguous")
        expected += 1
    return expected - 1


def _read_research_projection(path: Path, label: str, head: int) -> dict:
    envelope = _read_research_object(path, label)
    _research_object(
        envelope,
        label,
        {"schemaVersion", "projectedThroughSeq", "updatedAt", "data"},
    )
    if envelope.get("schemaVersion") != 1:
        raise ValueError(f"{label}.schemaVersion must be 1")
    if envelope.get("projectedThroughSeq") != head:
        raise ValueError(f"{label} is not projected through ledger head {head}")
    _research_timestamp(envelope.get("updatedAt"), f"{label}.updatedAt")
    data = envelope.get("data")
    if not isinstance(data, dict):
        raise ValueError(f"{label}.data must be a JSON object")
    return data


def _is_research_control_plane(candidate: Path) -> bool:
    trellis_dir = candidate / ".trellis"
    if (trellis_dir / "research" / "events.jsonl").exists():
        return True
    selection_path = trellis_dir / ".workflow.json"
    try:
        selection = json.loads(selection_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError, UnicodeDecodeError):
        return False
    return selection == {"schemaVersion": 1, "id": "research", "source": "bundled"}


def _find_research_control_root(input_data: dict, cwd: str) -> Path | None:
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
                if (current / ".trellis").is_dir():
                    if _is_research_control_plane(current):
                        return current
                    if fallback is None:
                        fallback = current
            if current == current.parent:
                break
            current = current.parent
    return fallback


def _resolve_bounded_path(
    repository_root: Path,
    portable_path: str,
    label: str,
    *, must_exist: bool,
) -> Path:
    try:
        resolved = (repository_root / portable_path).resolve(strict=must_exist)
    except (FileNotFoundError, OSError) as error:
        raise ValueError(f"{label} does not resolve") from error
    try:
        resolved.relative_to(repository_root)
    except ValueError as error:
        raise ValueError(f"{label} escapes the target repository") from error
    return resolved


def _parse_dispatch_request(request: dict, dispatch_id: str) -> dict:
    allowed = {
        "id",
        "questId",
        "campaignId",
        "runId",
        "repositoryId",
        "ownerSkill",
        "provider",
        "objective",
        "acceptanceCriteria",
        "context",
        "allowedWritePaths",
        "expectedOutputs",
        "checks",
        "taskRef",
        "createdAt",
    }
    required = allowed - {"campaignId", "provider", "taskRef"}
    _research_object(request, "dispatch", allowed, required)
    if _research_id(request.get("id"), "dsp", "dispatch.id") != dispatch_id:
        raise ValueError("dispatch.id does not match the dispatch path")
    _research_id(request.get("questId"), "qst", "dispatch.questId")
    _research_id(request.get("runId"), "run", "dispatch.runId")
    _research_id(request.get("repositoryId"), "rep", "dispatch.repositoryId")
    if "campaignId" in request:
        _research_id(request.get("campaignId"), "cmp", "dispatch.campaignId")
    owner = _research_nonempty(request.get("ownerSkill"), "dispatch.ownerSkill")
    if owner not in _RESEARCH_OWNER_BY_STAGE.values():
        raise ValueError("dispatch.ownerSkill is not a known research stage owner")
    if "provider" in request:
        _research_nonempty(request.get("provider"), "dispatch.provider")
    _research_nonempty(request.get("objective"), "dispatch.objective")
    for key in ("acceptanceCriteria", "allowedWritePaths", "expectedOutputs", "checks"):
        request[key] = _research_string_list(request.get(key), f"dispatch.{key}")
    request["allowedWritePaths"] = [
        _portable_research_path(entry, f"dispatch.allowedWritePaths[{index}]")
        for index, entry in enumerate(request["allowedWritePaths"])
    ]
    request["expectedOutputs"] = [
        _portable_research_path(entry, f"dispatch.expectedOutputs[{index}]")
        for index, entry in enumerate(request["expectedOutputs"])
    ]
    context = request.get("context")
    if not isinstance(context, list) or len(context) > 128:
        raise ValueError("dispatch.context must be a bounded array")
    parsed_context: list[dict] = []
    for index, entry in enumerate(context):
        value = _research_object(
            entry,
            f"dispatch.context[{index}]",
            {"artifact", "text"},
            set(),
        )
        if ("artifact" in value) == ("text" in value):
            raise ValueError(
                f"dispatch.context[{index}] must contain exactly one of artifact or text"
            )
        if "text" in value:
            parsed_context.append(
                {"text": _research_nonempty(value["text"], f"dispatch.context[{index}].text")}
            )
            continue
        artifact = _research_object(
            value["artifact"],
            f"dispatch.context[{index}].artifact",
            {"id", "repositoryId", "path", "kind", "revision", "sha256", "mediaType"},
            {"id", "repositoryId", "path"},
        )
        _research_id(artifact.get("id"), "art", f"dispatch.context[{index}].artifact.id")
        _research_id(
            artifact.get("repositoryId"),
            "rep",
            f"dispatch.context[{index}].artifact.repositoryId",
        )
        artifact["path"] = _portable_research_path(
            artifact.get("path"), f"dispatch.context[{index}].artifact.path"
        )
        for optional in ("kind", "revision", "mediaType"):
            if optional in artifact:
                _research_nonempty(
                    artifact[optional], f"dispatch.context[{index}].artifact.{optional}"
                )
        if "sha256" in artifact:
            digest = _research_nonempty(
                artifact["sha256"], f"dispatch.context[{index}].artifact.sha256"
            ).lower()
            if not re.fullmatch(r"[0-9a-f]{64}", digest):
                raise ValueError(
                    f"dispatch.context[{index}].artifact.sha256 must be a hexadecimal digest"
                )
            artifact["sha256"] = digest
        parsed_context.append({"artifact": artifact})
    request["context"] = parsed_context
    if "taskRef" in request:
        request["taskRef"] = _portable_research_path(
            request["taskRef"], "dispatch.taskRef"
        )
    _research_timestamp(request.get("createdAt"), "dispatch.createdAt")
    return request


def _validate_dispatch_hierarchy(
    control_root: Path, request: dict, head: int
) -> tuple[dict, dict, dict, dict]:
    quest_id = request["questId"]
    quest = _read_research_projection(
        control_root / ".trellis" / "research" / "quests" / quest_id / "quest.json",
        "Quest projection",
        head,
    )
    _research_object(
        quest,
        "quest",
        {
            "id",
            "title",
            "description",
            "status",
            "stage",
            "repositoryIds",
            "artifactRefs",
            "createdAt",
            "updatedAt",
        },
    )
    _research_id(quest.get("id"), "qst", "quest.id")
    _research_nonempty(quest.get("title"), "quest.title")
    if not isinstance(quest.get("description"), str):
        raise ValueError("quest.description must be a string")
    _research_timestamp(quest.get("createdAt"), "quest.createdAt")
    _research_timestamp(quest.get("updatedAt"), "quest.updatedAt")
    if quest["id"] != quest_id:
        raise ValueError("Quest projection ID does not match dispatch.questId")
    if quest.get("status") != "active":
        raise ValueError("dispatch Quest must be active")
    stage = quest.get("stage")
    if not isinstance(stage, str):
        raise ValueError("quest.stage must be a string")
    expected_owner = _RESEARCH_OWNER_BY_STAGE.get(stage)
    if expected_owner is None:
        raise ValueError("dispatch Quest stage has no active stage owner")
    if request["ownerSkill"] != expected_owner:
        raise ValueError("dispatch owner skill does not own the Quest stage")
    repository_ids = quest.get("repositoryIds")
    if not isinstance(repository_ids, list):
        raise ValueError("quest.repositoryIds must be an array")
    for index, repository_id in enumerate(repository_ids):
        _research_id(repository_id, "rep", f"quest.repositoryIds[{index}]")
    if request["repositoryId"] not in repository_ids:
        raise ValueError("dispatch repository is not registered on the Quest")
    if not isinstance(quest.get("artifactRefs"), list):
        raise ValueError("quest.artifactRefs must be an array")

    run_id = request["runId"]
    run = _read_research_projection(
        control_root / ".trellis" / "research" / "runs" / run_id / "run.json",
        "Run projection",
        head,
    )
    _research_object(
        run,
        "run",
        {
            "id",
            "campaignId",
            "title",
            "status",
            "dispatchId",
            "resultId",
            "invalidationReason",
            "createdAt",
            "updatedAt",
        },
        {"id", "campaignId", "title", "status", "createdAt", "updatedAt"},
    )
    if _research_id(run.get("id"), "run", "run.id") != run_id:
        raise ValueError("Run projection ID does not match dispatch.runId")
    _research_nonempty(run.get("title"), "run.title")
    if run.get("status") not in {"planned", "running"}:
        raise ValueError("dispatch Run must be planned or running")
    _research_timestamp(run.get("createdAt"), "run.createdAt")
    _research_timestamp(run.get("updatedAt"), "run.updatedAt")
    campaign_id = _research_id(run.get("campaignId"), "cmp", "run.campaignId")
    if request.get("campaignId") is not None and request["campaignId"] != campaign_id:
        raise ValueError("dispatch.campaignId does not match the Run campaign")
    if run.get("dispatchId") is not None and run.get("dispatchId") != request["id"]:
        raise ValueError("Run dispatchId does not match dispatch.id")

    campaign = _read_research_projection(
        control_root
        / ".trellis"
        / "research"
        / "campaigns"
        / campaign_id
        / "campaign.json",
        "Campaign projection",
        head,
    )
    _research_object(
        campaign,
        "campaign",
        {
            "id",
            "questId",
            "title",
            "status",
            "protocolDigest",
            "runIds",
            "createdAt",
            "updatedAt",
        },
    )
    if _research_id(campaign.get("id"), "cmp", "campaign.id") != campaign_id:
        raise ValueError("Campaign projection ID does not match the Run campaign")
    _research_nonempty(campaign.get("title"), "campaign.title")
    _research_nonempty(campaign.get("protocolDigest"), "campaign.protocolDigest")
    if campaign.get("status") not in {
        "draft",
        "frozen",
        "running",
        "blocked",
        "completed",
        "abandoned",
    }:
        raise ValueError("campaign.status is invalid")
    _research_timestamp(campaign.get("createdAt"), "campaign.createdAt")
    _research_timestamp(campaign.get("updatedAt"), "campaign.updatedAt")
    _research_id(campaign.get("questId"), "qst", "campaign.questId")
    if campaign.get("questId") != quest_id:
        raise ValueError("Campaign Quest does not match dispatch.questId")
    run_ids = campaign.get("runIds")
    if not isinstance(run_ids, list):
        raise ValueError("campaign.runIds must be an array")
    for index, campaign_run_id in enumerate(run_ids):
        _research_id(campaign_run_id, "run", f"campaign.runIds[{index}]")
    if run_id not in run_ids:
        raise ValueError("Campaign does not contain dispatch.runId")

    repository_projection = _read_research_projection(
        control_root / ".trellis" / "research" / "repositories.json",
        "Repository projection",
        head,
    )
    _research_object(
        repository_projection,
        "repository projection data",
        {"repositories", "artifacts"},
    )
    repositories = repository_projection.get("repositories")
    if not isinstance(repositories, list):
        raise ValueError("repository projection data.repositories must be an array")
    matches = [
        item
        for item in repositories
        if isinstance(item, dict) and item.get("id") == request["repositoryId"]
    ]
    if len(matches) != 1:
        raise ValueError("dispatch repository is missing or duplicated")
    repository = _research_object(
        matches[0],
        "repository",
        {
            "id",
            "name",
            "kind",
            "locator",
            "expectedRemote",
            "defaultBranch",
            "capabilities",
            "createdAt",
            "updatedAt",
        },
        {"id", "name", "kind", "locator", "capabilities", "createdAt", "updatedAt"},
    )
    _research_id(repository.get("id"), "rep", "repository.id")
    _research_nonempty(repository.get("name"), "repository.name")
    if repository.get("kind") not in {"code", "paper", "notes", "data", "other"}:
        raise ValueError("repository.kind is invalid")
    capabilities = _research_object(
        repository.get("capabilities"),
        "repository.capabilities",
        {"hasTrellis"},
    )
    if not isinstance(capabilities.get("hasTrellis"), bool):
        raise ValueError("repository.capabilities.hasTrellis must be a boolean")
    _research_timestamp(repository.get("createdAt"), "repository.createdAt")
    _research_timestamp(repository.get("updatedAt"), "repository.updatedAt")
    if "defaultBranch" in repository:
        _research_nonempty(repository["defaultBranch"], "repository.defaultBranch")
    return quest, campaign, run, repository


def _resolve_dispatch_repository(
    control_root: Path, repository: dict, repository_id: str
) -> Path:
    binding_path = (
        control_root / ".trellis" / ".runtime" / "research" / "repo-bindings.json"
    )
    binding: str | None = None
    if binding_path.exists():
        binding_data = _read_research_object(binding_path, "repository bindings")
        _research_object(
            binding_data,
            "repository bindings",
            {"schemaVersion", "bindings"},
        )
        if binding_data.get("schemaVersion") != 1:
            raise ValueError("repository bindings.schemaVersion must be 1")
        bindings = binding_data.get("bindings")
        if not isinstance(bindings, dict):
            raise ValueError("repository bindings.bindings must be an object")
        for key, value in bindings.items():
            _research_id(key, "rep", "repository binding key")
            if not isinstance(value, str) or not Path(value).is_absolute():
                raise ValueError("repository binding values must be absolute paths")
        binding = bindings.get(repository_id)

    if binding is not None:
        candidate = Path(binding)
    else:
        locator = _portable_research_path(
            repository.get("locator"), "repository.locator", allow_parent=True
        )
        candidate = control_root.joinpath(*locator.split("/"))
    try:
        resolved = candidate.resolve(strict=True)
    except (FileNotFoundError, OSError) as error:
        raise ValueError("target repository cannot be resolved") from error
    if not resolved.is_dir():
        raise ValueError("target repository must resolve to a directory")

    expected_remote = repository.get("expectedRemote")
    if expected_remote is not None:
        expected = _research_nonempty(expected_remote, "repository.expectedRemote")
        try:
            result = subprocess.run(
                ["git", "config", "--get", "remote.origin.url"],
                cwd=resolved,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=3,
            )
        except (FileNotFoundError, PermissionError, subprocess.TimeoutExpired) as error:
            raise ValueError("target repository remote cannot be verified") from error
        if result.returncode != 0 or result.stdout.strip() != expected:
            raise ValueError("target repository remote does not match expectedRemote")
    return resolved


def _validate_dispatch_paths(
    control_root: Path, repository_root: Path, request: dict
) -> list[dict]:
    resolved_context: list[dict] = []
    for index, entry in enumerate(request["context"]):
        if "text" in entry:
            resolved_context.append(entry)
            continue
        artifact = entry["artifact"]
        if artifact["repositoryId"] != request["repositoryId"]:
            raise ValueError(
                f"dispatch.context[{index}] artifact belongs to another repository"
            )
        artifact_path = _resolve_bounded_path(
            repository_root,
            artifact["path"],
            f"dispatch.context[{index}] artifact",
            must_exist=True,
        )
        if not artifact_path.is_file():
            raise ValueError(f"dispatch.context[{index}] artifact must be a file")
        if "sha256" in artifact:
            digest = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
            if digest != artifact["sha256"]:
                raise ValueError(f"dispatch.context[{index}] artifact digest mismatch")
        if "revision" in artifact:
            try:
                result = subprocess.run(
                    ["git", "rev-parse", "--verify", "HEAD"],
                    cwd=repository_root,
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    timeout=3,
                )
            except (FileNotFoundError, PermissionError, subprocess.TimeoutExpired) as error:
                raise ValueError(
                    f"dispatch.context[{index}] artifact revision cannot be verified"
                ) from error
            if result.returncode != 0:
                raise ValueError(
                    f"dispatch.context[{index}] artifact revision cannot be verified"
                )
            if result.stdout.strip() != artifact["revision"]:
                raise ValueError(
                    f"dispatch.context[{index}] artifact revision does not match current HEAD"
                )
        resolved_context.append(
            {"artifact": artifact, "resolvedPath": str(artifact_path)}
        )

    for index, write_path in enumerate(request["allowedWritePaths"]):
        _resolve_bounded_path(
            repository_root,
            write_path,
            f"dispatch.allowedWritePaths[{index}]",
            must_exist=False,
        )
    for index, output_path in enumerate(request["expectedOutputs"]):
        _resolve_bounded_path(
            repository_root,
            output_path,
            f"dispatch.expectedOutputs[{index}]",
            must_exist=False,
        )

    task_ref = request.get("taskRef")
    if task_ref is not None:
        if not task_ref.startswith(".trellis/tasks/"):
            raise ValueError("dispatch.taskRef must point under .trellis/tasks/")
        task_path = (control_root / task_ref).resolve(strict=False)
        tasks_root = (control_root / ".trellis" / "tasks").resolve(strict=True)
        try:
            task_path.relative_to(tasks_root)
        except ValueError as error:
            raise ValueError("dispatch.taskRef escapes .trellis/tasks/") from error
        if not task_path.is_dir() or not (task_path / "task.json").is_file():
            raise ValueError("dispatch.taskRef does not identify a Trellis Task")
    return resolved_context


def _dispatch_result_contract(request: dict) -> str:
    return json.dumps(
        {
            "result": {
                "id": "res_<uuid>",
                "dispatchId": request["id"],
                "runId": request["runId"],
                "status": "completed|partial|blocked|failed",
                "summary": "...",
                "commands": [],
                "checks": [],
                "artifactRefs": [],
                "blockers": [],
                "createdAt": "RFC3339",
            },
            "proposal": {
                "id": "prp_<uuid>",
                "dispatchId": request["id"],
                "questId": request["questId"],
                "title": "...",
                "operations": [],
                "status": "pending",
                "createdAt": "RFC3339",
                "updatedAt": "RFC3339",
            },
        },
        ensure_ascii=False,
        indent=2,
    )


def _build_dispatch_prompt(
    original_prompt: str,
    control_root: Path,
    repository_root: Path,
    request: dict,
    campaign_id: str,
    resolved_context: list[dict],
) -> str:
    criteria = "\n".join(f"- {item}" for item in request["acceptanceCriteria"]) or "- (none)"
    context_lines: list[str] = []
    for entry in resolved_context:
        if "text" in entry:
            context_lines.append(f"- Text: {entry['text']}")
        else:
            artifact = entry["artifact"]
            context_lines.append(
                f"- Artifact `{artifact['id']}`: `{artifact['path']}` "
                f"(resolved pointer: `{entry['resolvedPath']}`; body not injected)"
            )
    allowed = "\n".join(f"- `{item}`" for item in request["allowedWritePaths"]) or "- (none)"
    outputs = "\n".join(f"- `{item}`" for item in request["expectedOutputs"]) or "- (none)"
    checks = "\n".join(f"- `{item}`" for item in request["checks"]) or "- (none)"
    task_line = f"Active task: {request['taskRef']}\n" if request.get("taskRef") else ""
    prompt_tail = "\n".join(original_prompt.splitlines()[1:]).strip()
    control_pointer = str(control_root)
    return f"""<!-- trellis-hook-injected -->
# Research Worker Dispatch

{task_line}Control root: `{control_pointer}`
Dispatch: `{request['id']}`
Quest: `{request['questId']}`
Campaign: `{campaign_id}`
Run: `{request['runId']}`
Owner skill: `{request['ownerSkill']}`
Target repository: `{repository_root}`

## Objective

{request['objective']}

## Acceptance Criteria

{criteria}

## Declared Context

{chr(10).join(context_lines) or '- (none)'}

## Allowed Write Paths

{allowed}

## Expected Outputs

{outputs}

## Checks

{checks}

## Authority

- Work only in the target repository and allowed write paths.
- Do not append the root research ledger, mutate projections, apply/reject a Proposal, promote Claims, or advance the Quest.
- Do not commit, push, or merge Git changes.
- Return untrusted worker output to the root session; the root reviews it and runs `trellis research dispatch record-result`.

## Required Final JSON

```json
{_dispatch_result_contract(request)}
```

## Original Worker Instruction

{prompt_tail or 'Execute the validated Dispatch.'}
"""


def _build_dispatch_failure_prompt(reason: str) -> str:
    return f"""<!-- trellis-hook-injected -->
# Research Dispatch Validation Failed

Do not modify files or run the requested work.
Report this validation error to the root session: {reason}
"""


def _validate_explicit_dispatch(
    input_data: dict, cwd: str, original_prompt: str
) -> tuple[str | None, str | None]:
    first_line = original_prompt.splitlines()[0] if original_prompt.splitlines() else ""
    pointer_match = _RESEARCH_POINTER_RE.fullmatch(first_line)
    if pointer_match is None:
        return None, "dispatch pointer must match the exact first-line grammar"
    relative_request, dispatch_id = pointer_match.groups()
    _research_id(dispatch_id, "dsp", "dispatch path ID")

    control_root = _find_research_control_root(input_data, cwd)
    if control_root is None:
        return None, "research control-plane root was not found"
    try:
        dispatches_root = (
            control_root / ".trellis" / "research" / "dispatches"
        ).resolve(strict=True)
        dispatch_root = (dispatches_root / dispatch_id).resolve(strict=True)
        request_path = (control_root / relative_request).resolve(strict=True)
    except (FileNotFoundError, OSError):
        return None, "dispatch request path does not resolve"
    expected_path = dispatch_root / "request.json"
    if (
        dispatch_root.parent != dispatches_root
        or dispatch_root.name != dispatch_id
        or request_path != expected_path
    ):
        return None, "dispatch request path is not contained under its dispatch ID"

    try:
        head = _research_ledger_head(control_root)
        request = _parse_dispatch_request(
            _read_research_object(request_path, "dispatch request"), dispatch_id
        )
        _quest, campaign, _run, repository = _validate_dispatch_hierarchy(
            control_root, request, head
        )
        repository_root = _resolve_dispatch_repository(
            control_root, repository, request["repositoryId"]
        )
        resolved_context = _validate_dispatch_paths(
            control_root, repository_root, request
        )
        campaign_id = campaign["id"]
        return (
            _build_dispatch_prompt(
                original_prompt,
                control_root,
                repository_root,
                request,
                campaign_id,
                resolved_context,
            ),
            None,
        )
    except (ValueError, OSError) as error:
        return None, str(error)


def _emit_updated_prompt(input_data: dict, tool_input: dict, new_prompt: str) -> None:
    updated = {**tool_input, "prompt": new_prompt}
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "allow",
            "updatedInput": updated,
        },
        "permission": "allow",
        "updated_input": updated,
        "updatedInput": updated,
    }
    print(json.dumps(output, ensure_ascii=False))


def _string_value(value: Any) -> str:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped
    return ""


def _extract_subagent_name(value: Any) -> str:
    """Extract a sub-agent name from common platform encodings.

    Cursor's native Task args encode custom sub-agents as a protobuf oneof,
    which can appear in hook JSON as either ``{"custom": {"name": "..."}}``
    or ``{"type": {"case": "custom", "value": {"name": "..."}}}``.
    """
    direct = _string_value(value)
    if direct:
        return direct

    if not isinstance(value, dict):
        return ""

    for key in ("name", "subagent_type_name", "subagentTypeName"):
        direct = _string_value(value.get(key))
        if direct:
            return direct

    custom = value.get("custom")
    if isinstance(custom, dict):
        custom_name = _string_value(custom.get("name"))
        if custom_name:
            return custom_name

    oneof = value.get("type")
    if isinstance(oneof, dict):
        case_name = _string_value(oneof.get("case"))
        if case_name == "custom":
            nested_value = oneof.get("value")
            if isinstance(nested_value, dict):
                custom_name = _string_value(nested_value.get("name"))
                if custom_name:
                    return custom_name
        if case_name:
            return case_name

    case_name = _string_value(value.get("case"))
    if case_name == "custom":
        nested_value = value.get("value")
        if isinstance(nested_value, dict):
            custom_name = _string_value(nested_value.get("name"))
            if custom_name:
                return custom_name
    if case_name:
        return case_name

    for agent_name in AGENTS_ALL:
        if agent_name in value:
            return agent_name

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
    """Parse hook input across different platform formats.

    Returns (subagent_type, original_prompt, tool_input).
    Handles:
    - Claude Code / Qoder / CodeBuddy / Droid: tool_name=Task|Agent, tool_input.subagent_type
    - Cursor: tool_name=Task|Subagent, tool_input.subagent_type
    - Copilot CLI: toolName=task (camelCase key, lowercase value)
    - ZCode: toolName=Agent, toolInput/tool_input.subagent_type
    - Gemini CLI: tool_name IS the agent name (BeforeTool matcher already filtered)
    - Kiro: agentSpawn hook, agent_name field at top level
    """
    tool_input = input_data.get("tool_input", {})
    if not isinstance(tool_input, dict):
        tool_input = input_data.get("toolInput", {})
    if not isinstance(tool_input, dict):
        tool_input = {}

    # Standard format: Task/Agent tool with subagent_type
    tool_name = input_data.get("tool_name", "") or input_data.get("toolName", "")
    if tool_name.lower() in ("task", "agent", "subagent"):
        return (
            _extract_subagent_type(tool_input),
            tool_input.get("prompt", ""),
            tool_input,
        )

    # Kiro: agentSpawn hook passes agent_name at top level
    agent_name = input_data.get("agent_name", "")
    if agent_name:
        return agent_name, tool_input.get("prompt", input_data.get("prompt", "")), tool_input

    # Gemini CLI: BeforeTool where tool_name IS the agent name
    # (matcher already ensured it's one of our agents)
    if tool_name in AGENTS_ALL:
        return tool_name, tool_input.get("prompt", ""), tool_input

    # Copilot CLI: toolName field (camelCase), value might be the agent name
    tool_name_camel = input_data.get("toolName", "")
    if tool_name_camel in AGENTS_ALL:
        return tool_name_camel, input_data.get("toolArgs", ""), tool_input

    return "", "", tool_input


def main():
    if os.environ.get("TRELLIS_HOOKS") == "0" or os.environ.get("TRELLIS_DISABLE_HOOKS") == "1":
        sys.exit(0)

    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    subagent_type, original_prompt, tool_input = _parse_hook_input(input_data)
    cwd = input_data.get("cwd", os.getcwd())

    if (
        _detect_platform(input_data) == "claude"
        and subagent_type == AGENT_RESEARCH_WORKER
        and isinstance(original_prompt, str)
    ):
        if "<!-- trellis-hook-injected -->" in original_prompt:
            sys.exit(0)
        first_line = original_prompt.splitlines()[0] if original_prompt.splitlines() else ""
        if first_line.startswith("Research dispatch:"):
            dispatch_prompt, dispatch_error = _validate_explicit_dispatch(
                input_data, str(cwd), original_prompt
            )
            if dispatch_prompt is None:
                dispatch_prompt = _build_dispatch_failure_prompt(
                    dispatch_error or "dispatch validation failed"
                )
            _emit_updated_prompt(input_data, tool_input, dispatch_prompt)
            sys.exit(0)

    # Only handle subagent types we care about
    if subagent_type not in AGENTS_ALL:
        sys.exit(0)

    # Find repo root
    repo_root = find_repo_root(cwd)
    if not repo_root:
        sys.exit(0)

    # Get current task directory (research doesn't require it)
    task_dir = get_current_task(repo_root, input_data)

    # implement/check need task directory
    if subagent_type in AGENTS_REQUIRE_TASK:
        if not task_dir:
            sys.exit(0)
        # Check if task directory exists
        task_dir_full = os.path.join(repo_root, task_dir)
        if not os.path.exists(task_dir_full):
            sys.exit(0)

    # Check for [finish] marker in prompt (check agent with finish context)
    is_finish_phase = "[finish]" in original_prompt.lower()

    # Get context and build prompt based on subagent type
    if subagent_type == AGENT_IMPLEMENT:
        assert task_dir is not None  # validated above
        context = get_implement_context(repo_root, task_dir)
        new_prompt = build_implement_prompt(original_prompt, context)
    elif subagent_type == AGENT_CHECK:
        assert task_dir is not None  # validated above
        if is_finish_phase:
            # Finish phase: use finish context (lighter, focused on final verification)
            context = get_finish_context(repo_root, task_dir)
            new_prompt = build_finish_prompt(original_prompt, context)
        else:
            # Regular check phase: use check context (full specs for self-fix loop)
            context = get_check_context(repo_root, task_dir)
            new_prompt = build_check_prompt(original_prompt, context)
    elif subagent_type == AGENT_RESEARCH:
        # Research can work without task directory
        context = get_research_context(repo_root, task_dir)
        new_prompt = build_research_prompt(original_prompt, context)
    else:
        sys.exit(0)

    if not context:
        sys.exit(0)

    # Return updated input. Most platforms ignore unrecognized fields, so we
    # include multiple formats. ZCode is stricter; live probing confirmed the
    # nested Claude-compatible shape below reaches the sub-agent prompt.
    updated = {**tool_input, "prompt": new_prompt}
    if _detect_platform(input_data) == "zcode":
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "allow",
                "updatedInput": updated,
            }
        }
    else:
        output = {
            # Claude Code / Qoder / CodeBuddy / Droid format
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "allow",
                "updatedInput": updated,
            },
            # Cursor format
            "permission": "allow",
            "updated_input": updated,
            # Gemini format
            "updatedInput": updated,
        }

    print(json.dumps(output, ensure_ascii=False))
    sys.exit(0)


if __name__ == "__main__":
    main()
