/** Deterministic integer hash in [0, 1). Used for all seeded randomness in world generation. */
export function hash(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + 1337) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const smooth = (t: number) => t * t * (3 - 2 * t);

export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = smooth(x - xi), v = smooth(y - yi);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number): number {
  return vnoise(x, y) * 0.6 + vnoise(x * 2.1 + 5, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3 + 7) * 0.1;
}
