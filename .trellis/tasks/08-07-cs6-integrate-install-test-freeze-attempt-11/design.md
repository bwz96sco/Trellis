# CS6-6 integration/install/freeze design

## Boundary

CS6-6 assembles already accepted outputs and verifies distribution behavior. It cannot repair them.

## Archive/install model

1. Build real tarballs from the exact integrated tree.
2. Inventory and hash tarball members.
3. Create external temporary npm and pnpm consumers.
4. Install only from tarballs.
5. Run installed binaries/tests with source-tree fallback paths unavailable.
6. Record exact argv/cwd/environment/exit/digests.

## Historical proof model

Historical Procedure locks are computed from committed Git blob OIDs before subject extraction and carried as deterministic evidence. Extracted-subject tests compare files to the locks directly; they never require an embedded `.git` directory.

## Freeze model

I11 is the integrated dormant technical identity. S11 is a later freeze identity. The freeze record refers to the already resolved S11 subject identity supplied by the freeze operation; it never embeds a placeholder that expects the same commit to rewrite itself.

## Rollback

Before I11, remove only owned uncommitted integration/evidence. A failed I11 is preserved if committed and requires a new integration identity. A failed or stale S11 requires a new subject; never amend it.
