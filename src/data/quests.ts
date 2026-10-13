import type { QuestDef } from "./types";

/**
 * Quests are pure data. A quest moves between steps only through dialogue
 * actions (see npcs.ts), so adding a quest means adding one entry here and
 * the giver's dialogue nodes.
 */
export const QUESTS: QuestDef[] = [
  {
    id: "longhouse",
    name: "Vägen till Långhuset",
    giver: "ragnar",
    turnIn: "ingrid",
    summary: "Vakten Ragnar vill att du presenterar dig för byäldste Ingrid i Långhuset.",
    steps: [
      { id: "visit", log: "Följ vägen österut till Långhuset och prata med byäldste Ingrid därinne." },
    ],
    rewards: { exp: 150 },
  },
  {
    id: "imp_camp",
    name: "Vättelägret",
    giver: "ingrid",
    requires: [{ quest: "longhouse", stage: "done" }],
    summary: "Vättar har slagit läger i skogen sydost om Långhuset och stjäl från byns förråd.",
    steps: [
      { id: "hunt", log: "Besegra 5 vättar i lägret sydost om Långhuset och berätta det för Ingrid.", ready: [{ killsSinceStart: { quest: "imp_camp", mob: "imp", count: 5 } }] },
    ],
    rewards: { exp: 300, xp: { onehand: 60, hp: 30 }, items: ["bronze_dagger"] },
  },
  {
    id: "letter",
    name: "Ett brev till Stenhöjden",
    giver: "ingrid",
    turnIn: "stina",
    requires: [{ quest: "imp_camp", stage: "done" }],
    summary: "Ingrid behöver få ett brev till gruvfogden Stina på Stenhöjden.",
    steps: [
      { id: "deliver", log: "Ta brevet österut till gruvfogden Stina på Stenhöjden.", ready: [{ hasItems: { letter: 1 } }] },
    ],
    rewards: { exp: 250 },
  },
  {
    id: "smith_bars",
    name: "Smedens tackor",
    giver: "arvid",
    summary: "Smeden Arvid vid ugnen behöver brons till byns verktyg.",
    steps: [
      { id: "bars", log: "Smält 3 bronstackor och ge dem till Arvid vid ugnen.", ready: [{ hasItems: { bronze_bar: 3 } }] },
    ],
    rewards: { exp: 250, xp: { smithing: 120, mining: 60, onehand: 50 }, items: ["iron_sword"] },
  },
  {
    id: "fisher_supper",
    name: "Kvällsmat åt Tove",
    giver: "tove",
    summary: "Fiskaren Tove vid sjön har tappat sitt nät och vill ha mat till kvällen.",
    steps: [
      { id: "cook", log: "Fånga och laga 4 räkor och ge dem till Tove vid sjön.", ready: [{ hasItems: { c_shrimp: 4 } }] },
    ],
    rewards: { exp: 200, xp: { fishing: 100, cooking: 100 } },
  },
  {
    id: "wolf_trouble",
    name: "Vargarna i nordväst",
    giver: "bo",
    summary: "Jägaren Bo vill att någon tunnar ut vargflocken i skogen.",
    steps: [
      { id: "hunt", log: "Besegra 3 vargar i skogen nordväst om byn och berätta det för Bo.", ready: [{ killsSinceStart: { quest: "wolf_trouble", mob: "wolf", count: 3 } }] },
    ],
    rewards: { exp: 350, xp: { onehand: 120, bow: 80, shield: 80, hp: 60 }, items: ["bronze_shield"] },
  },
  {
    id: "spider_cave",
    name: "Spindlarna i Svartgrottan",
    giver: "stina",
    summary: "Gruvfogden Stina på Stenhöjden har fått stänga gruvan sedan spindlar tog över Svartgrottan.",
    steps: [
      { id: "hunt", log: "Besegra 5 grottspindlar i Svartgrottan och berätta det för Stina.", ready: [{ killsSinceStart: { quest: "spider_cave", mob: "spider", count: 5 } }] },
    ],
    rewards: { exp: 600, xp: { mining: 200, shield: 150, hp: 100 }, items: ["iron_shield"] },
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map(q => [q.id, q]));
