/**
 * Unit tests for the workflow template resolver.
 *
 * Native resolution is offline (no fetch). Marketplace resolution is exercised
 * by stubbing `fetch` on the default Trellis marketplace URL.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  NATIVE_WORKFLOW_ID,
  RESEARCH_WORKFLOW_ID,
  WorkflowResolveError,
  listWorkflowTemplates,
  resolveWorkflowTemplate,
} from "../../src/utils/workflow-resolver.js";
import {
  researchWorkflowMdTemplate,
  workflowMdTemplate,
} from "../../src/templates/trellis/index.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveWorkflowTemplate(bundled)", () => {
  it("returns the bundled native workflow content without network access", async () => {
    // No fetch stub installed — proves we never call the network for native.
    const resolved = await resolveWorkflowTemplate(NATIVE_WORKFLOW_ID);
    expect(resolved.id).toBe(NATIVE_WORKFLOW_ID);
    expect(resolved.source).toBe("bundled");
    expect(resolved.content).toBe(workflowMdTemplate);
  });

  it("returns the bundled research workflow without network access", async () => {
    const resolved = await resolveWorkflowTemplate(RESEARCH_WORKFLOW_ID);
    expect(resolved.id).toBe(RESEARCH_WORKFLOW_ID);
    expect(resolved.source).toBe("bundled");
    expect(resolved.content).toBe(researchWorkflowMdTemplate);
  });

  it("keeps native reserved but lets an explicit source override research", async () => {
    const customResearch = "# Custom research workflow\n";
    const index = {
      version: 1,
      templates: [
        {
          id: "native",
          type: "workflow",
          name: "Remote Native",
          path: "workflows/native/workflow.md",
        },
        {
          id: "research",
          type: "workflow",
          name: "Remote Research",
          path: "workflows/research/workflow.md",
        },
      ],
    };
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith("/index.json")) {
        return new Response(JSON.stringify(index), { status: 200 });
      }
      if (url.endsWith("workflows/research/workflow.md")) {
        return new Response(customResearch, { status: 200 });
      }
      return new Response("remote native must not be fetched", { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const native = await resolveWorkflowTemplate(NATIVE_WORKFLOW_ID, {
      source: "gh:example/workflows",
    });
    const research = await resolveWorkflowTemplate(RESEARCH_WORKFLOW_ID, {
      source: "gh:example/workflows",
    });

    expect(native.source).toBe("bundled");
    expect(native.content).toBe(workflowMdTemplate);
    expect(research.source).toBe("marketplace");
    expect(research.content).toBe(customResearch);
  });
});

describe("resolveWorkflowTemplate(marketplace)", () => {
  it("fetches index.json, finds the workflow entry, and downloads its content", async () => {
    const index = {
      version: 1,
      templates: [
        {
          id: "tdd",
          type: "workflow",
          name: "TDD Workflow",
          description: "red/green/refactor",
          path: "workflows/tdd/workflow.md",
        },
        {
          id: "electron-fullstack",
          type: "spec",
          name: "Electron",
          path: "specs/electron-fullstack",
        },
      ],
    };
    const fakeContent = "# TDD\n\nPhase 2.1 red → green → refactor.\n";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.endsWith("/index.json")) {
          return new Response(JSON.stringify(index), { status: 200 });
        }
        if (url.endsWith("workflows/tdd/workflow.md")) {
          return new Response(fakeContent, { status: 200 });
        }
        return new Response("nope", { status: 404 });
      }),
    );

    const resolved = await resolveWorkflowTemplate("tdd");
    expect(resolved.id).toBe("tdd");
    expect(resolved.source).toBe("marketplace");
    expect(resolved.content).toBe(fakeContent);
  });

  it("throws WorkflowResolveError with workflow-specific copy when id is missing", async () => {
    const index = {
      version: 1,
      templates: [
        {
          id: "tdd",
          type: "workflow",
          name: "TDD",
          path: "workflows/tdd/workflow.md",
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(index), { status: 200 })),
    );

    await expect(resolveWorkflowTemplate("does-not-exist")).rejects.toThrow(
      WorkflowResolveError,
    );
    await expect(resolveWorkflowTemplate("does-not-exist")).rejects.toThrow(
      /workflow template/i,
    );
  });

  it("surfaces a workflow-specific error when the index cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 })),
    );

    await expect(resolveWorkflowTemplate("tdd")).rejects.toThrow(
      /workflow template index/i,
    );
  });

  it("rejects an entry whose path does not point to a .md file", async () => {
    const index = {
      version: 1,
      templates: [
        {
          id: "broken",
          type: "workflow",
          name: "Broken",
          path: "workflows/broken/",
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(index), { status: 200 })),
    );

    await expect(resolveWorkflowTemplate("broken")).rejects.toThrow(
      /workflow\.md/,
    );
  });

  it("rejects workflow paths that escape the marketplace root", async () => {
    const index = {
      version: 1,
      templates: [
        {
          id: "escape",
          type: "workflow",
          name: "Escape",
          path: "../workflow.md",
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(index), { status: 200 })),
    );

    await expect(resolveWorkflowTemplate("escape")).rejects.toThrow(
      /marketplace root/,
    );
  });

  it.each(["/tmp/workflow.md", "C:\\outside\\workflow.md"])(
    "rejects absolute workflow path %s before fetching template content",
    async (absolutePath) => {
      const index = {
        version: 1,
        templates: [
          {
            id: "absolute",
            type: "workflow",
            name: "Absolute",
            path: absolutePath,
          },
        ],
      };
      const fetchMock = vi.fn(
        async () => new Response(JSON.stringify(index), { status: 200 }),
      );
      vi.stubGlobal("fetch", fetchMock);

      await expect(resolveWorkflowTemplate("absolute")).rejects.toThrow(
        /marketplace root/,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});

describe("listWorkflowTemplates", () => {
  it("always includes bundled native and research first", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 })),
    );
    const { templates, errorMessage } = await listWorkflowTemplates();
    expect(errorMessage).toBeTruthy();
    expect(templates.slice(0, 2).map((template) => template.id)).toEqual([
      NATIVE_WORKFLOW_ID,
      RESEARCH_WORKFLOW_ID,
    ]);
    expect(templates.slice(0, 2).map((template) => template.source)).toEqual([
      "bundled",
      "bundled",
    ]);
  });

  it("includes marketplace entries after bundled entries and de-duplicates collisions", async () => {
    const index = {
      version: 1,
      templates: [
        {
          id: "research",
          type: "workflow",
          name: "Marketplace Research",
          path: "workflows/research/workflow.md",
        },
        {
          id: "tdd",
          type: "workflow",
          name: "TDD Workflow",
          path: "workflows/tdd/workflow.md",
        },
        {
          id: "channel-driven-subagent-dispatch",
          type: "workflow",
          name: "Channel-Driven",
          path: "workflows/channel-driven-subagent-dispatch/workflow.md",
        },
        {
          id: "electron-fullstack",
          type: "spec",
          name: "Electron",
          path: "specs/electron-fullstack",
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(index), { status: 200 })),
    );

    const { templates } = await listWorkflowTemplates();
    const ids = templates.map((t) => t.id);
    expect(ids.slice(0, 2)).toEqual([NATIVE_WORKFLOW_ID, RESEARCH_WORKFLOW_ID]);
    expect(ids.filter((id) => id === RESEARCH_WORKFLOW_ID)).toHaveLength(1);
    expect(ids).toContain("tdd");
    expect(ids).toContain("channel-driven-subagent-dispatch");
    expect(ids).not.toContain("electron-fullstack");
  });
});
