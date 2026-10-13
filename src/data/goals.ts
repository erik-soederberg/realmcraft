import type { GameState } from "../game/state";
import { levelForXp, SKILLS } from "./skills";
import type { SkillId } from "./types";

export interface GoalDef {
  id: string;
  text: string;
  target: number;
  value: (s: GameState) => number;
}

const total = (s: GameState) => (Object.keys(SKILLS) as SkillId[]).reduce((a, k) => a + levelForXp(s.xp[k]), 0);

/** Small milestones shown under the quests; they teach the core loop. */
export const GOALS: GoalDef[] = [
  { id: "logs5", text: "Hugg 5 stockar", target: 5, value: s => s.gathered.logs ?? 0 },
  { id: "ore6", text: "Bryt 6 malmer i stenbrottet", target: 6, value: s => (s.gathered.copper ?? 0) + (s.gathered.tin ?? 0) + (s.gathered.iron ?? 0) },
  { id: "fish5", text: "Fånga 5 fiskar vid sjön", target: 5, value: s => (s.gathered.shrimp ?? 0) + (s.gathered.anchovy ?? 0) },
  { id: "bank25", text: "Sätt in 25 föremål i banken", target: 25, value: s => s.deposited },
  { id: "sword", text: "Smid ett bronssvärd på städet", target: 1, value: s => s.made.bronze_sword ?? 0 },
  { id: "rats3", text: "Besegra 3 jätteråttor", target: 3, value: s => s.kills.rat ?? 0 },
  { id: "oak1", text: "Hugg en ek", target: 1, value: s => s.gathered.oak ?? 0 },
  { id: "total50", text: "Nå total level 50", target: 50, value: total },
];
