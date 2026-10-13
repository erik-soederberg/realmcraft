import type { MobDef } from "./types";

export const MOBS = {
  rat: { name: "Jätteråtta", plural: "Jätteråttor", the: "jätteråttan", level: 2, hp: 5, att: 1, str: 0, def: 1, drops: [["bones", 1]], respawn: 12, xp: 16, aggressive: false, look: "rat" },
  imp: { name: "Vätte", plural: "Vättar", the: "vätten", level: 5, hp: 9, att: 4, str: 4, def: 3, drops: [["bones", 1], ["copper", 0.2], ["tin", 0.2], ["bronze_dagger", 0.15]], respawn: 15, xp: 40, aggressive: false, look: "imp" },
  wolf: { name: "Varg", plural: "Vargar", the: "vargen", level: 14, hp: 20, att: 13, str: 11, def: 10, drops: [["bones", 1], ["raw_meat", 1]], respawn: 20, xp: 120, aggressive: true, look: "wolf" },
  bandit: { name: "Rövare", plural: "Rövare", the: "rövaren", level: 11, hp: 16, att: 11, str: 9, def: 9, drops: [["bones", 1], ["iron", 0.3], ["bronze_dagger", 0.1]], respawn: 20, xp: 85, aggressive: true, look: "bandit" },
  spider: { name: "Grottspindel", plural: "Grottspindlar", the: "grottspindeln", level: 9, hp: 14, att: 9, str: 6, def: 6, drops: [["iron", 0.15]], respawn: 18, xp: 60, aggressive: true, look: "spider" },
  bear: { name: "Björn", plural: "Björnar", the: "björnen", level: 20, hp: 32, att: 18, str: 18, def: 16, drops: [["bones", 1], ["raw_meat", 1], ["raw_meat", 0.5]], respawn: 30, xp: 220, aggressive: false, look: "bear" },
  troll: { name: "Grottroll", plural: "Grottroll", the: "grottrollet", level: 28, hp: 60, att: 26, str: 24, def: 22, drops: [["bones", 1], ["iron_bar", 0.6], ["iron_greatsword", 0.3]], respawn: 60, xp: 600, aggressive: true, look: "troll" },
} satisfies Record<string, MobDef>;
