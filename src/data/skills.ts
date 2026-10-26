export const SKILLS = {
  onehand: { name: "Enhandsvapen" },
  twohand: { name: "Tvåhandsvapen" },
  dagger: { name: "Dolk" },
  bow: { name: "Bågskytte" },
  shield: { name: "Sköld" },
  hp: { name: "Hälsa" },
  wc: { name: "Träfällning" },
  mining: { name: "Gruvdrift" },
  fishing: { name: "Fiske" },
  smithing: { name: "Smide" },
  cooking: { name: "Matlagning" },
} as const;

/** Classic MMO experience curve: level 2 at 83 XP, level 99 at about 13 million. */
export const XP_TABLE: number[] = (() => {
  const t = [0, 0];
  let pts = 0;
  for (let l = 1; l < 99; l++) {
    pts += Math.floor(l + 300 * Math.pow(2, l / 7));
    t[l + 1] = Math.floor(pts / 4);
  }
  return t;
})();

export function levelForXp(xp: number): number {
  let l = 1;
  while (l < 99 && xp >= XP_TABLE[l + 1]) l++;
  return l;
}

/** Fighting styles; each trains the skill of the same name. */
export type WeaponStyle = "onehand" | "twohand" | "dagger" | "bow";
