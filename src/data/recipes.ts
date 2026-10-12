import type { ItemId, SkillId, StationKind } from "./types";

export interface Recipe {
  station: StationKind;
  skill: SkillId;
  level: number;
  xp: number;
  input: Partial<Record<ItemId, number>>;
  output: ItemId;
  /** Base success chance at the required level; rises 2% per level above it. */
  success?: number;
  /** Item produced on failure instead of nothing (for example burnt food). */
  failItem?: ItemId;
  /** Chance to fail at the required level, falling 1.5% per level (cooking). */
  burn?: number;
  got: string;
  fail?: string;
}

/** Listed in order of preference: a station picks the first recipe the player can make. */
export const RECIPES: Recipe[] = [
  { station: "furnace", skill: "smithing", level: 15, xp: 25, input: { iron: 1 }, output: "iron_bar", success: 0.6, got: "Du smälter järnmalmen till en järntacka.", fail: "Järnmalmen är för oren och smälter bort." },
  { station: "furnace", skill: "smithing", level: 1, xp: 12, input: { copper: 1, tin: 1 }, output: "bronze_bar", got: "Du smälter koppar och tenn till en bronstacka." },
  { station: "anvil", skill: "smithing", level: 15, xp: 50, input: { iron_bar: 1 }, output: "iron_sword", got: "Du smider ett järnsvärd." },
  { station: "anvil", skill: "smithing", level: 1, xp: 25, input: { bronze_bar: 1 }, output: "bronze_sword", got: "Du smider ett bronssvärd." },
  { station: "range", skill: "cooking", level: 1, xp: 30, input: { shrimp: 1 }, output: "c_shrimp", burn: 0.45, failItem: "burnt", got: "Du lagar räkorna.", fail: "Du bränner räkorna." },
  { station: "range", skill: "cooking", level: 1, xp: 30, input: { anchovy: 1 }, output: "c_anchovy", burn: 0.45, failItem: "burnt", got: "Du lagar ansjovisen.", fail: "Du bränner ansjovisen." },
  { station: "range", skill: "cooking", level: 1, xp: 30, input: { raw_meat: 1 }, output: "meat", burn: 0.4, failItem: "burnt", got: "Du steker köttet.", fail: "Du bränner köttet." },
];

export const STATION_EMPTY: Partial<Record<StationKind, string>> = {
  furnace: "Du har ingen malm som går att smälta. Brons kräver koppar och tenn, järn kräver nivå 15 i Smide.",
  anvil: "Du behöver en bronstacka för att smida ett svärd. Järnsvärd kräver nivå 15 i Smide.",
  range: "Du har ingen rå mat att laga.",
};
export const STATION_START: Partial<Record<StationKind, string>> = {
  furnace: "Du lägger malm i ugnen.",
  anvil: "Du hamrar på städet.",
  range: "Du ställer dig vid spisen.",
};
