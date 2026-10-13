import { restoreAppearance, type Appearance } from "../data/appearance";
import { ITEMS } from "../data/items";
import { MOBS } from "../data/mobs";
import { QUEST_BY_ID } from "../data/quests";
import { SKILLS, XP_TABLE, levelForXp } from "../data/skills";
import type { EquipSlot, ItemId, MobId, SkillId } from "../data/types";
import { validateName } from "./names";

export const INVENTORY_SIZE = 28;
const SAVE_KEY = "ekdal-save-v2";

/** Every new character starts with these equipped. */
export const STARTER_GEAR: Partial<Record<EquipSlot, ItemId>> = { weapon: "bronze_sword", shield: "wooden_shield" };
export const EQUIP_SLOTS: EquipSlot[] = ["head", "weapon", "body", "shield", "legs"];

export interface Profile {
  name: string;
  appearance: Appearance;
}

export interface GameState {
  /** Null until the player has created a character. */
  profile: Profile | null;
  xp: Record<SkillId, number>;
  /** Character experience; the character level comes from this. */
  exp: number;
  hp: number;
  /** What the player wears and wields, by slot. */
  equip: Partial<Record<EquipSlot, ItemId>>;
  inv: (ItemId | null)[];
  bank: Partial<Record<ItemId, number>>;
  gathered: Partial<Record<ItemId, number>>;
  made: Partial<Record<ItemId, number>>;
  kills: Partial<Record<MobId, number>>;
  deposited: number;
  goals: Record<string, boolean>;
  /** Quest id → current step id or "done". Missing means not started. */
  quests: Record<string, string>;
  /** Kill counts captured when each quest started, for "kill N since" steps. */
  questStart: Record<string, Partial<Record<MobId, number>>>;
  pos: [number, number];
  run: boolean;
  hint: boolean;
}

export function freshState(spawn: [number, number]): GameState {
  const xp = Object.fromEntries(Object.keys(SKILLS).map(k => [k, 0])) as Record<SkillId, number>;
  xp.hp = XP_TABLE[10];
  return {
    profile: null, xp, exp: 0, hp: 10, equip: { ...STARTER_GEAR }, inv: new Array(INVENTORY_SIZE).fill(null),
    bank: {}, gathered: {}, made: {}, kills: {}, deposited: 0, goals: {}, quests: {}, questStart: {},
    pos: spawn, run: true, hint: true,
  };
}

const isItem = (k: unknown): k is ItemId => typeof k === "string" && k in ITEMS;
const isMob = (k: unknown): k is MobId => typeof k === "string" && k in MOBS;

function counts<K extends string>(src: unknown, valid: (k: unknown) => k is K): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  if (src && typeof src === "object") for (const [k, v] of Object.entries(src)) if (valid(k)) out[k] = Math.max(0, Number(v) | 0);
  return out;
}

/** Rebuilds a state from untrusted saved JSON, keeping only known keys. */
export function restoreState(data: unknown, spawn: [number, number]): GameState {
  const f = freshState(spawn);
  if (!data || typeof data !== "object") return f;
  const d = data as Record<string, any>;
  if (d.profile && typeof d.profile === "object" && typeof d.profile.name === "string" && validateName(d.profile.name).ok)
    f.profile = { name: d.profile.name.trim(), appearance: restoreAppearance(d.profile.appearance) };
  if (d.xp && typeof d.xp === "object") {
    for (const k of Object.keys(f.xp) as SkillId[]) if (d.xp[k] != null) f.xp[k] = Math.max(0, Number(d.xp[k]) || 0);
    // Saves from before the weapon skills: the old melee skill becomes one-handed, with a share for the shield.
    const melee = Math.max(0, Number(d.xp.melee) || 0);
    if (melee && d.xp.onehand == null) { f.xp.onehand = melee; f.xp.shield = Math.floor(melee / 3); }
  }
  if (Array.isArray(d.inv)) for (let i = 0; i < INVENTORY_SIZE; i++) f.inv[i] = isItem(d.inv[i]) ? d.inv[i] : null;
  f.bank = counts(d.bank, isItem);
  f.gathered = counts(d.gathered, isItem);
  f.made = counts(d.made, isItem);
  f.kills = counts(d.kills, isMob);
  f.deposited = Math.max(0, Number(d.deposited) | 0);
  if (d.goals && typeof d.goals === "object") for (const [k, v] of Object.entries(d.goals)) f.goals[k] = !!v;
  if (d.quests && typeof d.quests === "object") for (const [k, v] of Object.entries(d.quests)) if (QUEST_BY_ID[k] && typeof v === "string") f.quests[k] = v;
  if (d.questStart && typeof d.questStart === "object") for (const [k, v] of Object.entries(d.questStart)) if (QUEST_BY_ID[k]) f.questStart[k] = counts(v, isMob);
  const fits = (id: unknown, slot: EquipSlot): id is ItemId => isItem(id) && (ITEMS[id] as { equip?: { slot: EquipSlot } }).equip?.slot === slot;
  if (d.equip && typeof d.equip === "object") {
    f.equip = {};
    for (const slot of EQUIP_SLOTS) if (fits(d.equip[slot], slot)) f.equip[slot] = d.equip[slot];
  } else if (fits(d.weapon, "weapon")) {
    // Saves from before equipment slots: keep the old weapon and hand out the starter shield.
    f.equip.weapon = d.weapon;
  }
  // Saves from before character levels: credit finished quests and past kills.
  f.exp = d.exp != null ? Math.max(0, Number(d.exp) || 0)
    : Object.keys(f.quests).filter(k => f.quests[k] === "done").reduce((a, k) => a + QUEST_BY_ID[k].rewards.exp, 0)
      + (Object.entries(f.kills) as [MobId, number][]).reduce((a, [m, n]) => a + MOBS[m].xp * n, 0);
  f.hp = Math.max(1, Math.min(levelForXp(f.xp.hp), d.hp == null ? 99 : Number(d.hp) | 0));
  if (Array.isArray(d.pos) && d.pos.length === 2) f.pos = [Number(d.pos[0]) | 0, Number(d.pos[1]) | 0];
  f.run = d.run !== false;
  f.hint = d.hint !== false;
  return f;
}

export function loadSaved(): unknown {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch { return null; }
}
export function writeSave(s: GameState): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}
export function clearSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}
