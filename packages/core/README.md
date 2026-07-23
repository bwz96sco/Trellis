# @mindfoldhq/trellis-core

`@mindfoldhq/trellis-core` is the Research-first, reusable SDK published with the Trellis CLI. The CLI product is Research-only, while the core package preserves its version-locked 0.7 compatibility entry points for existing SDK consumers.

## Entry points in 0.7

| Entry point | 0.7 status | Contract |
| --- | --- | --- |
| `@mindfoldhq/trellis-core` | Compatibility-only | Existing Channel and Task root exports only. |
| `@mindfoldhq/trellis-core/channel` | Compatibility-only | Existing Channel values, types, signatures, identities, and behavior. |
| `@mindfoldhq/trellis-core/mem` | Compatibility-only | Existing persisted-session readers, values, types, and behavior, including historical host readers. |
| `@mindfoldhq/trellis-core/research` | Active | Canonical Research SDK and the sole core entry point used by the production Trellis CLI. |
| `@mindfoldhq/trellis-core/task` | Compatibility-only | Existing Task values, types, signatures, identities, and behavior. |
| `@mindfoldhq/trellis-core/testing` | Reserved | Importable, empty runtime and declaration namespace. |
| `@mindfoldhq/trellis-core/package.json` | Metadata | Package metadata export. |

The package exposes only these explicit paths. Internal `dist/**` and source paths are not public imports.

## Product and SDK boundary

Publishing a compatibility API does not register a CLI command, install a template, create an agent or skill, or grant runtime routing authority. In particular, the Channel, Mem, and Task entry points do not restore the retired `trellis channel`, `trellis mem`, `trellis workflow`, or `trellis research task` product surfaces.

Research is active, but it is not a drop-in replacement for Channel, Mem, or Task. Each domain keeps its existing contract during the compatibility window.

## Compatibility window

The root, Channel, Mem, and Task APIs remain compatibility-only for the complete 0.7 line. Testing remains reserved and empty. Their removal or redesign belongs to a separately planned semver-major release after a real 0.7 compatibility window; it is not part of the Research-only CLI transition.

Compatibility status is communicated by documentation only. Importing this package produces no deprecation warning, wrapper, altered function identity, terminal output, or process side effect.

## Package lockstep

`@mindfoldhq/trellis-core` and `@mindfoldhq/trellis` publish with the exact same version. Workspace source uses `workspace:*`; the packed CLI pins the matching released core version exactly.
