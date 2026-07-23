import path from "node:path";

const RESEARCH_ROOT = ".trellis/research";

function normalizeProjectPath(filePath: string): string {
  return path.posix.normalize(filePath.replace(/\\/g, "/")).replace(/\/+$/, "");
}

/**
 * Whether a project-relative path is the canonical research store or one of
 * its descendants. Matching is segment-aware and resolves dot segments:
 * `.trellis/research-old` is not protected, while
 * `.trellis/tmp/../research/events.jsonl` is.
 */
export function isProtectedResearchPath(filePath: string): boolean {
  const normalized = normalizeProjectPath(filePath);
  return (
    normalized === RESEARCH_ROOT || normalized.startsWith(`${RESEARCH_ROOT}/`)
  );
}

/**
 * Whether a path is protected research or an ancestor that a recursive move or
 * replacement would carry along with it.
 */
export function containsProtectedResearchPath(filePath: string): boolean {
  const normalized = normalizeProjectPath(filePath);
  return (
    isProtectedResearchPath(normalized) ||
    RESEARCH_ROOT.startsWith(`${normalized}/`)
  );
}

/**
 * Validate a manifest key before any filesystem resolution.
 *
 * Manifest keys must be normalized POSIX project-relative file paths. Reject
 * absolute, drive-relative, traversal, NUL, backslash, empty-segment, and dot
 * segment inputs so poisoned ownership metadata can never escape the project.
 */
export function isSafeManifestPath(filePath: string): boolean {
  if (
    filePath.length === 0 ||
    filePath.includes("\0") ||
    filePath.includes("\\")
  ) {
    return false;
  }
  if (
    path.posix.isAbsolute(filePath) ||
    filePath.startsWith("//") ||
    /^[A-Za-z]:/.test(filePath)
  ) {
    return false;
  }

  const segments = filePath.split("/");
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    return false;
  }

  return path.posix.normalize(filePath) === filePath;
}
