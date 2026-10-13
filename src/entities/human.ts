import * as THREE from "three";
import { castShadows, detailTex, mat } from "../engine/graphics";
import type { HumanLook } from "../data/types";

/**
 * Human figure with adult proportions (head about 1/7 of the height),
 * jointed at shoulders, elbows, hips and knees so walking and swinging
 * read as a person rather than a toy.
 */

export interface Humanoid {
  group: THREE.Group;
  legL: THREE.Group; legR: THREE.Group; armL: THREE.Group; armR: THREE.Group;
  kneeL: THREE.Group; kneeR: THREE.Group; elbowL: THREE.Group; elbowR: THREE.Group;
  /** Whole body inside the group: raise it for the bob of a step. */
  root: THREE.Group;
  /** Everything above the hips, pivoting at the hips: lean and twist. */
  upper: THREE.Group;
  head: THREE.Group;
  cape?: THREE.Mesh;
  hand: THREE.Group;
  /** Grip point in the left hand, for bows. */
  handL: THREE.Group;
}

// Key heights, in world units (a tile is one unit).
const HIP = 0.86, SHOULDER = 1.35, HEAD = 1.535;

const lathe = (pts: [number, number][], seg = 18) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

/** Torso from hips to the base of the neck: broad chest, narrower waist. */
const TORSO = (() => {
  const g = lathe([[0.001, 0.84], [0.15, 0.85], [0.163, 0.92], [0.148, 1.0], [0.158, 1.08], [0.19, 1.19], [0.207, 1.27], [0.214, 1.32], [0.19, 1.365], [0.12, 1.4], [0.06, 1.418], [0.001, 1.425]]);
  g.scale(1, 1, 0.64);
  return g;
})();
/** Tunic skirt hanging from the belt over the thighs. */
const SKIRT = (() => {
  const g = lathe([[0.158, 0.99], [0.174, 0.9], [0.198, 0.78], [0.218, 0.66]]);
  g.scale(1, 1, 0.74);
  return g;
})();
const BELT = (() => { const g = new THREE.CylinderGeometry(0.157, 0.162, 0.05, 18); g.scale(1, 1, 0.66); return g; })();

/** Skull shaped from a sphere: a narrower jaw and a slightly forward chin. */
const HEAD_GEO = (() => {
  const g = new THREE.SphereGeometry(1, 20, 16), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < 0) { const t = -y; x *= 1 - t * 0.32; z *= 1 - t * 0.12; if (z > 0) z += t * 0.08; }
    if (z < 0) z *= 1.06;
    p.setXYZ(i, x * 0.088, y * 0.115, z * 0.1);
  }
  g.computeVertexNormals();
  return g;
})();
/** Hair as a cap whose edge sits high on the forehead and low at the nape. */
const HAIR_CAP = (() => {
  const g = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const th = Math.acos(Math.max(-1, Math.min(1, y))), ph = Math.atan2(z, -x);
    const t = th / (Math.PI * 0.56), front = Math.sin(ph);
    const th2 = t * (Math.PI * (0.5 - front * 0.15));
    p.setXYZ(i, -Math.cos(ph) * Math.sin(th2) * 0.095, Math.cos(th2) * 0.124, Math.sin(ph) * Math.sin(th2) * 0.112);
  }
  g.computeVertexNormals();
  return g;
})();
const LONG_HAIR = (() => { const g = lathe([[0.085, 0.06], [0.098, -0.04], [0.1, -0.16], [0.09, -0.24]], 14); g.scale(1, 1, 0.9); return g; })();
const BEARD = (() => {
  const g = new THREE.SphereGeometry(1, 16, 10, -Math.PI * 0.15, Math.PI * 1.3, Math.PI * 0.5, Math.PI * 0.42), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * 0.082, p.getY(i) * 0.1, p.getZ(i) * 0.1);
  g.rotateY(-Math.PI / 2 + Math.PI * 0.5);
  g.computeVertexNormals();
  return g;
})();
const HOOD = (() => {
  const g = new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.68), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * 0.118, p.getY(i) * 0.14, p.getZ(i) * 0.13);
  g.computeVertexNormals();
  return g;
})();
const NECK = new THREE.CylinderGeometry(0.042, 0.05, 0.12, 10);
const NOSE = (() => { const g = new THREE.ConeGeometry(0.017, 0.05, 6); g.rotateX(Math.PI / 2 + 0.45); return g; })();
const EAR = (() => { const g = new THREE.SphereGeometry(0.024, 8, 6); g.scale(0.45, 1, 0.75); return g; })();
const EYE = new THREE.SphereGeometry(0.009, 8, 6);
const MOUTH = new THREE.BoxGeometry(0.03, 0.006, 0.01);
const BROW = new THREE.BoxGeometry(0.04, 0.009, 0.014);
/** A limb segment as a closed, tapered tube; profile runs from top (y = 0) downwards. */
function limb(profile: [number, number][]): THREE.BufferGeometry {
  const top = profile[0], bot = profile[profile.length - 1];
  const pts: [number, number][] = [[0.001, bot[1] - bot[0] * 0.6], [bot[0] * 0.8, bot[1] - bot[0] * 0.35], ...profile.slice().reverse(), [top[0] * 0.8, top[1] + top[0] * 0.35], [0.001, top[1] + top[0] * 0.6]];
  const g = lathe(pts, 12);
  g.scale(1, 1, 0.92);
  return g;
}
const UPPER_ARM = limb([[0.058, 0], [0.056, -0.06], [0.05, -0.16], [0.043, -0.27]]);
const FOREARM = limb([[0.043, 0], [0.047, -0.06], [0.04, -0.15], [0.031, -0.23]]);
const HAND = (() => {
  const g = new THREE.SphereGeometry(1, 10, 8), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setXYZ(i, p.getX(i) * 0.03 * (1 - Math.max(0, -y) * 0.25), y * 0.052, p.getZ(i) * 0.019); }
  g.translate(0, -0.045, 0.004);
  g.computeVertexNormals();
  return g;
})();
const THUMB = (() => { const g = new THREE.CapsuleGeometry(0.011, 0.03, 3, 6); g.rotateZ(0.5); return g; })();
const THIGH = limb([[0.088, 0.02], [0.084, -0.08], [0.072, -0.24], [0.056, -0.42]]);
const SHIN = limb([[0.054, 0], [0.06, -0.09], [0.05, -0.2], [0.04, -0.34]]);
const BOOT = limb([[0.064, -0.19], [0.058, -0.24], [0.054, -0.35], [0.056, -0.4]]);
const FOOT = (() => {
  const g = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * 0.05, p.getY(i) * 0.07, p.getZ(i) * (p.getZ(i) > 0 ? 0.14 : 0.07));
  g.computeVertexNormals();
  g.translate(0, -0.45, 0.03);
  return g;
})();
const PAULDRON = (() => { const g = new THREE.SphereGeometry(0.075, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5); g.scale(1, 0.55, 1); return g; })();
const CAPE = (() => {
  const g = new THREE.CylinderGeometry(0.17, 0.28, 0.98, 14, 4, true, Math.PI * 0.62, Math.PI * 0.76);
  g.translate(0, -0.49, 0);
  g.scale(1, 1, 0.72);
  return g;
})();
const BUCKLE = new THREE.BoxGeometry(0.045, 0.04, 0.012);

const DARK = {
  eye: mat("#120d0a", { roughness: 0.55 }),
  lip: mat("#5a3328"),
  belt: mat("#1e1610", { map: detailTex }),
  boot: mat("#231a13", { map: detailTex, roughness: 0.75 }),
  leather: mat("#3a2a1d", { map: detailTex }),
  buckle: mat("#8c8478", { metalness: 0.8, roughness: 0.4 }),
};

export function humanoid(look: HumanLook & { chain?: boolean; cape?: string }): Humanoid {
  const g = new THREE.Group(), root = new THREE.Group(), upper = new THREE.Group(), top = new THREE.Group();
  g.add(root); root.add(upper);
  upper.position.y = HIP; top.position.y = -HIP; upper.add(top);
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = top) => {
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  };
  const skin = mat(look.skin, { roughness: 0.62 });
  const cloth = mat(look.shirt, { map: detailTex, bumpMap: detailTex, bumpScale: 0.6, side: THREE.DoubleSide });
  const shirt = look.chain ? mat("#6b6e70", { metalness: 0.75, roughness: 0.58, map: detailTex, bumpMap: detailTex, bumpScale: 1.2 }) : cloth;
  const trousers = mat(look.trousers, { map: detailTex, bumpMap: detailTex, bumpScale: 0.6 });
  const hair = mat(look.hair, { roughness: 0.75, map: detailTex, bumpMap: detailTex, bumpScale: 1.5 });
  const brow = look.hairStyle === "bald" ? mat(look.hair) : hair;

  // Torso. Chainmail is worn over a cloth tunic, so the skirt keeps the chosen colour.
  add(TORSO, shirt, 0, 0, 0);
  add(SKIRT, cloth, 0, 0, 0);
  add(BELT, DARK.belt, 0, 0.985, 0);
  add(BUCKLE, DARK.buckle, 0, 0.985, 0.108);
  add(NECK, skin, 0, 1.43, 0.005);

  // Head.
  const head = new THREE.Group(); head.position.set(0, HEAD, 0.012); top.add(head);
  add(HEAD_GEO, skin, 0, 0, 0, head);
  add(NOSE, skin, 0, -0.016, 0.096, head);
  for (const s of [-1, 1]) {
    add(EAR, skin, s * 0.087, 0, -0.008, head);
    if (s > 0) add(MOUTH, DARK.lip, 0, -0.05, 0.084, head);
    add(EYE, DARK.eye, s * 0.031, 0.006, 0.087, head);
    add(BROW, brow, s * 0.032, 0.024, 0.091, head).rotation.z = s * -0.12;
  }
  if (look.hood) {
    add(HOOD, cloth, 0, 0.01, -0.012, head);
    add(lathe([[0.1, 0.06], [0.2, -0.05], [0.25, -0.13]], 18), cloth, 0, 1.42, 0).scale.set(1, 1, 0.72);
  } else if (look.hairStyle !== "bald") {
    add(HAIR_CAP, hair, 0, 0.01, -0.004, head);
    if (look.hairStyle === "long") add(LONG_HAIR, hair, 0, -0.02, -0.015, head).scale.set(1, 1, 0.95);
    if (look.hairStyle === "ponytail") {
      const tail = add(new THREE.CapsuleGeometry(0.026, 0.17, 4, 8), hair, 0, -0.07, -0.12, head);
      tail.rotation.x = 0.4;
    }
  }
  if (look.beard) {
    add(BEARD, hair, 0, -0.022, 0.012, head);
    add(new THREE.BoxGeometry(0.06, 0.012, 0.016), hair, 0, -0.04, 0.094, head);
  }

  if (look.apron) {
    const ap = add(new THREE.PlaneGeometry(0.27, 0.56, 1, 4), mat(look.apron, { map: detailTex, side: THREE.DoubleSide }), 0, 0.92, 0.118);
    const p = ap.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, -Math.abs(p.getX(i)) * 0.25 + Math.max(0, -p.getY(i)) * 0.18);
    ap.geometry.computeVertexNormals();
  }

  let cape: THREE.Mesh | undefined;
  if (look.cape) {
    cape = add(CAPE, mat(look.cape, { map: detailTex, bumpMap: detailTex, bumpScale: 0.6, side: THREE.DoubleSide }), 0, 1.4, -0.03);
    cape.rotation.x = 0.14;
  }
  if (look.chain) for (const s of [-1, 1]) add(PAULDRON, DARK.leather, s * 0.2, 1.33, 0);

  // Limbs hang from pivots so the game can rotate them.
  const pivot = (parent: THREE.Object3D, x: number, y: number) => { const p = new THREE.Group(); p.position.set(x, y, 0); parent.add(p); return p; };
  const arm = (s: number) => {
    const sh = pivot(top, s * 0.222, SHOULDER - 0.02);
    add(UPPER_ARM, shirt, 0, 0, 0, sh);
    const el = pivot(sh, 0, -0.28);
    el.rotation.x = -0.18;
    add(FOREARM, look.chain ? DARK.leather : cloth, 0, 0, 0, el);
    add(HAND, skin, 0, -0.235, 0, el);
    add(THUMB, skin, -s * 0.022, -0.26, 0.016, el).rotation.z *= -s;
    return { sh, el };
  };
  const leg = (s: number) => {
    const hip = pivot(root, s * 0.08, HIP);
    add(THIGH, trousers, 0, 0, 0, hip);
    const kn = pivot(hip, 0, -0.42);
    add(SHIN, trousers, 0, 0, 0, kn);
    add(BOOT, DARK.boot, 0, 0, 0, kn);
    add(FOOT, DARK.boot, 0, 0, 0, kn);
    return { hip, kn };
  };
  const L = arm(-1), R = arm(1), LL = leg(-1), LR = leg(1);
  const hand = new THREE.Group(); hand.position.set(0, -0.27, 0.02); R.el.add(hand);
  const handL = new THREE.Group(); handL.position.set(0, -0.27, 0.02); L.el.add(handL);
  castShadows(g);
  return { group: g, root, upper, head, legL: LL.hip, legR: LR.hip, kneeL: LL.kn, kneeR: LR.kn, armL: L.sh, armR: R.sh, elbowL: L.el, elbowR: R.el, cape, hand, handL };
}
