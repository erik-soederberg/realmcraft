import type { HairStyle } from "./types";

/** Choices offered in the character creator. Saves store indexes into these lists. */
export const APPEARANCE = {
  skin: ["#f1c9a5", "#d9a77f", "#c99a78", "#a8714e", "#7d4f33", "#553522"],
  hair: ["#2e2218", "#5a3a1e", "#8a5a2b", "#c4934a", "#a0522d", "#8f8a82"],
  hairStyle: ["short", "long", "ponytail", "bald"] as HairStyle[],
  shirt: ["#6d7073", "#5a4632", "#2f4a5a", "#3d4a2c", "#5a2a2a", "#3a3340"],
  cape: ["#4a1612", "#1f3a4a", "#2c3a1c", "#4a3a14", "#2a2430", "#5a5650"],
};

export const HAIR_STYLE_NAMES: Record<HairStyle, string> = { short: "Kort", long: "Långt", ponytail: "Hästsvans", bald: "Kal" };

export interface Appearance {
  skin: number;
  hair: number;
  hairStyle: number;
  shirt: number;
  cape: number;
  beard: boolean;
}

export const DEFAULT_APPEARANCE: Appearance = { skin: 2, hair: 0, hairStyle: 0, shirt: 0, cape: 0, beard: false };

export function randomAppearance(): Appearance {
  const pick = (n: number) => Math.floor(Math.random() * n);
  return {
    skin: pick(APPEARANCE.skin.length), hair: pick(APPEARANCE.hair.length), hairStyle: pick(APPEARANCE.hairStyle.length),
    shirt: pick(APPEARANCE.shirt.length), cape: pick(APPEARANCE.cape.length), beard: Math.random() < 0.4,
  };
}

/** Turns stored choices into the look the 3D model is built from. */
export function lookFor(a: Appearance) {
  return {
    skin: APPEARANCE.skin[a.skin], hair: APPEARANCE.hair[a.hair], hairStyle: APPEARANCE.hairStyle[a.hairStyle],
    shirt: APPEARANCE.shirt[a.shirt], cape: APPEARANCE.cape[a.cape], beard: a.beard,
    trousers: "#3a3029", chain: a.shirt === 0,
  };
}

/** Keeps only valid indexes from saved data. */
export function restoreAppearance(d: unknown): Appearance {
  const out = { ...DEFAULT_APPEARANCE };
  if (!d || typeof d !== "object") return out;
  const r = d as Record<string, unknown>;
  for (const k of ["skin", "hair", "hairStyle", "shirt", "cape"] as const) {
    const v = Number(r[k]);
    if (Number.isInteger(v) && v >= 0 && v < APPEARANCE[k].length) out[k] = v;
  }
  out.beard = r.beard === true;
  return out;
}
