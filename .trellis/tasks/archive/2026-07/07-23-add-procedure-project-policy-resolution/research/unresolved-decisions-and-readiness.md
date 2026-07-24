# Research: C04 Resolved Decisions and Activation Readiness

- **Query**: Resolve contradictions among C01, parent plan, current code, and the C04 boundary; state the final activation gates.
- **Scope**: internal
- **Date**: 2026-07-24

## Findings

### Sources reviewed

| File Path | Decision authority |
|---|---|
| `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/procedure-capability-policy-contract.md` | Frozen Procedure, policy, digest, authority, and filesystem contract. |
| `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/compatibility-freeze.md` | Active Skill/worker/Context/payload behavior preserved through C04. |
| `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/activation-approval-contract.md` | C05/C06 ownership boundary. |
| `.trellis/tasks/07-23-replace-research-skills-with-trellis-procedures/{prd,design,implement}.md` | Parent scope and ordered-child rollout. |
| `packages/core/src/research/stage-capabilities.ts` | Committed C03 14-entry registry and public lookup/resolution APIs. |
| `.trellis/spec/cli/backend/release-process.md` | Current packed Skill contract and successor C09 final-cutover wording. |
| `.trellis/spec/cli/backend/platform-integration.md` | Current worker/payload behavior retained until C07-C09. |
| `packages/cli/src/commands/research/command.ts` | Existing explicit `trellis research init` orchestration. |

### Final decisions

#### 1. Automatic policy opt-in

`policy.defaults.automaticEnabled === true` is the only automatic opt-in. `capabilities[id].enabled:true` is valid but is a no-op; it cannot opt in, create, or re-enable authority. `enabled:false` disables the capability. The conservative generated policy therefore permits no automatic authorization.

C04 computes eligibility only. C05 owns any later authorization or approval command behavior.

#### 2. Policy tightening and errors

`allowNetwork:false` and `allowMultipleRepositories:false` tighten effective authority to forbidden/single. Every other `allow*` remains false. These fields never grant worker authority and do not describe C05 explicit-approval powers.

`INVALID_RESEARCH_POLICY` covers byte, grammar, schema, path, identity, unknown-capability, and unsupported non-grant failures. `POLICY_WIDENS_AUTHORITY` covers recognized grant attempts: literal `true` in any `allow*`, `activation:"automatic"`, or a capability limit above the policy default. Procedure widening remains a source-specific invalid-Procedure failure.

#### 3. Exact bundled Procedure content

`procedure-content-matrix.md` freezes all 14 registry bindings, common input/output arrays, authority fields, seven H2 sections, and Trellis-owned source adaptations. Only the nine checked-in `trellis-research-*` fallback bodies may be adapted. Unprefixed, private, external, or host-discovered Skill bodies remain prohibited.

Final English bytes and golden digest values are implementation outputs produced from that matrix, not unresolved product decisions.

#### 4. “Bounded” wording and directory siblings

“Bounded Procedure” is a safety adjective, not a requirement for `kind:"bounded"`. Workflow Procedures remain workflows and may only plan or synthesize root-side work; workers do not launch Dispatches, use network, traverse repositories, or mutate canonical state.

Each Procedure directory has exactly two required authoritative named files. Resolution opens only `procedure.json` and `PROCEDURE.md`. All unnamed siblings are ignored without directory enumeration and do not affect selection, digest, ownership, or cleanup.

#### 5. Policy initialization and races

Only non-dry-run `trellis research init` may create an absent policy. Fresh and matching repeated init may create it; dry-run and conflicting initialization do not. Root init, host addition, force init, update, and uninstall never create or repair policy.

Absent-only creation must not call the replace-capable atomic writer on final `policy.json`. C04 stages exact bytes through unchanged `writeFileAtomic` at a unique same-directory sibling and publishes with an atomic exclusive no-replace link. A concurrent valid winner is preserved and returned as existing; an invalid winner fails without replacement.

#### 6. Package-internal Procedures

Bundled Procedures remain package-internal under `dist/templates/research/procedures`. Project `.trellis/research/procedures/**` contains overrides only. C04 does not copy bundled pairs into projects or route them through `collectResearchPlatformPayload`.

#### 7. Packed-audit ownership

C04 adds positive real-tarball assertions for all 28 Procedure files and retains every current positive Skill assertion. It adds no negative Skill-removal check. C09 owns active Skill source/payload removal, forbidden Skill inventory, and final packed cutover. C04 updates the release spec only to record this additive-versus-final split.

### C04 boundary

Included:

- strict duplicate-aware JSON and exact UTF-8/SemVer/canonical-byte validation;
- all 14 bundled Procedure pairs and Trellis-owned seven-section content;
- Procedure/policy digests;
- tightening-only effective authority and automatic eligibility;
- project-first/package-second fail-closed resolution with pre/post identity checks;
- strict project policy read and explicit Research-init absent-only creation;
- additive packed Procedure proof while retaining Skill positives;
- focused tests and implemented C04 code-spec updates.

Excluded:

- activation/approval events or commands (C05);
- Context authorization/revalidation and approval consumption (C06);
- worker/hook changes (C07);
- stopping Skill generation or installed Skill retirement (C08);
- active Skill source/tar removal and negative packed inventory (C09);
- package version/export-map/root-barrel changes;
- edits to `collectResearchPlatformPayload`, `writeFileAtomic`, or `stableResearchJson`;
- docs-site, marketplace, generic cleanup evidence, and frozen archives.

### Readiness

**Status: ready for activation after planning review.**

Ready gates:

1. C01 frozen contract and parent boundaries are represented in PRD/design/implementation artifacts.
2. Committed C03 registry and Research-subpath APIs are the sole binding authority.
3. Exact 14 Procedure content plans and common arrays are approved.
4. Automatic opt-in and tightening/error semantics are deterministic.
5. Explicit Research-init creation, dry-run/conflict/retry, and concurrent no-overwrite behavior are specified.
6. C04 additive packed proof is separated from C09 final Skill removal.
7. HIGH/CRITICAL functions and C05-C09 execution surfaces are explicit stop gates.
8. Task manifests contain only valid curated research/spec context and no implementation-target files.

### External references

None. No web/network research performed.
