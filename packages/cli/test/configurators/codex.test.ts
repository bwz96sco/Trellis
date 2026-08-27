import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  RESEARCH_PAYLOAD_PATHS,
  applyCodexWorkerModelKeys,
  collectResearchPlatformPayload,
  extractCodexWorkerModelKeys,
} from "../../src/configurators/research-payload.js";
import { getResearchWorkerTemplate } from "../../src/templates/codex/index.js";

describe("Codex Research worker model preservation", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-codex-model-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("extracts only top-level uncommented model keys", () => {
    const content = [
      'sandbox_mode = "workspace-write"',
      '# model = "commented"',
      'developer_instructions = """',
      'model = "inside-instructions"',
      '"""',
      'model = "custom\\"model"',
      'model_reasoning_effort = "high" # user override',
    ].join("\n");

    expect(extractCodexWorkerModelKeys(content)).toEqual({
      model: 'custom"model',
      model_reasoning_effort: "high",
    });
  });

  it("ignores table-scoped and literal-multiline key-shaped text", () => {
    const content = [
      "developer_instructions = '''",
      'model = "inside-instructions"',
      "'''",
      "model = 'literal-model'",
      'model_reasoning_effort = ""',
      "[features]",
      'model = "nested-model"',
    ].join("\n");

    expect(extractCodexWorkerModelKeys(content)).toEqual({
      model: "literal-model",
      model_reasoning_effort: "",
    });
  });

  it("inserts escaped overrides after sandbox_mode", () => {
    const fresh = getResearchWorkerTemplate().content;
    const rendered = applyCodexWorkerModelKeys(fresh, {
      model: 'custom"model\\name',
      model_reasoning_effort: "medium",
    });

    expect(rendered).toContain(
      'sandbox_mode = "workspace-write"\nmodel = "custom\\"model\\\\name"\nmodel_reasoning_effort = "medium"',
    );
  });

  it("preserves user overrides through the exact one-worker collector", () => {
    const workerPath = path.join(tmpDir, RESEARCH_PAYLOAD_PATHS.codex.worker);
    fs.mkdirSync(path.dirname(workerPath), { recursive: true });
    fs.writeFileSync(
      workerPath,
      getResearchWorkerTemplate().content.replace(
        'sandbox_mode = "workspace-write"\n',
        'sandbox_mode = "workspace-write"\nmodel = "user-model"\nmodel_reasoning_effort = "low"\n',
      ),
    );

    const files = collectResearchPlatformPayload("codex", tmpDir);
    const rendered = files.get(RESEARCH_PAYLOAD_PATHS.codex.worker) ?? "";

    expect(rendered).toContain('model = "user-model"');
    expect(rendered).toContain('model_reasoning_effort = "low"');
    expect(
      [...files.keys()].filter((entry) => entry.startsWith(".codex/agents/")),
    ).toEqual([RESEARCH_PAYLOAD_PATHS.codex.worker]);
  });

  it("ships hints without selecting a model by default", () => {
    const content = getResearchWorkerTemplate().content;
    expect(content).toContain('# model = "your-model-id"');
    expect(content).toContain('# model_reasoning_effort = "low"');
    expect(content).not.toMatch(/^model = /m);
    expect(content).not.toMatch(/^model_reasoning_effort = /m);
  });
});
