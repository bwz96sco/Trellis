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

## Step 4 — C05/C06 execution gates

- Add activation planning, bounded authorization, explicit approval, and revocation.
- Gate read-only Context on exact authority and embed validated Procedure.
- Consume approval atomically with Result + Proposal.

## Step 5 — C07 host cutover

- Cut Claude and Codex to identical normalized Procedure execution.
- Remove Skill discovery/invocation from workers and hook.
- Verify authority, network, repository, write-path, and no-nested-agent restrictions.

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
- Never implement a later child before predecessor acceptance.
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
