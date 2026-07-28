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
 *   smoke-installed-cli              Pack Core+CLI (or use test tarball env),
 *                                    install into a temp consumer with
 *                                    --ignore-scripts, exercise trellis/tl,
 *                                    and prove Skill-free host inits.
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
  auditPackedActiveContent,
  auditPackedEntries,
  buildPackedCliInventory,
  PACKED_ACTIVE_RESEARCH_ENTRIES,
  RESEARCH_STAGE_SKILLS,
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

function findSingleTarball(directory) {
  const tarballs = fs
    .readdirSync(directory)
    .filter((entry) => entry.endsWith(".tgz"))
    .sort();
  if (tarballs.length !== 1) {
    throw new Error(
      `pnpm pack produced ${tarballs.length} tarballs in ${directory}; expected exactly one.`,
    );
  }
  return path.join(directory, tarballs[0]);
}

function packPackage(packageDir, destinationDir) {
  execFileSync("pnpm", ["pack", "--pack-destination", destinationDir], {
    cwd: packageDir,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return findSingleTarball(destinationDir);
}

function binPath(consumerDir, name) {
  const base = path.join(consumerDir, "node_modules", ".bin", name);
  if (process.platform === "win32") {
    const cmd = `${base}.cmd`;
    if (fs.existsSync(cmd)) return cmd;
  }
  return base;
}

function assertNoStageSkillDirs(projectRoot) {
  for (const skill of RESEARCH_STAGE_SKILLS) {
    const claudeSkill = path.join(
      projectRoot,
      ".claude",
      "skills",
      skill,
      "SKILL.md",
    );
    const codexSkill = path.join(
      projectRoot,
      ".agents",
      "skills",
      skill,
      "SKILL.md",
    );
    if (fs.existsSync(claudeSkill) || fs.existsSync(codexSkill)) {
      throw new Error(
        `Installed project still contains Research stage Skill path for ${skill}`,
      );
    }
  }
}

/**
 * C10: install real packed Core + CLI tarballs into a temporary consumer and
 * prove both aliases plus fresh Skill-free host inits work without workspace links.
 *
 * Env overrides for tests:
 *   TRELLIS_TEST_PACKED_CORE_TARBALL
 *   TRELLIS_TEST_PACKED_CLI_TARBALL
 */
export function smokeInstalledCli() {
  const v = checkVersions({ requireTag: false });
  const testCore =
    process.env.VITEST === "true"
      ? process.env.TRELLIS_TEST_PACKED_CORE_TARBALL
      : undefined;
  const testCli =
    process.env.VITEST === "true"
      ? process.env.TRELLIS_TEST_PACKED_CLI_TARBALL
      : undefined;

  const tmp = fs.mkdtempSync(path.join(REPO_ROOT, ".pack-smoke-"));
  try {
    let coreTarball = testCore ? path.resolve(testCore) : null;
    let cliTarball = testCli ? path.resolve(testCli) : null;

    if (coreTarball === null || cliTarball === null) {
      console.log(
        `${DIM}clean-building Core and CLI before installed-package smoke...${RESET}`,
      );
      execFileSync("pnpm", ["run", "build"], {
        cwd: CORE_DIR,
        stdio: "inherit",
      });
      execFileSync("pnpm", ["run", "build"], {
        cwd: CLI_DIR,
        stdio: "inherit",
      });
      const packDir = path.join(tmp, "packs");
      fs.mkdirSync(packDir, { recursive: true });
      coreTarball = packPackage(CORE_DIR, path.join(packDir, "core"));
      cliTarball = packPackage(CLI_DIR, path.join(packDir, "cli"));
    }

    const consumerDir = path.join(tmp, "consumer");
    fs.mkdirSync(consumerDir, { recursive: true });
    fs.writeFileSync(
      path.join(consumerDir, "package.json"),
      JSON.stringify({ private: true, name: "trellis-install-smoke" }, null, 2) +
        "\n",
    );

    execFileSync(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--no-package-lock",
        coreTarball,
        cliTarball,
      ],
      { cwd: consumerDir, stdio: ["pipe", "pipe", "pipe"] },
    );

    const resolvedCliPkg = path.join(
      consumerDir,
      "node_modules",
      "@mindfoldhq",
      "trellis",
      "package.json",
    );
    const resolvedCorePkg = path.join(
      consumerDir,
      "node_modules",
      "@mindfoldhq",
      "trellis-core",
      "package.json",
    );
    if (!fs.existsSync(resolvedCliPkg) || !fs.existsSync(resolvedCorePkg)) {
      throw new Error(
        "Installed consumer is missing @mindfoldhq/trellis or @mindfoldhq/trellis-core",
      );
    }
    const installedCli = readJSON(resolvedCliPkg);
    const installedCore = readJSON(resolvedCorePkg);
    if (installedCli.version !== v.cliVersion || installedCore.version !== v.cliVersion) {
      throw new Error(
        `Installed package versions drifted (cli=${installedCli.version}, core=${installedCore.version}, expected=${v.cliVersion})`,
      );
    }
    // Ensure resolution is from installed packages, not workspace links.
    const cliReal = fs.realpathSync(path.dirname(resolvedCliPkg));
    const coreReal = fs.realpathSync(path.dirname(resolvedCorePkg));
    if (cliReal.startsWith(CLI_DIR) || coreReal.startsWith(CORE_DIR)) {
      throw new Error(
        "Installed consumer resolved packages back into the monorepo workspace",
      );
    }

    const trellisBin = binPath(consumerDir, "trellis");
    const tlBin = binPath(consumerDir, "tl");
    if (!fs.existsSync(trellisBin) || !fs.existsSync(tlBin)) {
      throw new Error("Installed consumer is missing trellis/tl binaries");
    }

    const trellisHelp = execFileSync(trellisBin, ["--help"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, TRELLIS_QUIET: "1" },
    });
    const tlHelp = execFileSync(tlBin, ["--help"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, TRELLIS_QUIET: "1" },
    });
    if (!trellisHelp.includes("init") || !tlHelp.includes("init")) {
      throw new Error("Installed aliases did not expose init help");
    }
    if (trellisHelp.replace(/\s+/g, " ") !== tlHelp.replace(/\s+/g, " ")) {
      // Allow minor path/binary name differences only if both still document Research commands.
      for (const help of [trellisHelp, tlHelp]) {
        if (!help.includes("research") || !help.includes("update")) {
          throw new Error("Installed alias help is missing Research commands");
        }
      }
    }

    const projectsRoot = path.join(tmp, "projects");
    fs.mkdirSync(projectsRoot);
    const hostConfigs = [
      { name: "claude", flags: ["--claude"], expectClaude: true, expectCodex: false },
      { name: "codex", flags: ["--codex"], expectClaude: false, expectCodex: true },
      {
        name: "dual",
        flags: ["--claude", "--codex"],
        expectClaude: true,
        expectCodex: true,
      },
    ];

    for (const config of hostConfigs) {
      const projectDir = path.join(projectsRoot, config.name);
      fs.mkdirSync(projectDir);
      execFileSync(trellisBin, ["init", "--yes", ...config.flags], {
        cwd: projectDir,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, TRELLIS_QUIET: "1", VITEST: "true" },
      });
      assertNoStageSkillDirs(projectDir);
      if (config.expectClaude) {
        if (
          !fs.existsSync(
            path.join(projectDir, ".claude", "agents", "trellis-research-worker.md"),
          )
        ) {
          throw new Error(`${config.name}: missing Claude Research worker`);
        }
      }
      if (config.expectCodex) {
        if (
          !fs.existsSync(
            path.join(projectDir, ".codex", "agents", "trellis-research-worker.toml"),
          )
        ) {
          throw new Error(`${config.name}: missing Codex Research worker`);
        }
      }
      if (fs.existsSync(path.join(projectDir, ".trellis", "research"))) {
        throw new Error(`${config.name}: unexpected eager .trellis/research creation`);
      }
    }

    console.log(
      `${GREEN}ok${RESET} installed-package smoke: trellis/tl help identity and Skill-free Claude/Codex/dual inits from packed tarballs.`,
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function verifyPackedCli() {
  const v = checkVersions({ requireTag: false });
  const testArchive =
    process.env.VITEST === "true"
      ? process.env.TRELLIS_TEST_PACKED_CLI_TARBALL
      : undefined;

  let tmp = null;
  let packed = testArchive ? path.resolve(testArchive) : null;
  if (packed === null) {
    console.log(
      `${DIM}clean-building CLI before package verification...${RESET}`,
    );
    execFileSync("pnpm", ["run", "build"], {
      cwd: CLI_DIR,
      stdio: "inherit",
    });

    tmp = fs.mkdtempSync(path.join(REPO_ROOT, ".pack-verify-"));
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
        throw new Error(
          `pnpm pack produced ${tarballs.length} tarballs in ${tmp}; expected exactly one.`,
        );
      }
      packed = path.join(tmp, tarballs[0]);
    } catch (error) {
      fs.rmSync(tmp, { recursive: true, force: true });
      tmp = null;
      fail(error instanceof Error ? error.message : String(error));
    }
  }

  try {
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
    let activeAudit;
    try {
      audit = auditPackedEntries(entries, inventory);
      const activeContents = new Map(
        Object.values(PACKED_ACTIVE_RESEARCH_ENTRIES).map((entry) => [
          entry,
          execFileSync("tar", ["-xOf", packed, entry], {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          }),
        ]),
      );
      activeAudit = auditPackedActiveContent(activeContents);
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
      `${GREEN}ok${RESET} packed CLI active content: ${activeAudit.activeEntryCount} ` +
        `command/worker/hook/workflow files satisfy the successor contract.`,
    );
    console.log(
      `${GREEN}ok${RESET} packed CLI pins @mindfoldhq/trellis-core to exact ${v.cliVersion}.`,
    );
  } finally {
    if (tmp !== null) fs.rmSync(tmp, { recursive: true, force: true });
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
        `  smoke-installed-cli\n` +
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
  if (cmd === "smoke-installed-cli") {
    smokeInstalledCli();
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
