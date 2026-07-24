# Research: Frozen Procedure, Policy, and Capability Contract

- **Query**: Verify C01 Procedure/project-policy contract and exact C03 capability bindings for C04.
- **Scope**: internal
- **Date**: 2026-07-24

## Findings

### Files Found

| File Path | Description |
|---|---|
| `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/procedure-capability-policy-contract.md` | Normative C01 Procedure, policy, digest, merge, containment, and authority contract. |
| `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/activation-approval-contract.md` | C05/C06 ownership boundary. |
| `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/compatibility-freeze.md` | Current Skill/worker/package behavior retained through C04. |
| `packages/core/src/research/stage-capabilities.ts` | Current immutable 14-entry C03 registry. |
| `packages/core/test/research/stage-capabilities.test.ts` | Exact registry oracle and default map. |

### Exact Capability and Procedure Inventory

All Procedure versions equal `1.0.0`.

| Capability ID | Stage | Kind / activation | Procedure ID | Network / repositories | Limits |
|---|---|---|---|---|---|
| `research.setup.project` | setup | workflow / explicit | `project-setup-v1` | forbidden / single | 15 / 1 |
| `research.framing.quest` | framing | bounded / automatic | `quest-framing-v1` | forbidden / single | 15 / 1 |
| `research.framing.admin` | framing | workflow / explicit | `quest-admin-v1` | forbidden / single | 15 / 1 |
| `research.literature.scan` | literature | bounded / automatic | `literature-scan-v1` | forbidden / single | 15 / 1 |
| `research.literature.review` | literature | workflow / explicit | `literature-review-v1` | declared-only / multiple | 60 / 4 |
| `research.ideation.generate` | ideation | bounded / automatic | `idea-generation-v1` | forbidden / single | 15 / 1 |
| `research.ideation.evaluate` | ideation | workflow / explicit | `idea-evaluation-v1` | forbidden / single | 30 / 2 |
| `research.experiment.round` | experiment | bounded / automatic | `experiment-round-v1` | forbidden / single | 15 / 1 |
| `research.experiment.campaign` | experiment | workflow / explicit | `experiment-campaign-v1` | declared-only / multiple | 120 / 8 |
| `research.computation.case` | computation | bounded / automatic | `computation-case-v1` | forbidden / single | 15 / 1 |
| `research.theory.case` | theory | bounded / automatic | `theory-case-v1` | forbidden / single | 15 / 1 |
| `research.audit.case` | audit | bounded / automatic | `review-case-v1` | forbidden / single | 15 / 1 |
| `research.audit.campaign` | audit | workflow / explicit | `review-campaign-v1` | forbidden / multiple | 60 / 4 |
| `research.writing.case` | writing | bounded / automatic | `writing-case-v1` | forbidden / single | 15 / 1 |

Every entry has `workerAuthority: "proposal-only"`. Bounded approval order: network, external-cost, multiple-repositories, canonical-mutation, capability-chaining. Workflow order prepends workflow. See frozen contract lines 216-257 and current test lines 29-224.

### Procedure Contract

- Layout: `<root>/<id>/<version>/{procedure.json,PROCEDURE.md}`; project root `.trellis/research/procedures` (`procedure-capability-policy-contract.md:41-75`).
- Project directory absence permits bundled fallback. Presence in any form is authoritative. Partial, malformed, unreadable, non-regular, symlinked, escaping, mismatched, or changed content fails closed; no fallback (`:276-287`).
- `procedure.json`: strict plain JSON object, no duplicate/unknown keys/comments/BOM, valid UTF-8, exactly one final LF, exact canonical bytes, exact key order (`:259-270`).
- IDs: `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`. Versions: exact SemVer, no `v`, build metadata, aliases, or whitespace (`:270`).
- `PROCEDURE.md`: non-empty regular file, valid UTF-8, no BOM/NUL. Exact bytes remain authoritative; no newline normalization (`:272`).
- Bundled manifest omits `replaces`. Project override requires exact bundled `{id,version}` in `replaces` (`:274`).
- Procedure may only tighten registry authority: declared-only -> forbidden, multiple -> single, lower positive limits. Omitted limits inherit registry ceilings (`:274`).

Procedure digest input:

```text
UTF8("trellis-research-procedure-digest-v1\0")
|| exact canonical procedure.json bytes excluding final LF
|| 0x0A
|| exact PROCEDURE.md bytes
```

External form: `sha256:` plus 64 lowercase hex chars. No normalization or re-encoding (`:289-300`).

### Policy Contract

Canonical path: `.trellis/research/policy.json`. Conservative initial bytes encode schema v1, `automaticEnabled:false`, 15-minute/one-Dispatch defaults, all allow flags false, empty capabilities (`:76-132`).

Strict parsing rejects missing policy, duplicate/unknown keys, BOM, malformed JSON, symlink/non-regular/escape, unknown capability IDs, invalid limits, or literal `true` in any `allow*` field (`:302-306`). Resolution never substitutes an in-memory default.

Merge order:

1. immutable registry;
2. validated Procedure;
3. policy defaults;
4. selected capability override.

Each layer only tightens. Effective limits use minimum. `allowNetwork:false` and `allowMultipleRepositories:false` tighten to forbidden/single; literal `true` is a recognized widening attempt, not approval authority. Policy cannot add capabilities, replace Procedure binding, change stage/kind/worker authority, widen network/repository scope, grant cost/mutation/chaining, or make explicit workflow automatic (`:308-317`). C04 stops at the tightened result and does not define C05 explicit-approval behavior.

Policy digest input:

```text
UTF8("trellis-research-policy-digest-v1\0")
|| UTF8(stableResearchJson(strictParsedCompletePolicy))
```

Source key order/indentation does not affect digest. Existing valid policy source bytes still survive normal update unchanged (`:319-326`).

### Automatic Ceiling and Explicit Gates

Automatic authorization requires all:

```text
kind = bounded
activation = automatic
network = forbidden
external cost = false
repository scope = single
canonical mutation = false
capability chaining = false
maxDispatches <= 1
maxDurationMinutes <= 15
```

Workflow, network, external cost, multiple repositories, canonical mutation, capability chaining, higher duration, or higher Dispatch count requires explicit root-side handling. Approval never widens worker authority beyond proposal-only. C04 should compute effective authority and automatic eligibility only. C05 owns authorization/approval errors and events; C06 owns Context enforcement and approval consumption.

### External References

None. User prohibited web/network research.

### Related Specs

- `.trellis/spec/core/backend/research-state.md` — Research subpath and immutable registry.
- `.trellis/spec/cli/backend/filesystem-safety.md` — strict Procedure/policy containment and preservation.
- `.trellis/spec/cli/backend/commands-research.md` — C05/C06 command boundary.
- `.trellis/spec/cli/unit-test/conventions.md` — exact digest-vector requirements.

## Resolved C04 clarifications

- `procedure-content-matrix.md` freezes the common input/output arrays and approved seven-section content plans for all 14 assets using only Trellis-owned fallback sources. Final authored English bytes and digest vectors are implementation outputs, not missing product decisions.
- “Exactly two files” means exactly two required authoritative named files. Resolution opens only `procedure.json` and `PROCEDURE.md`; unnamed siblings are ignored and never enumerated, hashed, owned, or cleaned.
- “Bounded Procedure” is a safety adjective. Workflow manifests remain `kind:"workflow"` and describe root-side planning/synthesis without worker launch, network, repository traversal, or canonical mutation authority.
- `policy.defaults.automaticEnabled === true` is the sole automatic opt-in. `capabilities[id].enabled:true` is a no-op; `false` disables. The conservative policy therefore intentionally permits no automatic authorization until the global default is explicitly changed to true.
