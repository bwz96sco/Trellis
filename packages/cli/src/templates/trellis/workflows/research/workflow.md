# Managed Research Workflow

Trellis provides a deterministic control plane for evidence-producing research. The root session owns authoritative state. Workers execute bounded Dispatches and return observations plus pending changes for root review.

## Authority model

- **Quest** defines the research objective, decision target, scope, and stopping conditions.
- **Campaign** groups a protocol-controlled stage of work within a Quest.
- **Run** records one bounded execution attempt and its status.
- **Evidence** records source-backed observations accepted by the root.
- **Claim** records a conclusion, confidence, and supporting Evidence.
- **Dispatch** gives one worker a narrow objective, declared context, limits, and expected output.
- **Result** reports what the worker observed and produced.
- **Proposal** requests authoritative changes and remains pending until the root applies or rejects it.

Only the root session may create or change Quest, Campaign, Run, Evidence, Claim, Result, or Proposal records. A worker never applies its own Proposal.

## Stage capabilities

Each active Quest has one stage and one bundled fallback skill:

| Stage | Fallback skill | Capability |
|---|---|---|
| `setup` | `trellis-research-setup` | establish repositories, sources, access, and constraints |
| `framing` | `trellis-research-quest` | define the question, decision target, scope, and stopping rules |
| `literature` | `trellis-research-literature` | gather and compare source-backed prior work |
| `ideation` | `trellis-research-ideation` | generate bounded hypotheses and candidate approaches |
| `experiment` | `trellis-research-experiment` | design and execute empirical tests |
| `computation` | `trellis-research-computation` | perform reproducible calculations and analyses |
| `theory` | `trellis-research-theory` | derive and examine conceptual or formal explanations |
| `audit` | `trellis-research-audit` | challenge evidence, assumptions, contradictions, and confidence |
| `writing` | `trellis-research-writing` | synthesize accepted Evidence and Claims for the decision target |

Load the current stage owner before planning or reviewing stage-specific work. Optional discovered skills may refine execution, but they do not widen authority.

## Root loop

### 1. Inspect

Run:

```bash
trellis research status --json
trellis research validate --json
```

Read the current ledger head, active Quest, Campaigns, Runs, Evidence, Claims, and pending Proposals. If canonical state does not exist yet, initialize it explicitly:

```bash
trellis research init --name "<workspace>" --description "<purpose>" --json
```

Never infer missing authoritative state from worker prose.

### 2. Frame

Create or update the Quest at the root. Record the question, decision target, scope, source quality requirements, uncertainty handling, stopping conditions, and confidence targets.

Use direct lifecycle commands such as:

```bash
trellis research quest create --title "<title>" --description "<scope>" --json
trellis research quest stage <qst-id> <stage> --json
trellis research campaign create --quest <qst-id> --title "<title>" --protocol-digest "<digest>" --json
trellis research campaign freeze <cmp-id> --json
trellis research run create --campaign <cmp-id> --title "<title>" --json
```

Register and bind repositories with `trellis research repo add`, `repo bind`, `repo list`, and `repo resolve`.

### 3. Prepare a bounded Dispatch

A Dispatch declares one focused objective, one target repository, explicit context, allowed write paths, expected outputs, checks, acceptance criteria, and conditions that require returning early rather than guessing.

Prepare it with `trellis research dispatch prepare`. The root sends the worker exactly this one-line envelope:

```text
Research dispatch: .trellis/research/dispatches/<dsp-id>/request.json
```

Claude validates that envelope through the generated preflight hook. Codex validates it through the bounded worker card. Both use:

```bash
trellis research dispatch context .trellis/research/dispatches/<dsp-id>/request.json --host <claude|codex> --json
```

A failed preflight is a no-write return to the root. Do not bypass it by copying canonical files into the prompt.

### 4. Execute and receive

The worker stays within declared context and write paths, then returns raw JSON with two distinct sections:

1. **Result** — methods, sources, observations, Evidence candidates, uncertainty, outputs, and blockers.
2. **Proposal** — typed requested changes with status `pending`.

The worker does not mutate canonical research state, record its Result, review its Proposal, or change git history.

### 5. Record and review

The root records the submission:

```bash
trellis research dispatch record-result <dsp-id> --file <result-and-proposal.json> --json
```

Review in this order:

1. Confirm the Dispatch stayed within bounds.
2. Verify source identity and distinguish observation from interpretation.
3. Accept, revise, or reject Evidence candidates.
4. Check contradictions and confidence.
5. Apply selected Proposal operations or reject the Proposal explicitly.
6. Update Claims only from accepted Evidence.
7. Close, repeat, or narrow the Run.

Use `trellis research dispatch apply <prp-id> --json` or `trellis research dispatch reject <prp-id> --json`. No Proposal may remain implicitly accepted.

### 6. Finish or continue

Before closing a stage or Quest:

- every Proposal is applied, rejected, or deliberately deferred;
- Claims cite accepted Evidence;
- contradictory Evidence remains visible;
- confidence and unresolved uncertainty are explicit;
- the next stage, follow-up Run, pause, or closure decision is recorded.

Use `trellis research evidence create`, `evidence status`, `claim create`, `claim status`, and lifecycle status commands to persist the root decision. Run `trellis research validate --json` after authoritative changes. Use `trellis research rebuild --json` only to rebuild deterministic projections from a valid ledger.

## Invariants

1. Evidence precedes Claims.
2. Result and Proposal remain separate.
3. Worker arrival never grants authority.
4. Dispatch scope never expands during execution.
5. Canonical state lives under `.trellis/research/**` and is changed only by direct Research commands.
6. Generated hooks may write only session watermarks under `.trellis/.runtime/**`.
7. Git commits are never automatic.
