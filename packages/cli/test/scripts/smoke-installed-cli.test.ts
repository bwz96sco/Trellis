import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const CLI_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CORE_DIR = path.resolve(CLI_DIR, "../core");
const RELEASE_PREFLIGHT = path.join(CLI_DIR, "scripts/release-preflight.js");

function packPackage(packageDir: string, destinationDir: string): string {
  fs.mkdirSync(destinationDir, { recursive: true });
  execFileSync("pnpm", ["pack", "--pack-destination", destinationDir], {
    cwd: packageDir,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const tarballs = fs
    .readdirSync(destinationDir)
    .filter((entry) => entry.endsWith(".tgz"))
    .sort();
  expect(tarballs).toHaveLength(1);
  return path.join(destinationDir, tarballs[0]);
}

describe("C10 smoke-installed-cli", () => {
  it(
    "installs packed Core+CLI outside the workspace and proves Skill-free inits",
    () => {
      // Build once for real tarballs (shared with release gate).
      execFileSync("pnpm", ["run", "build"], {
        cwd: CORE_DIR,
        stdio: "inherit",
      });
      execFileSync("pnpm", ["run", "build"], {
        cwd: CLI_DIR,
        stdio: "inherit",
      });

      const packRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-c10-pack-"));
      try {
        const coreTarball = packPackage(CORE_DIR, path.join(packRoot, "core"));
        const cliTarball = packPackage(CLI_DIR, path.join(packRoot, "cli"));

        const output = execFileSync(
          process.execPath,
          [RELEASE_PREFLIGHT, "smoke-installed-cli"],
          {
            encoding: "utf-8",
            env: {
              ...process.env,
              VITEST: "true",
              TRELLIS_TEST_PACKED_CORE_TARBALL: coreTarball,
              TRELLIS_TEST_PACKED_CLI_TARBALL: cliTarball,
            },
            stdio: ["pipe", "pipe", "pipe"],
          },
        );
        expect(output).toContain("installed-package smoke");
        expect(output).toContain("Skill-free");
      } finally {
        fs.rmSync(packRoot, { recursive: true, force: true });
      }
    },
    300_000,
  );
});
