import { fbm, hash, smooth } from "../core/noise";
import type { RegionDef } from "../data/types";

export enum Tile { Grass = 0, Water = 1, Sand = 2, Path = 3, Dirt = 4, Void = 255 }
export const WATER_LEVEL = -0.14;

/** One authored area of the world with its own tile grid. */
export class Region {
  readonly ox: number;
  readonly oz: number;
  readonly w: number;
  readonly h: number;
  readonly tiles: Uint8Array;
  readonly blocked: Uint8Array;

  constructor(readonly def: RegionDef) {
    [this.ox, this.oz] = def.origin;
    [this.w, this.h] = def.size;
    this.tiles = new Uint8Array(this.w * this.h);
    this.blocked = new Uint8Array(this.w * this.h);
    generateTiles(this);
    for (let i = 0; i < this.tiles.length; i++) if (this.tiles[i] === Tile.Water) this.blocked[i] = 1;
  }
  contains(x: number, z: number): boolean {
    return x >= this.ox && z >= this.oz && x < this.ox + this.w && z < this.oz + this.h;
  }
  /** Index from world coordinates. */
  index(x: number, z: number): number { return (z - this.oz) * this.w + (x - this.ox); }
  localTile(lx: number, lz: number): Tile {
    return lx >= 0 && lz >= 0 && lx < this.w && lz < this.h ? this.tiles[lz * this.w + lx] : Tile.Void;
  }
}

function generateTiles(r: Region): void {
  const { w, h, tiles, def } = r;
  const set = (x: number, z: number, t: Tile) => { if (x >= 0 && z >= 0 && x < w && z < h) tiles[z * w + x] = t; };
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const wx = x + r.ox, wz = z + r.oz;
    for (const f of def.features) {
      if (f.type === "lake" && Math.hypot(x - f.x, z - f.z) + (fbm(wx * 0.25, wz * 0.25) - 0.5) * 5 < f.r) tiles[z * w + x] = Tile.Water;
      if (f.type === "river" && z >= f.z0 && z <= f.z1 && Math.abs(x - (f.x + Math.sin(z * 0.35) * f.wiggle)) < f.width) tiles[z * w + x] = Tile.Water;
      if (f.type === "quarry" && tiles[z * w + x] !== Tile.Water && Math.hypot(x - f.x, z - f.z) + (fbm(wx * 0.3 + 9, wz * 0.3) - 0.5) * 3 < f.r) tiles[z * w + x] = Tile.Dirt;
    }
  }
  // beaches
  const water = (x: number, z: number) => x >= 0 && z >= 0 && x < w && z < h && tiles[z * w + x] === Tile.Water;
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    if (tiles[z * w + x] !== Tile.Grass) continue;
    let near = false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (water(x + dx, z + dz)) near = true;
    if (near) tiles[z * w + x] = Tile.Sand;
  }
  // winding paths between the given points
  for (const f of def.features) {
    if (f.type !== "path") continue;
    for (let p = 0; p + 1 < f.points.length; p++) {
      const [ax, az] = f.points[p], [bx, bz] = f.points[p + 1];
      const steps = Math.ceil(Math.hypot(bx - ax, bz - az) * 3);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, wob = Math.sin(t * Math.PI * 2) * 1.2;
        const x = Math.round(ax + (bx - ax) * t + wob * 0.6), z = Math.round(az + (bz - az) * t - wob * 0.4);
        for (const dx of [0, 1]) if (!water(x + dx, z)) set(x + dx, z, Tile.Path);
      }
    }
  }
}

/**
 * The whole world: a set of regions placed on one global tile grid. Height is
 * a function of world coordinates, so neighbouring regions meet without seams.
 */
export class World {
  readonly regions: Region[];
  private baseCache = new Map<number, number>();

  constructor(defs: RegionDef[]) {
    this.regions = defs.map(d => new Region(d));
  }

  regionAt(x: number, z: number): Region | undefined {
    for (const r of this.regions) if (r.contains(x, z)) return r;
    return undefined;
  }
  tile(x: number, z: number): Tile {
    const r = this.regionAt(x, z);
    return r ? r.tiles[r.index(x, z)] : Tile.Void;
  }
  isBlocked(x: number, z: number): boolean {
    const r = this.regionAt(x, z);
    return !r || r.blocked[r.index(x, z)] === 1;
  }
  setBlocked(x: number, z: number, b: boolean): void {
    const r = this.regionAt(x, z);
    if (r) r.blocked[r.index(x, z)] = b ? 1 : 0;
  }

  /** Base height of a tile centre before smoothing. */
  private tileBase(x: number, z: number): number {
    const key = (x + 4096) * 8192 + (z + 4096);
    let v = this.baseCache.get(key);
    if (v !== undefined) return v;
    const t = this.tile(x, z);
    const hills = fbm(x * 0.09 + 3, z * 0.09 + 11) * 1.3 + fbm(x * 0.3, z * 0.3) * 0.25;
    v = t === Tile.Water ? -0.75 : t === Tile.Sand ? hills * 0.15 : t === Tile.Path ? 0.05 + hills * 0.7
      : t === Tile.Dirt ? 0.35 + hills * 0.8 + fbm(x * 0.45, z * 0.45) * 0.5 : 0.08 + hills;
    this.baseCache.set(key, v);
    return v;
  }
  private bilinear(fx: number, fz: number, f: (x: number, z: number) => number): number {
    const u = fx - 0.5, v = fz - 0.5, x0 = Math.floor(u), z0 = Math.floor(v), tx = smooth(u - x0), tz = smooth(v - z0);
    return (f(x0, z0) * (1 - tx) + f(x0 + 1, z0) * tx) * (1 - tz) + (f(x0, z0 + 1) * (1 - tx) + f(x0 + 1, z0 + 1) * tx) * tz;
  }
  waterAmount(fx: number, fz: number): number {
    return this.bilinear(fx, fz, (x, z) => (this.tile(x, z) === Tile.Water ? 1 : 0));
  }
  heightAt(fx: number, fz: number): number {
    const w = Math.min(1, this.waterAmount(fx, fz) * 1.6);
    const h = this.bilinear(fx, fz, (x, z) => this.tileBase(x, z)) + (fbm(fx * 0.7 + 40, fz * 0.7) - 0.5) * 0.16;
    return h * (1 - w) - 0.8 * w;
  }
  tileY(x: number, z: number): number { return this.heightAt(x + 0.5, z + 0.5); }

  /** Nearest free land tile to a wanted spot, for placing content robustly. */
  findFree(x: number, z: number, maxR = 8): [number, number] | null {
    for (let r = 0; r <= maxR; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const X = x + dx, Z = z + dz;
      if (!this.isBlocked(X, Z) && this.tile(X, Z) !== Tile.Water) return [X, Z];
    }
    return null;
  }

  /** Deterministic per-tile random value, handy for scattering props. */
  rand(x: number, z: number, salt = 0): number { return hash(x * 31 + salt, z * 17 - salt); }
}
