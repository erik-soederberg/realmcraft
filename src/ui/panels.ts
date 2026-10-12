import { GOALS } from "../data/goals";
import { ITEMS, itemDef } from "../data/items";
import { QUESTS, QUEST_BY_ID } from "../data/quests";
import { SKILLS, XP_TABLE, levelForXp } from "../data/skills";
import type { EquipSlot, ItemId, SkillId } from "../data/types";
import { EQUIP_SLOTS } from "../game/state";
import type { Game } from "../game/game";
import { $, esc } from "./hud";
import { SKILL_ICON, itemIcon } from "./icons";

type Tab = "inv" | "equip" | "skills" | "quests" | "bank";
const TABS: Tab[] = ["inv", "equip", "skills", "quests", "bank"];

const SLOT_NAMES: Record<EquipSlot, string> = { head: "Huvud", weapon: "Vapen", body: "Kropp", shield: "Sköld", legs: "Ben" };

/** The tabbed side panel (pack, gear, levels, quest log, bank), the quest journal and the quest tracker. */
export class Panels {
  private resetArmed = false;

  constructor(private game: Game) {
    $("tabs").addEventListener("click", e => {
      const b = (e.target as HTMLElement).closest("button");
      if (!b?.dataset.tab) return;
      // Clicking the open tab folds the panel away, so the game view stays clear.
      const panel = $("panel");
      if (b.getAttribute("aria-selected") === "true" && !panel.classList.contains("collapsed")) panel.classList.add("collapsed");
      else this.show(b.dataset.tab as Tab);
    });
    $("inv").addEventListener("click", e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>(".slot.full");
      if (b) this.game.useItem(Number(b.dataset.i));
    });
    $("pane-equip").addEventListener("click", e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>(".eslot.full");
      if (b) this.game.unequip(b.dataset.slot as EquipSlot);
    });
    const openQuest = (e: Event) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>("[data-quest]");
      if (b) { this.openJournal(b.dataset.quest!); return true; }
      return false;
    };
    $("qtrack").addEventListener("click", openQuest);
    $("jclose").addEventListener("click", () => this.closeJournal());
    window.addEventListener("keydown", e => { if (e.key === "Escape") this.closeJournal(); });
    $("pane-quests").addEventListener("click", e => {
      if (openQuest(e)) return;
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
    $("panel").classList.remove("collapsed");
    document.querySelectorAll<HTMLElement>("#tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    for (const p of TABS) $("pane-" + p).hidden = p !== tab;
  }

  render(): void { this.renderInv(); this.renderEquip(); this.renderSkills(); this.renderQuests(); this.renderBank(); this.renderTracker(); if (this.journalId) this.renderJournal(); }

  private renderInv(): void {
    const verb = (id: ItemId) => { const it = itemDef(id); return it.heal ? "Ät" : it.equip ? "Ta på" : "Släng"; };
    $("inv").innerHTML = this.game.s.inv.map((id, i) => id
      ? `<button class="slot full" data-i="${i}" title="${verb(id)} ${ITEMS[id].name}" aria-label="${verb(id)} ${ITEMS[id].name}">${itemIcon(id)}</button>`
      : `<div class="slot"></div>`).join("");
  }

  private renderSkills(): void {
    const s = this.game.s;
    const rows = (Object.keys(SKILLS) as SkillId[]).map(k => {
      const xp = s.xp[k], l = levelForXp(xp), lo = XP_TABLE[l], hi = XP_TABLE[Math.min(99, l + 1)];
      const pct = l >= 99 ? 100 : Math.round(((xp - lo) / (hi - lo)) * 100);
      const left = l >= 99 ? "max" : `${(hi - Math.floor(xp)).toLocaleString("sv-SE")} kvar till nivå ${l + 1}`;
      return `<div class="skill"><div class="ic">${SKILL_ICON[k]}</div><div class="nm">${SKILLS[k].name}</div><div class="lv">${l}<small>/99</small></div><div class="bar"><i style="width:${pct}%"></i></div><div class="xp">${Math.floor(xp).toLocaleString("sv-SE")} XP · ${left}</div></div>`;
    }).join("");
    $("pane-skills").innerHTML = rows
      + `<div class="total"><span>Totalnivå</span><b>${this.game.totalLevel()}</b></div><div class="total"><span>Stridsnivå</span><b>${this.game.combatLevel()}</b></div>`;
  }

  private renderEquip(): void {
    const s = this.game.s, g = this.game.gearBonus();
    const slot = (k: EquipSlot) => {
      const id = s.equip[k];
      return id
        ? `<button class="eslot full ${k}" data-slot="${k}" title="Ta av ${ITEMS[id].name}" aria-label="${SLOT_NAMES[k]}: ${ITEMS[id].name}, klicka för att ta av">${itemIcon(id)}</button>`
        : `<div class="eslot ${k}" title="${SLOT_NAMES[k]}: tomt"><span>${SLOT_NAMES[k]}</span></div>`;
    };
    const worn = EQUIP_SLOTS.filter(k => s.equip[k]).map(k => `<li><span>${SLOT_NAMES[k]}</span>${ITEMS[s.equip[k]!].name}</li>`).join("");
    $("pane-equip").innerHTML = `<div class="doll">${EQUIP_SLOTS.map(slot).join("")}</div>`
      + `<div class="bonus"><div><span>Attack</span><b>+${g.acc}</b></div><div><span>Styrka</span><b>+${g.str}</b></div><div><span>Försvar</span><b>+${g.def}</b></div></div>`
      + `<p class="paneHint">Du tränar ${SKILLS[this.game.weaponStyle()].name.toLowerCase()} när du slåss med det här vapnet.${s.equip.shield ? ` Skölden blockerar ${Math.round(this.game.blockChance() * 100)} % av fiendens slag, och varje block tränar Sköld.` : ""}</p>`
      + (worn ? `<ul class="worn">${worn}</ul>` : `<p class="paneHint">Du har inget på dig. Klicka på en sak i packningen för att ta på den.</p>`);
  }

  private renderQuests(): void {
    const s = this.game.s;
    const label = { done: "Klart", active: "Pågår", available: "Ej påbörjat" };
    const order = { active: 0, available: 1, done: 2 };
    const quests = QUESTS.map(q => this.game.quests.journal(q)).sort((a, b) => order[a.status] - order[b.status]).map(j => {
      const line = j.status === "active" ? (j.ready ? `Klart att lämna in hos ${j.giver.split(" ").pop()}.` : j.current ?? "") : j.summary;
      return `<button class="quest ${j.status}" data-quest="${j.id}"><h4>${esc(j.name)}<span>${label[j.status]}</span></h4><p>${esc(line)}</p></button>`;
    }).join("");
    const goals = GOALS.map(g => {
      const v = Math.min(g.target, g.value(s)), ok = !!s.goals[g.id];
      return `<div class="goal ${ok ? "done" : ""}"><span class="ck">${ok ? "✓" : ""}</span><span class="tx">${esc(g.text)}</span><span class="pg">${v}/${g.target}</span></div>`;
    }).join("");
    $("pane-quests").innerHTML = `<div class="secthead">Uppdragslogg</div>${quests}<div class="secthead">Mål</div>${goals}`
      + `<div class="row"><button class="btn danger" id="reset">${this.resetArmed ? "Klicka igen för att radera allt" : "Börja om"}</button></div>`;
  }

  /** Small always-on list of active quests with their current progress. */
  private renderTracker(): void {
    const active = QUESTS.map(q => this.game.quests.journal(q)).filter(j => j.status === "active");
    const el = $("qtrack");
    el.hidden = !active.length;
    el.innerHTML = active.map(j => {
      const prog = j.ready ? `<i class="ok">Lämna in hos ${esc(j.giver)}</i>` : j.progress.map(p => `<i>${esc(p.label)} ${p.have}/${p.need}</i>`).join("");
      return `<button data-quest="${j.id}" title="Öppna uppdraget"><b>${esc(j.name)}</b>${prog}</button>`;
    }).join("");
  }

  private journalId: string | null = null;

  openJournal(id: string): void {
    if (!QUEST_BY_ID[id]) return;
    this.journalId = id;
    this.renderJournal();
    $("journal").hidden = false;
    $<HTMLButtonElement>("jclose").focus();
  }

  closeJournal(): void { this.journalId = null; $("journal").hidden = true; }

  private renderJournal(): void {
    const j = this.game.quests.journal(QUEST_BY_ID[this.journalId!]);
    const state = { done: "Klart", active: "Pågår", available: "Ej påbörjat" }[j.status];
    let body = `<p class="jsum">${esc(j.summary)}</p>`;
    if (j.status === "available") body += `<p>Prata med <b>${esc(j.giver)}</b> för att börja uppdraget.</p>`;
    body += j.done.map(t => `<p class="jdone">${esc(t)}</p>`).join("");
    if (j.current) {
      body += `<p class="jnow">${esc(j.current)}</p>`;
      if (j.progress.length) body += `<ul class="jprog">${j.progress.map(p => `<li class="${p.have >= p.need ? "ok" : ""}"><span>${esc(p.label)}</span><b>${p.have}/${p.need}</b></li>`).join("")}</ul>`;
      if (j.ready) body += `<p class="jready">Allt är klart. Gå tillbaka till ${esc(j.giver)}.</p>`;
    }
    if (j.status === "done") body += `<p class="jready">Uppdraget är klart!</p>`;
    body += `<div class="secthead">Belöning</div><ul class="jrew">${j.rewards.map(r => `<li>${esc(r)}</li>`).join("")}</ul>`;
    $("jbody").innerHTML = `<h2 id="jtitle">${esc(j.name)}</h2><div class="jmeta">${state}${j.giver ? ` · Uppdragsgivare: ${esc(j.giver)}` : ""}</div>${body}`;
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
