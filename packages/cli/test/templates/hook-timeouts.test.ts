/**
 * Regression guard for default hook timeouts (GitHub issue #267).
 *
 * Windows Python cold start + session-start.py + nested subprocess calls can
 * exceed the old defaults. Current Claude Code and Codex hook templates must
 * retain the raised timeouts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATES_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "src",
  "templates",
);

const PLATFORM_HOOK_CONFIGS = [
  {
    platform: "claude",
    path: "claude/settings.json",
    sessionStartEvent: "SessionStart",
    userPromptEvent: "UserPromptSubmit",
  },
  {
    platform: "codex",
    path: "codex/hooks.json",
    sessionStartEvent: null,
    userPromptEvent: "UserPromptSubmit",
  },
] as const;

function extractHookEntries(events: unknown): Record<string, unknown>[] {
  if (!Array.isArray(events)) return [];
  const out: Record<string, unknown>[] = [];
  for (const entry of events) {
    if (!entry || typeof entry !== "object") continue;
    const inner = (entry as { hooks?: unknown }).hooks;
    if (!Array.isArray(inner)) continue;
    for (const hook of inner) {
      if (hook && typeof hook === "object") {
        out.push(hook as Record<string, unknown>);
      }
    }
  }
  return out;
}

describe("hook timeouts survive Windows Python cold start", () => {
  for (const cfg of PLATFORM_HOOK_CONFIGS) {
    describe(cfg.platform, () => {
      const raw = readFileSync(join(TEMPLATES_ROOT, cfg.path), "utf-8");
      const parsed = JSON.parse(raw) as { hooks?: Record<string, unknown> };

      if (cfg.sessionStartEvent !== null) {
        it("SessionStart timeout is at least 30 seconds", () => {
          const hooks = extractHookEntries(parsed.hooks?.[cfg.sessionStartEvent]);
          expect(hooks.length).toBeGreaterThan(0);
          for (const hook of hooks) {
            expect(hook.timeout).toBeTypeOf("number");
            expect(hook.timeout as number).toBeGreaterThanOrEqual(30);
          }
        });
      }

      it("UserPromptSubmit timeout is at least 15 seconds", () => {
        const hooks = extractHookEntries(parsed.hooks?.[cfg.userPromptEvent]);
        expect(hooks.length).toBeGreaterThan(0);
        for (const hook of hooks) {
          expect(hook.timeout).toBeTypeOf("number");
          expect(hook.timeout as number).toBeGreaterThanOrEqual(15);
        }
      });
    });
  }
});
