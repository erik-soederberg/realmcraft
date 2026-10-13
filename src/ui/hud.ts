import * as THREE from "three";
import { SKILLS } from "../data/skills";
import type { SkillId } from "../data/types";
import { MAX_LEVEL, expForLevel } from "../data/levels";

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Chat log, toasts, XP drops, hit splats and the health orb. */
export class Hud {
  private lines: { text: string; kind: string }[] = [];
  private toastTimer = 0;

  message(text: string, kind = ""): void {
    this.lines.push({ text, kind });
    if (this.lines.length > 7) this.lines.shift();
    $("chat").innerHTML = this.lines.map(l => `<p class="${l.kind}">${esc(l.text)}</p>`).join("");
  }

  toast(big: string, small: string): void {
    $("toastBig").textContent = big;
    $("toastSmall").textContent = small;
    $("toast").classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => $("toast").classList.remove("show"), 2200);
  }

  /** Rising "+30 Enhandsvapen" next to the minimap; no skill means character experience. */
  xpDrop(skill: SkillId | null, xp: number): void {
    const d = document.createElement("div");
    d.className = skill ? "drop" : "drop exp";
    d.innerHTML = `+${Math.round(xp * 10) / 10} <span>${skill ? SKILLS[skill].name : "XP"}</span>`;
    $("xpdrops").appendChild(d);
    setTimeout(() => d.remove(), 1700);
  }

  /** Floating combat text: "-3" in red for a hit, "Miss" for a miss, "Blockat" for a shield block, "+3" in green for healing. */
  splat(world: THREE.Vector3, amount: number, camera: THREE.Camera, canvas: HTMLCanvasElement, kind: "hit" | "heal" | "block" = "hit"): void {
    const v = world.clone(); v.y += 1.25; v.project(camera);
    const r = canvas.getBoundingClientRect();
    const d = document.createElement("div");
    const cls = kind !== "hit" ? kind : amount > 0 ? "hit" : "miss";
    d.className = "splat " + cls;
    d.textContent = cls === "heal" ? `+${amount}` : cls === "hit" ? `-${amount}` : cls === "block" ? "Blockat" : "Miss";
    d.style.left = `${((v.x + 1) / 2) * r.width + (Math.random() - 0.5) * 18}px`;
    d.style.top = `${((1 - v.y) / 2) * r.height}px`;
    $("app").appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }

  /** Character level beside the name, and the experience bar along the bottom. */
  level(level: number, exp: number): void {
    const lo = expForLevel(level), hi = expForLevel(level + 1), max = level >= MAX_LEVEL;
    const pct = max ? 100 : Math.round(((exp - lo) / (hi - lo)) * 1000) / 10;
    $("plevel").textContent = `Level ${level}`;
    ($("xpfill") as HTMLElement).style.width = `${pct}%`;
    $("xptext").textContent = max ? `Level ${level} · max` : `Level ${level} · ${Math.floor(exp - lo).toLocaleString("sv-SE")} / ${(hi - lo).toLocaleString("sv-SE")} XP`;
    $("xpbar").setAttribute("aria-valuenow", String(Math.floor(pct)));
  }

  hp(now: number, max: number): void {
    const o = $("hporb");
    o.textContent = `Hälsa ${now}/${max}`;
    o.classList.toggle("low", now <= max * 0.3);
  }

  hover(html: string): void { $("hover").innerHTML = html; }
  region(name: string): void { $("region").textContent = name; }
}
