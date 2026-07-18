import type {
  Campaign,
  Claim,
  Evidence,
  Quest,
  ResearchState,
  Run,
} from "./types.js";

export interface ResearchContextSelection {
  questIds?: readonly string[];
  campaignIds?: readonly string[];
  runIds?: readonly string[];
  evidenceIds?: readonly string[];
  claimIds?: readonly string[];
}

export interface ResearchContext {
  quests: Quest[];
  campaigns: Campaign[];
  runs: Run[];
  evidence: Evidence[];
  claims: Claim[];
}

function select<T>(
  values: Readonly<Record<string, T>>,
  ids: readonly string[] | undefined,
): T[] {
  const selected = ids === undefined ? Object.keys(values) : [...ids];
  return selected
    .sort()
    .map((id) => values[id])
    .filter((value): value is T => value !== undefined);
}

export function buildResearchContext(
  state: ResearchState,
  selection: ResearchContextSelection = {},
): ResearchContext {
  return {
    quests: select(state.quests, selection.questIds),
    campaigns: select(state.campaigns, selection.campaignIds),
    runs: select(state.runs, selection.runIds),
    evidence: select(state.evidence, selection.evidenceIds),
    claims: select(state.claims, selection.claimIds),
  };
}
