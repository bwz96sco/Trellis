#!/usr/bin/env python3
"""Explicit write-capable administration for research quest state."""

from __future__ import annotations

import argparse
import copy
import importlib.util
import json
import os
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


class SourceWriteAuthorityError(RuntimeError):
    """Fail-closed source mutation refusal from Trellis C4b authority."""


def load_projection(path: Path, label: str) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SourceWriteAuthorityError(f"source write denied: malformed {label}: {exc}") from exc
    if not isinstance(value, dict) or not isinstance(value.get("data"), dict):
        raise SourceWriteAuthorityError(f"source write denied: malformed {label}")
    return value


def find_trellis_root(source_root: Path) -> Path | None:
    for candidate in (source_root, *source_root.parents):
        if (candidate / ".trellis" / "research").is_dir():
            return candidate
    return None


def validate_explicit_trellis_root(trellis_root: Path) -> None:
    if not trellis_root.exists() or not trellis_root.is_dir():
        raise SourceWriteAuthorityError(
            "source write denied: TRELLIS_RESEARCH_ROOT does not name an existing directory"
        )
    research_root = trellis_root / ".trellis" / "research"
    runtime_root = trellis_root / ".trellis" / ".runtime" / "research"
    if not (
        research_root.is_dir()
        and (research_root / "repositories.json").is_file()
        and (research_root / "quests").is_dir()
        and runtime_root.is_dir()
        and (runtime_root / "repo-bindings.json").is_file()
    ):
        raise SourceWriteAuthorityError(
            "source write denied: TRELLIS_RESEARCH_ROOT is not a valid Trellis Research control root"
        )


def explicit_trellis_root() -> Path | None:
    raw = os.environ.get("TRELLIS_RESEARCH_ROOT")
    if raw is None:
        return None
    if raw.strip() == "":
        raise SourceWriteAuthorityError(
            "source write denied: TRELLIS_RESEARCH_ROOT must not be empty"
        )
    trellis_root = Path(raw).expanduser().resolve()
    validate_explicit_trellis_root(trellis_root)
    return trellis_root


def sibling_trellis_roots(source_root: Path) -> list[Path]:
    parent = source_root.parent
    try:
        siblings = list(parent.iterdir())
    except OSError as exc:
        raise SourceWriteAuthorityError(
            f"source write denied: cannot inspect sibling Trellis roots: {exc}"
        ) from exc
    return sorted(
        (
            candidate.resolve()
            for candidate in siblings
            if candidate != source_root
            and candidate.is_dir()
            and (candidate / ".trellis" / "research").is_dir()
        ),
        key=str,
    )


def resolved_repository_id(trellis_root: Path, source_root: Path) -> str | None:
    projection_path = trellis_root / ".trellis" / "research" / "repositories.json"
    if not projection_path.exists():
        quests_dir = trellis_root / ".trellis" / "research" / "quests"
        if quests_dir.exists() and any(quests_dir.glob("*/import.json")):
            raise SourceWriteAuthorityError(
                "source write denied: imported authority has no repository projection"
            )
        return None
    projection = load_projection(projection_path, "repository projection")
    repositories = projection["data"].get("repositories")
    if not isinstance(repositories, list):
        raise SourceWriteAuthorityError("source write denied: malformed repository projection")

    bindings_path = (
        trellis_root / ".trellis" / ".runtime" / "research" / "repo-bindings.json"
    )
    bindings: dict[str, str] = {}
    if bindings_path.exists():
        try:
            bindings_value = json.loads(bindings_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise SourceWriteAuthorityError(
                f"source write denied: malformed repository bindings: {exc}"
            ) from exc
        if (
            not isinstance(bindings_value, dict)
            or bindings_value.get("schemaVersion") != 1
            or set(bindings_value) != {"schemaVersion", "bindings"}
            or not isinstance(bindings_value.get("bindings"), dict)
        ):
            raise SourceWriteAuthorityError(
                "source write denied: malformed repository bindings"
            )
        for repository_id, bound_path in bindings_value["bindings"].items():
            if not isinstance(repository_id, str) or not isinstance(bound_path, str):
                raise SourceWriteAuthorityError(
                    "source write denied: malformed repository bindings"
                )
            binding = Path(bound_path).expanduser()
            if not binding.is_absolute():
                raise SourceWriteAuthorityError(
                    "source write denied: malformed repository bindings"
                )
            bindings[repository_id] = str(binding.resolve())

    matches: set[str] = set()
    for repository in repositories:
        if not isinstance(repository, dict):
            raise SourceWriteAuthorityError("source write denied: malformed repository projection")
        repository_id = repository.get("id")
        locator = repository.get("locator")
        if not isinstance(repository_id, str) or not isinstance(locator, str):
            raise SourceWriteAuthorityError("source write denied: malformed repository projection")
        bound_path = bindings.get(repository_id)
        if bound_path is not None:
            if Path(bound_path) == source_root:
                matches.add(repository_id)
            continue
        if "://" in locator:
            continue
        locator_path = Path(locator).expanduser()
        if not locator_path.is_absolute():
            locator_path = trellis_root / locator_path
        if locator_path.resolve() == source_root:
            matches.add(repository_id)
    if len(matches) > 1:
        raise SourceWriteAuthorityError("source write denied: ambiguous source Repository")
    return next(iter(matches)) if matches else None


def source_identity(source_root: Path) -> tuple[str, str] | None:
    quest_path = source_root / core.QUEST_FILE
    if not quest_path.exists():
        return None
    quest, _ = core.normalize_quest(core.load_yaml(quest_path))
    source_quest_id = quest.get("quest_id")
    project_slug = quest.get("project_slug")
    if not isinstance(source_quest_id, str) or not isinstance(project_slug, str):
        raise SourceWriteAuthorityError(
            "source write denied: source Quest identity is missing or malformed"
        )
    return source_quest_id, project_slug


def active_fence_quest_ids(trellis_root: Path, source_root: Path) -> set[str]:
    fence_dir = trellis_root / ".trellis" / "research" / "cutover-fences"
    if not fence_dir.exists():
        return set()
    quest_ids: set[str] = set()
    for fence_path in sorted(fence_dir.glob("*.json")):
        try:
            fence = json.loads(fence_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise SourceWriteAuthorityError(
                f"source write denied: malformed active cutover fence: {exc}"
            ) from exc
        if (
            not isinstance(fence, dict)
            or fence.get("effect") != "deny-source-writes"
            or not isinstance(fence.get("questId"), str)
            or not isinstance(fence.get("source"), dict)
        ):
            raise SourceWriteAuthorityError("source write denied: malformed active cutover fence")
        quest_ids.add(fence["questId"])
        fence_source = fence["source"]
        project_root = fence_source.get("projectRoot")
        quest_path = fence_source.get("questPath")
        if isinstance(project_root, str) and isinstance(quest_path, str):
            if Path(project_root).resolve() == source_root and quest_path == core.QUEST_FILE:
                raise SourceWriteAuthorityError("source write denied: active cutover fence")
    return quest_ids


def imported_authority_candidates(
    trellis_root: Path,
    repository_id: str | None,
    identity: tuple[str, str] | None,
) -> list[tuple[str, dict[str, Any]]]:
    if repository_id is None and identity is None:
        return []
    quests_dir = trellis_root / ".trellis" / "research" / "quests"
    if not quests_dir.exists():
        return []
    candidates: list[tuple[str, dict[str, Any]]] = []
    quest_directories = sorted(path for path in quests_dir.iterdir() if path.is_dir())
    for quest_dir in quest_directories:
        import_path = quest_dir / "import.json"
        writer_path = quest_dir / "writer.json"
        if not import_path.exists() and not writer_path.exists():
            continue
        quest_path = quest_dir / "quest.json"
        if not quest_path.exists():
            raise SourceWriteAuthorityError(
                "source write denied: imported authority has no Quest projection"
            )
        quest_projection = load_projection(quest_path, "Quest projection")
        quest = quest_projection["data"]
        quest_id = quest.get("id")
        repository_ids = quest.get("repositoryIds")
        if (
            not isinstance(quest_id, str)
            or quest_id != quest_dir.name
            or not isinstance(repository_ids, list)
            or any(not isinstance(value, str) for value in repository_ids)
        ):
            raise SourceWriteAuthorityError("source write denied: malformed Quest projection")
        if repository_id is not None and repository_id not in repository_ids:
            continue
        if not import_path.exists():
            raise SourceWriteAuthorityError(
                "source write denied: imported authority has no import projection"
            )
        import_projection = load_projection(import_path, "import projection")
        data = import_projection["data"]
        records = data.get("records")
        latest_id = data.get("latestImportRecordId")
        if data.get("questId") != quest_id or not isinstance(records, list) or not isinstance(latest_id, str):
            raise SourceWriteAuthorityError("source write denied: malformed import projection")
        latest = next(
            (
                record
                for record in records
                if isinstance(record, dict) and record.get("id") == latest_id
            ),
            None,
        )
        if not isinstance(latest, dict) or latest.get("questId") != quest_id:
            raise SourceWriteAuthorityError("source write denied: malformed import projection")
        imported_identity = latest.get("sourceIdentity")
        if not isinstance(imported_identity, dict):
            raise SourceWriteAuthorityError("source write denied: malformed import projection")
        if imported_identity.get("sourceQuestPath") != core.QUEST_FILE:
            continue
        if identity is not None and (
            imported_identity.get("sourceQuestId") != identity[0]
            or imported_identity.get("projectSlug") != identity[1]
        ):
            if repository_id is not None and repository_id in repository_ids:
                raise SourceWriteAuthorityError(
                    "source write denied: imported source identity differs from current Quest"
                )
            continue
        candidates.append((quest_id, latest))
    return candidates


def assert_no_unknown_sibling_authority(source_root: Path) -> None:
    identity = source_identity(source_root)
    for candidate in sibling_trellis_roots(source_root):
        validate_explicit_trellis_root(candidate)
        repository_id = resolved_repository_id(candidate, source_root)
        candidates = imported_authority_candidates(candidate, repository_id, identity)
        if repository_id is not None or candidates:
            raise SourceWriteAuthorityError(
                "source write denied: sibling Trellis authority requires TRELLIS_RESEARCH_ROOT"
            )


def assert_source_write_authority(source_root: Path) -> None:
    source_root = source_root.resolve()
    trellis_root = explicit_trellis_root()
    if trellis_root is not None:
        repository_id = resolved_repository_id(trellis_root, source_root)
        if repository_id is None:
            raise SourceWriteAuthorityError(
                "source write denied: TRELLIS_RESEARCH_ROOT does not own the source Repository"
            )
    else:
        trellis_root = find_trellis_root(source_root)
        if trellis_root is None:
            assert_no_unknown_sibling_authority(source_root)
            return
        repository_id = resolved_repository_id(trellis_root, source_root)
    active_fences = active_fence_quest_ids(trellis_root, source_root)
    identity = source_identity(source_root)
    candidates = imported_authority_candidates(trellis_root, repository_id, identity)
    if len(candidates) > 1:
        raise SourceWriteAuthorityError("source write denied: ambiguous imported authority")
    if not candidates:
        return
    quest_id, import_record = candidates[0]
    if quest_id in active_fences:
        raise SourceWriteAuthorityError("source write denied: active cutover fence")
    writer_path = (
        trellis_root / ".trellis" / "research" / "quests" / quest_id / "writer.json"
    )
    if not writer_path.exists():
        raise SourceWriteAuthorityError(
            "source write denied: imported authority has no writer projection"
        )
    writer_projection = load_projection(writer_path, "writer projection")
    authority = writer_projection["data"].get("authority")
    source_snapshot = import_record.get("sourceSnapshot")
    if (
        not isinstance(authority, dict)
        or authority.get("questId") != quest_id
        or authority.get("writer") not in {"source", "trellis"}
        or not isinstance(authority.get("sourceSnapshotDigest"), str)
        or not isinstance(authority.get("recordedEventId"), str)
        or not isinstance(source_snapshot, dict)
        or authority.get("sourceSnapshotDigest") != source_snapshot.get("snapshotDigest")
    ):
        raise SourceWriteAuthorityError("source write denied: malformed writer projection")
    if authority["writer"] != "source":
        raise SourceWriteAuthorityError("source write denied: committed writer is trellis")


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
        if getattr(args, "write", False):
            assert_source_write_authority(Path(args.root))
        return args.func(args)
    except (core.QuestError, SourceWriteAuthorityError) as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
