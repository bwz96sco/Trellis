# Managed Research Workflow

Trellis provides a deterministic control plane for evidence-producing research. The root session owns canonical state, activation, approval, supplied output identities, recording, and Proposal decisions. Generic workers execute one embedded Procedure under a false authority ceiling and return untrusted output for root review.

## Authority model

- **Quest** defines the research objective, decision target, scope, and stopping conditions.
- **Campaign** groups a protocol-controlled stage of work within a Quest.
- **Run** records one bounded execution attempt and its status.
- **Evidence** records source-backed observations accepted by the root.
- **Claim** records a conclusion, confidence, and supporting Evidence.
- **Dispatch** declares one bounded objective, Repository, context, write scope, outputs, and checks.
- **Capability** is an immutable stage-specific authority definition.
- **Procedure** is the versioned executable instruction body bound to a Capability.
- **Activation** binds one Dispatch to a Capability, Procedure digest, policy digest, request digest, and scope hash.
- **Approval** authorizes one exact Activation for a bounded mode and expiry.
- **Result** reports what the worker observed and produced.
- **Proposal** requests canonical changes and remains pending until separate root review.

Only the root session may create or mutate canonical Research records. A worker never records its own Result, consumes approval, decides a Proposal, or changes Git history.

## Root loop

### 1. Inspect

Run:

```bash
trellis research status --json
trellis research validate --json
```

Read the ledger head, active Quest, Campaigns, Runs, Evidence, Claims, activation/approval state, and pending Proposals. If canonical state does not exist, initialize it explicitly:

```bash
trellis research init --name "<workspace>" --description "<purpose>" --json
```

Never infer missing canonical state from worker prose.

### 2. Frame

Create or update the Quest at the root. Record the question, decision target, scope, source quality requirements, uncertainty handling, stopping conditions, and confidence targets.

Use lifecycle commands such as:

```bash
trellis research quest create --title "<title>" --description "<scope>" --json
trellis research quest stage <qst-id> <stage> --json
trellis research campaign create --quest <qst-id> --title "<title>" --protocol-digest "<digest>" --json
trellis research campaign freeze <cmp-id> --json
trellis research run create --campaign <cmp-id> --title "<title>" --json
```

Register and bind repositories with `trellis research repo add`, `repo bind`, `repo list`, and `repo resolve`.

### 3. Prepare and authorize a bounded Dispatch

Create one focused Dispatch with `trellis research dispatch prepare`, or create the immutable Activation separately with `trellis research dispatch plan-activation` when the workflow needs an explicit planning boundary.

The root then authorizes the exact Activation:

- **Automatic authorization** is allowed only when immutable capability and project policy permit every requested authority dimension.
- **Interactive approval** requires an explicit root/operator decision and rationale.

Do not launch a worker until an approval is granted. Retain all returned launch data in the root session:

- Dispatch ID;
- approval ID;
- approval mode and expiry;
- resolved Repository;
- declared checks;
- supplied Result ID;
- supplied Proposal ID.

### 4. Resolve approved Context before launch

Call the public zero-write Context command from the Trellis Research control root:

```bash
trellis research dispatch context <dsp-id> --host <claude|codex> --root . --json
```

Validate that Context contains the expected Dispatch, Activation, approval, immutable Capability, embedded Procedure manifest/digest/instructions, resolved single Repository, declared scope, complete false authority ceiling, and approval-derived Result and Proposal IDs.

A failed Context is a no-write return. Do not bypass it by reading canonical files, a tracked request, a Procedure file, or a Skill.

For Codex, launch the worker from this same Research control root so its first process can be exactly:

```bash
trellis research dispatch context <dsp-id> --host codex --root . --json
```

### 5. Launch the generic worker

Launch the generated `trellis-research-worker` with isolated history and exactly this one-line message:

```text
Research dispatch: <dsp-id>
```

Do not include a request path, Procedure name, Skill name, approval ID, output override, extra text, whitespace, or multiline content.

The worker executes only the embedded `procedure.instructions` under the normalized Context. It must not discover or invoke Skills, access undeclared scope, use network or external cost, traverse multiple repositories, expand its sandbox, launch capabilities/Procedures/Dispatches, spawn nested agents, mutate canonical Research, mutate Git history, record output, consume approval, or decide a Proposal.

### 6. Validate and record worker output

The worker response must be one raw JSON object with exactly two top-level keys in order:

```json
{
  "result": {},
  "proposal": {}
}
```

Before recording, the root strictly validates:

- both objects satisfy the current schema-v1 contracts;
- Result and Proposal reference the retained Dispatch, Run, and Quest;
- Result ID exactly equals the retained supplied Result ID;
- Proposal ID exactly equals the retained supplied Proposal ID;
- Proposal status is `pending`;
- blocked work has a blocked Result and empty Proposal operations;
- the worker stayed within Repository, context, artifact, write-path, check, process, network, sandbox, and delegation limits.

Record from the root using the retained approval ID and either a contained path:

```bash
trellis research dispatch record-result <dsp-id> --approval <apr-id> --input <result-and-proposal.json> --json
```

or lazy stdin:

```bash
trellis research dispatch record-result <dsp-id> --approval <apr-id> --input - --json
```

Successful recording atomically appends `result.recorded`, `proposal.recorded`, and `approval.consumed`, then publishes Result, Proposal, and consumed-approval materializations. Never instruct the worker to run this command.

### 7. Review the pending Proposal separately

Review in this order:

1. Confirm the Dispatch stayed within bounds.
2. Verify source identity and distinguish observation from interpretation.
3. Accept, revise, or reject Evidence candidates.
4. Check contradictions and confidence.
5. Apply selected Proposal operations or reject the Proposal explicitly.
6. Update Claims only from accepted Evidence.
7. Close, repeat, or narrow the Run.

Use `trellis research dispatch apply <prp-id> --json` or `trellis research dispatch reject <prp-id> --json`. Recording worker output is not a Proposal decision, and no Proposal may be implicitly accepted.

## Finish or continue

Before closing a stage or Quest:

- every Proposal is applied, rejected, or deliberately deferred;
- Claims cite accepted Evidence;
- contradictory Evidence remains visible;
- confidence and unresolved uncertainty are explicit;
- the next stage, follow-up Run, pause, or closure decision is recorded.

Use `trellis research evidence create`, `evidence status`, `claim create`, `claim status`, and lifecycle status commands to persist root decisions. Run `trellis research validate --json` after canonical changes. Use `trellis research rebuild --json` only to rebuild deterministic projections from a valid ledger.

## Invariants

1. Evidence precedes Claims.
2. Result and Proposal remain separate.
3. Worker arrival never grants authority.
4. Dispatch scope never expands during execution.
5. Context is zero-write; recording is approval-bound and root-only.
6. Canonical state lives under `.trellis/research/**` and changes only through direct Research commands.
7. Generated hooks may write only session watermarks under `.trellis/.runtime/**`; the Dispatch preflight itself writes nothing.
8. Git commits are never automatic.
