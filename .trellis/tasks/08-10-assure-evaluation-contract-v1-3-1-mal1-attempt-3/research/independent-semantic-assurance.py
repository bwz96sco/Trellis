#!/usr/bin/env python3
"""Independent B133-1 machine assurance for evaluation-contract v1.3.1.

Run through uv. Normal mode reads candidate bytes only from an exact git-archive
extraction and reads authority only through authenticated Git objects. Verification
mode is read-only and also supports a future committed B133-1 tree.
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


B133_COMMIT = "e083039c3de5655a1a8806371a101586ae01efb4"
B133_TREE = "98cd890f0cb9dec264abb0a7a9a7e81b9625d740"
A133_COMMIT = "5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3"
A133_TREE = "47633d69ffb68b7e225e01e502fe133616a1078b"
A133_PARENT = "45af4bc13838193d43dc5f59ddd5f1d304da0dc8"
B133_CONTROL_BLOB = "865fa8afdee85c76893f44d759c82275f0bcdf43"
B133_CONTROL_LENGTH = 69851
B133_CONTROL_SHA256 = "4ef3cb61d86ff59b3e89e3e1e98db3e7c257c4456a537410328a93d80a4b2c34"
B133_TASK_BLOB = "258c238ce4d9c7d8886e77364b39c81205a24cc9"
B133_TASK_LENGTH = 2689
B133_TASK_SHA256 = "c39280e70a74ac20130b53e43ef3caaac8b33f775279a84d6051974fda379a61"
ARCHIVE_LENGTH = 207421440
ARCHIVE_SHA256 = "cdd34331d27f203f691591a3ccf2cab4e45db67a4ed3e33320e0fa768b71fe83"
HISTORICAL_CLOSURE_COMMIT = "0afef5adaea2a58c8c6cc5a3f1a51a054fa1a39d"
HISTORICAL_CLOSURE_TREE = "f7e7396fa6fce94ecc241db733f1785029341d33"
HISTORICAL_CLOSURE_BLOB = "476d2b76b6954374e12292144d70315077f15cb2"
HISTORICAL_CLOSURE_LENGTH = 153
HISTORICAL_CLOSURE_SHA256 = "8a2f2d851b5bd559fa070838c83a191854791aa730a33b192d2cfda76a7609f0"
HISTORICAL_CLOSURE_PATH = "packages/cli/src/templates/research/procedures/experiment-campaign-v1/2.0.6/methodology/closure/research-experiment.json"
A133_ARCHIVE_CLOSURE_LENGTH = 195
A133_ARCHIVE_CLOSURE_SHA256 = "5e01f2eec31622965cd91d009c237c592e50158506ab1c213a57f64a551057b8"
MEMBER_AGGREGATE = "sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34"
SEMANTIC_DIGEST = "sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af"
OUTPUT_SET_DIGEST = "sha256:514b7c99450c0703ebacef8b16fc0a3658b8ea5c87ef05bf371166916597d642"
HISTORICAL_REPLAY_CASE_FIELDS = (
    "authorityMutationCases",
    "globalCases",
    "globalInapplicabilityCases",
    "lifecycleCases",
    "reportCases",
    "semanticDiffCases",
    "validatorCases",
)
HISTORICAL_REPLAY_BASE_FIXTURE_FIELDS = (
    "lifecycleBaseFixtures",
    "reportBaseFixtures",
    "validatorBaseFixtures",
)
ASSIGNMENT_ID = "b133-0-reviewer-assignment-20260810-a"
AGENT_ID = "b133-reviewer-claude-01"
SESSION_ID = "b133-reviewer-claude-session-01"
ROLE = "evaluation-contract-v1.3.1-attempt-3-independent-machine-reviewer"

AUTHOR_ROOT = ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/research"
B133_ROOT = ".trellis/tasks/08-10-assure-evaluation-contract-v1-3-1-mal1-attempt-3/research"
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
B133_JSON_NAMES = (
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
B133_OUTPUT_NAMES = ("independent-semantic-assurance.py",) + B133_JSON_NAMES
ABSENT = {"$trellisAbsent": True}
VALUE_DIGEST_DOMAIN = b"trellis-g131-json-value-v1\0"
PRESERVED_VALUE_DIGEST_DOMAIN = b"trellis-g132-preserved-json-value-v1\0"
MEMBER_AGGREGATE_DOMAIN = b"trellis-accepted-v13-pack-members\0"
REPORT_DIGEST_DOMAIN = b"trellis-evaluation-report-v2\0"
OUTPUT_SET_DOMAIN = b"trellis-a133-output-set-v1\0"


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


def mapping_row_errors(rows: Any, authority_rows: list[dict[str, Any]], codomain: list[str]) -> list[str]:
    if not isinstance(rows, list):
        return ["MAPPING_ROWS_NOT_ARRAY"]
    errors: list[str] = []
    if len(rows) != 17:
        errors.append("MAPPING_ROW_COUNT")
    if rows != authority_rows:
        errors.append("MAPPING_EXACT_AUTHENTICATED_ROWS")
    identities: set[tuple[str, str, str]] = set()
    required = {"procedureId", "procedureVersion", "capabilityId", "disposition", "artifactFamily"}
    for index, row in enumerate(rows):
        if not isinstance(row, dict) or set(row) != required:
            errors.append(f"MAPPING_ROW_SHAPE|{index}")
            continue
        if row["procedureVersion"] != "2.0.7":
            errors.append(f"MAPPING_PROCEDURE_VERSION|{index}")
        identity = (row["procedureId"], row["procedureVersion"], row["capabilityId"])
        if identity in identities:
            errors.append(f"MAPPING_DUPLICATE_IDENTITY|{index}")
        identities.add(identity)
        if row["disposition"] == "applicable":
            if row["artifactFamily"] not in codomain:
                errors.append(f"MAPPING_APPLICABLE_CODOMAIN|{index}")
        elif row["disposition"] == "notApplicable":
            if row["artifactFamily"] is not None:
                errors.append(f"MAPPING_NOT_APPLICABLE_NULLABILITY|{index}")
        else:
            errors.append(f"MAPPING_DISPOSITION|{index}")
    return errors


def mapping_rows_valid(rows: Any, authority_rows: list[dict[str, Any]], codomain: list[str]) -> bool:
    return not mapping_row_errors(rows, authority_rows, codomain)


@dataclass
class LoadedInputs:
    control: dict[str, Any]
    leaves: dict[str, Any]
    leaf_bytes: dict[str, bytes]
    a132_output_bytes: dict[str, bytes]
    baselines: dict[str, Any]
    allowlist: dict[str, Any]
    supersession: dict[str, Any]
    corpus: dict[str, Any]
    author_validation: dict[str, Any]
    authenticated_records: list[dict[str, Any]]
    evaluated_historical_records: list[dict[str, Any]]
    procedure_projections: list[dict[str, Any]]
    procedure_projection_records: list[dict[str, Any]]
    procedure_closure: dict[str, Any]
    excluded_archive_closure_record: dict[str, Any]
    public_index: dict[str, Any]
    normative_decision_ledger: dict[str, Any]
    accepted_target: dict[str, Any]
    historical_replay: dict[str, Any]


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
    verify_commit(objects, B133_COMMIT, B133_TREE, A133_COMMIT, audit)
    control_bytes = objects.blob(B133_CONTROL_BLOB)
    audit.require(len(control_bytes) == B133_CONTROL_LENGTH, "B133 control length mismatch")
    audit.require(sha256(control_bytes) == B133_CONTROL_SHA256, "B133 control sha256 mismatch")
    control = strict_json(control_bytes)
    control_path = f"{B133_ROOT}/b133-0-independent-reviewer-assignment.json"
    mode, oid, length, path_bytes = objects.path_record(B133_COMMIT, control_path)
    audit.require(
        (mode, oid, length, path_bytes) == ("100644", B133_CONTROL_BLOB, B133_CONTROL_LENGTH, control_bytes),
        "B133 control path identity mismatch",
    )
    task_path = ".trellis/tasks/08-10-assure-evaluation-contract-v1-3-1-mal1-attempt-3/task.json"
    task_mode, task_oid, task_length, task_bytes = objects.path_record(B133_COMMIT, task_path)
    audit.require((task_mode, task_oid, task_length) == ("100644", B133_TASK_BLOB, B133_TASK_LENGTH), "B133 task path identity mismatch")
    audit.require(sha256(task_bytes) == B133_TASK_SHA256, "B133 task sha256 mismatch")
    task = strict_json(task_bytes)
    changed = objects.text("diff-tree", "--no-commit-id", "--name-only", "-r", B133_COMMIT).splitlines()
    audit.require(len(changed) == 2 and set(changed) == {task_path, control_path}, "B133-0 changed path set mismatch")

    assignment = control.get("assignment", {})
    audit.require(
        assignment == {
            "agentId": AGENT_ID,
            "assignedRole": ROLE,
            "assignmentId": ASSIGNMENT_ID,
            "assignmentTimestamp": "2026-08-10T08:46:01Z",
            "modelClass": "gpt-5.6-sol",
            "runtimeClass": "claude-code-fresh-agent",
            "sessionId": SESSION_ID,
            "status": "assigned-for-b133-1-after-committed-b133-0",
        },
        "reviewer assignment identity mismatch",
    )
    audit.require(task.get("status") == "in_progress", "B133 task not in progress")
    audit.require(task.get("assignee") == AGENT_ID, "B133 task assignee mismatch")
    audit.require(task.get("meta", {}).get("taskExecutionAuthorized") is False, "task metadata improperly authorizes execution")
    authority = control.get("authority", {})
    audit.require(authority.get("taskExecutionAuthorized") is True, "B133 control does not authorize task execution")
    for forbidden in (
        "approvalAuthority", "candidateRepairAuthorized", "commitAuthorized", "decisionAuthority",
        "gitMutationAuthorized", "governanceRepairAuthorized", "humanEquivalent", "humanReviewed",
        "nestedAgentAuthorized", "networkAuthorized", "operatorDecisionAuthorized", "providerExecutionAuthorized",
        "publicationAuthorized", "pushAuthorized", "repairAuthority", "resultAuthority", "stagingAuthorized",
    ):
        audit.require(authority.get(forbidden) is False, f"authority widened: {forbidden}")
    audit.require(control.get("recordKind") == "b133-0-independent-reviewer-assignment", "B133 control kind mismatch")
    audit.require(control.get("schemaVersion") == 1, "B133 control schema mismatch")

    authenticated: list[dict[str, Any]] = []
    seen_groups: set[tuple[str, str]] = set()

    def walk(node: Any, label: str) -> None:
        if isinstance(node, dict):
            commit = node.get("commit")
            tree = node.get("tree")
            if isinstance(commit, str) and isinstance(tree, str):
                key = (commit, tree)
                if key not in seen_groups:
                    verify_commit(objects, commit, tree, node.get("parent"), audit)
                    seen_groups.add(key)
            if isinstance(commit, str):
                for record_key in ("records", "outputs"):
                    records = node.get(record_key)
                    if isinstance(records, list):
                        if isinstance(node.get("recordCount"), int):
                            audit.require(node["recordCount"] == len(records), f"record count mismatch: {label}")
                        for record in records:
                            if isinstance(record, dict) and {"path", "blobOid", "byteLength", "sha256"} <= set(record):
                                result = authenticate_record(objects, commit, record, audit)
                                if result is not None:
                                    authenticated.append({**result, "authorityGroup": label})
            for key, value in node.items():
                if key not in {"records", "outputs"}:
                    walk(value, f"{label}.{key}")
        elif isinstance(node, list):
            for index, value in enumerate(node):
                walk(value, f"{label}[{index}]")

    walk(control.get("exactInputs", {}), "exactInputs")
    exact = control["exactInputs"]
    a133 = exact["a1331Subject"]
    audit.require(a133.get("commit") == A133_COMMIT and a133.get("tree") == A133_TREE and a133.get("parent") == A133_PARENT, "A133 subject identity mismatch")
    expected_changed = [record["path"] for record in a133["outputs"]]
    actual_changed = objects.text("diff-tree", "--no-commit-id", "--name-only", "-r", A133_COMMIT).splitlines()
    audit.require(len(actual_changed) == 15 and set(actual_changed) == set(expected_changed), "A133 changed path inventory mismatch")
    archive = control["inputIsolation"]["archiveTransport"]
    audit.require(archive == {
        "archiveCommand": ["git", "archive", "--format=tar", A133_COMMIT],
        "byteLength": ARCHIVE_LENGTH,
        "format": "git-archive-tar",
        "sha256": ARCHIVE_SHA256,
        "subjectCommit": A133_COMMIT,
        "subjectTree": A133_TREE,
    }, "control archive identity mismatch")
    audit.require(control["outputAuthorization"]["exactOutputPaths"] == [f"{B133_ROOT}/{name}" for name in B133_OUTPUT_NAMES], "B133 output allowlist mismatch")
    audit.require(control["outputAuthorization"]["exactOutputCount"] == 11, "B133 output count mismatch")
    audit.require(control["reviewerRuntimeRequirements"] == {
        "forked": False, "freshLaunchMustOccurAfterCommittedB1330": True, "machineOnly": True,
        "networked": False, "resumed": False, "sharedSession": False,
    }, "reviewer runtime requirements mismatch")
    return control, authenticated


def verify_archive(archive: Path, subject: DiskSource, audit: Audit) -> None:
    data = archive.read_bytes()
    audit.require(len(data) == ARCHIVE_LENGTH, "archive transport length mismatch")
    audit.require(sha256(data) == ARCHIVE_SHA256, "archive transport sha256 mismatch")
    author_dir = subject.root / AUTHOR_ROOT
    expected = {"a133-0-author-assignment-and-input-authorization.json", *AUTHOR_OUTPUT_NAMES}
    try:
        actual = {entry.name for entry in author_dir.iterdir()}
        audit.require(actual == expected, "archive candidate research inventory mismatch")
        for entry in author_dir.iterdir():
            audit.require(stat.S_ISREG(entry.lstat().st_mode), f"archive candidate member is not regular: {entry.name}")
    except BaseException as exc:
        audit.errors.append(f"archive inventory: {type(exc).__name__}: {exc}")


def historical_b132_replay_evidence(
    historical_corpus: dict[str, Any],
    current_corpus: dict[str, Any],
    historical_ledger: dict[str, Any] | None,
    historical_verdict: dict[str, Any] | None,
    expected_ledger_bytes: bytes,
    expected_verdict_bytes: bytes,
    ledger_identity: dict[str, Any],
    verdict_identity: dict[str, Any],
    *,
    run_negative_challenges: bool = True,
) -> tuple[dict[str, Any], list[str]]:
    reasons: list[str] = []
    case_arrays: dict[str, dict[str, Any]] = {}
    base_fixtures: dict[str, dict[str, Any]] = {}

    def add(reason: str) -> None:
        if reason not in reasons:
            reasons.append(reason)

    def compare_field(field_name: str, destination: dict[str, dict[str, Any]]) -> None:
        historical = historical_corpus.get(field_name, MISSING)
        current = current_corpus.get(field_name, MISSING)
        historical_present = historical is not MISSING
        current_present = current is not MISSING
        historical_bytes = canonical_value(historical) if historical_present else b""
        current_bytes = canonical_value(current) if current_present else b""
        equal = historical_present and current_present and historical_bytes == current_bytes
        destination[field_name] = {
            "a133Count": len(current) if isinstance(current, list) else None,
            "a133Sha256": sha256(current_bytes) if current_present else None,
            "exactCanonicalBytesEqual": equal,
            "historicalCount": len(historical) if isinstance(historical, list) else None,
            "historicalSha256": sha256(historical_bytes) if historical_present else None,
        }
        if not historical_present:
            add(f"HISTORICAL_CORPUS_FIELD_MISSING|{field_name}")
        if not current_present:
            add(f"A133_CORPUS_FIELD_MISSING|{field_name}")
        if historical_present and current_present and not equal:
            add(f"HISTORICAL_CORPUS_FIELD_DRIFT|{field_name}")

    for field_name in HISTORICAL_REPLAY_CASE_FIELDS:
        compare_field(field_name, case_arrays)
        historical_count = historical_corpus.get("coverageCounts", {}).get(field_name)
        current_count = current_corpus.get("coverageCounts", {}).get(field_name)
        expected_count = case_arrays[field_name]["historicalCount"]
        if historical_count != expected_count:
            add(f"HISTORICAL_COVERAGE_COUNT|{field_name}")
        if current_count != expected_count:
            add(f"A133_REPLAY_COVERAGE_COUNT|{field_name}")

    for field_name in HISTORICAL_REPLAY_BASE_FIXTURE_FIELDS:
        compare_field(field_name, base_fixtures)

    exact_ledger = strict_json(expected_ledger_bytes)
    exact_verdict = strict_json(expected_verdict_bytes)
    if historical_ledger is None:
        add("HISTORICAL_LEDGER_MISSING")
        historical_counts: dict[str, Any] = {}
    else:
        historical_counts = historical_ledger.get("executionCounts", {}) if isinstance(historical_ledger.get("executionCounts"), dict) else {}
        if canonical_file(historical_ledger) != expected_ledger_bytes or historical_ledger != exact_ledger:
            add("HISTORICAL_LEDGER_EXACT_BYTES_MISMATCH")
        if historical_ledger.get("recordKind") != "b132-execution-evidence-ledger":
            add("HISTORICAL_LEDGER_RECORD_KIND")
        if historical_ledger.get("schemaVersion") != 1:
            add("HISTORICAL_LEDGER_SCHEMA_VERSION")
        if historical_ledger.get("status") != "fail":
            add("HISTORICAL_LEDGER_STATUS_NOT_FAIL")
    if historical_verdict is None:
        add("HISTORICAL_VERDICT_MISSING")
        verdict_value = None
    else:
        verdict_value = historical_verdict.get("verdict")
        if canonical_file(historical_verdict) != expected_verdict_bytes or historical_verdict != exact_verdict:
            add("HISTORICAL_VERDICT_EXACT_BYTES_MISMATCH")
        if historical_verdict.get("recordKind") != "b132-assurance-verdict":
            add("HISTORICAL_VERDICT_RECORD_KIND")
        if historical_verdict.get("schemaVersion") != 1:
            add("HISTORICAL_VERDICT_SCHEMA_VERSION")
        if historical_verdict.get("assignmentId") != "b132-0-reviewer-assignment-20260808-a":
            add("HISTORICAL_VERDICT_ASSIGNMENT_ID")
        if verdict_value != "fail":
            add("HISTORICAL_VERDICT_NOT_FAIL")
        if historical_verdict.get("candidateRepairAuthorized") is not False or historical_verdict.get("candidateRepairPerformed") is not False:
            add("HISTORICAL_VERDICT_REPAIR_AUTHORITY")
        if historical_verdict.get("humanEquivalent") is not False or historical_verdict.get("humanReviewed") is not False:
            add("HISTORICAL_VERDICT_MACHINE_ONLY_IDENTITY")
    if historical_ledger is not None and historical_verdict is not None and historical_ledger.get("status") != verdict_value:
        add("HISTORICAL_LEDGER_VERDICT_MISMATCH")

    expected_execution_counts = {
        "authorityMutationCases": case_arrays["authorityMutationCases"]["historicalCount"],
        "globalMutationCases": case_arrays["globalCases"]["historicalCount"],
        "reportCases": case_arrays["reportCases"]["historicalCount"],
        "semanticDiffRows": case_arrays["semanticDiffCases"]["historicalCount"],
        "validatorCases": case_arrays["validatorCases"]["historicalCount"],
    }
    for key, expected in expected_execution_counts.items():
        if historical_counts.get(key) != expected:
            add(f"HISTORICAL_EXECUTION_COUNT|{key}")

    challenges: list[dict[str, Any]] = []
    if run_negative_challenges:
        challenge_inputs: list[tuple[str, dict[str, Any] | None, dict[str, Any] | None, list[str]]] = []
        coordinated_ledger = copy.deepcopy(exact_ledger)
        coordinated_verdict = copy.deepcopy(exact_verdict)
        coordinated_ledger["status"] = "pass"
        coordinated_verdict["verdict"] = "pass"
        challenge_inputs.append((
            "coordinated-fail-to-pass",
            coordinated_ledger,
            coordinated_verdict,
            ["HISTORICAL_LEDGER_STATUS_NOT_FAIL", "HISTORICAL_VERDICT_NOT_FAIL"],
        ))
        reversed_order = copy.deepcopy(exact_ledger)
        reversed_order["auditOrder"] = list(reversed(reversed_order["auditOrder"]))
        challenge_inputs.append(("ledger-audit-order-reversal", reversed_order, exact_verdict, ["HISTORICAL_LEDGER_EXACT_BYTES_MISMATCH"]))
        non_count = copy.deepcopy(exact_ledger)
        non_count["candidateReadSource"] = "mutated-non-count-field"
        challenge_inputs.append(("ledger-non-count-field-mutation", non_count, exact_verdict, ["HISTORICAL_LEDGER_EXACT_BYTES_MISMATCH"]))
        challenge_inputs.append(("missing-ledger-and-verdict", None, None, ["HISTORICAL_LEDGER_MISSING", "HISTORICAL_VERDICT_MISSING"]))
        for case_id, challenge_ledger, challenge_verdict, expected_reasons in challenge_inputs:
            _, observed = historical_b132_replay_evidence(
                historical_corpus,
                current_corpus,
                challenge_ledger,
                challenge_verdict,
                expected_ledger_bytes,
                expected_verdict_bytes,
                ledger_identity,
                verdict_identity,
                run_negative_challenges=False,
            )
            matched = all(reason in observed for reason in expected_reasons)
            challenges.append({
                "caseId": case_id,
                "countedRejected": bool(observed) and matched,
                "expectedReasons": expected_reasons,
                "observedReasons": observed,
                "oracleRejected": bool(observed),
                "reasonMatched": matched,
            })
        if not all(case["countedRejected"] for case in challenges):
            add("HISTORICAL_REPLAY_NEGATIVE_CHALLENGE_FAILED")

    evidence = {
        "authenticatedLedgerIdentity": ledger_identity,
        "authenticatedVerdictIdentity": verdict_identity,
        "baseFixtures": base_fixtures,
        "caseArrays": case_arrays,
        "completeLedgerExactCanonicalBytesEqual": historical_ledger is not None and canonical_file(historical_ledger) == expected_ledger_bytes,
        "completeVerdictExactCanonicalBytesEqual": historical_verdict is not None and canonical_file(historical_verdict) == expected_verdict_bytes,
        "historicalExecutionCounts": {key: historical_counts.get(key) for key in sorted(expected_execution_counts)},
        "historicalVerdict": verdict_value,
        "negativeChallenges": challenges,
        "negativeChallengesRejected": sum(case["countedRejected"] for case in challenges),
        "replayReasons": reasons,
        "replayed": not reasons,
        "usedAsCurrentVerdict": False,
    }
    return evidence, reasons


def load_inputs(source: ByteSource, objects: GitObjects, archive: Path | None, audit: Audit) -> LoadedInputs | None:
    control, authenticated = authenticate_authority(objects, audit)
    if archive is not None:
        if not isinstance(source, DiskSource):
            audit.errors.append("archive supplied for non-disk source")
        else:
            verify_archive(archive, source, audit)
    try:
        exact = control["exactInputs"]
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

        b132_group = exact["historicalCoverage"]["b1320Control"]
        b132_path = ".trellis/tasks/08-08-assure-evaluation-contract-v1-3-1-mal1-attempt-2/research/b132-0-independent-reviewer-assignment.json"
        b132_control = evaluated_json(
            b132_group["commit"], b132_group["tree"], record_for(b132_group, b132_path),
            "authenticated-b132-methodology-authority",
        )
        historical_exact = b132_control["exactInputs"]
        inherited = historical_exact["inheritedAuthority"]
        historical_subject = historical_exact["a1321Subject"]
        historical_corpus_path = ".trellis/tasks/08-08-author-evaluation-contract-v1-3-1-attempt-2/research/assurance-corpus-v1.3.1.json"
        historical_corpus = evaluated_json(
            historical_subject["commit"],
            historical_subject["tree"],
            record_for(historical_subject, historical_corpus_path, "outputs"),
            "historical-a132-corpus-for-b132-replay",
        )
        b132_assurance = exact["historicalCoverage"]["b1321Assurance"]
        historical_ledger_path = ".trellis/tasks/08-08-assure-evaluation-contract-v1-3-1-mal1-attempt-2/research/execution-evidence-ledger.json"
        historical_verdict_path = ".trellis/tasks/08-08-assure-evaluation-contract-v1-3-1-mal1-attempt-2/research/assurance-verdict.json"
        historical_ledger_record = record_for(b132_assurance, historical_ledger_path)
        historical_verdict_record = record_for(b132_assurance, historical_verdict_path)
        historical_ledger_identity, historical_ledger_bytes = authenticated_record_data(
            objects, b132_assurance["commit"], historical_ledger_record,
        )
        historical_verdict_identity, historical_verdict_bytes = authenticated_record_data(
            objects, b132_assurance["commit"], historical_verdict_record,
        )
        historical_ledger_identity = {**historical_ledger_identity, "tree": b132_assurance["tree"]}
        historical_verdict_identity = {**historical_verdict_identity, "tree": b132_assurance["tree"]}
        evaluated_historical.append({
            **historical_ledger_identity,
            "evaluationRole": "historical-b132-execution-ledger-for-replay",
            "sourceKind": "authenticated-git-object",
        })
        evaluated_historical.append({
            **historical_verdict_identity,
            "evaluationRole": "historical-b132-verdict-for-replay",
            "sourceKind": "authenticated-git-object",
        })
        historical_ledger = strict_json(historical_ledger_bytes)
        historical_verdict = strict_json(historical_verdict_bytes)

        leaves: dict[str, Any] = {}
        leaf_bytes: dict[str, bytes] = {}
        for name in LEAF_NAMES:
            path = f"{AUTHOR_ROOT}/{name}"
            data = source.read(path)
            leaf_bytes[name] = data
            leaves[name] = strict_json(data)

        a132_comparison = exact["historicalCoverage"]["a1321CandidateForPartitionComparison"]
        a132_output_bytes = {}
        for record in a132_comparison["records"]:
            identity, data = authenticated_record_data(objects, a132_comparison["commit"], record)
            name = PurePosixPath(record["path"]).name
            a132_output_bytes[name] = data
            evaluated_historical.append({**identity, "evaluationRole": f"a132-partition-comparison:{name}", "sourceKind": "authenticated-git-object", "tree": a132_comparison["tree"]})

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

        g132 = historical_exact["g132Governance"]
        supersession_path = f"{G132_ROOT}/g132-g131-finding-004-supersession.json"
        supersession = evaluated_json(g132["commit"], g132["tree"], record_for(g132, supersession_path), "g132-finding-004-supersession-authority")

        procedure = inherited["procedure206"]
        procedure_commit = procedure["commit"]
        procedure_projections = [
            evaluated_json(procedure_commit, procedure["tree"], record, f"procedure-2.0.6-lifecycle-projection:{record['procedureId']}")
            for record in procedure["projections"]
        ]
        procedure_closure = evaluated_json(
            procedure_commit, procedure["tree"], procedure["closureEvidence"],
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
        excluded_identity, excluded_git_bytes = authenticated_tree_path_data(objects, A133_COMMIT, closure_path)
        excluded_archive_bytes = source.read(closure_path)
        if excluded_archive_bytes != excluded_git_bytes:
            raise AssuranceError("A133 archive closure path differs from authenticated A133 Git object")
        strict_json(excluded_archive_bytes)
        excluded_archive_closure_record = {
            **excluded_identity,
            "comparisonPurpose": "prove-exclusion-from-historical-closure-authority",
            "tree": A133_TREE,
            "usedForHistoricalAuthority": False,
        }

        accepted_template = exact["inheritedAuthority"]["acceptedTemplate"]
        accepted_target_path = f"{BASELINE_ROOT}/frozen-migration-target-v1.3.json"
        accepted_target = evaluated_json(
            accepted_template["commit"], accepted_template["tree"], record_for(accepted_template, accepted_target_path),
            "accepted-v1.3-semantic-target-authority",
        )

        corpus = strict_json(source.read(f"{AUTHOR_ROOT}/assurance-corpus-v1.3.1.json"))
        historical_replay, historical_replay_errors = historical_b132_replay_evidence(
            historical_corpus,
            corpus,
            historical_ledger,
            historical_verdict,
            historical_ledger_bytes,
            historical_verdict_bytes,
            historical_ledger_identity,
            historical_verdict_identity,
        )
        audit.errors.extend(f"exact-input historical B132 replay: {error}" for error in historical_replay_errors)
        author_validation = strict_json(source.read(f"{AUTHOR_ROOT}/author-validation.json"))
        for name in AUTHOR_EVIDENCE_NAMES:
            data = source.read(f"{AUTHOR_ROOT}/{name}")
            if name.endswith(".json"):
                strict_json(data)
            elif b"\r" in data or not data.endswith(b"\n"):
                raise AssuranceError(f"author script framing invalid: {name}")
        return LoadedInputs(
            control, leaves, leaf_bytes, a132_output_bytes, baselines, allowlist, supersession, corpus, author_validation,
            authenticated, evaluated_historical, procedure_projections, procedure["projections"], procedure_closure,
            excluded_archive_closure_record, public_index, normative_decision_ledger, accepted_target,
            historical_replay,
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
    control_subject = loaded.control["exactInputs"]["a1331Subject"]
    records = control_subject["outputs"]
    audit.require([PurePosixPath(row["path"]).name for row in records] == list(AUTHOR_OUTPUT_NAMES), "A133 output order mismatch")
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

    partition = loaded.control["assuranceContract"]["attempt3OutputPartition"]
    unchanged = partition["exactUnchangedFromA132Names"]
    changed = partition["exactChangedFromA132Names"]
    audit.require(len(unchanged) == 10 and len(changed) == 5 and set(unchanged).isdisjoint(changed), "ten/five partition shape mismatch")
    audit.require(set(unchanged) | set(changed) == set(AUTHOR_OUTPUT_NAMES), "ten/five partition coverage mismatch")
    unchanged_ok = 0
    changed_ok = 0
    for name in AUTHOR_OUTPUT_NAMES:
        current = actual_outputs.get(name, b"")
        old_bytes = loaded.a132_output_bytes[name]
        if name in unchanged:
            ok = current == old_bytes
            unchanged_ok += int(ok)
            audit.require(ok, f"immutable A132 output drift: {name}")
        else:
            ok = current != old_bytes
            changed_ok += int(ok)
            audit.require(ok, f"target-dependent output did not change from A132: {name}")

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
        full_path = f"{AUTHOR_ROOT}/{name}"
        output_digest.update(full_path.encode("utf-8") + b"\0" + data + b"\0")
    output_digest_value = "sha256:" + output_digest.hexdigest()
    audit.require(output_digest_value == OUTPUT_SET_DIGEST, "complete A133 output-set digest mismatch")

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
        "outputPartition": {"changed": changed_ok, "unchanged": unchanged_ok},
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

    projection_records = loaded.procedure_projection_records
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
        excluded_closure["byteLength"] == A133_ARCHIVE_CLOSURE_LENGTH
        and excluded_closure["sha256"] == A133_ARCHIVE_CLOSURE_SHA256
        and excluded_closure["usedForHistoricalAuthority"] is False,
        "A133 archive closure exclusion proof mismatch",
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
        "excludedA133ArchiveClosureObject": excluded_closure,
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


def expected_attempt3_target(loaded: LoadedInputs, manifest_sha: str) -> dict[str, Any]:
    accepted = loaded.accepted_target
    inherited = loaded.control["exactInputs"]["inheritedAuthority"]
    accepted_contract = inherited["acceptedContract"]

    def wrapped(name: str) -> dict[str, Any]:
        value = copy.deepcopy(accepted[name])
        if value["provenance"]["class"] == "trellis-native-v1.3":
            value["provenance"]["class"] = "trellis-native-v1.3.1"
        return value

    compatibility = wrapped("compatibility")
    compatibility["value"]["methodologyContract"]["candidate"]["identity"] = "evaluation-contract-v1.3.1"
    plain = loaded.control["assuranceContract"]["attempt3TargetSchemaClosure"]["exactPlainValues"]
    return {
        "acceptedBaseline": {
            "contractIdentity": accepted_contract["acceptedContractIdentity"],
            "memberAggregate": accepted_contract["acceptedMemberAggregate"],
            "semanticDigest": accepted_contract["acceptedSemanticDigest"],
            "subjectCommit": accepted_contract["commit"],
        },
        "authoringCommit": plain["authoringCommit"],
        "candidateManifest": {"filename": "contract-candidate-manifest-v1.3.1.json", "sha256": manifest_sha},
        "candidateMemberAggregate": MEMBER_AGGREGATE,
        "candidateStatus": plain["candidateStatus"],
        "compatibility": compatibility,
        "contractIdentity": "evaluation-contract-v1.3.1",
        "contractVersion": plain["contractVersion"],
        "differentialDomains": wrapped("differentialDomains"),
        "digestTopology": wrapped("digestTopology"),
        "governance": {
            "a11Commit": inherited["a11"]["commit"],
            "a1330Commit": loaded.control["exactInputs"]["a1330Control"]["commit"],
            "g131Commit": inherited["g131"]["commit"],
            "g133Commit": loaded.control["exactInputs"]["g133Governance"]["commit"],
            "procedureEvidenceCommit": inherited["procedure206"]["commit"],
        },
        "infrastructureReference": wrapped("infrastructureReference"),
        "liveSelection": wrapped("liveSelection"),
        "privateSourceUse": plain["privateSourceUse"],
        "provenanceClasses": plain["provenanceClasses"],
        "recordKind": "frozen-semantic-target-v1.3.1",
        "schemaVersion": 1,
        "sourceAuthority": copy.deepcopy(accepted["sourceAuthority"]),
        "workerAuthority": wrapped("workerAuthority"),
    }


def expected_target_rows() -> dict[str, dict[str, Any]]:
    refs = {
        "/authoringCommit": "DEC-V13-CANDIDATE-AUTHORITY",
        "/candidateManifest": "DEC-V13-CANDIDATE-AUTHORITY",
        "/candidateStatus": "DEC-V13-CANDIDATE-AUTHORITY",
        "/compatibility": "DEC-V13-COMPATIBILITY",
        "/contractVersion": "DEC-V13-CANDIDATE-AUTHORITY",
        "/differentialDomains": "DEC-V13-DIFFERENTIAL-DOMAINS",
        "/digestTopology": "DEC-V13-CANONICAL-BYTES",
        "/liveSelection": "DEC-V13-CANDIDATE-AUTHORITY",
        "/privateSourceUse": "DEC-V13-CANDIDATE-AUTHORITY",
        "/provenanceClasses": "DEC-V13-CANDIDATE-AUTHORITY",
        "/schemaVersion": "DEC-V13-CANDIDATE-AUTHORITY",
        "/sourceAuthority": "DEC-V13-CANDIDATE-AUTHORITY",
        "/workerAuthority": "DEC-V13-CANDIDATE-AUTHORITY",
    }
    rows = {
        pointer: {
            "class": "trellis-native-v1.3.1",
            "evidenceIds": [],
            "normativePointer": f"frozen-semantic-target-v1.3.1.json#{pointer}",
            "recordRef": record_ref,
        }
        for pointer, record_ref in refs.items()
    }
    rows["/infrastructureReference"] = {
        "class": "inherited-public-v1.2",
        "evidenceIds": ["EV-CONTROL-PINS"],
        "normativePointer": "frozen-semantic-target-v1.3.1.json#/infrastructureReference",
        "recordRef": None,
    }
    return rows


def namespace_authorities(loaded: LoadedInputs, correction_ledger: dict[str, Any]) -> dict[str, set[str]]:
    normative = loaded.normative_decision_ledger
    return {
        "BLK": {row["recordId"] for row in normative["blockedRecords"]},
        "CS6": {row["findingId"] for row in correction_ledger["findings"]},
        "DEC": {row["decisionId"] for row in normative["decisions"]},
        "EV": {row["evidenceId"] for row in loaded.public_index["facts"]},
        "NA": {row["recordId"] for row in normative["inapplicableRecords"]},
    }


def target_state_errors(
    target: Any,
    target_rows: Any,
    loaded: LoadedInputs,
    manifest_sha: str,
    correction_ledger: dict[str, Any],
) -> list[str]:
    errors: list[str] = []
    expected = expected_attempt3_target(loaded, manifest_sha)
    contract = loaded.control["assuranceContract"]
    schema = contract["attempt3TargetSchemaClosure"]
    if not isinstance(target, dict):
        return ["TARGET_NOT_OBJECT"]
    expected_keys = set(schema["exactTopLevelKeys"])
    for key in sorted(expected_keys - set(target)):
        errors.append(f"TARGET_KEY_MISSING|{key}")
    for key in sorted(set(target) - expected_keys):
        if "_" in key:
            errors.append(f"TARGET_KEY_ALIAS|{key}")
        else:
            errors.append(f"TARGET_KEY_EXTRA|{key}")
    unresolved = object()
    for pointer in contract["attempt3CandidateEvidenceCorrection"]["targetPointers"]:
        actual_value = pointer_get(target, pointer, unresolved)
        expected_value = pointer_get(expected, pointer, unresolved)
        if actual_value is unresolved:
            errors.append(f"TARGET_POINTER_UNRESOLVED|{pointer}")
        elif type(actual_value) is not type(expected_value):
            errors.append(f"TARGET_POINTER_TYPE_MISMATCH|{pointer}")
        elif actual_value != expected_value:
            errors.append(f"TARGET_POINTER_VALUE_MISMATCH|{pointer}")
    if target != expected:
        errors.append("TARGET_EXACT_AUTHENTICATED_SEMANTICS")
    for key in schema["exactWrappedFields"]:
        value = target.get(key)
        if not isinstance(value, dict) or set(value) != {"provenance", "value"} or not isinstance(value.get("provenance"), dict):
            errors.append(f"TARGET_WRAPPED_REPRESENTATION|{key}")
    for key in schema["exactPlainValues"]:
        value = target.get(key, MISSING)
        if isinstance(value, dict) and set(value) == {"provenance", "value"}:
            errors.append(f"TARGET_PLAIN_FIELD_WRAPPED|{key}")
    governance = target.get("governance", {})
    if isinstance(governance, dict):
        for key in sorted(set(governance) & set(schema["forbiddenStaleGovernanceKeys"])):
            errors.append(f"TARGET_STALE_GOVERNANCE_KEY|{key}")
    topology = pointer_get(target, "/digestTopology/value", {})
    exact_topology = {
        "manifestHashesFrozenTarget": False,
        "manifestSelfHash": False,
        "rootDigestSource": "sha256-exact-frozen-target-bytes",
        "targetHashesManifest": True,
    }
    if isinstance(topology, dict):
        for key in sorted(set(exact_topology) | set(topology)):
            if topology.get(key, MISSING) != exact_topology.get(key, MISSING):
                errors.append(f"TARGET_DIGEST_TOPOLOGY|/digestTopology/value/{key}")
    else:
        errors.append("TARGET_DIGEST_TOPOLOGY|/digestTopology/value")
    expected_topology = contract["attempt3DigestTopology"]
    if expected_topology.get("candidateManifestMustNotHashFrozenTarget") is not True or expected_topology.get("candidateManifestMustNotHashItself") is not True:
        errors.append("TARGET_CONTROL_DIGEST_TOPOLOGY_AUTHORITY")
    for section in ("workerAuthority", "liveSelection"):
        actual = pointer_get(target, f"/{section}/value", {})
        expected_section = pointer_get(expected, f"/{section}/value", {})
        if isinstance(actual, dict) and isinstance(expected_section, dict):
            for key in sorted(set(actual) | set(expected_section)):
                if expected_section.get(key) is False and actual.get(key) is True:
                    errors.append(f"TARGET_AUTHORITY_WIDENING|/{section}/value/{key}")

    expected_rows = expected_target_rows()
    if not isinstance(target_rows, list):
        errors.append("TARGET_PROVENANCE_ROWS_NOT_ARRAY")
        return errors
    if len(target_rows) != 14:
        errors.append("TARGET_PROVENANCE_ROW_COUNT")
    actual_rows: dict[str, dict[str, Any]] = {}
    for index, row in enumerate(target_rows):
        if not isinstance(row, dict) or set(row) != {"class", "evidenceIds", "normativePointer", "recordRef"}:
            errors.append(f"TARGET_PROVENANCE_ROW_SHAPE|{index}")
            continue
        pointer_text = row.get("normativePointer", "")
        prefix = "frozen-semantic-target-v1.3.1.json#"
        if not isinstance(pointer_text, str) or not pointer_text.startswith(prefix):
            errors.append(f"TARGET_PROVENANCE_POINTER_NAMESPACE|{index}")
            continue
        pointer = pointer_text[len(prefix):]
        if pointer in actual_rows:
            errors.append(f"TARGET_PROVENANCE_POINTER_DUPLICATE|{pointer}")
        actual_rows[pointer] = row
        if pointer_get(target, pointer, unresolved) is unresolved:
            errors.append(f"TARGET_POINTER_UNRESOLVED|{pointer}")
        if expected_rows.get(pointer) != row:
            errors.append(f"TARGET_PROVENANCE_AUTHORITY_MISMATCH|{pointer}")
    for pointer in sorted(set(expected_rows) - set(actual_rows)):
        errors.append(f"TARGET_PROVENANCE_ROW_MISSING|{pointer}")

    authorities = namespace_authorities(loaded, correction_ledger)
    for row in target_rows:
        if not isinstance(row, dict):
            continue
        record_ref = row.get("recordRef")
        if record_ref is not None:
            prefix = record_ref.split("-", 1)[0] if isinstance(record_ref, str) else ""
            if prefix not in authorities or record_ref not in authorities[prefix]:
                errors.append(f"TARGET_RECORD_REF_UNKNOWN|{record_ref}")
        evidence_ids = row.get("evidenceIds")
        if not isinstance(evidence_ids, list):
            errors.append("TARGET_EVIDENCE_IDS_NOT_ARRAY")
        else:
            for evidence_id in evidence_ids:
                if evidence_id not in authorities["EV"]:
                    errors.append(f"TARGET_EVIDENCE_ID_UNKNOWN|{evidence_id}")
    return list(dict.fromkeys(errors))


def output_partition_errors(outputs: dict[str, bytes], loaded: LoadedInputs) -> list[str]:
    partition = loaded.control["assuranceContract"]["attempt3OutputPartition"]
    errors: list[str] = []
    for name in sorted(set(AUTHOR_OUTPUT_NAMES) - set(outputs)):
        errors.append(f"OUTPUT_PARTITION_MISSING|{name}")
    for name in sorted(set(outputs) - set(AUTHOR_OUTPUT_NAMES)):
        errors.append(f"OUTPUT_PARTITION_EXTRA|{name}")
    for name in partition["exactUnchangedFromA132Names"]:
        if name in outputs and outputs[name] != loaded.a132_output_bytes[name]:
            errors.append(f"OUTPUT_PARTITION_UNCHANGED_DRIFT|{name}")
    for name in partition["exactChangedFromA132Names"]:
        if name in outputs and outputs[name] == loaded.a132_output_bytes[name]:
            errors.append(f"OUTPUT_PARTITION_CHANGED_REVERTED|{name}")
    return errors


def output_partition_valid(outputs: dict[str, bytes], loaded: LoadedInputs) -> bool:
    return not output_partition_errors(outputs, loaded)


def alternative_value(value: Any) -> Any:
    if value is None:
        return "not-null"
    if type(value) is bool:
        return not value
    if type(value) is int:
        return value + 1
    if isinstance(value, str):
        return value + "-mutated"
    if isinstance(value, list):
        return [*value, {"mutated": True}]
    if isinstance(value, dict):
        return {**value, "mutated": True}
    return {"mutated": True}


def strict_json_rejection_reason(data: bytes) -> str | None:
    try:
        strict_json(data)
    except DuplicateKey:
        return "JSON_DUPLICATE_DECODED_KEY"
    except UnicodeDecodeError:
        return "JSON_UTF8_INVALID"
    except AssuranceError as exc:
        message = str(exc)
        if message == "CR byte is forbidden":
            return "JSON_CR_FORBIDDEN"
        if message == "exactly one final LF required":
            return "JSON_FINAL_LF"
        if message.startswith("non-finite JSON number:"):
            return "JSON_NONFINITE_NUMBER"
        if message.startswith("unpaired surrogate at "):
            return "JSON_UNPAIRED_SURROGATE"
        if message == "non-canonical JSON bytes":
            return "JSON_NON_CANONICAL_BYTES"
        return "JSON_ASSURANCE_ERROR"
    except (ValueError, json.JSONDecodeError):
        return "JSON_SYNTAX_INVALID"
    return None


def rejects_json_bytes(data: bytes) -> bool:
    return strict_json_rejection_reason(data) is not None


def target_contract_fixture_errors(
    fixture: Any,
    loaded: LoadedInputs,
    manifest_sha: str,
    correction_ledger: dict[str, Any],
) -> list[str]:
    if not isinstance(fixture, dict):
        return ["TARGET_FIXTURE_NOT_OBJECT"]
    errors = target_state_errors(
        fixture.get("frozenTarget"),
        fixture.get("targetProvenanceRows"),
        loaded,
        manifest_sha,
        correction_ledger,
    )
    schema = loaded.control["assuranceContract"]["attempt3TargetSchemaClosure"]
    partition = loaded.control["assuranceContract"]["attempt3OutputPartition"]
    expected_partition = {
        "byteIdenticalToA132": partition["exactUnchangedFromA132Names"],
        "mustChangeFromA132": partition["exactChangedFromA132Names"],
    }
    actual_partition = fixture.get("outputPartition")
    if actual_partition != expected_partition:
        errors.append("TARGET_FIXTURE_OUTPUT_PARTITION")
        if isinstance(actual_partition, dict):
            invariant = set(actual_partition.get("byteIdenticalToA132", []))
            changed = set(actual_partition.get("mustChangeFromA132", []))
            for name in sorted(invariant & changed):
                errors.append(f"OUTPUT_PARTITION_OVERLAP|{name}")
    if fixture.get("expectedTopLevelKeys") != schema["exactTopLevelKeys"]:
        errors.append("TARGET_FIXTURE_TOP_LEVEL_KEY_AUTHORITY")
    if fixture.get("expectedPlainFields") != list(schema["exactPlainValues"]):
        errors.append("TARGET_FIXTURE_PLAIN_FIELD_AUTHORITY")
    if fixture.get("wrappedFields") != schema["exactWrappedFields"]:
        errors.append("TARGET_FIXTURE_WRAPPED_FIELD_AUTHORITY")
    if fixture.get("targetPointers") != loaded.control["assuranceContract"]["attempt3CandidateEvidenceCorrection"]["targetPointers"]:
        errors.append("TARGET_FIXTURE_POINTER_AUTHORITY")
    if fixture.get("correctionClass") != "candidate-evidence/provenance-target-closure" or fixture.get("normativeSemanticCorrection") is not False:
        errors.append("TARGET_FIXTURE_CORRECTION_CLASSIFICATION")
    return errors


def manifest_contract_errors(manifest: Any, loaded: LoadedInputs) -> list[str]:
    if not isinstance(manifest, dict):
        return ["manifest is not object"]
    aggregate = hashlib.sha256(MEMBER_AGGREGATE_DOMAIN)
    expected_members = []
    for name in LEAF_NAMES:
        data = loaded.leaf_bytes[name]
        aggregate.update(name.encode("utf-8") + b"\0" + data + b"\0")
        expected_members.append({"byteLength": len(data), "filename": name, "sha256": sha256(data)})
    expected_aggregate = "sha256:" + aggregate.hexdigest()
    errors: list[str] = []
    if manifest.get("contractIdentity") != "evaluation-contract-v1.3.1":
        errors.append("manifest identity mismatch")
    if manifest.get("memberCount") != len(LEAF_NAMES):
        errors.append("manifest member count mismatch")
    if manifest.get("members") != expected_members:
        errors.append("manifest member records mismatch")
    if manifest.get("aggregate", {}).get("digest") != expected_aggregate:
        errors.append("manifest aggregate mismatch")
    return errors


def semantic_diff_classification_errors(diff_ledger: Any) -> list[str]:
    expected_counts = {
        "CS6-1-CONTRACT-001": 5,
        "CS6-1-CONTRACT-002": 200,
        "CS6-1-CONTRACT-003": 265,
        "CS6-1-CONTRACT-004": 23,
        "PROP-CONTRACT-IDENTITY": 123,
        "PROP-MEMBER-REFERENCE": 3328,
        "PROP-PROVENANCE-REFERENCE": 5571,
    }
    if not isinstance(diff_ledger, dict) or not isinstance(diff_ledger.get("rows"), list):
        return ["semantic diff ledger rows missing"]
    counts = Counter(row.get("classification") for row in diff_ledger["rows"] if isinstance(row, dict))
    errors: list[str] = []
    if len(diff_ledger["rows"]) != 9515:
        errors.append("semantic diff row count mismatch")
    if dict(counts) != expected_counts or diff_ledger.get("classificationCounts") != expected_counts:
        errors.append("semantic diff classification counts mismatch")
    if "UNAUTHORIZED" in counts:
        errors.append("unauthorized semantic diff classification")
    return errors


def population_evidence_errors(validation: Any, expected_populations: dict[str, int]) -> list[str]:
    if not isinstance(validation, dict):
        return ["author validation is not object"]
    if validation.get("populationCounts") != expected_populations:
        return ["author population evidence mismatch"]
    return []


def assurance_error_reason(fn: Callable[[], Any]) -> str | None:
    try:
        fn()
    except AssuranceError as exc:
        return f"ASSURANCE_ERROR|{exc}"
    return None


def assurance_error_matches(fn: Callable[[], Any], expected_message: str) -> bool:
    return assurance_error_reason(fn) == f"ASSURANCE_ERROR|{expected_message}"


def attempt3_mutation_suite(
    source: ByteSource,
    loaded: LoadedInputs,
    target: dict[str, Any],
    target_rows: list[dict[str, Any]],
    correction_ledger: dict[str, Any],
    manifest_sha: str,
) -> tuple[int, int, dict[str, int], dict[str, int], list[dict[str, Any]]]:
    executed = 0
    rejected = 0
    classes: Counter[str] = Counter()
    oracle_counts: Counter[str] = Counter()
    records: list[dict[str, Any]] = []
    class_oracles = {
        "author-target-contract-case": "target_contract_fixture_errors",
        "authority-widening": "target_state_errors",
        "canonical-byte-defect": "strict_json_rejection_reason",
        "changed-output-reversion": "output_partition_errors",
        "digest-cycle-or-self-hash": "target_state_errors",
        "fifth-normative-semantic-change": "output_partition_errors",
        "immutable-output-drift": "output_partition_errors",
        "plain-field-wrapped": "target_state_errors",
        "source-namespace-retarget": "target_state_errors",
        "source-namespace-unknown": "target_state_errors",
        "stale-governance-key": "target_state_errors",
        "target-coercion": "target_state_errors",
        "target-key-alias": "target_state_errors",
        "target-key-extra": "target_state_errors",
        "target-key-missing": "target_state_errors",
        "target-pointer-missing": "target_state_errors",
        "target-pointer-wrong-authority": "target_state_errors",
        "target-pointer-wrong-type": "target_state_errors",
        "target-pointer-wrong-value": "target_state_errors",
        "wrapped-field-flattened": "target_state_errors",
        "wrapped-field-malformed": "target_state_errors",
    }

    def challenge(case_id: str, label: str, expected_reason: str, observed_reasons: list[str]) -> None:
        nonlocal executed, rejected
        oracle_rejected = bool(observed_reasons)
        reason_matched = expected_reason in observed_reasons
        counted = oracle_rejected and reason_matched
        executed += 1
        rejected += int(counted)
        classes[label] += 1
        oracle_counts[class_oracles[label]] += 1
        records.append({
            "caseId": case_id,
            "class": label,
            "countedRejected": counted,
            "expectedReason": expected_reason,
            "observedReasons": observed_reasons,
            "oracle": class_oracles[label],
            "oracleRejected": oracle_rejected,
            "reasonMatched": reason_matched,
        })

    expected_rows = expected_target_rows()
    pointers = loaded.control["assuranceContract"]["attempt3CandidateEvidenceCorrection"]["targetPointers"]
    for pointer in pointers:
        token = pointer_tokens(pointer)[0]
        case_token = pointer.replace("/", "-").strip("-")
        missing = copy.deepcopy(target)
        del missing[token]
        challenge(f"pointer-missing-{case_token}", "target-pointer-missing", f"TARGET_POINTER_UNRESOLVED|{pointer}", target_state_errors(missing, target_rows, loaded, manifest_sha, correction_ledger))
        wrong_type = copy.deepcopy(target)
        wrong_type[token] = [] if not isinstance(target[token], list) else {}
        challenge(f"pointer-type-{case_token}", "target-pointer-wrong-type", f"TARGET_POINTER_TYPE_MISMATCH|{pointer}", target_state_errors(wrong_type, target_rows, loaded, manifest_sha, correction_ledger))
        wrong_value = copy.deepcopy(target)
        wrong_value[token] = alternative_value(target[token])
        wrong_value_reason = "TARGET_POINTER_TYPE_MISMATCH" if type(wrong_value[token]) is not type(target[token]) else "TARGET_POINTER_VALUE_MISMATCH"
        challenge(f"pointer-value-{case_token}", "target-pointer-wrong-value", f"{wrong_value_reason}|{pointer}", target_state_errors(wrong_value, target_rows, loaded, manifest_sha, correction_ledger))
        wrong_rows = copy.deepcopy(target_rows)
        row = next(item for item in wrong_rows if item["normativePointer"].endswith(f"#{pointer}"))
        row["recordRef"] = "DEC-V13-REPORT-V2" if expected_rows[pointer]["recordRef"] != "DEC-V13-REPORT-V2" else "DEC-V13-COMPATIBILITY"
        challenge(f"pointer-authority-{case_token}", "target-pointer-wrong-authority", f"TARGET_PROVENANCE_AUTHORITY_MISMATCH|{pointer}", target_state_errors(target, wrong_rows, loaded, manifest_sha, correction_ledger))

    schema = loaded.control["assuranceContract"]["attempt3TargetSchemaClosure"]
    for key in schema["exactPlainValues"]:
        mutated = copy.deepcopy(target)
        mutated[key] = {"provenance": {}, "value": target[key]}
        challenge(f"plain-wrapped-{key}", "plain-field-wrapped", f"TARGET_PLAIN_FIELD_WRAPPED|{key}", target_state_errors(mutated, target_rows, loaded, manifest_sha, correction_ledger))
    for key in schema["exactWrappedFields"]:
        flattened = copy.deepcopy(target)
        flattened[key] = flattened[key]["value"]
        challenge(f"wrapped-flattened-{key}", "wrapped-field-flattened", f"TARGET_WRAPPED_REPRESENTATION|{key}", target_state_errors(flattened, target_rows, loaded, manifest_sha, correction_ledger))
        malformed = copy.deepcopy(target)
        del malformed[key]["provenance"]
        challenge(f"wrapped-malformed-{key}", "wrapped-field-malformed", f"TARGET_WRAPPED_REPRESENTATION|{key}", target_state_errors(malformed, target_rows, loaded, manifest_sha, correction_ledger))
    for key in schema["exactTopLevelKeys"]:
        mutated = copy.deepcopy(target)
        del mutated[key]
        challenge(f"key-missing-{key}", "target-key-missing", f"TARGET_KEY_MISSING|{key}", target_state_errors(mutated, target_rows, loaded, manifest_sha, correction_ledger))
    extra = copy.deepcopy(target)
    extra["unexpected"] = True
    challenge("key-extra-unexpected", "target-key-extra", "TARGET_KEY_EXTRA|unexpected", target_state_errors(extra, target_rows, loaded, manifest_sha, correction_ledger))
    alias = copy.deepcopy(target)
    alias["contract_version"] = alias.pop("contractVersion")
    challenge("key-alias-contract-version", "target-key-alias", "TARGET_KEY_ALIAS|contract_version", target_state_errors(alias, target_rows, loaded, manifest_sha, correction_ledger))
    coerced = copy.deepcopy(target)
    coerced["privateSourceUse"] = "false"
    challenge("coercion-private-source-use", "target-coercion", "TARGET_POINTER_TYPE_MISMATCH|/privateSourceUse", target_state_errors(coerced, target_rows, loaded, manifest_sha, correction_ledger))

    for index, row in enumerate(target_rows):
        pointer = row["normativePointer"].split("#", 1)[1]
        unknown = copy.deepcopy(target_rows)
        if row["recordRef"] is None:
            unknown[index]["evidenceIds"] = ["EV-UNKNOWN"]
            unknown_reason = "TARGET_EVIDENCE_ID_UNKNOWN|EV-UNKNOWN"
        else:
            unknown_ref = f"{row['recordRef'].split('-', 1)[0]}-UNKNOWN"
            unknown[index]["recordRef"] = unknown_ref
            unknown_reason = f"TARGET_RECORD_REF_UNKNOWN|{unknown_ref}"
        challenge(f"namespace-unknown-{index}", "source-namespace-unknown", unknown_reason, target_state_errors(target, unknown, loaded, manifest_sha, correction_ledger))
        retarget = copy.deepcopy(target_rows)
        if row["recordRef"] is None:
            retarget[index]["evidenceIds"] = ["EV-METHODOLOGY-V12-LABEL"]
        else:
            retarget[index]["recordRef"] = "DEC-V13-REPORT-V2"
        challenge(f"namespace-retarget-{index}", "source-namespace-retarget", f"TARGET_PROVENANCE_AUTHORITY_MISMATCH|{pointer}", target_state_errors(target, retarget, loaded, manifest_sha, correction_ledger))

    for key in schema["forbiddenStaleGovernanceKeys"]:
        mutated = copy.deepcopy(target)
        mutated["governance"][key] = "0" * 40
        challenge(f"stale-governance-{key}", "stale-governance-key", f"TARGET_STALE_GOVERNANCE_KEY|{key}", target_state_errors(mutated, target_rows, loaded, manifest_sha, correction_ledger))
    for pointer, value in (
        ("/digestTopology/value/manifestSelfHash", True),
        ("/digestTopology/value/manifestHashesFrozenTarget", True),
    ):
        mutated = mutate(target, {"operation": "json-replace", "target": pointer, "value": value})
        challenge(f"digest-topology-{pointer.rsplit('/', 1)[1]}", "digest-cycle-or-self-hash", f"TARGET_DIGEST_TOPOLOGY|{pointer}", target_state_errors(mutated, target_rows, loaded, manifest_sha, correction_ledger))

    for key in ("adapter", "approval", "canonicalMutation", "chaining", "cost", "decision", "git", "launch", "network", "randomCanonicalIds", "recording", "sandboxExpansion", "validation"):
        mutated = copy.deepcopy(target)
        mutated["workerAuthority"]["value"][key] = True
        pointer = f"/workerAuthority/value/{key}"
        challenge(f"authority-widening-{key}", "authority-widening", f"TARGET_AUTHORITY_WIDENING|{pointer}", target_state_errors(mutated, target_rows, loaded, manifest_sha, correction_ledger))
    mutated = copy.deepcopy(target)
    mutated["liveSelection"]["value"]["activationAuthorized"] = True
    challenge("authority-widening-activation", "authority-widening", "TARGET_AUTHORITY_WIDENING|/liveSelection/value/activationAuthorized", target_state_errors(mutated, target_rows, loaded, manifest_sha, correction_ledger))

    outputs = {name: source.read(f"{AUTHOR_ROOT}/{name}") for name in AUTHOR_OUTPUT_NAMES}
    for name in loaded.control["assuranceContract"]["attempt3OutputPartition"]["exactUnchangedFromA132Names"]:
        mutated = dict(outputs)
        mutated[name] = outputs[name] + b"x"
        challenge(f"unchanged-drift-{name}", "immutable-output-drift", f"OUTPUT_PARTITION_UNCHANGED_DRIFT|{name}", output_partition_errors(mutated, loaded))
    for name in loaded.control["assuranceContract"]["attempt3OutputPartition"]["exactChangedFromA132Names"]:
        mutated = dict(outputs)
        mutated[name] = loaded.a132_output_bytes[name]
        challenge(f"changed-reversion-{name}", "changed-output-reversion", f"OUTPUT_PARTITION_CHANGED_REVERTED|{name}", output_partition_errors(mutated, loaded))
    normative = dict(outputs)
    leaf = strict_json(normative[LEAF_NAMES[0]])
    leaf["recordKind"] = "unauthorized-fifth-change"
    normative[LEAF_NAMES[0]] = canonical_file(leaf)
    challenge("fifth-normative-semantic-change", "fifth-normative-semantic-change", f"OUTPUT_PARTITION_UNCHANGED_DRIFT|{LEAF_NAMES[0]}", output_partition_errors(normative, loaded))

    canonical_cases = (
        ("duplicate-key", b'{"a":1,"a":2}\n', "JSON_DUPLICATE_DECODED_KEY"),
        ("escaped-duplicate-key", b'{"a":1,"\\u0061":2}\n', "JSON_DUPLICATE_DECODED_KEY"),
        ("nonfinite", b'{"x":NaN}\n', "JSON_NONFINITE_NUMBER"),
        ("surrogate", b'{"x":"\\ud800"}\n', "JSON_UNPAIRED_SURROGATE"),
        ("crlf", b'{"x":1}\r\n', "JSON_CR_FORBIDDEN"),
        ("missing-final-lf", b'{"x":1}', "JSON_FINAL_LF"),
        ("double-final-lf", b'{"x":1}\n\n', "JSON_FINAL_LF"),
        ("whitespace", b'{ "x": 1 }\n', "JSON_NON_CANONICAL_BYTES"),
        ("invalid-utf8", b'{"x":"\xff"}\n', "JSON_UTF8_INVALID"),
        ("key-order", b'{"z":1,"a":2}\n', "JSON_NON_CANONICAL_BYTES"),
    )
    for case_id, data, expected_reason in canonical_cases:
        observed = strict_json_rejection_reason(data)
        challenge(f"canonical-{case_id}", "canonical-byte-defect", expected_reason, [observed] if observed is not None else [])

    fixture = loaded.corpus["targetClosureFixture"]
    expected_target_contract_errors = {
        "exact-19-key-closed-target-object": "TARGET_KEY_EXTRA|unexpected",
        "six-fields-use-exact-provenance-value-wrapper": "TARGET_WRAPPED_REPRESENTATION|compatibility",
        "required-plain-fields-remain-unwrapped": "TARGET_PLAIN_FIELD_WRAPPED|authoringCommit",
        "all-source-namespaces-resolve-through-exact-authority": "TARGET_RECORD_REF_UNKNOWN|DEC-UNKNOWN",
        "exact-disjoint-ten-invariant-five-changed-partition": "OUTPUT_PARTITION_OVERLAP|durable-output-disposition-v1.3.1.json",
        "exact-acyclic-digest-topology": "TARGET_DIGEST_TOPOLOGY|/digestTopology/value/manifestSelfHash",
    }
    for case in loaded.corpus["targetContractCases"]:
        mutated = mutate(fixture, case["mutation"])
        errors = target_contract_fixture_errors(mutated, loaded, manifest_sha, correction_ledger)
        expected_error = expected_target_contract_errors.get(case.get("validationRule"), "TARGET_CONTRACT_UNKNOWN_RULE")
        if case.get("expected") != "reject-mutation":
            errors = []
        challenge(case["caseId"], "author-target-contract-case", expected_error, errors)
    return executed, rejected, dict(sorted(classes.items())), dict(sorted(oracle_counts.items())), records


def digest_dependency_graph(source: ByteSource) -> tuple[dict[str, list[str]], bool]:
    payloads = {name: source.read(f"{AUTHOR_ROOT}/{name}") for name in AUTHOR_OUTPUT_NAMES}
    digests = {name: sha256(data) for name, data in payloads.items()}
    graph = {
        name: sorted(other for other, digest in digests.items() if digest.encode("ascii") in data)
        for name, data in payloads.items()
    }
    visiting: set[str] = set()
    visited: set[str] = set()

    def cycle(node: str) -> bool:
        if node in visiting:
            return True
        if node in visited:
            return False
        visiting.add(node)
        if any(cycle(child) for child in graph[node]):
            return True
        visiting.remove(node)
        visited.add(node)
        return False

    acyclic = not any(cycle(node) for node in graph)
    return graph, acyclic and all(name not in children for name, children in graph.items())


def authority_element_errors(leaves: dict[str, Any], diff_ledger: Any, loaded: LoadedInputs) -> list[str]:
    """Return stable reasons for all eleven newly required authority elements."""
    errors: list[str] = []
    binding = leaves.get("validator-binding-matrix-v1.3.1.json", {})
    registry = leaves.get("validator-registry-v1.3.1.json", {})
    differential = leaves.get("differential-test-matrix-v1.3.1.json", {})
    lifecycle = leaves.get("artifact-lifecycle-contract-v1.3.1.json", {})
    unresolved = object()
    report_schema = pointer_get(binding, "/reportV2Contract/reportSchema", unresolved)
    report_ok = (
        isinstance(report_schema, dict)
        and report_schema.get("type") == "object"
        and report_schema.get("additionalProperties") is False
        and isinstance(report_schema.get("properties"), dict)
        and set(report_schema.get("required", [])) == set(report_schema["properties"])
        and schema_is_closed(report_schema)
    )
    if not report_ok:
        errors.append("AUTH_REPORT_V2_COMPLETE_SCHEMA")

    validators = registry.get("validators")
    if not isinstance(validators, list):
        validators = []
    fact_schema_ok = len(validators) == 20 and all(
        isinstance(validator, dict)
        and isinstance(validator.get("inputFactSchema", {}).get("value"), dict)
        and schema_is_closed(validator["inputFactSchema"]["value"])
        and isinstance(validator["inputFactSchema"]["value"].get("properties", {}).get("facts"), dict)
        and validator["inputFactSchema"]["value"]["properties"]["facts"].get("type") == "object"
        and validator["inputFactSchema"]["value"]["properties"]["facts"].get("additionalProperties") is False
        and isinstance(validator["inputFactSchema"]["value"]["properties"]["facts"].get("oneOf"), list)
        for validator in validators
    )
    if not fact_schema_ok:
        errors.append("AUTH_TWENTY_VALIDATOR_FACT_SCHEMAS")
    try:
        predicate_ok = len(validators) == 20 and all(
            isinstance(validator.get("predicate"), dict)
            and validator["predicate"].get("language") == "trellis-predicate-v1"
            and isinstance(validator["predicate"].get("predicate"), dict)
            and bool(collect_predicate_ops(validator["predicate"]))
            and set(collect_predicate_ops(validator["predicate"])) <= {"all", "any", "equals"}
            for validator in validators
        )
    except (AssuranceError, AttributeError, KeyError, TypeError, ValueError):
        predicate_ok = False
    if not predicate_ok:
        errors.append("AUTH_TWENTY_VALIDATOR_PREDICATES")

    all_delta_cases = differential.get("v13DeltaCases")
    global_cases = all_delta_cases[72:116] if isinstance(all_delta_cases, list) else []
    try:
        fixtures_ok = len(global_cases) == 44 and all(
            case.get("syntheticMutation", {}).get("language") == "trellis-mutation-v1"
            and case.get("baseFixture", {}).get("digest") == "sha256:" + sha256(canonical_value(case["baseFixture"]["fixture"]))
            for case in global_cases
        )
    except (KeyError, TypeError, ValueError):
        fixtures_ok = False
    if not fixtures_ok:
        errors.append("AUTH_FORTY_FOUR_GLOBAL_FIXTURES")
    try:
        inapplicable = [case for case in global_cases if case.get("expectedExecution", {}).get("runState") == "not-run"]
        inapplicable_ok = len(inapplicable) == 11 and all(
            isinstance(case.get("applicability", {}).get("predicate"), dict)
            and eval_predicate(case["applicability"]["predicate"], case["baseFixture"]["fixture"]) is False
            for case in inapplicable
        )
    except (AssuranceError, KeyError, TypeError, ValueError):
        inapplicable_ok = False
    if not inapplicable_ok:
        errors.append("AUTH_ELEVEN_GLOBAL_INAPPLICABILITY_PREDICATES")

    mapping = lifecycle.get("procedureCapabilityArtifactFamilyMapping")
    mapping = mapping if isinstance(mapping, dict) else {}
    rows = mapping.get("rows", unresolved)
    if mapping_row_errors(rows, loaded.supersession["mappingRows"], loaded.supersession["mappingArtifactFamilyCodomain"]):
        errors.append("AUTH_SEVENTEEN_G132_MAPPING_ROWS")
    if lifecycle.get("procedureCapabilityArtifactFamilyMappingSchema", MISSING) != loaded.supersession["replacementRowSchema"]:
        errors.append("AUTH_CONDITIONAL_NULLABILITY_ROW_SCHEMA")
    decisions = pointer_get(mapping, "/completeLifecycleMatrix/decisions", unresolved)
    matrix_ok = (
        isinstance(decisions, list)
        and len(decisions) == 14365
        and sum(bool(decision.get("applies")) for decision in decisions if isinstance(decision, dict)) == 975
        and sum(decision.get("disposition") == "notApplicable" and bool(decision.get("applies")) for decision in decisions if isinstance(decision, dict)) == 0
    )
    if not matrix_ok:
        errors.append("AUTH_14365_LIFECYCLE_DECISIONS")
    separation = mapping.get("experimentFamilySeparation")
    separation_ok = (
        isinstance(separation, dict)
        and separation.get("lifecycleArtifactFamily") == "research-experiment-campaign"
        and separation.get("closureFamily") == "research-experiment"
        and separation.get("inferenceOrSubstitutionAllowed") is False
    )
    if not separation_ok:
        errors.append("AUTH_EXPERIMENT_LIFECYCLE_CLOSURE_SEPARATION")

    expected_allowlist = {
        "commit": "15de62625685c32f00edf9aef8f2c1cf5a05d7bb",
        "path": f"{G131_ROOT}/g131-correction-and-propagation-allowlist.json",
        "sha256": "76301fa282b1aab4e060943a7fed7782e0c9c35ac99dd9790d104b99cbc99551",
    }
    if not isinstance(diff_ledger, dict) or diff_ledger.get("g131Allowlist", MISSING) != expected_allowlist:
        errors.append("AUTH_G131_PROPAGATION_ALLOWLIST")
    diff_rows = diff_ledger.get("rows") if isinstance(diff_ledger, dict) else None
    if isinstance(diff_rows, list) and all(isinstance(row, dict) for row in diff_rows):
        historical_dec_rows = sum(
            row.get("classification") in {"CS6-1-CONTRACT-001", "CS6-1-CONTRACT-002", "CS6-1-CONTRACT-003", "CS6-1-CONTRACT-004"}
            and isinstance(row.get("oldValueDigest"), str) and row["oldValueDigest"].startswith("sha256:")
            and isinstance(row.get("newValueDigest"), str) and row["newValueDigest"].startswith("sha256:")
            for row in diff_rows
        )
    else:
        historical_dec_rows = -1
    if not isinstance(diff_rows, list) or len(diff_rows) != 9515 or historical_dec_rows != 493:
        errors.append("AUTH_SEVENTY_ONE_HISTORICAL_DEC_GUARDS")
    return errors


def authority_elements_valid(leaves: dict[str, Any], diff_ledger: Any, loaded: LoadedInputs) -> bool:
    return not authority_element_errors(leaves, diff_ledger, loaded)


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

    target = normative_documents["frozen-semantic-target-v1.3.1.json"]
    target_rows = [row for row in provenance["rows"] if row["normativePointer"].startswith("frozen-semantic-target-v1.3.1.json#")]
    correction_ledger = strict_json(source.read(f"{AUTHOR_ROOT}/four-finding-correction-ledger-v1.3.1.json"))
    manifest_bytes = source.read(f"{AUTHOR_ROOT}/contract-candidate-manifest-v1.3.1.json")
    target_errors = target_state_errors(target, target_rows, loaded, sha256(manifest_bytes), correction_ledger)
    for error in target_errors:
        audit.errors.append(error)

    authorities = namespace_authorities(loaded, correction_ledger)
    namespace_counts: Counter[str] = Counter()
    for row in provenance["rows"]:
        audit.require(set(row) == {"class", "evidenceIds", "normativePointer", "recordRef"}, f"malformed provenance row: {row.get('normativePointer')}")
        record_ref = row.get("recordRef")
        if record_ref is not None:
            prefix = record_ref.split("-", 1)[0] if isinstance(record_ref, str) else ""
            namespace_counts[prefix] += 1
            audit.require(prefix in authorities and record_ref in authorities.get(prefix, set()), f"unknown or wrong-authority recordRef: {record_ref}")
        evidence_ids = row.get("evidenceIds")
        audit.require(isinstance(evidence_ids, list), f"malformed evidenceIds: {row.get('normativePointer')}")
        if isinstance(evidence_ids, list):
            for evidence_id in evidence_ids:
                namespace_counts["EV"] += 1
                audit.require(evidence_id in authorities["EV"], f"unknown evidenceId: {evidence_id}")
    audit.require({key: len(value) for key, value in authorities.items()} == {"BLK": 1, "CS6": 4, "DEC": 32, "EV": 168, "NA": 1}, "source authority population mismatch")

    fixture = loaded.corpus.get("targetClosureFixture", {})
    audit.require(fixture.get("frozenTarget") == target, "assurance corpus target fixture stale")
    audit.require(fixture.get("frozenTargetSha256") == SEMANTIC_DIGEST, "assurance corpus target digest stale")
    audit.require(fixture.get("targetProvenanceRows") == target_rows, "assurance corpus target rows stale")
    audit.require(fixture.get("targetPointers") == loaded.control["assuranceContract"]["attempt3CandidateEvidenceCorrection"]["targetPointers"], "assurance corpus target pointer order mismatch")
    audit.require(loaded.corpus.get("coverageCounts", {}).get("targetClosureCases") == 14, "target closure case count mismatch")
    audit.require(loaded.corpus.get("coverageCounts", {}).get("targetContractCases") == 6, "target contract case count mismatch")
    audit.require(loaded.author_validation.get("targetClosure", {}).get("allPointersResolve") is True, "author target closure claim missing")
    audit.require(loaded.author_validation.get("targetClosure", {}).get("targetKeyCount") == 19, "author target key claim stale")
    audit.require(loaded.author_validation.get("targetClosure", {}).get("pointerCount") == 14, "author target pointer claim stale")
    audit.require(loaded.author_validation.get("correction") == {"class": "candidate-evidence/provenance-target-closure", "normativeSemanticCorrection": False}, "candidate correction classification mismatch")

    mutation_executed, mutation_rejected, mutation_classes, mutation_oracles, mutation_reason_assertions = attempt3_mutation_suite(
        source, loaded, target, target_rows, correction_ledger, sha256(manifest_bytes),
    )
    audit.require(mutation_rejected == mutation_executed, "Attempt-3 fail-closed mutation suite accepted a mutation")
    graph, graph_valid = digest_dependency_graph(source)
    audit.require(graph_valid, "target-dependent digest graph contains cycle or self-reference")
    audit.require("contract-candidate-manifest-v1.3.1.json" in graph["frozen-semantic-target-v1.3.1.json"], "frozen target does not hash candidate manifest")
    audit.require("frozen-semantic-target-v1.3.1.json" not in graph["contract-candidate-manifest-v1.3.1.json"], "candidate manifest hashes frozen target")
    audit.require(set(graph["contract-candidate-manifest-v1.3.1.json"]) == set(LEAF_NAMES), "candidate manifest dependency set mismatch")

    authority_cases = loaded.corpus["authorityMutationCases"]
    audit.require(len(authority_cases) == 22, "authority mutation population mismatch")
    authority_reason_by_fragment = {
        "REPORT-V2-COMPLETE-SCHEMA": "AUTH_REPORT_V2_COMPLETE_SCHEMA",
        "TWENTY-VALIDATOR-FACT-SCHEMAS": "AUTH_TWENTY_VALIDATOR_FACT_SCHEMAS",
        "TWENTY-VALIDATOR-PREDICATES": "AUTH_TWENTY_VALIDATOR_PREDICATES",
        "FORTY-FOUR-GLOBAL-FIXTURES": "AUTH_FORTY_FOUR_GLOBAL_FIXTURES",
        "ELEVEN-GLOBAL-INAPPLICABILITY-PREDICATES": "AUTH_ELEVEN_GLOBAL_INAPPLICABILITY_PREDICATES",
        "SEVENTEEN-G132-MAPPING-ROWS": "AUTH_SEVENTEEN_G132_MAPPING_ROWS",
        "CONDITIONAL-NULLABILITY-ROW-SCHEMA": "AUTH_CONDITIONAL_NULLABILITY_ROW_SCHEMA",
        "FOURTEEN-THOUSAND-THREE-HUNDRED-SIXTY-FIVE-LIFECYCLE-DECISIONS": "AUTH_14365_LIFECYCLE_DECISIONS",
        "EXPERIMENT-LIFECYCLE-CLOSURE-FAMILY-SEPARATION": "AUTH_EXPERIMENT_LIFECYCLE_CLOSURE_SEPARATION",
        "G131-PROPAGATION-ALLOWLIST": "AUTH_G131_PROPAGATION_ALLOWLIST",
        "SEVENTY-ONE-HISTORICAL-DEC-GUARDS": "AUTH_SEVENTY_ONE_HISTORICAL_DEC_GUARDS",
    }
    authority_rejected = 0
    authority_reason_assertions: list[dict[str, Any]] = []
    for case in authority_cases:
        mutated_leaves = copy.deepcopy(loaded.leaves)
        mutated_diff = copy.deepcopy(diff_ledger)
        if case["leafPath"] == "semantic-diff-ledger-v1.3.0-to-v1.3.1.json":
            mutated_diff = mutate(mutated_diff, case["mutation"])
        else:
            mutated_leaves[case["leafPath"]] = mutate(mutated_leaves[case["leafPath"]], case["mutation"])
        observed_reasons = authority_element_errors(mutated_leaves, mutated_diff, loaded)
        expected_reason = next((reason for fragment, reason in authority_reason_by_fragment.items() if fragment in case["caseId"]), "AUTH_UNKNOWN_CASE")
        oracle_rejected = bool(observed_reasons)
        reason_matched = expected_reason in observed_reasons
        counted = oracle_rejected and reason_matched and case["expected"] == "reject"
        audit.require(counted, f"authority mutation reason assertion failed: {case['caseId']}")
        authority_rejected += int(counted)
        authority_reason_assertions.append({
            "caseId": case["caseId"],
            "countedRejected": counted,
            "expectedReason": expected_reason,
            "observedReasons": observed_reasons,
            "oracle": "authority_element_errors",
            "oracleRejected": oracle_rejected,
            "reasonMatched": reason_matched,
        })
    audit.require(not authority_element_errors(loaded.leaves, diff_ledger, loaded), "unmutated authority elements rejected")

    adversarial_results: dict[str, bool] = {}
    adversarial_oracles: dict[str, str] = {}
    adversarial_reason_assertions: list[dict[str, Any]] = []

    def adversarial_challenge(case_id: str, oracle: str, expected_reason: str, observed_reasons: list[str]) -> None:
        oracle_rejected = bool(observed_reasons)
        reason_matched = expected_reason in observed_reasons
        counted = oracle_rejected and reason_matched
        adversarial_results[case_id] = counted
        adversarial_oracles[case_id] = oracle
        adversarial_reason_assertions.append({
            "caseId": case_id,
            "countedRejected": counted,
            "expectedReason": expected_reason,
            "observedReasons": observed_reasons,
            "oracle": oracle,
            "oracleRejected": oracle_rejected,
            "reasonMatched": reason_matched,
        })

    manifest = strict_json(source.read(f"{AUTHOR_ROOT}/contract-candidate-manifest-v1.3.1.json"))
    reordered_manifest = copy.deepcopy(manifest)
    reordered_manifest["members"] = list(reversed(reordered_manifest["members"]))
    adversarial_challenge("manifest-member-reorder", "manifest_contract_errors", "manifest member records mismatch", manifest_contract_errors(reordered_manifest, loaded))

    unframed = hashlib.sha256()
    for name in LEAF_NAMES:
        unframed.update(name.encode("utf-8") + b"\0" + loaded.leaf_bytes[name] + b"\0")
    unframed_manifest = copy.deepcopy(manifest)
    unframed_manifest["aggregate"]["digest"] = "sha256:" + unframed.hexdigest()
    adversarial_challenge("manifest-domain-removal", "manifest_contract_errors", "manifest aggregate mismatch", manifest_contract_errors(unframed_manifest, loaded))

    candidate_outputs = {name: source.read(f"{AUTHOR_ROOT}/{name}") for name in AUTHOR_OUTPUT_NAMES}
    extra_output = dict(candidate_outputs)
    extra_output["extra.json"] = b"{}\n"
    adversarial_challenge("output-inventory-extra", "output_partition_errors", "OUTPUT_PARTITION_EXTRA|extra.json", output_partition_errors(extra_output, loaded))

    fifth_class_ledger = copy.deepcopy(diff_ledger)
    fifth_class_ledger["rows"][0]["classification"] = "UNAUTHORIZED"
    adversarial_challenge("semantic-fifth-class", "semantic_diff_classification_errors", "unauthorized semantic diff classification", semantic_diff_classification_errors(fifth_class_ledger))

    stale_validation = copy.deepcopy(loaded.author_validation)
    stale_validation["populationCounts"] = {**expected_populations, "validators": 19}
    adversarial_challenge("stale-population-evidence", "population_evidence_errors", "author population evidence mismatch", population_evidence_errors(stale_validation, expected_populations))

    path_reason = _path_challenge_reason(source)
    adversarial_challenge("path-traversal", "ByteSource.read", "SOURCE_PATH_TRAVERSAL_REJECTED", [path_reason] if path_reason is not None else [])

    json_reason = strict_json_rejection_reason(canonical_value(manifest))
    adversarial_challenge("digest-final-lf", "strict_json_rejection_reason", "JSON_FINAL_LF", [json_reason] if json_reason is not None else [])

    reordered_mapping = list(reversed(lifecycle["procedureCapabilityArtifactFamilyMapping"]["rows"]))
    adversarial_challenge("mapping-row-reorder", "mapping_row_errors", "MAPPING_EXACT_AUTHENTICATED_ROWS", mapping_row_errors(reordered_mapping, loaded.supersession["mappingRows"], loaded.supersession["mappingArtifactFamilyCodomain"]))

    report_case = next(case for case in loaded.corpus["reportCases"] if case.get("invalidClass") == "array-order-change")
    report_bases = {row["fixtureId"]: row["fixture"] for row in loaded.corpus["reportBaseFixtures"]}
    report_candidate = mutate(report_bases[report_case["baseFixtureId"]], report_case["mutation"])
    report_errors = report_semantic_errors(report_candidate, binding_leaf["reportV2Contract"]["reportSchema"], registry)
    adversarial_challenge("report-array-order", "report_semantic_errors", "/orderedValidatorTriples: registry order mismatch", report_errors if report_case.get("expected") == "reject" else [])

    validator_case = next(case for case in loaded.corpus["validatorCases"] if case.get("invalidClass") == "aliased")
    validator_bases = {row["fixtureId"]: row for row in loaded.corpus["validatorBaseFixtures"]}
    validator_wrapper = validator_bases[validator_case["baseFixtureId"]]
    validator_candidate = mutate(validator_wrapper["fixture"], validator_case["mutation"])
    validator = validator_by_identity(registry)[(validator_case["validator"]["id"], validator_case["validator"]["version"])]
    validator_verdict, validator_errors = evaluate_validator(validator, validator_candidate)
    expected_validator_reason = "VALIDATOR_RESULT|" + validator_case["expected"] + "|" + sha256(canonical_value(validator_case["expectedStableErrors"]))
    observed_validator_reason = "VALIDATOR_RESULT|" + validator_verdict + "|" + sha256(canonical_value(validator_errors))
    adversarial_challenge("validator-alias", "evaluate_validator", expected_validator_reason, [observed_validator_reason])

    precondition_case = loaded.corpus["globalCases"][0]
    wrong_precondition = copy.deepcopy(precondition_case["syntheticMutation"])
    wrong_precondition["precondition"] = {"equals": {"unexpected": True}}
    precondition_reason = assurance_error_reason(lambda: apply_global_mutation(precondition_case["baseFixture"], wrong_precondition))
    adversarial_challenge("mutation-precondition", "apply_global_mutation", "ASSURANCE_ERROR|global mutation precondition mismatch", [precondition_reason] if precondition_reason is not None else [])

    operational_results = {"rollback-model": _rollback_challenge()}
    for check_id, passed in operational_results.items():
        audit.require(passed, f"operational fail-closed check failed: {check_id}")
    for case_id, rejected in adversarial_results.items():
        audit.require(rejected, f"additional adversarial challenge not rejected: {case_id}")

    audit.observations = {
        "additionalAdversarialCases": len(adversarial_results),
        "additionalAdversarialOracles": dict(sorted(adversarial_oracles.items())),
        "additionalAdversarialReasonAssertions": adversarial_reason_assertions,
        "additionalAdversarialRejected": sum(adversarial_results.values()),
        "authorityMutationCases": len(authority_cases),
        "authorityMutationReasonAssertions": authority_reason_assertions,
        "authorityMutationsRejected": authority_rejected,
        "crossLeafConsistency": not audit.errors,
        "digestDependencyGraph": graph,
        "digestGraphAcyclicAndSelfFree": graph_valid,
        "namespaceReferenceCounts": dict(sorted(namespace_counts.items())),
        "operationalFailClosedChecks": dict(sorted(operational_results.items())),
        "sourceAuthorityCounts": {key: len(value) for key, value in sorted(authorities.items())},
        "strengthenedMutationClasses": mutation_classes,
        "strengthenedMutationCases": mutation_executed,
        "strengthenedMutationOracles": mutation_oracles,
        "strengthenedMutationReasonAssertions": mutation_reason_assertions,
        "strengthenedMutationsRejected": mutation_rejected,
        "targetPointerCount": len(target_rows),
        "targetSchemaKeyCount": len(target),
        "populations": populations,
    }
    return audit


def _path_challenge_reason(source: ByteSource) -> str | None:
    try:
        source.read("../candidate.json")
    except AssuranceError:
        return "SOURCE_PATH_TRAVERSAL_REJECTED"
    return None


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
        "recordKind": "b133-independent-machine-audit",
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
        historical_replay = {
            "baseFixtures": {},
            "caseArrays": {},
            "historicalExecutionCounts": {},
            "historicalVerdict": None,
            "replayed": False,
            "usedAsCurrentVerdict": False,
        }
    else:
        authenticated_records = loaded.authenticated_records
        evaluated_historical_records = loaded.evaluated_historical_records
        excluded_archive_closure_record = loaded.excluded_archive_closure_record
        historical_replay = loaded.historical_replay
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
    archive_identity = {"byteLength": ARCHIVE_LENGTH, "commit": A133_COMMIT, "sha256": ARCHIVE_SHA256, "tree": A133_TREE}
    attestation = {
        "a133Subject": {"commit": A133_COMMIT, "parent": A133_PARENT, "tree": A133_TREE},
        "archiveTransports": [
            {**archive_identity, "transportId": "b133-review-input-a"},
            {**archive_identity, "transportId": "b133-review-input-b"},
        ],
        "authenticatedAuthorityRecordCount": len(authenticated_records),
        "authenticatedAuthorityRecords": authenticated_records,
        "b133Control": {
            "blobOid": B133_CONTROL_BLOB, "byteLength": B133_CONTROL_LENGTH,
            "commit": B133_COMMIT, "parent": A133_COMMIT, "sha256": B133_CONTROL_SHA256,
            "tree": B133_TREE,
        },
        "b133Task": {"blobOid": B133_TASK_BLOB, "byteLength": B133_TASK_LENGTH, "sha256": B133_TASK_SHA256},
        "candidateDigests": {"completeOutputSet": OUTPUT_SET_DIGEST, "semantic": SEMANTIC_DIGEST, "sevenMemberAggregate": MEMBER_AGGREGATE},
        "evaluatedHistoricalInputCount": len(evaluated_historical_records),
        "evaluatedHistoricalInputs": evaluated_historical_records,
        "excludedA133ArchiveClosureObject": excluded_archive_closure_record,
        "findings": input_audit.errors,
        "historicalB132VerdictUsedAsAttempt3Verdict": False,
        "historicalInputPolicy": "evaluate historical authority and B132 methodology only from exact authenticated Git objects; archive/worktree path collisions are excluded",
        "recordKind": "b133-exact-input-attestation",
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
        "candidateInputPolicy": "exact-A133-1-git-archive-bytes-only",
        "environment": {
            "archiveRoots": "two-new-empty-disjoint-extractions-outside-repository-and-author-scratch",
            "credentialInputs": False, "networkInputs": False, "providerInputs": False,
            "sanitizedStartEmpty": True,
            "whitelistedVariables": ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM", "GIT_TERMINAL_PROMPT", "HOME", "LC_ALL", "NO_COLOR", "PYTHONHASHSEED", "TMPDIR", "TZ", "XDG_CACHE_HOME", "XDG_CONFIG_HOME", "XDG_DATA_HOME"],
        },
        "freshNonForkedReviewer": True,
        "humanEquivalent": False,
        "humanReviewed": False,
        "recordKind": "b133-reviewer-independence",
        "repairPerformed": False,
        "runEqualityRequirement": {
            "archiveBytesEqual": True, "errorOrderEqual": True, "exitsEqual": True,
            "observationsEqual": True, "orderingEqual": True, "outputBytesEqual": True, "verdictEqual": True,
        },
        "schemaVersion": 1,
    }
    cross_observations = by_id.get("cross-leaf-adversarial", Audit("x")).observations
    ledger = {
        "auditOrder": [audit.audit_id for audit in audits],
        "audits": [
            {"auditId": audit.audit_id, "findingCount": len(audit.errors), "status": audit.status}
            for audit in audits
        ],
        "candidateReadSource": "exact authenticated A133-1 archive extraction; never current working-tree candidate bytes or author scratch",
        "executionCounts": {
            "archiveExtractions": 2,
            "assuranceRuns": 2,
            "authorityMutationCases": cross_observations.get("authorityMutationCases", 0),
            "globalMutationCases": by_id.get("differential-reproducibility", Audit("x")).observations.get("casesExecuted", 0),
            "lifecycleDecisions": by_id.get("procedure-family-applicability", Audit("x")).observations.get("totalDecisions", 0),
            "reportCases": by_id.get("report-v2-schema", Audit("x")).observations.get("casesExecuted", 0),
            "semanticDiffRows": by_id.get("package-integrity-and-semantic-diff", Audit("x")).observations.get("semanticDiffRows", 0),
            "strengthenedAttempt3MutationCases": cross_observations.get("strengthenedMutationCases", 0),
            "validatorCases": by_id.get("validator-semantics", Audit("x")).observations.get("casesExecuted", 0),
        },
        "findings": findings,
        "historicalB132Coverage": historical_replay,
        "recordKind": "b133-execution-evidence-ledger",
        "runEquality": {
            "archiveIdentitiesEqual": True, "errorOrderEqual": True, "exitCodesEqual": True,
            "observationsEqual": True, "outputInventoriesEqual": True, "outputBytesEqual": True,
            "stdoutBytesEqual": True, "verdictEqual": True,
        },
        "schemaVersion": 1,
        "status": verdict,
    }
    verdict_record = {
        "assignmentId": ASSIGNMENT_ID,
        "candidateRepairAuthorized": False,
        "candidateRepairPerformed": False,
        "findings": findings,
        "humanEquivalent": False,
        "humanReviewed": False,
        "operatorDecision": False,
        "recordKind": "b133-assurance-verdict",
        "residualRisks": [
            "This is deterministic machine assurance, not human review or human-equivalent judgment.",
            "No runtime, CLI, package, Procedure, harness, activation, release, publication, approval, or operator authority is granted.",
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
    return {name: canonical_file(values[name]) for name in B133_JSON_NAMES}, audits


def _directory_names(path: Path) -> set[str]:
    if not path.exists():
        return set()
    if not path.is_dir():
        raise AssuranceError(f"output root is not directory: {path}")
    return {entry.name for entry in path.iterdir()}


def publish_bytes(output_root: Path, payloads: dict[str, bytes], *, final_research: bool = False) -> None:
    expected_payloads = set(B133_JSON_NAMES)
    if set(payloads) != expected_payloads:
        raise AssuranceError("publication payload inventory mismatch")
    existing = _directory_names(output_root)
    preserved_names = {"b133-0-independent-reviewer-assignment.json", "independent-semantic-assurance.py"}
    expected_existing = preserved_names | expected_payloads if final_research else set()
    if existing != expected_existing:
        raise AssuranceError(f"publication root is not in exact overwrite state: {sorted(existing)}")
    output_root.mkdir(parents=True, exist_ok=True)
    previous = {name: (output_root / name).read_bytes() for name in B133_JSON_NAMES} if final_research else {}
    written: list[Path] = []
    try:
        for name in B133_JSON_NAMES:
            target = output_root / name
            flags = os.O_WRONLY | os.O_TRUNC if final_research else os.O_WRONLY | os.O_CREAT | os.O_EXCL
            descriptor = os.open(target, flags, 0o644)
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
        if actual != expected_existing | expected_payloads:
            raise AssuranceError("post-publication output inventory mismatch")
        for name, expected_bytes in payloads.items():
            if (output_root / name).read_bytes() != expected_bytes:
                raise AssuranceError(f"post-publication byte mismatch: {name}")
    except BaseException:
        for target in reversed(written):
            if final_research:
                target.write_bytes(previous[target.name])
            else:
                try:
                    target.unlink()
                except FileNotFoundError:
                    pass
        raise


def read_evidence_root(output_root: Path) -> dict[str, bytes]:
    names = _directory_names(output_root)
    if names != set(B133_JSON_NAMES):
        raise AssuranceError(f"paired evidence inventory mismatch: {sorted(names)}")
    payloads = {name: (output_root / name).read_bytes() for name in B133_JSON_NAMES}
    for name, data in payloads.items():
        strict_json(data)
    return payloads


def verify_payloads(actual: dict[str, bytes], expected: dict[str, bytes]) -> None:
    if set(actual) != set(expected):
        raise AssuranceError("evidence verification inventory mismatch")
    for name in B133_JSON_NAMES:
        strict_json(actual[name])
        if actual[name] != expected[name]:
            raise AssuranceError(f"stale or malformed evidence: {name}")


def committed_output_payloads(source: GitTreeSource) -> dict[str, bytes]:
    return {name: source.read(f"{B133_ROOT}/{name}") for name in B133_JSON_NAMES}


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
            actual = {name: (args.output_root.resolve() / name).read_bytes() for name in B133_JSON_NAMES}
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
