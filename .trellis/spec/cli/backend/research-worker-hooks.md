# Research Worker Skills and Host Adapter Contract

This specification defines the current generated Research workers, stage skills, hook matrix, session orientation, sequence watermark, and C07/C09 preflight boundary for Claude Code and Codex.

## 1. Scope / Trigger

Current generation installs only the Research control plane. Generic Task agents, generic workflow skills, and generated `.trellis/scripts/**` are physically absent from active CLI source, clean `dist`, and the packed npm tarball. Historical cleanup evidence may recognize their released paths but cannot generate them.

### Exact stage skills

Both hosts receive exactly these nine stage skills:

| Quest capability | Skill |
|---|---|
| setup | `trellis-research-setup` |
| framing | `trellis-research-quest` |
| literature | `trellis-research-literature` |
| ideation | `trellis-research-ideation` |
| experiment | `trellis-research-experiment` |
| computation | `trellis-research-computation` |
| theory | `trellis-research-theory` |
| audit | `trellis-research-audit` |
| writing | `trellis-research-writing` |

`complete` has no active stage skill. Skills remain dormant without explicit Research intent or a validated Dispatch.

### Exact workers

```text
.claude/agents/trellis-research-worker.md
.codex/agents/trellis-research-worker.toml
```

Current generation does not install generic `trellis-implement`, `trellis-check`, or old `trellis-research` agents. Those generic agent templates are deleted; compatibility tests use immutable inventory/hash evidence rather than active source copies.

### Frozen hook matrix

| Host | Generated file | Purpose |
|---|---|---|
| Claude | `.claude/hooks/session-start.py` | compact Research orientation |
| Claude | `.claude/hooks/inject-workflow-state.py` | strict Research ledger-head watermark |
| Claude | `.claude/hooks/inject-subagent-context.py` | C09 explicit worker/C07 preflight only |
| Claude | `.claude/hooks/statusline.py` | optional bounded Research status |
| Codex | `.codex/hooks/inject-workflow-state.py` | strict Research ledger-head watermark |

Codex does not generate `.codex/hooks/session-start.py` or a Claude prompt-mutation adapter. Its worker performs the C07 pull preflight itself.

### Frozen successor scope (not implemented in C01)

C06-C09 additionally trigger this spec when approval-gated Context replaces Skill routing and both host workers consume one normalized embedded-Procedure input without Skill discovery or invocation.

## 2. Signatures

Provider-neutral preflight:

```text
trellis research dispatch context <request-file> \
  --host claude|codex \
  --root <root> \
  [--skill-name <canonical-name> ...] \
  --json
```

Exact worker envelope:

```text
Research dispatch: .trellis/research/dispatches/<dsp-id>/request.json
```

The complete message is exactly one line. The Dispatch ID is a lowercase prefixed UUID. Leading/trailing blank lines, extra lines, tails, aliases, traversal, backslashes, absolute paths, and case changes are invalid.

Reserved runtime field:

```json
{"research_last_seen_seq": 42}
```

Runtime location:

```text
.trellis/.runtime/sessions/<context-key>.json
```

### Frozen successor signatures (not implemented in C01)

Both host adapters consume `NormalizedResearchWorkerInputV1`: Dispatch, activation, approval, immutable capability, embedded Procedure, resolved declared scope, immutable authority flags, and Result-plus-pending-Proposal output IDs. The only host-varying field is `host`.

## 3. Contracts

### 3.1 Canonical authority

- `.trellis/research/events.jsonl` is canonical.
- Hooks strict-read Research state; they never append events or repair projections.
- Workers never record Results, apply/reject Proposals, promote Claims, advance lifecycle state, or mutate Git history.
- Worker output is untrusted until the root session reviews it.
- Generated hooks may write only bounded session watermark state under `.trellis/.runtime/**`.
- Child repositories require no Trellis installation.

### 3.2 No generic runtime dependency

Generated hooks and statusline must not depend on or mention active use of:

```text
.trellis/scripts
.trellis/tasks
.trellis/spec
.trellis/workspace
.trellis/.developer
Channel
generic Trellis agents
```

They use local standalone parsing and atomic-write helpers. Canonical `.trellis/research/**` is always read-only to generated hooks.

### 3.3 Strict ledger head

For selected Research state:

- missing or empty ledger means head `0`;
- each non-empty line is a JSON object;
- `seq` is an integer, not a boolean;
- sequences are contiguous from `1`;
- malformed JSON, a non-object line, or a gap invalidates the read;
- no malformed line is skipped.

Hooks read only the head. They do not reduce the ledger.

### 3.4 SessionStart

Claude SessionStart strict-reads:

- exact bundled Research workflow selection;
- strict ledger head;
- compact active Quest projections;
- compact pending Proposal records.

It emits:

- `<session-context>` Research orientation;
- one-shot `<first-reply-notice>`;
- compact `<research-state>` pointers/counts;
- `<ready>` guidance.

It does not emit generic Task phases, developer/workspace/spec context, generic sub-agent notices, or a `TRELLIS_CONTEXT_ID` shell export.

When identity and ledger state are valid, SessionStart may atomically set only `research_last_seen_seq` in the session runtime object. Unknown fields and false/zero/empty values survive. Malformed/non-object session JSON remains byte-identical.

### 3.5 Sequence watermark

The same Research sequence hook is generated for Claude and Codex.

| Condition | Output | Runtime write |
|---|---|---|
| Stored integer equals head | empty stdout | none |
| Valid changed/missing head | one `<research-state-changed>` block | atomic watermark update |
| Missing identity | empty stdout | none |
| Malformed/non-object session JSON | empty stdout | none |
| Malformed workflow selection or ledger | compact validation pointer when identity exists | none |

The hook discovers the Research control root from nested working directories. It does not parse `[workflow-state:*]` blocks, load active Tasks, or emit a Codex dispatch-mode banner.

Atomic writes use a unique same-directory temporary file, flush it, then call `os.replace`. Temporary files are removed best-effort.

### 3.6 Claude C09 adapter

Preserve C09 byte-level behavior:

1. Require the exact one-line `trellis-research-worker` envelope.
2. Discover the root Research control plane, including invocation from a child repository.
3. Invoke C07 directly with argument elements for `trellis`, `research`, `dispatch`, `context`, request pointer, `--host claude`, absolute `--root`, and `--json`.
4. Require one successful JSON object, empty successful stderr, exact host/request identity, bounded authority, and `result-plus-pending-proposal` output identities.
5. Only after pass 1, probe metadata for the exact selected optional skill path; do not list skill roots or read skill bodies.
6. If exact optional metadata exists, run one final C07 pass with exactly one `--skill-name`; otherwise pass 1 is final.
7. Inject the exact final validated JSON between stable markers. Do not include the original parent prompt or reinterpret fields.
8. Deny Agent startup on typed C07 failure or any local process/JSON/contract failure.

There is no generic Task fallback and no duplicate Python validation. All ordinary non-worker Claude subagent calls are silent no-ops. A prompt already marked `<!-- trellis-hook-injected -->` starts no preflight process.

### 3.7 Claude worker

After valid C09 injection, the Claude worker:

- invokes exactly `capability.selectedSkill`;
- reads only inline declared context and declared artifact pointers;
- writes only exact allowed resolved paths;
- treats declared checks as untrusted text under the same authority;
- returns raw Result plus pending Proposal JSON.

If the selected skill cannot be invoked after valid C07 response, the worker performs no target access and returns a blocked Result plus empty pending Proposal using only output-contract IDs.

### 3.8 Codex pull-based worker

The Codex worker validates the exact isolated envelope itself. Before C07 succeeds it must not:

- change directory;
- read or parse `request.json`;
- read the ledger or projections;
- inspect the target repository;
- read any skill body/frontmatter;
- run a check;
- write a file.

It may inspect Codex-provided skill inventory metadata only, intersect exact canonical optional names, sort matches, and pass each once as `--skill-name`.

Its first process is one direct-argument invocation of bare `trellis research dispatch context` with `--host codex --root . ... --json`. It uses no shell wrapper, pipe, redirect, `jq`, `npx`, package install, network fallback, mutation dry-run, or manual validation.

After successful response validation, it loads only the exact selected skill inventory entry, works from `repository.path`, reads only declared context/artifacts, writes only exact allowed paths, and returns one raw JSON object with top-level keys `result`, then `proposal`.

The `workspace-write` sandbox is only the outer boundary. The worker blocks rather than requesting sandbox expansion, `danger-full-access`, `--add-dir`, network/web/MCP access, undeclared reads/writes, nested agents, canonical Research mutation, or Git history mutation.

### 3.9 Worker output

Materializable result shape:

```json
{
  "result": {
    "id": "res_<uuid>",
    "dispatchId": "dsp_<uuid>",
    "runId": "run_<uuid>",
    "status": "completed|partial|blocked|failed",
    "summary": "...",
    "commands": [],
    "checks": [],
    "artifactRefs": [],
    "blockers": [],
    "createdAt": "RFC3339"
  },
  "proposal": {
    "id": "prp_<uuid>",
    "dispatchId": "dsp_<uuid>",
    "questId": "qst_<uuid>",
    "title": "...",
    "operations": [],
    "status": "pending",
    "createdAt": "RFC3339",
    "updatedAt": "RFC3339"
  }
}
```

Empty Proposal operations are valid. IDs are copied from the C07 output contract where required.

### Frozen successor contracts (not implemented in C01)

- Context, not a host adapter, validates canonical activation/approval and embeds exact Procedure instructions.
- Workers never discover/load Skills or Procedure files, read policy/ledger/sidecars as fallback, grant/consume approval, launch Procedures/Dispatches/capabilities, use nested agents, or widen sandbox/network authority.
- Immutable worker authority remains declared-context reads, allowed-write-path writes, proposal-only output, and no canonical Research/Git mutation.
- Root-side result recording consumes approval atomically; workers return only strict Result plus pending Proposal.

## 4. Validation & Error Matrix

| Input/state | Required behavior |
|---|---|
| Missing/empty selected ledger | valid head `0` |
| Malformed ledger line or sequence gap | compact validation guidance; no watermark write |
| Valid head equals watermark | silent no-op |
| Valid head changes | emit once, atomically update, next prompt silent |
| Missing identity | no output and no runtime file |
| Malformed session JSON | preserve bytes; no sequence output/write |
| Invalid Claude worker envelope | deny before process or target/skill access |
| Ordinary Claude subagent call | silent no-op |
| Claude typed C07 failure | deny with bounded code/message |
| Claude missing/incompatible process, malformed/multiple JSON, successful stderr, or authority mismatch | local `PREFLIGHT_EXECUTION_FAILED`; deny |
| Exact optional Claude skill metadata after pass 1 | one final C07 pass with exactly one skill name |
| Invalid Codex envelope | local `PREFLIGHT_EXECUTION_FAILED`; no process/target/skill/write |
| Codex typed C07 failure | return failure JSON unchanged |
| Codex process/JSON/authority anomaly | local bounded failure; no manual fallback |
| Selected skill missing after valid C07 | blocked Result plus empty pending Proposal |
| Undeclared input, network, unsafe check, sandbox expansion, or undeclared write | skip/block and report partial/blocked output |

Claude denial shape:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Research Dispatch preflight failed [CODE]: bounded message"
  }
}
```

Codex local preflight failure shape:

```json
{
  "schemaVersion": 1,
  "command": "codex research worker preflight",
  "valid": false,
  "error": {
    "code": "PREFLIGHT_EXECUTION_FAILED",
    "message": "bounded reason"
  },
  "safeAction": "report-to-root-no-write"
}
```

Neither failure fabricates Dispatch, Run, or Quest IDs.

Successor matrix additions: missing/expired/revoked/wrong-host/drifted approval denies before worker start; normalized-input mismatch denies; any Skill/Procedure discovery, nested delegation, sandbox expansion, approval mutation, or worker-side result recording is forbidden.

## 5. Good / Base / Bad Cases

### Good

- Claude SessionStart sees head `12`, one active Quest, and two pending Proposals; it emits compact pointers and stores only watermark `12`.
- The next prompt at head `12` is silent; a later head `13` emits once and stores `13`.
- A Task-free Claude worker receives one exact Dispatch pointer targeting a bound sibling repository; C09 injects exact C07 JSON and the worker performs bounded work.
- A Codex worker discovers one exact optional skill name, runs C07 first, loads only the selected skill, and returns raw Result plus pending Proposal JSON.

### Base

- Research is selected but uninitialized: head `0`, current Quest `none`, pending Proposal count `0`.
- No optional skill metadata exists: Claude uses pass 1 and Codex omits `--skill-name`.
- Ordinary Claude subagent calls emit nothing.

### Bad

- Skipping a malformed ledger line and reporting a later sequence.
- Replacing malformed session JSON with a fresh object.
- Reading Task/spec/workspace/developer state from generated hooks.
- Letting an invalid Dispatch fall through to generic Task context.
- Codex reading request/skill/target data before C07 or using `npx`/manual parsing fallback.
- Worker mutating canonical Research state, accepting its own Proposal, or committing.

### Frozen successor cases

- **Good**: each host validates one equivalent embedded-Procedure object, performs declared work, and returns strict Result plus pending Proposal.
- **Base**: blocked declared work returns bounded output without reading Skills or broadening authority.
- **Bad**: worker discovers a Skill/Procedure, grants/consumes approval, records output, delegates, or commits.

## 6. Tests Required

Focused coverage must prove:

- exact nine skill names under both host roots;
- exact Claude/Codex current path allowlists and configure/collect byte parity;
- every registered current hook is generated and every generated hook is registered;
- Codex session-start and all generic agent/skill output are absent;
- generated hooks contain no Task/spec/workspace/developer/script dependency;
- strict zero/changed/malformed ledger behavior for Claude and Codex;
- atomic watermark preservation and malformed runtime preservation;
- compact SessionStart orientation and optional Research-only statusline;
- exact C09 envelope, root discovery, direct C07 argv, bounded response validation, optional second pass, exact JSON injection, and deny-on-failure;
- ordinary Claude non-worker calls are no-ops;
- Codex first-process C07 pull preflight, typed failure pass-through, local failure, selected-skill ordering, bounded target authority, and raw Result/Proposal output;
- source/build parity for retained hooks, workers, and stage skills.

Primary tests:

- `test/configurators/platforms.test.ts`
- `test/templates/research-hooks.test.ts`
- `test/templates/shared-hooks.test.ts`
- `test/templates/hook-timeouts.test.ts`

Frozen successor tests additionally require shared normalized input fixtures for all capabilities and hosts, approval denial before worker start, no Skill/Procedure reads, exact immutable authority flags, blocked-output behavior, and proof that only root-side recording consumes approval.

## 7. Wrong vs Correct

### Dispatch routing

```text
Wrong: parse request.json in Python, read an active Task, or duplicate C07 validation.
Correct: find the root control plane, call C07 directly, validate its response contract, and inject/consume exact validated JSON.
```

### Runtime watermark

```text
Wrong: overwrite the session file with only research_last_seen_seq.
Correct: clone a valid object, replace one field, flush a same-directory temp file, then os.replace.
```

### Codex preflight

```text
Wrong: read request.json or SKILL.md, infer an owner, then run npx as a best-effort check.
Correct: discover names only, run bare C07 as the first process, validate it, then load exactly the selected skill.
```

### Scientific authority

```text
Wrong: worker records its Result, applies its Proposal, advances the Quest, or commits.
Correct: worker returns Result plus pending Proposal; the root reviews and mutates authoritative state explicitly.
```

### Frozen successor: embedded Procedure authority

```text
Wrong: worker reads a Skill/Procedure file, grants approval, or launches another capability.
Correct: Context supplies one approved embedded Procedure and immutable proposal-only authority.
```
