import type { QuestDef } from "./types";

/**
 * Quests are pure data. A quest moves between steps only through dialogue
 * actions (see npcs.ts), so adding a quest means adding one entry here and
 * the giver's dialogue nodes.
 */
export const QUESTS: QuestDef[] = [
  {
    id: "smith_bars",
    name: "Smedens tackor",
    giver: "arvid",
    summary: "Smeden Arvid vid ugnen behöver brons till byns verktyg.",
    steps: [
      { id: "bars", log: "Smält 3 bronstackor och ge dem till Arvid vid ugnen.", ready: [{ hasItems: { bronze_bar: 3 } }] },
    ],
    rewards: { xp: { smithing: 350, mining: 150 }, items: ["iron_sword"] },
  },
  {
    id: "fisher_supper",
    name: "Kvällsmat åt Tove",
    giver: "tove",
    summary: "Fiskaren Tove vid sjön har tappat sitt nät och vill ha mat till kvällen.",
    steps: [
      { id: "cook", log: "Fånga och laga 4 räkor och ge dem till Tove vid sjön.", ready: [{ hasItems: { c_shrimp: 4 } }] },
    ],
    rewards: { xp: { fishing: 250, cooking: 250 } },
  },
  {
    id: "wolf_trouble",
    name: "Vargarna i nordväst",
    giver: "bo",
    summary: "Jägaren Bo vill att någon tunnar ut vargflocken i skogen.",
    steps: [
      { id: "hunt", log: "Besegra 3 vargar i skogen nordväst om byn och berätta det för Bo.", ready: [{ killsSinceStart: { quest: "wolf_trouble", mob: "wolf", count: 3 } }] },
    ],
    rewards: { xp: { melee: 900, hp: 300 } },
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map(q => [q.id, q]));
