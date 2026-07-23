#!/usr/bin/env node
/**
 * Shared release / publish preflight.
 *
 * One source of truth for:
 *   1. Version match between `@mindfoldhq/trellis` and
 *      `@mindfoldhq/trellis-core` (and the current git tag when checked from
 *      a tag context).
 *   2. The npm dist-tag derived from the shared version (`beta`, `rc`,
 *      `alpha`, or `latest`).
 *   3. An idempotent publish plan that checks npm for each package + version
 *      and reports whether a fresh publish is needed.
 *
 * Used by both `packages/cli` release scripts (humans) and
 * `.github/workflows/publish.yml` (CI) so the rules cannot drift.
 *
 * Commands:
 *   check-versions [--require-tag]   Verify core/cli (and optional GITHUB_REF
 *                                    tag) all agree on the exact version.
 *   npm-tag                          Print the computed npm dist-tag.
 *   publish-plan [--json|--github]   Decide which packages still need a
 *                                    publish. Idempotent: if a package
 *                                    version already exists on npm it is
 *                                    skipped (but version mismatches still
 *                                    fail loudly).
 *   verify-packed-core               Clean-build and pack the core SDK, audit
 *                                    its frozen 0.7 exports and tar entries,
 *                                    import every public entry point, compile
 *                                    declarations, and block deep imports.
 *   verify-packed-cli                Clean-build and pack the CLI, assert its
 *                                    Research-only tarball inventory, and
 *                                    verify @mindfoldhq/trellis-core resolves
 *                                    to the exact shared version (not
 *                                    "workspace:*" or a loose range).
 *   verify-npm [--package all|core|cli]
 *                                    Verify the published package version and
 *                                    dist-tag are visible on the public npm
 *                                    registry. Used after CI publish so a
 *                                    registry visibility problem fails the
 *                                    release pipeline instead of being fixed
 *                                    by a local publish.
 *
 * Idempotency rule: a CI rerun on the same tag must not republish an
 * already-published version, but must also never silently paper over a
 * version/tag mismatch. Version equality is checked first; npm existence
 * decides per-package skip.
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditPackedEntries,
  buildPackedCliInventory,
  parseTarListing,
} from "./packed-cli-audit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const CLI_DIR = path.join(REPO_ROOT, "packages/cli");
const CORE_DIR = path.join(REPO_ROOT, "packages/core");
const CORE_PKG = path.join(CORE_DIR, "package.json");
const CORE_VERIFY_SCRIPT = path.join(CORE_DIR, "scripts/verify-packed-core.js");
const CLI_PKG = path.join(CLI_DIR, "package.json");
const MIGRATION_MANIFEST_DIR = path.join(CLI_DIR, "src/migrations/manifests");

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function readVersions() {
  const core = readJSON(CORE_PKG);
  const cli = readJSON(CLI_PKG);
  return {
    coreName: core.name,
    coreVersion: core.version,
    cliName: cli.name,
    cliVersion: cli.version,
  };
}

function tagVersionFromEnv() {
  // GITHUB_REF for `push: tags: v*` looks like `refs/tags/v0.6.0-beta.12`.
  // GITHUB_REF_NAME on `release.published` is the tag name.
  const ref = process.env.GITHUB_REF_NAME || process.env.GITHUB_REF || "";
  const m = ref.match(
    /(?:refs\/tags\/)?v(\d+\.\d+\.\d+(?:-[A-Za-z0-9.+-]+)?)$/,
  );
  return m ? m[1] : null;
}

export function computeNpmTag(version) {
  if (/-beta\./.test(version)) return "beta";
  if (/-rc\./.test(version)) return "rc";
  if (/-alpha\./.test(version)) return "alpha";
  return "latest";
}

export function npmVersionExists(pkgName, version) {
  try {
    const out = execSync(
      `npm view ${pkgName}@${version} version --json --registry=https://registry.npmjs.org/`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], timeout: 15_000 },
    ).trim();
    if (!out) return false;
    // npm returns the literal version string for an exact-version match,
    // and an empty body for unknown versions.
    return JSON.parse(out) === version;
  } catch (err) {
    const stderr = err.stderr?.toString() ?? "";
    if (stderr.includes("E404") || stderr.includes("not found")) return false;
    // Any other npm failure (network, auth) should surface; don't pretend
    // the version doesn't exist, because that would trigger a republish.
    throw err;
  }
}

function npmViewJSON(args) {
  const out = execSync(
    `npm view ${args} --json --registry=https://registry.npmjs.org/`,
    { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], timeout: 15_000 },
  ).trim();
  return out ? JSON.parse(out) : null;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(label, fn) {
  const attempts = 6;
  let lastError;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return fn();
    } catch (err) {
      lastError = err;
      if (i === attempts) break;
      console.error(
        `${YELLOW}! ${label} not visible yet; retrying (${i}/${attempts})${RESET}`,
      );
      await sleep(10_000);
    }
  }
  throw lastError;
}

function fail(msg) {
  console.error(`${RED}x ${msg}${RESET}`);
  process.exit(1);
}

function checkVersions({ requireTag, quiet = false }) {
  const v = readVersions();
  if (v.coreVersion !== v.cliVersion) {
    fail(
      `Version mismatch:\n` +
        `  ${v.coreName}: ${v.coreVersion}\n` +
        `  ${v.cliName}:  ${v.cliVersion}\n` +
        `Both packages must share the exact same version. Re-run the release\n` +
        `bump script so they move together.`,
    );
  }
  const tagVersion = tagVersionFromEnv();
  if (requireTag) {
    if (!tagVersion) {
      fail(
        `Expected a git tag like v${v.cliVersion} via GITHUB_REF / GITHUB_REF_NAME but found "${
          process.env.GITHUB_REF_NAME || process.env.GITHUB_REF || ""
        }".`,
      );
    }
    if (tagVersion !== v.cliVersion) {
      fail(
        `Git tag version (${tagVersion}) does not match package version (${v.cliVersion}).\n` +
          `Refusing to publish: the tag, core package, and CLI package must agree.`,
      );
    }
  } else if (tagVersion && tagVersion !== v.cliVersion) {
    fail(
      `Git tag version (${tagVersion}) does not match package version (${v.cliVersion}).`,
    );
  }
  if (!quiet) {
    console.log(
      `${GREEN}ok${RESET} versions match: ${v.coreName}@${v.coreVersion} = ${v.cliName}@${v.cliVersion}` +
        (tagVersion ? ` = git tag v${tagVersion}` : ""),
    );
  }
  return { ...v, tagVersion };
}

function publishPlan({ output }) {
  const v = checkVersions({ requireTag: false, quiet: output === "json" });
  const tag = computeNpmTag(v.cliVersion);
  const coreExists = npmVersionExists(v.coreName, v.coreVersion);
  const cliExists = npmVersionExists(v.cliName, v.cliVersion);
  const plan = {
    version: v.cliVersion,
    tag,
    core: { name: v.coreName, publish: !coreExists, alreadyOnNpm: coreExists },
    cli: { name: v.cliName, publish: !cliExists, alreadyOnNpm: cliExists },
  };
  if (output === "json") {
    process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
    return plan;
  }
  if (output === "github") {
    const gh = process.env.GITHUB_OUTPUT;
    if (!gh) fail(`--github requested but GITHUB_OUTPUT is not set.`);
    fs.appendFileSync(
      gh,
      [
        `version=${plan.version}`,
        `tag=${plan.tag}`,
        `core_publish=${plan.core.publish}`,
        `cli_publish=${plan.cli.publish}`,
        `core_already_on_npm=${plan.core.alreadyOnNpm}`,
        `cli_already_on_npm=${plan.cli.alreadyOnNpm}`,
      ].join("\n") + "\n",
    );
  }
  const status = (pkg) =>
    pkg.publish
      ? `${GREEN}publish${RESET}`
      : `${YELLOW}skip (already on npm)${RESET}`;
  console.log(
    `${DIM}plan for v${plan.version} -> npm tag "${plan.tag}":${RESET}\n` +
      `  ${plan.core.name}@${plan.version}: ${status(plan.core)}\n` +
      `  ${plan.cli.name}@${plan.version}:  ${status(plan.cli)}`,
  );
  return plan;
}

function verifyPackedCore() {
  checkVersions({ requireTag: false });
  execFileSync(process.execPath, [CORE_VERIFY_SCRIPT], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
}

function verifyPackedCli() {
  const v = checkVersions({ requireTag: false });

  console.log(
    `${DIM}clean-building CLI before package verification...${RESET}`,
  );
  execFileSync("pnpm", ["run", "build"], {
    cwd: CLI_DIR,
    stdio: "inherit",
  });

  const tmp = fs.mkdtempSync(path.join(REPO_ROOT, ".pack-verify-"));
  try {
    execFileSync("pnpm", ["pack", "--pack-destination", tmp], {
      cwd: CLI_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const tarballs = fs
      .readdirSync(tmp)
      .filter((entry) => entry.endsWith(".tgz"))
      .sort();
    if (tarballs.length !== 1) {
      fail(
        `pnpm pack produced ${tarballs.length} tarballs in ${tmp}; expected exactly one.`,
      );
    }
    const packed = path.join(tmp, tarballs[0]);
    const tarListing = execFileSync("tar", ["-tzf", packed], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const entries = parseTarListing(tarListing);
    const migrationManifestNames = fs
      .readdirSync(MIGRATION_MANIFEST_DIR)
      .filter((entry) => entry.endsWith(".json"))
      .sort();
    const inventory = buildPackedCliInventory(migrationManifestNames);

    let audit;
    try {
      audit = auditPackedEntries(entries, inventory);
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }

    const packedPackageJson = execFileSync(
      "tar",
      ["-xOf", packed, "package/package.json"],
      {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const packedPkg = JSON.parse(packedPackageJson);
    const dep = packedPkg.dependencies?.["@mindfoldhq/trellis-core"];
    if (!dep) {
      fail(`packed CLI is missing dependency on @mindfoldhq/trellis-core.`);
    }
    if (dep !== v.cliVersion) {
      fail(
        `packed CLI depends on @mindfoldhq/trellis-core@"${dep}" but expected exact "${v.cliVersion}".\n` +
          `pnpm should rewrite workspace:* to the exact published version; got "${dep}" instead.`,
      );
    }
    console.log(
      `${GREEN}ok${RESET} packed CLI inventory: ${audit.entryCount} entries; ` +
        `${audit.requiredEntryCount} required Research/compatibility entries present; ` +
        `no forbidden generic entries.`,
    );
    console.log(
      `${GREEN}ok${RESET} packed CLI pins @mindfoldhq/trellis-core to exact ${v.cliVersion}.`,
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function verifyNpm({ packageFilter }) {
  const v = checkVersions({ requireTag: false });
  const tag = computeNpmTag(v.cliVersion);
  const packages = [
    { key: "core", name: v.coreName },
    { key: "cli", name: v.cliName },
  ].filter((pkg) => packageFilter === "all" || pkg.key === packageFilter);

  for (const pkg of packages) {
    await retry(`${pkg.name}@${v.cliVersion}`, () => {
      const version = npmViewJSON(`${pkg.name}@${v.cliVersion} version`);
      if (version !== v.cliVersion) {
        fail(
          `${pkg.name}@${v.cliVersion} is not visible on the public npm registry.`,
        );
      }
      const taggedVersion = npmViewJSON(`${pkg.name}@${tag} version`);
      if (taggedVersion !== v.cliVersion) {
        fail(
          `${pkg.name}@${tag} resolves to ${taggedVersion ?? "nothing"}, expected ${v.cliVersion}.`,
        );
      }
      console.log(
        `${GREEN}ok${RESET} ${pkg.name}@${v.cliVersion} visible on npm tag "${tag}".`,
      );
    });
  }
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.log(
      `release-preflight <command>\n\n` +
        `commands:\n` +
        `  check-versions [--require-tag]\n` +
        `  npm-tag\n` +
        `  publish-plan [--json|--github]\n` +
        `  verify-packed-core\n` +
        `  verify-packed-cli\n` +
        `  verify-npm [--package all|core|cli]\n`,
    );
    return;
  }
  if (cmd === "check-versions") {
    checkVersions({ requireTag: rest.includes("--require-tag") });
    return;
  }
  if (cmd === "npm-tag") {
    const v = readVersions();
    process.stdout.write(computeNpmTag(v.cliVersion) + "\n");
    return;
  }
  if (cmd === "publish-plan") {
    const output = rest.includes("--json")
      ? "json"
      : rest.includes("--github")
        ? "github"
        : "text";
    publishPlan({ output });
    return;
  }
  if (cmd === "verify-packed-core") {
    verifyPackedCore();
    return;
  }
  if (cmd === "verify-packed-cli") {
    verifyPackedCli();
    return;
  }
  if (cmd === "verify-npm") {
    const packageIndex = rest.indexOf("--package");
    const packageArg = packageIndex >= 0 ? rest[packageIndex + 1] : "all";
    if (!["all", "core", "cli"].includes(packageArg)) {
      fail(`--package must be one of: all, core, cli`);
    }
    await verifyNpm({ packageFilter: packageArg });
    return;
  }
  fail(`unknown command: ${cmd}`);
}

main();
