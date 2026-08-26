#!/usr/bin/env python3
"""Record or verify the C10 direct first-party Claude route without a model call."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from collections.abc import Callable, Mapping, Sequence
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.dont_write_bytecode = True

from claude_runner import (
    DIRECT_CLAUDE_EXECUTABLE,
    EXPECTED_CLAUDE_VERSION,
    build_first_party_environment,
)

RESEARCH_ROOT = Path(__file__).resolve().parents[1]
CLI_VERSION_COMMAND = (DIRECT_CLAUDE_EXECUTABLE, "--version")
AUTH_STATUS_COMMAND = (DIRECT_CLAUDE_EXECUTABLE, "auth", "status", "--json")
REQUIRED_STATUS = {
    "loggedIn": True,
    "authMethod": "claude.ai",
    "apiProvider": "firstParty",
}
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


class AuthPreflightError(ValueError):
    """Raised when executable or authentication routing violates the C10 contract."""


AuthStatusExecutor = Callable[
    [Sequence[str], Mapping[str, str]], subprocess.CompletedProcess[bytes]
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise AuthPreflightError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def _reject_non_json_number(value: str) -> None:
    raise AuthPreflightError(f"non-JSON numeric constant: {value}")


def strict_json_object(data: bytes, label: str) -> dict[str, Any]:
    try:
        value = json.loads(
            data.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_keys,
            parse_constant=_reject_non_json_number,
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise AuthPreflightError(f"{label} is not one UTF-8 JSON object: {error}") from error
    if not isinstance(value, dict):
        raise AuthPreflightError(f"{label} must be a JSON object")
    return value


def _require_exact_keys(value: Mapping[str, Any], expected: set[str], label: str) -> None:
    actual = set(value)
    if actual != expected:
        raise AuthPreflightError(
            f"{label} keys differ; missing={sorted(expected - actual)}, extra={sorted(actual - expected)}"
        )


def _require_utc_timestamp(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise AuthPreflightError(f"{label} must be a UTC date-time ending in Z")
    try:
        datetime.fromisoformat(value.removesuffix("Z") + "+00:00")
    except ValueError as error:
        raise AuthPreflightError(f"{label} must be a valid UTC date-time") from error
    return value


def validate_status(raw_status: Mapping[str, Any]) -> dict[str, Any]:
    status = {key: raw_status.get(key) for key in REQUIRED_STATUS}
    if status != REQUIRED_STATUS:
        raise AuthPreflightError(
            "Claude auth route must be loggedIn=true, authMethod='claude.ai', "
            "apiProvider='firstParty'"
        )
    return dict(REQUIRED_STATUS)


def build_auth_artifact(
    raw_status: bytes,
    *,
    checked_at: str,
    cli_version: str = EXPECTED_CLAUDE_VERSION,
) -> dict[str, Any]:
    status = validate_status(strict_json_object(raw_status, "Claude auth status stdout"))
    if cli_version != EXPECTED_CLAUDE_VERSION:
        raise AuthPreflightError(
            f"direct Claude CLI version must equal {EXPECTED_CLAUDE_VERSION}"
        )
    return {
        "schemaVersion": 1,
        "checkedAt": _require_utc_timestamp(checked_at, "checkedAt"),
        "executable": {
            "path": DIRECT_CLAUDE_EXECUTABLE,
            "version": cli_version,
        },
        "command": list(AUTH_STATUS_COMMAND),
        "status": status,
        "rawStatusSha256": hashlib.sha256(raw_status).hexdigest(),
        "rawStatusBytes": len(raw_status),
    }


def validate_auth_artifact(artifact: Mapping[str, Any]) -> dict[str, Any]:
    _require_exact_keys(
        artifact,
        {
            "schemaVersion",
            "checkedAt",
            "executable",
            "command",
            "status",
            "rawStatusSha256",
            "rawStatusBytes",
        },
        "first-party auth artifact",
    )
    if artifact["schemaVersion"] != 1:
        raise AuthPreflightError("first-party auth artifact schemaVersion must equal 1")
    _require_utc_timestamp(artifact["checkedAt"], "checkedAt")
    executable = artifact["executable"]
    if not isinstance(executable, dict):
        raise AuthPreflightError("first-party auth executable must be an object")
    _require_exact_keys(executable, {"path", "version"}, "first-party auth executable")
    if executable != {
        "path": DIRECT_CLAUDE_EXECUTABLE,
        "version": EXPECTED_CLAUDE_VERSION,
    }:
        raise AuthPreflightError("first-party auth executable identity is not exact")
    if artifact["command"] != list(AUTH_STATUS_COMMAND):
        raise AuthPreflightError("first-party auth artifact command is not exact")
    status = artifact["status"]
    if not isinstance(status, dict):
        raise AuthPreflightError("first-party auth artifact status must be an object")
    _require_exact_keys(status, set(REQUIRED_STATUS), "first-party auth status")
    if status != REQUIRED_STATUS:
        raise AuthPreflightError("first-party auth artifact status is not the required route")
    digest = artifact["rawStatusSha256"]
    if not isinstance(digest, str) or SHA256_RE.fullmatch(digest) is None:
        raise AuthPreflightError("rawStatusSha256 must be a lowercase SHA-256 digest")
    byte_count = artifact["rawStatusBytes"]
    if isinstance(byte_count, bool) or not isinstance(byte_count, int) or byte_count < 1:
        raise AuthPreflightError("rawStatusBytes must be a positive integer")
    return dict(artifact)


def load_auth_artifact(path: Path) -> dict[str, Any]:
    if not path.is_file() or path.is_symlink():
        raise AuthPreflightError(f"first-party auth artifact is not a regular file: {path}")
    return validate_auth_artifact(strict_json_object(path.read_bytes(), str(path)))


def _execute_auth_status(
    command: Sequence[str], environment: Mapping[str, str]
) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        list(command),
        stdin=subprocess.DEVNULL,
        capture_output=True,
        check=False,
        timeout=30,
        env=dict(environment),
    )


def execute_cli_version(
    executor: AuthStatusExecutor = _execute_auth_status,
) -> str:
    environment = build_first_party_environment()
    completed = executor(CLI_VERSION_COMMAND, environment)
    if completed.returncode != 0:
        raise AuthPreflightError(
            f"direct Claude CLI version failed with exit code {completed.returncode}"
        )
    try:
        version = completed.stdout.decode("utf-8").strip()
    except UnicodeDecodeError as error:
        raise AuthPreflightError("direct Claude CLI version is not UTF-8") from error
    if version != EXPECTED_CLAUDE_VERSION:
        raise AuthPreflightError(
            f"direct Claude CLI version must equal {EXPECTED_CLAUDE_VERSION}"
        )
    return version


def execute_auth_status(
    executor: AuthStatusExecutor = _execute_auth_status,
) -> bytes:
    environment = build_first_party_environment()
    completed = executor(AUTH_STATUS_COMMAND, environment)
    if completed.returncode != 0:
        raise AuthPreflightError(
            f"claude auth status failed with exit code {completed.returncode}"
        )
    if not completed.stdout:
        raise AuthPreflightError("claude auth status returned empty stdout")
    return completed.stdout


def write_auth_artifact(artifact: Mapping[str, Any], output_path: Path) -> Path:
    validate_auth_artifact(artifact)
    if output_path.exists():
        raise AuthPreflightError(f"first-party auth artifact already exists: {output_path}")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(output_path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(artifact, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    with temporary.open("rb") as stream:
        os.fsync(stream.fileno())
    os.replace(temporary, output_path)
    return output_path


def run_auth_preflight(
    output_path: Path,
    *,
    executor: AuthStatusExecutor = _execute_auth_status,
    checked_at: str | None = None,
) -> Path:
    cli_version = execute_cli_version(executor)
    raw_status = execute_auth_status(executor)
    artifact = build_auth_artifact(
        raw_status,
        checked_at=checked_at or utc_now(),
        cli_version=cli_version,
    )
    return write_auth_artifact(artifact, output_path)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=RESEARCH_ROOT / "first-party-auth.json",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify an existing artifact without invoking Claude.",
    )
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    output_path = args.output.resolve()
    if args.verify:
        load_auth_artifact(output_path)
        print(f"OK {output_path}")
    else:
        print(run_auth_preflight(output_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
