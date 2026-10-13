/**
 * Character level, separate from the 1-99 skills. Kills and quests give
 * experience; the curve is quadratic so each level takes a little longer
 * than the last: level 2 at 100 XP, 5 at 1 000, 10 at 4 500, 20 at 19 000.
 */
export const MAX_LEVEL = 50;

/** Total experience needed to reach a level. */
export const expForLevel = (level: number): number => 50 * level * (level - 1);

export function levelForExp(exp: number): number {
  let l = 1;
  while (l < MAX_LEVEL && exp >= expForLevel(l + 1)) l++;
  return l;
}
