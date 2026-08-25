# Campaign Indexing

Load only for explicit named campaign indexing.

## Authority

Campaign stage tracker owns run matrix, commands, seeds, metrics, budgets, stop rules, and result claims. Quest stores campaign route plus pointer; it never copies run-level detail.

## Index

1. Read campaign tracker and current quest state.
2. Confirm campaign ID, owner skill, tracker path, active/blocked/closed status, and immediate acceptance gate.
3. Add or update one quest branch or authoritative artifact pointer with relative path and owner.
4. Update `active_stage` or `next_action` only when campaign becomes mainline.
5. Append milestone event only for campaign open, decisive route change, blocker transition, handoff, or closure.
6. Regenerate status and validate.

Do not infer campaign status from artifact presence. Do not duplicate runs, metrics, or claims into quest state. Missing tracker -> report blocker; no substitute search.
