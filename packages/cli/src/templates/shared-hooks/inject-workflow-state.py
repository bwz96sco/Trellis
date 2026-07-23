#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Emit a strict Research ledger-head watermark for Claude Code and Codex."""
from __future__ import annotations

import json
import os
import queue
import re
import sys
import tempfile
import threading
from pathlib import Path

if sys.platform.startswith("win"):
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="replace")


def _load_input() -> dict:
    result: "queue.Queue[str | Exception]" = queue.Queue(maxsize=1)

    def read() -> None:
        try:
            result.put(sys.stdin.read())
        except Exception as error:
            result.put(error)

    threading.Thread(target=read, daemon=True).start()
    try:
        raw = result.get(timeout=0.2)
    except queue.Empty:
        return {}
    if isinstance(raw, Exception) or not raw.strip():
        return {}
    try:
        value = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return {}
    return value if isinstance(value, dict) else {}


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


def _platform() -> str | None:
    if os.environ.get("CLAUDE_PROJECT_DIR"):
        return "claude"
    if os.environ.get("CODEX_HOME"):
        return "codex"
    script_parts = set(Path(sys.argv[0]).parts)
    if ".claude" in script_parts:
        return "claude"
    if ".codex" in script_parts:
        return "codex"
    return None


def _session_key(input_data: dict, platform: str | None) -> str | None:
    if platform == "claude":
        value = (
            input_data.get("session_id")
            or input_data.get("sessionId")
            or os.environ.get("CLAUDE_SESSION_ID")
            or os.environ.get("CLAUDE_CODE_SESSION_ID")
        )
    elif platform == "codex":
        value = (
            input_data.get("thread_id")
            or input_data.get("threadId")
            or input_data.get("session_id")
            or os.environ.get("CODEX_THREAD_ID")
            or os.environ.get("CODEX_SESSION_ID")
        )
    else:
        return None
    if not isinstance(value, str) or not value.strip():
        return None
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", value.strip())
    return f"{platform}_{safe}" if safe else None


def _workflow_selection(root: Path) -> str:
    selection_path = root / ".trellis" / ".workflow.json"
    if not selection_path.is_file():
        return "other"
    try:
        selection = json.loads(selection_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError, UnicodeDecodeError):
        return "invalid"
    if not isinstance(selection, dict) or set(selection) != {
        "schemaVersion",
        "id",
        "source",
    }:
        return "invalid"
    if (
        selection.get("schemaVersion") != 1
        or not isinstance(selection.get("id"), str)
        or not isinstance(selection.get("source"), str)
    ):
        return "invalid"
    if selection["id"] == "research" and selection["source"] == "bundled":
        return "research"
    return "other"


def _ledger_head(root: Path) -> int | None:
    ledger_path = root / ".trellis" / "research" / "events.jsonl"
    if not ledger_path.is_file():
        return 0
    try:
        lines = ledger_path.read_text(encoding="utf-8").splitlines()
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


def _session_state(root: Path, key: str) -> tuple[Path, dict | None]:
    session_path = root / ".trellis" / ".runtime" / "sessions" / f"{key}.json"
    if not session_path.exists():
        return session_path, {}
    try:
        value = json.loads(session_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError, UnicodeDecodeError):
        return session_path, None
    return session_path, value if isinstance(value, dict) else None


def _atomic_write(path: Path, value: dict) -> bool:
    temp_path: str | None = None
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.stem}.",
            suffix=".tmp",
            delete=False,
        ) as handle:
            temp_path = handle.name
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, path)
        return True
    except OSError:
        return False
    finally:
        if temp_path:
            try:
                Path(temp_path).unlink(missing_ok=True)
            except OSError:
                pass


def _emit(context: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": context,
        }
    }))


def main() -> int:
    if os.environ.get("TRELLIS_HOOKS") == "0" or os.environ.get("TRELLIS_DISABLE_HOOKS") == "1":
        return 0
    input_data = _load_input()
    root = _find_root(Path(str(input_data.get("cwd") or os.getcwd())))
    platform = _platform()
    if root is None or platform is None:
        return 0
    key = _session_key(input_data, platform)
    if key is None:
        return 0

    selection = _workflow_selection(root)
    if selection == "other":
        return 0
    if selection == "invalid":
        _emit(
            "<research-state-changed>\n"
            "Warning: research state invalid; run `trellis research validate --json`.\n"
            "</research-state-changed>"
        )
        return 0

    session_path, session = _session_state(root, key)
    if session is None:
        return 0
    head = _ledger_head(root)
    if head is None:
        _emit(
            "<research-state-changed>\n"
            "Warning: research state invalid; run `trellis research validate --json`.\n"
            "</research-state-changed>"
        )
        return 0

    stored = session.get("research_last_seen_seq")
    if isinstance(stored, bool) or not isinstance(stored, int):
        stored = None
    if stored == head:
        return 0
    updated = dict(session)
    updated["research_last_seen_seq"] = head
    if not _atomic_write(session_path, updated):
        return 0
    old_label = "missing" if stored is None else str(stored)
    _emit(
        "<research-state-changed>\n"
        f"Ledger head changed: {old_label} -> {head}\n"
        "Run `trellis research status --json` before continuing research work.\n"
        "</research-state-changed>"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
