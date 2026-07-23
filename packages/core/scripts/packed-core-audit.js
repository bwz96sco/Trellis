const PACKED_ROOT = "package/";
const PACKAGE_NAME = "@mindfoldhq/trellis-core";

export const CORE_EXPORT_CONTRACT = Object.freeze({
  "./package.json": "./package.json",
  ".": Object.freeze({
    types: "./dist/index.d.ts",
    import: "./dist/index.js",
    default: "./dist/index.js",
  }),
  "./channel": Object.freeze({
    types: "./dist/channel/index.d.ts",
    import: "./dist/channel/index.js",
    default: "./dist/channel/index.js",
  }),
  "./mem": Object.freeze({
    types: "./dist/mem/index.d.ts",
    import: "./dist/mem/index.js",
    default: "./dist/mem/index.js",
  }),
  "./research": Object.freeze({
    types: "./dist/research/index.d.ts",
    import: "./dist/research/index.js",
    default: "./dist/research/index.js",
  }),
  "./task": Object.freeze({
    types: "./dist/task/index.d.ts",
    import: "./dist/task/index.js",
    default: "./dist/task/index.js",
  }),
  "./testing": Object.freeze({
    types: "./dist/testing/index.d.ts",
    import: "./dist/testing/index.js",
    default: "./dist/testing/index.js",
  }),
});

const FORBIDDEN_EXACT_ENTRIES = [
  "package/.gitignore",
  "package/.npmignore",
  "package/.npmrc",
  "package/.pnpmfile.cjs",
  "package/.yarnrc",
  "package/.yarnrc.yml",
  "package/npm-shrinkwrap.json",
  "package/package-lock.json",
  "package/pnpm-lock.yaml",
  "package/pnpm-workspace.yaml",
  "package/yarn.lock",
];

const FORBIDDEN_PREFIXES = [
  "package/.github/",
  "package/.trellis/",
  "package/coverage/",
  "package/scripts/",
  "package/src/",
  "package/test/",
  "package/tests/",
];

function fail(message) {
  throw new Error(message);
}

export function normalizeTarEntry(rawEntry) {
  if (rawEntry === "") return "";

  const unsafe = () => {
    fail(`Unsafe packed core tar entry: ${JSON.stringify(rawEntry)}`);
  };
  if (
    rawEntry !== rawEntry.trim() ||
    /[\0-\x1f\x7f]/.test(rawEntry) ||
    rawEntry.includes("\\") ||
    rawEntry.startsWith("/") ||
    /^[A-Za-z]:/.test(rawEntry)
  ) {
    unsafe();
  }

  const entry = rawEntry.endsWith("/") ? rawEntry.slice(0, -1) : rawEntry;
  const segments = entry.split("/");
  if (
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        /^[A-Za-z]:/.test(segment),
    ) ||
    segments[0] !== "package"
  ) {
    unsafe();
  }
  return entry;
}

function splitTarLines(output) {
  const lines = output.split("\n");
  const nonEmptyLines = lines.filter((line) => line !== "");
  const usesCrLf =
    nonEmptyLines.length > 0 && nonEmptyLines.every((line) => line.endsWith("\r"));
  return lines.map((line) =>
    usesCrLf && line.endsWith("\r") ? line.slice(0, -1) : line,
  );
}

export function parseTarListing(output) {
  return splitTarLines(output).map(normalizeTarEntry).filter(Boolean);
}

export function validateTarEntryTypes(output, expectedEntryCount) {
  const lines = splitTarLines(output).filter(Boolean);
  if (lines.length !== expectedEntryCount) {
    fail(
      `Packed core tar metadata listed ${lines.length} entries; expected ${expectedEntryCount}.`,
    );
  }
  for (const line of lines) {
    const type = line[0];
    if (type !== "-" && type !== "d") {
      fail(
        `Packed core tarball contains unsupported entry type ${JSON.stringify(type)}; only regular files and directories are allowed.`,
      );
    }
  }
}

export function validatePackedCorePackage(packageJson, expectedVersion) {
  if (packageJson?.name !== PACKAGE_NAME) {
    fail(
      `Packed core package name is ${JSON.stringify(packageJson?.name)}; expected ${JSON.stringify(PACKAGE_NAME)}.`,
    );
  }
  if (packageJson.version !== expectedVersion) {
    fail(
      `Packed core version is ${JSON.stringify(packageJson.version)}; expected ${JSON.stringify(expectedVersion)}.`,
    );
  }

  const actualExports = packageJson.exports;
  if (!actualExports || typeof actualExports !== "object" || Array.isArray(actualExports)) {
    fail("Packed core package.json must contain an explicit exports object.");
  }

  const expectedKeys = Object.keys(CORE_EXPORT_CONTRACT);
  const actualKeys = Object.keys(actualExports);
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    fail(
      "Packed core export keys do not match the frozen 0.7 contract.\n" +
        `  expected: ${JSON.stringify(expectedKeys)}\n` +
        `  received: ${JSON.stringify(actualKeys)}`,
    );
  }

  for (const exportKey of expectedKeys) {
    const expectedTarget = CORE_EXPORT_CONTRACT[exportKey];
    const actualTarget = actualExports[exportKey];
    if (JSON.stringify(actualTarget) !== JSON.stringify(expectedTarget)) {
      fail(
        `Packed core export ${JSON.stringify(exportKey)} does not match the frozen 0.7 target.\n` +
          `  expected: ${JSON.stringify(expectedTarget)}\n` +
          `  received: ${JSON.stringify(actualTarget)}`,
      );
    }
  }

  return packageJson;
}

function packedTarget(target) {
  if (
    typeof target !== "string" ||
    !target.startsWith("./") ||
    target.length <= 2
  ) {
    fail(`Packed core export target must be a non-empty relative path: ${JSON.stringify(target)}`);
  }
  return normalizeTarEntry(`${PACKED_ROOT}${target.slice(2)}`);
}

export function buildPackedCoreInventory(packageJson) {
  const requiredEntries = new Set([
    "package/package.json",
    "package/README.md",
  ]);

  for (const target of Object.values(packageJson.exports)) {
    if (typeof target === "string") {
      requiredEntries.add(packedTarget(target));
      continue;
    }
    if (!target || typeof target !== "object" || Array.isArray(target)) {
      fail(`Packed core export target must be a string or conditions object.`);
    }
    for (const conditionalTarget of Object.values(target)) {
      requiredEntries.add(packedTarget(conditionalTarget));
    }
  }

  return {
    requiredEntries: [...requiredEntries].sort(),
    forbiddenExactEntries: [...FORBIDDEN_EXACT_ENTRIES],
    forbiddenPrefixes: [...FORBIDDEN_PREFIXES],
  };
}

function isStandardPackageLeakage(entry) {
  const segments = entry.split("/");
  const basename = segments.at(-1) ?? "";
  const pathSegments = segments.slice(1, -1);
  const atPackageRoot = segments.length === 2;
  return (
    (atPackageRoot && basename.startsWith(".")) ||
    (atPackageRoot && /\.config\.[cm]?[jt]s$/.test(basename)) ||
    pathSegments.some((segment) =>
      ["__tests__", "coverage", "src", "test", "tests"].includes(segment),
    ) ||
    /^(?:eslint|jest|prettier|rollup|vite|vitest)\.config\.(?:[cm]?[jt]s)$/.test(
      basename,
    ) ||
    /^tsconfig(?:\.[^.]+)*\.json$/.test(basename) ||
    /^\.(?:eslintignore|eslintrc(?:\..+)?|prettierignore|prettierrc(?:\..+)?)$/.test(
      basename,
    ) ||
    /\.(?:spec|test)\.(?:d\.)?[cm]?[jt]sx?(?:\.map)?$/.test(basename) ||
    (/\.[cm]?tsx?$/.test(basename) && !/\.d\.[cm]?ts$/.test(basename))
  );
}

export function auditPackedCoreEntrySafety(entries) {
  return auditPackedCoreEntries(entries, {
    requiredEntries: [],
    forbiddenExactEntries: FORBIDDEN_EXACT_ENTRIES,
    forbiddenPrefixes: FORBIDDEN_PREFIXES,
  });
}

export function auditPackedCoreEntries(entries, inventory) {
  const normalizedEntries = entries.map(normalizeTarEntry).filter(Boolean);
  const counts = new Map();
  for (const entry of normalizedEntries) {
    counts.set(entry, (counts.get(entry) ?? 0) + 1);
  }
  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([entry]) => entry)
    .sort();
  if (duplicates.length > 0) {
    fail(
      `Packed core tarball contains duplicate entries:\n${duplicates
        .map((entry) => `  - ${entry}`)
        .join("\n")}`,
    );
  }

  const entrySet = new Set(normalizedEntries);
  const missingEntries = inventory.requiredEntries
    .map(normalizeTarEntry)
    .filter((entry) => !entrySet.has(entry))
    .sort();
  const forbiddenExact = new Set(
    inventory.forbiddenExactEntries.map(normalizeTarEntry),
  );
  const forbiddenPrefixes = inventory.forbiddenPrefixes.map((prefix) =>
    normalizeTarEntry(prefix),
  );
  const forbiddenEntries = normalizedEntries
    .filter(
      (entry) =>
        forbiddenExact.has(entry) ||
        forbiddenPrefixes.some(
          (prefix) => entry === prefix || entry.startsWith(`${prefix}/`),
        ) ||
        isStandardPackageLeakage(entry),
    )
    .sort();

  const sections = [];
  if (missingEntries.length > 0) {
    sections.push(
      `Packed core is missing required entries:\n${missingEntries
        .map((entry) => `  - ${entry}`)
        .join("\n")}`,
    );
  }
  if (forbiddenEntries.length > 0) {
    sections.push(
      `Packed core contains forbidden source/test/config entries:\n${forbiddenEntries
        .map((entry) => `  - ${entry}`)
        .join("\n")}`,
    );
  }
  if (sections.length > 0) fail(sections.join("\n"));

  return {
    entryCount: normalizedEntries.length,
    requiredEntryCount: inventory.requiredEntries.length,
  };
}
