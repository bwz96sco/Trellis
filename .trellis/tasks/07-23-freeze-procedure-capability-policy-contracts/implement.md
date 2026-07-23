# Implementation plan

## Step 0 — Baseline and scope

- Confirm parent tree and C01 artifacts validate.
- Record current `HEAD`, dirty paths, package versions, export map, schema version, event kinds, generated Skill inventory, and packed required entries without modifying them.
- Run focused existing Research schema-v1, stage capability, Dispatch compatibility/context, worker hook, payload, cleanup, and packed audit tests.

Rollback point: planning artifacts only.

## Step 1 — GitNexus impact map

Run upstream impact before any existing symbol edit. Map at minimum:

- core event/schema/state: `parseResearchEvent`, `ResearchEvent`, `ResearchEventKind`, `ResearchAggregateType`, `ResearchState`, schema parsers, `reduceResearchEvent`, `ResearchMutation`, batch validators, mutation draft conversion;
- routing: `resolveResearchStageCapability`, `normalizeDiscoveredResearchSkillNames`;
- CLI: `prepareResearchDispatch`, Dispatch Context entrypoints/resolver, result recording, command registration;
- payload/workers: `collectResearchSkills`, Research payload collectors, hook/context template exports;
- cleanup/release: current-host cleanup inventory readers, manifest prune/update/uninstall helpers, packed CLI audit entrypoints.

Record direct callers, affected processes, risk, and child owning each edit in `research/gitnexus-impact-map.md`. Warn and stop before any unapproved HIGH/CRITICAL symbol edit.

Rollback point: impact evidence only.

## Step 2 — Freeze current compatibility behavior

Add immutable evidence and focused characterization tests for:

- exact schema-v1 event parsing and rejection;
- exact Dispatch/Result/Proposal/Decision shape and projections;
- arbitrary historical `ownerSkill`, `provider`, and `taskRef` round trip;
- current exact-name optional/fallback Skill resolution and `complete` rejection;
- current Claude/Codex worker/hook Skill behavior;
- current generated Research Skill path/content inventory;
- current cleanup exclusions and packed required Skill entries.

Do not change current expected production behavior in C01.

Rollback point: additive fixtures/tests only.

## Step 3 — Freeze future contracts

Write task research artifacts covering:

- capability inventory/classification and no-chaining rule;
- Procedure manifest/instruction format and deterministic digest algorithm;
- project policy schema and tightening-only merge;
- activation/approval IDs, schema-v2 events, reducer transitions, relationship/order rules, digest/scope binding, expiry/revocation/consumption;
- CLI signatures, TTY/challenge behavior, compatibility activation plan, and materialization authority;
- normalized generic worker input;
- Research Skill retirement evidence and preservation matrix;
- rollout and forward-fix rollback boundary.

Resolve every placeholder and ambiguity before C01 completion.

## Step 4 — Update executable code-specs

Update relevant specs with all seven sections:

1. Scope / Trigger
2. Signatures
3. Contracts
4. Validation & Error Matrix
5. Good/Base/Bad Cases
6. Tests Required
7. Wrong vs Correct

Do not claim runtime implementation exists. Mark new contracts as frozen successor requirements and retain current behavior notes until owning child lands.

## Step 5 — Verification

Run focused characterization tests plus:

```bash
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis lint:py
pnpm --filter @mindfoldhq/trellis typecheck
python3 ./.trellis/scripts/task.py validate .trellis/tasks/07-23-freeze-procedure-capability-policy-contracts
git diff --check
```

Compare frozen versions, export map, schema-v1 fixtures, cleanup evidence, generated payload, and packed inventory before/after.

## Step 6 — Review and handoff

- Run GitNexus changed-scope detection.
- Dispatch independent `trellis-check` against C01 requirements.
- Fix only confirmed C01 contract/fixture defects.
- Archive C01 with `--no-commit` after all acceptance checks pass.
- Leave C02-C10 planning and inactive; C02 may be planned only after C01 archive.
