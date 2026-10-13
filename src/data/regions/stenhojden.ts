import type { RegionDef } from "../types";

/** Rocky highland east of Ekdal: iron, robbers, bears, and the way into Svartgrottan. */
export const STENHOJDEN: RegionDef = {
  id: "stenhojden",
  name: "Stenhöjden",
  origin: [48, 0],
  size: [48, 48],
  features: [
    { type: "quarry", x: 31, z: 13, r: 9 },
    { type: "quarry", x: 10, z: 37, r: 5 },
    { type: "lake", x: 39, z: 38, r: 4 },
    { type: "path", points: [[0, 23], [14, 20], [26, 18], [31, 14]] },
    { type: "path", points: [[14, 20], [20, 40]] },
  ],
  forest: { threshold: 0.6, density: 0.35, oakChance: 0.05, scatter: 0.03, clearings: [[14, 20, 4], [18, 33, 4]] },
  stations: [
    { kind: "cave_entrance", at: [30, 12], facing: 0.75, link: { region: "svartgrottan", at: [8, 20] } },
  ],
  resources: [
    { kind: "iron", at: [33, 17] }, { kind: "iron", at: [35, 10] }, { kind: "iron", at: [27, 9] }, { kind: "iron", at: [36, 14] },
    { kind: "copper", at: [24, 12] }, { kind: "tin", at: [25, 17] }, { kind: "copper", at: [9, 35] }, { kind: "tin", at: [12, 39] },
  ],
  fishing: { near: [39, 38], count: 3 },
  mobs: [
    { mob: "bandit", at: [17, 31] }, { mob: "bandit", at: [20, 34] }, { mob: "bandit", at: [16, 36] }, { mob: "bandit", at: [22, 30] },
    { mob: "bear", at: [41, 26] }, { mob: "bear", at: [36, 31] },
  ],
  npcs: [
    { id: "stina", at: [24, 19], facing: -Math.PI / 2 },
  ],
};
