# CS6-5 production mutation/coverage harness design

## Boundary

The harness is an observer and adversarial input generator. It invokes the same production adapters used by real recording and never substitutes a parallel semantic implementation.

## Case model

Each row contains stable case ID, contract/package identity, target domain, exact source path/JSON pointer, mutation operation, production command/API entry point, expected stable result, actual result, and measured filesystem state.

## Coverage model

Independent registries enumerate packages, artifacts, lifecycle dimensions, validators, and bindings. Aggregate assertions join executed rows to these registries and fail on missing, duplicate, unknown, or inapplicable coverage.

## Mutation model

Fixtures are copied into isolated temporary repositories, mutated there, and then consumed by production code. The harness records both logical content digests and OS-native filesystem paths without mixing the two representations.

## Rollback

Remove only uncommitted harness/test/evidence changes. Runtime/package defects are returned to their owner rather than patched in the harness.
