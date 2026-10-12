import type { ItemDef, ItemId } from "./types";

export const ITEMS = {
  logs: { name: "Stockar", icon: { kind: "logs", bark: "#8a5a32", end: "#d8b47c" } },
  oak: { name: "Ekstockar", icon: { kind: "logs", bark: "#5e3c1e", end: "#c09460" } },
  copper: { name: "Kopparmalm", icon: { kind: "ore", color: "#d9813f" } },
  tin: { name: "Tennmalm", icon: { kind: "ore", color: "#c7d0d4" } },
  iron: { name: "Järnmalm", icon: { kind: "ore", color: "#8a4a32" } },
  shrimp: { name: "Råa räkor", icon: { kind: "fish", color: "#e6997a", belly: 9 } },
  anchovy: { name: "Råa ansjovisar", icon: { kind: "fish", color: "#8fa6b8", belly: 6 } },
  bronze_bar: { name: "Bronstacka", icon: { kind: "bar", color: "#c8873e", light: "#e6a85c" } },
  iron_bar: { name: "Järntacka", icon: { kind: "bar", color: "#6c6f74", light: "#9a9ea4" } },
  c_shrimp: { name: "Räkor", heal: 3, icon: { kind: "fish", color: "#d9662f", belly: 9 } },
  c_anchovy: { name: "Ansjovis", heal: 4, icon: { kind: "fish", color: "#a8743c", belly: 6 } },
  burnt: { name: "Bränd fisk", icon: { kind: "fish", color: "#2b2420", belly: 8 } },
  bones: { name: "Ben", icon: { kind: "bones" } },
  raw_meat: { name: "Rått kött", icon: { kind: "meat", color: "#c8505a" } },
  meat: { name: "Stekt kött", heal: 6, icon: { kind: "meat", color: "#8a4a24" } },
  bronze_sword: { name: "Bronssvärd", equip: { slot: "weapon", acc: 6, str: 5, speed: 3 }, icon: { kind: "sword", color: "#c8873e" } },
  iron_sword: { name: "Järnsvärd", equip: { slot: "weapon", acc: 14, str: 12, speed: 3 }, icon: { kind: "sword", color: "#9aa0a6" } },
  wooden_shield: { name: "Träsköld", equip: { slot: "shield", def: 6 }, icon: { kind: "shield", color: "#6a4a2c", rim: "#8a8478" } },
  bronze_shield: { name: "Bronssköld", equip: { slot: "shield", def: 12 }, icon: { kind: "shield", color: "#b07a3a", rim: "#5a3a1c" } },
} satisfies Record<string, ItemDef>;

/** The item's definition with every optional field visible. */
export const itemDef = (id: ItemId): ItemDef => ITEMS[id];
