import type { Interactable } from "../entities/entities";
import { Tile, type World } from "../world/world";

const COLORS: Record<number, string> = {
  [Tile.Grass]: "#3f4a26", [Tile.Water]: "#24414a", [Tile.Sand]: "#8a7d5c", [Tile.Path]: "#6a5a45", [Tile.Dirt]: "#5a4f43", [Tile.Rock]: "#1c1a18",
};
const PX = 6, ZOOM = 1.7;

/** Rotating minimap drawn from a pre-rendered terrain image plus live dots. */
export class Minimap {
  private base: HTMLCanvasElement;
  private minX: number;
  private minZ: number;
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement, world: World) {
    this.ctx = canvas.getContext("2d")!;
    this.minX = Math.min(...world.regions.map(r => r.ox));
    this.minZ = Math.min(...world.regions.map(r => r.oz));
    const maxX = Math.max(...world.regions.map(r => r.ox + r.w)), maxZ = Math.max(...world.regions.map(r => r.oz + r.h));
    this.base = document.createElement("canvas");
    this.base.width = (maxX - this.minX) * PX;
    this.base.height = (maxZ - this.minZ) * PX;
    const c = this.base.getContext("2d")!;
    for (const r of world.regions) for (let z = r.oz; z < r.oz + r.h; z++) for (let x = r.ox; x < r.ox + r.w; x++) {
      c.fillStyle = COLORS[world.tile(x, z)] ?? "#000";
      c.fillRect((x - this.minX) * PX, (z - this.minZ) * PX, PX, PX);
    }
  }

  draw(px: number, pz: number, yaw: number, things: Interactable[], dest: [number, number] | null): void {
    const { ctx, canvas } = this, w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2;
    ctx.save();
    ctx.fillStyle = "#0d1512"; ctx.fillRect(0, 0, w, h);
    ctx.translate(cx, cy); ctx.rotate(yaw); ctx.scale(ZOOM, ZOOM);
    ctx.translate(-(px - this.minX) * PX, -(pz - this.minZ) * PX);
    ctx.drawImage(this.base, 0, 0);
    const dot = (x: number, z: number, color: string, r: number) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc((x - this.minX) * PX, (z - this.minZ) * PX, r, 0, Math.PI * 2); ctx.fill(); };
    for (const t of things) {
      if (t.type === "resource") {
        const k = t.kind;
        const col = k === "fish" ? "#cfefff" : k === "tree" || k === "oak" ? (t.depleted ? "#4a3a28" : k === "oak" ? "#2c3818" : "#1c2c1c") : t.depleted ? "#555" : "#9a9690";
        dot(t.x + 0.5, t.z + 0.5, col, k === "fish" ? 4.5 : 3.6);
      } else if (t.type === "station") dot(t.x + 0.5, t.z + 0.5, t.kind === "bank" ? "#f2c94c" : "#ff8a3a", 4.5);
      else if (t.type === "mob") { if (!t.dead) dot(t.fx, t.fz, "#f3e27a", 3); }
      else dot(t.x + 0.5, t.z + 0.5, "#6fd0d0", 4.5);
    }
    if (dest) { ctx.fillStyle = "#ff4a3a"; ctx.fillRect((dest[0] - this.minX) * PX + 1, (dest[1] - this.minZ) * PX + 1, PX - 2, PX - 2); }
    ctx.restore();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(cx - 3, cy - 3, 6, 6);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(yaw);
    ctx.fillStyle = "#d6a644"; ctx.font = "bold 22px 'Alegreya Sans SC', sans-serif"; ctx.textAlign = "center"; ctx.fillText("N", 0, -cy + 26);
    ctx.restore();
  }

  /** Converts a click on the minimap to a world tile. */
  toWorld(clientX: number, clientY: number, px: number, pz: number, yaw: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    const dx = (clientX - r.left - r.width / 2) * (this.canvas.width / r.width), dy = (clientY - r.top - r.height / 2) * (this.canvas.height / r.height);
    const c = Math.cos(-yaw), s = Math.sin(-yaw);
    return [Math.floor((dx * c - dy * s) / (PX * ZOOM) + px), Math.floor((dx * s + dy * c) / (PX * ZOOM) + pz)];
  }
}
