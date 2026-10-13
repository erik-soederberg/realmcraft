import type { RegionDef } from "../types";

/**
 * The cave under Stenhöjden. It sits apart from the surface on the world grid
 * and is reached only through its entrance; chambers and tunnels are carved
 * out of solid rock.
 */
export const SVARTGROTTAN: RegionDef = {
  id: "svartgrottan",
  name: "Svartgrottan",
  origin: [200, 0],
  size: [40, 40],
  cave: true,
  features: [
    { type: "chamber", x: 7, z: 20, r: 4 },
    { type: "tunnel", points: [[7, 20], [16, 18], [23, 10]], width: 1.6 },
    { type: "chamber", x: 24, z: 9, r: 5 },
    { type: "tunnel", points: [[16, 18], [21, 28]], width: 1.5 },
    { type: "chamber", x: 22, z: 31, r: 5 },
    { type: "tunnel", points: [[27, 10], [33, 18], [32, 26]], width: 1.7 },
    { type: "chamber", x: 32, z: 31, r: 6 },
  ],
  forest: { threshold: 2, density: 0, oakChance: 0, scatter: 0, clearings: [] },
  stations: [
    { kind: "cave_exit", at: [5, 20], link: { region: "stenhojden", at: [31, 13] } },
  ],
  resources: [
    { kind: "iron", at: [20, 33] }, { kind: "iron", at: [24, 34] }, { kind: "iron", at: [19, 29] },
    { kind: "copper", at: [26, 6] }, { kind: "tin", at: [22, 6] },
  ],
  fishing: { near: [0, 0], count: 0 },
  mobs: [
    { mob: "spider", at: [24, 9] }, { mob: "spider", at: [26, 12] }, { mob: "spider", at: [21, 7] },
    { mob: "spider", at: [22, 30] }, { mob: "spider", at: [25, 28] },
    { mob: "troll", at: [33, 32] },
  ],
  npcs: [],
};
