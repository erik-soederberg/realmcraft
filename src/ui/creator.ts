import { APPEARANCE, HAIR_STYLE_NAMES, randomAppearance, type Appearance } from "../data/appearance";
import type { NameRegistry } from "../game/names";
import { $ } from "./hud";

type ColorKey = "skin" | "hair" | "shirt" | "cape";

const SECTIONS: { key: keyof Appearance; label: string }[] = [
  { key: "skin", label: "Hudton" },
  { key: "hairStyle", label: "Frisyr" },
  { key: "hair", label: "Hårfärg" },
  { key: "beard", label: "Skägg" },
  { key: "shirt", label: "Tunika" },
  { key: "cape", label: "Mantel" },
];

/** First-run screen: pick a unique name and adjust how the character looks. */
export class Creator {
  private look!: Appearance;
  private nameOk = false;
  private checkSeq = 0;
  private timer = 0;

  constructor(
    private registry: NameRegistry,
    private onLook: (a: Appearance) => void,
    private onDone: (name: string, a: Appearance) => void,
  ) {
    $("copts").addEventListener("click", e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-k]");
      if (!b) return;
      const k = b.dataset.k as keyof Appearance;
      if (k === "beard") this.look.beard = b.dataset.v === "1";
      else this.look[k] = Number(b.dataset.v);
      this.changed();
    });
    $("crandom").addEventListener("click", () => { this.look = randomAppearance(); this.changed(); });
    const input = $<HTMLInputElement>("cname");
    input.addEventListener("input", () => {
      this.nameOk = false; this.syncStart();
      clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.checkName(), 250);
    });
    input.addEventListener("keydown", e => { if (e.key === "Enter") this.submit(); });
    $("cstart").addEventListener("click", () => this.submit());
  }

  open(initial: Appearance): void {
    this.look = { ...initial };
    $("creator").hidden = false;
    $("app").classList.add("creating");
    $<HTMLInputElement>("cname").value = "";
    this.setMsg("Mellan 3 och 12 tecken. Bokstäver, siffror och mellanslag.", "");
    this.nameOk = false;
    this.changed();
    setTimeout(() => $<HTMLInputElement>("cname").focus(), 50);
  }

  private close(): void {
    $("creator").hidden = true;
    $("app").classList.remove("creating");
  }

  private changed(): void {
    this.renderOptions();
    this.onLook(this.look);
  }

  private renderOptions(): void {
    const a = this.look;
    $("copts").innerHTML = SECTIONS.map(({ key, label }) => {
      let buttons: string;
      if (key === "beard") {
        buttons = [["0", "Nej"], ["1", "Ja"]].map(([v, t]) => `<button class="chip" data-k="beard" data-v="${v}" aria-pressed="${a.beard === (v === "1")}">${t}</button>`).join("");
      } else if (key === "hairStyle") {
        buttons = APPEARANCE.hairStyle.map((st, i) => `<button class="chip" data-k="hairStyle" data-v="${i}" aria-pressed="${a.hairStyle === i}">${HAIR_STYLE_NAMES[st]}</button>`).join("");
      } else {
        const list = APPEARANCE[key as ColorKey];
        buttons = list.map((c, i) => `<button class="swatch" data-k="${key}" data-v="${i}" aria-pressed="${a[key] === i}" aria-label="${label} ${i + 1}" style="background:${c}"></button>`).join("");
      }
      return `<div class="csec"><div class="clabel">${label}</div><div class="cchoices">${buttons}</div></div>`;
    }).join("");
  }

  private setMsg(text: string, kind: "" | "ok" | "bad"): void {
    const m = $("cnameMsg");
    m.textContent = text;
    m.className = "cmsg " + kind;
  }

  private syncStart(): void { $<HTMLButtonElement>("cstart").disabled = !this.nameOk; }

  private async checkName(): Promise<void> {
    const name = $<HTMLInputElement>("cname").value;
    if (!name.trim()) { this.setMsg("Mellan 3 och 12 tecken. Bokstäver, siffror och mellanslag.", ""); return; }
    const seq = ++this.checkSeq;
    const r = await this.registry.check(name);
    if (seq !== this.checkSeq) return;
    this.nameOk = r.ok;
    this.setMsg(r.ok ? `${name.trim()} är ledigt.` : r.reason, r.ok ? "ok" : "bad");
    this.syncStart();
  }

  private async submit(): Promise<void> {
    const name = $<HTMLInputElement>("cname").value.trim();
    const r = await this.registry.claim(name);
    if (!r.ok) { this.nameOk = false; this.setMsg(r.reason, "bad"); this.syncStart(); return; }
    this.close();
    this.onDone(name, this.look);
  }
}
