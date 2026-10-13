import type { RegionDef } from "../types";

/** The starting valley. Coordinates are local to the region (0..size). */
export const EKDAL: RegionDef = {
  id: "ekdal",
  name: "Ekdal",
  origin: [0, 0],
  size: [48, 48],
  spawn: [24, 24],
  features: [
    { type: "lake", x: 11, z: 34, r: 7 },
    { type: "river", x: 11, z0: 35, z1: 48, width: 1.3, wiggle: 1.6 },
    { type: "quarry", x: 37, z: 11, r: 6 },
    { type: "path", points: [[24, 24], [36, 13]] },
    { type: "path", points: [[24, 24], [18, 30]] },
    { type: "path", points: [[24, 24], [30, 40]] },
    { type: "path", points: [[24, 24], [15, 16]] },
    { type: "path", points: [[24, 24], [47, 23]] },
    { type: "path", points: [[30, 40], [26, 47]] },
  ],
  forest: { threshold: 0.55, density: 0.42, oakChance: 0.1, scatter: 0.035, clearings: [[24, 24, 5], [16, 16, 2.5]] },
  stations: [
    { kind: "bank", at: [26, 22], facing: Math.PI },
    { kind: "furnace", at: [22, 22], facing: Math.PI / 2 },
    { kind: "anvil", at: [22, 24], facing: Math.PI / 2 },
    { kind: "range", at: [27, 25], facing: -Math.PI / 2 },
  ],
  resources: [
    { kind: "tree", at: [21, 27] }, { kind: "tree", at: [19, 21] }, { kind: "tree", at: [29, 28] }, { kind: "tree", at: [28, 19] },
    { kind: "oak", at: [30, 30] }, { kind: "oak", at: [17, 19] },
    { kind: "copper", at: [35, 9] }, { kind: "tin", at: [36, 8] }, { kind: "copper", at: [38, 9] }, { kind: "tin", at: [39, 11] },
    { kind: "copper", at: [34, 12] }, { kind: "tin", at: [37, 14] }, { kind: "iron", at: [40, 13] }, { kind: "iron", at: [39, 7] },
    { kind: "copper", at: [35, 15] }, { kind: "iron", at: [41, 10] },
  ],
  fishing: { near: [18, 30], count: 4 },
  mobs: [
    { mob: "rat", at: [20, 31] }, { mob: "rat", at: [22, 33] }, { mob: "rat", at: [27, 36] }, { mob: "rat", at: [30, 39] }, { mob: "rat", at: [25, 38] },
    { mob: "imp", at: [31, 15] }, { mob: "imp", at: [33, 16] }, { mob: "imp", at: [32, 12] }, { mob: "imp", at: [30, 17] },
    { mob: "wolf", at: [8, 9] }, { mob: "wolf", at: [12, 6] }, { mob: "wolf", at: [6, 14] }, { mob: "wolf", at: [13, 11] },
  ],
  npcs: [
    { id: "arvid", at: [21, 23], facing: Math.PI / 2 },
    { id: "tove", at: [19, 29], facing: -Math.PI / 2 },
    { id: "bo", at: [16, 16], facing: Math.PI },
  ],
};
