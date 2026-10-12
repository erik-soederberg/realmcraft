import { ITEMS } from "../data/items";
import type { IconSpec, ItemId, SkillId } from "../data/types";

function render(i: IconSpec): string {
  switch (i.kind) {
    case "logs":
      return `<svg viewBox="0 0 40 40"><g stroke="#1e1208" stroke-width="1.2"><rect x="6" y="20" width="26" height="9" rx="4" fill="${i.bark}" transform="rotate(-18 19 24)"/><rect x="8" y="12" width="26" height="9" rx="4" fill="${i.bark}" transform="rotate(-18 21 16)"/></g><circle cx="31.5" cy="11.5" r="3.6" fill="${i.end}" stroke="#1e1208"/><circle cx="29.5" cy="19.6" r="3.6" fill="${i.end}" stroke="#1e1208"/></svg>`;
    case "ore":
      return `<svg viewBox="0 0 40 40"><path d="M7 27 L11 14 L21 9 L32 14 L34 26 L24 32 L12 32 Z" fill="#6f6b66" stroke="#2b2925" stroke-width="1.4"/><path d="M11 14 L21 9 L32 14 L22 18 Z" fill="#8a8680"/><circle cx="17" cy="21" r="3.2" fill="${i.color}"/><circle cx="25" cy="25" r="2.6" fill="${i.color}"/><circle cx="24" cy="15" r="2" fill="${i.color}"/></svg>`;
    case "bar":
      return `<svg viewBox="0 0 40 40"><path d="M6 27 L11 17 L33 17 L36 27 Z" fill="${i.color}" stroke="#2b2118" stroke-width="1.3"/><path d="M11 17 L15 12 L31 12 L33 17 Z" fill="${i.light}" stroke="#2b2118" stroke-width="1.3"/></svg>`;
    case "fish":
      return `<svg viewBox="0 0 40 40"><path d="M6 20 Q17 ${20 - i.belly} 28 20 Q17 ${20 + i.belly} 6 20 Z" fill="${i.color}" stroke="#3a2420" stroke-width="1.3"/><path d="M27 20 L35 14 L33 20 L35 26 Z" fill="${i.color}" stroke="#3a2420" stroke-width="1.3"/><circle cx="11" cy="19" r="1.3" fill="#1a1010"/></svg>`;
    case "meat":
      return `<svg viewBox="0 0 40 40"><path d="M10 26 Q6 14 18 10 Q30 7 31 18 Q31 28 20 29 Z" fill="${i.color}" stroke="#3a1a14" stroke-width="1.3"/><rect x="25" y="25" width="10" height="4" rx="2" fill="#efe6d0" stroke="#6a6250" transform="rotate(35 28 27)"/></svg>`;
    case "bones":
      return `<svg viewBox="0 0 40 40"><g fill="#e8e0c8" stroke="#6a6250" stroke-width="1.2"><rect x="9" y="17" width="22" height="6" rx="2" transform="rotate(-30 20 20)"/><circle cx="9" cy="23" r="3.5"/><circle cx="12" cy="28" r="3.5"/><circle cx="28" cy="12" r="3.5"/><circle cx="31" cy="17" r="3.5"/></g></svg>`;
    case "shield":
      return `<svg viewBox="0 0 40 40"><path d="M20 5 L33 9 Q33 26 20 35 Q7 26 7 9 Z" fill="${i.color}" stroke="${i.rim}" stroke-width="2.4"/><path d="M20 9 V31 M10 15 H30" stroke="${i.rim}" stroke-width="1.4" opacity=".7"/><circle cx="20" cy="17" r="3.2" fill="${i.rim}"/></svg>`;
    case "sword":
      return `<svg viewBox="0 0 40 40"><path d="M30 6 L34 6 L34 10 L16 28 L12 24 Z" fill="${i.color}" stroke="#2b2118" stroke-width="1.2"/><rect x="8" y="23" width="12" height="4" rx="1" fill="#4a3b2c" transform="rotate(45 14 25)"/><rect x="6" y="28" width="4" height="7" rx="1.5" fill="#6a4a2c" transform="rotate(45 8 31)"/></svg>`;
  }
}

const cache: Partial<Record<ItemId, string>> = {};
export const itemIcon = (id: ItemId): string => (cache[id] ??= render(ITEMS[id].icon));

export const SKILL_ICON: Record<SkillId, string> = {
  wc: `<svg viewBox="0 0 34 34"><rect x="15" y="5" width="4" height="26" rx="2" fill="#8a6034" transform="rotate(25 17 17)"/><path d="M19 4 L29 7 L27 15 L19 12 Z" fill="#9fb0b6" stroke="#2b3236"/></svg>`,
  mining: `<svg viewBox="0 0 34 34"><rect x="15" y="9" width="4" height="22" rx="2" fill="#8a6034" transform="rotate(-20 17 20)"/><path d="M4 12 Q17 2 30 12 L28 13 Q17 6 6 13 Z" fill="#b8c0c4" stroke="#2b3236"/></svg>`,
  fishing: `<svg viewBox="0 0 34 34"><path d="M5 17 Q15 9 24 17 Q15 25 5 17 Z" fill="#5fb0d6" stroke="#1d3a48"/><path d="M23 17 L31 11 L29 17 L31 23 Z" fill="#5fb0d6" stroke="#1d3a48"/><circle cx="10" cy="16" r="1.3" fill="#0d1a20"/></svg>`,
  smithing: `<svg viewBox="0 0 34 34"><path d="M4 20 L28 20 L30 24 L22 24 L20 30 L12 30 L10 24 L4 24 Z" fill="#5d6166" stroke="#22262a"/><rect x="18" y="4" width="4" height="12" rx="1.5" fill="#8a6034" transform="rotate(35 20 10)"/><rect x="12" y="4" width="10" height="5" rx="1" fill="#b8c0c4" stroke="#22262a" transform="rotate(35 17 6)"/></svg>`,
  cooking: `<svg viewBox="0 0 34 34"><path d="M6 14 L28 14 L26 26 Q17 30 8 26 Z" fill="#3a3c40" stroke="#151618"/><rect x="4" y="12" width="26" height="3" rx="1.5" fill="#5a5d62"/><path d="M12 9 Q14 6 12 3 M18 9 Q20 6 18 3 M24 9 Q26 6 24 3" stroke="#c9604a" stroke-width="1.6" fill="none"/></svg>`,
  melee: `<svg viewBox="0 0 34 34"><path d="M24 4 L30 4 L30 10 L13 27 L7 21 Z" fill="#b8c0c4" stroke="#22262a"/><rect x="4" y="21" width="12" height="4" rx="1" fill="#6a4a2c" transform="rotate(45 10 23)"/></svg>`,
  hp: `<svg viewBox="0 0 34 34"><path d="M17 29 L5 17 Q1 11 6 7 Q12 3 17 10 Q22 3 28 7 Q33 11 29 17 Z" fill="#d04a3a" stroke="#4a120c"/></svg>`,
};
