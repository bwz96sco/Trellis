# CS6 — Complete-system forward correction and MAL-1 attempt 11

## Goal

Perform a forward-only complete-system correction after CS5 attempt 10 while preserving the failed subject and evidence as immutable history. CS6 first decides whether the seven accepted `evaluation-contract-v1.3.0` semantic leaves are sound, then corrects only implementation/package conformance, issues Procedure `2.0.7`, freezes a new exact subject, runs machine-only MAL-1 attempt 11, and stops for a separately authorized operator decision.

## Authoritative predecessor identities

- Repository baseline: `f5249e7544aaa76b66b859433654e3a7d0f77d9e`.
- Historical CS5 subject S10: `916be0a877725f7f91836a3a97e480c1e104e533`.
- S10 extracted-tree digest: `99b3b275699725f2c60c325b2d9d9aa477beb585d3be26986fe03e2ebc890863`.
- Historical CS5 evidence M10: `c951a2f82fa9c649ceb4a290e6896bd084ad70bd`.
- M10 verdict: `fail`.
- Accepted contract: `evaluation-contract-v1.3.0`.
- Accepted semantic digest: `sha256:dde907ba15d9ce22117b95db2fd9e0a108d4869873801f8c7f93b528f808699f`.
- Accepted seven-member aggregate: `sha256:83fdc8c292922173e4a67fa57deb65ff302ec107c202e3b793f7b4a93b23c7ef`.
- Live Procedure selection: exactly `1.0.0`.
- Historical Procedures `2.0.4`, `2.0.5`, and `2.0.6`: immutable evidence.

The historical M10 statement that no subject-byte defect was found is preserved verbatim as historical reviewer output, but it is not CS6 authority. CS6 follows the separately approved successor plan, which requires an independent semantic audit and forward correction of complete-system defects.

## Requirements

### R1 — Forward-only preservation

- Do not reset, rebase, amend, stash, clean, broadly revert, rewrite history, or force-push.
- Do not edit or relabel CS5 tasks, S10, M10, the attempt-10 freeze record, verdict outputs, or the inherited untracked CS5-8 honest-stop record.
- Do not rewrite accepted v1.3.0 leaves or Procedure `2.0.4`–`2.0.6` bytes.
- Preserve `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, and `.trellis/research/**` exactly.

### R2 — Exact reciprocal topology

The campaign contains exactly these ordered children:

1. CS6-0 — establish successor governance;
2. CS6-1 — audit accepted v1.3 semantic leaves;
3. CS6-2 — correct core methodology runtime;
4. CS6-3 — correct CLI recording, authentication, replay, and recovery;
5. CS6-4 — generate Procedure `2.0.7` family packages;
6. CS6-5 — build production mutation and coverage harness;
7. CS6-6 — integrate, install-test, and freeze attempt 11;
8. CS6-7 — run fresh MAL-1 attempt 11;
9. CS6-8 — record a separate operator decision.

Every relationship uses reciprocal `task.json.children` and `task.json.parent`. Tree order is not dependency enforcement; every child repeats its predecessors and stop gates.

### R3 — Semantic decision gate

- CS6-1 independently audits the seven exact accepted leaves.
- If any accepted leaf is semantically defective, stop CS6 technical work and open a separately authored and assured `evaluation-contract-v1.3.1+` cycle.
- If all leaves are sound, retain exact v1.3.0 bytes/digests and correct only runtime, CLI, package, and harness conformance.
- No later child may infer, patch, or reinterpret an accepted leaf.

### R4 — Ordered technical dependencies

- CS6-2 requires a committed CS6-1 `leaves-sound` disposition.
- CS6-3 requires CS6-2's reviewed runtime contract and may call protected canonical primitives but may not edit them.
- CS6-4 requires CS6-2 and CS6-3 interface acceptance and creates only new `2.0.7` package trees.
- CS6-5 requires accepted CS6-2 through CS6-4 technical inputs and must drive production-reachable paths rather than a disconnected oracle.
- CS6-6 requires accepted CS6-1 through CS6-5 outputs, performs real archive/install verification, integrates a dormant candidate I11, and creates one exact freeze record for S11 without a self-hash placeholder.
- CS6-7 requires exact committed S11 plus a fresh mechanically isolated reviewer assignment M0.
- CS6-8 requires committed M11 evidence and a separate explicit operator instruction.

### R5 — Ownership and protected call-only surfaces

- Every production, test, package, campaign-evidence, assurance-output, and operator-decision path has exactly one CS6 child owner.
- Shared HIGH/CRITICAL events, reducers, stores, canonical ledgers, batch committers, locks, and hardened publication internals remain call-only unless a future impact analysis and separate authorization explicitly widens ownership.
- GitNexus impact analysis is mandatory before any future existing symbol edit. HIGH/CRITICAL results stop for confirmation.

### R6 — Version, compatibility, and authority

- Corrected family packages use Procedure `2.0.7` only.
- Live selection remains exactly `1.0.0`; all `2.0.7` packages remain dormant.
- Workers remain Proposal-only; root-owned validation, recording, Decisions, and publication boundaries are not widened.
- Schema-v1 replay, current activation/approval compatibility, historical exact Procedure resolution, and report-v2 digest compatibility must remain fail closed.
- Human review, human equivalence, repair authority, complete-system acceptance, operator decision, activation, archive, release, publication, and push remain false throughout CS6-0 through CS6-7.
- A machine pass cannot auto-accept or activate anything.

### R7 — Assurance and operator separation

- CS6-7 is machine-only MAL-1, authors no repairs, reads exact S11, and writes exactly its nine allowlisted outputs.
- The CS6-7 reviewer must have authored none of the CS6 source, package, fixture, harness, integration, freeze, or oracle bytes.
- CS6-8 records only an operator `accept-with-rationale`, `reject-with-rationale`, or `stop` decision after M11 exists and only under separate authorization.
- Even operator acceptance does not authorize activation, archive, release, publication, or push.

## Acceptance criteria

- [ ] CS6-0 through CS6-8 remain reciprocal, ordered, validated, and path-disjoint.
- [ ] CS6-1 emits an unambiguous `leaves-sound` or `contract-defect` disposition against the exact seven accepted bytes.
- [ ] A `contract-defect` disposition stops the campaign and opens `v1.3.1+`; no technical child proceeds.
- [ ] If leaves are sound, CS6-2 and CS6-3 correct production-reachable methodology and recording behavior without editing protected HIGH/CRITICAL primitives.
- [ ] Exactly 17 immutable dormant Procedure `2.0.7` packages bind the accepted semantic digest and remain internally consistent.
- [ ] CS6-5 proves actual 17-package, 65-artifact, 13-lifecycle-dimension, 20-validator, 876-binding, and 116-mutation behavior with measured zero-write failures.
- [ ] CS6-6 proves archive-safe historical byte preservation and real npm/pnpm packed installation behavior before freezing exact S11.
- [ ] CS6-7 writes exactly nine attempt-11 outputs and reports honest pass/fail without repair or acceptance authority.
- [ ] CS6-8 remains inactive until committed M11 and separate operator authorization exist.
- [ ] Procedure `2.0.4`–`2.0.6`, accepted v1.3.0 leaves, CS5 evidence, protected dirty paths, and `.trellis/research/**` remain unchanged.
- [ ] Live Procedure remains `1.0.0`; all activation/release/publication/push flags remain false.

## Out of scope

- Rewriting CS5 history or accepted contract leaves.
- Activating Procedure `2.0.7` or changing capability defaults.
- Live model, network, provider, release, publication, or push work.
- Claiming human review or human-equivalent assurance.
- Editing shared HIGH/CRITICAL authority primitives without a separately approved ownership amendment.
