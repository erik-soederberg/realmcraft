import { NPCS } from "../data/npcs";

export const NAME_MIN = 3;
export const NAME_MAX = 12;

export type NameCheck = { ok: true } | { ok: false; reason: string };

const RESERVED = ["admin", "administrator", "moderator", "mod", "ekdal", "system", "server", "support", "claude", "spelledare"];

/** Case- and spacing-insensitive form used to compare names. */
export const nameKey = (n: string) => n.trim().toLowerCase().replace(/[\s_]+/g, "");

/** Rules every player name follows, wherever it is checked. */
export function validateName(raw: string): NameCheck {
  const n = raw.trim();
  if (n.length < NAME_MIN) return { ok: false, reason: `Namnet måste ha minst ${NAME_MIN} tecken.` };
  if (n.length > NAME_MAX) return { ok: false, reason: `Namnet får ha högst ${NAME_MAX} tecken.` };
  if (!/^[A-Za-zÅÄÖåäöÉé]/.test(n)) return { ok: false, reason: "Namnet måste börja med en bokstav." };
  if (!/^[A-Za-zÅÄÖåäöÉé0-9 _]+$/.test(n)) return { ok: false, reason: "Använd bara bokstäver, siffror, mellanslag och understreck." };
  if (/[ _]{2}/.test(n)) return { ok: false, reason: "Inga dubbla mellanslag eller understreck." };
  if (/[ _]$/.test(n)) return { ok: false, reason: "Namnet får inte sluta med mellanslag eller understreck." };
  const key = nameKey(n);
  if (RESERVED.includes(key) || NPCS.some(npc => npc.name.split(" ").some(part => nameKey(part) === key))) return { ok: false, reason: "Det namnet är reserverat." };
  return { ok: true };
}

/**
 * Where names are claimed. Today names are only unique on this device; when
 * the game server exists, a ServerNameRegistry implements the same interface
 * and makes them unique across all players.
 */
export interface NameRegistry {
  check(name: string): Promise<NameCheck>;
  claim(name: string): Promise<NameCheck>;
  release(name: string): Promise<void>;
}

const STORE = "ekdal-names-v1";

export class LocalNameRegistry implements NameRegistry {
  private read(): string[] {
    try { const v = JSON.parse(localStorage.getItem(STORE) || "[]"); return Array.isArray(v) ? v.filter(x => typeof x === "string") : []; } catch { return []; }
  }
  private write(list: string[]): void {
    try { localStorage.setItem(STORE, JSON.stringify(list)); } catch { /* storage unavailable */ }
  }
  async check(name: string): Promise<NameCheck> {
    const v = validateName(name);
    if (!v.ok) return v;
    return this.read().includes(nameKey(name)) ? { ok: false, reason: "Namnet är redan taget." } : { ok: true };
  }
  async claim(name: string): Promise<NameCheck> {
    const v = await this.check(name);
    if (v.ok) this.write([...this.read(), nameKey(name)]);
    return v;
  }
  async release(name: string): Promise<void> {
    this.write(this.read().filter(k => k !== nameKey(name)));
  }
}
