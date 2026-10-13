import type { MobDef } from "./types";

export const MOBS = {
  rat: { name: "Jätteråtta", plural: "Jätteråttor", the: "jätteråttan", level: 1, hp: 4, att: 1, str: 1, def: 1, drops: [["bones", 1]], respawn: 12, xp: 8, aggressive: false, look: "rat" },
  imp: { name: "Vätte", plural: "Vättar", the: "vätten", level: 3, hp: 7, att: 3, str: 2, def: 2, drops: [["bones", 1], ["copper", 0.2], ["tin", 0.2], ["bronze_dagger", 0.15]], respawn: 15, xp: 15, aggressive: false, look: "imp" },
  wolf: { name: "Varg", plural: "Vargar", the: "vargen", level: 5, hp: 12, att: 5, str: 4, def: 4, drops: [["bones", 1], ["raw_meat", 1]], respawn: 20, xp: 30, aggressive: true, look: "wolf" },
  bandit: { name: "Rövare", plural: "Rövare", the: "rövaren", level: 7, hp: 15, att: 7, str: 6, def: 6, drops: [["bones", 1], ["iron", 0.3], ["bronze_dagger", 0.1]], respawn: 20, xp: 45, aggressive: true, look: "bandit" },
  spider: { name: "Grottspindel", plural: "Grottspindlar", the: "grottspindeln", level: 8, hp: 16, att: 8, str: 6, def: 6, drops: [["iron", 0.15]], respawn: 18, xp: 50, aggressive: true, look: "spider" },
  bear: { name: "Björn", plural: "Björnar", the: "björnen", level: 10, hp: 22, att: 10, str: 10, def: 9, drops: [["bones", 1], ["raw_meat", 1], ["raw_meat", 0.5]], respawn: 30, xp: 75, aggressive: false, look: "bear" },
  troll: { name: "Grottroll", plural: "Grottroll", the: "grottrollet", level: 15, hp: 45, att: 15, str: 14, def: 14, drops: [["bones", 1], ["iron_bar", 0.6], ["iron_greatsword", 0.3]], respawn: 60, xp: 300, aggressive: true, look: "troll" },
} satisfies Record<string, MobDef>;
