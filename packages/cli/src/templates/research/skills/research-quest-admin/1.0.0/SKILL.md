# Research Quest Admin

Use only as an explicit root command for deterministic Research Quest import, export, and writer-authority operations. This package has no model Context or managed Dispatch profile.

## Import

1. Preview without `--write`:
   `trellis research quest import --source <research-quest.yaml> [--events <research-events.jsonl>] --json`
2. Review the complete mapping, conflicts, loss report, ordered mutations, and preview token.
3. Write only with the exact reviewed token:
   `trellis research quest import --source <research-quest.yaml> [--events <research-events.jsonl>] --preview-token <token> --write --json`

## Export

1. Preview the complete control and Artifact inventory:
   `trellis research quest export --quest <qst-id> --target <directory> --json`
2. Write explicitly after review:
   `trellis research quest export --quest <qst-id> --target <directory> --write --json`

Export records evidence but never transfers writer authority.

## Writer authority

Transfer authority only as a separate reviewed command with the authenticated digest:

`trellis research quest transfer-writer --quest <qst-id> --to <trellis|source> --rationale <text> --export-digest <sha256> --write --json`

Canonical transfer events and verified writer projections are the only authority. CLI text, preview tokens, exported files, fences, and sidecars do not grant writes. Source-admin mutation remains subject to the existing fence and writer-projection refusal before any source filesystem change.

Stop after the one requested preview or mutation and report the command result. Do not launch nested model or provider work, a worker, Skill, Workflow, capability, Procedure, or Dispatch, and do not record a gate.
