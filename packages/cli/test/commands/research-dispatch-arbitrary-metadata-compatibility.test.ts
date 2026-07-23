import fs from "node:fs";
import { fileURLToPath } from "node:url";

import {
  dispatchSchema,
  stableResearchJson,
} from "@mindfoldhq/trellis-core/research";
import { describe, expect, it } from "vitest";

const FIXTURE_PATH = fileURLToPath(
  new URL(
    "../fixtures/research-dispatch-schema-v1/arbitrary-metadata-request.json",
    import.meta.url,
  ),
);

describe("schema-v1 arbitrary Dispatch metadata compatibility", () => {
  it("round-trips arbitrary ownerSkill, provider, and taskRef values unchanged", () => {
    const fixture = fs.readFileSync(FIXTURE_PATH, "utf-8");
    const first = dispatchSchema.parse(JSON.parse(fixture));
    const serialized = stableResearchJson(first);
    const second = dispatchSchema.parse(JSON.parse(serialized));

    expect(serialized).toBe(fixture);
    expect(second).toEqual(first);
    expect(second.ownerSkill).toBe(
      "vendor.legacy/research-runner@2024-09",
    );
    expect(second.provider).toBe("host-adapter:custom/v3");
    expect(second.taskRef).toBe("tasks/archive/2024-09/legacy-dispatch");
  });
});
