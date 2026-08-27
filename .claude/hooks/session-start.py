#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Claude SessionStart orientation for the managed Research control plane."""
from __future__ import annotations

import json
import os
import re
import sys
import tempfile
from pathlib import Path

if sys.platform.startswith("win"):
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="replace")

FIRST_REPLY_NOTICE = """<first-reply-notice>
First visible reply: say once in Chinese that Trellis SessionStart context is loaded, then answer directly.
This notice is one-shot: do not repeat it after the first assistant reply in the same session.
</first-reply-notice>"""


def _find_root(start: Path) -> Path | None:
    try:
        current = start.resolve()
    except OSError:
        return None
    if current.is_file():
        current = current.parent
    while True:
        if (current / ".trellis").is_dir():
            return current
        if current == current.parent:
            return None
        current = current.parent


def _session_key(input_data: dict) -> str | None:
    value = input_data.get("session_id") or input_data.get("sessionId")
    if not isinstance(value, str) or not value.strip():
        value = os.environ.get("CLAUDE_SESSION_ID") or os.environ.get("CLAUDE_CODE_SESSION_ID")
    if not isinstance(value, str) or not value.strip():
        return None
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", value.strip())
    return f"claude_{safe}" if safe else None

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
_RESEARCH_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
_RESEARCH_TIMESTAMP_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$"
)


def _valid_research_id(value: object, prefix: str) -> bool:
    return (
        isinstance(value, str)
        and value.startswith(f"{prefix}_")
        and _RESEARCH_UUID_RE.fullmatch(value[len(prefix) + 1 :]) is not None
    )


def _valid_research_timestamp(value: object) -> bool:
    if not isinstance(value, str) or _RESEARCH_TIMESTAMP_RE.fullmatch(value) is None:
        return False
    try:
        from datetime import datetime

        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def _research_workflow_selection(trellis_dir: Path) -> tuple[str, str | None]:
    selection_path = trellis_dir / ".workflow.json"
    if not selection_path.is_file():
        return "other", None
    try:
        selection = json.loads(selection_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError, UnicodeDecodeError):
        return "invalid", "workflow selection"
    if not isinstance(selection, dict) or set(selection) != {
        "schemaVersion",
        "id",
        "source",
    }:
        return "invalid", "workflow selection"
    if (
        selection.get("schemaVersion") != 1
        or not isinstance(selection.get("id"), str)
        or not isinstance(selection.get("source"), str)
    ):
        return "invalid", "workflow selection"
    if selection["id"] == "research" and selection["source"] == "bundled":
        return "research", None
    return "other", None


def _research_ledger_head(trellis_dir: Path) -> tuple[int | None, str | None]:
    ledger_path = trellis_dir / "research" / "events.jsonl"
    if not ledger_path.is_file():
        return 0, None
    try:
        lines = ledger_path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError):
        return None, "ledger"
    expected = 1
    for line in lines:
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            return None, "ledger"
        seq = event.get("seq") if isinstance(event, dict) else None
        if isinstance(seq, bool) or not isinstance(seq, int) or seq != expected:
            return None, "ledger"
        expected += 1
    return expected - 1, None


def _read_research_projection(path: Path, head: int) -> tuple[dict | None, str | None]:
    try:
        envelope = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError, UnicodeDecodeError):
        return None, "projection"
    if not isinstance(envelope, dict) or set(envelope) != {
        "schemaVersion",
        "projectedThroughSeq",
        "updatedAt",
        "data",
    }:
        return None, "projection"
    if (
        envelope.get("schemaVersion") != 1
        or envelope.get("projectedThroughSeq") != head
        or not isinstance(envelope.get("updatedAt"), str)
        or not isinstance(envelope.get("data"), dict)
    ):
        return None, "projection"
    return envelope["data"], None


def _research_orientation(trellis_dir: Path) -> tuple[str | None, int | None]:
    selection, selection_error = _research_workflow_selection(trellis_dir)
    if selection == "other":
        return None, None
    if selection_error:
        return (
            "<research-state>\n"
            "Warning: research state invalid; run `trellis research validate --json`.\n"
            "</research-state>",
            None,
        )

    head, head_error = _research_ledger_head(trellis_dir)
    if head_error or head is None:
        return (
            "<research-state>\n"
            "Warning: research state invalid; run `trellis research validate --json`.\n"
            "</research-state>",
            None,
        )

    active_quests: list[dict] = []
    quest_root = trellis_dir / "research" / "quests"
    if quest_root.is_dir():
        for quest_path in sorted(quest_root.glob("*/quest.json")):
            quest_data, projection_error = _read_research_projection(quest_path, head)
            if projection_error or quest_data is None:
                return (
                    "<research-state>\n"
                    "Warning: research state invalid; run `trellis research validate --json`.\n"
                    "</research-state>",
                    None,
                )
            required = {
                "id",
                "title",
                "description",
                "status",
                "stage",
                "repositoryIds",
                "artifactRefs",
                "createdAt",
                "updatedAt",
            }
            repository_ids = quest_data.get("repositoryIds")
            artifact_refs = quest_data.get("artifactRefs")
            quest_id = quest_data.get("id")
            if (
                set(quest_data) != required
                or not _valid_research_id(quest_id, "qst")
                or quest_id != quest_path.parent.name
                or not isinstance(quest_data.get("title"), str)
                or not quest_data["title"].strip()
                or not isinstance(quest_data.get("description"), str)
                or quest_data.get("status")
                not in {"active", "paused", "completed", "abandoned"}
                or quest_data.get("stage")
                not in {*_RESEARCH_OWNER_BY_STAGE, "complete"}
                or not isinstance(repository_ids, list)
                or any(not _valid_research_id(item, "rep") for item in repository_ids)
                or len(set(repository_ids)) != len(repository_ids)
                or not isinstance(artifact_refs, list)
                or not _valid_research_timestamp(quest_data.get("createdAt"))
                or not _valid_research_timestamp(quest_data.get("updatedAt"))
            ):
                return (
                    "<research-state>\n"
                    "Warning: research state invalid; run `trellis research validate --json`.\n"
                    "</research-state>",
                    None,
                )
            if quest_data["status"] == "active":
                active_quests.append(quest_data)

    pending_proposals = 0
    dispatch_root = trellis_dir / "research" / "dispatches"
    if dispatch_root.is_dir():
        for proposal_path in sorted(dispatch_root.glob("*/proposal.json")):
            try:
                proposal = json.loads(proposal_path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError, UnicodeDecodeError):
                proposal = None
            required = {
                "id",
                "dispatchId",
                "questId",
                "title",
                "operations",
                "status",
                "createdAt",
                "updatedAt",
            }
            if (
                not isinstance(proposal, dict)
                or set(proposal) != required
                or not _valid_research_id(proposal.get("id"), "prp")
                or not _valid_research_id(proposal.get("dispatchId"), "dsp")
                or proposal.get("dispatchId") != proposal_path.parent.name
                or not _valid_research_id(proposal.get("questId"), "qst")
                or not isinstance(proposal.get("title"), str)
                or not proposal["title"].strip()
                or not isinstance(proposal.get("operations"), list)
                or proposal.get("status")
                not in {"pending", "accepted", "rejected", "deferred"}
                or not _valid_research_timestamp(proposal.get("createdAt"))
                or not _valid_research_timestamp(proposal.get("updatedAt"))
            ):
                return (
                    "<research-state>\n"
                    "Warning: research state invalid; run `trellis research validate --json`.\n"
                    "</research-state>",
                    None,
                )
            if proposal["status"] == "pending":
                pending_proposals += 1

    active_quests.sort(key=lambda item: (item["updatedAt"], item["id"]))
    selected = active_quests[-1] if active_quests else None
    lines = ["<research-state>", f"Ledger head: {head}"]
    if selected is None:
        lines.extend(("Current Quest: none", "Stage: none", "Owner skill: none"))
    else:
        lines.append(f"Current Quest: {selected['id']} — {selected['title']}")
        lines.append(f"Stage: {selected['stage']}")
        owner = _RESEARCH_OWNER_BY_STAGE.get(selected["stage"], "none")
        lines.append(f"Owner skill: {owner}")
    ambiguity = " (ambiguous)" if len(active_quests) > 1 else ""
    lines.append(f"Active Quest count: {len(active_quests)}{ambiguity}")
    lines.append(f"Pending Proposals: {pending_proposals}")
    lines.append("Blocker: not represented in research schema v1.")
    lines.append(
        "Next action: run `trellis research status --json`; follow current stage owner."
    )
    lines.append("Pointers:")
    lines.append("- Status: `trellis research status --json`")
    lines.append("- Ledger: `.trellis/research/events.jsonl`")
    if selected is not None:
        lines.append(
            f"- Quest: `.trellis/research/quests/{selected['id']}/quest.json`"
        )
    lines.append("- Dispatches: `.trellis/research/dispatches/`")
    lines.append("</research-state>")
    return "\n".join(lines), head


def _write_research_watermark(
    trellis_dir: Path, context_key: str | None, head: int
) -> bool:
    if not context_key:
        return False
    session_dir = trellis_dir / ".runtime" / "sessions"
    session_path = session_dir / f"{context_key}.json"
    if session_path.exists():
        try:
            session_data = json.loads(session_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError, UnicodeDecodeError):
            return False
        if not isinstance(session_data, dict):
            return False
    else:
        session_data = {}

    updated = dict(session_data)
    updated["research_last_seen_seq"] = head
    temp_path: str | None = None
    try:
        session_dir.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=session_dir,
            prefix=f".{context_key}.",
            suffix=".tmp",
            delete=False,
        ) as handle:
            temp_path = handle.name
            json.dump(updated, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, session_path)
        return True
    except OSError:
        return False
    finally:
        if temp_path:
            try:
                Path(temp_path).unlink(missing_ok=True)
            except OSError:
                pass  # Best-effort temp cleanup; preserve hook output on failure.

def main() -> int:
    if os.environ.get("TRELLIS_HOOKS") == "0" or os.environ.get("TRELLIS_DISABLE_HOOKS") == "1":
        return 0
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, ValueError):
        input_data = {}
    if not isinstance(input_data, dict):
        input_data = {}

    start = input_data.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    root = _find_root(Path(str(start)))
    if root is None:
        return 0
    trellis_dir = root / ".trellis"
    research_state, research_head = _research_orientation(trellis_dir)
    if research_state is None:
        return 0
    if research_head is not None:
        _write_research_watermark(trellis_dir, _session_key(input_data), research_head)

    context = f"""<session-context>
Trellis Research orientation. The root session owns authoritative state.
</session-context>

{FIRST_REPLY_NOTICE}

{research_state}

<ready>
Inspect with `trellis research status --json`; dispatch only bounded Runs.
</ready>"""
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": context,
        }
    }, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
