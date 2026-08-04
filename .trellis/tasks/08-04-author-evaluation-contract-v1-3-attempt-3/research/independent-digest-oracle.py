#!/usr/bin/env python3
"""Independent digest oracle for A3 — does not import the candidate builder.

Recomputes SHA-256 of leaf members listed in the candidate manifest and
compares them to the manifest and frozen-target sidecars. Used as a second
oracle distinct from build-evaluation-contract-v1.3.py.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

RESEARCH = Path(__file__).resolve().parent
ATTEMPT1_MANIFEST = "4b8f6e507ac7239cc982bcd4941751af284c2e7425c4d65c9a6882b0bb431756"
ATTEMPT1_TARGET = "c9f95d33b8699b007d8e5e6c524b39201e4c3244f35c26d950d51dbdf5c9de4e"
ATTEMPT2_MANIFEST = "d8bc82e870d00593c738c7708528f99381e4d6b308bddf9256d5b4b99563e85f"
ATTEMPT2_TARGET = "76bf0a2402c8585e79499fdfdcc7afda2ff58d479c483fcf19f13e45d9318166"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    manifest_path = RESEARCH / "contract-candidate-manifest-v1.3.json"
    target_path = RESEARCH / "frozen-migration-target-v1.3.json"
    manifest_bytes = manifest_path.read_bytes()
    target_bytes = target_path.read_bytes()
    manifest = json.loads(manifest_bytes.decode("utf-8"))
    target = json.loads(target_bytes.decode("utf-8"))

    member_results = []
    for member in manifest["members"]:
        data = (RESEARCH / member["filename"]).read_bytes()
        digest = sha256_bytes(data)
        if digest != member["sha256"] or len(data) != member["byteLength"]:
            raise SystemExit(f"member mismatch: {member['filename']}")
        member_results.append(
            {
                "filename": member["filename"],
                "sha256": digest,
                "byteLength": len(data),
            }
        )

    manifest_digest = sha256_bytes(manifest_bytes)
    target_digest = sha256_bytes(target_bytes)
    expected_manifest_sidecar = f"{manifest_digest}  contract-candidate-manifest-v1.3.json\n"
    expected_target_sidecar = f"{target_digest}  frozen-migration-target-v1.3.json\n"
    if (RESEARCH / "contract-candidate-manifest-v1.3.sha256").read_text(
        encoding="ascii"
    ) != expected_manifest_sidecar:
        raise SystemExit("manifest sidecar mismatch")
    if (RESEARCH / "frozen-migration-target-v1.3.sha256").read_text(
        encoding="ascii"
    ) != expected_target_sidecar:
        raise SystemExit("target sidecar mismatch")
    if target["candidateManifest"]["sha256"] != manifest_digest:
        raise SystemExit("frozen target does not bind manifest digest")

    if manifest_digest in {ATTEMPT1_MANIFEST, ATTEMPT2_MANIFEST}:
        raise SystemExit("manifest digest collides with prior attempt")
    if target_digest in {ATTEMPT1_TARGET, ATTEMPT2_TARGET}:
        raise SystemExit("target digest collides with prior attempt")

    result = {
        "oracle": "independent-digest-oracle.py",
        "importsBuilder": False,
        "memberCount": len(member_results),
        "members": member_results,
        "manifestDigest": manifest_digest,
        "targetDigest": target_digest,
        "digestsDifferFromAttempt1": True,
        "digestsDifferFromAttempt2": True,
        "ok": True,
    }
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
