# Replace Research Skills with Trellis-owned Procedures

## Goal

Replace host-dependent Research Skill execution with Trellis-owned capability policy, versioned Research Procedures, canonical activation and approval gates, and equivalent generic Claude/Codex workers.

## Requirements

- Make Trellis registry and Quest stage authoritative for capability selection.
- Classify capabilities as bounded, workflow, or advisory; every workflow requires explicit operator approval.
- Resolve strict versioned Procedures from project override first, bundled default second; malformed overrides fail closed.
- Create conservative project-owned `.trellis/research/policy.json`; normal update must not overwrite it.
- Add canonical activation and approval state through new schema-v2 events while accepting all existing schema-v1 events unchanged.
- Keep existing Dispatch, Result, Proposal, Decision, and tracked projection schemas unchanged.
- Keep `ownerSkill`, `provider`, and `taskRef` readable as compatibility metadata only.
- Keep Dispatch Context read-only and bind execution to host, request, scope, Procedure, and policy digests.
- Consume active approval atomically with Result and Proposal recording.
- Replace Claude and Codex Skill discovery/invocation with one normalized embedded-Procedure contract.
- Stop generating Research Skills; retire only exact pristine Trellis-owned historical files. Preserve modified, unknown, malformed, and external Research Skills.
- Preserve `.trellis/research/**`, child-repository Git histories, Mempal ownership, root-only mutation authority, and all existing worker restrictions.
- Do not touch docs-site, marketplace, frozen generic cleanup evidence, generic core exports, package versions, or semver-major removal work.
- No automatic commit or push.

## Ordered Children

1. C01 freezes Procedure, capability, policy, compatibility, CLI, and impact contracts.
2. C02 adds core dual-version activation and approval state.
3. C03 replaces Skill routing with capability registry.
4. C04 adds Procedure and project-policy resolution.
5. C05 adds activation planning and approval commands.
6. C06 gates Dispatch Context and result consumption.
7. C07 replaces host execution with generic workers.
8. C08 stops generation and safely retires installed Research Skills.
9. C09 removes active Skill source/packed payload and updates executable specs.
10. C10 rehearses migration and closes parent integration.

Child number defines dependency order. Parent/child links remain organizational metadata; each child records predecessor gates in its own planning artifacts before activation.

## Acceptance Criteria

- [ ] Parent and ten children exist with exact order and independently testable scopes.
- [ ] Existing schema-v1 ledgers replay and rebuild unchanged; mixed v1/v2 replay is deterministic.
- [ ] Bounded capabilities authorize only inside project policy; workflows cannot execute without explicit approval.
- [ ] Dispatch Context stays zero-write and rejects missing, expired, revoked, mismatched, or drifted authority.
- [ ] Claude and Codex receive equivalent normalized Procedure context with no Skill discovery or invocation.
- [ ] Fresh installs generate no Research Skill directories.
- [ ] Historical cleanup deletes only exact pristine Trellis-owned Research Skill bytes.
- [ ] Packed CLI contains Procedures, policy/runtime support, workers, and retirement evidence but no active Research Skill payload.
- [ ] Full tests, lint, Python analysis, typecheck, build, packed-core, packed-CLI, migration rehearsal, and `git diff --check` pass.
- [ ] GitNexus changed-scope review and independent `trellis-check` find no unexplained flow expansion.
- [ ] `.trellis/research/**`, unrelated dirty work, docs-site, marketplace, generic core compatibility, and Git history remain preserved.
- [ ] No commit or push occurs without a later explicit request.

## Notes

- Related history: `.trellis/tasks/07-18-research-only-claude-codex-migration` and its archived C01-C11 children.
- Parent owns source requirements, sequence, cross-child gates, and final integration review. It is not the normal implementation target.
- Activate C01 only after parent and C01 planning artifacts validate.
