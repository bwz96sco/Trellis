/** Root markdown template for the active Research payload. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const agentsMdContent: string = readFileSync(
  join(__dirname, "agents.md"),
  "utf-8",
);
