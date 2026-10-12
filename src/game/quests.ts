import { events } from "../core/events";
import { ITEMS } from "../data/items";
import { QUEST_BY_ID, QUESTS } from "../data/quests";
import { MOBS } from "../data/mobs";
import { NPCS } from "../data/npcs";
import { levelForXp, SKILLS } from "../data/skills";
import type { Condition, DialogueAction, DialogueNode, ItemId, NpcDef, QuestDef, SkillId } from "../data/types";
import type { GameState } from "./state";

export const NOT_STARTED = "not_started";
export const DONE = "done";

/** Interprets quest and dialogue data against the player's state. */
export class QuestEngine {
  constructor(
    private s: () => GameState,
    private hooks: {
      take(items: Partial<Record<ItemId, number>>): void;
      give(item: ItemId): boolean;
      xp(skill: SkillId, amount: number): void;
      message(text: string, kind?: string): void;
      toast(big: string, small: string): void;
    },
  ) {}

  stage(quest: string): string { return this.s().quests[quest] ?? NOT_STARTED; }

  count(item: ItemId): number { return this.s().inv.filter(i => i === item).length; }

  check(c: Condition): boolean {
    const s = this.s();
    if ("not" in c) return !this.check(c.not);
    if ("quest" in c) { const st = this.stage(c.quest); return Array.isArray(c.stage) ? c.stage.includes(st) : c.stage === st; }
    if ("hasItems" in c) return Object.entries(c.hasItems).every(([id, n]) => this.count(id as ItemId) >= (n ?? 0));
    if ("killsSinceStart" in c) {
      const k = c.killsSinceStart, base = s.questStart[k.quest]?.[k.mob] ?? 0;
      return (s.kills[k.mob] ?? 0) - base >= k.count;
    }
    if ("level" in c) return levelForXp(s.xp[c.level.skill]) >= c.level.min;
    return false;
  }
  checkAll(cs?: Condition[]): boolean { return !cs || cs.every(c => this.check(c)); }

  nodeFor(npc: NpcDef): DialogueNode | undefined { return npc.dialogue.find(n => this.checkAll(n.when)); }

  run(actions: DialogueAction[] = []): void {
    const s = this.s();
    for (const a of actions) {
      if ("take" in a) this.hooks.take(a.take);
      else if ("startQuest" in a) {
        const q = QUEST_BY_ID[a.startQuest]; if (!q) continue;
        s.quests[q.id] = q.steps[0].id;
        s.questStart[q.id] = { ...s.kills };
        this.hooks.message(`Nytt uppdrag: ${q.name}.`, "sys");
        this.hooks.toast("Nytt uppdrag", q.name);
        events.emit("quest", { quest: q.id });
      } else if ("setStage" in a) {
        s.quests[a.setStage.quest] = a.setStage.stage;
        events.emit("quest", { quest: a.setStage.quest });
      } else if ("completeQuest" in a) {
        const q = QUEST_BY_ID[a.completeQuest]; if (!q) continue;
        s.quests[q.id] = DONE;
        const parts: string[] = [];
        for (const [sk, xp] of Object.entries(q.rewards.xp ?? {})) { this.hooks.xp(sk as SkillId, xp ?? 0); parts.push(`${xp} XP i ${SKILLS[sk as SkillId].name}`); }
        for (const it of q.rewards.items ?? []) { if (!this.hooks.give(it)) s.bank[it] = (s.bank[it] ?? 0) + 1; parts.push(ITEMS[it].name.toLowerCase()); }
        this.hooks.message(`Uppdrag klart: ${q.name}. Belöning: ${parts.join(", ")}.`, "lvl");
        this.hooks.toast("Uppdrag klart", q.name);
        events.emit("quest", { quest: q.id });
      }
    }
  }

  /** "!" when the NPC has a quest to give, "?" when one can be handed in. */
  marker(npc: NpcDef): "!" | "?" | null {
    let mark: "!" | "?" | null = null;
    for (const id of npc.quests) {
      const q = QUEST_BY_ID[id]; if (!q) continue;
      const st = this.stage(id);
      if (st === NOT_STARTED) mark = mark ?? "!";
      else if (st !== DONE) { const step = q.steps.find(x => x.id === st); if (step && this.checkAll(step.ready)) return "?"; }
    }
    return mark;
  }

  /** Countable parts of a step's hand-in condition, such as "Vargar 1/3". */
  progress(c: Condition[] = []): { label: string; have: number; need: number }[] {
    const s = this.s(), out: { label: string; have: number; need: number }[] = [];
    for (const x of c) {
      if ("hasItems" in x) for (const [id, n] of Object.entries(x.hasItems)) out.push({ label: ITEMS[id as ItemId].name, have: Math.min(n ?? 0, this.count(id as ItemId)), need: n ?? 0 });
      else if ("killsSinceStart" in x) {
        const k = x.killsSinceStart, have = (s.kills[k.mob] ?? 0) - (s.questStart[k.quest]?.[k.mob] ?? 0);
        out.push({ label: `${MOBS[k.mob].plural} besegrade`, have: Math.min(k.count, have), need: k.count });
      } else if ("level" in x) out.push({ label: `Nivå i ${SKILLS[x.level.skill].name}`, have: Math.min(x.level.min, levelForXp(s.xp[x.level.skill])), need: x.level.min });
    }
    return out;
  }

  /** Everything the quest journal shows for one quest. */
  journal(q: QuestDef) {
    const st = this.stage(q.id), giver = NPCS.find(n => n.id === q.giver);
    const idx = st === DONE ? q.steps.length : q.steps.findIndex(x => x.id === st);
    const status: "active" | "done" | "available" = st === DONE ? "done" : st === NOT_STARTED ? "available" : "active";
    const current = status === "active" ? q.steps[idx] : undefined;
    const rewards = [
      ...Object.entries(q.rewards.xp ?? {}).map(([sk, xp]) => `${xp} XP i ${SKILLS[sk as SkillId].name}`),
      ...(q.rewards.items ?? []).map(it => ITEMS[it].name),
    ];
    return {
      id: q.id, name: q.name, summary: q.summary, status, giver: giver?.name ?? "",
      done: q.steps.slice(0, Math.max(0, idx)).map(x => x.log),
      current: current?.log, ready: current ? this.checkAll(current.ready) : false,
      progress: current ? this.progress(current.ready) : [],
      rewards,
    };
  }

  log(): { name: string; status: "active" | "done" | "available"; text: string }[] {
    return QUESTS.map(q => {
      const st = this.stage(q.id);
      if (st === DONE) return { name: q.name, status: "done" as const, text: q.summary };
      if (st === NOT_STARTED) return { name: q.name, status: "available" as const, text: q.summary };
      const step = q.steps.find(x => x.id === st);
      return { name: q.name, status: "active" as const, text: step?.log ?? q.summary };
    });
  }
}
