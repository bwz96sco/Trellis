# Add bounded Codex Research worker

## Goal

Add a distinct Codex custom agent that consumes C07 read-only preflight before any target work and returns strict Result plus pending Proposal output.

## Requirements

- Add package source `packages/cli/src/templates/codex/agents/trellis-research-worker.toml` installed as `.codex/agents/trellis-research-worker.toml`.
- Keep existing `trellis-research.toml` unchanged and separately discoverable through C10.
- Do not add a repository-local dogfood twin or commit generated `dist` output.
- Use `sandbox_mode = "workspace-write"` plus structural nested-agent disables:
  ```toml
  [features]
  multi_agent = false

  [features.multi_agent_v2]
  enabled = false
  ```
- Accept exactly one non-empty first prompt line:
  ```text
  Research dispatch: .trellis/research/dispatches/<dsp-id>/request.json
  ```
- Treat initial working directory as Research control root.
- Before preflight, do not change directory, manually read request/ledger/projections, inspect target Repository, read skill bodies, execute checks, or write files.
- Collect optional external skill names from Codex-provided skill inventory metadata only. Intersect with exact nine C06 optional names, sort, and pass names only.
- Do not scan skill directories, inspect bodies/frontmatter before success, or pass invocation adornments, paths, aliases, namespaces, descriptions, case variants, or fuzzy matches.
- Run exactly one direct-argument preflight:
  ```text
  trellis research dispatch context <request-file> --host codex --root . [--skill-name <name>...] --json
  ```
- Do not use pipes, redirects, `jq`, command substitution, temporary files, `npx`, package installation, manual validation fallback, or mutation dry-run.
- Fail closed before target access on invalid pointer, unavailable/incompatible CLI, nonzero command, malformed/multiple JSON, success stderr, `valid !== true`, host/request mismatch, changed authority flags, or wrong output-contract type.
- Return a valid C07 failure envelope unchanged. For preflight process failure with no envelope, return one bounded worker-owned `PREFLIGHT_EXECUTION_FAILED` no-write diagnostic; never invent Dispatch IDs.
- After successful preflight, load exactly `capability.selectedSkill` from existing Codex inventory. Never route from owner/provider/taskRef/warnings or load related/dependency skills.
- Worker authority overrides conflicting optional-skill instructions.
- Missing/ambiguous/unreadable selected skill returns blocked Result plus empty pending Proposal using C07 fixed IDs before target access.
- Use only `repository.path` as target working directory.
- Read only C07 inline text and declared artifact `resolvedPath` entries. Do not list, grep, or read undeclared Repository files.
- Write only declared `work.allowedWritePaths[].resolvedPath`; empty list is read-only.
- Recheck nearest existing ancestor immediately before writes; block on symlink/TOCTOU escape.
- Preserve portable relative references in Result/Proposal; never serialize absolute machine paths.
- Run a declared check only when its effects remain inside declared read/write scope and it cannot mutate Git history or canonical Research state. Unsafe or unclear checks become blockers.
- Network, web, MCP, and undeclared external sources are unauthorized in C08 because C07 read scope is `declared-context-only`.
- Never spawn nested agents, mutate canonical Research state, record Result/Proposal, review/apply/reject Proposal, promote Claim, advance lifecycle, rebuild projections, or run Git history mutations.
- Never request sandbox escalation or `danger-full-access`.
- If target Repository is outside current Codex writable roots, return blocked Result plus empty pending Proposal. Dynamic `--add-dir` launcher support is out of scope.
- Successful work returns raw JSON only with exactly `result` and `proposal` top-level keys.
- Result/Proposal must strict-parse against current core schemas; fixed Dispatch/Run/Quest IDs come from C07 output contract; Proposal status is exactly `pending`; required arrays always exist; empty operations are valid.
- Automatic Codex template discovery/configuration/update/hash/package paths must consume the new TOML without production TypeScript changes.
- Fresh init claims the worker; older managed Codex installs receive it; unowned conflicting bytes survive and remain unclaimed; repeated init/update is idempotent.
- Add deterministic template/init/update/configurator/package tests and an opt-in non-release-blocking real-Codex discovery/failure smoke.
- Do not modify C07 command behavior, core Research schemas/store, Claude Python hook behavior, Task prelude symbols, C09 parity, C10 generic removals, docs-site, marketplace, or unrelated dirty files.
- Do not create a commit.

## Acceptance Criteria

- [ ] Codex agent inventory contains separate `trellis-research` and `trellis-research-worker` entries with exact stable names.
- [ ] New TOML structurally disables nested agents and contains no generic Task prelude or `{TASK_DIR}` placeholder.
- [ ] Instruction ordering makes C07 preflight the first process and first authority read before target/skill-body access.
- [ ] Exact canonical pointer and one-line input are required.
- [ ] Only canonical optional names from Codex inventory metadata are passed to C07 in deterministic order.
- [ ] Nonzero/malformed/invalid preflight stops with bounded no-write output and no manual fallback.
- [ ] Valid preflight loads only `capability.selectedSkill`; legacy metadata and warnings cannot reroute execution.
- [ ] Missing selected skill blocks before target access using C07 output IDs.
- [ ] Reads, writes, and checks are limited to C07-declared scope; undeclared files/network/external sources remain inaccessible by contract.
- [ ] Write instructions require immediate symlink-ancestor recheck and prohibit sandbox escalation.
- [ ] Repository outside current writable sandbox blocks rather than using `danger-full-access` or dynamic launcher changes.
- [ ] Canonical state mutation, Proposal self-review, `record-result`, nested agents, and Git history mutations are explicitly forbidden.
- [ ] Final successful payload has exactly `result` then `proposal`, strict-parses both schemas, copies fixed IDs, and keeps Proposal pending.
- [ ] Fresh Codex init installs exact worker bytes and records its ownership hash; dual-host init has no worker collision.
- [ ] Older managed Codex install receives worker on update; repeated update is no-op.
- [ ] Pre-existing unowned worker bytes survive update and are not claimed.
- [ ] Build output and npm tarball contain exact worker path; generated `dist` remains uncommitted.
- [ ] Existing generic Codex researcher behavior and C07/Claude hook behavior remain unchanged.
- [ ] Optional real-Codex smoke skips by default and proves exact agent discovery plus preflight-failure zero-write behavior when enabled.
- [ ] Focused/full CLI tests, lint, typecheck, build, workspace typecheck, package audit, `git diff --check`, and child-scoped review pass.
- [ ] No existing production symbol is edited; if that changes, GitNexus impact is run and reviewed first.
- [ ] No commit is created unless explicitly requested.

## Notes

- C07 is archived at `.trellis/tasks/archive/2026-07/07-18-add-readonly-dispatch-context`.
- C09 owns Claude/Codex validation convergence and duplicate-map removal.
- C10 owns removal of the old generic researcher and Task-oriented surfaces.
