# Shared Dispatch parity fixtures

## Goal

One canonical fixture family must drive core C07, Claude hook, and Codex adapter assertions. Handwritten projection-only fixtures are not valid parity evidence.

## Canonical fixture construction

Build each valid base fixture through production Research operations:

1. `initializeResearch()`
2. `addResearchRepository()`
3. `createResearchQuest()`
4. `setResearchQuestStage()`
5. `createResearchCampaign()`
6. `createResearchRun()`
7. optional artifact registration
8. `prepareResearchDispatch()`

This produces canonical events, deterministic projections, tracked `request.json`, repository registration, and runtime bindings using the same contracts as production.

Fixture helper returns:

- control root;
- optional child invocation root;
- target repository root;
- canonical request pointer and absolute request file;
- Quest, Campaign, Run, Repository, Dispatch IDs;
- helpers for exact event/request/projection mutation;
- full-tree snapshot helper for zero-write assertions.

## Parity decision

For valid cases, compare these semantic fields from direct C07 calls for both hosts:

- `valid`;
- `requestRef`;
- Quest stage/status;
- Campaign and Run identity/status;
- capability key, optional skill, fallback skill, selected skill, and source;
- repository identity and resolved path;
- context entries and artifact pointers;
- allowed write paths;
- expected outputs and checks;
- authority snapshot;
- Result plus pending Proposal output contract;
- compatibility warning codes and bounded details.

Host field is expected to differ: `claude` vs `codex`. Provider-hint warning may differ when fixture intentionally names one host.

Claude hook success must embed the exact validated Claude C07 JSON between stable markers. Tests parse that JSON and compare it to direct C07 output. Codex template tests prove its first-process contract calls the same C07 command and validates the same authority/output fields.

For invalid cases, compare C07 error code, safe action, and zero-write behavior. Claude then denies Agent launch with that bounded code. Codex returns the typed C07 failure unchanged when validly structured.

## Required matrix

### Capability and compatibility

1. Every active stage resolves exactly once.
2. `complete` rejects as non-dispatchable.
3. No optional skill -> bundled fallback.
4. Exact optional skill -> host source.
5. Arbitrary legacy `ownerSkill` -> warning, not rejection.
6. Wrong-stage legacy owner -> warning, not rejection.
7. Provider mismatch -> host-specific warning.
8. `taskRef` -> warning without Task dereference.
9. Descriptive `expectedOutputs`, such as `Golden report`, remain text.

### Canonical authority

10. Edited tracked request vs canonical Dispatch rejects.
11. Malformed canonical event with contiguous sequence rejects.
12. Valid ledger with missing/stale projections remains decided by ledger.
13. Paused Quest rejects.
14. Terminal Run rejects.
15. Missing or mismatched `run.dispatchId` rejects.
16. Runtime binding takes precedence over locator.
17. Remote mismatch rejects.

### Artifact and path containment

18. Canonical artifact registration mismatch rejects.
19. Digest mismatch rejects.
20. Revision mismatch rejects.
21. Artifact symlink escape rejects.
22. Existing write-path symlink escape rejects.
23. Dangling write-path symlink escape rejects.
24. Symlinked request file rejects.
25. Symlinked Dispatch directory rejects.

### Adapter execution

26. Typed C07 failure is preserved and causes Claude denial.
27. Missing or stale CLI causes bounded local preflight failure.
28. Malformed, empty, or multiple JSON values fail closed.
29. Successful process stderr fails closed.
30. Host/request/authority/output-contract mismatch fails closed.
31. Repeated success and failure preserve full-tree snapshot.
32. Ordinary Claude Agent prompts execute no C07 subprocess.
33. Explicit Dispatch from child repository still finds root control plane.
34. Exact one-line envelope accepts; blank line, tail, prefix, suffix, traversal, backslash, absolute path, or case variation rejects.
35. Exact optional personal/project skill metadata causes second C07 pass with one canonical `--skill-name`.
36. Missing optional skill uses first-pass bundled resolution without second process.
37. Selected skill missing, disabled, or unreadable at worker invocation returns blocked Result plus empty pending Proposal; no fallback after validated selection.

## Fake CLI boundary

Claude hook tests use a fake `trellis` executable placed first on `PATH`.

Fake executable:

- records argv without reading target files;
- emits one precomputed C07 result or failure;
- supports first-pass and optional second-pass responses;
- can emit malformed/multiple JSON, stderr, nonzero exit, and contract mismatch;
- never mutates fixture tree except an external test-owned argv log outside control root.

Production C07 integration tests remain responsible for real ledger, repository, artifact, and path validation. Hook adapter tests remain responsible for process argv, response validation, denial, prompt injection, optional-skill metadata probe, and zero unintended subprocesses.

## Drift prevention

Do not keep a second stage table in Dispatch validation tests. Iterate core `RESEARCH_STAGE_CAPABILITIES`.

Any remaining presentation-only stage maps, including SessionStart output or Codex inventory prose, need invariant tests derived from core definitions. Failure is a test-time drift signal; they never regain Dispatch authority.
