#!/usr/bin/env python3
"""Build and verify the complete C8 Research Skill source baseline."""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import re
import shutil
import stat
import subprocess
import tempfile
from pathlib import Path, PurePosixPath
from typing import Any

SOURCE_REPOSITORY = Path("/Users/zhangbowen/Projects/agent-skills-private")
SOURCE_BRANCH = "chore/retire-find-skills"
SOURCE_BRANCH_REF = f"refs/heads/{SOURCE_BRANCH}"
SOURCE_COMMIT = "86df5a676c52950592ff9fe5966b9c1753160cb5"
SOURCE_TREE = "aa0282da9c63f8f17dd94b672b3fd6843647a0bd"
SOURCE_PARENT = "e2b0d70e3a797f19461eb106601de12250000b69"
SOURCE_OBJECT_FORMAT = "sha1"
SELECTION_REASON = "c8-complete-full-research-skill-migration"

RESEARCH_ROOT = Path(__file__).resolve().parent
BASELINE_ROOT = RESEARCH_ROOT / "source-baseline"
FILES_ROOT = BASELINE_ROOT / "files"
MANIFEST_PATH = BASELINE_ROOT / "manifest.json"
README_PATH = BASELINE_ROOT / "README.md"
MIGRATION_MATRIX_PATH = RESEARCH_ROOT / "migration-matrix.json"

SKILL_IDS = (
    "research-computation",
    "research-experiment",
    "research-figure",
    "research-idea-evaluation",
    "research-ideation",
    "research-literature",
    "research-opportunity-mining",
    "research-project-setup",
    "research-quest",
    "research-quest-admin",
    "research-review-case",
    "research-slides",
    "research-synthesis",
    "research-theory",
    "research-writing",
)
EXPLICIT_ONLY_SKILL_IDS = (
    "research-idea-evaluation",
    "research-opportunity-mining",
    "research-quest-admin",
)
CONTRACT_ROLES = {
    "registry/source-io-contracts.md": "source-io-contract",
    "scripts/validate-research-gates.py": "gate-validator",
    "scripts/validate-research-skills.py": "inventory-validator",
}
INVENTORY_AUTHORITY_PATH = "scripts/validate-research-skills.py"
AGGREGATE_DOMAIN = b"trellis-c8-source-baseline-file-entries-v1\0"
OID_PATTERN = re.compile(r"^[0-9a-f]{40}$")
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")

EXISTING_DISPOSITION = "existing immutable package"
NEW_DISPOSITION = "new package after gate pass"
NATIVE_DISPOSITION = "native Trellis replacement"
PILOT_VERSION_POLICY = (
    "frozen method comparison proved material drift; retain immutable 1.0.0 and "
    "add immutable 1.1.0"
)
EVIDENCE_VERSION_POLICY = (
    "retain immutable 1.0.0 unless exact evidence proves instruction drift; "
    "then add a forward immutable version"
)
NEW_VERSION_POLICY = (
    "create immutable 1.0.0 only after all nine successor gates pass"
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_json_bytes(value: Any) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        + "\n"
    ).encode("utf-8")


def reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise RuntimeError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def read_canonical_json(path: Path) -> dict[str, Any]:
    data = path.read_bytes()
    try:
        value = json.loads(
            data.decode("utf-8"), object_pairs_hook=reject_duplicate_keys
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RuntimeError(f"invalid JSON: {path}") from error
    if not isinstance(value, dict):
        raise RuntimeError(f"JSON root must be an object: {path}")
    if data != canonical_json_bytes(value):
        raise RuntimeError(f"JSON bytes are not canonical: {path}")
    return value


def run_git(*args: str, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    completed = subprocess.run(
        ["git", "-C", str(SOURCE_REPOSITORY), *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if check and completed.returncode != 0:
        stderr = completed.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"git {' '.join(args)} failed: {stderr}")
    return completed


def git_text(*args: str) -> str:
    return run_git(*args).stdout.decode("utf-8", errors="replace").strip()


def git_blob(blob_oid: str) -> bytes:
    return run_git("cat-file", "blob", blob_oid).stdout


def git_object_oid(kind: str, data: bytes) -> str:
    if SOURCE_OBJECT_FORMAT != "sha1":
        raise RuntimeError(f"unsupported Git object format: {SOURCE_OBJECT_FORMAT}")
    header = f"{kind} {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def validate_source_path(path_text: str) -> PurePosixPath:
    if "\\" in path_text:
        raise RuntimeError(f"source path contains backslash: {path_text}")
    path = PurePosixPath(path_text)
    if path.is_absolute() or path.as_posix() != path_text or ".." in path.parts:
        raise RuntimeError(f"invalid source path: {path_text}")
    return path


def local_path(root: Path, path_text: str) -> Path:
    path = validate_source_path(path_text)
    return root.joinpath(*path.parts)


def parse_tree_entries(output: bytes) -> list[dict[str, str]]:
    records: list[dict[str, str]] = []
    for raw in output.split(b"\0"):
        if not raw:
            continue
        try:
            metadata, raw_path = raw.split(b"\t", 1)
            mode, kind, blob_oid = metadata.decode("ascii").split()
            path_text = raw_path.decode("utf-8")
        except (UnicodeDecodeError, ValueError) as error:
            raise RuntimeError("malformed git ls-tree output") from error
        validate_source_path(path_text)
        if kind != "blob" or mode not in {"100644", "100755"}:
            raise RuntimeError(f"unsupported Git tree entry: {raw!r}")
        if not OID_PATTERN.fullmatch(blob_oid):
            raise RuntimeError(f"invalid blob OID: {path_text}")
        records.append({"blobOid": blob_oid, "mode": mode, "path": path_text})
    paths = [record["path"] for record in records]
    if paths != sorted(paths) or len(paths) != len(set(paths)):
        raise RuntimeError("git tree entries must be sorted and unique")
    return records


def list_blob_entries(paths: list[str]) -> list[dict[str, str]]:
    output = run_git(
        "ls-tree",
        "-r",
        "-z",
        "--full-tree",
        SOURCE_COMMIT,
        "--",
        *paths,
    ).stdout
    return parse_tree_entries(output)


def committed_research_directories() -> tuple[str, ...]:
    output = run_git(
        "ls-tree", "-z", "--name-only", f"{SOURCE_COMMIT}:skills"
    ).stdout
    names = tuple(
        sorted(
            raw.decode("utf-8")
            for raw in output.split(b"\0")
            if raw and raw.startswith(b"research-")
        )
    )
    return names


def parse_inventory_authority(data: bytes) -> None:
    try:
        module = ast.parse(data.decode("utf-8"), filename=INVENTORY_AUTHORITY_PATH)
    except (SyntaxError, UnicodeDecodeError) as error:
        raise RuntimeError("inventory authority is not valid UTF-8 Python") from error
    values: dict[str, Any] = {}
    wanted = {"CANONICAL", "ADDITIONAL_RESEARCH", "EXPLICIT_ONLY"}
    for node in module.body:
        if (
            isinstance(node, ast.Assign)
            and len(node.targets) == 1
            and isinstance(node.targets[0], ast.Name)
            and node.targets[0].id in wanted
        ):
            try:
                values[node.targets[0].id] = ast.literal_eval(node.value)
            except (ValueError, TypeError) as error:
                raise RuntimeError("inventory authority constants are not literal") from error
    if set(values) != wanted:
        raise RuntimeError("inventory authority constants are incomplete")
    active = set(values["CANONICAL"]) | set(values["ADDITIONAL_RESEARCH"])
    if active != set(SKILL_IDS):
        raise RuntimeError(
            "inventory authority skill mismatch: "
            f"missing={sorted(set(SKILL_IDS) - active)} "
            f"extra={sorted(active - set(SKILL_IDS))}"
        )
    if set(values["EXPLICIT_ONLY"]) != set(EXPLICIT_ONLY_SKILL_IDS):
        raise RuntimeError("inventory authority explicit-only set mismatch")


def role_for_path(path_text: str, scope: str) -> str:
    if scope == "contract":
        try:
            return CONTRACT_ROLES[path_text]
        except KeyError as error:
            raise RuntimeError(f"unexpected contract path: {path_text}") from error
    path = PurePosixPath(path_text)
    if path.name == "SKILL.md":
        return "instruction"
    if "agents" in path.parts:
        return "host-projection"
    if "assets" in path.parts:
        return "scaffold-asset"
    if "references" in path.parts:
        return "reference"
    if "scripts" in path.parts:
        return "helper"
    if "templates" in path.parts or "template" in path.stem:
        return "template"
    if path.name == "NOTICE.md":
        return "notice"
    raise RuntimeError(f"unclassified source file: {path_text}")


def skill_id_for_path(path_text: str) -> str:
    parts = validate_source_path(path_text).parts
    if len(parts) < 3 or parts[0] != "skills" or parts[1] not in SKILL_IDS:
        raise RuntimeError(f"path is not in the committed Research Skill inventory: {path_text}")
    return parts[1]


def insert_tree_record(tree: dict[str, Any], relative: PurePosixPath, record: dict[str, Any]) -> None:
    current = tree
    for part in relative.parts[:-1]:
        existing = current.get(part)
        if existing is None:
            existing = {}
            current[part] = existing
        if not isinstance(existing, dict):
            raise RuntimeError(f"Git tree path collision: {relative.as_posix()}")
        current = existing
    leaf = relative.parts[-1]
    if leaf in current:
        raise RuntimeError(f"duplicate Git tree path: {relative.as_posix()}")
    current[leaf] = (record["mode"], record["blobOid"])


def hash_tree_node(tree: dict[str, Any]) -> str:
    entries: list[tuple[bytes, bytes]] = []
    for name, value in tree.items():
        name_bytes = name.encode("utf-8")
        if isinstance(value, dict):
            mode = "40000"
            oid = hash_tree_node(value)
            sort_key = name_bytes + b"/"
        else:
            mode, oid = value
            sort_key = name_bytes
        entry = mode.encode("ascii") + b" " + name_bytes + b"\0" + bytes.fromhex(oid)
        entries.append((sort_key, entry))
    body = b"".join(entry for _, entry in sorted(entries, key=lambda item: item[0]))
    return git_object_oid("tree", body)


def compute_skill_tree_oid(skill_id: str, records: list[dict[str, Any]]) -> str:
    prefix = PurePosixPath("skills") / skill_id
    tree: dict[str, Any] = {}
    selected = [record for record in records if record.get("skillId") == skill_id]
    if not selected:
        raise RuntimeError(f"empty skill tree: {skill_id}")
    for record in selected:
        relative = PurePosixPath(record["path"]).relative_to(prefix)
        insert_tree_record(tree, relative, record)
    return hash_tree_node(tree)


def file_entry_aggregate(records: list[dict[str, Any]]) -> str:
    material = AGGREGATE_DOMAIN + canonical_json_bytes(records)
    return f"sha256:{sha256(material)}"


def authenticate_source() -> dict[str, str]:
    if git_text("cat-file", "-t", SOURCE_COMMIT) != "commit":
        raise RuntimeError("pinned source object is not a commit")
    if git_text("rev-parse", "--show-object-format") != SOURCE_OBJECT_FORMAT:
        raise RuntimeError("source Git object format mismatch")
    if git_text("rev-parse", f"{SOURCE_COMMIT}^{{commit}}") != SOURCE_COMMIT:
        raise RuntimeError("source commit resolution mismatch")
    if git_text("rev-parse", f"{SOURCE_COMMIT}^{{tree}}") != SOURCE_TREE:
        raise RuntimeError("source tree mismatch")
    parents = git_text("rev-list", "--parents", "-n", "1", SOURCE_COMMIT).split()
    if parents != [SOURCE_COMMIT, SOURCE_PARENT]:
        raise RuntimeError("source parent mismatch")
    git_text("rev-parse", "--verify", SOURCE_BRANCH_REF)
    if (
        run_git(
            "merge-base",
            "--is-ancestor",
            SOURCE_COMMIT,
            SOURCE_BRANCH_REF,
            check=False,
        ).returncode
        != 0
    ):
        raise RuntimeError("source commit is not contained by the required branch")
    if committed_research_directories() != SKILL_IDS:
        raise RuntimeError("committed Research Skill directory inventory mismatch")
    return {
        "branch": SOURCE_BRANCH,
        "branchRef": SOURCE_BRANCH_REF,
        "commit": SOURCE_COMMIT,
        "objectFormat": SOURCE_OBJECT_FORMAT,
        "parent": SOURCE_PARENT,
        "repository": str(SOURCE_REPOSITORY),
        "tree": SOURCE_TREE,
    }


def collect_source() -> tuple[dict[str, Any], dict[str, bytes]]:
    source = authenticate_source()
    skill_paths = [f"skills/{skill_id}" for skill_id in SKILL_IDS]
    skill_entries = list_blob_entries(skill_paths)
    contract_entries = list_blob_entries(sorted(CONTRACT_ROLES))
    if {entry["path"] for entry in contract_entries} != set(CONTRACT_ROLES):
        raise RuntimeError("contract file inventory mismatch")

    records: list[dict[str, Any]] = []
    blobs: dict[str, bytes] = {}
    for entry in skill_entries + contract_entries:
        path_text = entry["path"]
        scope = "skill" if path_text.startswith("skills/") else "contract"
        data = git_blob(entry["blobOid"])
        if git_object_oid("blob", data) != entry["blobOid"]:
            raise RuntimeError(f"Git blob OID mismatch: {path_text}")
        blobs[path_text] = data
        records.append(
            {
                "blobOid": entry["blobOid"],
                "mode": entry["mode"],
                "path": path_text,
                "role": role_for_path(path_text, scope),
                "scope": scope,
                "sha256": sha256(data),
                "size": len(data),
                "skillId": skill_id_for_path(path_text) if scope == "skill" else None,
            }
        )
    records.sort(key=lambda record: record["path"])
    if len(records) != len({record["path"] for record in records}):
        raise RuntimeError("duplicate source file path")

    parse_inventory_authority(blobs[INVENTORY_AUTHORITY_PATH])
    skill_trees: list[dict[str, Any]] = []
    for skill_id in SKILL_IDS:
        source_tree_oid = git_text("rev-parse", f"{SOURCE_COMMIT}:skills/{skill_id}")
        computed_tree_oid = compute_skill_tree_oid(skill_id, records)
        if source_tree_oid != computed_tree_oid:
            raise RuntimeError(f"skill tree OID mismatch: {skill_id}")
        skill_trees.append(
            {
                "fileCount": sum(record["skillId"] == skill_id for record in records),
                "path": f"skills/{skill_id}",
                "skillId": skill_id,
                "treeOid": source_tree_oid,
            }
        )

    skill_file_count = sum(record["scope"] == "skill" for record in records)
    contract_file_count = sum(record["scope"] == "contract" for record in records)
    manifest: dict[str, Any] = {
        "schemaVersion": 1,
        "selectionReason": SELECTION_REASON,
        "source": source,
        "inventory": {
            "contractFileCount": contract_file_count,
            "contractFiles": sorted(CONTRACT_ROLES),
            "explicitOnlySkillIds": list(EXPLICIT_ONLY_SKILL_IDS),
            "fileCount": len(records),
            "inventoryAuthority": INVENTORY_AUTHORITY_PATH,
            "skillCount": len(SKILL_IDS),
            "skillFileCount": skill_file_count,
            "skillIds": list(SKILL_IDS),
        },
        "skillTrees": skill_trees,
        "files": records,
    }
    manifest["aggregateDigest"] = file_entry_aggregate(records)
    return manifest, blobs


def package_migration(
    skill_id: str,
    *,
    disposition: str,
    skill_kind: str,
    invocation_source: str,
    entrypoint_type: str,
    profiles: list[str],
    managed_capability: str | None,
    version_policy: str,
    authority_boundary: str,
    version: str = "1.0.0",
) -> dict[str, Any]:
    return {
        "allowedProfiles": profiles,
        "authorityBoundary": authority_boundary,
        "disposition": disposition,
        "entrypointType": entrypoint_type,
        "handoffAutoInvoke": False,
        "invocationSource": invocation_source,
        "managedCapability": managed_capability,
        "skillKind": skill_kind,
        "sourceDirectory": f"skills/{skill_id}",
        "sourceSkill": skill_id,
        "target": {
            "id": skill_id,
            "kind": "execution-package",
            "version": version,
            "versionPolicy": version_policy,
        },
    }


def migration_skills() -> list[dict[str, Any]]:
    rows = [
        package_migration(
            "research-computation",
            disposition=NEW_DISPOSITION,
            skill_kind="bounded",
            invocation_source="model",
            entrypoint_type="model-context",
            profiles=["lightweight", "managed"],
            managed_capability="research.computation.case",
            version_policy=NEW_VERSION_POLICY,
            authority_boundary="bounded computation case; proposal-only in managed execution",
        ),
        package_migration(
            "research-experiment",
            disposition=NEW_DISPOSITION,
            skill_kind="bounded",
            invocation_source="model",
            entrypoint_type="model-context",
            profiles=["lightweight", "managed"],
            managed_capability="research.experiment.round",
            version_policy=NEW_VERSION_POLICY,
            authority_boundary="bounded experiment round; proposal-only in managed execution",
        ),
        package_migration(
            "research-figure",
            disposition=NEW_DISPOSITION,
            skill_kind="bounded",
            invocation_source="model",
            entrypoint_type="model-context",
            profiles=["lightweight"],
            managed_capability=None,
            version_policy=NEW_VERSION_POLICY,
            authority_boundary="lightweight-only bounded figure work",
        ),
        package_migration(
            "research-idea-evaluation",
            disposition=EXISTING_DISPOSITION,
            skill_kind="workflow",
            invocation_source="operator-explicit",
            entrypoint_type="model-context",
            profiles=["managed"],
            managed_capability="research.ideation.evaluate",
            version_policy=EVIDENCE_VERSION_POLICY,
            authority_boundary="one independently approved candidate attack; root owns closure",
        ),
        package_migration(
            "research-ideation",
            disposition=EXISTING_DISPOSITION,
            skill_kind="bounded",
            invocation_source="model",
            entrypoint_type="model-context",
            profiles=["lightweight", "managed"],
            managed_capability="research.ideation.generate",
            version_policy=PILOT_VERSION_POLICY,
            authority_boundary="one frozen candidate portfolio; H1/H2 remain human-owned",
            version="1.1.0",
        ),
        package_migration(
            "research-literature",
            disposition=EXISTING_DISPOSITION,
            skill_kind="bounded",
            invocation_source="model",
            entrypoint_type="model-context",
            profiles=["lightweight", "managed"],
            managed_capability="research.literature.review",
            version_policy=PILOT_VERSION_POLICY,
            authority_boundary="one bounded review/register unit",
            version="1.1.0",
        ),
        package_migration(
            "research-opportunity-mining",
            disposition=NEW_DISPOSITION,
            skill_kind="bounded",
            invocation_source="operator-explicit",
            entrypoint_type="model-context",
            profiles=["lightweight"],
            managed_capability=None,
            version_policy=NEW_VERSION_POLICY,
            authority_boundary="explicit lightweight opportunity extraction only",
        ),
        package_migration(
            "research-project-setup",
            disposition=NEW_DISPOSITION,
            skill_kind="workflow",
            invocation_source="operator-explicit",
            entrypoint_type="model-context",
            profiles=["lightweight", "managed"],
            managed_capability="research.setup.project",
            version_policy=NEW_VERSION_POLICY,
            authority_boundary="exact scaffold assets selected explicitly; no automatic Quest creation",
        ),
        {
            "allowedProfiles": [],
            "authorityBoundary": "native Quest/Workflow/gate/import/export/writer state; no package",
            "disposition": NATIVE_DISPOSITION,
            "entrypointType": "native-command-state",
            "handoffAutoInvoke": False,
            "invocationSource": "operator-explicit",
            "managedCapability": None,
            "skillKind": "native-state",
            "sourceDirectory": "skills/research-quest",
            "sourceSkill": "research-quest",
            "target": {
                "kind": "native-trellis",
                "packageDiscovery": "forbidden",
                "surfaces": [
                    "Quest state",
                    "Workflow state",
                    "scientific gates",
                    "Quest import/export",
                    "single-writer authority",
                ],
                "versionPolicy": "no package; native replacement remains authoritative",
            },
        },
        package_migration(
            "research-quest-admin",
            disposition=EXISTING_DISPOSITION,
            skill_kind="admin",
            invocation_source="operator-explicit",
            entrypoint_type="root-command",
            profiles=[],
            managed_capability=None,
            version_policy=EVIDENCE_VERSION_POLICY,
            authority_boundary="root-command only; canonical transfer events and writer projection own mutation",
        ),
        package_migration(
            "research-review-case",
            disposition=NEW_DISPOSITION,
            skill_kind="bounded",
            invocation_source="model",
            entrypoint_type="model-context",
            profiles=["lightweight", "managed"],
            managed_capability="research.audit.case",
            version_policy=NEW_VERSION_POLICY,
            authority_boundary="bounded audit case; no canonical verdict mutation",
        ),
        package_migration(
            "research-slides",
            disposition=NEW_DISPOSITION,
            skill_kind="bounded",
            invocation_source="model",
            entrypoint_type="model-context",
            profiles=["lightweight"],
            managed_capability=None,
            version_policy=NEW_VERSION_POLICY,
            authority_boundary="lightweight-only bounded slide work",
        ),
        package_migration(
            "research-synthesis",
            disposition=NEW_DISPOSITION,
            skill_kind="bounded",
            invocation_source="model",
            entrypoint_type="model-context",
            profiles=["lightweight"],
            managed_capability=None,
            version_policy=NEW_VERSION_POLICY,
            authority_boundary="lightweight-only bounded synthesis",
        ),
        package_migration(
            "research-theory",
            disposition=NEW_DISPOSITION,
            skill_kind="bounded",
            invocation_source="model",
            entrypoint_type="model-context",
            profiles=["lightweight", "managed"],
            managed_capability="research.theory.case",
            version_policy=NEW_VERSION_POLICY,
            authority_boundary="bounded theory case; proposal-only in managed execution",
        ),
        package_migration(
            "research-writing",
            disposition=NEW_DISPOSITION,
            skill_kind="bounded",
            invocation_source="model",
            entrypoint_type="model-context",
            profiles=["lightweight", "managed"],
            managed_capability="research.writing.case",
            version_policy=NEW_VERSION_POLICY,
            authority_boundary="bounded writing case; proposal-only in managed execution",
        ),
    ]
    return sorted(rows, key=lambda row: row["sourceSkill"])


def supporting_mappings(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    manifest_paths = [record["path"] for record in manifest["files"]]
    host_projections = sorted(
        path for path in manifest_paths if path.endswith("/agents/openai.yaml")
    )
    project_setup_support = sorted(
        path
        for path in manifest_paths
        if path.startswith("skills/research-project-setup/assets/")
        or path == "skills/research-project-setup/references/graphify.md"
    )
    return [
        {
            "disposition": "exclude host projections from package members",
            "id": "host-projections",
            "sourcePaths": host_projections,
            "trellisReplacement": "schema-v3 invocation, profile, entrypoint, and capability fields",
        },
        {
            "disposition": "retain as frozen active-membership evidence",
            "id": "source-inventory-contract",
            "sourcePaths": ["scripts/validate-research-skills.py"],
            "trellisReplacement": "one bundled Research Skill inventory plus authenticated package discovery",
        },
        {
            "disposition": "replace source-local H1/H2 validation with canonical Trellis state",
            "id": "source-gate-contract",
            "sourcePaths": ["scripts/validate-research-gates.py"],
            "trellisReplacement": "research gate status/record and workflow next/transition",
        },
        {
            "disposition": "retain as frozen semantic I/O evidence",
            "id": "source-io-contract",
            "sourcePaths": ["registry/source-io-contracts.md"],
            "trellisReplacement": "package output contracts plus canonical Quest, Workflow, gate, Result, and Proposal state",
        },
        {
            "disposition": "native Trellis replacement; never package or project as a worker helper",
            "id": "quest-reader-helper",
            "sourcePaths": ["skills/research-quest/scripts/research_quest.py"],
            "trellisReplacement": "native Quest, Workflow, gate, import/export, and status commands/state",
        },
        {
            "disposition": "native root-command replacement with guarded source refusal retained as evidence",
            "id": "quest-admin-helper",
            "sourcePaths": [
                "skills/research-quest-admin/scripts/research_quest_admin.py"
            ],
            "trellisReplacement": "Quest import/export/transfer-writer commands and committed single-writer projection",
        },
        {
            "disposition": "exclude source-local admin packs from worker Context",
            "id": "quest-admin-source-local-material",
            "sourcePaths": [
                "skills/research-quest-admin/references/campaign-index.md",
                "skills/research-quest-admin/references/quest-pack.md",
                "skills/research-quest-admin/references/task-forest-bridge.md",
                "skills/research-quest-admin/templates/research-event.json",
                "skills/research-quest-admin/templates/research-quest.yaml",
            ],
            "trellisReplacement": "existing deterministic Trellis command and canonical state contracts",
        },
        {
            "disposition": "candidate source-derived members selected explicitly during package adaptation",
            "id": "project-setup-scaffold",
            "sourcePaths": project_setup_support,
            "trellisReplacement": "research-project-setup package with exact explicitly selected scaffold assets",
        },
        {
            "disposition": "existing or required package member policy",
            "id": "declared-templates-and-reference",
            "sourcePaths": [
                "skills/research-idea-evaluation/attack-template.md",
                "skills/research-literature/note-template.md",
                "skills/research-opportunity-mining/opportunity-template.md",
                "skills/research-writing/references/academic-phrasebank.md",
            ],
            "trellisReplacement": "digest-bound on-demand package members",
        },
        {
            "disposition": "digest-bound root-only by default",
            "id": "slides-notice",
            "sourcePaths": ["skills/research-slides/NOTICE.md"],
            "trellisReplacement": "not worker-visible unless the accepted method requires it",
        },
    ]


def migration_matrix(manifest: dict[str, Any]) -> dict[str, Any]:
    skills = migration_skills()
    counts = {
        EXISTING_DISPOSITION: sum(
            row["disposition"] == EXISTING_DISPOSITION for row in skills
        ),
        NATIVE_DISPOSITION: sum(
            row["disposition"] == NATIVE_DISPOSITION for row in skills
        ),
        NEW_DISPOSITION: sum(row["disposition"] == NEW_DISPOSITION for row in skills),
    }
    return {
        "schemaVersion": 1,
        "sourceBaseline": {
            "aggregateDigest": manifest["aggregateDigest"],
            "commit": SOURCE_COMMIT,
            "manifestPath": "source-baseline/manifest.json",
            "skillCount": len(SKILL_IDS),
        },
        "dispositionCounts": counts,
        "skills": skills,
        "supportingMappings": supporting_mappings(manifest),
    }


def readme_text(manifest: dict[str, Any]) -> str:
    inventory = manifest["inventory"]
    return f"""# C8 Complete Research Skill Source Baseline

This directory freezes the exact committed source used by C8 Phase 2.

```text
source repository: {manifest['source']['repository']}
branch: {manifest['source']['branch']}
commit: {manifest['source']['commit']}
tree: {manifest['source']['tree']}
parent: {manifest['source']['parent']}
Research Skills: {inventory['skillCount']}
Skill files: {inventory['skillFileCount']}
contract files: {inventory['contractFileCount']}
total files: {inventory['fileCount']}
aggregate digest: {manifest['aggregateDigest']}
manifest schema: {manifest['schemaVersion']}
```

Build mode reads source bytes only through Git object commands at the pinned commit. It authenticates the exact branch containment, commit, tree, parent, every Research Skill subtree, every blob OID, Git mode, byte size, and SHA-256. It never reads source working-tree file bytes, so modified and untracked overlays cannot enter this baseline.

`files/` contains all committed files under the 15 active Research Skill directories. The three active inventory/gate contract files are included separately with `scope: \"contract\"`. `../migration-matrix.json` accounts for every source Skill exactly once and maps source-only projections, validators, helpers, authority files, and required support members.

The manifest uses sorted-key compact UTF-8 JSON with one final LF and rejects duplicate keys. `aggregateDigest` is SHA-256 over the domain-separated canonical ordered `files` entries. Verification also reconstructs Git blob and per-Skill tree OIDs from the frozen bytes.

Run from the Trellis worktree:

```bash
uv run python .trellis/tasks/08-25-thin-skill-c8-full-migration/research/build_source_baseline.py
uv run python .trellis/tasks/08-25-thin-skill-c8-full-migration/research/build_source_baseline.py --verify
```

`--verify` reads only this C8 evidence and requires no source repository. This is forward immutable evidence; changes require a new task/version rather than mutation of this baseline.
"""


def filesystem_mode(path: Path) -> str:
    executable = stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH
    return "100755" if path.stat().st_mode & executable else "100644"


def expected_baseline_entries(records: list[dict[str, Any]]) -> tuple[set[str], set[str]]:
    files = {"README.md", "manifest.json"}
    directories = {"files"}
    for record in records:
        relative = PurePosixPath("files") / record["path"]
        files.add(relative.as_posix())
        for parent in relative.parents:
            if parent != PurePosixPath("."):
                directories.add(parent.as_posix())
    return files, directories


def verify_manifest_shape(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    expected_keys = {
        "aggregateDigest",
        "files",
        "inventory",
        "schemaVersion",
        "selectionReason",
        "skillTrees",
        "source",
    }
    if set(manifest) != expected_keys:
        raise RuntimeError("manifest keys mismatch")
    if manifest["schemaVersion"] != 1:
        raise RuntimeError("unsupported manifest schema")
    if manifest["selectionReason"] != SELECTION_REASON:
        raise RuntimeError("manifest selection reason mismatch")
    expected_source = {
        "branch": SOURCE_BRANCH,
        "branchRef": SOURCE_BRANCH_REF,
        "commit": SOURCE_COMMIT,
        "objectFormat": SOURCE_OBJECT_FORMAT,
        "parent": SOURCE_PARENT,
        "repository": str(SOURCE_REPOSITORY),
        "tree": SOURCE_TREE,
    }
    if manifest["source"] != expected_source:
        raise RuntimeError("manifest source identity mismatch")

    records = manifest["files"]
    if not isinstance(records, list):
        raise RuntimeError("manifest files must be an array")
    paths = [record.get("path") for record in records if isinstance(record, dict)]
    if len(paths) != len(records) or paths != sorted(paths) or len(paths) != len(set(paths)):
        raise RuntimeError("manifest file paths must be exact, sorted, and unique")
    expected_record_keys = {
        "blobOid",
        "mode",
        "path",
        "role",
        "scope",
        "sha256",
        "size",
        "skillId",
    }
    for record in records:
        if set(record) != expected_record_keys:
            raise RuntimeError(f"manifest file record keys mismatch: {record.get('path')}")
        path_text = record["path"]
        validate_source_path(path_text)
        if record["scope"] not in {"skill", "contract"}:
            raise RuntimeError(f"invalid file scope: {path_text}")
        expected_skill_id = (
            skill_id_for_path(path_text) if record["scope"] == "skill" else None
        )
        if record["skillId"] != expected_skill_id:
            raise RuntimeError(f"skill ID mismatch: {path_text}")
        if record["role"] != role_for_path(path_text, record["scope"]):
            raise RuntimeError(f"role mismatch: {path_text}")
        if record["mode"] not in {"100644", "100755"}:
            raise RuntimeError(f"invalid Git mode: {path_text}")
        if not isinstance(record["size"], int) or isinstance(record["size"], bool) or record["size"] < 0:
            raise RuntimeError(f"invalid size: {path_text}")
        if not isinstance(record["blobOid"], str) or not OID_PATTERN.fullmatch(record["blobOid"]):
            raise RuntimeError(f"invalid blob OID: {path_text}")
        if not isinstance(record["sha256"], str) or not SHA256_PATTERN.fullmatch(record["sha256"]):
            raise RuntimeError(f"invalid SHA-256: {path_text}")

    skill_records = [record for record in records if record["scope"] == "skill"]
    contract_records = [record for record in records if record["scope"] == "contract"]
    inventory = manifest["inventory"]
    expected_inventory = {
        "contractFileCount": len(CONTRACT_ROLES),
        "contractFiles": sorted(CONTRACT_ROLES),
        "explicitOnlySkillIds": list(EXPLICIT_ONLY_SKILL_IDS),
        "fileCount": len(records),
        "inventoryAuthority": INVENTORY_AUTHORITY_PATH,
        "skillCount": len(SKILL_IDS),
        "skillFileCount": len(skill_records),
        "skillIds": list(SKILL_IDS),
    }
    if inventory != expected_inventory:
        raise RuntimeError("manifest inventory summary mismatch")
    if {record["path"] for record in contract_records} != set(CONTRACT_ROLES):
        raise RuntimeError("manifest contract inventory mismatch")
    if {record["skillId"] for record in skill_records} != set(SKILL_IDS):
        raise RuntimeError("manifest Research Skill coverage mismatch")
    for skill_id in SKILL_IDS:
        required_instruction = f"skills/{skill_id}/SKILL.md"
        if required_instruction not in paths:
            raise RuntimeError(f"missing committed Skill instruction: {skill_id}")

    skill_trees = manifest["skillTrees"]
    if not isinstance(skill_trees, list):
        raise RuntimeError("manifest skillTrees must be an array")
    expected_tree_ids = [record.get("skillId") for record in skill_trees if isinstance(record, dict)]
    if expected_tree_ids != list(SKILL_IDS):
        raise RuntimeError("manifest skill tree order mismatch")
    for tree_record in skill_trees:
        if set(tree_record) != {"fileCount", "path", "skillId", "treeOid"}:
            raise RuntimeError("manifest skill tree keys mismatch")
        skill_id = tree_record["skillId"]
        if tree_record["path"] != f"skills/{skill_id}":
            raise RuntimeError(f"manifest skill tree path mismatch: {skill_id}")
        expected_count = sum(record["skillId"] == skill_id for record in records)
        if tree_record["fileCount"] != expected_count:
            raise RuntimeError(f"manifest skill tree count mismatch: {skill_id}")
        if not isinstance(tree_record["treeOid"], str) or not OID_PATTERN.fullmatch(tree_record["treeOid"]):
            raise RuntimeError(f"invalid skill tree OID: {skill_id}")

    if manifest["aggregateDigest"] != file_entry_aggregate(records):
        raise RuntimeError("manifest aggregate digest mismatch")
    return records


def verify_migration_matrix(matrix: dict[str, Any], manifest: dict[str, Any]) -> None:
    expected = migration_matrix(manifest)
    if matrix != expected:
        raise RuntimeError("migration matrix content mismatch")
    skills = matrix["skills"]
    source_skills = [row["sourceSkill"] for row in skills]
    if source_skills != list(SKILL_IDS) or len(source_skills) != len(set(source_skills)):
        raise RuntimeError("migration matrix must account for each source Skill exactly once")
    expected_counts = {
        EXISTING_DISPOSITION: 4,
        NATIVE_DISPOSITION: 1,
        NEW_DISPOSITION: 10,
    }
    if matrix["dispositionCounts"] != expected_counts:
        raise RuntimeError("migration disposition counts mismatch")
    quest = next(row for row in skills if row["sourceSkill"] == "research-quest")
    if quest["target"].get("packageDiscovery") != "forbidden" or "id" in quest["target"]:
        raise RuntimeError("research-quest must remain a native replacement with no package")

    manifest_paths = {record["path"] for record in manifest["files"]}
    mapped_paths: list[str] = []
    for mapping in matrix["supportingMappings"]:
        source_paths = mapping.get("sourcePaths")
        if not isinstance(source_paths, list) or source_paths != sorted(source_paths):
            raise RuntimeError(f"supporting mapping paths must be sorted: {mapping.get('id')}")
        if not set(source_paths) <= manifest_paths:
            raise RuntimeError(f"supporting mapping references unfrozen source: {mapping.get('id')}")
        mapped_paths.extend(source_paths)
    if len(mapped_paths) != len(set(mapped_paths)):
        raise RuntimeError("supporting mappings must not duplicate source paths")
    if not set(CONTRACT_ROLES) <= set(mapped_paths):
        raise RuntimeError("supporting mappings omit an active contract file")


def verify_at(baseline_root: Path, matrix_path: Path) -> dict[str, Any]:
    manifest_path = baseline_root / "manifest.json"
    readme_path = baseline_root / "README.md"
    files_root = baseline_root / "files"
    manifest = read_canonical_json(manifest_path)
    records = verify_manifest_shape(manifest)

    members = list(baseline_root.rglob("*"))
    symlinks = sorted(
        path.relative_to(baseline_root).as_posix()
        for path in members
        if path.is_symlink()
    )
    if symlinks:
        raise RuntimeError(f"baseline contains symlinks: {symlinks}")
    actual_files = {
        path.relative_to(baseline_root).as_posix()
        for path in members
        if path.is_file()
    }
    actual_directories = {
        path.relative_to(baseline_root).as_posix()
        for path in members
        if path.is_dir()
    }
    expected_files, expected_directories = expected_baseline_entries(records)
    if actual_files != expected_files:
        raise RuntimeError(
            "baseline file inventory mismatch: "
            f"missing={sorted(expected_files - actual_files)} "
            f"extra={sorted(actual_files - expected_files)}"
        )
    if actual_directories != expected_directories:
        raise RuntimeError(
            "baseline directory inventory mismatch: "
            f"missing={sorted(expected_directories - actual_directories)} "
            f"extra={sorted(actual_directories - expected_directories)}"
        )

    for record in records:
        path_text = record["path"]
        target = local_path(files_root, path_text)
        if target.is_symlink() or not target.is_file():
            raise RuntimeError(f"baseline member must be a regular file: {path_text}")
        data = target.read_bytes()
        if len(data) != record["size"]:
            raise RuntimeError(f"size mismatch: {path_text}")
        if sha256(data) != record["sha256"]:
            raise RuntimeError(f"SHA-256 mismatch: {path_text}")
        if git_object_oid("blob", data) != record["blobOid"]:
            raise RuntimeError(f"blob OID mismatch: {path_text}")
        if filesystem_mode(target) != record["mode"]:
            raise RuntimeError(f"mode mismatch: {path_text}")

    tree_records = {record["skillId"]: record for record in manifest["skillTrees"]}
    for skill_id in SKILL_IDS:
        if compute_skill_tree_oid(skill_id, records) != tree_records[skill_id]["treeOid"]:
            raise RuntimeError(f"skill tree reconstruction mismatch: {skill_id}")

    inventory_authority = local_path(files_root, INVENTORY_AUTHORITY_PATH).read_bytes()
    parse_inventory_authority(inventory_authority)
    matrix = read_canonical_json(matrix_path)
    verify_migration_matrix(matrix, manifest)
    if readme_path.read_text(encoding="utf-8") != readme_text(manifest):
        raise RuntimeError("baseline README mismatch")
    return manifest


def write_evidence(
    baseline_root: Path,
    matrix_path: Path,
    manifest: dict[str, Any],
    blobs: dict[str, bytes],
) -> None:
    files_root = baseline_root / "files"
    for record in manifest["files"]:
        target = local_path(files_root, record["path"])
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(blobs[record["path"]])
        target.chmod(0o755 if record["mode"] == "100755" else 0o644)
    (baseline_root / "manifest.json").write_bytes(canonical_json_bytes(manifest))
    (baseline_root / "README.md").write_text(readme_text(manifest), encoding="utf-8")
    matrix_path.write_bytes(canonical_json_bytes(migration_matrix(manifest)))


def compare_existing(manifest: dict[str, Any], blobs: dict[str, bytes]) -> None:
    existing = verify_at(BASELINE_ROOT, MIGRATION_MATRIX_PATH)
    if existing != manifest:
        raise RuntimeError("existing baseline differs from pinned source objects")
    if README_PATH.read_text(encoding="utf-8") != readme_text(manifest):
        raise RuntimeError("existing README differs from generated evidence")
    if MIGRATION_MATRIX_PATH.read_bytes() != canonical_json_bytes(migration_matrix(manifest)):
        raise RuntimeError("existing migration matrix differs from generated evidence")
    for record in manifest["files"]:
        if local_path(FILES_ROOT, record["path"]).read_bytes() != blobs[record["path"]]:
            raise RuntimeError(f"existing frozen bytes differ: {record['path']}")


def build() -> None:
    manifest, blobs = collect_source()
    if BASELINE_ROOT.exists() or MIGRATION_MATRIX_PATH.exists():
        if not BASELINE_ROOT.is_dir() or not MIGRATION_MATRIX_PATH.is_file():
            raise RuntimeError("partial C8 source evidence already exists")
        compare_existing(manifest, blobs)
        print(
            "OK C8 source baseline unchanged: "
            f"{manifest['inventory']['skillCount']} skills, "
            f"{manifest['inventory']['fileCount']} files, "
            f"{manifest['aggregateDigest']}"
        )
        return

    temporary_parent = Path(
        tempfile.mkdtemp(prefix=".c8-source-baseline-", dir=RESEARCH_ROOT)
    )
    temporary_baseline = temporary_parent / "source-baseline"
    temporary_matrix = temporary_parent / "migration-matrix.json"
    try:
        write_evidence(temporary_baseline, temporary_matrix, manifest, blobs)
        verify_at(temporary_baseline, temporary_matrix)
        temporary_baseline.rename(BASELINE_ROOT)
        temporary_matrix.replace(MIGRATION_MATRIX_PATH)
    finally:
        if temporary_parent.exists():
            shutil.rmtree(temporary_parent)
    print(
        "OK built C8 source baseline: "
        f"{manifest['inventory']['skillCount']} skills, "
        f"{manifest['inventory']['fileCount']} files, "
        f"{manifest['aggregateDigest']}"
    )


def verify() -> None:
    manifest = verify_at(BASELINE_ROOT, MIGRATION_MATRIX_PATH)
    print(
        "OK verified C8 source baseline offline: "
        f"{manifest['inventory']['skillCount']} skills, "
        f"{manifest['inventory']['fileCount']} files, "
        f"{manifest['aggregateDigest']}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--verify",
        action="store_true",
        help="verify only frozen C8 evidence without reading the source repository",
    )
    args = parser.parse_args()
    if args.verify:
        verify()
    else:
        build()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
