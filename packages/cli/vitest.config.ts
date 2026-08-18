import { defineConfig } from "vitest/config";

const PROCEDURE_207_PACKAGES_TEST =
  "test/commands/research-procedure-207-packages.test.ts";
const METHODOLOGY_116_PRODUCTION_TEST =
  "test/commands/research-methodology-116-production.test.ts";

const DIST_MUTATING_TESTS = [
  "test/scripts/smoke-installed-cli.test.ts",
  "test/commands/research-cs5-integration.test.ts",
];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "procedure-207-packages",
          maxWorkers: 1,
          testTimeout: 10_000,
          include: [PROCEDURE_207_PACKAGES_TEST],
          exclude: ["third/**", "node_modules/**"],
          setupFiles: ["./test/setup.ts"],
          sequence: { groupOrder: 1 },
        },
      },
      {
        test: {
          name: "methodology-116-production",
          maxWorkers: 1,
          testTimeout: 10_000,
          include: [METHODOLOGY_116_PRODUCTION_TEST],
          exclude: ["third/**", "node_modules/**"],
          setupFiles: ["./test/setup.ts"],
          sequence: { groupOrder: 2 },
        },
      },
      {
        test: {
          name: "normal",
          maxWorkers: 4,
          testTimeout: 10_000,
          include: ["test/**/*.test.ts"],
          exclude: [
            "third/**",
            "node_modules/**",
            PROCEDURE_207_PACKAGES_TEST,
            METHODOLOGY_116_PRODUCTION_TEST,
            ...DIST_MUTATING_TESTS,
          ],
          globalSetup: ["./test/global-setup.ts"],
          setupFiles: ["./test/setup.ts"],
          sequence: { groupOrder: 3 },
        },
      },
      {
        test: {
          name: "dist-mutating",
          maxWorkers: 1,
          testTimeout: 10_000,
          include: DIST_MUTATING_TESTS,
          exclude: ["third/**", "node_modules/**"],
          setupFiles: ["./test/setup.ts"],
          sequence: { groupOrder: 4 },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/cli/index.ts"],
      reportsDirectory: "./coverage",
    },
  },
});
