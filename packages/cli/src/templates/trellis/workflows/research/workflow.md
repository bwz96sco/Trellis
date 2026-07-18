# Managed Research Workflow

A root-controlled Trellis workflow for evidence-producing research. The root session owns authority; workers return bounded findings and proposals but never mutate authoritative research state on their own.

---

## Core Principles

1. **Root authority** — the root session creates and changes Quest, Campaign, Run, Evidence, and Claim records.
2. **Bounded dispatch** — every worker receives a narrow question, explicit inputs, limits, and a required output shape.
3. **Evidence before claims** — a Claim cites Evidence; unsupported conclusions stay hypotheses.
4. **Result plus Proposal** — workers report what they observed and separately propose what the root should change.
5. **Explicit review** — the root must apply or reject every Proposal; worker output is never authoritative by arrival alone.
6. **Optional engineering Tasks** — create a Trellis Task only for bounded implementation work discovered during research. Task state does not replace the research lifecycle.

---

## Phase Index

```
Phase 1: Plan    → inspect the control plane, frame the Quest, and define bounded work
Phase 2: Execute → run research, collect Result + Proposal, and review at the root
Phase 3: Finish  → validate evidence and claims, update artifacts, and close or continue
```

### Research Authority

- **Quest** — the root research objective and success criteria.
- **Campaign** — a coherent stage of work within a Quest.
- **Run** — one bounded execution attempt with declared inputs and limits.
- **Evidence** — a source-backed observation produced or accepted by the root.
- **Claim** — a conclusion whose support and confidence are explicit.
- **Result** — a worker's report of what happened.
- **Proposal** — a worker's suggested authoritative change, pending root review.

[workflow-state:no_task]
No active engineering Task. Continue the managed research lifecycle at the root: inspect current Quest/Campaign/Run state, or frame a new Quest before dispatching work.
Create a Trellis Task only when the research reveals bounded engineering work that needs the normal implementation workflow.
[/workflow-state:no_task]

### Phase 1: Plan
- 1.0 Inspect or initialize research state `[required · once]`
- 1.1 Frame the Quest and acceptance criteria `[required · repeatable]`
- 1.2 Register repositories and evidence sources `[required · repeatable]`
- 1.3 Design bounded dispatches `[required · repeatable]`
- 1.4 Approve the next Campaign / Run `[required · once]`
- 1.5 Completion criteria

[workflow-state:planning]
Stay in root planning authority. Inspect the current Quest, Campaigns, Runs, Evidence, and Claims before changing scope.
Define the next bounded Run with question, inputs, limits, and required Result + Proposal output. Do not treat worker output as authoritative until the root reviews it.
If bounded engineering work is required, create and review an optional Trellis Task separately; do not use Task status as research state.
[/workflow-state:planning]

[workflow-state:planning-inline]
Stay in root planning authority. Inspect the current Quest, Campaigns, Runs, Evidence, and Claims before changing scope.
Define the next bounded Run with question, inputs, limits, and required Result + Proposal output. Inline execution still requires explicit root review before authoritative changes.
If bounded engineering work is required, create and review an optional Trellis Task separately; do not use Task status as research state.
[/workflow-state:planning-inline]

### Phase 2: Execute
- 2.1 Dispatch or perform a bounded Run `[required · repeatable]`
- 2.2 Review Result + Proposal at the root `[required · repeatable]`
- 2.3 Rollback or redirect `[on demand]`

[workflow-state:in_progress]
Research flow: select Campaign owner -> prepare bounded Run -> dispatch or execute -> receive Result + Proposal -> root validates Evidence -> root must apply or reject the Proposal -> update Claims.
Workers may inspect sources and return artifacts, but they do not create authoritative Quest/Campaign/Run/Evidence/Claim state. Keep every dispatch bounded and source-aware.
An engineering Task is optional and separate; finish or pause it without silently changing research conclusions.
[/workflow-state:in_progress]

[workflow-state:in_progress-inline]
Research flow: select Campaign owner -> perform bounded Run inline -> record Result + Proposal -> root validates Evidence -> root must apply or reject the Proposal -> update Claims.
Inline execution does not bypass evidence review. Keep observations, interpretations, and proposed changes distinct.
An engineering Task is optional and separate; finish or pause it without silently changing research conclusions.
[/workflow-state:in_progress-inline]

### Phase 3: Finish
- 3.2 Resolve contradictions and weak evidence `[on demand]`
- 3.3 Update research artifacts and specifications `[required · once]`
- 3.4 Record the root decision `[required · once]`
- 3.5 Wrap-up reminder

[workflow-state:completed]
The current research stage is reviewed. Confirm every Proposal was explicitly applied or rejected, Claims cite accepted Evidence, and the next Campaign or closure decision is recorded.
[/workflow-state:completed]

### Rules

1. The root session is the sole authority for research lifecycle changes.
2. Run steps in order; repeat a Run when evidence is insufficient or contradictory.
3. A worker Result reports observations; a Proposal requests a change. Never collapse the two.
4. Evidence must retain source identity and enough context for root verification.
5. Claims state confidence and cite accepted Evidence.
6. Optional Tasks handle bounded engineering work only; they do not own Quest or Campaign status.

### Loading Step Detail

```bash
{{PYTHON_CMD}} ./.trellis/scripts/get_context.py --mode phase --step <step>
```

---

## Phase 1: Plan

Goal: establish the root research frame and prepare bounded work without delegating authority.

#### 1.0 Inspect or initialize research state `[required · once]`

Inspect existing Quest, Campaign, Run, Evidence, and Claim records before creating anything new. Determine whether the request continues an existing Quest or requires a new root objective.

Record the current authoritative state, unresolved questions, and any active Runs. If state is incomplete, preserve uncertainty rather than inventing missing facts.

#### 1.1 Frame the Quest and acceptance criteria `[required · repeatable]`

Define:

- the question the Quest must answer;
- what decision the research should enable;
- in-scope and out-of-scope areas;
- evidence quality requirements;
- stopping conditions and confidence targets.

Split a broad Quest into Campaigns when stages have independently reviewable outcomes. Campaign boundaries organize research; they do not delegate root authority.

#### 1.2 Register repositories and evidence sources `[required · repeatable]`

Identify the repositories, local artifacts, primary sources, datasets, and prior research relevant to the Quest. For each source, record why it is relevant and any access, freshness, or reliability limitation.

Prefer primary evidence. Keep source identity attached to observations so accepted Evidence remains auditable.

#### 1.3 Design bounded dispatches `[required · repeatable]`

Every Run or worker dispatch must specify:

- one focused research question;
- permitted repositories, sources, and files;
- explicit time, breadth, or depth limits;
- required evidence citations;
- required output sections: **Result** and **Proposal**;
- conditions that require returning early instead of guessing.

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi, Oh My Pi]

Use an available research worker or sub-agent only for the bounded Run. The dispatch prompt must state that the worker has no authority to mutate root Quest, Campaign, Run, Evidence, or Claim records.

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi, Oh My Pi]

[codex-inline, Kilo, Antigravity, Devin]

Perform the bounded Run in the main session. Preserve the same Result + Proposal separation and limits used for worker dispatches.

[/codex-inline, Kilo, Antigravity, Devin]

#### 1.4 Approve the next Campaign / Run `[required · once]`

Before execution, the root confirms that the Run is bounded, sources are available, expected evidence is clear, and the result can be reviewed independently.

If the Run includes implementation, create an optional Trellis Task with its own reviewed requirements. Do not start engineering work merely because the research Run is approved.

#### 1.5 Completion criteria

| Condition | Required |
|---|:---:|
| Quest question and decision target are explicit | yes |
| Campaign / Run scope is bounded | yes |
| Sources and limitations are recorded | yes |
| Result + Proposal output contract is stated | yes |
| Root review criteria are explicit | yes |

---

## Phase 2: Execute

Goal: produce verifiable evidence through bounded Runs, then make authoritative decisions at the root.

#### 2.1 Dispatch or perform a bounded Run `[required · repeatable]`

Start only the approved Run. Provide the worker or inline executor with the bounded question, allowed inputs, limits, and output contract.

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi, Oh My Pi]

Dispatch the smallest useful unit of work. Require the worker to return:

1. **Result** — methods, sources consulted, observations, Evidence candidates, uncertainty, and blockers.
2. **Proposal** — suggested root changes to Campaign, Run, Evidence, or Claim records, with rationale.

The worker must not apply its own Proposal.

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi, Oh My Pi]

[codex-inline, Kilo, Antigravity, Devin]

Execute the Run inline and write the same two sections. Treat your own Proposal as pending until the explicit root review in step 2.2.

[/codex-inline, Kilo, Antigravity, Devin]

#### 2.2 Review Result + Proposal at the root `[required · repeatable]`

The root reviews each submission in this order:

1. Verify that the Run stayed within bounds.
2. Check cited sources and distinguish observation from interpretation.
3. Accept, revise, or reject Evidence candidates.
4. Evaluate each Proposal against the Quest and Campaign criteria.
5. Explicitly apply or reject the Proposal.
6. Create or revise Claims only from accepted Evidence, recording confidence and contradictions.
7. Decide whether to close the Run, repeat it, or launch a narrower follow-up Run.

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi, Oh My Pi]

Wait for all bounded workers used by this Run before making a combined root decision. Do not let arrival order determine authority.

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi, Oh My Pi]

[codex-inline, Kilo, Antigravity, Devin]

Review the inline Result exactly as if it came from a worker. Root authority is a decision boundary, not a process boundary.

[/codex-inline, Kilo, Antigravity, Devin]

#### 2.3 Rollback or redirect `[on demand]`

- Scope was too broad -> reject the Proposal and create a narrower Run.
- Sources were weak or stale -> mark Evidence candidates rejected or provisional and gather stronger sources.
- Claims conflict -> preserve both Evidence trails, lower confidence, and design a contradiction-resolving Run.
- Engineering Task changed assumptions -> return to Phase 1 and revise the research frame before continuing.

---

## Phase 3: Finish

Goal: leave the research control plane auditable and make the next decision explicit.

#### 3.2 Resolve contradictions and weak evidence `[on demand]`

Review unresolved contradictions, low-confidence Claims, rejected Evidence candidates, and Runs that exceeded their bounds. Either schedule a bounded follow-up or record why the uncertainty is acceptable.

#### 3.3 Update research artifacts and specifications `[required · once]`

Persist accepted Evidence, Claims, root decisions, and source references in the authoritative research artifacts. Update project specifications only when research established durable project knowledge.

Do not add hooks, skills, Task/session links, worker automation, or external memory integration as a side effect of this workflow step.

#### 3.4 Record the root decision `[required · once]`

For every Proposal, record **applied**, **rejected**, or **deferred**, with rationale. Then record one of:

- Quest closed with supported Claims;
- Campaign completed and next Campaign selected;
- follow-up Run required;
- research paused because evidence or access is insufficient.

Git commits are not automatic. If files changed, follow the project's normal review and commit policy.

#### 3.5 Wrap-up reminder

Summarize the authoritative state, remaining uncertainty, and the next root action. If an optional engineering Task was used, report its status separately from the Quest and Campaign status.
