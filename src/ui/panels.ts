import { GOALS } from "../data/goals";
import { ITEMS } from "../data/items";
import { SKILLS, XP_TABLE, levelForXp } from "../data/skills";
import type { ItemId, SkillId } from "../data/types";
import type { Game } from "../game/game";
import { $, esc } from "./hud";
import { SKILL_ICON, itemIcon } from "./icons";

type Tab = "inv" | "skills" | "quests" | "bank";

/** The tabbed side panel: pack, levels, quests and bank. */
export class Panels {
  private resetArmed = false;

  constructor(private game: Game) {
    $("tabs").addEventListener("click", e => {
      const b = (e.target as HTMLElement).closest("button");
      if (b?.dataset.tab) this.show(b.dataset.tab as Tab);
    });
    $("inv").addEventListener("click", e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>(".slot.full");
      if (b) this.game.useItem(Number(b.dataset.i));
    });
    $("pane-skills").addEventListener("click", e => { if ((e.target as HTMLElement).id === "unequip") this.game.unequip(); });
    $("pane-quests").addEventListener("click", e => {
      if ((e.target as HTMLElement).id !== "reset") return;
      if (!this.resetArmed) {
        this.resetArmed = true; this.renderQuests();
        setTimeout(() => { this.resetArmed = false; this.renderQuests(); }, 3000);
        return;
      }
      this.resetArmed = false;
      this.game.reset();
    });
  }

  show(tab: Tab): void {
    document.querySelectorAll<HTMLElement>("#tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    for (const p of ["inv", "skills", "quests", "bank"]) $("pane-" + p).hidden = p !== tab;
  }

  render(): void { this.renderInv(); this.renderSkills(); this.renderQuests(); this.renderBank(); }

  private renderInv(): void {
    const verb = (id: ItemId) => { const it = ITEMS[id] as { heal?: number; weapon?: unknown }; return it.heal ? "Ät" : it.weapon ? "Ta på" : "Släng"; };
    $("inv").innerHTML = this.game.s.inv.map((id, i) => id
      ? `<button class="slot full" data-i="${i}" title="${verb(id)} ${ITEMS[id].name}" aria-label="${verb(id)} ${ITEMS[id].name}">${itemIcon(id)}</button>`
      : `<div class="slot"></div>`).join("");
  }

  private renderSkills(): void {
    const s = this.game.s;
    const eq = `<div class="equip"><span>Vapen: <b>${s.weapon ? ITEMS[s.weapon].name : "inget"}</b></span>${s.weapon ? `<button class="btn" id="unequip">Ta av</button>` : ""}</div>`;
    const rows = (Object.keys(SKILLS) as SkillId[]).map(k => {
      const xp = s.xp[k], l = levelForXp(xp), lo = XP_TABLE[l], hi = XP_TABLE[Math.min(99, l + 1)];
      const pct = l >= 99 ? 100 : Math.round(((xp - lo) / (hi - lo)) * 100);
      const left = l >= 99 ? "max" : `${(hi - Math.floor(xp)).toLocaleString("sv-SE")} kvar till nivå ${l + 1}`;
      return `<div class="skill"><div class="ic">${SKILL_ICON[k]}</div><div class="nm">${SKILLS[k].name}</div><div class="lv">${l}<small>/99</small></div><div class="bar"><i style="width:${pct}%"></i></div><div class="xp">${Math.floor(xp).toLocaleString("sv-SE")} XP · ${left}</div></div>`;
    }).join("");
    $("pane-skills").innerHTML = eq + rows
      + `<div class="total"><span>Totalnivå</span><b>${this.game.totalLevel()}</b></div><div class="total"><span>Stridsnivå</span><b>${this.game.combatLevel()}</b></div>`;
  }

  private renderQuests(): void {
    const s = this.game.s;
    const quests = this.game.quests.log().map(q => {
      const label = q.status === "done" ? "Klart" : q.status === "active" ? "Pågår" : "Ej påbörjat";
      return `<div class="quest ${q.status}"><h4>${esc(q.name)}<span>${label}</span></h4><p>${esc(q.text)}</p></div>`;
    }).join("");
    const goals = GOALS.map(g => {
      const v = Math.min(g.target, g.value(s)), ok = !!s.goals[g.id];
      return `<div class="goal ${ok ? "done" : ""}"><span class="ck">${ok ? "✓" : ""}</span><span class="tx">${esc(g.text)}</span><span class="pg">${v}/${g.target}</span></div>`;
    }).join("");
    $("pane-quests").innerHTML = `<div class="secthead">Uppdrag</div>${quests}<div class="secthead">Mål</div>${goals}`
      + `<div class="row"><button class="btn danger" id="reset">${this.resetArmed ? "Klicka igen för att radera allt" : "Börja om"}</button></div>`;
  }

  private renderBank(): void {
    const s = this.game.s;
    const ids = (Object.keys(s.bank) as ItemId[]).filter(k => (s.bank[k] ?? 0) > 0);
    $("pane-bank").innerHTML = (ids.length
      ? `<div class="inv">${ids.map(id => `<div class="slot" title="${ITEMS[id].name}">${itemIcon(id)}<span class="n">${s.bank[id]}</span></div>`).join("")}</div>`
      : `<p class="paneHint" style="margin-top:0">Banken är tom.</p>`)
      + `<p class="paneHint">Klicka på bankkistan vid startplatsen för att sätta in allt du bär på. Totalt insatt: ${s.deposited}.</p>`;
  }
}
