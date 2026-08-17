import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const auditScripts = [
  "packages/cli/scripts/research-v131-installed-package-audit.mjs",
  "packages/cli/scripts/research-v131-installed-package-audit-successor.mjs",
] as const;
const retainedAudits = [
  ".trellis/tasks/08-12-integrate-install-and-freeze-v1-3-1-subject/research/protected-path-audit.json",
  ".trellis/tasks/08-15-integrate-install-and-freeze-v1-3-1-subject-successor/research/protected-path-audit.json",
] as const;
const untrackedCs5Decision =
  ".trellis/tasks/08-06-cs5-decide-complete-system-attempt-10/research/cs5-8-honest-stop-record.json";

function run(command: string, args: readonly string[], cwd: string): string {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function sha256(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

describe("T5 historical verification archive isolation", () => {
  it(
    "verifies I1 and I2 from committed Git objects without protected worktree or CS5 source",
    () => {
      const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v131-archive-"));
      const archiveRoot = path.join(sandbox, "archive");
      try {
        run("git", ["clone", "--no-local", "--quiet", repoRoot, archiveRoot], sandbox);

        for (const relativePath of auditScripts) {
          const target = path.join(archiveRoot, relativePath);
          fs.copyFileSync(path.join(repoRoot, relativePath), target);
        }
        if (run("git", ["status", "--porcelain", "--", ...auditScripts], archiveRoot) !== "") {
          run("git", ["add", "--", ...auditScripts], archiveRoot);
          run(
            "git",
            [
              "-c",
              "user.name=Trellis Test",
              "-c",
              "user.email=trellis-test@example.invalid",
              "commit",
              "--quiet",
              "-m",
              "test: commit historical verifier repair",
            ],
            archiveRoot,
          );
        }

        const worktreeList = run("git", ["worktree", "list", "--porcelain"], archiveRoot);
        expect(worktreeList.match(/^worktree /gm)).toHaveLength(1);
        expect(worktreeList).not.toContain("refs/heads/evidence/v13-baseline");
        expect(fs.existsSync(path.join(archiveRoot, untrackedCs5Decision))).toBe(false);

        const before = retainedAudits.map((relativePath) =>
          sha256(path.join(archiveRoot, relativePath)),
        );

        const legacyOutput = run(
          process.execPath,
          [auditScripts[0], "--verify"],
          archiveRoot,
        );
        const successorOutput = run(
          process.execPath,
          [auditScripts[1], "--verify"],
          archiveRoot,
        );

        expect(legacyOutput).toContain("T5 installed-package audit verify passed");
        expect(successorOutput).toContain(
          "T5 successor installed-package audit verify passed",
        );
        expect(
          retainedAudits.map((relativePath) =>
            sha256(path.join(archiveRoot, relativePath)),
          ),
        ).toEqual(before);
        expect(run("git", ["status", "--porcelain"], archiveRoot)).toBe("");
      } finally {
        fs.rmSync(sandbox, { recursive: true, force: true });
      }
    },
    1_200_000,
  );
});
