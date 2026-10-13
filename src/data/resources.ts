import type { ItemId, ResourceDef, ResourceKind, StationDef, StationKind } from "./types";

export const RESOURCES: Record<ResourceKind, ResourceDef> = {
  tree: { name: "Gran", verb: "Hugg ned", skill: "wc", level: 1, xp: 25, item: "logs", deplete: 1, respawn: 8, start: "Du svingar yxan mot granen.", got: "Du får några stockar.", depletedName: "Stubbe" },
  oak: { name: "Ek", verb: "Hugg ned", skill: "wc", level: 15, xp: 37.5, item: "oak", deplete: 0.15, respawn: 14, start: "Du svingar yxan mot eken.", got: "Du får några ekstockar.", depletedName: "Stubbe" },
  copper: { name: "Kopparsten", verb: "Bryt", skill: "mining", level: 1, xp: 17.5, item: "copper", deplete: 1, respawn: 5, start: "Du hackar på stenen.", got: "Du bryter lite kopparmalm.", depletedName: "Tom sten" },
  tin: { name: "Tennsten", verb: "Bryt", skill: "mining", level: 1, xp: 17.5, item: "tin", deplete: 1, respawn: 5, start: "Du hackar på stenen.", got: "Du bryter lite tennmalm.", depletedName: "Tom sten" },
  iron: { name: "Järnsten", verb: "Bryt", skill: "mining", level: 15, xp: 35, item: "iron", deplete: 1, respawn: 9, start: "Du hackar på stenen.", got: "Du bryter lite järnmalm.", depletedName: "Tom sten" },
  fish: { name: "Fiskeplats", verb: "Fiska vid", skill: "fishing", level: 1, xp: 10, item: "shrimp", deplete: 0, respawn: 0, start: "Du kastar ut nätet.", got: "Du fångar några räkor." },
};

/** Extra catches a fishing spot can give once the player is good enough. */
export const FISH_TABLE: { item: ItemId; level: number; xp: number; chance: number; got: string }[] = [
  { item: "anchovy", level: 15, xp: 40, chance: 0.4, got: "Du fångar några ansjovisar." },
];

export const STATIONS: Record<StationKind, StationDef> = {
  bank: { name: "Bankkista", verb: "Sätt in i" },
  furnace: { name: "Smältugn", verb: "Smält vid", skill: "smithing" },
  anvil: { name: "Städ", verb: "Smid vid", skill: "smithing" },
  range: { name: "Spis", verb: "Laga mat på", skill: "cooking" },
  cave_entrance: { name: "Svartgrottan", verb: "Gå in i" },
  cave_exit: { name: "Grottans utgång", verb: "Klättra ut genom" },
};
