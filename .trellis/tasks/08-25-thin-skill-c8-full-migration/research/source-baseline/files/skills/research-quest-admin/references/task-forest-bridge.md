# Optional Task-Forest Bridge

Load this reference only when the user explicitly requests a task graph, task-forest proposal, or durable dependency view. Quest state and research evidence remain authoritative; task-forest is a planning projection.

## Proposal Mapping

| Quest field | Proposal meaning |
| --- | --- |
| `objective` | global research task |
| active `branches[]` | independent child tasks |
| `branches[].owner_skill` | accountable task owner |
| `next_action` | immediate follow-up and acceptance gate |
| `blockers` | blocker or question nodes |
| `authoritative_artifacts` | evidence pointers, not task status |
| `claims` with weak status | risks, not established results |

Create proposal JSON in temporary storage. Check for duplicate nodes, stale branches, and unsupported claims before showing it to the user. Apply or save it through task-forest tooling only after explicit confirmation.

Never:

- edit `.agent-workbench/task-forest/` directly
- infer task completion from a claim or artifact path alone
- copy routine quest events into task nodes
- let task-forest replace `research-quest.yaml`, stage manifests, or evidence
