import type { Humanoid } from "./human";
import type { WeaponStyle } from "../data/skills";

/** What a humanoid is doing this frame; the pose is computed from it, never stored. */
export interface PoseState {
  /** Seconds since start, for breathing and glances. */
  t: number;
  /** Walk cycle phase in radians; advances while moving. */
  phase: number;
  moving: boolean;
  running: boolean;
  action: "idle" | "fight" | "chop" | "mine" | "fish" | "craft";
  /** Seconds into the current gather or craft loop. */
  actionT: number;
  /** Attack swing progress from 0 to 1, or negative when not swinging. */
  strike: number;
  /** Flinch strength from 0 to 1 after taking a hit. */
  hurt: number;
  /** Per-character offset so a crowd does not move in sync. */
  seed: number;
  /** How the fight stance and attack look; one-handed when left out. */
  style?: WeaponStyle;
}

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

/** Piecewise curve through [time, value] keys (time 0..1), eased between keys. */
function keys(t: number, k: [number, number][]): number {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const [t0, v0] = k[i - 1], [t1, v1] = k[i];
      return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0));
    }
  }
  return k[k.length - 1][1];
}

/** Poses a humanoid: walk and run cycles, idle breathing, fighting in four weapon styles, chopping, mining, fishing and smithing. */
export function poseHuman(b: Humanoid, s: PoseState): void {
  const { t, phase: p } = s;
  // Neutral pose; every branch below only adds to it.
  let rootY = 0, leanX = 0, twistY = 0, headX = 0, headY = 0;
  let legL = 0, legR = 0, kneeL = 0, kneeR = 0;
  let armLx = 0, armLz = -0.06, armRx = 0, armRz = 0.06, elbowL = -0.18, elbowR = -0.18;

  const breath = Math.sin(t * 1.7 + s.seed * 3);
  if (s.moving) {
    const A = s.running ? 0.78 : 0.5, sp = Math.sin(p), cp = Math.cos(p);
    legL = -sp * A; legR = sp * A;
    kneeL = Math.max(0, cp) * (s.running ? 1.5 : 0.9) + 0.08;
    kneeR = Math.max(0, -cp) * (s.running ? 1.5 : 0.9) + 0.08;
    rootY = -Math.abs(sp) * (s.running ? 0.05 : 0.025) + (s.running ? 0.015 : 0);
    leanX = s.running ? 0.17 : 0.05;
    twistY = sp * (s.running ? 0.12 : 0.07);
    headY = -twistY * 0.8;
    headX = -leanX * 0.6;
    armLx = sp * A * 0.85; armRx = -sp * A * 0.85;
    elbowL = s.running ? -1.15 : -0.22 - Math.max(0, -armLx) * 0.5;
    elbowR = s.running ? -1.15 : -0.22 - Math.max(0, -armRx) * 0.5;
  } else {
    leanX = breath * 0.012;
    armLx = breath * 0.025; armRx = -breath * 0.02;
    // An occasional slow glance to the side.
    const g = Math.sin(t * 0.31 + s.seed * 7);
    headY = Math.sign(g) * smooth((Math.abs(g) - 0.6) / 0.3) * 0.45;
  }

  if (s.action === "fight") {
    const st = s.style ?? "onehand", k = s.strike, on = k >= 0;
    if (!s.moving) { legL = -0.28; legR = 0.22; kneeL = 0.3; kneeR = 0.32; rootY = -0.035; }
    if (st === "twohand") {
      // Both hands on the long grip, blade up; the swing is a heavy overhead cut that leans into it.
      armRx = on ? keys(k, [[0, -0.7], [0.35, -2.8], [0.6, -0.35], [1, -0.7]]) : -0.7;
      elbowR = on ? keys(k, [[0, -0.9], [0.35, -0.6], [0.6, -0.25], [1, -0.9]]) : -0.9;
      armRz = -0.32; armLx = armRx; armLz = 0.32; elbowL = elbowR;
      twistY += on ? keys(k, [[0, 0.2], [0.35, 0.35], [0.6, -0.15], [1, 0.2]]) : 0.2;
      leanX += on ? keys(k, [[0, 0.04], [0.35, -0.08], [0.6, 0.28], [1, 0.04]]) : 0.04;
      if (on && !s.moving) { legL = keys(k, [[0, -0.28], [0.6, -0.55], [1, -0.28]]); kneeL = keys(k, [[0, 0.3], [0.6, 0.6], [1, 0.3]]); rootY = keys(k, [[0, -0.035], [0.6, -0.08], [1, -0.035]]); }
      headY = -twistY * 0.7;
    } else if (st === "dagger") {
      // Low crouch with the blade held forward; the attack is a quick stab.
      if (!s.moving) { kneeL = 0.45; kneeR = 0.45; rootY = -0.06; leanX += 0.1; }
      armLx = -0.55; armLz = 0.2; elbowL = -1.1;
      armRx = on ? keys(k, [[0, -0.8], [0.2, -0.55], [0.42, -1.5], [1, -0.8]]) : -0.8;
      elbowR = on ? keys(k, [[0, -1.3], [0.2, -1.8], [0.42, -0.05], [1, -1.3]]) : -1.3;
      armRz = 0.08;
      twistY += on ? keys(k, [[0, 0.1], [0.2, 0.3], [0.42, -0.35], [1, 0.1]]) : 0.1;
      leanX += on ? keys(k, [[0, 0], [0.42, 0.15], [1, 0]]) : 0;
      headY = -twistY * 0.7;
    } else if (st === "bow") {
      // Side-on stance: bow arm straight at the target, string hand drawn to the cheek, released at 45 %.
      if (!s.moving) { legL = -0.12; legR = 0.25; kneeL = 0.12; kneeR = 0.18; rootY = -0.015; }
      twistY += 0.6;
      armLx = -1.45; armLz = -0.5; elbowL = -0.05;
      armRx = -1.4; armRz = on ? keys(k, [[0, -0.15], [0.4, -0.05], [0.47, 0.4], [1, -0.15]]) : -0.15;
      elbowR = on ? keys(k, [[0, -1.7], [0.4, -2.45], [0.47, -1.8], [1, -1.7]]) : -2.3;
      leanX -= 0.04;
      headY = -twistY * 0.95; headX = 0.05;
    } else {
      // Guard: shield arm up in front, sword arm cocked; the swing is a forehand slash.
      armLx = -0.75; armLz = 0.35; elbowL = -1.25;
      twistY += 0.18;
      armRx = -0.35; armRz = 0.12; elbowR = -0.4;
      if (on) {
        armRx = keys(k, [[0, -0.35], [0.3, -2.6], [0.55, -0.25], [1, -0.35]]);
        armRz = keys(k, [[0, 0.12], [0.3, 0.35], [0.55, -0.35], [1, 0.12]]);
        elbowR = keys(k, [[0, -0.4], [0.3, -0.8], [0.55, -0.05], [1, -0.4]]);
        twistY = keys(k, [[0, 0.18], [0.3, 0.5], [0.55, -0.4], [1, 0.18]]);
        leanX += keys(k, [[0, 0], [0.3, -0.05], [0.55, 0.18], [1, 0]]);
        if (!s.moving) { legL = keys(k, [[0, -0.28], [0.55, -0.45], [1, -0.28]]); kneeL = keys(k, [[0, 0.3], [0.55, 0.5], [1, 0.3]]); }
      }
      headY = -twistY * 0.7;
    }
  } else if (s.action === "chop") {
    const k = (s.actionT % 1.2) / 1.2;
    armRx = keys(k, [[0, -1.3], [0.5, -1.9], [0.62, -1.1], [1, -1.3]]);
    armRz = keys(k, [[0, 0.2], [0.5, 0.75], [0.62, -0.25], [1, 0.2]]);
    elbowR = keys(k, [[0, -0.5], [0.5, -1.1], [0.62, -0.15], [1, -0.5]]);
    twistY = keys(k, [[0, 0.1], [0.5, 0.55], [0.62, -0.25], [1, 0.1]]);
    armLx = armRx * 0.7; armLz = 0.3; elbowL = -0.9;
    legL = -0.2; legR = 0.18; kneeL = 0.2; kneeR = 0.25; rootY = -0.02;
    headY = -twistY * 0.6;
  } else if (s.action === "mine") {
    const k = (s.actionT % 1.2) / 1.2;
    armRx = keys(k, [[0, -1.2], [0.5, -2.9], [0.66, -0.7], [1, -1.2]]);
    elbowR = keys(k, [[0, -0.6], [0.5, -0.9], [0.66, -0.1], [1, -0.6]]);
    armLx = armRx * 0.85; armLz = 0.25; elbowL = elbowR;
    leanX = keys(k, [[0, 0.1], [0.5, -0.12], [0.66, 0.35], [1, 0.1]]);
    kneeL = kneeR = keys(k, [[0, 0.15], [0.66, 0.4], [1, 0.15]]);
    legL = -0.15 - kneeL * 0.3; legR = 0.1 - kneeR * 0.3;
    rootY = -kneeL * 0.06;
    headX = 0.2;
  } else if (s.action === "fish") {
    const bob = Math.sin(s.actionT * 2.2);
    armRx = -0.95 + bob * 0.06; elbowR = -0.35; armLx = -0.6; armLz = 0.35; elbowL = -0.7;
    leanX = 0.14 + bob * 0.015; headX = 0.3;
    legL = -0.15; legR = 0.1; kneeL = 0.12; kneeR = 0.15;
  } else if (s.action === "craft") {
    const k = (s.actionT % 0.9) / 0.9;
    armRx = keys(k, [[0, -0.9], [0.45, -2.0], [0.62, -0.75], [1, -0.9]]);
    elbowR = keys(k, [[0, -1.0], [0.45, -1.4], [0.62, -0.6], [1, -1.0]]);
    armLx = -0.8; armLz = 0.2; elbowL = -0.9;
    leanX = 0.22 + keys(k, [[0, 0], [0.62, 0.06], [1, 0]]);
    headX = 0.3;
    legL = -0.12; legR = 0.12; kneeL = 0.1; kneeR = 0.1;
  }

  // Flinch: lean back and turn the head away.
  leanX -= s.hurt * 0.3; headX -= s.hurt * 0.25; rootY -= s.hurt * 0.03;

  b.root.position.y = rootY;
  b.upper.rotation.set(leanX, twistY, 0);
  b.head.rotation.set(headX, headY, 0);
  b.legL.rotation.set(legL, 0, 0); b.legR.rotation.set(legR, 0, 0);
  b.kneeL.rotation.x = kneeL; b.kneeR.rotation.x = kneeR;
  b.armL.rotation.set(armLx, 0, armLz); b.armR.rotation.set(armRx, 0, armRz);
  b.elbowL.rotation.x = elbowL; b.elbowR.rotation.x = elbowR;
  if (b.cape) b.cape.rotation.x = 0.1 + leanX * 0.6 + (s.moving ? (s.running ? 0.26 : 0.12) + Math.sin(p * 2) * 0.04 : breath * 0.02);
}
