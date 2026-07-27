import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const CLI_ROOT = path.dirname(
  fileURLToPath(new URL("../../package.json", import.meta.url)),
);
const BUILT_CLI_ROOT = process.env.TRELLIS_TEST_BUILT_CLI_ROOT;
if (BUILT_CLI_ROOT === undefined) {
  throw new Error("Isolated built CLI root was not provided by global setup");
}
const CORE_PACKAGE_PREFIX = "@mindfoldhq/trellis-core";
const ALLOWED_CORE_IMPORT = "@mindfoldhq/trellis-core/research";
const EXCLUDED_DIRECTORIES = new Set([
  "docs",
  "fixtures",
  "node_modules",
  "templates",
  "test",
  "tests",
]);

interface ImportViolation {
  file: string;
  specifier: string;
}

function staticStringValue(node: ts.Expression): string | undefined {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return staticStringValue(node.expression);
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = staticStringValue(node.left);
    const right = staticStringValue(node.right);
    return left === undefined || right === undefined ? undefined : left + right;
  }
  return undefined;
}

function collectModuleSpecifiers(source: string): string[] {
  const sourceFile = ts.createSourceFile(
    "production-module.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const specifiers: string[] = [];

  function addExpression(expression: ts.Expression | undefined): void {
    if (!expression) return;
    const value = staticStringValue(expression);
    if (value !== undefined) specifiers.push(value);
  }

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) addExpression(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addExpression(node.moduleReference.expression);
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire =
        ts.isIdentifier(node.expression) && node.expression.text === "require";
      if (isDynamicImport || isRequire) addExpression(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function findCoreImportViolations(file: string, source: string): ImportViolation[] {
  return collectModuleSpecifiers(source)
    .filter(
      (specifier) =>
        specifier.startsWith(CORE_PACKAGE_PREFIX) &&
        specifier !== ALLOWED_CORE_IMPORT,
    )
    .map((specifier) => ({ file, specifier }));
}

function collectProductionModules(
  root: string,
  extensions: ReadonlySet<string>,
): string[] {
  const files: string[] = [];

  function walk(directory: string): void {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
        files.push(absolutePath);
      }
    }
  }

  walk(root);
  return files.sort();
}

function scanProductionTree(
  root: string,
  extensions: ReadonlySet<string>,
): ImportViolation[] {
  return collectProductionModules(root, extensions).flatMap((file) =>
    findCoreImportViolations(
      path.relative(CLI_ROOT, file).split(path.sep).join("/"),
      fs.readFileSync(file, "utf8"),
    ),
  );
}

describe("CLI production core import boundary", () => {
  it("recognizes static imports, re-exports, and literal dynamic imports", () => {
    const source = `
      import { readResearchState } from "@mindfoldhq/trellis-core/research";
      import type { ResearchState } from '@mindfoldhq/trellis-core/research';
      import "@mindfoldhq/trellis-core/channel";
      export { emptyTaskRecord } from "@mindfoldhq/trellis-core/task";
      export * from '@mindfoldhq/trellis-core/mem';
      const testing = import("@mindfoldhq/trellis-core/testing", { with: { type: "json" } });
      const task = import(\`@mindfoldhq/trellis-core/task\`);
      const channel = import("@mindfoldhq/trellis-core/" + "channel");
      import legacy = require("@mindfoldhq/trellis-core/mem");
      const runtimeSpecifier = "@mindfoldhq/trellis-core/channel";
      import(runtimeSpecifier);
    `;

    expect(collectModuleSpecifiers(source)).toEqual([
      "@mindfoldhq/trellis-core/research",
      "@mindfoldhq/trellis-core/research",
      "@mindfoldhq/trellis-core/channel",
      "@mindfoldhq/trellis-core/task",
      "@mindfoldhq/trellis-core/mem",
      "@mindfoldhq/trellis-core/testing",
      "@mindfoldhq/trellis-core/task",
      "@mindfoldhq/trellis-core/channel",
      "@mindfoldhq/trellis-core/mem",
    ]);
  });

  it("ignores import-like text in comments and ordinary strings", () => {
    const source = `
      // import value from "@mindfoldhq/trellis-core/channel";
      const example = 'import("@mindfoldhq/trellis-core/mem")';
    `;

    expect(collectModuleSpecifiers(source)).toEqual([]);
  });

  it.each([
    "@mindfoldhq/trellis-core",
    "@mindfoldhq/trellis-core/channel",
    "@mindfoldhq/trellis-core/mem",
    "@mindfoldhq/trellis-core/task",
    "@mindfoldhq/trellis-core/testing",
    "@mindfoldhq/trellis-core/src/research/index.js",
    "@mindfoldhq/trellis-core/dist/research/index.js",
    "@mindfoldhq/trellis-core/research.js",
    "@mindfoldhq/trellis-core/research/",
    "@mindfoldhq/trellis-core/research?raw",
    "@mindfoldhq/trellis-core/research#compat",
  ])("rejects production import %s", (specifier) => {
    expect(
      findCoreImportViolations(
        "src/example.ts",
        `import value from ${JSON.stringify(specifier)};`,
      ),
    ).toEqual([{ file: "src/example.ts", specifier }]);
  });

  it("accepts only the exact Research subpath", () => {
    expect(
      findCoreImportViolations(
        "src/example.ts",
        'import { readResearchState } from "@mindfoldhq/trellis-core/research";',
      ),
    ).toEqual([]);
  });

  it("keeps source and a clean CLI build on the exact Research subpath", () => {
    const sourceViolations = scanProductionTree(
      path.join(CLI_ROOT, "src"),
      new Set([".ts", ".js"]),
    );
    const builtViolations = scanProductionTree(
      path.join(BUILT_CLI_ROOT, "dist"),
      new Set([".js", ".mjs", ".cjs"]),
    );

    expect(sourceViolations).toEqual([]);
    expect(builtViolations).toEqual([]);
  });
});
