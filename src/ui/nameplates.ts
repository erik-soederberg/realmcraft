import * as THREE from "three";
import { $, esc } from "./hud";

export interface PlateInfo {
  key: string;
  /** World position of the plate's bottom edge. */
  at: THREE.Vector3;
  kind: "enemy" | "npc";
  name: string;
  level?: number;
  aggressive?: boolean;
}

/** Name tags over monsters and people, drawn as HTML so the text stays crisp. */
export class NamePlates {
  private plates = new Map<string, { el: HTMLDivElement; sig: string }>();
  private v = new THREE.Vector3();

  /** Shows one plate per entry and hides the rest. */
  update(entries: PlateInfo[], playerLevel: number, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    const w = canvas.clientWidth, h = canvas.clientHeight, seen = new Set<string>();
    for (const e of entries) {
      this.v.copy(e.at).project(camera);
      if (this.v.z > 1 || this.v.x < -1.1 || this.v.x > 1.1 || this.v.y < -1.1 || this.v.y > 1.1) continue;
      seen.add(e.key);
      let p = this.plates.get(e.key);
      if (!p) { const el = document.createElement("div"); $("labels").appendChild(el); p = { el, sig: "" }; this.plates.set(e.key, p); }
      const diff = (e.level ?? 0) - playerLevel, tier = diff <= -3 ? "easy" : diff >= 3 ? "hard" : "even";
      const sig = `${e.kind}|${e.name}|${e.level}|${tier}|${e.aggressive}`;
      if (sig !== p.sig) {
        p.sig = sig;
        p.el.className = `plate ${e.kind}${e.aggressive ? " aggr" : ""}`;
        p.el.innerHTML = e.kind === "enemy"
          ? `<span>${esc(e.name)}</span><span class="lv ${tier}">Level ${e.level}</span>`
          : `<span>${esc(e.name)}</span>`;
      }
      p.el.style.display = "";
      p.el.style.transform = `translate(${((this.v.x + 1) / 2) * w}px, ${((1 - this.v.y) / 2) * h}px) translate(-50%, -100%)`;
    }
    for (const [k, p] of this.plates) if (!seen.has(k)) p.el.style.display = "none";
  }

  hideAll(): void { for (const p of this.plates.values()) p.el.style.display = "none"; }
}
