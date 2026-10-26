import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { castShadows, detailTex, jitter, mat } from "../engine/graphics";
import type { MobDef, ResourceKind, StationKind } from "../data/types";

/** Procedural models. Swapping one for a loaded glTF later only touches this file. */

const M = {
  trunk: mat("#3d2f24", { map: detailTex }),
  bark: mat("#4a3a2c", { map: detailTex }),
  spruce: mat("#1b2a1e", { map: detailTex, bumpMap: detailTex, bumpScale: 2.5, side: THREE.DoubleSide }),
  spruce2: mat("#223324", { map: detailTex, bumpMap: detailTex, bumpScale: 2.5, side: THREE.DoubleSide }),
  oak: mat("#2a3519", { map: detailTex, bumpMap: detailTex, bumpScale: 3 }),
  oak2: mat("#212b16", { map: detailTex, bumpMap: detailTex, bumpScale: 3 }),
  rock: mat("#5a5751", { flatShading: true, map: detailTex, bumpMap: detailTex, bumpScale: 2 }),
  rockDark: mat("#3a3835", { flatShading: true, map: detailTex, bumpMap: detailTex, bumpScale: 2 }),
  copper: mat("#d07a3c", { metalness: 0.5, roughness: 0.5 }),
  tin: mat("#b9c2c6", { metalness: 0.6, roughness: 0.4 }),
  iron: mat("#7a3f2a", { metalness: 0.4, roughness: 0.6 }),
  stone: mat("#5d5850", { map: detailTex, bumpMap: detailTex, bumpScale: 2, flatShading: true }),
  stoneDark: mat("#46423c", { map: detailTex, bumpMap: detailTex, bumpScale: 2, flatShading: true }),
  soot: mat("#2a2622"),
  ironTop: mat("#2e3033", { metalness: 0.7, roughness: 0.5, map: detailTex }),
  chest: mat("#3e2a1a", { map: detailTex, bumpMap: detailTex, bumpScale: 1.5 }),
  gold: mat("#4a4a4c", { metalness: 0.85, roughness: 0.5 }),
  glow: new THREE.MeshStandardMaterial({ color: "#ff8a2a", emissive: "#ff6a1a", emissiveIntensity: 2.2, roughness: 1 }),
  foam: new THREE.MeshBasicMaterial({ color: "#d8e4e0", transparent: true, opacity: 0.6 }),
};
export const GLOW = M.glow;
export const ROCK_MATS = { normal: M.rock, empty: M.rockDark };

/** Bends a cone's lower rim down and outwards so spruce tiers hang like branches. */
function droop(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), t = 0.5 - y;
    p.setY(i, y - t * t * 0.35);
  }
  geo.computeVertexNormals();
  return geo;
}

const G = {
  trunk: new THREE.CylinderGeometry(0.11, 0.17, 1, 7),
  spruce: [0, 1, 2].map(k => droop(jitter(new THREE.ConeGeometry(1, 1, 12, 3, true), 0.22, 10 + k))),
  clump: [0, 1, 2].map(k => jitter(new THREE.IcosahedronGeometry(0.5, 2), 0.18, 20 + k)),
  rock: jitter(new THREE.IcosahedronGeometry(0.44, 1), 0.16, 1),
  ore: jitter(new THREE.IcosahedronGeometry(0.09, 0), 0.05, 2),
  ring: new THREE.TorusGeometry(0.32, 0.03, 4, 18),
  bubble: new THREE.SphereGeometry(0.05, 6, 4),
};

export interface ResourceModel {
  group: THREE.Group;
  /** Shows the depleted look (stump, empty rock) or the full one. */
  setDepleted(d: boolean): void;
  update?(clock: number): void;
}

const TREE_VARIANTS = 8;
const foliageCache = new Map<string, THREE.BufferGeometry>();

/** Merged foliage for one tree variant, with one geometry group per material (spruce: two greens; oak: bark, two greens). */
function treeFoliage(kind: "tree" | "oak", v: number): THREE.BufferGeometry {
  const key = kind + v;
  const hit = foliageCache.get(key);
  if (hit) return hit;
  const seed = (v + 0.5) / TREE_VARIANTS, q = new THREE.Object3D();
  const piece = (geo: THREE.BufferGeometry, place: (o: THREE.Object3D) => void) => {
    q.position.set(0, 0, 0); q.rotation.set(0, 0, 0); q.scale.set(1, 1, 1); place(q); q.updateMatrix();
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(q.matrix);
    return g;
  };
  const byMat: THREE.BufferGeometry[][] = kind === "tree" ? [[], []] : [[], [], []];
  if (kind === "tree") {
    const H = 2.3 + seed * 0.9;
    for (let i = 0; i < 7; i++) {
      const t = i / 6, rad = 1.0 - t * 0.78, h = 0.8 - t * 0.2;
      byMat[i % 2].push(piece(G.spruce[(i + ((seed * 3) | 0)) % 3], o => { o.scale.set(rad, h, rad); o.position.y = 0.75 + t * (H - 0.9); o.rotation.y = i * 1.3 + seed * 5; }));
    }
  } else {
    for (const [bx, bz, rz] of [[0.25, 0, -0.7], [-0.22, 0.1, 0.8], [0, -0.25, 0.6]])
      byMat[0].push(piece(G.trunk, o => { o.scale.set(0.8, 0.7, 0.8); o.position.set(bx, 1.25, bz); o.rotation.set(bz * 2, 0, rz); }));
    const clumps = [[0, 1.75, 0, 1.25], [0.55, 1.55, 0.2, 0.95], [-0.5, 1.6, -0.2, 1.0], [0.1, 2.2, 0.15, 0.95], [-0.2, 1.5, 0.5, 0.85], [0.3, 1.6, -0.5, 0.85], [-0.1, 2.05, -0.35, 0.8]];
    clumps.forEach(([bx, by, bz, sc], i) => byMat[1 + (i % 2)].push(piece(G.clump[i % 3], o => { o.position.set(bx, by, bz); o.scale.setScalar(sc); o.rotation.set(seed * 6 + i, i, seed * 3); })));
  }
  const merged = mergeGeometries(byMat.map(list => mergeGeometries(list)), true);
  foliageCache.set(key, merged);
  return merged;
}

export function resourceModel(kind: ResourceKind, seed: number): ResourceModel {
  const g = new THREE.Group();
  if (kind === "tree" || kind === "oak") {
    // Foliage is one pre-merged mesh per tree variant, so a tree costs two draw calls instead of nine.
    const v = Math.min(TREE_VARIANTS - 1, Math.floor(seed * TREE_VARIANTS)), vs = (v + 0.5) / TREE_VARIANTS;
    let trunk: THREE.Mesh;
    let fol: THREE.Mesh;
    if (kind === "tree") {
      const H = 2.3 + vs * 0.9;
      trunk = new THREE.Mesh(G.trunk, M.trunk);
      trunk.scale.set(0.9, H * 0.55, 0.9);
      trunk.position.y = H * 0.275;
      fol = new THREE.Mesh(treeFoliage("tree", v), [M.spruce, M.spruce2]);
    } else {
      trunk = new THREE.Mesh(G.trunk, M.bark);
      trunk.scale.set(2.1, 1.25, 2.1);
      trunk.position.y = 0.62;
      fol = new THREE.Mesh(treeFoliage("oak", v), [M.bark, M.oak, M.oak2]);
    }
    g.add(trunk, fol);
    g.scale.setScalar(0.95 + seed * 0.3);
    g.rotation.y = seed * Math.PI * 2;
    castShadows(g);
    const sy = trunk.scale.y, py = trunk.position.y;
    let grow = 1;
    return {
      group: g,
      setDepleted(d) {
        fol.visible = !d;
        trunk.scale.y = d ? 0.3 : sy;
        trunk.position.y = d ? 0.15 : py;
        if (!d) { grow = 0.2; fol.scale.setScalar(grow); }
      },
      update() { if (grow < 1) { grow = Math.min(1, grow + 0.025); fol.scale.setScalar(grow); } },
    };
  }
  if (kind === "fish") {
    const ring = new THREE.Mesh(G.ring, M.foam); ring.rotation.x = Math.PI / 2;
    const ring2 = ring.clone();
    g.add(ring, ring2);
    const bubbles: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(G.bubble, M.foam); b.position.set(Math.cos(i * 1.7) * 0.18, 0, Math.sin(i * 1.7) * 0.18); g.add(b); bubbles.push(b); }
    return {
      group: g,
      setDepleted() { /* fishing spots never run out */ },
      update(clock) {
        const t = (clock * 0.6 + seed * 3) % 1;
        ring.scale.setScalar(0.5 + t * 1.2); ring2.scale.setScalar(0.5 + ((t + 0.5) % 1) * 1.2);
        bubbles.forEach((b, i) => (b.position.y = Math.abs(Math.sin(clock * 3 + i * 1.3)) * 0.06));
      },
    };
  }
  // ore rocks
  const rock = new THREE.Mesh(G.rock, M.rock);
  rock.scale.set(1.1, 0.85, 1); rock.position.y = 0.25; rock.rotation.set(seed, seed * 4, seed * 0.5);
  const chip = new THREE.Mesh(G.rock, M.rock);
  chip.scale.setScalar(0.45); chip.position.set(0.38, 0.1, -0.25); chip.rotation.y = seed * 9;
  const ores = new THREE.Group();
  [[0.22, 0.42, 0.14], [-0.18, 0.46, 0.2], [0.02, 0.55, -0.2], [-0.27, 0.3, -0.12]].forEach(([x, y, z], i) => {
    const o = new THREE.Mesh(G.ore, M[kind]); o.position.set(x, y, z); o.scale.setScalar(1 + ((seed * 7 + i) % 1) * 0.5); ores.add(o);
  });
  g.add(rock, chip, ores);
  castShadows(g);
  return {
    group: g,
    setDepleted(d) { ores.visible = !d; rock.material = chip.material = d ? M.rockDark : M.rock; },
  };
}

export function stationModel(kind: StationKind): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); g.add(mesh); return mesh; };
  if (kind === "bank") {
    add(new THREE.BoxGeometry(0.8, 0.45, 0.55), M.chest, 0, 0.23, 0);
    add(new THREE.CylinderGeometry(0.275, 0.275, 0.8, 10, 1, false, 0, Math.PI), M.chest, 0, 0.45, 0).rotation.z = Math.PI / 2;
    for (const bx of [-0.28, 0.28]) add(new THREE.BoxGeometry(0.06, 0.48, 0.57), M.gold, bx, 0.24, 0);
    add(new THREE.BoxGeometry(0.12, 0.14, 0.04), M.gold, 0, 0.36, 0.29);
  } else if (kind === "furnace") {
    // Dry-stone furnace: rings of rough blocks narrowing to a chimney, open at the front.
    const block = jitter(new THREE.BoxGeometry(0.26, 0.17, 0.2, 2, 1, 1), 0.04, 31);
    for (let row = 0; row < 5; row++) {
      const r = 0.5 - row * 0.075, n = 11 - row, y = 0.09 + row * 0.16;
      for (let k = 0; k < n; k++) {
        const ang = (k + (row % 2) * 0.5) / n * Math.PI * 2;
        if (row < 2 && Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang))) < 0.45) continue;
        const m = add(block, (k + row) % 3 ? M.stone : M.stoneDark, Math.sin(ang) * r, y, Math.cos(ang) * r);
        m.rotation.y = ang; m.scale.set(1 - row * 0.05, 1, 1);
      }
    }
    add(new THREE.CylinderGeometry(0.17, 0.26, 0.12, 10), M.stoneDark, 0, 0.86, 0);
    add(jitter(new THREE.CylinderGeometry(0.12, 0.15, 0.4, 8, 3), 0.025, 7), M.stoneDark, 0, 1.1, 0);
    add(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 12), M.soot, 0, 0.03, 0);
    add(new THREE.SphereGeometry(0.22, 10, 8), M.glow, 0, 0.18, 0.05).userData.noShadow = true;
  } else if (kind === "anvil") {
    add(jitter(new THREE.CylinderGeometry(0.24, 0.3, 0.42, 9, 2), 0.03, 4), M.bark, 0, 0.21, 0);
    add(new THREE.BoxGeometry(0.3, 0.08, 0.24), M.ironTop, 0, 0.46, 0);
    add(new THREE.BoxGeometry(0.16, 0.12, 0.14), M.ironTop, 0, 0.55, 0);
    add(new THREE.BoxGeometry(0.5, 0.11, 0.2), M.ironTop, -0.03, 0.66, 0);
    const horn = add(new THREE.ConeGeometry(0.09, 0.32, 10), M.ironTop, 0.36, 0.67, 0); horn.rotation.z = -Math.PI / 2; horn.scale.set(1, 1, 0.75);
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 6), mat("#4a3420"), -0.12, 0.74, 0.14).rotation.z = 1.4;
    add(new THREE.BoxGeometry(0.06, 0.08, 0.1), M.ironTop, 0.02, 0.76, 0.14);
  } else if (kind === "cave_entrance") {
    // A ragged arch of boulders around a black mouth, opening toward +z.
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: "#020202" }));
    mouth.position.set(0, 0.02, 0.05); mouth.scale.set(1, 1.5, 1); g.add(mouth);
    for (let k = 0; k <= 12; k++) {
      const a = (k / 12) * Math.PI, r = 0.98 + Math.sin(k * 2.3) * 0.08;
      const b = add(jitter(new THREE.IcosahedronGeometry(0.34 + (k % 3) * 0.06, 0), 0.12, 40 + k), k % 2 ? M.rock : M.rockDark, Math.cos(a) * r, Math.sin(a) * r * 1.5, -0.05);
      b.rotation.set(k, k * 1.7, 0);
    }
    for (const [x, y, z, s] of [[-1.2, 0.3, -0.5, 0.55], [1.25, 0.35, -0.45, 0.6], [0, 1.9, -0.55, 0.7], [-0.7, 1.4, -0.7, 0.6], [0.75, 1.5, -0.7, 0.55]])
      add(jitter(new THREE.IcosahedronGeometry(s, 1), 0.2, 90 + x * 10), M.rockDark, x, y, z);
    // Old mine timbering in the mouth, so the opening reads from a distance.
    for (const s of [-1, 1]) { const post = add(new THREE.BoxGeometry(0.13, 1.45, 0.13), M.bark, s * 0.6, 0.72, 0.25); post.rotation.z = s * 0.06; }
    add(new THREE.BoxGeometry(1.5, 0.15, 0.16), M.bark, 0, 1.45, 0.25);
    const lantern = add(new THREE.BoxGeometry(0.1, 0.14, 0.1), M.glow, 0.45, 1.25, 0.36); lantern.userData.noShadow = true;
  } else if (kind === "cave_exit") {
    // Rubble under a shaft of daylight, with a knotted rope hanging down.
    for (let k = 0; k < 7; k++) add(jitter(new THREE.IcosahedronGeometry(0.18 + (k % 3) * 0.07, 0), 0.08, 60 + k), k % 2 ? M.rock : M.rockDark, Math.cos(k * 2.4) * 0.35, 0.12, Math.sin(k * 2.4) * 0.35);
    const rope = add(new THREE.CylinderGeometry(0.025, 0.025, 4, 6), mat("#8a7048"), 0, 2, 0);
    rope.userData.noShadow = true;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 6, 16, 1, true), new THREE.MeshBasicMaterial({ color: "#d8e4ff", transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    shaft.position.y = 3; shaft.userData.noShadow = true; g.add(shaft);
    const glow = new THREE.PointLight("#c8d8ff", 6, 6, 1.5); glow.position.y = 2.5; g.add(glow);
  } else {
    add(new THREE.BoxGeometry(0.95, 0.6, 0.7), M.stone, 0, 0.3, 0);
    add(new THREE.BoxGeometry(0.98, 0.06, 0.73), M.ironTop, 0, 0.63, 0);
    add(new THREE.CylinderGeometry(0.16, 0.13, 0.2, 10), M.soot, 0.2, 0.76, 0);
    add(new THREE.BoxGeometry(0.36, 0.18, 0.05), M.glow, 0, 0.24, 0.35).userData.noShadow = true;
  }
  castShadows(g);
  return g;
}

import { humanoid, type Humanoid } from "./human";
export { humanoid, type Humanoid } from "./human";

/** Tools and weapons in the right hand and a shield on the left forearm; one tool shows at a time. */
export function heldItems(body: Humanoid) {
  const hand = body.hand;
  const metal = (c: string) => mat(c, { metalness: 0.6, roughness: 0.35 });
  const handle = (len: number) => { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 6), mat("#5a3e22")); h.rotation.x = Math.PI / 2; h.position.z = len / 2 - 0.05; return h; };
  const axe = new THREE.Group(); axe.add(handle(0.5)); { const h = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.1), metal("#8a6a48")); h.position.set(0, 0.06, 0.42); axe.add(h); }
  const pick = new THREE.Group(); pick.add(handle(0.5)); { const h = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.4), metal("#9aa3a8")); h.rotation.x = Math.PI / 2; h.position.set(0, 0, 0.44); pick.add(h); }
  const net = new THREE.Group(); net.add(handle(0.55)); { const h = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.015, 4, 12), mat("#cfc8b0")); h.rotation.x = Math.PI / 2; h.position.set(0, 0, 0.58); net.add(h); }
  const bladeMat = metal("#c08040");
  /** A straight blade along +z: grip at the hand, guard, blade and point. */
  const blade = (len: number, width: number, gripLen: number, guardW: number) => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.022, width, len), bladeMat); b.position.z = 0.09 + len / 2; g.add(b);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(width * 0.5, 0.08, 4), bladeMat); tip.rotation.x = Math.PI / 2; tip.position.z = 0.13 + len; tip.scale.set(0.8, 1, 2); g.add(tip);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(guardW, 0.035, 0.035), mat("#3a2a1e", { metalness: 0.4 })); guard.position.z = 0.09; g.add(guard);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, gripLen, 6), mat("#3a2414")); grip.rotation.x = Math.PI / 2; grip.position.z = 0.09 - gripLen / 2 + 0.02; g.add(grip);
    return g;
  };
  const sword = blade(0.6, 0.055, 0.13, 0.2);
  const dagger = blade(0.24, 0.045, 0.1, 0.12);
  // The two-hander's long grip reaches back so both hands fit on it.
  const greatsword = blade(1.0, 0.07, 0.32, 0.3);
  // A bow held upright in the left hand (hand +z points up when the arm is raised forward); the string sits on the archer's side (+y).
  const bow = new THREE.Group();
  {
    const wood = mat("#6a4424", { roughness: 0.7 });
    const curve = new THREE.CatmullRomCurve3([[0.13, -0.62], [0.05, -0.4], [0, 0], [0.05, 0.4], [0.13, 0.62]].map(([y, z]) => new THREE.Vector3(0, y, z)));
    bow.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.018, 6), wood));
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1.24, 3), mat("#e8e0cc"));
    string.rotation.x = Math.PI / 2; string.position.y = 0.13; bow.add(string);
  }
  const weapons = { sword, dagger, greatsword };
  let weapon: keyof typeof weapons | "bow" | null = "sword";
  const all = { axe, pick, net };
  for (const o of [...Object.values(all), ...Object.values(weapons)]) { castShadows(o); o.visible = false; hand.add(o); }
  castShadows(bow); bow.visible = false; body.handL.add(bow);

  // Round shield strapped to the outside of the left forearm.
  const shieldFace = mat("#6a4a2c", { map: detailTex, bumpMap: detailTex, bumpScale: 1.5 }), shieldRim = mat("#8a8478", { metalness: 0.6, roughness: 0.45 });
  const shield = new THREE.Group();
  {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.025, 20), shieldFace); disc.rotation.z = Math.PI / 2; shield.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.013, 6, 24), shieldRim); rim.rotation.y = Math.PI / 2; shield.add(rim);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), shieldRim); boss.rotation.z = Math.PI / 2; boss.position.x = -0.012; shield.add(boss);
  }
  shield.position.set(-0.07, -0.12, 0.02);
  shield.visible = false;
  castShadows(shield);
  body.elbowL.add(shield);
  return {
    /** Shows a tool, the wielded weapon ("weapon"), or nothing. */
    show(which: keyof typeof all | "weapon" | null) {
      for (const [k, o] of Object.entries(all)) o.visible = k === which;
      for (const [k, o] of Object.entries(weapons)) o.visible = which === "weapon" && k === weapon;
      bow.visible = which === "weapon" && weapon === "bow";
    },
    setWeapon(kind: keyof typeof weapons | "bow" | null) { weapon = kind; },
    setBlade(color: string) { bladeMat.color.set(color); },
    setShield(look: { color: string; rim: string } | null) {
      shield.visible = !!look;
      if (look) { shieldFace.color.set(look.color); shieldRim.color.set(look.rim); }
    },
  };
}

/* ---------- monsters ---------- */

export function mobModel(look: MobDef["look"]): THREE.Group {
  if (look === "imp") return goblin();
  if (look === "bandit") return bandit();
  if (look === "troll") return troll();
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); g.add(mesh); return mesh; };
  const ellipsoid = (rx: number, ry: number, rz: number) => { const e = new THREE.SphereGeometry(1, 16, 12); e.scale(rx, ry, rz); return e; };
  /** Leg bent at the knee: upper and lower segment meeting at (x, kneeY, z + kneeZ). */
  const leg = (m: THREE.Material, x: number, z: number, top: number, kneeY: number, kneeZ: number, r: number) => {
    const seg = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, rr: number) => {
      const len = Math.hypot(bx - ax, by - ay, bz - az);
      const c = new THREE.Mesh(new THREE.CapsuleGeometry(rr, len, 3, 8), m);
      c.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(bx - ax, by - ay, bz - az).normalize());
      g.add(c);
    };
    seg(x, top, z, x, kneeY, z + kneeZ, r);
    seg(x, kneeY, z + kneeZ, x, r * 0.8, z + kneeZ * 0.2, r * 0.75);
  };
  if (look === "rat") {
    const fur = mat("#3b342e", { map: detailTex, bumpMap: detailTex, bumpScale: 1.5 }), pink = mat("#6e5049", { roughness: 0.6 }), eye = mat("#0c0a08", { roughness: 0.3 });
    add(ellipsoid(0.2, 0.17, 0.34), fur, 0, 0.24, -0.04);
    add(ellipsoid(0.12, 0.11, 0.16), fur, 0, 0.27, 0.3);
    const snout = add(new THREE.ConeGeometry(0.07, 0.18, 10), fur, 0, 0.24, 0.47); snout.rotation.x = Math.PI / 2 + 0.2;
    add(new THREE.SphereGeometry(0.022, 8, 6), pink, 0, 0.225, 0.56);
    for (const s of [-1, 1]) {
      const ear = add(ellipsoid(0.05, 0.055, 0.015), pink, s * 0.08, 0.37, 0.27); ear.rotation.y = s * 0.5;
      add(new THREE.SphereGeometry(0.018, 8, 6), eye, s * 0.065, 0.3, 0.4);
      leg(fur, s * 0.12, 0.2, 0.2, 0.1, -0.03, 0.035);
      leg(fur, s * 0.13, -0.22, 0.22, 0.1, -0.06, 0.045);
    }
    const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.2, -0.36), new THREE.Vector3(0.08, 0.1, -0.55), new THREE.Vector3(-0.05, 0.04, -0.8), new THREE.Vector3(0.1, 0.03, -1.0)]), 16, 0.018, 6), pink);
    g.add(tail);
  } else if (look === "bear") {
    const fur = mat("#3a2a1c", { map: detailTex, bumpMap: detailTex, bumpScale: 3 }), dark = mat("#26190f", { map: detailTex, bumpMap: detailTex, bumpScale: 3 });
    const eye = mat("#0a0806", { roughness: 0.3 }), nose = mat("#111", { roughness: 0.3 });
    add(ellipsoid(0.42, 0.4, 0.68), fur, 0, 0.92, -0.05);
    add(ellipsoid(0.4, 0.42, 0.36), dark, 0, 1.05, 0.32);
    add(ellipsoid(0.24, 0.22, 0.26), fur, 0, 1.0, 0.72);
    const muzzle = add(new THREE.CylinderGeometry(0.09, 0.13, 0.22, 10), mat("#5a4430", { map: detailTex }), 0, 0.94, 0.95); muzzle.rotation.x = Math.PI / 2;
    add(new THREE.SphereGeometry(0.05, 8, 6), nose, 0, 0.96, 1.06);
    for (const s of [-1, 1]) {
      add(new THREE.SphereGeometry(0.07, 10, 8), dark, s * 0.17, 1.2, 0.68);
      add(new THREE.SphereGeometry(0.025, 8, 6), eye, s * 0.11, 1.07, 0.9);
      leg(dark, s * 0.22, 0.38, 0.85, 0.42, 0.02, 0.1);
      leg(dark, s * 0.24, -0.45, 0.85, 0.42, -0.08, 0.11);
    }
  } else if (look === "spider") {
    const chitin = mat("#1d1a18", { map: detailTex, bumpMap: detailTex, bumpScale: 1.5, roughness: 0.55 }), band = mat("#5a2a1c", { roughness: 0.6 });
    const eye = mat("#ff3a22", { emissive: "#c01808", emissiveIntensity: 1.6, roughness: 0.2 });
    add(ellipsoid(0.36, 0.3, 0.44), chitin, 0, 0.55, -0.42);
    add(ellipsoid(0.2, 0.06, 0.3), band, 0, 0.82, -0.45);
    add(ellipsoid(0.24, 0.17, 0.26), chitin, 0, 0.45, 0.12);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        // Each leg: up to a high knee, then down to the ground well outside the body.
        const z = 0.26 - k * 0.15, spread = 0.95 - Math.abs(k - 1.5) * 0.1;
        const knee = new THREE.Vector3(s * 0.55, 0.85, z + (k - 1.5) * 0.18), foot = new THREE.Vector3(s * spread, 0.03, z + (k - 1.5) * 0.42);
        const start = new THREE.Vector3(s * 0.16, 0.45, z * 0.5 + 0.1);
        for (const [a, b, r] of [[start, knee, 0.03], [knee, foot, 0.022]] as [THREE.Vector3, THREE.Vector3, number][]) {
          const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, a.distanceTo(b), 3, 6), chitin);
          c.position.copy(a).add(b).multiplyScalar(0.5);
          c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
          g.add(c);
        }
      }
      add(new THREE.SphereGeometry(0.035, 8, 6), eye, s * 0.07, 0.52, 0.36);
      add(new THREE.SphereGeometry(0.022, 8, 6), eye, s * 0.13, 0.55, 0.32);
      const fang = add(new THREE.ConeGeometry(0.025, 0.12, 6), band, s * 0.05, 0.36, 0.36); fang.rotation.x = Math.PI;
    }
  } else {
    const fur = mat("#47443f", { map: detailTex, bumpMap: detailTex, bumpScale: 2.5 }), back = mat("#2c2a27", { map: detailTex, bumpMap: detailTex, bumpScale: 2.5 });
    const eye = mat("#c8a03c", { emissive: "#3a2a08", roughness: 0.3 }), nose = mat("#111", { roughness: 0.3 });
    add(ellipsoid(0.17, 0.19, 0.45), back, 0, 0.68, -0.05);
    add(ellipsoid(0.19, 0.24, 0.24), fur, 0, 0.7, 0.28);
    const neck = add(ellipsoid(0.13, 0.17, 0.16), fur, 0, 0.84, 0.48); neck.rotation.x = -0.6;
    add(ellipsoid(0.13, 0.12, 0.15), fur, 0, 0.94, 0.6);
    const muzzle = add(new THREE.CylinderGeometry(0.045, 0.085, 0.24, 10), fur, 0, 0.9, 0.78); muzzle.rotation.x = Math.PI / 2 + 0.12;
    add(new THREE.SphereGeometry(0.03, 8, 6), nose, 0, 0.89, 0.9);
    for (const s of [-1, 1]) {
      const ear = add(new THREE.ConeGeometry(0.045, 0.13, 4), back, s * 0.08, 1.07, 0.55); ear.rotation.z = -s * 0.25;
      add(new THREE.SphereGeometry(0.017, 8, 6), eye, s * 0.065, 0.97, 0.71);
      leg(back, s * 0.1, 0.3, 0.6, 0.3, 0.03, 0.036);
      leg(back, s * 0.1, -0.36, 0.62, 0.34, -0.1, 0.042);
    }
    const tail = add(ellipsoid(0.045, 0.22, 0.05), back, 0, 0.56, -0.58); tail.rotation.x = 0.6;
  }
  castShadows(g);
  return g;
}

/** Small, wiry humanoid with green-grey skin and pointed ears. */
function goblin(): THREE.Group {
  const h = humanoid({ skin: "#56603f", shirt: "#3e3226", trousers: "#2e271f", hair: "#1e1a14", hairStyle: "bald" });
  const skin = mat("#56603f", { roughness: 0.6 });
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 5), skin);
    ear.position.set(s * 0.11, 0.02, -0.02); ear.rotation.z = -s * 1.25;
    h.head.add(ear);
  }
  const club = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.022, 0.5, 7), M.bark);
  club.rotation.x = Math.PI / 2; club.position.z = 0.22;
  h.hand.add(club);
  h.group.scale.setScalar(0.74);
  castShadows(h.group);
  const g = new THREE.Group(); g.add(h.group);
  g.userData.human = h;
  return g;
}

/** A hooded robber with a short blade. */
function bandit(): THREE.Group {
  const h = humanoid({ skin: "#b88a68", shirt: "#4a2a22", trousers: "#2a2420", hair: "#2a1e16", hood: true, beard: true });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.5), mat("#8a8e92", { metalness: 0.6, roughness: 0.4 }));
  blade.position.z = 0.3; h.hand.add(blade);
  castShadows(h.group);
  const g = new THREE.Group(); g.add(h.group);
  g.userData.human = h;
  return g;
}

/** A hulking grey cave troll with a stone-headed club. */
function troll(): THREE.Group {
  const h = humanoid({ skin: "#5e655a", shirt: "#3a3226", trousers: "#2a241c", hair: "#1e1a14", hairStyle: "bald", beard: true });
  const skin = mat("#5e655a", { roughness: 0.7, map: detailTex, bumpMap: detailTex, bumpScale: 2 });
  for (const s of [-1, 1]) {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.08, 6), mat("#d8ccb0"));
    tusk.position.set(s * 0.04, -0.07, 0.1); h.head.add(tusk);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), skin); ear.scale.set(0.5, 1, 1);
    ear.position.set(s * 0.1, 0, -0.01); h.head.add(ear);
  }
  const club = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 7), M.bark); shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.35; club.add(shaft);
  const head = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(0.16, 0), 0.06, 8), M.rockDark); head.position.z = 0.78; club.add(head);
  h.hand.add(club);
  h.group.scale.setScalar(1.45);
  castShadows(h.group);
  const g = new THREE.Group(); g.add(h.group);
  g.userData.human = h;
  return g;
}

/* ---------- overhead bits ---------- */

export class HpBar {
  readonly group = new THREE.Group();
  private fg: THREE.Mesh;
  constructor(scene: THREE.Scene) {
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.09), new THREE.MeshBasicMaterial({ color: "#8a1a12", depthTest: false, fog: false }));
    this.fg = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.09), new THREE.MeshBasicMaterial({ color: "#3fbf3f", depthTest: false, fog: false }));
    this.fg.position.z = 0.001;
    bg.renderOrder = 6; this.fg.renderOrder = 7;
    this.group.add(bg, this.fg);
    this.group.visible = false;
    scene.add(this.group);
  }
  set(frac: number, pos: THREE.Vector3, camera: THREE.Camera): void {
    const f = Math.max(0.001, Math.min(1, frac));
    this.fg.scale.x = f; this.fg.position.x = -0.35 * (1 - f);
    this.group.position.copy(pos);
    this.group.quaternion.copy(camera.quaternion);
  }
}

const markerTex: Record<string, THREE.Texture> = {};
function glyphTexture(glyph: string, color: string): THREE.Texture {
  const key = glyph + color;
  if (markerTex[key]) return markerTex[key];
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.font = "800 54px 'Alegreya Sans SC', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 7; ctx.strokeStyle = "#1a1208"; ctx.strokeText(glyph, 32, 34);
  ctx.fillStyle = color; ctx.fillText(glyph, 32, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (markerTex[key] = t);
}

/** Floating "!" (quest available) or "?" (ready to hand in) above an NPC. */
export class QuestMarker {
  readonly sprite = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, fog: false }));
  constructor() { this.sprite.scale.set(0.5, 0.5, 1); this.sprite.renderOrder = 8; this.sprite.visible = false; }
  /** Whether the NPC has something to show; the sprite is also hidden when culled. */
  shown = false;
  set(kind: "!" | "?" | null): void {
    this.shown = !!kind;
    this.sprite.visible = !!kind;
    if (kind) { this.sprite.material.map = glyphTexture(kind, kind === "!" ? "#f3d23a" : "#c9c9c9"); this.sprite.material.needsUpdate = true; }
  }
}

/* ---------- buildings ---------- */

const H = {
  wall: mat("#8a7a62", { map: detailTex, bumpMap: detailTex, bumpScale: 1.2 }),
  timber: mat("#3a2818", { map: detailTex, bumpMap: detailTex, bumpScale: 1.5 }),
  plank: mat("#5a4028", { map: detailTex, bumpMap: detailTex, bumpScale: 1 }),
  thatch: mat("#5e4a2c", { map: detailTex, bumpMap: detailTex, bumpScale: 3, side: THREE.DoubleSide }),
  cloth: mat("#6a1e18", { side: THREE.DoubleSide }),
};

export interface BuildingModel { group: THREE.Group; walls: THREE.Group; roof: THREE.Group }

/**
 * A timber-framed longhouse filling a footprint of w × d tiles whose north-west
 * tile is (x0, z0). Walls run along the centres of the outer tiles with a gap
 * at the door; the roof and walls are separate groups so the game can cut the
 * house open while the player is inside.
 */
export function buildingModel(x0: number, z0: number, w: number, d: number, door: [number, number], floorY: number): BuildingModel {
  const group = new THREE.Group(), walls = new THREE.Group(), roof = new THREE.Group();
  group.position.set(x0, floorY, z0);
  group.add(walls, roof);
  const WALL_H = 2.2, T = 0.3;
  const box = (parent: THREE.Object3D, m: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); parent.add(b); return b;
  };
  // Floor planks across the whole inside.
  box(group, H.plank, w - 1, 0.08, d - 1, w / 2, 0.04, d / 2);
  // One wall side at a time, split at the doorway.
  const lx = door[0] - x0 + 0.5, lz = door[1] - z0 + 0.5;
  const side = (ax: number, az: number, bx: number, bz: number) => {
    const horiz = az === bz, len = horiz ? bx - ax : bz - az;
    const hasDoor = horiz ? Math.abs(lz - az) < 0.01 && lx > ax && lx < bx : Math.abs(lx - ax) < 0.01 && lz > az && lz < bz;
    const pieces: [number, number][] = hasDoor ? [[0, (horiz ? lx - ax : lz - az) - 0.55], [(horiz ? lx - ax : lz - az) + 0.55, len]] : [[0, len]];
    for (const [s0, s1] of pieces) {
      const mid = (s0 + s1) / 2, l = s1 - s0 + T;
      box(walls, H.wall, horiz ? l : T, WALL_H, horiz ? T : l, horiz ? ax + mid : ax, WALL_H / 2, horiz ? az : az + mid);
      box(walls, H.timber, horiz ? l + 0.02 : T + 0.06, 0.14, horiz ? T + 0.06 : l + 0.02, horiz ? ax + mid : ax, WALL_H - 0.07, horiz ? az : az + mid);
      box(walls, H.timber, horiz ? l + 0.02 : T + 0.06, 0.14, horiz ? T + 0.06 : l + 0.02, horiz ? ax + mid : ax, 0.07, horiz ? az : az + mid);
    }
    if (hasDoor) {
      const dx = horiz ? lx : ax, dz = horiz ? az : lz;
      box(walls, H.wall, horiz ? 1.1 : T, WALL_H - 1.75, horiz ? T : 1.1, dx, 1.75 + (WALL_H - 1.75) / 2, dz);
      box(walls, H.timber, horiz ? 1.2 : T + 0.08, 0.16, horiz ? T + 0.08 : 1.2, dx, 1.75, dz);
      for (const s of [-0.55, 0.55]) box(walls, H.timber, 0.14, 1.75, 0.14, horiz ? dx + s : dx, 0.875, horiz ? dz : dz + s);
      const lamp = box(group, M.glow, 0.12, 0.16, 0.12, horiz ? dx + 0.8 : dx + (ax < w / 2 ? -0.3 : 0.3), 1.6, horiz ? dz + (az < d / 2 ? -0.3 : 0.3) : dz + 0.8);
      lamp.userData.noShadow = true;
    }
  };
  const W = w - 0.5, D = d - 0.5;
  side(0.5, 0.5, W, 0.5); side(0.5, D, W, D); side(0.5, 0.5, 0.5, D); side(W, 0.5, W, D);
  // Corner and mid posts.
  for (const [px, pz] of [[0.5, 0.5], [W, 0.5], [0.5, D], [W, D], [w / 2, 0.5], [w / 2, D]]) box(walls, H.timber, 0.22, WALL_H + 0.1, 0.22, px, (WALL_H + 0.1) / 2, pz);
  // Gabled thatch roof along the long axis, overhanging the walls.
  const alongX = w >= d, span = (alongX ? D - 0.5 : W - 0.5) + 1.2, run = (alongX ? W - 0.5 : D - 0.5) + 1.2, rise = 1.5;
  const slope = Math.hypot(span / 2, rise), ang = Math.atan2(rise, span / 2);
  for (const s of [-1, 1]) {
    const p = box(roof, H.thatch, alongX ? run : slope, 0.16, alongX ? slope : run, w / 2 + (alongX ? 0 : s * span / 4), WALL_H + rise / 2, d / 2 + (alongX ? s * span / 4 : 0));
    if (alongX) p.rotation.x = s * ang; else p.rotation.z = -s * ang;
  }
  const ridge = box(roof, H.timber, alongX ? run + 0.1 : 0.2, 0.2, alongX ? 0.2 : run + 0.1, w / 2, WALL_H + rise + 0.05, d / 2);
  ridge.castShadow = true;
  // Gable ends.
  const tri = new THREE.Shape([new THREE.Vector2(-span / 2 + 0.6, 0), new THREE.Vector2(span / 2 - 0.6, 0), new THREE.Vector2(0, rise - 0.3)]);
  for (const end of [0.5, alongX ? W : D]) {
    const g = new THREE.Mesh(new THREE.ShapeGeometry(tri), H.wall);
    g.material = H.wall; (g.material as THREE.Material).side = THREE.DoubleSide;
    if (alongX) { g.rotation.y = Math.PI / 2; g.position.set(end, WALL_H, d / 2); } else g.position.set(w / 2, WALL_H, end);
    roof.add(g);
  }
  // Inside: a long table with benches and a banner.
  const tx = w / 2, tz = d / 2;
  box(group, H.timber, alongX ? 2.4 : 0.9, 0.08, alongX ? 0.9 : 2.4, tx - (alongX ? 0.6 : 0), 0.78, tz - (alongX ? 0 : 0.6));
  for (const [ox, oz] of [[-1, -0.35], [1, -0.35], [-1, 0.35], [1, 0.35]]) box(group, H.timber, 0.08, 0.74, 0.08, tx - (alongX ? 0.6 : 0) + (alongX ? ox : oz), 0.37, tz - (alongX ? 0 : 0.6) + (alongX ? oz : ox));
  for (const s of [-1, 1]) box(group, H.plank, alongX ? 2.2 : 0.3, 0.42, alongX ? 0.3 : 2.2, tx - (alongX ? 0.6 : 0) + (alongX ? 0 : s * 0.75), 0.21, tz - (alongX ? 0 : 0.6) + (alongX ? s * 0.75 : 0));
  const banner = box(walls, H.cloth, alongX ? 0.9 : 0.02, 1.1, alongX ? 0.02 : 0.9, alongX ? tx : 0.5 + T / 2 + 0.02, 1.3, alongX ? 0.5 + T / 2 + 0.02 : tz);
  banner.userData.noShadow = true;
  castShadows(group);
  return { group, walls, roof };
}
