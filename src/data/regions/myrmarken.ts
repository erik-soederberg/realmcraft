import type { RegionDef } from "../types";

/** Boggy lowland south of Ekdal: pools, oaks, wolves and bears. */
export const MYRMARKEN: RegionDef = {
  id: "myrmarken",
  name: "Myrmarken",
  origin: [0, 72],
  size: [72, 48],
  features: [
    { type: "lake", x: 12, z: 14, r: 6 },
    { type: "lake", x: 34, z: 30, r: 7 },
    { type: "lake", x: 19, z: 37, r: 4 },
    { type: "lake", x: 40, z: 9, r: 3 },
    { type: "path", points: [[26, 0], [23, 20], [27, 44]] },
  ],
  forest: { threshold: 0.5, density: 0.3, oakChance: 0.3, scatter: 0.05, clearings: [[23, 20, 3]] },
  stations: [],
  resources: [],
  fishing: { near: [12, 14], count: 4 },
  mobs: [
    { mob: "rat", at: [22, 6] }, { mob: "rat", at: [27, 9] },
    { mob: "wolf", at: [30, 15] }, { mob: "wolf", at: [35, 18] }, { mob: "wolf", at: [8, 28] },
    { mob: "bear", at: [8, 40] }, { mob: "bear", at: [42, 42] }, { mob: "bear", at: [14, 26] },
  ],
  npcs: [],
};
