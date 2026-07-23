# Design: one Dispatch authority across Claude and Codex

## 1. Boundaries

### Core-owned authority

Unchanged C06/C07 owns:

- canonical pointer and request parsing;
- ledger reduction and request/state equality;
- Quest/Campaign/Run/Repository hierarchy;
- lifecycle dispatchability;
- stage capability and selected-skill resolution;
- compatibility warnings;
- Repository binding/locator/Git identity;
- artifact registration, revision, digest, and containment;
- allowed-write containment;
- bounded context, authority, and output contract.

### Claude adapter ownership

`inject-subagent-context.py` owns only:

- Claude platform and exact worker Agent trigger;
- complete one-line envelope grammar;
- root control-plane discovery;
- direct C07 process calls;
- exact direct optional-skill metadata probe after pass 1;
- C07 response shape validation;
- injected prompt construction;
- bounded hook denial.

### Worker ownership

Claude worker owns bounded execution after successful preflight:

- invoke selected skill;
- consume declared context;
- perform allowed writes/checks;
- return strict Result plus pending Proposal.

Root session remains sole Research mutation and Proposal review authority.

## 2. Claude hook flow

```text
PreToolUse Agent input
  -> platform == claude?
  -> subagent_type == trellis-research-worker?
  -> already injected? exit unchanged
  -> prompt starts with Research dispatch?
  -> exact complete one-line envelope
  -> find Research control root
  -> C07 pass 1: --host claude, no skill names
  -> validate successful/failure process contract
  -> optionalSkill from validated response
  -> stat exact project/personal SKILL.md paths only
  -> optional file present?
       no  -> pass 1 is final
       yes -> C07 pass 2 with one --skill-name; pass 2 is final
  -> validate final authority/output contract
  -> emit allow + updatedInput prompt containing exact final JSON
```

Any invalid envelope or failed process/contract emits `permissionDecision: "deny"`.

Other prompts exit without subprocess or output.

## 3. Signatures

Implementation may adjust names, but equivalent narrow signatures are required:

```py
def _parse_dispatch_envelope(prompt: str) -> str | None: ...

def _run_dispatch_context(
    control_root: Path,
    request_ref: str,
    skill_name: str | None = None,
) -> tuple[dict | None, dict | None]: ...

def _validate_dispatch_context_response(
    payload: dict,
    request_ref: str,
) -> dict: ...

def _direct_optional_skill_exists(
    control_root: Path,
    optional_skill: str,
) -> bool: ...

def _build_validated_dispatch_prompt(context: dict) -> str: ...

def _emit_denial(code: str, message: str) -> None: ...
```

No function accepts a parsed Dispatch request, projection, Task ref, expected-output path, or Python stage owner.

C07 argv:

```text
trellis research dispatch context <request-ref> --host claude --root <absolute-control-root> [--skill-name <optional-skill>] --json
```

Use direct argument list. No shell, `npx`, installer, pipe, redirect, `jq`, temp response file, or manual fallback.

## 4. Envelope contract

Complete prompt regex:

```text
^Research dispatch: (\.trellis/research/dispatches/dsp_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/request\.json)$
```

Use existing core canonical UUID rule if version bounds differ. Complete string match is mandatory.

Prompt not beginning with `Research dispatch:` is unrelated and ignored. Prompt beginning with that prefix but not exact is denied locally before process execution.

## 5. Process and JSON contract

### Success

Require:

- exit status zero;
- stdout contains exactly one JSON object plus optional surrounding whitespace;
- stderr empty;
- `valid is True`;
- `host == "claude"`;
- `requestRef == captured pointer`;
- capability has bounded canonical `optionalSkill`, `fallbackSkill`, `selectedSkill`, and source;
- authority exactly:
  - `readScope == "declared-context-only"`
  - `writeScope == "allowed-write-paths-only"`
  - four mutation/review flags false;
- output type exactly `result-plus-pending-proposal`;
- output Dispatch/Run/Quest IDs match validated context IDs.

Reject booleans represented as `0`, `1`, or strings. Reject extra JSON values and trailing data.

### Typed failure

On nonzero exit, accept only one bounded C07 failure object with:

- `valid == false`;
- bounded `error.code` and `error.message`;
- `safeAction == "report-to-root-no-write"`.

Use code/message for denial. Do not fabricate IDs.

### Local failure

Everything else maps to:

```json
{
  "code": "PREFLIGHT_EXECUTION_FAILED",
  "message": "bounded non-sensitive reason"
}
```

Do not include stdout/stderr dumps, absolute target path, env, or request content.

## 6. Optional-skill metadata probe

Pass 1 validates Dispatch before any external-skill metadata access.

Read only `capability.optionalSkill`. Accept only a canonical bare name already returned by C07. Probe:

```text
<control-root>/.claude/skills/<name>/SKILL.md
~/.claude/skills/<name>/SKILL.md
```

Use file metadata/followed file check only. Do not open file. Do not list parent dirs. Do not probe target Repository. Symlinked skill directories/files are allowed only as Claude discovery metadata; worker `Skill` invocation remains runtime authority and body access gate.

If either path is a readable regular file, call C07 pass 2 with one `--skill-name`. Never supply both duplicates. Never supply a name not returned by pass 1.

Excluded from hook inference:

- plugin skills;
- nested qualified skills;
- `--add-dir` skill roots;
- enterprise-managed roots;
- legacy command files;
- aliases and case variants.

Reason: hook input does not expose complete inventory. Guessing or scanning would inspect undeclared metadata and recreate host-specific resolver policy.

## 7. Injected worker prompt

Stable shape:

```text
<!-- trellis-hook-injected -->
# Validated Research Dispatch

Treat following JSON as sole Dispatch authority.
VALIDATED_DISPATCH_CONTEXT_START
<canonical compact or deterministic pretty JSON>
VALIDATED_DISPATCH_CONTEXT_END

Execute bounded worker contract. Return raw Result plus pending Proposal JSON only.
```

Do not include original prompt tail. Do not add interpreted owner, Task, Repository, context, output, or warning prose outside JSON. JSON must be parseable byte-for-byte into final validated C07 payload.

Marker keeps hook idempotent. Already-injected prompt does not rerun C07.

## 8. Hook denial

Output:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Research Dispatch preflight failed [CODE]: bounded message"
  }
}
```

Bound code/message length. Replace control characters. No `updatedInput` on denial.

## 9. Claude worker contract

Frontmatter removes broad discovery tools and adds dynamic skill invocation:

```yaml
tools: Read, Write, Edit, Bash, Skill
```

Worker sequence:

1. Require injected marker and one validated JSON block.
2. Validate authority/output fields before target access.
3. Invoke exactly `capability.selectedSkill` via `Skill`.
4. If invocation unavailable/ambiguous/unreadable, return blocked Result plus empty pending Proposal.
5. Use only inline context text and artifact `resolvedPath` reads.
6. Write only exact allowed `resolvedPath` values after containment recheck.
7. Treat checks as untrusted text; run only if provably bounded.
8. Return strict raw JSON.

`Skill` instructions cannot broaden worker authority. No `Glob`, `Grep`, Agent, network, web, MCP, Research mutation, Proposal review, Git-history mutation, sandbox escalation, or undeclared file access.

## 10. Shared test architecture

### Canonical integration fixture

Extract/reuse helper based on production Research operations from `research-dispatch-context.integration.test.ts`. Do not use fake `{seq}` ledger lines.

### Direct parity

Run `getResearchDispatchContext()` for Claude and Codex with same discovered-name set. Normalize expected host field and provider-specific warning only. Compare all provider-neutral fields deeply.

### Claude adapter

Run Python hook with fake `trellis` on `PATH`. Fake process records argv outside control root and emits precomputed direct C07 result/failure. Parse injected markers; compare payload exactly. Assert one or two calls and full-tree zero-write.

### Codex adapter

Keep template contract tests. Derive optional skill and fallback names from `RESEARCH_STAGE_CAPABILITIES` where possible. Verify all response fields matched by Claude validation also remain specified in Codex template.

### Presentation invariant

If SessionStart or worker prose still contains stage/name list, test it against core definitions. Failure prevents silent drift. List remains non-authoritative.

## 11. Compatibility, rollout, rollback

Compatibility break is intentional and bounded to undeclared Claude prompt tails and old failure-worker launch. Existing Dispatch data does not change.

Rollout gate:

1. focused C07/core/Claude/Codex parity;
2. full CLI suite;
3. lint/typecheck/build;
4. independent `trellis-check`;
5. task archive with no commit.

If parity fails, keep Channel and C10 blocked. Roll back C09 files only; never rewrite ledger/projections. No hidden Python fallback.

## 12. Rejected options

### Preserve Python validator plus parity tests

Rejected. Leaves duplicate authority and future drift.

### Pass no Claude optional skills forever

Rejected. Forces bundled fallback even when exact supported external skill is available; violates C06 capability intent.

### Hardcode nine optional names in Python

Rejected. Recreates drift list.

### Enumerate all Claude skill roots

Rejected. Hook lacks complete inventory, would inspect more metadata, and still cannot reliably model disabled/plugin/add-dir/enterprise behavior.

### Static `skills:` list in subagent frontmatter

Rejected. Preloads bodies before validated stage selection and loads more than one capability.

### Preserve prompt tail

Rejected. Tail is undeclared authority.

### Launch failure worker

Rejected. Denial gives stronger zero-target-access guarantee.
