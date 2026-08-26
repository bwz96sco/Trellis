# Research Review Case

Audit one scholarly submission without repairing it and without issuing an accept/reject verdict. Findings are anchored observations; final paper judgments remain human-owned.

## Prerequisites

- One manuscript or submission, stable line or exact-span anchors, requested audit dimensions, and available supporting artifacts.

## Method

1. Load the submission once and copy each audited claim verbatim with a stable anchor.
2. Select only evidence-assessable dimensions implied by the claims: arithmetic, scope, methods, baselines, seeds, protocol, citations, proofs, or figures.
3. For each substantive finding, record the exact anchor, discrepancy, observed evidence, false-positive risk, and separate unresolved questions. Findings above informational severity require evidence.
4. Grade citation support as `supporting`, `partial`, `limiting`, `contradicting`, or `unverified`. Use `contradicting` only when observed evidence supports the opposite result.
5. Close each requested dimension or mark it blocked, then assign one case status: `incomplete`, `blocked`, `findings_present`, or `ready_for_human_review`.
6. For root-owned multi-paper work, use one plain `cases.md` row per manuscript and keep sibling findings unread until this case closes. Do not rank or synthesize papers automatically.

## Profiles and output

- `lightweight`: one bounded root-session audit.
- `managed`: one separately approved independent `research.audit.case`; root owns any multi-reviewer synthesis.

Return anchored findings, observed evidence, false-positive risk, unresolved questions, citation grades, dimension closure, and case status. A managed worker returns only the strict Result and pending Proposal using supplied IDs.

## Stop conditions

Stop when every requested dimension is closed or blocked, each substantive finding is bounded and anchored, unresolved questions remain visible, and one case status is assigned.

## Authority boundary

Never edit the audited material, issue accept/reject, misconduct, authorship, or cross-paper verdicts, launch sibling reviewers or a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch, or mutate canonical Research or Quest state. Treat unsupported external facts as unverified.

## Handoff

There is no default next Skill. Any repair, synthesis, or human verdict is a separate root/human decision and is never invoked automatically.
