import path from "node:path";

export interface ResearchPaths {
  root: string;
  trellisDir: string;
  researchDir: string;
  eventsFile: string;
  workspaceFile: string;
  repositoriesFile: string;
  questsDir: string;
  workflowsDir: string;
  campaignsDir: string;
  runsDir: string;
  evidenceDir: string;
  claimsDir: string;
  runtimeDir: string;
  lockFile: string;
  seqFile: string;
  cacheFile: string;
}

export function researchPaths(root: string): ResearchPaths {
  if (!path.isAbsolute(root)) {
    throw new Error("research root must be an absolute path");
  }
  const normalizedRoot = path.resolve(root);
  const trellisDir = path.join(normalizedRoot, ".trellis");
  const researchDir = path.join(trellisDir, "research");
  const runtimeDir = path.join(trellisDir, ".runtime", "research");
  return {
    root: normalizedRoot,
    trellisDir,
    researchDir,
    eventsFile: path.join(researchDir, "events.jsonl"),
    workspaceFile: path.join(researchDir, "workspace.json"),
    repositoriesFile: path.join(researchDir, "repositories.json"),
    questsDir: path.join(researchDir, "quests"),
    workflowsDir: path.join(researchDir, "workflows"),
    campaignsDir: path.join(researchDir, "campaigns"),
    runsDir: path.join(researchDir, "runs"),
    evidenceDir: path.join(researchDir, "evidence"),
    claimsDir: path.join(researchDir, "claims"),
    runtimeDir,
    lockFile: path.join(runtimeDir, "write.lock"),
    seqFile: path.join(runtimeDir, "seq"),
    cacheFile: path.join(runtimeDir, "projection-cache.json"),
  };
}
