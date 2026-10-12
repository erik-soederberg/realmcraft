/**
 * Tiny typed event bus. Game systems (quests, goals, UI) listen to gameplay
 * events instead of calling each other directly, which keeps new content
 * from having to touch the core loop.
 */
import type { ItemId, MobId, SkillId } from "../data/types";

export interface GameEvents {
  gather: { item: ItemId };
  make: { item: ItemId };
  kill: { mob: MobId };
  deposit: { count: number };
  xp: { skill: SkillId; amount: number };
  levelUp: { skill: SkillId; level: number };
  inventory: Record<string, never>;
  quest: { quest: string };
  hp: Record<string, never>;
}

type Handler<T> = (payload: T) => void;

class EventBus {
  private handlers = new Map<keyof GameEvents, Handler<never>[]>();
  on<K extends keyof GameEvents>(type: K, fn: Handler<GameEvents[K]>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(fn as Handler<never>);
    this.handlers.set(type, list);
  }
  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void {
    for (const fn of this.handlers.get(type) ?? []) (fn as Handler<GameEvents[K]>)(payload);
  }
}

export const events = new EventBus();
