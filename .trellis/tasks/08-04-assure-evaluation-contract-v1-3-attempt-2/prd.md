# V13-B attempt-2 — Independently assure evaluation contract v1.3

## Goal

Mechanically verify the exact immutable V13-A attempt-2 authoring commit, candidate-manifest digest, and evaluation-contract-v1.3.0 digest. Emit unambiguous pass/fail without repairing candidate or production files.

## Independence gate (non-crossable)

A second accountable human, byte-unequal to the V13-A author identity, must:

1. supply a public-safe stable identity and source;
2. authorize committing that identity;
3. review exact P2 commit and digests;
4. accept accountability;
5. participate in separately authorized assignment/activation commit.

Fresh standalone Codex CLI adjunct is required (`originator=codex-tui`, `source=cli`, no resume/parent/subagent) but does **not** replace the human independence predicate.

## Exact future assurance outputs (nine only)

- research/exact-input-attestation.json
- research/reviewer-independence.json
- research/schema-digest-audit.json
- research/provenance-coverage-audit.json
- research/durable-output-lifecycle-audit.json
- research/closure-validator-audit.json
- research/privacy-mutation-audit.json
- research/execution-evidence-ledger.json
- research/assurance-verdict.json

## Attempt-1 relation

Attempt-1 outputs under `08-03-assure-evaluation-contract-v1-3` remain fail historical evidence. Attempt-1 passes are diagnostics only; every domain and mutation must rerun.

## Path allowlist

- `.trellis/tasks/08-04-assure-evaluation-contract-v1-3-attempt-2/**` only

## Acceptance

- [x] Planning complete
- [ ] Second human reviewer assigned (P3)
- [ ] Full assurance from P2 Git objects (P4)
- [ ] Separate auth for nine-output commit
