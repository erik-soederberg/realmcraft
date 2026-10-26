import * as THREE from "three";
import { fbm } from "../core/noise";
import { MOBS } from "../data/mobs";
import { NPC_BY_ID } from "../data/npcs";
import { RESOURCES, STATIONS } from "../data/resources";
import type { MobDef, MobId, NpcDef, ResourceDef, ResourceKind, StationDef, StationKind } from "../data/types";
import { Tile, WATER_LEVEL, type Region, type World } from "../world/world";
import { HpBar, QuestMarker, buildingModel, humanoid, type BuildingModel, mobModel, resourceModel, stationModel, type Humanoid, type ResourceModel } from "./models";

const HIT_GEO = new THREE.BoxGeometry(1, 1.8, 1);
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });

function hitbox(owner: Interactable): THREE.Mesh {
  const m = new THREE.Mesh(HIT_GEO, HIT_MAT);
  m.userData.owner = owner;
  return m;
}

export type Interactable = ResourceNode | Station | Mob | Npc;

/** Rough standing height of each monster, for health bars, name plates and arrow aim. */
export const MOB_HEIGHT: Record<MobDef["look"], number> = { rat: 0.75, spider: 0.95, wolf: 1.25, imp: 1.25, bear: 1.55, bandit: 1.95, troll: 2.75 };

export class ResourceNode {
  readonly type = "resource";
  readonly def: ResourceDef;
  readonly model: ResourceModel;
  readonly hit: THREE.Mesh;
  depleted = false;
  respawnAt = 0;
  constructor(readonly kind: ResourceKind, readonly x: number, readonly z: number, world: World, scene: THREE.Scene) {
    this.def = RESOURCES[kind];
    this.model = resourceModel(kind, world.rand(x, z));
    const y = kind === "fish" ? WATER_LEVEL + 0.03 : world.tileY(x, z);
    this.model.group.position.set(x + 0.5, y, z + 0.5);
    this.hit = hitbox(this);
    this.hit.position.set(x + 0.5, Math.max(y, WATER_LEVEL) + 0.8, z + 0.5);
    scene.add(this.model.group, this.hit);
    if (kind !== "fish") world.setBlocked(x, z, true);
  }
  setDepleted(d: boolean, now: number): void {
    this.depleted = d;
    this.respawnAt = now + this.def.respawn;
    this.model.setDepleted(d);
  }
}

export class Station {
  readonly type = "station";
  readonly def: StationDef;
  readonly group: THREE.Group;
  readonly hit: THREE.Mesh;
  /** For cave entrances and exits: the world tile it leads to. */
  link?: [number, number];
  constructor(readonly kind: StationKind, readonly x: number, readonly z: number, facing: number, world: World, scene: THREE.Scene) {
    this.def = STATIONS[kind];
    this.group = stationModel(kind);
    this.group.position.set(x + 0.5, world.tileY(x, z), z + 0.5);
    this.group.rotation.y = facing;
    this.hit = hitbox(this);
    this.hit.position.set(x + 0.5, this.group.position.y + 0.8, z + 0.5);
    scene.add(this.group, this.hit);
    world.setBlocked(x, z, true);
  }
}

export class Mob {
  readonly type = "mob";
  readonly def: MobDef;
  readonly group: THREE.Group;
  readonly hit: THREE.Mesh;
  readonly bar: HpBar;
  hp: number;
  fx: number; fz: number;
  dead = false; respawnAt = 0; atkCd = 2; target = false; face: number; showBar = 0; flash = 0;
  /** Seconds since this mob last attacked, and seconds left of its death fall. */
  lunge = 9; dying = 0; walkPhase = 0;
  /** Too far from the player to draw or animate. */
  culled = false;
  constructor(readonly id: MobId, public x: number, public z: number, readonly home: [number, number], scene: THREE.Scene, seed: number) {
    this.def = MOBS[id];
    this.hp = this.def.hp;
    this.fx = x + 0.5; this.fz = z + 0.5;
    this.face = seed * 6.28;
    this.group = mobModel(this.def.look);
    this.group.rotation.order = "YXZ";
    this.hit = hitbox(this);
    this.bar = new HpBar(scene);
    scene.add(this.group, this.hit);
  }
}

export class Npc {
  readonly type = "npc";
  readonly model: Humanoid;
  readonly marker = new QuestMarker();
  readonly hit: THREE.Mesh;
  constructor(readonly def: NpcDef, readonly x: number, readonly z: number, readonly facing: number, world: World, scene: THREE.Scene) {
    this.model = humanoid(def.look);
    const y = world.tileY(x, z);
    this.model.group.position.set(x + 0.5, y, z + 0.5);
    this.model.group.rotation.y = facing;
    this.marker.sprite.position.set(x + 0.5, y + 2.2, z + 0.5);
    this.hit = hitbox(this);
    this.hit.position.set(x + 0.5, y + 0.8, z + 0.5);
    scene.add(this.model.group, this.marker.sprite, this.hit);
    world.setBlocked(x, z, true);
  }
}

/** A house on the map, with the world tiles it covers. */
export interface House { name: string; x0: number; z0: number; x1: number; z1: number; model: BuildingModel }

export interface RegionContent {
  houses: House[];
  resources: ResourceNode[];
  stations: Station[];
  mobs: Mob[];
  npcs: Npc[];
}

/** Places everything a region definition describes: stations, NPCs, resources, forest, fishing spots and monsters. */
export function populateRegion(world: World, region: Region, scene: THREE.Scene): RegionContent {
  const d = region.def, ox = region.ox, oz = region.oz;
  const out: RegionContent = { houses: [], resources: [], stations: [], mobs: [], npcs: [] };
  for (const b of d.buildings ?? []) {
    const x0 = ox + b.at[0], z0 = oz + b.at[1];
    const model = buildingModel(x0, z0, b.size[0], b.size[1], [ox + b.door[0], oz + b.door[1]], world.floorY(region, b));
    scene.add(model.group);
    out.houses.push({ name: b.name, x0, z0, x1: x0 + b.size[0] - 1, z1: z0 + b.size[1] - 1, model });
  }
  for (const s of d.stations) {
    const st = new Station(s.kind, ox + s.at[0], oz + s.at[1], s.facing ?? 0, world, scene);
    const to = s.link && world.regions.find(r => r.def.id === s.link!.region);
    if (to) st.link = [to.ox + s.link!.at[0], to.oz + s.link!.at[1]];
    out.stations.push(st);
  }
  for (const n of d.npcs) {
    const at = world.findFree(ox + n.at[0], oz + n.at[1]);
    const def = NPC_BY_ID[n.id];
    if (at && def) out.npcs.push(new Npc(def, at[0], at[1], n.facing ?? 0, world, scene));
  }
  for (const r of d.resources) {
    const at = world.findFree(ox + r.at[0], oz + r.at[1], 2);
    if (at) out.resources.push(new ResourceNode(r.kind, at[0], at[1], world, scene));
  }
  // forest
  const f = d.forest;
  // Trees grow right up to a border shared with another region, but stay off the edge of the world.
  const edge = (x: number, z: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => !world.regionAt(x + dx, z + dz));
  for (let z = oz; z < oz + region.h; z++) for (let x = ox; x < ox + region.w; x++) {
    if (world.tile(x, z) !== Tile.Grass || world.isBlocked(x, z) || edge(x, z)) continue;
    if (f.clearings.some(([cx, cz, cr]) => Math.hypot(x - ox - cx, z - oz - cz) < cr)) continue;
    const dense = fbm(x * 0.12 + 50, z * 0.12 + 50);
    const h = world.rand(x * 3 + 1, z * 5 + 2);
    if ((dense > f.threshold && h < f.density) || h < f.scatter) {
      const oak = world.rand(x, z * 3, 7) < (dense > f.threshold + 0.07 ? f.oakChance * 2.5 : f.oakChance);
      out.resources.push(new ResourceNode(oak ? "oak" : "tree", x, z, world, scene));
    }
  }
  // fishing spots along the nearest shore
  const cand: [number, number, number][] = [];
  for (let z = oz; z < oz + region.h; z++) for (let x = ox; x < ox + region.w; x++) {
    if (world.tile(x, z) !== Tile.Water) continue;
    const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => world.tile(x + dx, z + dz) !== Tile.Water && !world.isBlocked(x + dx, z + dz));
    if (shore) cand.push([x, z, Math.hypot(x - ox - d.fishing.near[0], z - oz - d.fishing.near[1])]);
  }
  cand.sort((a, b) => a[2] - b[2]);
  const chosen: [number, number][] = [];
  for (const [x, z] of cand) {
    if (chosen.length >= d.fishing.count) break;
    if (chosen.every(([cx, cz]) => Math.hypot(cx - x, cz - z) >= 3)) chosen.push([x, z]);
  }
  for (const [x, z] of chosen) out.resources.push(new ResourceNode("fish", x, z, world, scene));
  // monsters
  for (const m of d.mobs) {
    const at = world.findFree(ox + m.at[0], oz + m.at[1]);
    if (at) out.mobs.push(new Mob(m.mob, at[0], at[1], at, scene, world.rand(at[0], at[1], 3)));
  }
  return out;
}

