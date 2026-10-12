import * as THREE from "three";
import { castShadows, detailTex, jitter, mat } from "../engine/graphics";
import type { HumanLook, MobDef, ResourceKind, StationKind } from "../data/types";

/** Procedural models. Swapping one for a loaded glTF later only touches this file. */

const M = {
  trunk: mat("#3d2f24", { map: detailTex }),
  bark: mat("#4a3a2c", { map: detailTex }),
  spruce: mat("#1f3322", { flatShading: true }),
  spruce2: mat("#26392a", { flatShading: true }),
  oak: mat("#2c3a1c", { flatShading: true }),
  oak2: mat("#24301a", { flatShading: true }),
  rock: mat("#625e57", { flatShading: true, map: detailTex }),
  rockDark: mat("#3f3c38", { flatShading: true, map: detailTex }),
  copper: mat("#d07a3c", { metalness: 0.5, roughness: 0.5 }),
  tin: mat("#b9c2c6", { metalness: 0.6, roughness: 0.4 }),
  iron: mat("#7a3f2a", { metalness: 0.4, roughness: 0.6 }),
  stone: mat("#6a645b", { map: detailTex }),
  stoneDark: mat("#5d574f", { map: detailTex }),
  soot: mat("#2a2622"),
  ironTop: mat("#3a3c40", { metalness: 0.6, roughness: 0.45 }),
  chest: mat("#5a3a20", { map: detailTex }),
  gold: mat("#d6a644", { metalness: 0.8, roughness: 0.35 }),
  glow: new THREE.MeshStandardMaterial({ color: "#ff8a2a", emissive: "#ff6a1a", emissiveIntensity: 2.2, roughness: 1 }),
  foam: new THREE.MeshBasicMaterial({ color: "#d8e4e0", transparent: true, opacity: 0.6 }),
};
export const GLOW = M.glow;
export const ROCK_MATS = { normal: M.rock, empty: M.rockDark };

const G = {
  trunk: new THREE.CylinderGeometry(0.11, 0.17, 1, 7),
  spruce: [0, 1, 2].map(k => jitter(new THREE.ConeGeometry(1, 1, 10, 2), 0.18, 10 + k)),
  clump: [0, 1, 2].map(k => jitter(new THREE.IcosahedronGeometry(0.5, 1), 0.22, 20 + k)),
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

export function resourceModel(kind: ResourceKind, seed: number): ResourceModel {
  const g = new THREE.Group();
  if (kind === "tree" || kind === "oak") {
    const fol = new THREE.Group();
    let trunk: THREE.Mesh;
    if (kind === "tree") {
      const H = 2.3 + seed * 0.9;
      trunk = new THREE.Mesh(G.trunk, M.trunk);
      trunk.scale.set(0.9, H * 0.55, 0.9);
      trunk.position.y = H * 0.275;
      for (let i = 0; i < 5; i++) {
        const t = i / 4, rad = 0.95 - t * 0.7, h = 0.95 - t * 0.25;
        const c = new THREE.Mesh(G.spruce[(i + ((seed * 3) | 0)) % 3], i % 2 ? M.spruce2 : M.spruce);
        c.scale.set(rad, h, rad);
        c.position.y = 0.75 + t * (H - 0.9);
        c.rotation.y = i * 1.3 + seed * 5;
        fol.add(c);
      }
    } else {
      trunk = new THREE.Mesh(G.trunk, M.bark);
      trunk.scale.set(2.1, 1.25, 2.1);
      trunk.position.y = 0.62;
      for (const [bx, bz, rz] of [[0.25, 0, -0.7], [-0.22, 0.1, 0.8], [0, -0.25, 0.6]]) {
        const br = new THREE.Mesh(G.trunk, M.bark);
        br.scale.set(0.8, 0.7, 0.8); br.position.set(bx, 1.25, bz); br.rotation.set(bz * 2, 0, rz);
        fol.add(br);
      }
      const clumps = [[0, 1.75, 0, 1.25], [0.55, 1.55, 0.2, 0.95], [-0.5, 1.6, -0.2, 1.0], [0.1, 2.2, 0.15, 0.95], [-0.2, 1.5, 0.5, 0.85], [0.3, 1.6, -0.5, 0.85], [-0.1, 2.05, -0.35, 0.8]];
      clumps.forEach(([bx, by, bz, sc], i) => {
        const b = new THREE.Mesh(G.clump[i % 3], i % 2 ? M.oak2 : M.oak);
        b.position.set(bx, by, bz); b.scale.setScalar(sc); b.rotation.set(seed * 6 + i, i, seed * 3);
        fol.add(b);
      });
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
    add(new THREE.BoxGeometry(0.9, 0.8, 0.8), M.stone, 0, 0.4, 0);
    add(new THREE.CylinderGeometry(0.22, 0.42, 0.4, 6), M.stoneDark, 0, 1.0, 0);
    add(new THREE.CylinderGeometry(0.12, 0.14, 0.5, 6), M.soot, 0, 1.4, 0);
    add(new THREE.BoxGeometry(0.4, 0.3, 0.05), M.glow, 0, 0.32, 0.4).userData.noShadow = true;
  } else if (kind === "anvil") {
    add(new THREE.CylinderGeometry(0.22, 0.3, 0.4, 7), M.bark, 0, 0.2, 0);
    add(new THREE.BoxGeometry(0.7, 0.18, 0.3), M.ironTop, 0, 0.5, 0);
    add(new THREE.ConeGeometry(0.1, 0.3, 8), M.ironTop, 0.5, 0.52, 0).rotation.z = -Math.PI / 2;
  } else {
    add(new THREE.BoxGeometry(0.95, 0.6, 0.7), M.stone, 0, 0.3, 0);
    add(new THREE.BoxGeometry(0.98, 0.06, 0.73), M.ironTop, 0, 0.63, 0);
    add(new THREE.CylinderGeometry(0.16, 0.13, 0.2, 10), M.soot, 0.2, 0.76, 0);
    add(new THREE.BoxGeometry(0.36, 0.18, 0.05), M.glow, 0, 0.24, 0.35).userData.noShadow = true;
  }
  castShadows(g);
  return g;
}

/* ---------- humanoids (player and NPCs) ---------- */

export interface Humanoid {
  group: THREE.Group;
  legL: THREE.Group; legR: THREE.Group; armL: THREE.Group; armR: THREE.Group;
  cape?: THREE.Mesh;
  hand: THREE.Group;
}

export function humanoid(look: HumanLook & { chain?: boolean; cape?: string }): Humanoid {
  const g = new THREE.Group();
  const skin = mat(look.skin), shirt = look.chain ? mat(look.shirt, { metalness: 0.75, roughness: 0.42, map: detailTex }) : mat(look.shirt, { map: detailTex });
  const trousers = mat(look.trousers), hair = mat(look.hair), belt = mat("#2a1d14");
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.5, 12), shirt); torso.position.y = 0.82; g.add(torso);
  const beltM = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.06, 12), belt); beltM.position.y = 0.6; g.add(beltM);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 2), skin); head.position.y = 1.2; g.add(head);
  if (look.hood) {
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.175, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(look.shirt, { map: detailTex }));
    hood.position.set(0, 1.21, -0.02); g.add(hood);
  } else if (look.hairStyle !== "bald") {
    const hr = new THREE.Mesh(new THREE.IcosahedronGeometry(0.155, 2), hair); hr.position.set(0, 1.25, -0.03); hr.scale.set(1, 0.75, 1); g.add(hr);
    if (look.hairStyle === "long") { const back = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.34, 0.08), hair); back.position.set(0, 1.07, -0.12); g.add(back); }
    if (look.hairStyle === "ponytail") { const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.26, 7), hair); tail.position.set(0, 1.1, -0.17); tail.rotation.x = 0.35; g.add(tail); }
  }
  for (const ex of [-0.055, 0.055]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), mat("#1a1410")); eye.position.set(ex, 1.22, 0.135); g.add(eye); }
  if (look.beard) { const beard = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), hair); beard.position.set(0, 1.17, 0.04); beard.scale.set(1, 0.9, 0.85); g.add(beard); }
  if (look.apron) { const ap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.03), mat(look.apron, { map: detailTex })); ap.position.set(0, 0.68, 0.2); g.add(ap); }
  let cape: THREE.Mesh | undefined;
  if (look.cape) { cape = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.72, 0.025), mat(look.cape, { map: detailTex })); cape.position.set(0, 0.7, -0.21); cape.rotation.x = 0.14; g.add(cape); }
  if (look.chain) for (const sx of [-1, 1]) { const pad = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat("#4a3b2c")); pad.position.set(sx * 0.21, 1.03, 0); g.add(pad); }
  const legGeo = new THREE.BoxGeometry(0.11, 0.42, 0.12), armGeo = new THREE.BoxGeometry(0.09, 0.42, 0.1);
  const limb = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(geo, m); mesh.position.y = -0.2; pivot.add(mesh); g.add(pivot); return pivot;
  };
  const legL = limb(legGeo, trousers, -0.08, 0.58), legR = limb(legGeo, trousers, 0.08, 0.58);
  const armL = limb(armGeo, shirt, -0.24, 1.02), armR = limb(armGeo, shirt, 0.24, 1.02);
  const hand = new THREE.Group(); hand.position.set(0, -0.4, 0.05); armR.add(hand);
  castShadows(g);
  return { group: g, legL, legR, armL, armR, cape, hand };
}

/** Tools and weapons the player can hold; only one is visible at a time. */
export function heldItems(hand: THREE.Group) {
  const metal = (c: string) => mat(c, { metalness: 0.6, roughness: 0.35 });
  const handle = (len: number) => { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 6), mat("#5a3e22")); h.rotation.x = Math.PI / 2; h.position.z = len / 2 - 0.05; return h; };
  const axe = new THREE.Group(); axe.add(handle(0.5)); { const h = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.1), metal("#8a6a48")); h.position.set(0, 0.06, 0.42); axe.add(h); }
  const pick = new THREE.Group(); pick.add(handle(0.5)); { const h = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.4), metal("#9aa3a8")); h.rotation.x = Math.PI / 2; h.position.set(0, 0, 0.44); pick.add(h); }
  const net = new THREE.Group(); net.add(handle(0.55)); { const h = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.015, 4, 12), mat("#cfc8b0")); h.rotation.x = Math.PI / 2; h.position.set(0, 0, 0.58); net.add(h); }
  const sword = new THREE.Group();
  const bladeMat = metal("#c08040");
  { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.6), bladeMat); b.position.z = 0.38; sword.add(b); const gd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), mat("#3a2a1e")); gd.position.z = 0.07; sword.add(gd); }
  const all = { axe, pick, net, sword };
  for (const o of Object.values(all)) { castShadows(o); o.visible = false; hand.add(o); }
  return {
    show(which: keyof typeof all | null) { for (const [k, o] of Object.entries(all)) o.visible = k === which; },
    setBlade(color: string) { bladeMat.color.set(color); },
  };
}

/* ---------- monsters ---------- */

export function mobModel(look: MobDef["look"]): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); g.add(mesh); return mesh; };
  if (look === "rat") {
    const fur = mat("#4e443c", { map: detailTex }), pink = mat("#b07a74");
    add(new THREE.SphereGeometry(0.3, 12, 8), fur, 0, 0.24, 0).scale.set(0.9, 0.7, 1.4);
    add(new THREE.ConeGeometry(0.14, 0.3, 8), fur, 0, 0.26, 0.5).rotation.x = Math.PI / 2;
    for (const ex of [-0.08, 0.08]) add(new THREE.SphereGeometry(0.06, 8, 6), pink, ex, 0.38, 0.42);
    add(new THREE.CylinderGeometry(0.015, 0.03, 0.55, 5), pink, 0, 0.18, -0.6).rotation.x = 1.2;
  } else if (look === "imp") {
    const skin = mat("#4f6e2a"), rag = mat("#4a3824", { map: detailTex });
    add(new THREE.CylinderGeometry(0.15, 0.2, 0.45, 9), rag, 0, 0.45, 0);
    add(new THREE.IcosahedronGeometry(0.17, 2), skin, 0, 0.82, 0);
    for (const s of [-1, 1]) {
      add(new THREE.ConeGeometry(0.05, 0.22, 5), skin, s * 0.2, 0.86, 0).rotation.z = s * 1.2;
      add(new THREE.BoxGeometry(0.09, 0.25, 0.09), skin, s * 0.08, 0.12, 0);
    }
    add(new THREE.CylinderGeometry(0.04, 0.07, 0.5, 6), M.bark, 0.24, 0.5, 0.12).rotation.x = 0.6;
  } else {
    const fur = mat("#6b6b6e", { map: detailTex }), dark = mat("#3d3d40", { map: detailTex });
    add(new THREE.BoxGeometry(0.34, 0.34, 0.85), fur, 0, 0.5, 0);
    add(new THREE.BoxGeometry(0.28, 0.26, 0.28), fur, 0, 0.68, 0.52);
    add(new THREE.BoxGeometry(0.14, 0.12, 0.2), dark, 0, 0.62, 0.72);
    for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.05, 0.14, 4), dark, s * 0.09, 0.86, 0.48);
    for (const [lx, lz] of [[-0.12, 0.3], [0.12, 0.3], [-0.12, -0.3], [0.12, -0.3]]) add(new THREE.BoxGeometry(0.08, 0.36, 0.08), dark, lx, 0.18, lz);
    add(new THREE.BoxGeometry(0.07, 0.07, 0.4), fur, 0, 0.6, -0.55).rotation.x = 0.5;
  }
  castShadows(g);
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
  set(kind: "!" | "?" | null): void {
    this.sprite.visible = !!kind;
    if (kind) { this.sprite.material.map = glyphTexture(kind, kind === "!" ? "#f3d23a" : "#c9c9c9"); this.sprite.material.needsUpdate = true; }
  }
}
