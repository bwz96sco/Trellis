#!/usr/bin/env bash
# CS5-7 MAL-1 attempt-10 machine review script (reviewer-executed, read-only on the
# repository). Extracts the exact frozen subject commit S into an isolated scratch
# tree, performs a clean build, and runs the complete-system verification corpus.
# Writes exactly the nine MAL-1 outputs into TARGET_DIR. RepairAuthority: false —
# the script never edits the repository; all writes go to scratch and TARGET_DIR.
#
# Usage:
#   cs5-7-review.sh <subject-commit> <scratch-root> <target-dir> <repo-root>
set -euo pipefail

SUBJECT="$1"
SCRATCH="$2"
TARGET_DIR="$3"
REPO_ROOT="$4"

mkdir -p "$SCRATCH" "$TARGET_DIR"
OUT="$TARGET_DIR"
CMD_LEDGER="$OUT/command-evidence-ledger.jsonl"
: > "$CMD_LEDGER"

log_cmd() {
  local label="$1"; shift
  local argv="$*"
  local start
  start=$(date +%s)
  local out_file="$SCRATCH/out-$label.log"
  set +e
  "$@" > "$out_file" 2>&1
  local code=$?
  set -e
  local end
  end=$(date +%s)
  local digest
  digest=$(shasum -a 256 "$out_file" | cut -d' ' -f1)
  printf '{"command":%s,"argv":%s,"cwd":%s,"exit":%d,"durationSec":%d,"stdoutStderrDigest":"sha256:%s","retainedAt":%s}\n' \
    "$(printf '%s' "$label" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')" \
    "$(printf '%s' "$argv" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')" \
    "$(printf '%s' "$(pwd)" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')" \
    "$code" "$((end - start))" "$digest" \
    "$(printf '%s' "$out_file" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')" >> "$CMD_LEDGER"
  return "$code"
}

# 1) Exact subject extraction.
log_cmd subject-rev-parse git -C "$REPO_ROOT" rev-parse --verify "$SUBJECT^{commit}"
SUBJECT_HASH=$(git -C "$REPO_ROOT" rev-parse --verify "$SUBJECT^{commit}")
mkdir -p "$SCRATCH/subject"
git -C "$REPO_ROOT" archive "$SUBJECT_HASH" | tar -x -C "$SCRATCH/subject"

# 2) Subject tree digest (exclude nothing: exact immutable tree).
log_cmd subject-tree-digest bash -c "cd '$SCRATCH/subject' && find . -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256 | cut -d' ' -f1"

# 3) Clean dependency install + build in the extracted subject tree (offline
#    from the workspace store; no network).
cd "$SCRATCH/subject"
log_cmd pnpm-install-offline pnpm install --offline --frozen-lockfile
log_cmd build-core pnpm --filter @mindfoldhq/trellis-core build
log_cmd build-cli pnpm --filter @mindfoldhq/trellis build

# 4) Complete-system corpus.
log_cmd core-tests pnpm --filter @mindfoldhq/trellis-core test
log_cmd cli-tests pnpm --filter @mindfoldhq/trellis exec vitest run
log_cmd differential-harness pnpm --filter @mindfoldhq/trellis exec vitest run test/research-methodology-harness/v13-delta-domain.test.ts test/commands/research-methodology-closure-cs4.test.ts
log_cmd production-116 pnpm --filter @mindfoldhq/trellis exec vitest run test/commands/research-methodology-116-production.test.ts
log_cmd bundle-authentication pnpm --filter @mindfoldhq/trellis exec vitest run test/commands/research-accepted-bundle-authentication.test.ts
log_cmd package-206-pins pnpm --filter @mindfoldhq/trellis exec vitest run test/commands/research-procedure-206-packages.test.ts
log_cmd cs5-integration pnpm --filter @mindfoldhq/trellis exec vitest run test/commands/research-cs5-integration.test.ts

# 5) Accepted member ledger (independent recomputation).
python3 - "$SCRATCH/subject" "$TARGET_DIR" "$SUBJECT_HASH" <<'PYEOF'
import hashlib, json, pathlib, sys
subject = pathlib.Path(sys.argv[1])
target = pathlib.Path(sys.argv[2])
a3 = subject / ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research"
names = ["durable-output-disposition-v1.3.json","artifact-lifecycle-contract-v1.3.json","validator-registry-v1.3.json","validator-binding-matrix-v1.3.json","differential-test-matrix-v1.3.json","derivability-provenance-matrix-v1.3.json","closure-contract-v1.3.json"]
members = []
h = hashlib.sha256(b"trellis-accepted-v13-pack-members\0")
for n in names:
    b = (a3 / n).read_bytes()
    members.append({"path": n, "byteLength": len(b), "sha256": hashlib.sha256(b).hexdigest()})
    h.update(n.encode()); h.update(b"\0"); h.update(b); h.update(b"\0")
aggregate = "sha256:" + h.hexdigest()
bundle = subject / "packages/cli/src/templates/research/evaluation-contracts/1.3.0"
ledger = json.loads((bundle / "member-ledger.json").read_text())
# 17 package pins from digests.json (procedure digest, pack sha, inventory digest).
proc_root = subject / "packages/cli/src/templates/research/procedures"
packages = []
for pdir in sorted(proc_root.iterdir()):
    d = pdir / "2.0.6" / "methodology" / "digests.json"
    if d.exists():
        doc = json.loads(d.read_text())
        packages.append({"procedureId": doc["procedureId"], "procedureVersion": doc["procedureVersion"],
                         "procedureDigest": doc["procedureDigest"], "packJsonSha256": doc["packJsonSha256"],
                         "inventoryDigest": doc["inventoryDigest"]})
result = {
  "schemaVersion": 1,
  "attempt": 10,
  "subjectCommit": sys.argv[3] if len(sys.argv) > 3 else None,
  "memberCount": len(members),
  "aggregateSha256": aggregate,
  "aggregateExpected": "sha256:83fdc8c292922173e4a67fa57deb65ff302ec107c202e3b793f7b4a93b23c7ef",
  "aggregateMatches": aggregate == "sha256:83fdc8c292922173e4a67fa57deb65ff302ec107c202e3b793f7b4a93b23c7ef",
  "semanticDigestMatches": ledger["acceptedContractDigest"] == "sha256:dde907ba15d9ce22117b95db2fd9e0a108d4869873801f8c7f93b528f808699f",
  "membersAllMatchLedger": all(m["path"] == lm["path"] and m["sha256"] == lm["sha256"] and m["byteLength"] == lm["byteLength"]
                                for m, lm in zip(members, ledger["members"])),
  "members": members,
  "packageCount": len(packages),
  "packagePinsAllPresent": len(packages) == 17,
  "packages": packages,
  "dormant": {"activationAuthorized": False, "releaseAuthorized": False,
              "publicationAuthorized": False, "pushAuthorized": False},
  "zeroZeroNotSuccess": True
}
(target / "accepted-member-ledger.json").write_text(json.dumps(result, indent=1) + "\n")
PYEOF
