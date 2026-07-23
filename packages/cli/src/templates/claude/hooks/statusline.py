#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Optional Claude status line for bounded Trellis Research state."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

if sys.platform.startswith("win"):
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="replace")


def _find_root() -> Path | None:
    current = Path.cwd().resolve()
    while True:
        if (current / ".trellis").is_dir():
            return current
        if current == current.parent:
            return None
        current = current.parent


def _ledger_head(root: Path) -> int | None:
    path = root / ".trellis" / "research" / "events.jsonl"
    if not path.is_file():
        return 0
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError):
        return None
    expected = 1
    for line in lines:
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            return None
        seq = event.get("seq") if isinstance(event, dict) else None
        if isinstance(seq, bool) or not isinstance(seq, int) or seq != expected:
            return None
        expected += 1
    return expected - 1


def _research_summary(root: Path) -> str:
    head = _ledger_head(root)
    if head is None:
        return "research invalid"
    active: list[tuple[str, str, str]] = []
    quests = root / ".trellis" / "research" / "quests"
    if quests.is_dir():
        for path in sorted(quests.glob("*/quest.json")):
            try:
                envelope = json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError, UnicodeDecodeError):
                return "research invalid"
            if not isinstance(envelope, dict) or envelope.get("projectedThroughSeq") != head:
                return "research invalid"
            data = envelope.get("data")
            if not isinstance(data, dict):
                return "research invalid"
            if data.get("status") == "active":
                values = (data.get("updatedAt"), data.get("id"), data.get("stage"))
                if not all(isinstance(value, str) and value for value in values):
                    return "research invalid"
                active.append(values)  # type: ignore[arg-type]
    pending = 0
    dispatches = root / ".trellis" / "research" / "dispatches"
    if dispatches.is_dir():
        for path in sorted(dispatches.glob("*/proposal.json")):
            try:
                proposal = json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError, UnicodeDecodeError):
                return "research invalid"
            if not isinstance(proposal, dict) or not isinstance(proposal.get("status"), str):
                return "research invalid"
            if proposal["status"] == "pending":
                pending += 1
    if not active:
        return f"research seq {head} · no active Quest · {pending} pending"
    active.sort()
    _, quest_id, stage = active[-1]
    ambiguity = f" · {len(active)} active" if len(active) > 1 else ""
    return f"{quest_id} · {stage} · seq {head} · {pending} pending{ambiguity}"


def _branch() -> str:
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
    except (FileNotFoundError, PermissionError, subprocess.TimeoutExpired):
        return ""
    return result.stdout.strip() if result.returncode == 0 else ""


def _context_label(data: dict) -> str:
    model = data.get("model", {}).get("display_name", "?")
    context = data.get("context_window", {})
    try:
        percent = int(context.get("used_percentage") or 0)
        size = int(context.get("context_window_size") or 0)
    except (TypeError, ValueError):
        percent, size = 0, 0
    if re.search(r"\d+[KMG]\b", str(model), re.IGNORECASE):
        return f"{model} · ctx {percent}%"
    size_label = (
        f"{size // 1_000_000}M"
        if size >= 1_000_000
        else f"{size // 1_000}K"
        if size >= 1_000
        else str(size)
    )
    return f"{model} ({size_label}) · ctx {percent}%"


def main() -> int:
    try:
        data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, ValueError):
        data = {}
    if not isinstance(data, dict):
        data = {}
    parts = [_context_label(data)]
    branch = _branch()
    if branch:
        parts.append(branch)
    root = _find_root()
    if root is not None:
        parts.append(_research_summary(root))
    print(" · ".join(parts))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
