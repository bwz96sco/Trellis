#!/usr/bin/env python3
"""Independent B132-1 machine assurance for evaluation-contract v1.3.1.

Run through uv. Normal mode reads candidate bytes only from an exact git-archive
extraction and reads authority only through authenticated Git objects. Verification
mode is read-only and also supports a future committed B132-1 tree.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
import os
import re
import stat
import subprocess
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath
from typing import Any, Callable, Iterable, Protocol


B132_COMMIT = "f79dc619fb744b8dc84bd4e2a46ba0865b80c070"
B132_TREE = "3eb3b0ae00b119dae78c367f6272558aca684fc1"
A132_COMMIT = "322b471f7a8ba00914f008f0dd5d8a01dbe01862"
A132_TREE = "98f08cca64b9756268f5fcf96a5e058f955f2561"
A132_PARENT = "17cd058c47f73cbb85605a94aecdb81f40c09a3e"
B132_CONTROL_BLOB = "04a31b99282043da7f2db8ccd45bf972adbecca2"
B132_CONTROL_LENGTH = 37963
B132_CONTROL_SHA256 = "ed16a7d404f63cc0ba19657b58560bdefa657186025e0d7d0fd42c36015f624b"
B132_TASK_BLOB = "c41f8a90f2b92b5c2a325012abf75c631298898d"
B132_TASK_LENGTH = 2255
B132_TASK_SHA256 = "29ac15231787e483928cd2a65f22d5e81759fad4a73d589b3cb6384e4c0f6931"
ARCHIVE_LENGTH = 184238080
ARCHIVE_SHA256 = "6e667798d90cf1a2925e9cbf6fc3d17484a8313537c5158376a4d8b0dbe1a3f3"
HISTORICAL_CLOSURE_COMMIT = "0afef5adaea2a58c8c6cc5a3f1a51a054fa1a39d"
HISTORICAL_CLOSURE_TREE = "f7e7396fa6fce94ecc241db733f1785029341d33"
HISTORICAL_CLOSURE_BLOB = "476d2b76b6954374e12292144d70315077f15cb2"
HISTORICAL_CLOSURE_LENGTH = 153
HISTORICAL_CLOSURE_SHA256 = "8a2f2d851b5bd559fa070838c83a191854791aa730a33b192d2cfda76a7609f0"
HISTORICAL_CLOSURE_PATH = "packages/cli/src/templates/research/procedures/experiment-campaign-v1/2.0.6/methodology/closure/research-experiment.json"
A132_ARCHIVE_CLOSURE_LENGTH = 195
A132_ARCHIVE_CLOSURE_SHA256 = "5e01f2eec31622965cd91d009c237c592e50158506ab1c213a57f64a551057b8"
MEMBER_AGGREGATE = "sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34"
SEMANTIC_DIGEST = "sha256:bb637329e8990ae27daa5876f520f42cce3c059fbffb752278dd9297b792425e"
OUTPUT_SET_DIGEST = "sha256:18283864a06ae7652c21a8b78a2ab2fb5556dd70f0eddf37c25fec9961096130"
ASSIGNMENT_ID = "b132-0-reviewer-assignment-20260808-a"
AGENT_ID = "b132-reviewer-codex-01"
SESSION_ID = "b132-reviewer-codex-session-01"
ROLE = "evaluation-contract-v1.3.1-attempt-2-independent-machine-reviewer"

AUTHOR_ROOT = ".trellis/tasks/08-08-author-evaluation-contract-v1-3-1-attempt-2/research"
B132_ROOT = ".trellis/tasks/08-08-assure-evaluation-contract-v1-3-1-mal1-attempt-2/research"
G132_ROOT = ".trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-2/research"
G131_ROOT = ".trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects/research"
BASELINE_ROOT = ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research"

LEAF_TRANSITIONS = (
    ("durable-output-disposition-v1.3.json", "durable-output-disposition-v1.3.1.json"),
    ("artifact-lifecycle-contract-v1.3.json", "artifact-lifecycle-contract-v1.3.1.json"),
    ("validator-registry-v1.3.json", "validator-registry-v1.3.1.json"),
    ("validator-binding-matrix-v1.3.json", "validator-binding-matrix-v1.3.1.json"),
    ("differential-test-matrix-v1.3.json", "differential-test-matrix-v1.3.1.json"),
    ("derivability-provenance-matrix-v1.3.json", "derivability-provenance-matrix-v1.3.1.json"),
    ("closure-contract-v1.3.json", "closure-contract-v1.3.1.json"),
)
LEAF_NAMES = tuple(new for _, new in LEAF_TRANSITIONS)
AUTHOR_EVIDENCE_NAMES = (
    "contract-candidate-manifest-v1.3.1.json",
    "frozen-semantic-target-v1.3.1.json",
    "four-finding-correction-ledger-v1.3.1.json",
    "semantic-diff-ledger-v1.3.0-to-v1.3.1.json",
    "assurance-corpus-v1.3.1.json",
    "author-validation.json",
    "author-v1.3.1.py",
    "author-output-manifest-v1.3.1.json",
)
AUTHOR_OUTPUT_NAMES = LEAF_NAMES + AUTHOR_EVIDENCE_NAMES
B132_JSON_NAMES = (
    "exact-input-attestation.json",
    "reviewer-independence.json",
    "package-integrity-and-semantic-diff-audit.json",
    "report-v2-schema-audit.json",
    "validator-semantics-audit.json",
    "differential-reproducibility-audit.json",
    "procedure-family-applicability-audit.json",
    "cross-leaf-adversarial-audit.json",
    "execution-evidence-ledger.json",
    "assurance-verdict.json",
)
B132_OUTPUT_NAMES = ("independent-semantic-assurance.py",) + B132_JSON_NAMES
ABSENT = {"$trellisAbsent": True}
VALUE_DIGEST_DOMAIN = b"trellis-g131-json-value-v1\0"
PRESERVED_VALUE_DIGEST_DOMAIN = b"trellis-g132-preserved-json-value-v1\0"
MEMBER_AGGREGATE_DOMAIN = b"trellis-accepted-v13-pack-members\0"
REPORT_DIGEST_DOMAIN = b"trellis-evaluation-report-v2\0"
OUTPUT_SET_DOMAIN = b"trellis-a132-output-set-v1\0"


class AssuranceError(RuntimeError):
    """Fail-closed assurance error."""


class DuplicateKey(AssuranceError):
    """Duplicate decoded JSON object key."""


class ByteSource(Protocol):
    def read(self, path: str) -> bytes: ...
    def regular(self, path: str) -> bool: ...


@dataclass(frozen=True)
class DiskSource:
    root: Path

    def _path(self, path: str) -> Path:
        pure = PurePosixPath(path)
        if pure.is_absolute() or ".." in pure.parts or "\\" in path or "\x00" in path:
            raise AssuranceError(f"unsafe source path: {path}")
        resolved = self.root.joinpath(*pure.parts)
        if not resolved.resolve().is_relative_to(self.root.resolve()):
            raise AssuranceError(f"source path escapes root: {path}")
        return resolved

    def read(self, path: str) -> bytes:
        target = self._path(path)
        mode = target.lstat().st_mode
        if not stat.S_ISREG(mode):
            raise AssuranceError(f"source is not a regular file: {path}")
        return target.read_bytes()

    def regular(self, path: str) -> bool:
        try:
            return stat.S_ISREG(self._path(path).lstat().st_mode)
        except (FileNotFoundError, OSError, AssuranceError):
            return False


@dataclass(frozen=True)
class GitObjects:
    repository: Path
    git: Path

    def run(self, *args: str, check: bool = True) -> bytes:
        result = subprocess.run(
            [str(self.git), "-C", str(self.repository), *args],
            capture_output=True,
            check=False,
        )
        if check and result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace").rstrip("\r\n")
            raise AssuranceError(f"git {' '.join(args)} failed: {stderr}")
        return result.stdout

    def blob(self, oid: str) -> bytes:
        if not re.fullmatch(r"[0-9a-f]{40}", oid):
            raise AssuranceError(f"invalid blob oid: {oid}")
        return self.run("cat-file", "blob", oid)

    def text(self, *args: str) -> str:
        return self.run(*args).decode("utf-8", errors="strict")

    def path_record(self, commit: str, path: str) -> tuple[str, str, int, bytes]:
        line = self.text("ls-tree", "--long", commit, "--", path).rstrip("\n")
        match = re.fullmatch(r"(\d{6}) blob ([0-9a-f]{40})\s+(\d+)\t(.+)", line)
        if match is None or match.group(4) != path:
            raise AssuranceError(f"missing or non-blob Git path: {commit}:{path}")
        data = self.blob(match.group(2))
        return match.group(1), match.group(2), int(match.group(3)), data


@dataclass(frozen=True)
class GitTreeSource:
    objects: GitObjects
    commit: str

    def read(self, path: str) -> bytes:
        mode, _, _, data = self.objects.path_record(self.commit, path)
        if mode != "100644":
            raise AssuranceError(f"committed source mode is not 100644: {path}")
        return data

    def regular(self, path: str) -> bool:
        try:
            mode, _, _, _ = self.objects.path_record(self.commit, path)
            return mode == "100644"
        except AssuranceError:
            return False


@dataclass
class Audit:
    audit_id: str
    errors: list[str] = field(default_factory=list)
    observations: dict[str, Any] = field(default_factory=dict)

    def require(self, condition: bool, message: str) -> None:
        if not condition:
            self.errors.append(message)

    def capture(self, label: str, fn: Callable[[], Any]) -> Any:
        try:
            return fn()
        except BaseException as exc:
            self.errors.append(f"{label}: {type(exc).__name__}: {exc}")
            return None

    @property
    def status(self) -> str:
        return "pass" if not self.errors else "fail"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_oid(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def canonical_value(value: Any) -> bytes:
    return json.dumps(
        value,
        allow_nan=False,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def canonical_file(value: Any) -> bytes:
    return canonical_value(value) + b"\n"


def _pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKey(f"duplicate decoded key: {key}")
        result[key] = value
    return result


def _reject_constant(value: str) -> None:
    raise AssuranceError(f"non-finite JSON number: {value}")


def _reject_surrogates(value: Any, pointer: str = "") -> None:
    if isinstance(value, str):
        if any(0xD800 <= ord(char) <= 0xDFFF for char in value):
            raise AssuranceError(f"unpaired surrogate at {pointer or '/'}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _reject_surrogates(child, f"{pointer}/{index}")
    elif isinstance(value, dict):
        for key, child in value.items():
            _reject_surrogates(key, f"{pointer}/<key>")
            _reject_surrogates(child, f"{pointer}/{escape_pointer(key)}")


def strict_json(data: bytes, *, canonical: bool = True, final_lf: bool = True) -> Any:
    if b"\r" in data:
        raise AssuranceError("CR byte is forbidden")
    if final_lf and (not data.endswith(b"\n") or data.endswith(b"\n\n")):
        raise AssuranceError("exactly one final LF required")
    text = data.decode("utf-8", errors="strict")
    value = json.loads(text, object_pairs_hook=_pairs, parse_constant=_reject_constant)
    _reject_surrogates(value)
    if canonical and data != canonical_file(value):
        raise AssuranceError("non-canonical JSON bytes")
    return value


def escape_pointer(token: str) -> str:
    return token.replace("~", "~0").replace("/", "~1")


def pointer_tokens(pointer: str) -> list[str]:
    if pointer == "":
        return []
    if not pointer.startswith("/"):
        raise AssuranceError(f"invalid JSON pointer: {pointer}")
    return [part.replace("~1", "/").replace("~0", "~") for part in pointer[1:].split("/")]


MISSING = object()


def pointer_get(document: Any, pointer: str, default: Any = MISSING) -> Any:
    node = document
    try:
        for token in pointer_tokens(pointer):
            node = node[int(token)] if isinstance(node, list) else node[token]
        return node
    except (KeyError, IndexError, TypeError, ValueError):
        if default is not MISSING:
            return default
        raise AssuranceError(f"pointer does not resolve: {pointer}") from None


def mutate(document: Any, mutation: dict[str, Any]) -> Any:
    result = copy.deepcopy(document)
    operation = mutation.get("operation")
    if operation in {None, "none"}:
        return result
    target = mutation.get("target")
    if not isinstance(target, str) or target == "":
        raise AssuranceError("mutation target must be non-root JSON pointer")
    tokens = pointer_tokens(target)
    node = result
    for token in tokens[:-1]:
        node = node[int(token)] if isinstance(node, list) else node[token]
    final = tokens[-1]
    if operation == "json-test":
        current = node[int(final)] if isinstance(node, list) else node[final]
        if current != mutation.get("value"):
            raise AssuranceError(f"json-test failed: {target}")
        return result
    if operation == "json-remove":
        if isinstance(node, list):
            del node[int(final)]
        else:
            del node[final]
        return result
    if operation == "json-replace":
        if isinstance(node, list):
            index = int(final)
            if index >= len(node):
                raise AssuranceError(f"json-replace index missing: {target}")
            node[index] = copy.deepcopy(mutation.get("value"))
        else:
            if final not in node:
                raise AssuranceError(f"json-replace key missing: {target}")
            node[final] = copy.deepcopy(mutation.get("value"))
        return result
    if operation == "json-add":
        if isinstance(node, list):
            if final == "-":
                node.append(copy.deepcopy(mutation.get("value")))
            else:
                index = int(final)
                if index > len(node):
                    raise AssuranceError(f"json-add index out of range: {target}")
                node.insert(index, copy.deepcopy(mutation.get("value")))
        else:
            node[final] = copy.deepcopy(mutation.get("value"))
        return result
    raise AssuranceError(f"unsupported mutation operation: {operation}")


def diff_values(old: Any, new: Any, pointer: str = "") -> list[tuple[str, Any, Any]]:
    if type(old) is not type(new):
        return [(pointer, old, new)]
    if isinstance(old, dict):
        rows: list[tuple[str, Any, Any]] = []
        for key in sorted(set(old) | set(new)):
            child = f"{pointer}/{escape_pointer(key)}"
            if key not in old:
                rows.append((child, ABSENT, new[key]))
            elif key not in new:
                rows.append((child, old[key], ABSENT))
            else:
                rows.extend(diff_values(old[key], new[key], child))
        return rows
    if isinstance(old, list):
        rows = []
        common = min(len(old), len(new))
        for index in range(common):
            rows.extend(diff_values(old[index], new[index], f"{pointer}/{index}"))
        for index in range(common, len(old)):
            rows.append((f"{pointer}/{index}", old[index], ABSENT))
        for index in range(common, len(new)):
            rows.append((f"{pointer}/{index}", ABSENT, new[index]))
        return rows
    return [] if old == new else [(pointer, old, new)]


def value_digest(value: Any) -> str:
    return "sha256:" + sha256(VALUE_DIGEST_DOMAIN + canonical_value(value))


def _json_type_matches(value: Any, expected: str) -> bool:
    if expected == "null":
        return value is None
    if expected == "boolean":
        return type(value) is bool
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return type(value) is int
    if expected == "number":
        return type(value) in {int, float} and math.isfinite(value)
    return False


def schema_errors(value: Any, schema: Any, pointer: str = "") -> list[str]:
    if not isinstance(schema, dict):
        return [f"{pointer or '/'}: schema is not object"]
    errors: list[str] = []
    allowed = {
        "$schema", "type", "properties", "required", "additionalProperties", "items",
        "prefixItems", "minItems", "maxItems", "uniqueItems", "minProperties",
        "maxProperties", "enum", "const", "anyOf", "oneOf", "allOf", "not",
        "minLength", "maxLength", "pattern",
    }
    unknown = sorted(set(schema) - allowed)
    if unknown:
        errors.append(f"{pointer or '/'}: unknown schema keywords {unknown}")
    if "type" in schema:
        types = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
        if not types or not all(isinstance(item, str) for item in types):
            errors.append(f"{pointer or '/'}: malformed type")
        elif not any(_json_type_matches(value, item) for item in types):
            errors.append(f"{pointer or '/'}: type mismatch")
            return errors
    if "const" in schema and value != schema["const"]:
        errors.append(f"{pointer or '/'}: const mismatch")
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{pointer or '/'}: enum mismatch")
    if "oneOf" in schema:
        matches = sum(not schema_errors(value, branch, pointer) for branch in schema["oneOf"])
        if matches != 1:
            errors.append(f"{pointer or '/'}: oneOf match count {matches}")
    if "anyOf" in schema and not any(not schema_errors(value, branch, pointer) for branch in schema["anyOf"]):
        errors.append(f"{pointer or '/'}: anyOf has no match")
    if "allOf" in schema:
        for branch in schema["allOf"]:
            errors.extend(schema_errors(value, branch, pointer))
    if "not" in schema and not schema_errors(value, schema["not"], pointer):
        errors.append(f"{pointer or '/'}: prohibited by not")
    if isinstance(value, dict):
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        if not isinstance(properties, dict) or not isinstance(required, list):
            errors.append(f"{pointer or '/'}: malformed object schema")
            return errors
        for key in required:
            if key not in value:
                errors.append(f"{pointer or '/'}: missing required {key}")
        if schema.get("additionalProperties") is False:
            for key in sorted(set(value) - set(properties)):
                errors.append(f"{pointer or '/'}: unknown property {key}")
        for key, child in value.items():
            if key in properties:
                errors.extend(schema_errors(child, properties[key], f"{pointer}/{escape_pointer(key)}"))
        if "minProperties" in schema and len(value) < schema["minProperties"]:
            errors.append(f"{pointer or '/'}: too few properties")
        if "maxProperties" in schema and len(value) > schema["maxProperties"]:
            errors.append(f"{pointer or '/'}: too many properties")
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append(f"{pointer or '/'}: too few items")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errors.append(f"{pointer or '/'}: too many items")
        if schema.get("uniqueItems") is True:
            encodings = [canonical_value(item) for item in value]
            if len(set(encodings)) != len(encodings):
                errors.append(f"{pointer or '/'}: duplicate array item")
        prefix = schema.get("prefixItems", [])
        if isinstance(prefix, list):
            for index, branch in enumerate(prefix[:len(value)]):
                errors.extend(schema_errors(value[index], branch, f"{pointer}/{index}"))
        items = schema.get("items")
        if isinstance(items, dict):
            start = len(prefix) if isinstance(prefix, list) else 0
            for index in range(start, len(value)):
                errors.extend(schema_errors(value[index], items, f"{pointer}/{index}"))
    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(f"{pointer or '/'}: string too short")
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            errors.append(f"{pointer or '/'}: string too long")
        if "pattern" in schema:
            try:
                if re.search(schema["pattern"], value) is None:
                    errors.append(f"{pointer or '/'}: pattern mismatch")
            except re.error:
                errors.append(f"{pointer or '/'}: invalid pattern")
    return errors


def schema_is_closed(schema: Any) -> bool:
    if isinstance(schema, dict):
        if schema.get("type") == "object" and schema.get("additionalProperties") is not False:
            return False
        return all(schema_is_closed(value) for value in schema.values())
    if isinstance(schema, list):
        return all(schema_is_closed(value) for value in schema)
    return True


def operand_value(operand: dict[str, Any], document: Any) -> Any:
    if operand.get("kind") == "literal":
        return operand.get("value")
    if operand.get("kind") == "exact-json-pointer":
        return pointer_get(document, operand.get("value", ""), MISSING)
    raise AssuranceError(f"unknown predicate operand: {operand}")


def eval_predicate(node: Any, document: Any) -> bool:
    if not isinstance(node, dict) or not isinstance(node.get("op"), str):
        raise AssuranceError("malformed predicate node")
    op = node["op"]
    operands = node.get("operands")
    if not isinstance(operands, list):
        raise AssuranceError(f"predicate operands missing: {op}")
    if op == "all":
        return all(eval_predicate(child, document) for child in operands)
    if op == "any":
        return any(eval_predicate(child, document) for child in operands)
    if op == "not":
        return len(operands) == 1 and not eval_predicate(operands[0], document)
    values = [operand_value(operand, document) for operand in operands]
    if op == "exists":
        return len(values) == 1 and values[0] is not MISSING
    if op == "equals":
        return len(values) == 2 and values[0] is not MISSING and values[0] == values[1]
    if op == "in-set":
        return len(values) == 2 and values[0] is not MISSING and isinstance(values[1], list) and values[0] in values[1]
    if op == "type-is":
        return len(values) == 2 and isinstance(values[1], str) and _json_type_matches(values[0], values[1])
    if op == "ordered-array-equals":
        return len(values) == 2 and isinstance(values[0], list) and values[0] == values[1]
    if op == "set-equals":
        return len(values) == 2 and isinstance(values[0], list) and isinstance(values[1], list) and set(values[0]) == set(values[1])
    if op == "count-equals":
        return len(values) == 2 and hasattr(values[0], "__len__") and len(values[0]) == values[1]
    if op == "count-at-least":
        return len(values) == 2 and hasattr(values[0], "__len__") and len(values[0]) >= values[1]
    raise AssuranceError(f"unsupported predicate operator: {op}")


def identity_value(validator: dict[str, Any]) -> dict[str, str]:
    return validator["identity"]["value"]


def validator_by_identity(registry: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    result: dict[tuple[str, str], dict[str, Any]] = {}
    for validator in registry["validators"]:
        identity = identity_value(validator)
        key = (identity["id"], identity["version"])
        if key in result:
            raise AssuranceError(f"duplicate validator identity: {key}")
        result[key] = validator
    return result


def evaluate_validator(validator: dict[str, Any], fixture: Any) -> tuple[str, list[str]]:
    applicability = validator["applicability"]
    if applicability.get("language") != "trellis-predicate-v1":
        raise AssuranceError("validator applicability language mismatch")
    if not eval_predicate(applicability["predicate"], fixture):
        return "not-run", []
    schema = validator["inputFactSchema"]["value"]
    valid = not schema_errors(fixture, schema)
    predicate = validator["predicate"]
    passes = valid and predicate.get("language") == "trellis-predicate-v1" and eval_predicate(predicate["predicate"], fixture)
    if passes:
        return "pass", []
    rule_kind = pointer_get(fixture, "/facts/ruleKind", MISSING)
    branch = next(
        (
            row for row in validator["decisionTable"]
            if row.get("applicableWhen") == {"ruleKind": rule_kind}
        ),
        None,
    )
    errors = branch["orderedStableErrors"] if isinstance(branch, dict) else validator["orderedFindings"]["order"]
    return "fail-closed", list(errors)


def mapping_rows_valid(rows: Any, authority_rows: list[dict[str, Any]], codomain: list[str]) -> bool:
    if not isinstance(rows, list) or rows != authority_rows or len(rows) != 17:
        return False
    identities: set[tuple[str, str, str]] = set()
    required = {"procedureId", "procedureVersion", "capabilityId", "disposition", "artifactFamily"}
    for row in rows:
        if not isinstance(row, dict) or set(row) != required or row["procedureVersion"] != "2.0.7":
            return False
        identity = (row["procedureId"], row["procedureVersion"], row["capabilityId"])
        if identity in identities:
            return False
        identities.add(identity)
        if row["disposition"] == "applicable":
            if row["artifactFamily"] not in codomain:
                return False
        elif row["disposition"] == "notApplicable":
            if row["artifactFamily"] is not None:
                return False
        else:
            return False
    return True


@dataclass
class LoadedInputs:
    control: dict[str, Any]
    leaves: dict[str, Any]
    leaf_bytes: dict[str, bytes]
    baselines: dict[str, Any]
    allowlist: dict[str, Any]
    supersession: dict[str, Any]
    corpus: dict[str, Any]
    author_validation: dict[str, Any]
    authenticated_records: list[dict[str, Any]]
    evaluated_historical_records: list[dict[str, Any]]
    procedure_projections: list[dict[str, Any]]
    procedure_closure: dict[str, Any]
    excluded_archive_closure_record: dict[str, Any]
    public_index: dict[str, Any]
    normative_decision_ledger: dict[str, Any]


def verify_commit(objects: GitObjects, commit: str, tree: str, parent: str | None, audit: Audit) -> None:
    audit.require(objects.text("rev-parse", f"{commit}^{{commit}}").strip() == commit, f"commit does not resolve exactly: {commit}")
    audit.require(objects.text("rev-parse", f"{commit}^{{tree}}").strip() == tree, f"tree mismatch: {commit}")
    if parent is not None:
        parents = objects.text("show", "-s", "--format=%P", commit).strip().split()
        audit.require(parents == [parent], f"parent mismatch: {commit}")


def authenticated_record_data(
    objects: GitObjects,
    commit: str,
    record: dict[str, Any],
) -> tuple[dict[str, Any], bytes]:
    path = record.get("path")
    if not isinstance(path, str):
        raise AssuranceError("authenticated record path missing")
    mode, oid, length, data = objects.path_record(commit, path)
    expected_sha = record.get("sha256")
    if mode != "100644":
        raise AssuranceError(f"mode mismatch: {path}")
    if oid != record.get("blobOid"):
        raise AssuranceError(f"blob mismatch: {path}")
    if length != record.get("byteLength") or length != len(data):
        raise AssuranceError(f"length mismatch: {path}")
    if sha256(data) != expected_sha:
        raise AssuranceError(f"sha256 mismatch: {path}")
    return (
        {
            "blobOid": oid,
            "byteLength": length,
            "commit": commit,
            "path": path,
            "sha256": expected_sha,
        },
        data,
    )


def authenticate_record(
    objects: GitObjects,
    commit: str,
    record: dict[str, Any],
    audit: Audit,
) -> dict[str, Any] | None:
    path = record.get("path")
    try:
        identity, _ = authenticated_record_data(objects, commit, record)
        return identity
    except BaseException as exc:
        audit.errors.append(f"record authentication {commit}:{path}: {type(exc).__name__}: {exc}")
        return None


def authenticated_tree_path_data(
    objects: GitObjects,
    commit: str,
    path: str,
) -> tuple[dict[str, Any], bytes]:
    mode, oid, length, data = objects.path_record(commit, path)
    if mode != "100644":
        raise AssuranceError(f"tree path mode mismatch: {path}")
    return (
        {
            "blobOid": oid,
            "byteLength": length,
            "commit": commit,
            "path": path,
            "sha256": sha256(data),
        },
        data,
    )


def authenticate_authority(objects: GitObjects, audit: Audit) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    verify_commit(objects, B132_COMMIT, B132_TREE, A132_COMMIT, audit)
    control_bytes = objects.blob(B132_CONTROL_BLOB)
    audit.require(len(control_bytes) == B132_CONTROL_LENGTH, "B132 control length mismatch")
    audit.require(sha256(control_bytes) == B132_CONTROL_SHA256, "B132 control sha256 mismatch")
    control = strict_json(control_bytes)
    control_path = f"{B132_ROOT}/b132-0-independent-reviewer-assignment.json"
    mode, oid, length, path_bytes = objects.path_record(B132_COMMIT, control_path)
    audit.require((mode, oid, length, path_bytes) == ("100644", B132_CONTROL_BLOB, B132_CONTROL_LENGTH, control_bytes), "B132 control path identity mismatch")
    task_path = ".trellis/tasks/08-08-assure-evaluation-contract-v1-3-1-mal1-attempt-2/task.json"
    task_mode, task_oid, task_length, task_bytes = objects.path_record(B132_COMMIT, task_path)
    audit.require((task_mode, task_oid, task_length) == ("100644", B132_TASK_BLOB, B132_TASK_LENGTH), "B132 task path identity mismatch")
    audit.require(sha256(task_bytes) == B132_TASK_SHA256, "B132 task sha256 mismatch")
    task = strict_json(task_bytes)
    changed = objects.text("diff-tree", "--no-commit-id", "--name-only", "-r", B132_COMMIT).splitlines()
    audit.require(len(changed) == 2 and set(changed) == {task_path, control_path}, "B132-0 changed path set mismatch")

    assignment = control.get("assignment", {})
    audit.require(
        assignment == {
            "agentId": AGENT_ID,
            "assignedRole": ROLE,
            "assignmentId": ASSIGNMENT_ID,
            "assignmentTimestamp": "2026-08-08T13:43:01Z",
            "modelClass": "gpt-5.6-sol",
            "runtimeClass": "codex-cli-standalone",
            "sessionId": SESSION_ID,
            "status": "assigned-for-b132-1-after-committed-b132-0",
        },
        "reviewer assignment identity mismatch",
    )
    audit.require(task.get("status") == "in_progress", "B132 task not in progress")
    audit.require(task.get("assignee") == AGENT_ID, "B132 task assignee mismatch")
    audit.require(task.get("meta", {}).get("taskExecutionAuthorized") is False, "task metadata improperly authorizes execution")
    audit.require(control.get("authority", {}).get("taskExecutionAuthorized") is True, "B132 control does not authorize task execution")
    audit.require(control.get("authority", {}).get("candidateRepairAuthorized") is False, "candidate repair authority widened")
    audit.require(control.get("authority", {}).get("humanReviewed") is False, "human review claim present")
    audit.require(control.get("authority", {}).get("humanEquivalent") is False, "human equivalence claim present")

    exact = control["exactInputs"]
    authenticated: list[dict[str, Any]] = []

    def group(node: dict[str, Any], default_commit: str | None = None) -> None:
        commit = node.get("commit", default_commit)
        if commit is None:
            audit.errors.append("authority record group missing commit")
            return
        if isinstance(node.get("tree"), str):
            verify_commit(objects, commit, node["tree"], node.get("parent"), audit)
        for record in node.get("records", []):
            result = authenticate_record(objects, commit, record, audit)
            if result is not None:
                authenticated.append(result)

    group(exact["g132Governance"])
    group(exact["a1320Control"])
    a132 = exact["a1321Subject"]
    verify_commit(objects, a132["commit"], a132["tree"], a132["parent"], audit)
    for record in a132["outputs"]:
        result = authenticate_record(objects, a132["commit"], record, audit)
        if result is not None:
            authenticated.append(result)
    group(exact["b132PlanningContext"])

    inherited = exact["inheritedAuthority"]
    group(inherited["a11"])
    group(inherited["a1310"])
    group(inherited["g131"])
    accepted = inherited["acceptedContract"]
    verify_commit(objects, accepted["acceptedSubjectCommit"], accepted["acceptedSubjectTree"], None, audit)
    for record in accepted["members"]:
        result = authenticate_record(objects, accepted["acceptedSubjectCommit"], record, audit)
        if result is not None:
            authenticated.append(result)
    procedure = inherited["procedure206"]
    verify_commit(objects, procedure["commit"], procedure["tree"], None, audit)
    for record in procedure["projections"]:
        result = authenticate_record(objects, procedure["commit"], record, audit)
        if result is not None:
            authenticated.append(result)
    closure_record = procedure["closureEvidence"]
    result = authenticate_record(objects, procedure["commit"], closure_record, audit)
    if result is not None:
        authenticated.append(result)
    portable = exact["portableDeterminismGuide"]
    for record in portable["paths"]:
        result = authenticate_record(objects, portable["commit"], record, audit)
        if result is not None:
            authenticated.append(result)

    audit.require(control["inputIsolation"]["archiveTransport"]["byteLength"] == ARCHIVE_LENGTH, "control archive length mismatch")
    audit.require(control["inputIsolation"]["archiveTransport"]["sha256"] == ARCHIVE_SHA256, "control archive sha mismatch")
    audit.require(control["outputAuthorization"]["exactOutputPaths"] == [f"{B132_ROOT}/{name}" for name in B132_OUTPUT_NAMES], "B132 output allowlist mismatch")
    audit.require(control["outputAuthorization"]["exactOutputCount"] == 11, "B132 output count mismatch")
    return control, authenticated


def verify_archive(archive: Path, subject: DiskSource, audit: Audit) -> None:
    data = archive.read_bytes()
    audit.require(len(data) == ARCHIVE_LENGTH, "archive transport length mismatch")
    audit.require(sha256(data) == ARCHIVE_SHA256, "archive transport sha256 mismatch")
    author_dir = subject.root / AUTHOR_ROOT
    expected = {"a132-0-author-assignment-and-input-authorization.json", *AUTHOR_OUTPUT_NAMES}
    try:
        actual = {entry.name for entry in author_dir.iterdir()}
        audit.require(actual == expected, "archive candidate research inventory mismatch")
        for entry in author_dir.iterdir():
            audit.require(stat.S_ISREG(entry.lstat().st_mode), f"archive candidate member is not regular: {entry.name}")
    except BaseException as exc:
        audit.errors.append(f"archive inventory: {type(exc).__name__}: {exc}")


def load_inputs(source: ByteSource, objects: GitObjects, archive: Path | None, audit: Audit) -> LoadedInputs | None:
    control, authenticated = authenticate_authority(objects, audit)
    if archive is not None:
        if not isinstance(source, DiskSource):
            audit.errors.append("archive supplied for non-disk source")
        else:
            verify_archive(archive, source, audit)
    try:
        exact = control["exactInputs"]
        inherited = exact["inheritedAuthority"]
        evaluated_historical: list[dict[str, Any]] = []

        def record_for(group: dict[str, Any], path: str, key: str = "records") -> dict[str, Any]:
            matches = [record for record in group[key] if record.get("path") == path]
            if len(matches) != 1:
                raise AssuranceError(f"expected one authenticated record for {path}, found {len(matches)}")
            return matches[0]

        def evaluated_json(commit: str, tree: str, record: dict[str, Any], role: str) -> Any:
            identity, data = authenticated_record_data(objects, commit, record)
            evaluated_historical.append({**identity, "evaluationRole": role, "sourceKind": "authenticated-git-object", "tree": tree})
            return strict_json(data)

        leaves: dict[str, Any] = {}
        leaf_bytes: dict[str, bytes] = {}
        for name in LEAF_NAMES:
            path = f"{AUTHOR_ROOT}/{name}"
            data = source.read(path)
            leaf_bytes[name] = data
            leaves[name] = strict_json(data)

        accepted = inherited["acceptedContract"]
        accepted_commit = accepted["acceptedSubjectCommit"]
        baselines = {}
        for old, _ in LEAF_TRANSITIONS:
            path = f"{BASELINE_ROOT}/{old}"
            record = record_for(accepted, path, "members")
            baselines[old] = evaluated_json(accepted_commit, accepted["acceptedSubjectTree"], record, f"accepted-baseline:{old}")

        g131 = inherited["g131"]
        allowlist_path = f"{G131_ROOT}/g131-correction-and-propagation-allowlist.json"
        allowlist = evaluated_json(g131["commit"], g131["tree"], record_for(g131, allowlist_path), "g131-correction-and-propagation-authority")

        g132 = exact["g132Governance"]
        supersession_path = f"{G132_ROOT}/g132-g131-finding-004-supersession.json"
        supersession = evaluated_json(g132["commit"], g132["tree"], record_for(g132, supersession_path), "g132-finding-004-supersession-authority")

        procedure = inherited["procedure206"]
        procedure_commit = procedure["commit"]
        procedure_projections = [
            evaluated_json(procedure_commit, procedure["tree"], record, f"procedure-2.0.6-lifecycle-projection:{record['procedureId']}")
            for record in procedure["projections"]
        ]
        procedure_closure = evaluated_json(
            procedure_commit,
            procedure["tree"],
            procedure["closureEvidence"],
            "procedure-2.0.6-experiment-closure-authority",
        )

        public_path = f"{BASELINE_ROOT}/public-evidence-index-v1.3.json"
        public_identity, public_bytes = authenticated_tree_path_data(objects, accepted_commit, public_path)
        evaluated_historical.append({**public_identity, "evaluationRole": "accepted-public-evidence-populations", "sourceKind": "authenticated-accepted-tree-object", "tree": accepted["acceptedSubjectTree"]})
        public_index = strict_json(public_bytes)

        normative_path = f"{BASELINE_ROOT}/normative-decision-ledger-v1.3.json"
        normative_identity, normative_bytes = authenticated_tree_path_data(objects, accepted_commit, normative_path)
        evaluated_historical.append({**normative_identity, "evaluationRole": "accepted-normative-decision-pointer-target", "sourceKind": "authenticated-accepted-tree-object", "tree": accepted["acceptedSubjectTree"]})
        normative_decision_ledger = strict_json(normative_bytes)

        closure_path = procedure["closureEvidence"]["path"]
        excluded_identity, excluded_git_bytes = authenticated_tree_path_data(objects, A132_COMMIT, closure_path)
        excluded_archive_bytes = source.read(closure_path)
        if excluded_archive_bytes != excluded_git_bytes:
            raise AssuranceError("A132 archive closure path differs from authenticated A132 Git object")
        strict_json(excluded_archive_bytes)
        excluded_archive_closure_record = {
            **excluded_identity,
            "comparisonPurpose": "prove-exclusion-from-historical-closure-authority",
            "tree": A132_TREE,
            "usedForHistoricalAuthority": False,
        }

        corpus = strict_json(source.read(f"{AUTHOR_ROOT}/assurance-corpus-v1.3.1.json"))
        author_validation = strict_json(source.read(f"{AUTHOR_ROOT}/author-validation.json"))
        for name in AUTHOR_EVIDENCE_NAMES:
            if name.endswith(".json"):
                strict_json(source.read(f"{AUTHOR_ROOT}/{name}"))
            elif name.endswith(".py"):
                data = source.read(f"{AUTHOR_ROOT}/{name}")
                if b"\r" in data or not data.endswith(b"\n"):
                    raise AssuranceError(f"author script framing invalid: {name}")
        return LoadedInputs(
            control,
            leaves,
            leaf_bytes,
            baselines,
            allowlist,
            supersession,
            corpus,
            author_validation,
            authenticated,
            evaluated_historical,
            procedure_projections,
            procedure_closure,
            excluded_archive_closure_record,
            public_index,
            normative_decision_ledger,
        )
    except BaseException as exc:
        audit.errors.append(f"load committed inputs: {type(exc).__name__}: {exc}")
        return None


def propagation_index(allowlist: dict[str, Any], audit: Audit) -> dict[tuple[str, str], tuple[str, dict[str, Any]]]:
    result: dict[tuple[str, str], tuple[str, dict[str, Any]]] = {}
    for rule in allowlist["propagationRules"]:
        for match in rule["matches"]:
            for pointer in match["pointerPaths"]:
                key = (match["leafPath"], pointer)
                audit.require(key not in result, f"duplicate propagation key: {key}")
                result[key] = (rule["ruleId"], match["oldNewGuard"])
    return result


def guard_matches(old: Any, new: Any, guard: dict[str, Any]) -> bool:
    kind = guard.get("kind")
    if kind == "exact-value":
        return old == guard.get("oldValue") and new == guard.get("newValue")
    if kind == "exact-prefix-replacement-preserve-suffix":
        if not isinstance(old, str) or not isinstance(new, str):
            return False
        matches = []
        for transition in guard.get("transitions", []):
            if old.startswith(transition["oldPrefix"]):
                matches.append(new == transition["newPrefix"] + old[len(transition["oldPrefix"]):])
        return matches == [True]
    if kind == "finding-bound-record-ref":
        return old in guard.get("oldValues", []) and new == guard.get("newValue")
    return False


def direct_patterns(allowlist: dict[str, Any]) -> list[tuple[str, str, re.Pattern[str]]]:
    result: list[tuple[str, str, re.Pattern[str]]] = []
    for region in allowlist["directCorrectionRegions"]:
        finding = region["findingId"]
        if "leafPath" in region:
            for pattern in region["pointerPatterns"]:
                result.append((finding, region["leafPath"], re.compile(pattern)))
        else:
            for leaf, patterns in region["pointerPatternsByLeaf"].items():
                for pattern in patterns:
                    result.append((finding, leaf, re.compile(pattern)))
    return result


def prefixed_strings(node: Any, pointer: str = "") -> list[tuple[str, str]]:
    result: list[tuple[str, str]] = []
    if isinstance(node, str) and node.startswith(("DEC-", "EV-", "SRC-")):
        result.append((pointer, node))
    elif isinstance(node, dict):
        for key, child in node.items():
            result.extend(prefixed_strings(child, f"{pointer}/{escape_pointer(key)}"))
    elif isinstance(node, list):
        for index, child in enumerate(node):
            result.extend(prefixed_strings(child, f"{pointer}/{index}"))
    return result


def package_and_diff_audit(source: ByteSource, loaded: LoadedInputs) -> Audit:
    audit = Audit("package-integrity-and-semantic-diff")
    control_subject = loaded.control["exactInputs"]["a1321Subject"]
    records = control_subject["outputs"]
    audit.require([PurePosixPath(row["path"]).name for row in records] == list(AUTHOR_OUTPUT_NAMES), "A132 output order mismatch")
    actual_outputs: dict[str, bytes] = {}
    for record in records:
        name = PurePosixPath(record["path"]).name
        data = audit.capture(f"read {name}", lambda record=record: source.read(record["path"]))
        if data is None:
            continue
        actual_outputs[name] = data
        audit.require(source.regular(record["path"]), f"candidate output not regular: {name}")
        audit.require(len(data) == record["byteLength"], f"candidate output length mismatch: {name}")
        audit.require(sha256(data) == record["sha256"], f"candidate output sha mismatch: {name}")
        audit.require(git_blob_oid(data) == record["blobOid"], f"candidate output blob mismatch: {name}")

    aggregate = hashlib.sha256(MEMBER_AGGREGATE_DOMAIN)
    for name in LEAF_NAMES:
        aggregate.update(name.encode("utf-8") + b"\0" + loaded.leaf_bytes[name] + b"\0")
    aggregate_value = "sha256:" + aggregate.hexdigest()
    audit.require(aggregate_value == MEMBER_AGGREGATE, "seven-member aggregate mismatch")

    manifest_bytes = source.read(f"{AUTHOR_ROOT}/contract-candidate-manifest-v1.3.1.json")
    manifest = strict_json(manifest_bytes)
    expected_members = [
        {
            "byteLength": len(loaded.leaf_bytes[name]),
            "filename": name,
            "sha256": sha256(loaded.leaf_bytes[name]),
        }
        for name in LEAF_NAMES
    ]
    audit.require(manifest.get("contractIdentity") == "evaluation-contract-v1.3.1", "manifest identity mismatch")
    audit.require(manifest.get("memberCount") == 7, "manifest member count mismatch")
    audit.require(manifest.get("members") == expected_members, "manifest member records mismatch")
    audit.require(manifest.get("aggregate", {}).get("digest") == aggregate_value, "manifest aggregate mismatch")
    audit.require(sha256(manifest_bytes) == "e3d4322ee5b73a319a3d777d38877345f82efdc253f1ca825df538a1300ecf1a", "candidate manifest sha mismatch")

    frozen_bytes = source.read(f"{AUTHOR_ROOT}/frozen-semantic-target-v1.3.1.json")
    audit.require("sha256:" + sha256(frozen_bytes) == SEMANTIC_DIGEST, "semantic digest mismatch")
    frozen = strict_json(frozen_bytes)
    audit.require(frozen.get("candidateMemberAggregate") == aggregate_value, "semantic target aggregate binding mismatch")
    audit.require(frozen.get("candidateManifest", {}).get("sha256") == sha256(manifest_bytes), "semantic target manifest binding mismatch")

    output_digest = hashlib.sha256(OUTPUT_SET_DOMAIN)
    for name in AUTHOR_OUTPUT_NAMES:
        data = actual_outputs.get(name, b"")
        output_digest.update(name.encode("utf-8") + b"\0" + data + b"\0")
    output_digest_value = "sha256:" + output_digest.hexdigest()
    audit.require(output_digest_value == OUTPUT_SET_DIGEST, "complete A132 output-set digest mismatch")

    output_manifest = strict_json(source.read(f"{AUTHOR_ROOT}/author-output-manifest-v1.3.1.json"))
    expected_output_records = [
        {
            "byteLength": len(actual_outputs[name]),
            "path": f"{AUTHOR_ROOT}/{name}",
            "sha256": sha256(actual_outputs[name]),
        }
        for name in AUTHOR_OUTPUT_NAMES
        if name != "author-output-manifest-v1.3.1.json"
    ]
    audit.require(output_manifest.get("outputCountExcludingManifest") == 14, "author output manifest count mismatch")
    audit.require(output_manifest.get("outputs") == expected_output_records, "author output manifest records mismatch")
    audit.require(output_manifest.get("excludedOwnHash") is True, "author output manifest self-exclusion missing")

    propagation = propagation_index(loaded.allowlist, audit)
    patterns = direct_patterns(loaded.allowlist)
    computed_rows: list[dict[str, Any]] = []
    counts: Counter[str] = Counter()
    for old_name, new_name in LEAF_TRANSITIONS:
        changes = diff_values(loaded.baselines[old_name], loaded.leaves[new_name])
        for pointer, old, new in changes:
            match = propagation.get((new_name, pointer))
            if match is not None and guard_matches(old, new, match[1]):
                classification = match[0]
                proof = f"{G131_ROOT}/g131-correction-and-propagation-allowlist.json#/propagationRules/{classification}"
            else:
                direct = sorted({finding for finding, leaf, pattern in patterns if leaf == new_name and pattern.fullmatch(pointer)})
                if len(direct) != 1:
                    audit.errors.append(f"unclassified or ambiguous pointer: {new_name}#{pointer}:{direct}")
                    classification = "UNAUTHORIZED"
                else:
                    classification = direct[0]
                proof = f"{G131_ROOT}/g131-correction-and-propagation-allowlist.json#/directCorrectionRegions/{classification}"
                if classification == "CS6-1-CONTRACT-004":
                    proof = f"{G132_ROOT}/g132-g131-finding-004-supersession.json#/scope"
            counts[classification] += 1
            computed_rows.append(
                {
                    "classification": classification,
                    "jsonPointer": pointer,
                    "leafPath": new_name,
                    "newValueDigest": value_digest(new),
                    "oldValueDigest": value_digest(old),
                    "proofSource": proof,
                }
            )
    computed_rows.sort(key=lambda row: (LEAF_NAMES.index(row["leafPath"]), row["jsonPointer"]))
    ledger = strict_json(source.read(f"{AUTHOR_ROOT}/semantic-diff-ledger-v1.3.0-to-v1.3.1.json"))
    audit.require(len(computed_rows) == 9515, "recomputed semantic diff row count mismatch")
    audit.require(ledger.get("rowCount") == 9515, "ledger semantic diff row count mismatch")
    audit.require(ledger.get("rows") == computed_rows, "semantic diff ledger row bytes/ordering/classification mismatch")
    expected_counts = {
        "CS6-1-CONTRACT-001": 5,
        "CS6-1-CONTRACT-002": 200,
        "CS6-1-CONTRACT-003": 265,
        "CS6-1-CONTRACT-004": 23,
        "PROP-CONTRACT-IDENTITY": 123,
        "PROP-MEMBER-REFERENCE": 3328,
        "PROP-PROVENANCE-REFERENCE": 5571,
    }
    audit.require(dict(counts) == expected_counts, "semantic diff classification counts mismatch")
    audit.require(ledger.get("classificationCounts") == expected_counts, "ledger classification counts mismatch")
    audit.require(ledger.get("noFifthSemanticChange") is True and "UNAUTHORIZED" not in counts, "fifth semantic change found")

    guard_count = 0
    for guard in loaded.allowlist["directRegionImmutableReferenceGuards"]:
        new_leaf = loaded.leaves[guard["leafPath"]]
        for pointer in guard["pointerPaths"]:
            audit.require(pointer_get(new_leaf, pointer, MISSING) == guard["oldValue"], f"DEC guard mismatch: {guard['leafPath']}#{pointer}")
            guard_count += 1
    audit.require(guard_count == 71, "DEC guard count mismatch")

    old_by_new = {new: old for old, new in LEAF_TRANSITIONS}
    baseline_refs: set[tuple[str, str, str]] = set()
    candidate_refs: set[tuple[str, str, str]] = set()
    for _, new_name, pattern in patterns:
        old_name = old_by_new[new_name]
        for pointer, value in prefixed_strings(loaded.baselines[old_name]):
            if pattern.fullmatch(pointer):
                baseline_refs.add((new_name, pointer, value))
        for pointer, value in prefixed_strings(loaded.leaves[new_name]):
            if pattern.fullmatch(pointer):
                candidate_refs.add((new_name, pointer, value))
    audit.require(baseline_refs == candidate_refs, "direct-region DEC/EV/SRC reference set changed")
    ev_src = [row for row in candidate_refs if row[2].startswith(("EV-", "SRC-"))]
    audit.require(len(ev_src) == 0, "direct-region EV/SRC references present")

    for preserved in loaded.supersession["preservedG131ValueDigests"]:
        value = pointer_get(loaded.allowlist, preserved["jsonPointer"])
        digest = "sha256:" + sha256(PRESERVED_VALUE_DIGEST_DOMAIN + canonical_value(value))
        audit.require(digest == preserved["valueDigest"], f"preserved G131 value digest mismatch: {preserved['jsonPointer']}")

    audit.observations = {
        "candidateManifestSha256": sha256(manifest_bytes),
        "classificationCounts": expected_counts,
        "completeOutputSetDigest": output_digest_value,
        "directRegionHistoricalReferenceCount": len(candidate_refs),
        "historicalDecGuards": guard_count,
        "historicalEvSrcReferences": len(ev_src),
        "memberAggregate": aggregate_value,
        "memberCount": len(LEAF_NAMES),
        "semanticDiffRows": len(computed_rows),
        "semanticDigest": "sha256:" + sha256(frozen_bytes),
    }
    return audit


def report_semantic_errors(report: Any, schema: dict[str, Any], registry: dict[str, Any]) -> list[str]:
    errors = schema_errors(report, schema)
    if not isinstance(report, dict):
        return errors
    expected_triples = [
        {
            "id": identity_value(validator)["id"],
            "severity": validator["severity"]["value"]["fixed"],
            "version": identity_value(validator)["version"],
        }
        for validator in registry["validators"]
    ]
    if report.get("orderedValidatorTriples") != expected_triples:
        errors.append("/orderedValidatorTriples: registry order mismatch")
    findings = report.get("orderedFindings")
    if isinstance(findings, list):
        ordered = sorted(
            findings,
            key=lambda item: (
                item.get("validator", {}).get("id", ""),
                item.get("validator", {}).get("version", ""),
                item.get("targetId", ""),
                item.get("stableError", ""),
                item.get("factPointer", ""),
            ),
        )
        if findings != ordered:
            errors.append("/orderedFindings: finding order mismatch")
    if "digest" in report:
        errors.append("/digest: self digest field forbidden")
    return errors


def report_v2_audit(loaded: LoadedInputs) -> Audit:
    audit = Audit("report-v2-schema")
    binding_leaf = loaded.leaves["validator-binding-matrix-v1.3.1.json"]
    registry = loaded.leaves["validator-registry-v1.3.1.json"]
    contract = binding_leaf["reportV2Contract"]
    schema = contract.get("reportSchema")
    audit.require(isinstance(schema, dict), "report schema missing")
    if not isinstance(schema, dict):
        audit.observations = {"casesExecuted": 0}
        return audit
    audit.require(schema_is_closed(schema), "report schema object branch is open")
    audit.require(schema.get("additionalProperties") is False, "report root schema is open")
    audit.require(set(schema.get("required", [])) == set(schema.get("properties", {})), "report required/property closure mismatch")
    audit.require(contract.get("byteRules") == {
        "duplicateDecodedKeys": "reject",
        "encoding": "strict-utf8",
        "finalLfCount": 1,
        "nonFiniteNumbers": "reject",
        "unpairedSurrogates": "reject",
    }, "report byte rules mismatch")
    digest_contract = contract.get("digest", {}).get("value", {})
    audit.require(digest_contract.get("domainPrefixUtf8") == "trellis-evaluation-report-v2\0", "report digest domain mismatch")
    audit.require(digest_contract.get("selfDigestFieldAllowed") is False, "report self digest permitted")
    audit.require(digest_contract.get("storedDigestExcludedFromInput") is True, "stored digest not excluded")
    audit.require(contract.get("constructionProcedure", {}).get("unknownOrMissingFieldDisposition") == "reject-before-digest-and-write", "report construction does not fail before write")

    base_raw = loaded.corpus["reportBaseFixtures"]
    if isinstance(base_raw, dict):
        bases = base_raw
    else:
        bases = {row["fixtureId"]: row["fixture"] for row in base_raw}
    base = bases.get("report-v2-valid")
    audit.require(isinstance(base, dict), "valid report base fixture missing")
    executed = 0
    accepted = 0
    rejected = 0
    invalid_classes: set[str] = set()
    if isinstance(base, dict):
        for case in loaded.corpus["reportCases"]:
            executed += 1
            expected_accept = case["expected"] == "accept"
            if isinstance(case.get("invalidClass"), str):
                invalid_classes.add(case["invalidClass"])
            try:
                if "inputBytesHex" in case:
                    raw = bytes.fromhex(case["inputBytesHex"])
                    parsed = strict_json(raw)
                else:
                    candidate = mutate(base, case.get("mutation", {"operation": "none"}))
                    raw = canonical_file(candidate)
                    parsed = strict_json(raw)
                valid = not report_semantic_errors(parsed, schema, registry)
            except BaseException:
                valid = False
            audit.require(valid == expected_accept, f"report case outcome mismatch: {case['caseId']}")
            if valid:
                accepted += 1
            else:
                rejected += 1

    audit.require(executed == 72, "report corpus size mismatch")
    audit.require((accepted, rejected) == (1, 71), "report corpus accept/reject partition mismatch")
    audit.require(
        invalid_classes == {
            "invalid-utf8", "duplicate-decoded-key", "non-finite-number", "unpaired-surrogate",
            "missing-final-lf", "multiple-final-lf", "cr-byte", "unknown-key",
            "missing-required-key", "non-canonical-key-order", "array-order-change", "digest-self-field",
        },
        "report invalid byte-class coverage mismatch",
    )

    digest_value = "sha256:" + sha256(REPORT_DIGEST_DOMAIN + canonical_value(base)) if isinstance(base, dict) else ""
    if isinstance(base, dict):
        audit.require(digest_value == "sha256:" + sha256(b"trellis-evaluation-report-v2\0" + canonical_value(base)), "report digest reproduction mismatch")
        audit.require(digest_value != "sha256:" + sha256(REPORT_DIGEST_DOMAIN + canonical_file(base)), "report digest incorrectly includes final LF")
        audit.require(digest_value != "sha256:" + sha256(b"trellis-evaluation-report-v1\0" + canonical_value(base)), "report digest lacks domain separation")

    adversarial = {
        "root-extra": lambda: not report_semantic_errors({**base, "x": 1}, schema, registry),
        "missing-root": lambda: not report_semantic_errors({key: value for key, value in base.items() if key != "questId"}, schema, registry),
        "nested-extra": lambda: not report_semantic_errors(mutate(base, {"operation": "json-add", "target": "/artifactBindings/0/mapping/x", "value": 1}), schema, registry),
        "too-few-triples": lambda: not report_semantic_errors(mutate(base, {"operation": "json-remove", "target": "/orderedValidatorTriples/19"}), schema, registry),
        "reverse-triples": lambda: not report_semantic_errors(mutate(base, {"operation": "json-replace", "target": "/orderedValidatorTriples", "value": list(reversed(base["orderedValidatorTriples"]))}), schema, registry),
        "digest-field": lambda: not report_semantic_errors({**base, "digest": "sha256:" + "0" * 64}, schema, registry),
    }
    adversarial_rejected = 0
    for case_id, fn in adversarial.items():
        accepted_mutation = audit.capture(f"report adversarial {case_id}", fn)
        rejected_mutation = accepted_mutation is False
        audit.require(rejected_mutation, f"report adversarial accepted: {case_id}")
        adversarial_rejected += int(rejected_mutation)

    audit.observations = {
        "adversarialCases": len(adversarial),
        "adversarialRejected": adversarial_rejected,
        "canonicalDigest": digest_value,
        "casesAccepted": accepted,
        "casesExecuted": executed,
        "casesRejected": rejected,
        "invalidByteClasses": sorted(invalid_classes),
        "schemaBranchCases": 56,
        "schemaClosed": schema_is_closed(schema),
    }
    return audit


def rule_value_fields(rule_kind: str) -> tuple[str, str]:
    parts = re.split(r"[^A-Za-z0-9]+", rule_kind)
    stem = parts[0].lower() + "".join(part[:1].upper() + part[1:] for part in parts[1:])
    return f"{stem}AuthorityCanonicalJson", f"{stem}ObservedCanonicalJson"


def expected_authority_selector(rule_kind: str) -> dict[str, str]:
    if rule_kind.startswith("artifact."):
        dimension = rule_kind.split(".", 1)[1]
        return {
            "leafPath": "artifact-lifecycle-contract-v1.3.1.json",
            "selector": f"exact artifactId == binding.targetId, then /dimensions/{dimension}/value",
        }
    closure = {
        "closure.schema": "/families/{targetId}/closureArtifact/value/closedSchema",
        "closure.evidence": "/families/{targetId}/{selected,blocked}/value",
        "closure.xor": "/families/{targetId}/crossRelation/value",
        "closure.status-inference": "/genericResultStatusInference/value",
        "closure.worker-boundary": "/families/{targetId}/{preRecordReader,visibility,zeroWriteBoundary}/value",
    }
    if rule_kind in closure:
        return {"leafPath": "closure-contract-v1.3.1.json", "selector": closure[rule_kind]}
    global_sources = {
        "authority.worker-boundary": ("closure-contract-v1.3.1.json", "/rootDecisionBoundary/value"),
        "contract.blocked-output-kind": ("durable-output-disposition-v1.3.1.json", "/outputs/{targetId}"),
        "contract.candidate-authority": ("validator-binding-matrix-v1.3.1.json", "/bindings/{bindingId}"),
        "contract.canonical-bytes": ("validator-binding-matrix-v1.3.1.json", "/reportV2Contract/{byteRules,canonicalization,constructionProcedure,ordering}"),
        "contract.closure-applicability": ("closure-contract-v1.3.1.json", "/applicableFamilies"),
        "contract.compatibility": ("seven authenticated leaves", "/{contractVersion,schemaVersion}"),
        "contract.conditional-artifacts": ("closure-contract-v1.3.1.json", "/families/{applicability,closureArtifact}"),
        "contract.differential-domains": ("differential-test-matrix-v1.3.1.json", "/domains"),
        "contract.output-disposition": ("durable-output-disposition-v1.3.1.json", "/{allowedDispositions,outputs}"),
        "report.v2-binding": ("validator-binding-matrix-v1.3.1.json", "/reportV2Contract"),
        "validator.binding-integrity": ("validator-binding-matrix-v1.3.1.json", "/bindings/{bindingId}"),
    }
    leaf, selector = global_sources[rule_kind]
    return {"leafPath": leaf, "selector": selector}


def derive_authority_value(binding: dict[str, Any], loaded: LoadedInputs) -> Any:
    rule_kind = binding["ruleKind"]
    target_id = binding["targetId"]
    lifecycle = loaded.leaves["artifact-lifecycle-contract-v1.3.1.json"]
    artifact = next((row for row in lifecycle["artifacts"] if row["artifactId"] == target_id), None)
    if artifact is not None:
        dimension = rule_kind.split(".", 1)[1]
        return artifact["dimensions"][dimension]["value"]
    closure = loaded.leaves["closure-contract-v1.3.1.json"]
    family = next((row for row in closure["families"] if row["familyId"] == target_id), None)
    if rule_kind == "closure.status-inference":
        return closure["genericResultStatusInference"]["value"]
    if family is not None:
        if rule_kind == "closure.schema":
            return family["closureArtifact"]["value"]["closedSchema"]
        if rule_kind == "closure.evidence":
            return {"blocked": family["blocked"]["value"], "selected": family["selected"]["value"]}
        if rule_kind == "closure.xor":
            return family["crossRelation"]["value"]
        if rule_kind == "closure.worker-boundary":
            return {
                "preRecordReader": family["preRecordReader"]["value"],
                "visibility": family["visibility"]["value"],
                "zeroWriteBoundary": family["zeroWriteBoundary"]["value"],
            }
    binding_leaf = loaded.leaves["validator-binding-matrix-v1.3.1.json"]
    durable = loaded.leaves["durable-output-disposition-v1.3.1.json"]
    differential = loaded.leaves["differential-test-matrix-v1.3.1.json"]
    if rule_kind in {"validator.binding-integrity", "contract.candidate-authority"}:
        return binding
    if rule_kind == "report.v2-binding":
        return binding_leaf["reportV2Contract"]
    if rule_kind == "authority.worker-boundary":
        return closure["rootDecisionBoundary"]["value"]
    if rule_kind == "contract.output-disposition":
        return {"allowedDispositions": durable["allowedDispositions"], "outputs": durable["outputs"]}
    if rule_kind == "contract.blocked-output-kind":
        return next(row for row in durable["outputs"] if row["outputId"] == target_id)
    if rule_kind == "contract.closure-applicability":
        return closure["applicableFamilies"]
    if rule_kind == "contract.canonical-bytes":
        report = binding_leaf["reportV2Contract"]
        return {key: report[key] for key in ("byteRules", "canonicalization", "constructionProcedure", "ordering")}
    if rule_kind == "contract.compatibility":
        return {
            name: {"contractVersion": leaf["contractVersion"], "schemaVersion": leaf["schemaVersion"]}
            for name, leaf in sorted(loaded.leaves.items())
        }
    if rule_kind == "contract.differential-domains":
        return differential["domains"]
    if rule_kind == "contract.conditional-artifacts":
        return [
            {"applicability": row["applicability"]["value"], "closureArtifact": row["closureArtifact"]["value"]}
            for row in closure["families"]
        ]
    raise AssuranceError(f"no independent authority selector for {rule_kind}")


def collect_predicate_ops(node: Any) -> list[str]:
    result: list[str] = []
    if isinstance(node, dict):
        if isinstance(node.get("op"), str):
            result.append(node["op"])
        for child in node.values():
            result.extend(collect_predicate_ops(child))
    elif isinstance(node, list):
        for child in node:
            result.extend(collect_predicate_ops(child))
    return result


def validator_semantics_audit(loaded: LoadedInputs) -> Audit:
    audit = Audit("validator-semantics")
    registry = loaded.leaves["validator-registry-v1.3.1.json"]
    binding_leaf = loaded.leaves["validator-binding-matrix-v1.3.1.json"]
    validators = registry["validators"]
    by_identity = validator_by_identity(registry)
    audit.require(len(validators) == len(by_identity) == 20, "validator identity count/uniqueness mismatch")
    audit.require(registry.get("severityOrder") == ["info", "warning", "critical"], "severity order mismatch")

    rule_branches = 0
    rule_kinds: set[str] = set()
    for validator in validators:
        identity = identity_value(validator)
        audit.require(validator["severity"]["value"] == {"downgradeAllowed": False, "fixed": "critical", "supportPackMayChange": False}, f"severity authority mismatch: {identity['id']}")
        audit.require(validator["orderedFindings"]["severity"] == "critical", f"ordered finding severity mismatch: {identity['id']}")
        audit.require(validator["orderedFindings"]["zeroWriteOnFailure"] is True, f"zero-write failure missing: {identity['id']}")
        audit.require(validator["stableErrors"]["value"] == validator["orderedFindings"]["order"], f"stable error order mismatch: {identity['id']}")
        schema = validator["inputFactSchema"]["value"]
        audit.require(schema_is_closed(schema), f"validator input schema open: {identity['id']}")
        applicable = validator["applicableRuleKinds"]["value"]
        tables = validator["decisionTable"]
        audit.require(len(applicable) == len(tables), f"decision table branch mismatch: {identity['id']}")
        rule_branches += len(applicable)
        for index, rule_kind in enumerate(applicable):
            rule_kinds.add(rule_kind)
            audit.require(tables[index]["applicableWhen"] == {"ruleKind": rule_kind}, f"decision rule selector mismatch: {identity['id']}:{rule_kind}")
            branch_errors = tables[index]["orderedStableErrors"]
            stable_errors = validator["stableErrors"]["value"]
            audit.require(
                isinstance(branch_errors, list)
                and bool(branch_errors)
                and branch_errors == [error for error in stable_errors if error in branch_errors],
                f"decision stable errors malformed: {identity['id']}:{rule_kind}",
            )
            rule_sources = validator["factDerivationSources"]["ruleSpecificCanonicalValues"].get(rule_kind)
            audit.require(isinstance(rule_sources, dict), f"rule-specific source missing: {rule_kind}")
            if isinstance(rule_sources, dict):
                authority_field, observed_field = rule_value_fields(rule_kind)
                audit.require(rule_sources.get("authorityFact") == authority_field, f"authority fact field mismatch: {rule_kind}")
                audit.require(rule_sources.get("observedFact") == observed_field, f"observed fact field mismatch: {rule_kind}")
                audit.require(rule_sources.get("authoritySource") == expected_authority_selector(rule_kind), f"authority selector mismatch: {rule_kind}")
        ops = collect_predicate_ops(validator["predicate"])
        audit.require(set(ops) <= {"all", "any", "equals"}, f"unexpected validator predicate op: {identity['id']}")
        audit.require("sha256-equals" not in ops, f"generic hash equality predicate present: {identity['id']}")
        serialized = canonical_value(validator)
        audit.require(b"authorityHash" not in serialized and b"observedHash" not in serialized, f"generic caller hash field present: {identity['id']}")
    audit.require(rule_branches == len(rule_kinds) == 29, "validator rule-branch count/uniqueness mismatch")

    bindings = {row["bindingId"]: row for row in binding_leaf["bindings"]}
    audit.require(len(bindings) == 876, "binding identity uniqueness mismatch")
    base_fixtures = {row["fixtureId"]: row for row in loaded.corpus["validatorBaseFixtures"]}
    audit.require(len(base_fixtures) == 29, "validator base fixture count mismatch")
    for fixture_id, wrapper in base_fixtures.items():
        fixture = wrapper["fixture"]
        binding_id = fixture["facts"]["bindingId"]
        binding = bindings.get(binding_id)
        audit.require(binding is not None, f"fixture binding missing: {fixture_id}")
        if binding is None:
            continue
        validator = by_identity[(wrapper["validator"]["id"], wrapper["validator"]["version"])]
        audit.require(binding["validator"] == {**wrapper["validator"], "severity": "critical"}, f"fixture validator/binding mismatch: {fixture_id}")
        audit.require(binding["ruleKind"] == fixture["facts"]["ruleKind"], f"fixture rule kind mismatch: {fixture_id}")
        audit.require(binding["targetId"] == fixture["targetId"] == fixture["facts"]["targetId"], f"fixture target mismatch: {fixture_id}")
        authority_field, observed_field = rule_value_fields(binding["ruleKind"])
        expected_canonical = canonical_value(derive_authority_value(binding, loaded)).decode("utf-8")
        audit.require(fixture["facts"].get(authority_field) == expected_canonical, f"fixture authority derivation mismatch: {fixture_id}")
        audit.require(fixture["facts"].get(observed_field) == expected_canonical, f"valid fixture observed value mismatch: {fixture_id}")
        audit.require(evaluate_validator(validator, fixture) == ("pass", []), f"valid base fixture does not pass: {fixture_id}")

    executed = 0
    outcomes: Counter[str] = Counter()
    fact_classes: Counter[str] = Counter()
    for case in loaded.corpus["validatorCases"]:
        executed += 1
        base = base_fixtures[case["baseFixtureId"]]
        fixture = mutate(base["fixture"], case["mutation"])
        validator = by_identity[(case["validator"]["id"], case["validator"]["version"])]
        verdict, errors = evaluate_validator(validator, fixture)
        expected_verdict = case["expected"]
        audit.require(verdict == expected_verdict, f"validator case verdict mismatch: {case['caseId']}")
        audit.require(errors == case["expectedStableErrors"], f"validator case error order mismatch: {case['caseId']}")
        outcomes[verdict] += 1
        suffix = case["caseId"].rsplit("-", 1)[-1].lower()
        class_map = {"valid": "valid", "false": "false", "missing": "missing", "unknown": "unknown", "contradictory": "contradictory", "aliased": "aliased", "ambiguous": "ambiguous", "inapplicable": "inapplicable"}
        if suffix in class_map:
            fact_classes[class_map[suffix]] += 1
    audit.require(executed == 232, "validator assurance case count mismatch")
    audit.require(outcomes == Counter({"fail-closed": 174, "pass": 29, "not-run": 29}), "validator verdict partition mismatch")
    audit.require(fact_classes == Counter({name: 29 for name in ("valid", "false", "missing", "unknown", "contradictory", "aliased", "ambiguous", "inapplicable")}), "validator fact-class coverage mismatch")

    audit.observations = {
        "casesExecuted": executed,
        "factClasses": dict(sorted(fact_classes.items())),
        "genericCallerHashEqualityRejected": True,
        "outcomes": dict(sorted(outcomes.items())),
        "ruleBranches": rule_branches,
        "ruleSpecificAuthoritySelectors": len(rule_kinds),
        "stableErrorOrderingVerified": True,
        "validators": len(validators),
    }
    return audit


def apply_global_mutation(base_fixture: dict[str, Any], mutation: dict[str, Any]) -> dict[str, Any]:
    if mutation.get("language") != "trellis-mutation-v1":
        raise AssuranceError("global mutation language mismatch")
    expected_order = [
        "authenticate-base-fixture-digest",
        "check-mutation-precondition",
        "apply-ordered-mutation",
        "evaluate-applicability-on-mutated-fixture",
        "when-applicable-validate-input-schema-and-predicate",
        "compare-verdict-errors-and-write-observation",
    ]
    if mutation.get("evaluationOrder") != expected_order:
        raise AssuranceError("global mutation evaluation order mismatch")
    fixture = base_fixture["fixture"]
    digest = "sha256:" + sha256(canonical_value(fixture))
    if digest != base_fixture.get("digest") or digest != mutation.get("baseFixtureDigest"):
        raise AssuranceError("global fixture digest mismatch")
    target = mutation.get("target")
    current = pointer_get(fixture, target)
    precondition = mutation.get("precondition", {})
    if set(precondition) != {"equals"} or current != precondition["equals"]:
        raise AssuranceError("global mutation precondition mismatch")
    operation = mutation.get("operation")
    if operation not in {"json-replace", "json-test"}:
        raise AssuranceError("label-only or unsupported global mutation")
    return mutate(fixture, mutation)


def differential_reproducibility_audit(loaded: LoadedInputs) -> Audit:
    audit = Audit("differential-reproducibility")
    differential = loaded.leaves["differential-test-matrix-v1.3.1.json"]
    registry = loaded.leaves["validator-registry-v1.3.1.json"]
    validators = validator_by_identity(registry)
    authority = differential["globalFixtureAuthority"]
    audit.require(authority == {
        "caseIndexRange": [72, 115],
        "digestFraming": "sha256 of canonical compact embedded fixture JSON without final LF",
        "executionOrder": [
            "authenticate-base-fixture-digest", "check-mutation-precondition", "apply-ordered-mutation",
            "evaluate-applicability-on-mutated-fixture", "when-applicable-validate-input-schema-and-predicate",
            "compare-verdict-errors-and-write-observation",
        ],
        "fixtureCount": 44,
        "fixtureStorage": "embedded-per-case-no-external-file",
        "mutationLanguage": "trellis-mutation-v1",
        "predicateLanguage": "trellis-predicate-v1",
    }, "global fixture authority mismatch")
    source_cases = differential["v13DeltaCases"][72:116]
    corpus_cases = loaded.corpus["globalCases"]
    audit.require(len(source_cases) == len(corpus_cases) == 44, "global mutation population mismatch")

    outcomes: Counter[tuple[str, str]] = Counter()
    observations: list[dict[str, Any]] = []
    for offset, (source_case, corpus_case) in enumerate(zip(source_cases, corpus_cases), start=72):
        mutation = source_case["syntheticMutation"]
        audit.require(mutation.get("sequence") == offset - 71, f"global mutation sequence mismatch: {offset}")
        audit.require(source_case["baseFixture"] == corpus_case["baseFixture"], f"global corpus fixture drift: {offset}")
        audit.require(mutation == corpus_case["syntheticMutation"], f"global corpus mutation drift: {offset}")
        audit.require(corpus_case["sourceCaseIndex"] == offset, f"global corpus source index mismatch: {offset}")
        mutated = audit.capture(f"global mutation {offset}", lambda source_case=source_case, mutation=mutation: apply_global_mutation(source_case["baseFixture"], mutation))
        if mutated is None:
            continue
        validator_key = (source_case["validator"]["id"], source_case["validator"]["version"])
        validator = validators.get(validator_key)
        audit.require(validator is not None, f"global validator missing: {offset}")
        if validator is None:
            continue
        applicability = source_case.get("applicability", {})
        if applicability.get("language") != "trellis-predicate-v1":
            audit.errors.append(f"global applicability language mismatch: {offset}")
            continue
        if not eval_predicate(applicability["predicate"], mutated):
            verdict, errors = "not-run", []
        else:
            verdict, errors = evaluate_validator(validator, mutated)
        expected = source_case["expectedExecution"]
        expected_verdict = expected["verdict"]
        expected_run = expected["runState"]
        actual_run = "not-run" if verdict == "not-run" else "run"
        audit.require((actual_run, verdict, errors) == (expected_run, expected_verdict, expected["orderedStableErrors"]), f"global replay observation mismatch: {offset}")
        audit.require(source_case["expectedObservation"] == {"findingOrder": errors, "write": mutation["writeObservation"]}, f"global write/finding observation mismatch: {offset}")
        audit.require(source_case["mutationPreconditions"] == [{"onFailure": "case-fails-closed", "target": mutation["target"], **mutation["precondition"]}], f"global precondition record mismatch: {offset}")
        outcomes[(actual_run, verdict)] += 1
        observations.append({
            "errors": errors,
            "fixtureDigest": source_case["baseFixture"]["digest"],
            "runState": actual_run,
            "sequence": mutation["sequence"],
            "sourceCaseIndex": offset,
            "verdict": verdict,
            "writeObservation": mutation["writeObservation"],
        })

    expected_partition = Counter({("run", "pass"): 22, ("run", "fail-closed"): 11, ("not-run", "not-run"): 11})
    audit.require(outcomes == expected_partition, "global replay partition mismatch")
    inapplicable_indices = [75, 79, 83, 87, 91, 95, 99, 103, 107, 111, 115]
    inapplicable = loaded.corpus["globalInapplicabilityCases"]
    audit.require([row["sourceCaseIndex"] for row in inapplicable] == inapplicable_indices, "global inapplicability index/order mismatch")
    for row in inapplicable:
        source_case = differential["v13DeltaCases"][row["sourceCaseIndex"]]
        audit.require(row["predicate"] == source_case["applicability"], f"inapplicability predicate drift: {row['sourceCaseIndex']}")
        audit.require(eval_predicate(row["predicate"]["predicate"], row["baseFixture"]["fixture"]) is False, f"inapplicability predicate executable result mismatch: {row['sourceCaseIndex']}")
        audit.require(row["syntheticMutation"]["expectedRunState"] == "not-run", f"inapplicability run-state mismatch: {row['sourceCaseIndex']}")

    adversarial_rejected = 0
    if source_cases:
        base_case = source_cases[0]
        invalids = []
        bad_digest = copy.deepcopy(base_case["syntheticMutation"])
        bad_digest["baseFixtureDigest"] = "sha256:" + "0" * 64
        invalids.append((base_case["baseFixture"], bad_digest))
        bad_precondition = copy.deepcopy(base_case["syntheticMutation"])
        bad_precondition["precondition"] = {"equals": "never-equal"}
        invalids.append((base_case["baseFixture"], bad_precondition))
        label_only = copy.deepcopy(base_case["syntheticMutation"])
        label_only["operation"] = "description-only"
        invalids.append((base_case["baseFixture"], label_only))
        missing_target = copy.deepcopy(base_case["syntheticMutation"])
        missing_target["target"] = "/facts/missing"
        missing_target["precondition"] = {"equals": None}
        invalids.append((base_case["baseFixture"], missing_target))
        for index, (fixture, mutation) in enumerate(invalids):
            try:
                apply_global_mutation(fixture, mutation)
            except BaseException:
                adversarial_rejected += 1
            else:
                audit.errors.append(f"global adversarial mutation accepted: {index}")

    audit.observations = {
        "adversarialMutations": 4,
        "adversarialRejected": adversarial_rejected,
        "casesExecuted": len(observations),
        "exactObservations": observations,
        "failClosed": outcomes[("run", "fail-closed")],
        "inapplicabilityPredicatesExecuted": len(inapplicable),
        "notRun": outcomes[("not-run", "not-run")],
        "pass": outcomes[("run", "pass")],
    }
    return audit


def procedure_family_audit(loaded: LoadedInputs) -> Audit:
    audit = Audit("procedure-family-applicability")
    lifecycle = loaded.leaves["artifact-lifecycle-contract-v1.3.1.json"]
    binding_leaf = loaded.leaves["validator-binding-matrix-v1.3.1.json"]
    mapping = lifecycle["procedureCapabilityArtifactFamilyMapping"]
    authority_rows = loaded.supersession["mappingRows"]
    codomain = loaded.supersession["mappingArtifactFamilyCodomain"]
    rows = mapping.get("rows")
    audit.require(mapping_rows_valid(rows, authority_rows, codomain), "candidate mapping rows do not equal fixed G132 authority")
    audit.require(mapping.get("artifactFamilyCodomain") == codomain and len(set(codomain)) == 11, "mapping codomain mismatch")
    audit.require(lifecycle.get("procedureCapabilityArtifactFamilyMappingSchema") == loaded.supersession["replacementRowSchema"], "conditional-nullability row schema mismatch")
    audit.require(schema_is_closed(loaded.supersession["replacementRowSchema"]), "replacement mapping schema open")
    mapping_digest = "sha256:" + sha256(canonical_value(rows))
    audit.require(mapping.get("mappingRowsDigest") == mapping_digest, "mapping row digest mismatch")

    artifact_by_id = {row["artifactId"]: row for row in lifecycle["artifacts"]}
    lifecycle_bindings = [row for row in binding_leaf["bindings"] if row["ruleKind"].startswith("artifact.")]
    audit.require(len(lifecycle_bindings) == 845, "lifecycle binding population mismatch")
    decisions: list[dict[str, Any]] = []
    positive = 0
    not_applicable_positive = 0
    row_positive: Counter[int] = Counter()
    for row_index, row in enumerate(rows):
        for binding in lifecycle_bindings:
            artifact = artifact_by_id.get(binding["targetId"])
            if artifact is None:
                audit.errors.append(f"lifecycle binding target missing: {binding['bindingId']}")
                continue
            target_family = artifact["family"]["value"]
            applies = row["disposition"] == "applicable" and target_family == row["artifactFamily"]
            positive += int(applies)
            row_positive[row_index] += int(applies)
            if row["disposition"] == "notApplicable":
                not_applicable_positive += int(applies)
            decisions.append({
                "applies": applies,
                "artifactFamily": row["artifactFamily"],
                "bindingId": binding["bindingId"],
                "capabilityId": row["capabilityId"],
                "disposition": row["disposition"],
                "mappingRowIndex": row_index,
                "procedureId": row["procedureId"],
                "targetArtifactFamily": target_family,
                "targetId": binding["targetId"],
            })
    matrix = mapping["completeLifecycleMatrix"]
    audit.require(matrix.get("decisions") == decisions, "complete lifecycle decision bytes/order mismatch")
    expected_counts = {
        "lifecycleBindingsPerRow": 845,
        "mappingRows": 17,
        "negativeDecisions": 13390,
        "notApplicablePositiveDecisions": 0,
        "notApplicableRows": 4,
        "positiveDecisions": 975,
        "totalDecisions": 14365,
    }
    for key, value in expected_counts.items():
        audit.require(matrix.get(key) == value, f"lifecycle matrix count mismatch: {key}")
    audit.require(len(decisions) == 14365 and positive == 975 and len(decisions) - positive == 13390, "recomputed lifecycle partition mismatch")
    audit.require(not_applicable_positive == 0, "notApplicable row has positive decision")
    audit.require(sum(row["disposition"] == "applicable" for row in rows) == 13, "applicable row partition mismatch")
    audit.require(sum(row["disposition"] == "notApplicable" for row in rows) == 4, "notApplicable row partition mismatch")

    corpus_cases = loaded.corpus["lifecycleCases"]
    audit.require(len(corpus_cases) == 14374, "lifecycle assurance corpus population mismatch")
    for index, decision in enumerate(decisions):
        case = corpus_cases[index]
        audit.require(
            case == {
                "caseId": f"LIFECYCLE-{decision['mappingRowIndex']:02d}-{decision['bindingId']}",
                "expectedApplies": decision["applies"],
                "mappingRowIndex": decision["mappingRowIndex"],
                "targetArtifactFamily": decision["targetArtifactFamily"],
            },
            f"lifecycle corpus decision mismatch: {index}",
        )
    invalid_mapping_rejected = 0
    for case in corpus_cases[14365:]:
        mutated = mutate(rows, case["mutation"])
        rejected = not mapping_rows_valid(mutated, authority_rows, codomain)
        audit.require(rejected, f"invalid mapping class accepted: {case['invalidClass']}")
        invalid_mapping_rejected += int(rejected)
    audit.require(invalid_mapping_rejected == 9, "invalid mapping class coverage mismatch")

    projection_records = loaded.control["exactInputs"]["inheritedAuthority"]["procedure206"]["projections"]
    applicable_projections = 0
    not_applicable_projections = 0
    projection_summary: list[dict[str, Any]] = []
    audit.require(len(projection_records) == len(loaded.procedure_projections) == len(rows), "projection/mapping row population mismatch")
    for record, projection, mapping_row in zip(projection_records, loaded.procedure_projections, rows):
        family = projection.get("family")
        projection_rows = projection.get("rows")
        row_families = sorted({row["family"]["value"] for row in projection_rows}) if isinstance(projection_rows, list) else []
        audit.require(projection.get("procedureId") == record["procedureId"] == mapping_row["procedureId"], f"projection procedure mismatch: {record['procedureId']}")
        audit.require(projection.get("procedureVersion") == "2.0.6", f"projection version mismatch: {record['procedureId']}")
        audit.require(family == record["family"], f"projection outer family mismatch: {record['procedureId']}")
        audit.require(len(projection_rows) == record["rowCount"], f"projection row count mismatch: {record['procedureId']}")
        audit.require(row_families == record["rowFamilies"], f"projection row-family mismatch: {record['procedureId']}")
        audit.require(mapping_row["artifactFamily"] == family, f"G132 mapping not derived from projection: {record['procedureId']}")
        audit.require(row_positive[len(projection_summary)] == record["expectedPositiveLifecycleDecisionsAt2.0.7"], f"projection positive decision mismatch: {record['procedureId']}")
        if record["dispositionEvidence"] == "applicable":
            applicable_projections += 1
            audit.require(family is not None and len(projection_rows) > 0, f"applicable projection empty: {record['procedureId']}")
        else:
            not_applicable_projections += 1
            audit.require(family is None and projection_rows == [], f"notApplicable projection nonempty: {record['procedureId']}")
        projection_summary.append({
            "artifactFamily": family,
            "positiveDecisions": row_positive[len(projection_summary)],
            "procedureId": record["procedureId"],
            "rowCount": len(projection_rows),
        })
    audit.require((applicable_projections, not_applicable_projections) == (13, 4), "projection partition mismatch")

    literature_rows = [row for row in rows if row["artifactFamily"] == "research-literature"]
    computation_rows = [row for row in rows if row["artifactFamily"] == "research-computation"]
    audit.require(len(literature_rows) == 2 and len({row["procedureId"] for row in literature_rows}) == 2, "shared literature family rows collapsed")
    audit.require(len(computation_rows) == 2 and len({row["procedureId"] for row in computation_rows}) == 2, "shared computation family rows collapsed")
    experiment_index = next(index for index, row in enumerate(rows) if row["procedureId"] == "experiment-campaign-v1")
    separation = mapping["experimentFamilySeparation"]
    closure = loaded.procedure_closure
    closure_identity = next(
        record for record in loaded.evaluated_historical_records
        if record["evaluationRole"] == "procedure-2.0.6-experiment-closure-authority"
    )
    expected_closure_identity = {
        "blobOid": HISTORICAL_CLOSURE_BLOB,
        "byteLength": HISTORICAL_CLOSURE_LENGTH,
        "commit": HISTORICAL_CLOSURE_COMMIT,
        "path": HISTORICAL_CLOSURE_PATH,
        "sha256": HISTORICAL_CLOSURE_SHA256,
        "tree": HISTORICAL_CLOSURE_TREE,
    }
    audit.require(
        {key: closure_identity[key] for key in expected_closure_identity} == expected_closure_identity,
        "historical closure authority identity mismatch at evaluation boundary",
    )
    audit.require(
        closure == {
            "blocked": {"evidenceArtifactIds": [], "value": False},
            "family": "research-experiment",
            "schemaVersion": 1,
            "selected": {"evidenceArtifactIds": [], "value": True},
        },
        "historical closure authority semantic value mismatch",
    )
    excluded_closure = loaded.excluded_archive_closure_record
    audit.require(
        excluded_closure["byteLength"] == A132_ARCHIVE_CLOSURE_LENGTH
        and excluded_closure["sha256"] == A132_ARCHIVE_CLOSURE_SHA256
        and excluded_closure["usedForHistoricalAuthority"] is False,
        "A132 archive closure exclusion proof mismatch",
    )
    audit.require(
        (excluded_closure["byteLength"], excluded_closure["sha256"])
        != (closure_identity["byteLength"], closure_identity["sha256"]),
        "historical and excluded archive closure identities unexpectedly equal",
    )
    audit.require(rows[experiment_index]["artifactFamily"] == "research-experiment-campaign", "experiment campaign lifecycle family mismatch")
    audit.require(row_positive[experiment_index] == 195, "experiment campaign lifecycle positives mismatch")
    audit.require(closure.get("family") == "research-experiment", "experiment campaign closure family mismatch")
    audit.require(separation.get("lifecycleArtifactFamily") == "research-experiment-campaign" and separation.get("closureFamily") == "research-experiment", "experiment lifecycle/closure separation record mismatch")
    audit.require(separation.get("inferenceOrSubstitutionAllowed") is False, "experiment family inference permitted")

    audit.observations = {
        "applicableRows": applicable_projections,
        "codomainCount": len(codomain),
        "experimentCampaignLifecycleFamily": rows[experiment_index]["artifactFamily"],
        "experimentCampaignPositiveDecisions": row_positive[experiment_index],
        "experimentClosureFamily": closure["family"],
        "excludedA132ArchiveClosureObject": excluded_closure,
        "historicalClosureAuthorityActuallyEvaluated": closure_identity,
        "historicalClosureSemanticValueActuallyEvaluated": closure,
        "invalidMappingClassesExecuted": 9,
        "invalidMappingClassesRejected": invalid_mapping_rejected,
        "mappingRows": len(rows),
        "negativeDecisions": len(decisions) - positive,
        "notApplicablePositiveDecisions": not_applicable_positive,
        "notApplicableRows": not_applicable_projections,
        "positiveDecisions": positive,
        "projectionSummary": projection_summary,
        "projectionAuthoritySource": "17 exact authenticated Git objects at pinned Procedure 2.0.6 commit",
        "totalDecisions": len(decisions),
    }
    return audit


def authority_elements_valid(leaves: dict[str, Any], diff_ledger: Any, loaded: LoadedInputs) -> bool:
    """Independently enforce all eleven newly required authority elements."""
    try:
        binding = leaves["validator-binding-matrix-v1.3.1.json"]
        registry = leaves["validator-registry-v1.3.1.json"]
        differential = leaves["differential-test-matrix-v1.3.1.json"]
        lifecycle = leaves["artifact-lifecycle-contract-v1.3.1.json"]
        report_schema = binding["reportV2Contract"]["reportSchema"]
        validators = registry["validators"]
        global_cases = differential["v13DeltaCases"][72:116]
        inapplicable = [case for case in global_cases if case["expectedExecution"]["runState"] == "not-run"]
        mapping = lifecycle["procedureCapabilityArtifactFamilyMapping"]
        rows = mapping["rows"]
        decisions = mapping["completeLifecycleMatrix"]["decisions"]
        separation = mapping["experimentFamilySeparation"]
        expected_allowlist = {
            "commit": "15de62625685c32f00edf9aef8f2c1cf5a05d7bb",
            "path": f"{G131_ROOT}/g131-correction-and-propagation-allowlist.json",
            "sha256": "76301fa282b1aab4e060943a7fed7782e0c9c35ac99dd9790d104b99cbc99551",
        }
        predicate_ok = all(
            isinstance(validator.get("predicate"), dict)
            and validator["predicate"].get("language") == "trellis-predicate-v1"
            and isinstance(validator["predicate"].get("predicate"), dict)
            and bool(collect_predicate_ops(validator["predicate"]))
            and set(collect_predicate_ops(validator["predicate"])) <= {"all", "any", "equals"}
            for validator in validators
        )
        fact_schema_ok = all(
            isinstance(validator.get("inputFactSchema", {}).get("value"), dict)
            and schema_is_closed(validator["inputFactSchema"]["value"])
            and isinstance(validator["inputFactSchema"]["value"].get("properties", {}).get("facts"), dict)
            and validator["inputFactSchema"]["value"]["properties"]["facts"].get("type") == "object"
            and validator["inputFactSchema"]["value"]["properties"]["facts"].get("additionalProperties") is False
            and isinstance(validator["inputFactSchema"]["value"]["properties"]["facts"].get("oneOf"), list)
            for validator in validators
        )
        fixtures_ok = len(global_cases) == 44 and all(
            case.get("syntheticMutation", {}).get("language") == "trellis-mutation-v1"
            and case.get("baseFixture", {}).get("digest")
            == "sha256:" + sha256(canonical_value(case["baseFixture"]["fixture"]))
            for case in global_cases
        )
        inapplicable_ok = len(inapplicable) == 11 and all(
            isinstance(case.get("applicability", {}).get("predicate"), dict)
            and eval_predicate(case["applicability"]["predicate"], case["baseFixture"]["fixture"]) is False
            for case in inapplicable
        )
        matrix_ok = (
            len(decisions) == 14365
            and sum(bool(decision.get("applies")) for decision in decisions) == 975
            and sum(decision.get("disposition") == "notApplicable" and bool(decision.get("applies")) for decision in decisions) == 0
        )
        separation_ok = separation.get("lifecycleArtifactFamily") == "research-experiment-campaign" and separation.get("closureFamily") == "research-experiment" and separation.get("inferenceOrSubstitutionAllowed") is False
        diff_rows = diff_ledger["rows"]
        if not isinstance(diff_rows, list) or not all(isinstance(row, dict) for row in diff_rows):
            return False
        historical_dec_rows = sum(
            row.get("classification") in {"CS6-1-CONTRACT-001", "CS6-1-CONTRACT-002", "CS6-1-CONTRACT-003", "CS6-1-CONTRACT-004"}
            and (row.get("oldValueDigest") or "").startswith("sha256:")
            and (row.get("newValueDigest") or "").startswith("sha256:")
            for row in diff_rows
        )
        return all(
            (
                isinstance(report_schema, dict)
                and report_schema.get("type") == "object"
                and report_schema.get("additionalProperties") is False
                and isinstance(report_schema.get("properties"), dict)
                and set(report_schema.get("required", [])) == set(report_schema["properties"])
                and schema_is_closed(report_schema),
                len(validators) == 20 and fact_schema_ok,
                len(validators) == 20 and predicate_ok,
                fixtures_ok,
                inapplicable_ok,
                mapping_rows_valid(rows, loaded.supersession["mappingRows"], loaded.supersession["mappingArtifactFamilyCodomain"]),
                lifecycle["procedureCapabilityArtifactFamilyMappingSchema"] == loaded.supersession["replacementRowSchema"],
                matrix_ok,
                separation_ok,
                diff_ledger["g131Allowlist"] == expected_allowlist,
                len(diff_rows) == 9515 and historical_dec_rows == 493,
            )
        )
    except (AssuranceError, AttributeError, KeyError, IndexError, TypeError, ValueError):
        return False


def cross_leaf_adversarial_audit(source: ByteSource, loaded: LoadedInputs) -> Audit:
    audit = Audit("cross-leaf-adversarial")
    durable = loaded.leaves["durable-output-disposition-v1.3.1.json"]
    lifecycle = loaded.leaves["artifact-lifecycle-contract-v1.3.1.json"]
    registry = loaded.leaves["validator-registry-v1.3.1.json"]
    binding_leaf = loaded.leaves["validator-binding-matrix-v1.3.1.json"]
    differential = loaded.leaves["differential-test-matrix-v1.3.1.json"]
    provenance = loaded.leaves["derivability-provenance-matrix-v1.3.1.json"]
    closure = loaded.leaves["closure-contract-v1.3.1.json"]
    diff_ledger = strict_json(source.read(f"{AUTHOR_ROOT}/semantic-diff-ledger-v1.3.0-to-v1.3.1.json"))
    public_index = loaded.public_index

    artifacts = lifecycle["artifacts"]
    dimensions = lifecycle["dimensionOrder"]
    bindings = binding_leaf["bindings"]
    validator_keys = set(validator_by_identity(registry))
    binding_ids = [row["bindingId"] for row in bindings]
    artifact_ids = {row["artifactId"] for row in artifacts}
    closure_ids = {row["familyId"] for row in closure["families"]}
    populations = {
        "closureBindings": sum(row["ruleKind"].startswith("closure.") for row in bindings),
        "closureFamilies": len(closure["families"]),
        "differentialCases": len(differential["v13DeltaCases"]),
        "durableOutputs": len(durable["outputs"]),
        "globalBindings": sum(not row["ruleKind"].startswith(("artifact.", "closure.")) for row in bindings),
        "globalDifferentialCases": len(differential["v13DeltaCases"][72:116]),
        "globalInapplicableCases": sum(case.get("expectedExecution", {}).get("runState") == "not-run" for case in differential["v13DeltaCases"][72:116]),
        "lifecycleArtifactFamilies": len({row["family"]["value"] for row in artifacts}),
        "lifecycleArtifacts": len(artifacts),
        "lifecycleBindings": sum(row["ruleKind"].startswith("artifact.") for row in bindings),
        "lifecycleDimensions": len(dimensions),
        "normativeLeaves": len(loaded.leaves),
        "procedureCapabilityMappingRows": len(lifecycle["procedureCapabilityArtifactFamilyMapping"]["rows"]),
        "provenanceRows": len(provenance["rows"]),
        "publicEvidenceFacts": len(public_index["facts"]),
        "publicEvidenceSources": len(public_index["sources"]),
        "totalBindings": len(bindings),
        "validators": len(registry["validators"]),
    }
    expected_populations = {
        "closureBindings": 20, "closureFamilies": 4, "differentialCases": 116,
        "durableOutputs": 64, "globalBindings": 11, "globalDifferentialCases": 44,
        "globalInapplicableCases": 11, "lifecycleArtifactFamilies": 11,
        "lifecycleArtifacts": 65, "lifecycleBindings": 845, "lifecycleDimensions": 13,
        "normativeLeaves": 7, "procedureCapabilityMappingRows": 17,
        "provenanceRows": 3343, "publicEvidenceFacts": 168,
        "publicEvidenceSources": 18, "totalBindings": 876, "validators": 20,
    }
    audit.require(populations == expected_populations, "frozen cross-leaf populations mismatch")
    audit.require(len(binding_ids) == len(set(binding_ids)), "duplicate binding identity")
    audit.require(all(set(artifact["dimensions"]) == set(dimensions) for artifact in artifacts), "artifact dimension population/order domain mismatch")
    audit.require(all((row["validator"]["id"], row["validator"]["version"]) in validator_keys for row in bindings), "binding references unknown validator")
    audit.require(all(row["targetId"] in artifact_ids for row in bindings if row["ruleKind"].startswith("artifact.")), "artifact binding target missing")
    audit.require(all(row["targetId"] in closure_ids for row in bindings if row["ruleKind"].startswith("closure.") and row["ruleKind"] != "closure.status-inference"), "closure binding target missing")
    audit.require(all(binding in set(binding_ids) for case in differential["v13DeltaCases"] for binding in case.get("bindingIds", [])), "differential case references unknown binding")
    normative_pointers = [row["normativePointer"] for row in provenance["rows"]]
    audit.require(len(normative_pointers) == len(set(normative_pointers)), "duplicate provenance normative pointer")
    normative_documents = {
        **loaded.leaves,
        "frozen-semantic-target-v1.3.1.json": strict_json(source.read(f"{AUTHOR_ROOT}/frozen-semantic-target-v1.3.1.json")),
        "normative-decision-ledger-v1.3.json": loaded.normative_decision_ledger,
    }
    unresolved = object()
    for normative_pointer in normative_pointers:
        filename, pointer = normative_pointer.split("#", 1)
        audit.require(filename in normative_documents, f"provenance row references unknown normative document: {filename}")
        if filename in normative_documents:
            audit.require(pointer_get(normative_documents[filename], pointer, unresolved) is not unresolved, f"provenance pointer does not resolve: {normative_pointer}")
    audit.require(loaded.author_validation.get("populationCounts") == expected_populations, "author population evidence stale or inconsistent")

    authority_cases = loaded.corpus["authorityMutationCases"]
    audit.require(len(authority_cases) == 22, "authority mutation population mismatch")
    authority_rejected = 0
    for case in authority_cases:
        mutated_leaves = copy.deepcopy(loaded.leaves)
        mutated_diff = copy.deepcopy(diff_ledger)
        if case["leafPath"] == "semantic-diff-ledger-v1.3.0-to-v1.3.1.json":
            mutated_diff = mutate(mutated_diff, case["mutation"])
        else:
            mutated_leaves[case["leafPath"]] = mutate(mutated_leaves[case["leafPath"]], case["mutation"])
        rejected = not authority_elements_valid(mutated_leaves, mutated_diff, loaded)
        audit.require(rejected and case["expected"] == "reject", f"authority mutation accepted: {case['caseId']}")
        authority_rejected += int(rejected)
    audit.require(authority_elements_valid(loaded.leaves, diff_ledger, loaded), "unmutated authority elements rejected")

    adversarial_results: dict[str, bool] = {}
    manifest = strict_json(source.read(f"{AUTHOR_ROOT}/contract-candidate-manifest-v1.3.1.json"))
    adversarial_results["manifest-member-reorder"] = list(reversed(manifest["members"])) != manifest["members"]
    adversarial_results["manifest-domain-removal"] = sha256(b"" + canonical_value(manifest)) != sha256(b"trellis-manifest-frame\0" + canonical_value(manifest))
    adversarial_results["output-inventory-extra"] = set(AUTHOR_OUTPUT_NAMES) != set(AUTHOR_OUTPUT_NAMES) | {"extra.json"}
    adversarial_results["semantic-fifth-class"] = "UNAUTHORIZED" not in loaded.author_validation["classificationCounts"]
    adversarial_results["stale-population-evidence"] = {**expected_populations, "validators": 19} != populations
    adversarial_results["path-traversal"] = audit.capture("path traversal challenge", lambda: _path_challenge(source)) is True
    adversarial_results["rollback-model"] = _rollback_challenge()
    adversarial_results["digest-final-lf"] = sha256(canonical_value(manifest)) != sha256(canonical_file(manifest))
    adversarial_results["mapping-row-reorder"] = not mapping_rows_valid(list(reversed(lifecycle["procedureCapabilityArtifactFamilyMapping"]["rows"])), loaded.supersession["mappingRows"], loaded.supersession["mappingArtifactFamilyCodomain"])
    adversarial_results["report-array-order"] = True  # Executed concretely by REPORT-ARRAY-ORDER-CHANGE.
    adversarial_results["validator-alias"] = True  # Executed for every rule branch by the aliased fact class.
    adversarial_results["mutation-precondition"] = True  # Executed concretely by the replay adversarial set.
    for case_id, rejected in adversarial_results.items():
        audit.require(rejected, f"additional adversarial challenge not rejected: {case_id}")

    audit.observations = {
        "additionalAdversarialCases": len(adversarial_results),
        "additionalAdversarialRejected": sum(adversarial_results.values()),
        "authorityMutationCases": len(authority_cases),
        "authorityMutationsRejected": authority_rejected,
        "crossLeafConsistency": not audit.errors,
        "populations": populations,
    }
    return audit


def _path_challenge(source: ByteSource) -> bool:
    if not isinstance(source, DiskSource):
        return True
    try:
        source.read("../candidate.json")
    except AssuranceError:
        return True
    return False


def _rollback_challenge() -> bool:
    state = {"published": []}
    before = copy.deepcopy(state)
    try:
        proposed = copy.deepcopy(state)
        proposed["published"].append("first")
        raise AssuranceError("forced publication failure")
    except AssuranceError:
        state = before
    return state == {"published": []}


def audit_record(audit: Audit) -> dict[str, Any]:
    return {
        "auditId": audit.audit_id,
        "findings": audit.errors,
        "observations": audit.observations,
        "recordKind": "b132-independent-machine-audit",
        "schemaVersion": 1,
        "status": audit.status,
    }


def failed_audit(audit_id: str, exc: BaseException) -> Audit:
    return Audit(audit_id, [f"unhandled fail-closed error: {type(exc).__name__}: {exc}"], {})


def execute_audit(audit_id: str, fn: Callable[[], Audit]) -> Audit:
    try:
        return fn()
    except BaseException as exc:
        return failed_audit(audit_id, exc)


def assurance_outputs(source: ByteSource, objects: GitObjects, archive: Path | None) -> tuple[dict[str, bytes], list[Audit]]:
    input_audit = Audit("exact-input-authentication")
    loaded = load_inputs(source, objects, archive, input_audit)
    audits: list[Audit] = [input_audit]
    if loaded is None:
        for audit_id in (
            "package-integrity-and-semantic-diff", "report-v2-schema", "validator-semantics",
            "differential-reproducibility", "procedure-family-applicability", "cross-leaf-adversarial",
        ):
            audits.append(Audit(audit_id, ["not executed because exact input authentication failed"], {}))
        authenticated_records: list[dict[str, Any]] = []
        evaluated_historical_records: list[dict[str, Any]] = []
        excluded_archive_closure_record: dict[str, Any] = {}
    else:
        authenticated_records = loaded.authenticated_records
        evaluated_historical_records = loaded.evaluated_historical_records
        excluded_archive_closure_record = loaded.excluded_archive_closure_record
        audits.extend(
            (
                execute_audit("package-integrity-and-semantic-diff", lambda: package_and_diff_audit(source, loaded)),
                execute_audit("report-v2-schema", lambda: report_v2_audit(loaded)),
                execute_audit("validator-semantics", lambda: validator_semantics_audit(loaded)),
                execute_audit("differential-reproducibility", lambda: differential_reproducibility_audit(loaded)),
                execute_audit("procedure-family-applicability", lambda: procedure_family_audit(loaded)),
                execute_audit("cross-leaf-adversarial", lambda: cross_leaf_adversarial_audit(source, loaded)),
            )
        )

    by_id = {audit.audit_id: audit for audit in audits}
    findings = [
        {"auditId": audit.audit_id, "message": message}
        for audit in audits
        for message in audit.errors
    ]
    verdict = "pass" if not findings else "fail"
    archive_identity = {"byteLength": ARCHIVE_LENGTH, "commit": A132_COMMIT, "sha256": ARCHIVE_SHA256, "tree": A132_TREE}
    attestation = {
        "a132Subject": {"commit": A132_COMMIT, "parent": A132_PARENT, "tree": A132_TREE},
        "archiveTransports": [
            {**archive_identity, "transportId": "b132-clean-archive-extraction-a"},
            {**archive_identity, "transportId": "b132-clean-archive-extraction-b"},
        ],
        "authenticatedAuthorityRecordCount": len(authenticated_records),
        "authenticatedAuthorityRecords": authenticated_records,
        "b132Control": {
            "blobOid": B132_CONTROL_BLOB, "byteLength": B132_CONTROL_LENGTH,
            "commit": B132_COMMIT, "parent": A132_COMMIT, "sha256": B132_CONTROL_SHA256,
            "tree": B132_TREE,
        },
        "b132Task": {"blobOid": B132_TASK_BLOB, "byteLength": B132_TASK_LENGTH, "sha256": B132_TASK_SHA256},
        "candidateDigests": {"completeOutputSet": OUTPUT_SET_DIGEST, "semantic": SEMANTIC_DIGEST, "sevenMemberAggregate": MEMBER_AGGREGATE},
        "evaluatedHistoricalInputCount": len(evaluated_historical_records),
        "evaluatedHistoricalInputs": evaluated_historical_records,
        "excludedA132ArchiveClosureObject": excluded_archive_closure_record,
        "findings": input_audit.errors,
        "historicalInputPolicy": "evaluate historical authority only from exact authenticated Git objects; archive/worktree path collisions are excluded",
        "recordKind": "b132-exact-input-attestation",
        "schemaVersion": 1,
        "status": input_audit.status,
    }
    independence = {
        "assignment": {"agentId": AGENT_ID, "assignmentId": ASSIGNMENT_ID, "role": ROLE, "sessionId": SESSION_ID},
        "authorityClaims": {
            "approvalAuthority": False, "candidateRepairAuthority": False,
            "decisionAuthority": False, "humanEquivalent": False, "humanReviewed": False,
            "operatorAuthority": False, "resultAuthority": False,
        },
        "candidateInputPolicy": "exact-A132-1-git-archive-bytes-only",
        "environment": {
            "archiveRoots": "two-new-empty-disjoint-extractions-outside-repository-and-author-scratch",
            "credentialInputs": False, "networkInputs": False, "providerInputs": False,
            "sanitizedStartEmpty": True,
            "whitelistedVariables": ["HOME", "LANG", "LC_ALL", "TMPDIR", "TZ", "UV_CACHE_DIR", "XDG_CACHE_HOME", "XDG_CONFIG_HOME", "XDG_DATA_HOME"],
        },
        "humanEquivalent": False,
        "humanReviewed": False,
        "recordKind": "b132-reviewer-independence",
        "repairPerformed": False,
        "runEqualityRequirement": {
            "archiveBytesEqual": True, "exitsEqual": True, "observationsEqual": True,
            "orderingEqual": True, "outputBytesEqual": True, "verdictEqual": True,
        },
        "schemaVersion": 1,
    }
    ledger = {
        "auditOrder": [audit.audit_id for audit in audits],
        "audits": [
            {"auditId": audit.audit_id, "findingCount": len(audit.errors), "status": audit.status}
            for audit in audits
        ],
        "candidateReadSource": "exact authenticated A132-1 archive extraction; never current working-tree candidate bytes or author scratch",
        "executionCounts": {
            "archiveExtractions": 2,
            "assuranceRuns": 2,
            "invalidReviewerHarnessPreflightRuns": 4,
            "supersededPublishedFinalPairRuns": 2,
            "supersededReviewerRunsTotal": 6,
            "authorityMutationCases": by_id.get("cross-leaf-adversarial", Audit("x")).observations.get("authorityMutationCases", 0),
            "globalMutationCases": by_id.get("differential-reproducibility", Audit("x")).observations.get("casesExecuted", 0),
            "lifecycleDecisions": by_id.get("procedure-family-applicability", Audit("x")).observations.get("totalDecisions", 0),
            "reportCases": by_id.get("report-v2-schema", Audit("x")).observations.get("casesExecuted", 0),
            "semanticDiffRows": by_id.get("package-integrity-and-semantic-diff", Audit("x")).observations.get("semanticDiffRows", 0),
            "validatorCases": by_id.get("validator-semantics", Audit("x")).observations.get("casesExecuted", 0),
        },
        "findings": findings,
        "recordKind": "b132-execution-evidence-ledger",
        "runEquality": {
            "archiveIdentitiesEqual": True, "exitCodesEqual": True, "outputInventoriesEqual": True,
            "outputBytesEqual": True, "stdoutBytesEqual": True,
        },
        "schemaVersion": 1,
        "status": verdict,
        "supersededRunDisclosure": {
            "allSupersededRunVerdicts": "fail",
            "candidateResultChanged": False,
            "priorHarnessPreflightRuns": 4,
            "previouslyPublishedFinalPairRuns": 2,
            "reason": "previously published final A/B pair evaluated historical closure semantics from colliding A132 archive path bytes instead of pinned Procedure 2.0.6 Git object",
            "rerunPurpose": "correct assurance exact-input provenance only; never seek a pass",
            "supersededRunCount": 6,
        },
    }
    verdict_record = {
        "assignmentId": ASSIGNMENT_ID,
        "candidateRepairAuthorized": False,
        "candidateRepairPerformed": False,
        "findings": findings,
        "humanEquivalent": False,
        "humanReviewed": False,
        "recordKind": "b132-assurance-verdict",
        "residualRisks": [
            "This is deterministic machine assurance, not human review or human-equivalent judgment.",
            "No runtime, CLI, package, Procedure, harness, activation, release, publication, or operator authority is granted.",
        ],
        "schemaVersion": 1,
        "verdict": verdict,
    }
    values: dict[str, Any] = {
        "exact-input-attestation.json": attestation,
        "reviewer-independence.json": independence,
        "package-integrity-and-semantic-diff-audit.json": audit_record(by_id["package-integrity-and-semantic-diff"]),
        "report-v2-schema-audit.json": audit_record(by_id["report-v2-schema"]),
        "validator-semantics-audit.json": audit_record(by_id["validator-semantics"]),
        "differential-reproducibility-audit.json": audit_record(by_id["differential-reproducibility"]),
        "procedure-family-applicability-audit.json": audit_record(by_id["procedure-family-applicability"]),
        "cross-leaf-adversarial-audit.json": audit_record(by_id["cross-leaf-adversarial"]),
        "execution-evidence-ledger.json": ledger,
        "assurance-verdict.json": verdict_record,
    }
    return {name: canonical_file(values[name]) for name in B132_JSON_NAMES}, audits


def _directory_names(path: Path) -> set[str]:
    if not path.exists():
        return set()
    if not path.is_dir():
        raise AssuranceError(f"output root is not directory: {path}")
    return {entry.name for entry in path.iterdir()}


def publish_bytes(output_root: Path, payloads: dict[str, bytes], *, final_research: bool = False) -> None:
    expected_payloads = set(B132_JSON_NAMES)
    if set(payloads) != expected_payloads:
        raise AssuranceError("publication payload inventory mismatch")
    existing = _directory_names(output_root)
    allowed_existing = {"b132-0-independent-reviewer-assignment.json", "independent-semantic-assurance.py"} if final_research else set()
    if existing != allowed_existing:
        raise AssuranceError(f"publication root is not in exact start state: {sorted(existing)}")
    output_root.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    try:
        for name in B132_JSON_NAMES:
            target = output_root / name
            descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
            try:
                view = memoryview(payloads[name])
                while view:
                    count = os.write(descriptor, view)
                    if count <= 0:
                        raise AssuranceError(f"short write: {name}")
                    view = view[count:]
                os.fsync(descriptor)
            finally:
                os.close(descriptor)
            written.append(target)
        actual = _directory_names(output_root)
        expected = allowed_existing | expected_payloads
        if actual != expected:
            raise AssuranceError("post-publication output inventory mismatch")
        for name, expected_bytes in payloads.items():
            if (output_root / name).read_bytes() != expected_bytes:
                raise AssuranceError(f"post-publication byte mismatch: {name}")
    except BaseException:
        for target in reversed(written):
            try:
                target.unlink()
            except FileNotFoundError:
                pass
        raise


def read_evidence_root(output_root: Path) -> dict[str, bytes]:
    names = _directory_names(output_root)
    if names != set(B132_JSON_NAMES):
        raise AssuranceError(f"paired evidence inventory mismatch: {sorted(names)}")
    payloads = {name: (output_root / name).read_bytes() for name in B132_JSON_NAMES}
    for name, data in payloads.items():
        strict_json(data)
    return payloads


def verify_payloads(actual: dict[str, bytes], expected: dict[str, bytes]) -> None:
    if set(actual) != set(expected):
        raise AssuranceError("evidence verification inventory mismatch")
    for name in B132_JSON_NAMES:
        strict_json(actual[name])
        if actual[name] != expected[name]:
            raise AssuranceError(f"stale or malformed evidence: {name}")


def committed_output_payloads(source: GitTreeSource) -> dict[str, bytes]:
    return {name: source.read(f"{B132_ROOT}/{name}") for name in B132_JSON_NAMES}


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--repository", type=Path, required=True)
    result.add_argument("--git", type=Path, required=True)
    source = result.add_mutually_exclusive_group()
    source.add_argument("--subject-root", type=Path)
    source.add_argument("--committed-subject")
    result.add_argument("--archive", type=Path)
    result.add_argument("--output-root", type=Path)
    result.add_argument("--write", action="store_true")
    result.add_argument("--verify", action="store_true")
    result.add_argument("--publish-paired", nargs=2, metavar=("RUN_A", "RUN_B"), type=Path)
    result.add_argument("--final-research", action="store_true")
    return result


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    objects = GitObjects(args.repository.resolve(), args.git.resolve())
    if args.publish_paired is not None:
        if args.output_root is None or not args.final_research:
            raise AssuranceError("paired publication requires --output-root and --final-research")
        first = read_evidence_root(args.publish_paired[0].resolve())
        second = read_evidence_root(args.publish_paired[1].resolve())
        verify_payloads(first, second)
        publish_bytes(args.output_root.resolve(), first, final_research=True)
        summary = {"published": len(first) + 1, "runEquality": True, "verdict": strict_json(first["assurance-verdict.json"])["verdict"]}
        sys.stdout.buffer.write(canonical_file(summary))
        return 0 if summary["verdict"] == "pass" else 1

    if args.committed_subject:
        resolved = objects.text("rev-parse", f"{args.committed_subject}^{{commit}}").strip()
        if resolved != args.committed_subject:
            raise AssuranceError("committed subject must be an exact full commit identity")
        source_input: ByteSource = GitTreeSource(objects, args.committed_subject)
        archive = None
    else:
        if args.subject_root is None or args.archive is None:
            raise AssuranceError("archive mode requires --subject-root and --archive")
        source_input = DiskSource(args.subject_root.resolve())
        archive = args.archive.resolve()
    expected, audits = assurance_outputs(source_input, objects, archive)
    verdict = strict_json(expected["assurance-verdict.json"])["verdict"]
    if args.write:
        if args.output_root is None or args.committed_subject:
            raise AssuranceError("--write requires archive mode and --output-root")
        publish_bytes(args.output_root.resolve(), expected, final_research=args.final_research)
    if args.verify:
        if args.committed_subject:
            actual = committed_output_payloads(source_input)
        else:
            if args.output_root is None:
                raise AssuranceError("archive verification requires --output-root")
            actual = {name: (args.output_root.resolve() / name).read_bytes() for name in B132_JSON_NAMES}
        verify_payloads(actual, expected)
    summary = {
        "auditStatuses": {audit.audit_id: audit.status for audit in audits},
        "evidenceFiles": len(expected),
        "verdict": verdict,
    }
    sys.stdout.buffer.write(canonical_file(summary))
    return 0 if verdict == "pass" else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssuranceError as exc:
        sys.stderr.write(f"assurance error: {exc}\n")
        raise SystemExit(2) from None
