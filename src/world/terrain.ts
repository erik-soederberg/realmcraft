import * as THREE from "three";
import { fbm, hash } from "../core/noise";
import { detailTex, jitter, mat } from "../engine/graphics";
import { Tile, WATER_LEVEL, type Region, type World } from "./world";

const TILE_COLORS: Record<number, THREE.Color> = {
  [Tile.Grass]: new THREE.Color("#384422"),
  [Tile.Sand]: new THREE.Color("#7a705a"),
  [Tile.Path]: new THREE.Color("#544839"),
  [Tile.Dirt]: new THREE.Color("#4c443b"),
  [Tile.Water]: new THREE.Color("#3a3a2e"),
  [Tile.Rock]: new THREE.Color("#3b3934"),
  [Tile.Floor]: new THREE.Color("#4a3a28"),
  [Tile.Void]: new THREE.Color("#384422"),
};

/** Everything drawn for one region's ground: terrain, grass, pebbles and water. */
export class RegionTerrain {
  readonly group = new THREE.Group();
  readonly ground: THREE.Mesh;
  /** Grass blades (or stalagmites underground); hidden on the lowest graphics setting. */
  readonly grass: THREE.InstancedMesh;
  private readonly water: THREE.Mesh;
  private readonly waterBase: Float32Array;

  constructor(world: World, readonly region: Region) {
    this.ground = buildGround(world, region);
    this.group.add(this.ground, buildPebbles(world, region));
    this.grass = region.def.cave ? buildStalagmites(world, region) : buildGrass(world, region);
    this.group.add(this.grass);
    const under = new THREE.Mesh(new THREE.BoxGeometry(region.w, 3, region.h), mat("#2b251d"));
    under.position.set(region.ox + region.w / 2, -2.3, region.oz + region.h / 2);
    this.group.add(under);

    const pad = 20;
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(region.w + pad * 2, region.h + pad * 2, 72, 72),
      new THREE.MeshStandardMaterial({ color: "#1c3238", transparent: true, opacity: 0.86, roughness: 0.06, metalness: 0.1, envMapIntensity: 1.3 }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(region.ox + region.w / 2, WATER_LEVEL, region.oz + region.h / 2);
    this.water.visible = !region.def.cave;
    this.waterBase = (this.water.geometry.attributes.position.array as Float32Array).slice();
    this.group.add(this.water);
  }

  update(clock: number): void {
    if (!this.water.visible) return;
    const wa = this.water.geometry.attributes.position, b = this.waterBase, arr = wa.array as Float32Array;
    for (let i = 0; i < wa.count; i++) {
      const x = b[i * 3], y = b[i * 3 + 1];
      arr[i * 3 + 2] = Math.sin(x * 1.1 + clock * 1.3) * 0.025 + Math.sin(y * 1.7 - clock * 0.9) * 0.02 + Math.sin((x + y) * 3.1 + clock * 2.2) * 0.008;
    }
    wa.needsUpdate = true;
    this.water.geometry.computeVertexNormals();
  }
}

function blendColor(world: World, fx: number, fz: number, out: THREE.Color): THREE.Color {
  const u = fx - 0.5, v = fz - 0.5, x0 = Math.floor(u), z0 = Math.floor(v);
  const tx = (u - x0) ** 2 * (3 - 2 * (u - x0)), tz = (v - z0) ** 2 * (3 - 2 * (v - z0));
  const c00 = TILE_COLORS[world.tile(x0, z0)], c10 = TILE_COLORS[world.tile(x0 + 1, z0)];
  const c01 = TILE_COLORS[world.tile(x0, z0 + 1)], c11 = TILE_COLORS[world.tile(x0 + 1, z0 + 1)];
  out.r = (c00.r * (1 - tx) + c10.r * tx) * (1 - tz) + (c01.r * (1 - tx) + c11.r * tx) * tz;
  out.g = (c00.g * (1 - tx) + c10.g * tx) * (1 - tz) + (c01.g * (1 - tx) + c11.g * tx) * tz;
  out.b = (c00.b * (1 - tx) + c10.b * tx) * (1 - tz) + (c01.b * (1 - tx) + c11.b * tx) * tz;
  return out;
}

function buildGround(world: World, region: Region): THREE.Mesh {
  const R = 3, VW = region.w * R + 1, VH = region.h * R + 1;
  const pos: number[] = [], col: number[] = [], uv: number[] = [], ind: number[] = [];
  const dry = new THREE.Color("#4e4c30"), moss = new THREE.Color("#253017"), grass = TILE_COLORS[Tile.Grass];
  const c = new THREE.Color();
  for (let j = 0; j < VH; j++) for (let i = 0; i < VW; i++) {
    const fx = region.ox + i / R, fz = region.oz + j / R, y = world.heightAt(fx, fz);
    pos.push(fx, y, fz);
    uv.push(fx * 0.45, fz * 0.45);
    blendColor(world, fx, fz, c);
    const n1 = fbm(fx * 0.35 + 7, fz * 0.35), n2 = fbm(fx * 1.3, fz * 1.3 + 9);
    const grassW = Math.max(0, 1 - Math.abs(c.r - grass.r) * 30);
    if (grassW > 0) c.lerp(n1 > 0.55 ? dry : moss, Math.abs(n1 - 0.5) * 1.4 * grassW);
    c.multiplyScalar(0.8 + n2 * 0.4);
    const wet = world.waterAmount(fx, fz);
    if (wet > 0) c.multiplyScalar(1 - wet * 0.55);
    col.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < VH - 1; j++) for (let i = 0; i < VW - 1; i++) {
    const a = j * VW + i, b = a + 1, d = a + VW, e = d + 1;
    ind.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ind);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, map: detailTex, bumpMap: detailTex, bumpScale: 0.035, roughness: 0.95, envMapIntensity: 0.5 }));
  m.receiveShadow = true;
  m.userData.ground = true;
  return m;
}

function buildGrass(world: World, region: Region): THREE.InstancedMesh {
  const blade = new THREE.ConeGeometry(0.022, 0.3, 3, 1);
  blade.translate(0, 0.15, 0);
  const spots: [number, number][] = [];
  for (let z = region.oz; z < region.oz + region.h; z++) for (let x = region.ox; x < region.ox + region.w; x++) {
    if (world.tile(x, z) === Tile.Grass) for (let k = 0; k < 16; k++) spots.push([x + hash(x * 13 + k, z * 7), z + hash(x * 5, z * 11 + k)]);
  }
  const im = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, envMapIntensity: 0.4 }), spots.length);
  const q = new THREE.Object3D(), gc = new THREE.Color();
  const a = new THREE.Color("#34401e"), b = new THREE.Color("#55532e"), c = new THREE.Color("#202a16");
  spots.forEach(([fx, fz], i) => {
    const r1 = hash(i, 3), r2 = hash(i, 9);
    q.position.set(fx, world.heightAt(fx, fz) - 0.02, fz);
    q.rotation.set((r1 - 0.5) * 0.6, r2 * 6.28, (r2 - 0.5) * 0.6);
    q.scale.set(1, 0.6 + r1 * 0.9, 1);
    q.updateMatrix();
    im.setMatrixAt(i, q.matrix);
    im.setColorAt(i, gc.copy(a).lerp(r1 > 0.85 ? b : c, Math.abs(r2 - 0.5) * 1.6));
  });
  im.receiveShadow = true;
  return im;
}

/** Spikes of stone rising from the rock along the cave walls and a few out on the floor. */
function buildStalagmites(world: World, region: Region): THREE.InstancedMesh {
  const cone = jitter(new THREE.ConeGeometry(0.16, 1, 6, 3), 0.05, 11);
  cone.translate(0, 0.5, 0);
  const spots: [number, number, number][] = [];
  for (let z = region.oz; z < region.oz + region.h; z++) for (let x = region.ox; x < region.ox + region.w; x++) {
    const t = world.tile(x, z), r = hash(x * 7, z * 3);
    const wall = t === Tile.Rock && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => world.tile(x + dx, z + dz) === Tile.Dirt);
    if (wall && r < 0.4) spots.push([x + hash(x, z * 5), z + hash(x * 9, z), 0.5 + hash(x, x + z) * 0.8]);
    else if (t === Tile.Dirt && r < 0.03) spots.push([x + 0.2 + r * 10, z + 0.5, 0.4 + r * 15]);
  }
  const im = new THREE.InstancedMesh(cone, mat("#4a4640", { flatShading: true, map: detailTex, bumpMap: detailTex, bumpScale: 2 }), spots.length);
  const q = new THREE.Object3D();
  spots.forEach(([fx, fz, h], i) => {
    q.position.set(fx, world.heightAt(fx, fz) - 0.1, fz);
    q.rotation.set((hash(i, 2) - 0.5) * 0.25, hash(i, 4) * 6.28, (hash(i, 6) - 0.5) * 0.25);
    q.scale.set(0.7 + hash(i, 8) * 0.8, h, 0.7 + hash(i, 9) * 0.8);
    q.updateMatrix();
    im.setMatrixAt(i, q.matrix);
  });
  im.castShadow = true;
  im.receiveShadow = true;
  return im;
}

function buildPebbles(world: World, region: Region): THREE.InstancedMesh {
  const peb = jitter(new THREE.IcosahedronGeometry(0.07, 0), 0.04, 5);
  const spots: [number, number][] = [];
  for (let z = region.oz; z < region.oz + region.h; z++) for (let x = region.ox; x < region.ox + region.w; x++) {
    const t = world.tile(x, z), r = hash(x, z);
    if ((t === Tile.Dirt && r < 0.9) || (t === Tile.Path && r < 0.25) || (t === Tile.Sand && r < 0.2))
      for (let k = 0; k < 3; k++) spots.push([x + hash(x * 3 + k, z), z + hash(x, z * 3 + k)]);
  }
  const im = new THREE.InstancedMesh(peb, mat("#4f4b45", { flatShading: true, map: detailTex }), spots.length);
  const q = new THREE.Object3D();
  spots.forEach(([fx, fz], i) => {
    q.position.set(fx, world.heightAt(fx, fz), fz);
    q.rotation.set(i, i * 2, 0);
    q.scale.setScalar(0.6 + hash(i, 1) * 1.4);
    q.updateMatrix();
    im.setMatrixAt(i, q.matrix);
  });
  im.castShadow = true;
  im.receiveShadow = true;
  return im;
}
