# Implement Procedure support-pack digest binding

## Goal

Add a compatibility-preserving, fail-closed schema-v2 Procedure pack parser, digest, secure resolver, and exact historical version resolution.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Explicit predecessor gate

P2-01 accepted with frozen package schema, ownership map, and historical resolution contract.

Tree position does not satisfy this dependency. The predecessor's acceptance evidence must exist and pass before this task may start.

## Requirements

- Preserve current schema-v1 parser, exact bytes, digest domain, and 1.0.0 packages unchanged.
- Add strict schema-v2 package parsing and a distinct domain-separated digest over every enumerated authoritative byte.
- Extend project-first and bundled resolution to stable-read complete enumerated packs.
- Resolve existing activations by their recorded Procedure ID/version/digest rather than the registry latest binding.
- Reject malformed manifests, unsupported roles/versions, unsafe paths, symlinks, concurrent replacement, missing/oversized entries, and digest drift.
- Keep unnamed siblings non-authoritative and preserve present-invalid project no-fallback behavior.

## Ownership and exclusions

- Exact paths are frozen in the parent `research/path-ownership-map.md`.
- `packages/core/src/research/procedure-policy.ts` and `procedure-support-pack.ts` with focused core tests.
- `packages/cli/src/commands/research/procedure-resolution.ts`, `dispatch-revalidation.ts`, and focused resolver/revalidation tests.
- P2-02 integrates activation-recorded Procedure ID/version selection into `revalidateDispatchActivationStaged`; its acceptance fixture switches the current registry binding and proves the old activation still resolves only its recorded bytes.
- P2-03 consumes this accepted API for Context/Result flow and does not own historical identity resolution.
- Procedure-package filesystem/digest code-spec content in the child-owned new `research-procedure-packages.md`.
- No family methodology bodies, live registry cutover, or worker Context change.

Global exclusions: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source bodies, generated/installed Research Skills, live model/network/cost execution, and unrelated `.trellis/research/**` state.

## Required evidence

- schema-v2 parser and types
- v2 digest vectors
- secure pack resolver
- historical exact-version resolver
- focused compatibility and adversarial tests
- populated task-local `research/execution-evidence-ledger.json` with exact commands, assertions, retained-output digests, zero-write snapshots where required, and forbidden-content/path scan evidence

## Acceptance Criteria

- [ ] All existing schema-v1 vectors and resolver fixtures remain byte-for-byte valid.
- [ ] The v2 digest changes for every authoritative byte and ignores every unnamed sibling.
- [ ] Project and bundled packs enforce identical inventory, containment, provenance, size, and mutation checks.
- [ ] `revalidateDispatchActivationStaged` resolves old activations by recorded Procedure ID/version after a simulated current-version switch, verifies the recorded digest, and never inherits new bytes.
- [ ] All failures are fail-closed and zero-write.
- [ ] Focused and relevant full tests, build/package checks where applicable, task validation, GitNexus change detection, independent review, and dirty-path audit pass.
- [ ] No task activation, commit, archive, publication, release, or push occurs without separate authorization.

## Out of scope

- Re-evaluating private Skills HEAD.
- Copying private workflow bodies, validators, tests, prompts, cases, or raw outputs.
- Widening worker, network, sandbox, repository, Git, approval, capability-launch, or canonical-mutation authority.
- Work assigned to another Phase-2 child.

## Planning status

- Status remains `planning`.
- `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl` are planning artifacts only.
- A fresh user approval is required before `task.py start`.
