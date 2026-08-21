#!/usr/bin/env python3
"""Explicit write-capable administration for research quest state."""

from __future__ import annotations

import argparse
import copy
import importlib.util
import json
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


CORE_PATH = (
    Path(__file__).resolve().parents[2]
    / "research-quest"
    / "scripts"
    / "research_quest.py"
)


def load_core() -> Any:
    spec = importlib.util.spec_from_file_location("research_quest_read_core", CORE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load read core: {CORE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


core = load_core()


def yaml_scalar(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    return json.dumps(str(value), ensure_ascii=False)


def dump_yaml(data: Any, indent: int = 0) -> str:
    pad = " " * indent
    if isinstance(data, dict):
        if not data:
            return "{}"
        lines: list[str] = []
        for key, value in data.items():
            if isinstance(value, (dict, list)) and value:
                lines.append(f"{pad}{key}:")
                lines.append(dump_yaml(value, indent + 2))
            else:
                rendered = dump_yaml(value, 0) if isinstance(value, (dict, list)) else yaml_scalar(value)
                lines.append(f"{pad}{key}: {rendered}")
        return "\n".join(lines)
    if isinstance(data, list):
        if not data:
            return "[]"
        lines: list[str] = []
        for item in data:
            if isinstance(item, dict) and item:
                first = True
                for key, value in item.items():
                    prefix = "- " if first else "  "
                    if isinstance(value, (dict, list)) and value:
                        lines.append(f"{pad}{prefix}{key}:")
                        lines.append(dump_yaml(value, indent + 4))
                    else:
                        rendered = dump_yaml(value, 0) if isinstance(value, (dict, list)) else yaml_scalar(value)
                        lines.append(f"{pad}{prefix}{key}: {rendered}")
                    first = False
            elif isinstance(item, (dict, list)):
                lines.append(f"{pad}- {dump_yaml(item, 0)}")
            else:
                lines.append(f"{pad}- {yaml_scalar(item)}")
        return "\n".join(lines)
    return yaml_scalar(data)


def now_iso() -> str:
    return datetime.now().astimezone().replace(microsecond=0).isoformat()


def event_id(slug: str) -> str:
    safe = re.sub(r"[^a-z0-9]+", "-", slug.lower()).strip("-") or "event"
    return f"evt-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{safe}"


def default_quest(root: Path, status_rel: Path) -> dict[str, Any]:
    slug = re.sub(r"[^a-z0-9]+", "-", root.name.lower()).strip("-") or "research-project"
    return {
        "schema_version": "0.2",
        "quest_id": f"rq-{slug}",
        "project_slug": slug,
        "title": root.name or "Research Project",
        "objective": "Clarify the research objective.",
        "status": "seed",
        "active_stage": "research-project-setup",
        "first_read": [str(status_rel)],
        "authoritative_artifacts": {
            "quest_state": {
                "path": core.QUEST_FILE,
                "owner_skill": "research-quest-admin",
            }
        },
        "branches": [
            {
                "id": "main",
                "status": "active",
                "owner_skill": "research-project-setup",
                "objective": "Clarify the research objective and select the next stage.",
                "expected_artifact": str(status_rel),
            }
        ],
        "claims": [],
        "open_questions": [],
        "current_decision": {
            "id": "D0",
            "verdict": "quest_created",
            "rationale": "Quest initialized; route still needs project intake or refresh.",
            "evidence_paths": [str(status_rel)],
        },
        "next_action": {
            "owner_skill": "research-project-setup",
            "action": "route",
            "acceptance_gate": "Quest status generated and referenced artifacts exist.",
            "expected_artifact": str(status_rel),
        },
        "board": {},
        "blockers": [],
    }


def initial_event(timestamp: str, status_rel: Path) -> dict[str, Any]:
    return {
        "event_id": event_id("quest-created"),
        "timestamp": timestamp,
        "actor": "agent",
        "event_type": "quest_created",
        "milestone": True,
        "stage": "research-project-setup",
        "summary": "Initialized research quest files.",
        "artifacts": [
            {
                "path": core.QUEST_FILE,
                "owner_skill": "research-quest-admin",
                "role": "quest_state",
                "action": "created",
            }
        ],
        "evidence": [{"path": str(status_rel), "role": "status_projection"}],
        "claim_updates": [],
        "decision": {
            "decision_id": "D0",
            "verdict": "quest_created",
            "rationale": "Quest initialized; route still needs project intake or refresh.",
            "next_route": "research-project-setup",
        },
        "next_action": {
            "owner_skill": "research-project-setup",
            "action": "route",
            "acceptance_gate": "Quest status generated and referenced artifacts exist.",
            "expected_artifact": str(status_rel),
        },
    }


def require_write(args: argparse.Namespace, paths: list[Path]) -> bool:
    if args.write:
        return True
    print("PREVIEW no files written")
    for path in paths:
        print(f"would write: {path}")
    print("rerun with --write to apply")
    return False


def render_status(root: Path) -> tuple[str, list[str]]:
    quest, _ = core.normalize_quest(core.load_yaml(root / core.QUEST_FILE))
    events = core.read_events(root / core.EVENT_LOG)
    errors = core.validate_quest(root)
    return core.status_markdown(quest, events, errors), errors


def write_status(root: Path) -> list[str]:
    path = root / core.status_file(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.touch()
    output, errors = render_status(root)
    path.write_text(output, encoding="utf-8")
    print(f"wrote: {path}")
    return errors


def cmd_init(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    status_rel = core.status_file(root)
    paths = [root / core.QUEST_FILE, root / core.EVENT_LOG, root / status_rel]
    existing = [path for path in paths if path.exists()]
    if existing and not args.force:
        for path in existing:
            print(f"FAIL exists: {path}", file=sys.stderr)
        return 1
    if not require_write(args, paths):
        return 0

    root.mkdir(parents=True, exist_ok=True)
    timestamp = now_iso()
    (root / core.QUEST_FILE).write_text(dump_yaml(default_quest(root, status_rel)) + "\n", encoding="utf-8")
    (root / core.EVENT_LOG).write_text(
        json.dumps(initial_event(timestamp, status_rel), ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    errors = write_status(root)
    hard, _ = core.split_warnings(errors)
    return 0 if not hard else 1


def migration_blockers(quest: dict[str, Any]) -> list[str]:
    blockers: list[str] = []
    artifacts = quest.get("authoritative_artifacts")
    if artifacts and isinstance(artifacts, dict):
        for key, value in artifacts.items():
            if not isinstance(value, dict) or not value.get("path") or not value.get("owner_skill"):
                blockers.append(f"authoritative_artifacts.{key} needs explicit path and owner_skill")
    for collection in ("branches", "claims"):
        values = quest.get(collection, []) or []
        if isinstance(values, list):
            for index, value in enumerate(values):
                if isinstance(value, dict) and not value.get("owner_skill"):
                    blockers.append(f"{collection}[{index}] needs explicit owner_skill")
    action = quest.get("next_action")
    if isinstance(action, dict) and action and not action.get("owner_skill"):
        blockers.append("next_action needs explicit owner_skill")
    return blockers


def migrated_quest(root: Path) -> dict[str, Any]:
    source = core.load_yaml(root / core.QUEST_FILE)
    normalized, _ = core.normalize_quest(source)
    migrated = copy.deepcopy(normalized)
    migrated["schema_version"] = "0.2"
    migrated.pop("version", None)
    migrated.pop("current_stage", None)

    slug = re.sub(r"[^a-z0-9]+", "-", root.name.lower()).strip("-") or "research-project"
    migrated.setdefault("quest_id", f"rq-{slug}")
    migrated.setdefault("project_slug", slug)
    migrated.setdefault("title", root.name or "Research Project")
    migrated.setdefault("status", "active")
    migrated.setdefault("branches", [])
    migrated.setdefault("claims", [])
    migrated.setdefault("open_questions", [])
    migrated.setdefault("current_decision", {})
    migrated.setdefault("board", {})
    migrated.setdefault("blockers", [])

    status_rel = core.status_file(root)
    first_read = list(migrated.get("first_read", []) or [])
    if str(status_rel) not in first_read:
        first_read.insert(0, str(status_rel))
    migrated["first_read"] = first_read

    artifacts = migrated.get("authoritative_artifacts")
    if not artifacts:
        artifacts = {}
        migrated["authoritative_artifacts"] = artifacts
    if isinstance(artifacts, dict):
        artifacts.setdefault(
            "quest_state",
            {"path": core.QUEST_FILE, "owner_skill": "research-quest-admin"},
        )
    return migrated


def cmd_migrate(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    source_path = root / core.QUEST_FILE
    source = core.load_yaml(source_path)
    if not core.is_legacy_quest(source):
        print("OK state already uses schema 0.2 or newer; no write")
        return 0

    migrated = migrated_quest(root)
    blockers = migration_blockers(migrated)
    if blockers:
        for blocker in blockers:
            print(f"FAIL migration needs decision: {blocker}", file=sys.stderr)
        return 1

    backup = source_path.with_suffix(source_path.suffix + ".pre-migration.bak")
    status_path = root / core.status_file(root)
    if backup.exists() and not args.force:
        print(f"FAIL backup exists: {backup}", file=sys.stderr)
        return 1
    if not require_write(args, [backup, source_path, status_path]):
        print(dump_yaml(migrated))
        return 0

    shutil.copy2(source_path, backup)
    source_path.write_text(dump_yaml(migrated) + "\n", encoding="utf-8")
    print(f"wrote: {backup}")
    print(f"wrote: {source_path}")
    errors = write_status(root)
    hard, _ = core.split_warnings(errors)
    if hard:
        for error in hard:
            print(f"FAIL {error}", file=sys.stderr)
        print(f"backup retained: {backup}", file=sys.stderr)
        return 1
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    output, errors = render_status(root)
    if args.write:
        errors = write_status(root)
    else:
        print(output)
        print("PREVIEW no files written; add --write to regenerate canonical status")
    hard, _ = core.split_warnings(errors)
    return 0 if not hard else 1


def cmd_validate(args: argparse.Namespace) -> int:
    return core.cmd_validate(args)


def cmd_append_event(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    event_file = Path(args.event).resolve()
    try:
        event = json.loads(event_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"FAIL invalid event JSON: {exc}", file=sys.stderr)
        return 1
    if not isinstance(event, dict):
        print("FAIL event file must contain one JSON object", file=sys.stderr)
        return 1

    errors = core.validate_quest(root, candidate_event=event)
    hard, warnings = core.split_warnings(errors)
    for warning in warnings:
        print(f"WARN {warning.removeprefix('WARN ')}", file=sys.stderr)
    if hard:
        for error in hard:
            print(f"FAIL {error}", file=sys.stderr)
        return 1
    event_path = root / core.EVENT_LOG
    if not require_write(args, [event_path]):
        print(json.dumps(event, ensure_ascii=False, indent=2, sort_keys=True))
        return 0
    with event_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False, sort_keys=True) + "\n")
    print(f"appended: {event.get('event_id')}")
    return 0


def add_write_flag(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--write", action="store_true", help="Apply documented local file writes")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Administer local research quest state explicitly.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init = subparsers.add_parser("init", help="Preview or initialize quest files")
    init.add_argument("--root", required=True)
    init.add_argument("--force", action="store_true", help="Replace existing initialized files")
    add_write_flag(init)
    init.set_defaults(func=cmd_init)

    migrate = subparsers.add_parser("migrate", help="Preview or migrate legacy state to schema 0.2")
    migrate.add_argument("--root", required=True)
    migrate.add_argument("--force", action="store_true", help="Replace existing migration backup")
    add_write_flag(migrate)
    migrate.set_defaults(func=cmd_migrate)

    status = subparsers.add_parser("status", help="Print or regenerate canonical quest status")
    status.add_argument("--root", required=True)
    add_write_flag(status)
    status.set_defaults(func=cmd_status)

    validate = subparsers.add_parser("validate", help="Validate quest state without writes")
    validate.add_argument("--root", required=True)
    validate.set_defaults(func=cmd_validate)

    append = subparsers.add_parser("append-event", help="Preview or append one reviewed milestone")
    append.add_argument("--root", required=True)
    append.add_argument("--event", required=True)
    add_write_flag(append)
    append.set_defaults(func=cmd_append_event)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except core.QuestError as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
