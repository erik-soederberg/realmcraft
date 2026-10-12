import type { MobDef } from "./types";

export const MOBS = {
  rat: { name: "Jätteråtta", the: "jätteråttan", level: 2, hp: 5, att: 1, str: 0, def: 1, drops: [["bones", 1]], respawn: 12, aggressive: false, look: "rat" },
  imp: { name: "Vätte", the: "vätten", level: 5, hp: 9, att: 4, str: 4, def: 3, drops: [["bones", 1], ["copper", 0.2], ["tin", 0.2]], respawn: 15, aggressive: false, look: "imp" },
  wolf: { name: "Varg", the: "vargen", level: 14, hp: 20, att: 13, str: 11, def: 10, drops: [["bones", 1], ["raw_meat", 1]], respawn: 20, aggressive: true, look: "wolf" },
} satisfies Record<string, MobDef>;
