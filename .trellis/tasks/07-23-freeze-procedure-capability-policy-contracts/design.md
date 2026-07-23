# Technical design

## Deliverables

C01 produces contract evidence, not runtime behavior:

- `research/compatibility-freeze.md` — exact v1, Dispatch metadata, current Skill resolver, worker, generation, cleanup, and packed behavior.
- `research/procedure-capability-policy-contract.md` — final registry, Procedure, policy, digest, and normalized worker schemas.
- `research/activation-approval-contract.md` — schema-v2 entities/events, reducer transitions, command signatures, validation matrix, and rollout/rollback.
- `research/gitnexus-impact-map.md` — upstream blast radius for C02-C09 existing symbols.
- focused golden/characterization fixtures where existing tests lack immutable proof.
- seven-section code-spec updates in Research core, commands, platform/worker, migration, release, and test contracts.

## Frozen capability inventory

| Stage | Capability | Kind | Activation | Procedure |
|---|---|---|---|---|
| setup | `research.setup.project` | workflow | explicit | `project-setup-v1` |
| framing | `research.framing.quest` | bounded | automatic | `quest-framing-v1` |
| framing | `research.framing.admin` | workflow | explicit | `quest-admin-v1` |
| literature | `research.literature.scan` | bounded | automatic | `literature-scan-v1` |
| literature | `research.literature.review` | workflow | explicit | `literature-review-v1` |
| ideation | `research.ideation.generate` | bounded | automatic | `idea-generation-v1` |
| ideation | `research.ideation.evaluate` | workflow | explicit | `idea-evaluation-v1` |
| experiment | `research.experiment.round` | bounded | automatic | `experiment-round-v1` |
| experiment | `research.experiment.campaign` | workflow | explicit | `experiment-campaign-v1` |
| computation | `research.computation.case` | bounded | automatic | `computation-case-v1` |
| theory | `research.theory.case` | bounded | automatic | `theory-case-v1` |
| audit | `research.audit.case` | bounded | automatic | `review-case-v1` |
| audit | `research.audit.campaign` | workflow | explicit | `review-campaign-v1` |
| writing | `research.writing.case` | bounded | automatic | `writing-case-v1` |

All capabilities use proposal-only worker authority. Automatic capabilities default to single repository, no network, one Dispatch, and at most 15 minutes. Any network, external cost, multi-repository scope, canonical mutation, or capability chaining requires explicit root-side handling; automatic authorization cannot launch another Procedure or Dispatch.

## Procedure manifest contract

Freeze strict fields:

```ts
interface ResearchProcedureManifest {
  schemaVersion: 1;
  id: string;
  version: string;
  stage: DispatchableQuestStage;
  kind: "bounded" | "workflow" | "advisory";
  inputs: readonly string[];
  outputs: readonly string[];
  networkPolicy: "forbidden" | "declared-only";
  repositoryScope: "single" | "multiple";
  maxDurationMinutes?: number;
  maxDispatches?: number;
  replaces?: { id: string; version: string };
}
```

Canonical digest input is domain-separated UTF-8 bytes containing deterministic JSON metadata, one LF separator, then exact `PROCEDURE.md` bytes. Contract must freeze JSON key order, array order, newline treatment, digest prefix, and empty/optional-field behavior before implementation.

Project override exists only when both regular files exist in expected contained dir. Existing partial, malformed, symlinked, mismatched, unsupported, or escaping override fails closed. No fallback around an invalid override.

## Policy contract

Freeze schema-v1 project policy with automatic enable switch, max duration, max Dispatch count, network/cost/multi-repository restrictions, and per-capability tightening. Registry remains upper authority. Policy cannot add capabilities, widen authority, change Procedure binding, downgrade kind, or convert explicit activation to automatic.

## Activation and approval contract

Schema-v2 events introduce `activation` and `approval` aggregate refs without changing v1 event definitions. Freeze:

- exact IDs/prefixes (`act_`, `apr_`);
- event payload required/allowed keys;
- one activation per Dispatch;
- grant only after activation;
- at most one active approval per activation/host;
- consume only in same canonical batch as matching Result + Proposal;
- revoke only active approval;
- consumed/revoked terminal states;
- timestamp/expiry comparison rules;
- event relation and ordering rules;
- deterministic replay/rebuild errors.

Approval binds activation ID, Dispatch/request digest, host, Procedure digest, policy digest, and scope hash. Sidecars are non-authoritative strict materializations.

## Command contract

Freeze signatures and Commander-boundary failures before writes:

```text
trellis research dispatch prepare ... --capability <id>
trellis research dispatch plan-activation <dispatch-id> --capability <id>
trellis research dispatch authorize <dispatch-id> --host <claude|codex>
trellis research dispatch approve <dispatch-id> --host <claude|codex>
trellis research dispatch revoke <approval-id>
trellis research dispatch context <dispatch-id> --host <claude|codex>
trellis research dispatch record-result <dispatch-id> --input <path|->
```

`plan-activation` is compatibility bridge for an existing v1 Dispatch lacking activation. Name remains frozen only after CLI conflict review in C01; if conflict appears, update C01 contract before implementation. `approve` is interactive TTY, shows exact bound scope, and requires deterministic challenge phrase. No `--yes`.

## Test strategy

Prefer additive golden/characterization tests. Existing fixture bytes become immutable inputs. New tests must fail if v1 parser/schema/projection changes, if historical metadata narrows, or if current Skill behavior changes before successor tasks deliberately update the expected contract.
