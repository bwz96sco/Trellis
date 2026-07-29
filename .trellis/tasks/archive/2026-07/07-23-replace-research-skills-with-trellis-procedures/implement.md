# Implementation plan

## Step 0 — Bootstrap

- Create parent and C01-C10 children.
- Persist parent PRD/design/implementation/context manifests.
- Validate parent tree.
- Plan and activate C01 only.

## Step 1 — C01 contract freeze

- Freeze current schema-v1, Dispatch metadata, Skill routing, worker authority, cleanup ownership, and packed payload behavior.
- Define seven-section executable contracts for capability registry, Procedures, policy, v2 activation/approval, commands, validation matrix, digesting, rollout, and rollback.
- Record GitNexus impact analysis for every existing symbol targeted by C02-C09.
- No production routing change.

## Step 2 — C02 core authority

- Add v2 event families and canonical activation/approval lifecycle.
- Preserve v1 parser path, existing payloads, projections, and root authority.
- Gate on mixed-ledger replay and strict lifecycle tests.

## Step 3 — C03/C04 resolution plane

- Replace Skill resolver with capability registry.
- Add bundled/project Procedure resolver and conservative project policy.
- Keep new plane inactive until command and Context gates exist.

## Step 4 — C05 and C06 internal execution gates

- Add activation planning, bounded authorization, explicit approval, and revocation.
- Add the Dispatch-ID zero-write Context successor, exact approval gate, embedded Procedure, shared deterministic output IDs, and atomic consumption as buildable internal paths.
- Keep legacy public Context, legacy public record-result, workers/hooks/workflow, and two-event batch mutually usable during C06 preparation.
- Do not archive C06 or claim public acceptance before Step 5.

## Step 5 — C06+C07 atomic public cutover

- Narrow exception: begin C07 implementation before C06 acceptance so every public producer and consumer changes together.
- Cut public Context, public record-result, mandatory three-event validation, Claude worker, Codex worker, shared hook, and generated Research workflow instructions in one integration group.
- Remove request-file Context routing, `--skill-name`, `record-result --file`, Skill discovery/invocation, and random worker output IDs together.
- Verify authority, network, repository, write-path, no-nested-agent restrictions, named host-adapter/public-lifecycle contracts for both hosts, executable spec/index contracts, generated installs, built output, and actual tarball content. Actual Claude hook subprocess is tested; Codex prose is static-contract validated; deterministic supplied-ID output is an integration oracle, not model compliance.
- Archive C06 and C07 only after joint full verification passes. Preflight exact active/archive paths and effective hook config; require no `after_archive` hooks. Snapshot both `task.json` files and every session file pointing to either child. Archive C06 then immediately C07 with `--no-commit`; verify exact destinations and only allowed task/session deltas. Failure of either invocation or any post-success verification restores both children, both metadata files, and all captured session state before revalidation. Do not claim filesystem transactionality.

## Step 6 — C08/C09 retirement

- Freeze exact Research Skill path/hash evidence.
- Stop generation and safely prune pristine installed files.
- Remove active source/packed payload only after cleanup proof.
- Update executable specs and packed forbidden checks.

## Step 7 — C10 integration

- Rehearse clean installs and historical upgrades.
- Exercise bounded/workflow lifecycles on both hosts.
- Run full quality, packed package, preservation, and negative Skill sweeps.
- Run GitNexus changed-scope review and independent `trellis-check`.
- Archive with `--no-commit` only when all acceptance evidence passes.

## Global gates

- Run upstream GitNexus impact before every existing symbol edit; warn and stop on HIGH/CRITICAL unapproved scope.
- Never implement a later child before predecessor acceptance, except the narrow C06+C07 atomic integration group defined in Steps 4-5; neither child may archive before joint acceptance.
- Never rewrite Research events or weaken zero-write Context.
- Never modify frozen cleanup evidence, external Skill bodies, generic core exports, docs-site, or marketplace.
- Preserve inherited dirty work. No reset, clean, stash, force push, history rewrite, automatic commit, or push.

## Final verification

```bash
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis lint:py
pnpm --filter @mindfoldhq/trellis typecheck
pnpm typecheck
pnpm build
node packages/cli/scripts/release-preflight.js check-versions
node packages/cli/scripts/release-preflight.js verify-packed-core
node packages/cli/scripts/release-preflight.js verify-packed-cli
git diff --check
```
