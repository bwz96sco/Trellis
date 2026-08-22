# C2 Implementation Plan

## 1. Planning and Activation

- Validate PRD/design/implementation artifacts and JSONL context manifests.
- Run the Trellis planning review gate.
- Start the existing C2 task; do not create another task.

## 2. Impact Analysis

Before editing each existing function/class/method, run GitNexus upstream impact analysis. Expected targets include Procedure parsing, resolver entrypoints, event parsing, reducer Activation/Approval branches, store event construction, and packed-audit inventory builders. Stop and warn before editing any HIGH/CRITICAL target.

## 3. Core Execution-Package Model

- Add `packages/core/src/research/execution-package.ts`.
- Implement normalized identity, strict Skill v3 parser/serializer, byte framing, fixed-domain digests, member inventory authentication, invocation validation, member selection, identity comparison, and deep freezing.
- Add independent fixed digest vectors and negative parser/policy/member cases.
- Export only through the existing Research subpath.

## 4. Procedure Normalization

- Extend parsed Procedure results additively with normalized identity.
- Compute instruction digest from original authenticated bytes.
- Compute v1 empty-inventory and v2 existing-inventory digests.
- Preserve `computeResearchProcedureDigest`, `computeResearchProcedureDigestV2`, canonical Procedure manifests, support-pack serialization, registry-current behavior, and recorded replay.
- Test current `1.0.0` and retained `2.0.0`–`2.0.7` packages.

## 5. Generalized CLI Resolver

- Extract existing directory-chain, containment, symlink, non-regular-file, stable-read, and replacement-detection behavior behind a package-neutral internal seam.
- Add exact Skill project/bundled layout and full member loading.
- Add project-only success, valid override, absent fallback, present-invalid no-fallback, and identity mismatch behavior.
- Apply audience/request filtering only after full inventory authentication.
- Retain `resolveResearchProcedure(...)` and `resolveResearchProcedureAuthority(...)` behavior.

## 6. Activation/Approval Event Variants

- Add normalized execution-package Activation and Approval types.
- Add a new event-schema branch without widening historical schema-v2 accepted payloads.
- Add package-neutral binding helpers.
- Update schema parsing, event parsing, reducer cloning/binding checks, store event emission, and mixed-ledger tests together.
- Do not add live CLI Skill activation, Approval issuance, Context, or worker execution.

## 7. Packed Inventory

- Require Procedure versions through `2.0.7` in the packed CLI audit.
- Validate every member declared by packed support manifests.
- Add manifest-driven future Skill inventory support without adding generic production Skill fixtures.
- Verify recursive template copy and a real packed tarball.

## 8. Verification

Focused:

```bash
pnpm --dir packages/core exec vitest run \
  test/research/execution-package.test.ts \
  test/research/procedure-policy.test.ts \
  test/research/procedure-support-pack.test.ts \
  test/research/activation-approval.test.ts \
  test/research/store.test.ts

pnpm --dir packages/cli exec vitest run \
  test/commands/research-procedure-resolution.integration.test.ts \
  test/commands/research-procedure-historical-resolution.test.ts \
  test/commands/research-procedure-206-packages.test.ts \
  test/commands/research-procedure-207-packages.test.ts \
  test/scripts/packed-cli-audit.test.ts
```

Then run Core/CLI typecheck, lint, CLI build, package export tests, real pack audit, full Core/CLI suites, task validation, `git diff --check`, and GitNexus `detect_changes` against `variant/research-workflow`.

## 9. Commit Boundary

- Review exact C2 path inventory.
- Use normal Husky hooks; never bypass them.
- Commit C2 only after all required tests pass.
- Do not push, release, publish, activate a live package, invoke a provider, or begin C3.
