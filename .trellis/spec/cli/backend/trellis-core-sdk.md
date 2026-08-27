# Trellis Core SDK Compatibility Contract

## 1. Scope / Trigger

This specification defines the package boundary between the Research-only CLI and the version-locked reusable core SDK.

Removing active generic CLI commands does not remove the 0.7 core compatibility API. Channel, Mem, and Task remain programmatic SDK domains only; they do not authorize `trellis channel`, `trellis mem`, `trellis workflow`, or `trellis research task` registration.

## 2. Signatures

The package export keys are frozen in this exact order throughout 0.7:

```text
./package.json
.
./channel
./mem
./research
./task
./testing
```

Every conditional entry has exact `types`, `import`, and `default` targets. The public classification is:

| Entry point | 0.7 status | Runtime contract |
|---|---|---|
| `@mindfoldhq/trellis-core` | Compatibility-only | Existing Channel and Task root exports only. |
| `@mindfoldhq/trellis-core/channel` | Compatibility-only | Existing Channel values, types, signatures, identities, and behavior. |
| `@mindfoldhq/trellis-core/mem` | Compatibility-only | Existing Mem values, types, behavior, and historical host readers. |
| `@mindfoldhq/trellis-core/research` | Active | Canonical Research SDK and sole production CLI core dependency. |
| `@mindfoldhq/trellis-core/task` | Compatibility-only | Existing Task values, types, signatures, identities, and behavior. |
| `@mindfoldhq/trellis-core/testing` | Reserved | Importable empty runtime and declaration namespace. |
| `@mindfoldhq/trellis-core/package.json` | Metadata | Package metadata only. |

Package roles:

| Package | Active responsibility |
|---|---|
| `@mindfoldhq/trellis-core` | Reusable domain APIs and version-locked compatibility exports. |
| `@mindfoldhq/trellis` | Commander parsing, Research command orchestration, current payload installation, migrations, update/uninstall, and release proof. |

## 3. Contracts

### Export stability

- Root and five domain subpath exports remain available throughout 0.7 in the exact order and with the exact targets above.
- The root barrel remains Channel plus Task only; it does not leak Research, Mem, or Testing.
- Testing remains reserved, importable, and empty.
- `appendEvent` and `AppendablePartial` remain Channel store internals. Neither `./channel` nor the root barrel may re-export them; typed mutation APIs own public writes. With `stripInternal: true`, a public barrel must never emit a declaration re-export whose source declaration is stripped.
- Do not add wildcard exports, public deep-import paths, wrappers, or altered runtime identities.
- Removing an active CLI surface must not delete or rename these compatibility exports.
- Generic API removal belongs to a separately approved semver-major change after a real 0.7 compatibility window.

### CLI import boundary

Production modules under `packages/cli/src/**/*.{ts,js}` and clean-built `packages/cli/dist/**/*.{js,mjs,cjs}` may use only the exact specifier `@mindfoldhq/trellis-core/research`. Reject the bare root, compatibility subpaths, Testing, source/deep paths, built internals, suffixes, query strings, and fragments. Tests, fixtures, templates, docs, and package metadata are outside this production scan.

### Product-surface separation

- Channel, Mem, and Task core APIs are compatibility/programmatic surfaces.
- They have no active root Commander commands or Research subtree.
- Historical schema-v1 `taskRef` remains data compatibility metadata only.
- Current CLI Research code imports Research behavior through `@mindfoldhq/trellis-core/research`.
- Compatibility exports and historical data never widen active command registration, init options, platform registries, or package template payload.

### Core behavior

Core APIs:

- return structured values;
- throw typed domain errors where callers need classification;
- own reusable validation, storage, locking, idempotency, reducers, and schemas;
- do not print terminal output, call `process.exit`, parse argv, or depend on Commander, Chalk, or Inquirer.

The CLI owns argument parsing, help/output, prompts, exit behavior, current template installation, migration orchestration, and package auditing.

### Compatibility communication

Status is documentation-only through the 0.7 line. Do not add runtime warnings, npm package-wide deprecation, compatibility wrappers, mass per-symbol `@deprecated` annotations, or identity-changing adapters. Research is active but is not presented as a drop-in replacement for Channel, Mem, or Task. The packed core README must carry the exact entry-point status table and later-major handoff.

### Research security compatibility

The C07 provider-neutral Dispatch context, C09 Claude adapter envelope, schema-v1 tracked Dispatch files, stage capability resolver, and fail-closed worker contracts remain on the Research subpath. Channel/Mem/Task compatibility exports must not become alternate Research mutation or Dispatch-routing authority.

### Build and version lock

Fresh checkouts build core before CLI typecheck:

```bash
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis typecheck
```

Core and CLI publish with the exact same version. Source uses `workspace:*`; the packed CLI must depend on the exact released core version. CI runs `verify-packed-core` before `verify-packed-cli`, the publish plan, and either publish step, then publishes core first.

`verify-packed-core` clean-builds and packs a real core tarball, validates canonical tar paths before extraction, checks exact identity/version/export order/targets, derives required runtime and declaration files from the packed export map, requires the README, rejects source/test/config leakage, imports root plus all five subpaths from an isolated packed consumer, compiles a strict NodeNext TypeScript fixture, proves root non-leakage and empty Testing, and rejects undeclared deep imports.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Import root or one of the five approved subpaths | Resolve declarations and ESM implementation. |
| Import Testing | Resolve an empty runtime/declaration namespace. |
| Deep import a core internal path | Fail with package-path-not-exported behavior. |
| Packed export key/order/condition/target drifts | Packed-core audit fails and names the contract drift. |
| Packed target or README is missing | Packed-core audit fails before consumer proof. |
| Public barrel re-exports an `@internal` declaration removed by `stripInternal` | Strict packed NodeNext consumer compilation fails; remove the public re-export rather than publishing the internal primitive. |
| Tar path is unsafe/noncanonical/duplicate or source/test/config leaks | Reject before extraction. |
| Production CLI imports anything except exact `/research` | Source/clean-build import-boundary test fails with file and specifier. |
| Active CLI registers Channel/Mem/Workflow/Research Task | Contract failure even though related core APIs remain. |
| Core API prints, exits, parses argv, or warns at import time | Contract failure; move presentation to CLI/docs. |
| CLI/core versions differ | Release preflight failure. |
| Packed CLI dependency is a range or `workspace:*` | Packed-artifact failure. |
| C07/C09/schema-v1 compatibility changes incidentally | Security/compatibility regression. |

## 5. Good / Base / Bad Cases

- **Good**: an embedding app imports `@mindfoldhq/trellis-core/channel`, while `trellis channel` fails at Commander parsing and writes nothing.
- **Base**: the Research CLI imports only `/research`; unused compatibility domains remain published without entering the CLI bundle's active command tree.
- **Bad**: deleting `/mem` because the Mem CLI command was removed, or restoring `trellis mem` because `/mem` still exists.

## 6. Tests Required

- Core-owned exact package export-key/order/condition/target snapshot and built-target existence.
- Core-owned root composition/identity, explicit subpath imports, empty Testing, representative values/types, negative deep-import tests, and negative assertions that `appendEvent` is absent from Channel/root runtime barrels.
- Packed-core unit tests for path normalization, duplicates, contract drift, target derivation, missing inventory, and leakage.
- Real clean-built packed-core consumer proof for runtime imports and strict NodeNext declarations.
- CLI-owned source and clean-`dist` static import scan accepting only exact `/research`, with adversarial suffix/query/fragment/deep cases.
- Exact root/Research/Dispatch Commander command-set tests proving compatibility APIs create no commands.
- C07/C09/schema-v1 regression suites unchanged.
- Release preflight proving equal versions, packed-core compatibility, and exact packed CLI dependency.

## 7. Wrong vs Correct

```ts
// Wrong: compatibility API implies active command registration.
program.addCommand(createMemCommand());

// Correct: SDK remains importable without a CLI command.
import { searchMemSessions } from "@mindfoldhq/trellis-core/mem";
```

```ts
// Wrong: CLI deep-imports implementation details.
import { reduceLedger } from "../../core/src/research/internal/reducer.js";

// Correct: CLI uses the public Research subpath.
import { reduceResearchLedger } from "@mindfoldhq/trellis-core/research";
```

```text
Wrong: remove a core subpath because its old command disappeared.
Correct: freeze the 0.7 SDK exports while independently narrowing the active CLI product.
```

```ts
// Wrong: stripInternal removes the declaration but the public barrel still names it.
export { appendEvent } from "./internal/store/events.js";

// Correct: public callers use typed mutations; internal modules import the store primitive directly.
export { sendMessage, createChannel } from "./api/index.js";
```

## Evaluation contract v1.3.1 boundary

The public Research subpath owns the reusable accepted v1.3.1 contract grammar, strict parsers, applicability selection, predicate/schema execution, deterministic findings, closure-family mapping, and report construction/serialization. The production CLI remains the adapter that authenticates installed package bytes, resolves exact Procedure identity, observes Repository and submitted ArtifactRef state, and supplies one fact for every applicable binding.

- Accepted identity is `evaluation-contract-v1.3.1` with semantic digest `sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af`.
- The accepted closure mapping contains exactly `research-literature`, `research-ideation`, `research-idea-evaluation`, and `research-experiment`. Quest framing and computation are explicit non-closure dispositions.
- Core fact state is closed to `present`, `missing`, `unknown`, `contradictory`, `aliased`, and `ambiguous`. Unauthenticated input uses outer `authenticated: false`, schema-valid internal `factState: "unknown"`, and report-level blocked reason `unauthenticated`.
- Every applicable binding produces one invocation. Authentication, closed-schema validation, applicability, and predicate evaluation all remain fail-closed.
- Historical `MethodologyDeterministicReportV2` construction/serialization remains separate from v1.3.1 `MethodologyDeterministicReportV131`. The historical report embeds `reportDigest`; the v1.3.1 report body excludes it and is serialized only with a separately supplied validated digest.
- Production CLI modules continue importing these APIs only through `@mindfoldhq/trellis-core/research`; no deep import or source-tree authority is permitted.

Fresh verification is serial: build Core completely before any CLI typecheck, tests, or build. Core and CLI consumer checks must not run concurrently because CLI resolution consumes the freshly generated Core `dist` API.

Required regression coverage proves exact closure mapping, 29 applicable idea-generation bindings, one invocation per binding on pass and failure, strict v1.3.1 report key closure, external digest framing, serializer rejection of digest/body drift, and unchanged historical v1.3.0 bytes.
