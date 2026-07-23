import { describe, expect, it } from "vitest";

import {
  auditPackedCoreEntries,
  auditPackedCoreEntrySafety,
  buildPackedCoreInventory,
  CORE_EXPORT_CONTRACT,
  normalizeTarEntry,
  parseTarListing,
  validatePackedCorePackage,
  validateTarEntryTypes,
} from "../../scripts/packed-core-audit.js";

const validPackageJson = {
  name: "@mindfoldhq/trellis-core",
  version: "0.6.7",
  exports: CORE_EXPORT_CONTRACT,
};

describe("packed core audit", () => {
  it("normalizes canonical package entries and directory markers", () => {
    expect(normalizeTarEntry("package/dist/research/")).toBe(
      "package/dist/research",
    );
    expect(
      parseTarListing("package/dist/index.js\r\npackage/package.json\r\n"),
    ).toEqual(["package/dist/index.js", "package/package.json"]);
  });

  it("rejects control characters that are not a consistent line ending", () => {
    expect(() =>
      parseTarListing("package/package.json\r\npackage/README.md\r\n"),
    ).not.toThrow();
    expect(() =>
      parseTarListing("package/package.json\r\npackage/README.md\n"),
    ).toThrow('Unsafe packed core tar entry: "package/package.json\\r"');
  });

  it("allows only regular files and directories in tar metadata", () => {
    const regular =
      "-rw-r--r--  0 0  0  10 Jan 1 2026 package/package.json\n" +
      "drwxr-xr-x  0 0  0   0 Jan 1 2026 package/dist\n";
    expect(() => validateTarEntryTypes(regular, 2)).not.toThrow();
    expect(() =>
      validateTarEntryTypes(
        "lrwxr-xr-x  0 0  0  0 Jan 1 2026 package/dist-link -> ../../outside\n",
        1,
      ),
    ).toThrow("only regular files and directories are allowed");
    expect(() => validateTarEntryTypes(regular, 1)).toThrow(
      "Packed core tar metadata listed 2 entries; expected 1.",
    );
  });

  it.each([
    "package/../outside.txt",
    "/package/package.json",
    "C:/package/package.json",
    "C:package/package.json",
    "package/C:/package.json",
    "package\\package.json",
    "package/./package.json",
    "./package/package.json",
    "package//package.json",
    "package/package.json\0ignored",
    "package/package.json ",
    "outside/package.json",
  ])("rejects unsafe or noncanonical tar entry %j", (entry) => {
    expect(() => normalizeTarEntry(entry)).toThrow(
      `Unsafe packed core tar entry: ${JSON.stringify(entry)}`,
    );
  });

  it("completes duplicate and leakage safety checks before metadata extraction", () => {
    expect(() =>
      auditPackedCoreEntrySafety([
        "package/package.json",
        "package/package.json",
      ]),
    ).toThrow("Packed core tarball contains duplicate entries");
    expect(() =>
      auditPackedCoreEntrySafety([
        "package/package.json",
        "package/tsconfig.build.json",
      ]),
    ).toThrow("Packed core contains forbidden source/test/config entries");
  });

  it("validates exact package identity, version, export order, and targets", () => {
    expect(validatePackedCorePackage(validPackageJson, "0.6.7")).toBe(
      validPackageJson,
    );

    expect(() =>
      validatePackedCorePackage(
        {
          ...validPackageJson,
          exports: {
            ".": CORE_EXPORT_CONTRACT["."],
            "./package.json": "./package.json",
            ...Object.fromEntries(Object.entries(CORE_EXPORT_CONTRACT).slice(2)),
          },
        },
        "0.6.7",
      ),
    ).toThrow("Packed core export keys do not match the frozen 0.7 contract");

    expect(() =>
      validatePackedCorePackage(
        {
          ...validPackageJson,
          exports: {
            ...CORE_EXPORT_CONTRACT,
            "./channel": {
              ...CORE_EXPORT_CONTRACT["./channel"],
              import: "./dist/channel.js",
            },
          },
        },
        "0.6.7",
      ),
    ).toThrow('Packed core export "./channel" does not match');
  });

  it("derives required runtime and declaration targets from exports", () => {
    const inventory = buildPackedCoreInventory(validPackageJson);

    expect(inventory.requiredEntries).toEqual([
      "package/README.md",
      "package/dist/channel/index.d.ts",
      "package/dist/channel/index.js",
      "package/dist/index.d.ts",
      "package/dist/index.js",
      "package/dist/mem/index.d.ts",
      "package/dist/mem/index.js",
      "package/dist/research/index.d.ts",
      "package/dist/research/index.js",
      "package/dist/task/index.d.ts",
      "package/dist/task/index.js",
      "package/dist/testing/index.d.ts",
      "package/dist/testing/index.js",
      "package/package.json",
    ]);
  });

  it("rejects duplicate entries, missing targets, README omission, and leakage", () => {
    const inventory = {
      requiredEntries: [
        "package/package.json",
        "package/README.md",
        "package/dist/index.js",
      ],
      forbiddenExactEntries: ["package/tsconfig.json"],
      forbiddenPrefixes: ["package/src/", "package/test/"],
    };

    expect(() =>
      auditPackedCoreEntries(
        ["package/package.json", "package/package.json"],
        inventory,
      ),
    ).toThrow("Packed core tarball contains duplicate entries");

    expect(() =>
      auditPackedCoreEntries(["package/package.json"], inventory),
    ).toThrow(
      "Packed core is missing required entries:\n" +
        "  - package/README.md\n" +
        "  - package/dist/index.js",
    );

    expect(() =>
      auditPackedCoreEntries(
        [
          "package/package.json",
          "package/README.md",
          "package/dist/index.js",
          "package/dist/internal.test.js",
          "package/dist/raw-source.ts",
          "package/eslint.config.mjs",
          "package/src/index.ts",
          "package/test/index.test.ts",
          "package/tsconfig.build.json",
          "package/tsconfig.json",
        ],
        inventory,
      ),
    ).toThrow(
      "Packed core contains forbidden source/test/config entries:\n" +
        "  - package/dist/internal.test.js\n" +
        "  - package/dist/raw-source.ts\n" +
        "  - package/eslint.config.mjs\n" +
        "  - package/src/index.ts\n" +
        "  - package/test/index.test.ts\n" +
        "  - package/tsconfig.build.json\n" +
        "  - package/tsconfig.json",
    );
  });
});
