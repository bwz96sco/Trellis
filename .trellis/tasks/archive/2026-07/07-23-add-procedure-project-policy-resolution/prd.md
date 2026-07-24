# C04 Add versioned Procedure and project-policy resolution

## Goal

Add deterministic, fail-closed resolution of bundled and project-overridden Research Procedures, strict project-policy loading, exact Procedure/policy digests, tightening-only effective authority, and automatic-eligibility evaluation.

C04 establishes host-neutral resolution contracts for C05/C06. It does not activate capabilities, emit approval events, authorize Dispatch Context, change workers, or retire Skills.

## Dependencies and ownership

- C01 freezes Procedure, policy, digest, authority, filesystem, and compatibility contracts.
- C03 provides the immutable 14-capability registry through `@mindfoldhq/trellis-core/research`.
- C04 owns strict parsing, bundled assets, project overrides, policy creation/read, digests, effective authority, automatic eligibility, and additive packed presence proof.
- C05 owns activation planning and approval/authorization commands.
- C06 owns Context revalidation, approval gating, and approval consumption.
- C07 owns generic workers; C08/C09 own Research Skill retirement and final packed cutover.

## Requirements

### Registry authority

- Consume the C03 registry without duplicating or mutating it.
- Resolve Procedure ID/version only from a registered capability.
- A Procedure or policy cannot add capabilities, change stage/kind/Procedure binding/worker authority, or widen registry authority.
- Keep the core root barrel, export map, and package versions unchanged; new public APIs belong only to the existing Research subpath.

### Bundled Procedure inventory

Package exact `1.0.0` pairs for:

```text
project-setup-v1
quest-framing-v1
quest-admin-v1
literature-scan-v1
literature-review-v1
idea-generation-v1
idea-evaluation-v1
experiment-round-v1
experiment-campaign-v1
computation-case-v1
theory-case-v1
review-case-v1
review-campaign-v1
writing-case-v1
```

Each package-internal version directory contains authoritative `procedure.json` and `PROCEDURE.md`. Project `.trellis/research/procedures/**` contains overrides only. Adapt content only from Trellis-owned `trellis-research-*` fallback templates according to `research/procedure-content-matrix.md`; never inspect or copy unprefixed/private/external Skill bodies.

Every `PROCEDURE.md` has exactly these seven H2 sections in order:

```text
Purpose
Preconditions
Inputs
Procedure
Outputs
Checks and Stop Conditions
Authority Boundaries
```

“Bounded Procedure” means safety-constrained, not `kind: "bounded"`.

### Strict Procedure validation

`procedure.json` must:

- be a non-empty, contained, non-symlink regular file;
- be valid UTF-8 without BOM;
- contain one strict plain JSON object with no comments, trailing tokens, duplicate decoded keys, unknown keys, or missing required keys;
- use schema version 1 and exact SemVer without leading `v`, whitespace, build metadata, or leading-zero numeric identifiers;
- use non-empty duplicate-free string arrays, preserving array order;
- use positive integer limits when present;
- have exactly one final LF;
- equal compact canonical serialization byte-for-byte.

Canonical key order:

```text
schemaVersion, id, version, stage, kind, inputs, outputs,
networkPolicy, repositoryScope, maxDurationMinutes, maxDispatches, replaces
```

Bundled manifests omit `replaces`. Project overrides require exact bundled `{ id, version }`. Manifest identity must match the selected registry definition. Procedure authority may only tighten: `declared-only -> forbidden`, `multiple -> single`, and lower positive limits. Omitted limits inherit registry ceilings.

`PROCEDURE.md` must be non-empty valid UTF-8 with no BOM or NUL. Its exact bytes are authoritative; line endings and final-newline presence are not normalized.

All unnamed siblings, regular or non-regular, are ignored without directory enumeration. Only the two registry-bound named files are opened, validated, or digested.

### Procedure resolution and digest

Resolution order:

1. exact project override directory;
2. package-internal bundled Procedure.

Only genuine absence of the exact project candidate permits bundled fallback. Any present-invalid, partial, symlinked, non-directory, unreadable, escaping, mismatched, or concurrently changed project candidate fails with `INVALID_PROJECT_PROCEDURE`; no fallback. Missing or invalid bundled assets fail with `INVALID_BUNDLED_PROCEDURE`.

Procedure digest input:

```text
UTF8("trellis-research-procedure-digest-v1\0")
|| canonical procedure.json bytes excluding final LF
|| 0x0A
|| exact PROCEDURE.md bytes
```

Output is `sha256:` plus 64 lowercase hex digits. Existing CRLF-normalizing template hash helpers are forbidden.

### Project policy

Canonical path:

```text
.trellis/research/policy.json
```

Ordinary resolution requires an existing valid policy; it never substitutes an in-memory default. Strict parsing rejects BOM, invalid UTF-8, duplicate/unknown/missing keys, malformed values, unsupported schema, unknown capability IDs, and non-positive limits. Semantic grant attempts fail separately with `POLICY_WIDENS_AUTHORITY`: any literal `true` in an `allow*` field, `activation:"automatic"`, or a capability limit above its policy default. `enabled:true` remains the one recognized no-op and is not a widening error.

Exact conservative creation bytes use schema v1, `automaticEnabled:false`, 15 minutes, one Dispatch, all `allow*` values false, empty capabilities, and one final LF.

Only non-dry-run `trellis research init` may create an absent policy. Fresh and matching repeated Research init create the missing file; dry-run writes nothing. Existing valid bytes are preserved exactly. Existing malformed, symlinked, non-regular, unreadable, or escaping paths fail without overwrite. Conflicting Research initialization performs no repair. Concurrent creation must use an exclusive no-replace publication step: a winning valid file is preserved and returned as existing, while a winning invalid file fails without replacement. Root init, host addition, force init, update, and uninstall never create policy.

Policy digest input:

```text
UTF8("trellis-research-policy-digest-v1\0")
|| UTF8(stableResearchJson(strictParsedCompletePolicy))
```

Call `stableResearchJson` unchanged. Valid source formatting and key order do not affect digest; semantic changes do.

### Effective authority

Merge order:

```text
registry -> validated Procedure -> policy defaults -> capability override
```

- Capability begins enabled; `enabled:false` disables all use; `enabled:true` is a no-op.
- `activation:"explicit"` may tighten automatic to explicit; nothing makes explicit automatic.
- Limits are the minimum of registry, Procedure/inherited registry, policy defaults, and capability override.
- Policy `allowNetwork:false` and `allowMultipleRepositories:false` tighten to forbidden/single; they never authorize network or multiple-Repository worker access, including after later explicit approval.
- External cost, canonical mutation, and capability chaining remain false.
- Policy widening attempts fail with `POLICY_WIDENS_AUTHORITY`; Procedure widening remains a source-specific invalid-Procedure error. C04 computes effective authority only and does not define C05 approval authority.

### Automatic eligibility

`policy.defaults.automaticEnabled === true` is the only automatic opt-in. `enabled:true` does not opt in.

Eligibility requires: enabled; bounded kind; automatic effective activation; forbidden network; single Repository; no external cost/canonical mutation/chaining; at most one Dispatch; at most 15 minutes. Return every failed condition in stable order. C04 computes only; it emits no grant, approval, event, or Context decision.

### Packaging and compatibility

- Clean CLI build and real packed tarball contain all 28 Procedure assets.
- Additive packed assertions retain every existing positive Skill requirement.
- C04 adds no negative Skill-removal assertion; C09 owns that cutover.
- Preserve active worker, hook, Skill generation, platform payload, Dispatch Context, update, uninstall, event, and projection behavior.
- Preserve `.trellis/research/**`, docs-site, marketplace, cleanup evidence, and unrelated work.

### Risk freeze

Do not modify:

- HIGH `collectResearchPlatformPayload`;
- CRITICAL `writeFileAtomic`;
- CRITICAL `stableResearchJson`.

They may be called unchanged where specified. Any need to edit them, or C05-C09 surfaces, stops implementation and returns to planning.

## Acceptance criteria

- [ ] All 14 registry Procedure bindings have one canonical bundled pair and approved seven-section content.
- [ ] Canonical manifests pass; missing, unknown, duplicate, reordered, pretty, CRLF, extra-LF, BOM, invalid UTF-8, invalid SemVer, duplicate-array, mismatched, and authority-widening variants fail deterministically.
- [ ] Invalid instruction bytes fail; LF/CRLF/final-newline differences produce distinct valid digests.
- [ ] Absent override falls back; valid override wins; any present-invalid override fails without fallback.
- [ ] Symlink, non-regular, containment, unreadable, component replacement, and pre/post-read identity-drift cases fail closed.
- [ ] Golden Procedure vectors prove domain prefix, NUL, manifest LF framing, exact instructions, Unicode, array order, omission, and lowercase digest form.
- [ ] Policy parser rejects every malformed/widening matrix case and preserves valid source bytes.
- [ ] Fresh/matching Research init creates only absent conservative policy; dry-run/conflict/invalid existing path writes nothing; a concurrent creator is never overwritten.
- [ ] Root init, host addition, force init, update, and uninstall do not create policy and preserve Research state.
- [ ] Policy digest ignores valid formatting/key-order differences but changes for semantic differences.
- [ ] Table-driven tests cover all 14 capabilities, Procedure tightening, policy defaults/overrides, disabling, explicit tightening, and widening rejection.
- [ ] Automatic eligibility requires global opt-in; returns all deterministic reasons; creates no authorization state.
- [ ] Packed core exposes representative C04 APIs through Research subpath only; packed CLI contains all 28 assets plus current positive Skill inventory.
- [ ] Frozen HIGH/CRITICAL functions and C05-C09 surfaces have no diff.
- [ ] Focused/full tests, lint, typecheck, builds, packed-core/CLI audits, task validation, seven-section specs, GitNexus changed-scope detection, and `git diff --check` pass.
- [ ] Independent review, archive, authorized child commit, and no push complete only after all gates pass.
