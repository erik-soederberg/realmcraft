import { restoreAppearance, type Appearance } from "../data/appearance";
import { ITEMS } from "../data/items";
import { MOBS } from "../data/mobs";
import { QUEST_BY_ID } from "../data/quests";
import { SKILLS, XP_TABLE, levelForXp } from "../data/skills";
import type { ItemId, MobId, SkillId } from "../data/types";
import { validateName } from "./names";

export const INVENTORY_SIZE = 28;
const SAVE_KEY = "ekdal-save-v2";

export interface Profile {
  name: string;
  appearance: Appearance;
}

export interface GameState {
  /** Null until the player has created a character. */
  profile: Profile | null;
  xp: Record<SkillId, number>;
  hp: number;
  weapon: ItemId | null;
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
    profile: null, xp, hp: 10, weapon: null, inv: new Array(INVENTORY_SIZE).fill(null),
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
  if (d.xp && typeof d.xp === "object") for (const k of Object.keys(f.xp) as SkillId[]) if (d.xp[k] != null) f.xp[k] = Math.max(0, Number(d.xp[k]) || 0);
  if (Array.isArray(d.inv)) for (let i = 0; i < INVENTORY_SIZE; i++) f.inv[i] = isItem(d.inv[i]) ? d.inv[i] : null;
  f.bank = counts(d.bank, isItem);
  f.gathered = counts(d.gathered, isItem);
  f.made = counts(d.made, isItem);
  f.kills = counts(d.kills, isMob);
  f.deposited = Math.max(0, Number(d.deposited) | 0);
  if (d.goals && typeof d.goals === "object") for (const [k, v] of Object.entries(d.goals)) f.goals[k] = !!v;
  if (d.quests && typeof d.quests === "object") for (const [k, v] of Object.entries(d.quests)) if (QUEST_BY_ID[k] && typeof v === "string") f.quests[k] = v;
  if (d.questStart && typeof d.questStart === "object") for (const [k, v] of Object.entries(d.questStart)) if (QUEST_BY_ID[k]) f.questStart[k] = counts(v, isMob);
  f.weapon = isItem(d.weapon) && ITEMS[d.weapon as ItemId] && "weapon" in ITEMS[d.weapon as ItemId] ? d.weapon : null;
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
