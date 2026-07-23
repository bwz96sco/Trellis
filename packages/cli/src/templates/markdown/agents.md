<!-- TRELLIS:START -->
# Trellis Research Instructions

This project uses the managed Research workflow in `.trellis/workflow.md`.

- The root session owns authoritative Quest, Campaign, Run, Evidence, Claim, Result, and Proposal state.
- Inspect state with `trellis research status --json` and validate it with `trellis research validate --json`.
- Load the bundled skill that owns the active research stage before planning or review.
- Dispatch only the exact one-line pointer created by `trellis research dispatch prepare`.
- Workers return a bounded Result plus a pending Proposal; they never mutate canonical `.trellis/research/**` state.
- The root must record each Result and explicitly apply or reject each Proposal.

Claude Research helpers live under `.claude/`. Codex Research helpers live under `.codex/` and `.agents/skills/`.

Managed by Trellis. Content outside this block is preserved; content inside may be replaced by `trellis update`.
<!-- TRELLIS:END -->
