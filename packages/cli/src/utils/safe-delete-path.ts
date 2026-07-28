/**
 * Path safety helpers for hash-gated file deletion.
 *
 * Rejects symlink components in the relative path, including ancestors, so a
 * project-relative path cannot redirect unlinks outside the project tree.
 */

import fs from "node:fs";
import path from "node:path";

import { isSafeManifestPath } from "./protected-paths.js";

export type SafeRegularFileResolution =
  | {
      ok: true;
      absPath: string;
      /** Final component lstat; guaranteed regular non-symlink file. */
      stat: fs.Stats;
    }
  | { ok: false; reason: string };

/**
 * Resolve a project-relative POSIX path to a regular non-symlink file, rejecting
 * any symlink among path components (including intermediate directories).
 */
export function resolveSafeRegularFile(
  cwd: string,
  relativePath: string,
): SafeRegularFileResolution {
  if (!isSafeManifestPath(relativePath)) {
    return { ok: false, reason: "unsafe-path" };
  }

  const absCwd = path.resolve(cwd);
  let current = absCwd;
  const segments = relativePath.split("/");

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    if (segment === undefined) {
      return { ok: false, reason: "empty-path" };
    }
    current = path.join(current, segment);

    let st: fs.Stats;
    try {
      st = fs.lstatSync(current);
    } catch {
      return { ok: false, reason: "missing" };
    }

    if (st.isSymbolicLink()) {
      return { ok: false, reason: "symlink-component" };
    }

    const isLast = index === segments.length - 1;
    if (!isLast) {
      if (!st.isDirectory()) {
        return { ok: false, reason: "not-directory" };
      }
      continue;
    }

    if (!st.isFile()) {
      return { ok: false, reason: "not-regular-file" };
    }

    // Ensure resolved path still lives under cwd (no unexpected absolute escapes).
    const relativeToCwd = path.relative(absCwd, current);
    if (
      relativeToCwd.startsWith("..") ||
      path.isAbsolute(relativeToCwd) ||
      relativeToCwd.split(path.sep).includes("..")
    ) {
      return { ok: false, reason: "outside-cwd" };
    }

    return { ok: true, absPath: current, stat: st };
  }

  return { ok: false, reason: "empty-path" };
}

export interface ValidatedDeleteTarget {
  absPath: string;
  bytes: Buffer;
  dev: number;
  ino: number;
  size: number;
}

/**
 * Open a resolved regular file without following a final symlink, read exact
 * bytes, and capture identity for a last-moment replace check before unlink.
 */
export function readValidatedDeleteTarget(
  absPath: string,
  expectedStat: fs.Stats,
): ValidatedDeleteTarget | null {
  const openFlags =
    fs.constants.O_RDONLY |
    (typeof fs.constants.O_NOFOLLOW === "number" ? fs.constants.O_NOFOLLOW : 0);

  let fd: number | undefined;
  try {
    fd = fs.openSync(absPath, openFlags);
    const st = fs.fstatSync(fd);
    if (!st.isFile()) return null;
    if (st.dev !== expectedStat.dev || st.ino !== expectedStat.ino) {
      return null;
    }
    if (st.size > 32 * 1024 * 1024) {
      // Research SKILL.md files are tiny; refuse oversized paths as unsafe.
      return null;
    }
    const bytes = Buffer.alloc(st.size);
    let offset = 0;
    while (offset < st.size) {
      const n = fs.readSync(fd, bytes, offset, st.size - offset, offset);
      if (n <= 0) break;
      offset += n;
    }
    if (offset !== st.size) return null;
    return {
      absPath,
      bytes,
      dev: st.dev,
      ino: st.ino,
      size: st.size,
    };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Confirm the path still names the same inode before unlink. Returns false if
 * the path was replaced or is no longer a regular non-symlink file.
 */
export function pathStillMatchesIdentity(
  absPath: string,
  identity: { dev: number; ino: number; size: number },
): boolean {
  try {
    const st = fs.lstatSync(absPath);
    if (st.isSymbolicLink() || !st.isFile()) return false;
    return (
      st.dev === identity.dev &&
      st.ino === identity.ino &&
      st.size === identity.size
    );
  } catch {
    return false;
  }
}
