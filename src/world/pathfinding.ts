import type { World } from "./world";

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
export const ORTHO: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/** Search radius in tiles. Keeps path cost constant no matter how large the world grows. */
const R = 40, S = R * 2 + 1;

export interface Reach {
  /** Steps from the start, or -1 when unreachable, indexed by world tile. */
  dist(x: number, z: number): number;
  /** Tiles to walk, excluding the start. */
  pathTo(x: number, z: number): [number, number][];
}

/** 8-direction breadth-first search with no corner cutting, inside a window around the start. */
export function reach(world: World, sx: number, sz: number): Reach {
  const dist = new Int16Array(S * S).fill(-1), prev = new Int32Array(S * S).fill(-1), q = new Int32Array(S * S);
  const ox = sx - R, oz = sz - R;
  const li = (x: number, z: number) => { const lx = x - ox, lz = z - oz; return lx < 0 || lz < 0 || lx >= S || lz >= S ? -1 : lz * S + lx; };
  let head = 0, tail = 0;
  const s = li(sx, sz); dist[s] = 0; q[tail++] = s;
  while (head < tail) {
    const c = q[head++], cx = (c % S) + ox, cz = ((c / S) | 0) + oz;
    for (const [dx, dz] of DIRS) {
      const nx = cx + dx, nz = cz + dz, n = li(nx, nz);
      if (n < 0 || dist[n] >= 0 || world.isBlocked(nx, nz)) continue;
      if (dx && dz && (world.isBlocked(cx + dx, cz) || world.isBlocked(cx, cz + dz))) continue;
      dist[n] = dist[c] + 1; prev[n] = c; q[tail++] = n;
    }
  }
  return {
    dist: (x, z) => { const i = li(x, z); return i < 0 ? -1 : dist[i]; },
    pathTo: (x, z) => {
      const out: [number, number][] = [];
      let c = li(x, z);
      if (c < 0 || dist[c] < 0) return out;
      while (prev[c] >= 0) { out.push([(c % S) + ox, ((c / S) | 0) + oz]); c = prev[c]; }
      return out.reverse();
    },
  };
}

/** Best reachable tile next to (x, z) on a straight side, or null. */
export function nearestBeside(r: Reach, x: number, z: number): [number, number] | null {
  let best: [number, number] | null = null, bd = 1e9;
  for (const [dx, dz] of ORTHO) { const d = r.dist(x + dx, z + dz); if (d >= 0 && d < bd) { bd = d; best = [x + dx, z + dz]; } }
  return best;
}

/** Reachable tile closest to (x, z), for clicks on water or out of reach. */
export function nearestReachable(r: Reach, x: number, z: number, cx: number, cz: number): [number, number] | null {
  if (r.dist(x, z) >= 0) return [x, z];
  let best: [number, number] | null = null, bd = 1e9;
  for (let zz = cz - R; zz <= cz + R; zz++) for (let xx = cx - R; xx <= cx + R; xx++) {
    const d = r.dist(xx, zz); if (d < 0) continue;
    const score = Math.hypot(xx - x, zz - z) * 100 + d;
    if (score < bd) { bd = score; best = [xx, zz]; }
  }
  return best;
}
