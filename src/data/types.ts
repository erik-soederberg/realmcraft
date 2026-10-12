/**
 * Content types. Everything a designer adds (items, monsters, NPCs, quests,
 * regions) is plain data described by these types; the engine reads it.
 */
import type { SKILLS } from "./skills";
import type { ITEMS } from "./items";
import type { MOBS } from "./mobs";

export type SkillId = keyof typeof SKILLS;
export type ItemId = keyof typeof ITEMS;
export type MobId = keyof typeof MOBS;

export type IconSpec =
  | { kind: "logs"; bark: string; end: string }
  | { kind: "ore"; color: string }
  | { kind: "bar"; color: string; light: string }
  | { kind: "fish"; color: string; belly: number }
  | { kind: "meat"; color: string }
  | { kind: "bones" }
  | { kind: "sword"; color: string }
  | { kind: "shield"; color: string; rim: string };

export interface ItemDef {
  name: string;
  icon: IconSpec;
  heal?: number;
  /** Worn or wielded: which slot it goes in and the bonuses it gives. */
  equip?: EquipStats;
}

export type EquipSlot = "head" | "weapon" | "body" | "shield" | "legs";

export interface EquipStats {
  slot: EquipSlot;
  /** Attack accuracy bonus. */
  acc?: number;
  /** Strength bonus (max hit). */
  str?: number;
  /** Defence bonus against melee. */
  def?: number;
  /** Ticks between attacks; weapons only. */
  speed?: number;
}

export type ResourceKind = "tree" | "oak" | "copper" | "tin" | "iron" | "fish";
export type StationKind = "bank" | "furnace" | "anvil" | "range";

export interface ResourceDef {
  name: string;
  verb: string;
  skill: SkillId;
  level: number;
  xp: number;
  item: ItemId;
  /** Chance per successful gather that the node is used up. */
  deplete: number;
  respawn: number;
  start: string;
  got: string;
  depletedName?: string;
}

export interface StationDef {
  name: string;
  verb: string;
  skill?: SkillId;
}

export interface MobDef {
  name: string;
  /** Plural form, used in quest progress ("Vargar 1/3"). */
  plural: string;
  /** Definite form, used in sentences ("Du besegrade vargen"). */
  the: string;
  level: number;
  hp: number;
  att: number;
  str: number;
  def: number;
  drops: [ItemId, number][];
  respawn: number;
  aggressive: boolean;
  look: "rat" | "imp" | "wolf";
}

/* ---------- quests & dialogue ---------- */

/** A stage is "not_started", one of the quest's step ids, or "done". */
export type Condition =
  | { quest: string; stage: string | string[] }
  | { hasItems: Partial<Record<ItemId, number>> }
  | { killsSinceStart: { quest: string; mob: MobId; count: number } }
  | { level: { skill: SkillId; min: number } }
  | { not: Condition };

export type DialogueAction =
  | { startQuest: string }
  | { setStage: { quest: string; stage: string } }
  | { completeQuest: string }
  | { take: Partial<Record<ItemId, number>> };

export interface DialogueOption {
  text: string;
  actions?: DialogueAction[];
  /** Lines the NPC says after this option is picked. */
  reply?: string[];
}

export interface DialogueNode {
  when?: Condition[];
  lines: string[];
  options?: DialogueOption[];
}

export interface QuestStep {
  id: string;
  /** Shown in the quest log while this step is active. */
  log: string;
  /** When true the giver shows a "?" marker: the player can hand in. */
  ready?: Condition[];
}

export interface QuestDef {
  id: string;
  name: string;
  giver: string;
  summary: string;
  steps: QuestStep[];
  rewards: { xp?: Partial<Record<SkillId, number>>; items?: ItemId[] };
}

export type HairStyle = "short" | "long" | "ponytail" | "bald";

export interface HumanLook {
  skin: string;
  shirt: string;
  trousers: string;
  hair: string;
  apron?: string;
  hood?: boolean;
  hairStyle?: HairStyle;
  beard?: boolean;
}

export interface NpcDef {
  id: string;
  name: string;
  look: HumanLook;
  quests: string[];
  dialogue: DialogueNode[];
  /** Short idle remarks shown in chat when there is nothing else to say. */
}

/* ---------- regions ---------- */

export type RegionFeature =
  | { type: "lake"; x: number; z: number; r: number }
  | { type: "river"; x: number; z0: number; z1: number; width: number; wiggle: number }
  | { type: "quarry"; x: number; z: number; r: number }
  | { type: "path"; points: [number, number][] };

export interface RegionDef {
  id: string;
  name: string;
  /** World tile coordinate of the region's north-west corner. */
  origin: [number, number];
  size: [number, number];
  spawn?: [number, number];
  features: RegionFeature[];
  forest: { threshold: number; density: number; oakChance: number; scatter: number; clearings: [number, number, number][] };
  stations: { kind: StationKind; at: [number, number]; facing?: number }[];
  resources: { kind: ResourceKind; at: [number, number] }[];
  fishing: { near: [number, number]; count: number };
  mobs: { mob: MobId; at: [number, number] }[];
  npcs: { id: string; at: [number, number]; facing?: number }[];
}
