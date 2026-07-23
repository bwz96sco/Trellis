# C01 Freeze Procedure, capability, policy, and compatibility contracts

## Goal

Freeze executable contracts and current compatibility evidence before any Research Skill routing, ledger schema, command, worker, generation, cleanup, or packed-payload behavior changes.

## Requirements

- Freeze exact current schema-v1 event parser, event kinds, Dispatch/Result/Proposal/Decision payloads, reducer state, projection output, rebuild behavior, and lock authority.
- Freeze arbitrary historical `ownerSkill`, optional `provider`, and optional `taskRef` parsing and round-trip behavior as compatibility metadata.
- Freeze current nine-stage Skill resolver behavior, exact-name selection, fallback selection, Claude/Codex host validation, and `complete` rejection so later tests prove deliberate removal rather than accidental drift.
- Define final immutable capability registry fields and exact initial capability-to-stage-to-Procedure inventory.
- Define strict Procedure manifest and instruction contracts, override rules, supported version, containment/symlink rules, deterministic digest input, and embedded worker representation.
- Define conservative project policy schema, tightening-only rules, bounded automatic limits, and mandatory workflow/network/cost/multi-repository/canonical-mutation approval gates.
- Define schema-v2 activation and approval entity/event contracts, mixed-ledger replay rules, state transitions, relationship/order validation, and rollback boundary.
- Define exact CLI signatures and compatibility behavior for `dispatch prepare`, compatibility activation planning, `authorize`, interactive `approve`, `revoke`, `context`, and `record-result`.
- Define request digest and scope-hash inputs so approval binds immutable Dispatch authority without changing existing Dispatch schema.
- Define normalized generic worker input and immutable authority flags for Claude/Codex parity.
- Define separate Research Skill retirement evidence requirements without modifying frozen C10 generic cleanup inventory.
- Record upstream GitNexus impact for every existing production symbol expected to change in C02-C09. Warn and stop before any HIGH or CRITICAL edit not already approved.
- Use seven-section code-spec depth for every cross-layer/schema/command contract.
- Do not change production runtime routing, emit schema-v2 events, stop Skill generation, remove files, or alter packed payload in C01.
- Preserve unrelated dirty work, `.trellis/research/**`, docs-site, marketplace, generic core exports, versions, and Git history. C01 closeout commit may contain only evidence, specs, characterization tests, and task archival; no push.

## Acceptance Criteria

- [x] Exact initial capability and Procedure inventory is frozen with bounded/workflow/advisory classification and activation policy.
- [x] Procedure manifest, `PROCEDURE.md`, override, digest, policy, request digest, and scope-hash contracts are executable and unambiguous.
- [x] Schema-v2 activation/approval event payloads, reducer transitions, batch ordering, mixed replay, expiry/revocation/consumption, and forward-fix rollback rule are frozen.
- [x] Existing schema-v1 golden fixtures pass unchanged and prove no existing payload/projection migration.
- [x] Historical Dispatch compatibility fixtures accept arbitrary `ownerSkill`, `provider`, and `taskRef` values unchanged.
- [x] Current Skill resolver and worker behavior is characterized before removal.
- [x] CLI validation/error matrix covers automatic eligibility, explicit workflow approval, TTY/challenge behavior, drift, wrong host, expiry, revocation, duplicate grants, materialization mismatch, and atomic consumption.
- [x] Claude/Codex normalized worker contract and forbidden authority are frozen.
- [x] Research Skill retirement evidence contract preserves modified, unknown, malformed, external, and Research-state files.
- [x] GitNexus impact map names all existing symbols targeted by C02-C09, callers/processes, risk, and required warning gates.
- [x] Relevant code-specs contain all seven required sections and point to focused tests.
- [x] Focused characterization tests, task validation, and `git diff --check` pass.
- [x] C01 changes only evidence, specs, and characterization tests; production execution flow, canonical Research state, generated payload, packed inventory, and cleanup authority remain unchanged. No push occurs.

## Dependency and Handoff

- No predecessor child.
- C02-C09 must not activate until C01 acceptance passes and archives.
- C10 uses C01 contracts as final integration oracle.
