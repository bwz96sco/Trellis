#!/usr/bin/env python3
"""CS5-3 generator: additive immutable Procedure 2.0.6 family trees (17).

Reads the accepted A3 leaves (family lifecycle rows + binding matrix + 20
validator registry) and the 2.0.5 package skeletons, and writes a complete
2.0.6 tree per family. Never edits 2.0.4/2.0.5 bytes. Digests (procedure
digest framing, pack sha256) are patched afterward by a Node step that calls
the real core functions.
"""
import hashlib
import json
import pathlib
import shutil
import sys

REPO = pathlib.Path(__file__).resolve().parents[3]
A3 = REPO / ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research"
PROC_ROOT = REPO / "packages/cli/src/templates/research/procedures"

ACCEPTED_CONTRACT_VERSION = "evaluation-contract-v1.3.0"
ACCEPTED_CONTRACT_DIGEST = "sha256:dde907ba15d9ce22117b95db2fd9e0a108d4869873801f8c7f93b528f808699f"
ACCEPTED_MEMBER_AGGREGATE = "sha256:83fdc8c292922173e4a67fa57deb65ff302ec107c202e3b793f7b4a93b23c7ef"

alc = json.loads((A3 / "artifact-lifecycle-contract-v1.3.json").read_text())
vbm = json.loads((A3 / "validator-binding-matrix-v1.3.json").read_text())
vr = json.loads((A3 / "validator-registry-v1.3.json").read_text())

def family_of(row):
    v = row["family"]
    return v["value"] if isinstance(v, dict) else v

def public_identity(row):
    v = row["publicIdentity"]
    return v["value"] if isinstance(v, dict) else v

def media_type_of(row):
    v = row["dimensions"]["mediaType"]["value"]
    return v if isinstance(v, str) else "application/json"

# Closed 17-Procedure disposition (must match methodology-v13-runtime.ts).
REQUIRED = {
    "literature-scan-v1": ("research-literature", "closure-artifact-research-literature-methodology-closure-research-literature-json-cc3fe05d40", "methodology/closure/research-literature.json"),
    "literature-review-v1": ("research-literature", "closure-artifact-research-literature-methodology-closure-research-literature-json-cc3fe05d40", "methodology/closure/research-literature.json"),
    "idea-generation-v1": ("research-ideation", "closure-artifact-research-ideation-methodology-closure-research-ideation-json-bf5f473b0a", "methodology/closure/research-ideation.json"),
    "idea-evaluation-v1": ("research-idea-evaluation", "closure-artifact-research-idea-evaluation-methodology-closure-research-idea-evaluation-js-99210b58f8", "methodology/closure/research-idea-evaluation.json"),
    "experiment-campaign-v1": ("research-experiment", "closure-artifact-research-experiment-methodology-closure-research-experiment-json-4d9725b89a", "methodology/closure/research-experiment.json"),
    "experiment-round-v1": ("research-experiment", "closure-artifact-research-experiment-methodology-closure-research-experiment-json-4d9725b89a", "methodology/closure/research-experiment.json"),
}
NA_CODES = {
    "project-setup-v1": "V13_CLOSURE_NOT_APPLICABLE_PROJECT_SETUP",
    "quest-framing-v1": "V13_CLOSURE_NOT_APPLICABLE_QUEST_FRAMING",
    "quest-admin-v1": "V13_CLOSURE_NOT_APPLICABLE_QUEST_ADMIN",
    "survey-v1": "V13_CLOSURE_NOT_APPLICABLE_SURVEY",
    "computation-case-v1": "V13_CLOSURE_NOT_APPLICABLE_COMPUTATION",
    "theory-case-v1": "V13_CLOSURE_NOT_APPLICABLE_THEORY",
    "review-case-v1": "V13_CLOSURE_NOT_APPLICABLE_REVIEW_CASE",
    "review-campaign-v1": "V13_CLOSURE_NOT_APPLICABLE_REVIEW_CAMPAIGN",
    "writing-case-v1": "V13_CLOSURE_NOT_APPLICABLE_WRITING",
    "figure-v1": "V13_CLOSURE_NOT_APPLICABLE_FIGURE",
    "slides-v1": "V13_CLOSURE_NOT_APPLICABLE_SLIDES",
}
NA_RATIONALE = ("This Procedure family has no canonical closure artifact under the accepted A3 "
                "closure contract; closure is explicitly notApplicable and must never be derived "
                "from Result.status.")

LIFECYCLE_FAMILIES = {
    "project-setup-v1": "research-project-setup", "quest-framing-v1": "research-quest",
    "quest-admin-v1": "research-quest-admin", "literature-scan-v1": "research-literature",
    "literature-review-v1": "research-literature", "survey-v1": None,
    "idea-generation-v1": "research-ideation", "idea-evaluation-v1": "research-idea-evaluation",
    "experiment-round-v1": "research-experiment", "experiment-campaign-v1": "research-experiment-campaign",
    "computation-case-v1": "research-computation", "theory-case-v1": "research-computation",
    "review-case-v1": "research-review-case", "review-campaign-v1": "research-review-campaign",
    "writing-case-v1": None, "figure-v1": None, "slides-v1": None,
}

GLOBAL_RULE_PREFIXES = ("validator.", "report.", "authority.", "contract.")
CLOSURE_RULE_PREFIX = "closure."

def sha(b):
    return hashlib.sha256(b).hexdigest()

def compact_json(obj, sort_keys=True):
    return json.dumps(obj, sort_keys=sort_keys, separators=(",", ":"))

def main() -> None:
    families = sorted(set(REQUIRED) | set(NA_CODES))
    assert len(families) == 17, families
    procedures = [p for p in sorted((PROC_ROOT).iterdir()) if p.is_dir()]
    proc_ids = {p.name for p in procedures}
    assert set(families) == proc_ids, (set(families) ^ proc_ids)
    for pid in families:
        v205 = PROC_ROOT / pid / "2.0.5"
        v206 = PROC_ROOT / pid / "2.0.6"
        assert v205.is_dir(), v205
        if v206.exists():
            shutil.rmtree(v206)
        (v206 / "methodology/instructions").mkdir(parents=True)
        (v206 / "methodology/artifacts").mkdir(parents=True)
        (v206 / "methodology/validators").mkdir(parents=True)
        (v206 / "methodology/lifecycle").mkdir(parents=True)
        (v206 / "methodology/bindings").mkdir(parents=True)
        (v206 / "methodology/closure").mkdir(parents=True)

        # procedure.json: 2.0.5 manifest with version -> 2.0.6 (canonical compact).
        p205 = json.loads((v205 / "procedure.json").read_text())
        p205["version"] = "2.0.6"
        (v206 / "procedure.json").write_text(compact_json(p205) + "\n")

        # PROCEDURE.md + checkpoints: byte-for-byte from 2.0.5.
        shutil.copyfile(v205 / "PROCEDURE.md", v206 / "PROCEDURE.md")
        shutil.copyfile(v205 / "methodology/instructions/checkpoints.md",
                        v206 / "methodology/instructions/checkpoints.md")

        lf = LIFECYCLE_FAMILIES[pid]
        rows = [r for r in alc["artifacts"] if family_of(r) == lf] if lf else []
        # artifact contracts aligned to the A3 lifecycle rows of this family.
        contracts = []
        for r in rows:
            d = r["dimensions"]
            consumers = d["consumers"]["value"]
            terminal = d["terminalApplicability"]["value"]
            binding_ids = r["validatorBindingIds"]
            binding_ids = binding_ids["value"] if isinstance(binding_ids, dict) else binding_ids
            contracts.append({
                "id": public_identity(r),
                "version": "1",
                "pathPattern": public_identity(r),
                "mediaType": media_type_of(r),
                "requiredness": "required",
                "cardinality": d["cardinality"]["value"],
                "producer": d["producer"]["value"].get("authority", "worker-proposal-only"),
                "consumers": list(consumers),
                "terminalApplicability": list(terminal),
                "validatorIds": [str(x) for x in binding_ids],
            })
        artifact_contract = {
            "acceptedA3Commit": "5ca3b5cf819944efd88bb5074fea7a5bb3a30fd4",
            "checkpoints": [public_identity(r) for r in rows],
            "contractVersion": ACCEPTED_CONTRACT_VERSION,
            "contracts": contracts,
            "family": lf,
            "procedureVersion": "2.0.6",
            "schemaVersion": 1,
        }
        (v206 / "methodology/artifacts/artifact-contract.json").write_text(
            compact_json(artifact_contract) + "\n")

        # validators.json: exact A3 20-validator registry.
        validators = []
        for v in vr["validators"]:
            ident = v["identity"]["value"] if isinstance(v["identity"], dict) else v["identity"]
            validators.append({"id": ident["id"], "version": ident["version"], "severity": "critical"})
        validators_doc = {
            "methodologyContractDigest": ACCEPTED_CONTRACT_DIGEST,
            "methodologyContractVersion": ACCEPTED_CONTRACT_VERSION,
            "procedureVersion": "2.0.6",
            "schemaVersion": 1,
            "unknownValidatorDisposition": "critical-fail-closed",
            "validators": validators,
        }
        (v206 / "methodology/validators/validators.json").write_text(
            compact_json(validators_doc) + "\n")

        # lifecycle rows (family subset, full A3 row objects).
        lifecycle_doc = {
            "family": lf,
            "procedureId": pid,
            "procedureVersion": "2.0.6",
            "rows": rows,
            "schemaVersion": 1,
        }
        (v206 / "methodology/lifecycle/lifecycle-rows.json").write_text(
            compact_json(lifecycle_doc) + "\n")

        # bindings: family artifact bindings + closure bindings (required only)
        # + all global bindings.
        fam_ids = {r["artifactId"] for r in rows}
        bindings = []
        for b in vbm["bindings"]:
            rule = b["ruleKind"]
            if rule.startswith("artifact."):
                if lf is None or b["targetId"] not in fam_ids:
                    continue
            elif rule.startswith(CLOSURE_RULE_PREFIX):
                if pid not in REQUIRED:
                    continue
            elif rule.startswith(GLOBAL_RULE_PREFIXES):
                pass
            else:
                continue
            bindings.append(b)
        bindings_doc = {
            "bindingCount": len(bindings),
            "bindings": bindings,
            "procedureId": pid,
            "procedureVersion": "2.0.6",
            "schemaVersion": 1,
        }
        (v206 / "methodology/bindings/bindings.json").write_text(
            compact_json(bindings_doc) + "\n")

        # closure artifacts / disposition.
        if pid in REQUIRED:
            family, contract_id, exact_path = REQUIRED[pid]
            closure = {
                "schemaVersion": 1,
                "family": family,
                "selected": {"value": True, "evidenceArtifactIds": []},
                "blocked": {"value": False, "evidenceArtifactIds": []},
            }
            (v206 / "methodology/closure" / (family + ".json")).write_text(
                compact_json(closure) + "\n")
        else:
            disp = {
                "schemaVersion": 1,
                "kind": "notApplicable",
                "procedureId": pid,
                "code": NA_CODES[pid],
                "rationale": NA_RATIONALE,
            }
            (v206 / "methodology/closure/disposition.json").write_text(
                compact_json(disp) + "\n")

        # package-contract.json (CS5-3 binding sidecar; manifest stays closed).
        if pid in REQUIRED:
            family, contract_id, exact_path = REQUIRED[pid]
            closure_disp = {"kind": "required", "family": family,
                            "closureContractId": contract_id,
                            "exactPath": exact_path, "mediaType": "application/json"}
        else:
            closure_disp = {"kind": "notApplicable", "code": NA_CODES[pid],
                            "rationale": NA_RATIONALE}
        package_contract = {
            "schemaVersion": 1,
            "kind": "trellis-procedure-2.0.6-package-contract",
            "procedureId": pid,
            "procedureVersion": "2.0.6",
            "methodologyContractVersion": ACCEPTED_CONTRACT_VERSION,
            "acceptedContractDigest": ACCEPTED_CONTRACT_DIGEST,
            "acceptedMemberAggregateSha256": ACCEPTED_MEMBER_AGGREGATE,
            "closureDisposition": closure_disp,
            "authorityFlags": {
                "activationAuthorized": False,
                "releaseAuthorized": False,
                "publicationAuthorized": False,
                "pushAuthorized": False,
            },
            "liveSelection": "1.0.0",
            "dormant": True,
            "noFallbackTo": "2.0.5",
        }
        (v206 / "methodology/package-contract.json").write_text(
            compact_json(package_contract) + "\n")

        # pack.json manifest (closed 6-key shape) with entries.
        entry_specs = [
            ("methodology/artifacts/artifact-contract.json", "artifacts", "application/json", "worker-visible", ACCEPTED_CONTRACT_VERSION, f"PHASE2-206-{pid}"),
            ("methodology/instructions/checkpoints.md", "instructions", "text/markdown", "worker-visible", "1", f"PHASE2-206-{pid}"),
            ("methodology/validators/validators.json", "validators", "application/json", "root-only", ACCEPTED_CONTRACT_VERSION, f"PHASE2-206-{pid}"),
            ("methodology/lifecycle/lifecycle-rows.json", "other", "application/json", "root-only", ACCEPTED_CONTRACT_VERSION, f"PHASE2-206-{pid}-lifecycle"),
            ("methodology/bindings/bindings.json", "other", "application/json", "root-only", ACCEPTED_CONTRACT_VERSION, f"PHASE2-206-{pid}-bindings"),
            ("methodology/package-contract.json", "other", "application/json", "root-only", ACCEPTED_CONTRACT_VERSION, f"PHASE2-206-{pid}-contract"),
        ]
        if pid in REQUIRED:
            family, contract_id, exact_path = REQUIRED[pid]
            entry_specs.append((exact_path, "artifacts", "application/json", "worker-visible",
                                ACCEPTED_CONTRACT_VERSION, f"PHASE2-206-{pid}-closure"))
        else:
            entry_specs.append(("methodology/closure/disposition.json", "other", "application/json",
                                "worker-visible", ACCEPTED_CONTRACT_VERSION, f"PHASE2-206-{pid}-closure"))
        entries = []
        for rel, role, media, vis, cv, prov in entry_specs:
            path = v206 / rel
            b = path.read_bytes()
            entries.append({
                "path": rel, "role": role, "mediaType": media, "contractVersion": cv,
                "provenanceId": prov, "sha256": sha(b), "maxBytes": len(b) + 1024,
                "workerVisibility": vis,
            })
        pack = {
            "schemaVersion": 1,
            "procedureId": pid,
            "procedureVersion": "2.0.6",
            "methodologyContractVersion": ACCEPTED_CONTRACT_VERSION,
            "methodologyContractDigest": ACCEPTED_CONTRACT_DIGEST,
            "entries": entries,
        }
        pack_bytes = (compact_json(pack) + "\n").encode()
        (v206 / "methodology/pack.json").write_bytes(pack_bytes)
        # Non-entry sidecars (hash-cycle free): digests.json and pack.json.sha256
        # are patched by the Node digest step from the final pack bytes.
        (v206 / "methodology/digests.json").write_text(
            compact_json({"schemaVersion": 1, "procedureId": pid,
                          "procedureVersion": "2.0.6",
                          "procedureDigest": "pending", "packJsonSha256": "pending",
                          "inventoryDigest": "pending"}) + "\n")
        (v206 / "methodology/pack.json.sha256").write_text("pending\n")
        print(f"generated {pid}/2.0.6 ({len(entries)} entries)")

if __name__ == "__main__":
    main()
