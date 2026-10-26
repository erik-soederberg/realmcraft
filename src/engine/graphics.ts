import * as THREE from "three";
import { hash, vnoise } from "../core/noise";

export type Quality = "low" | "medium" | "high";
export const QUALITY_NAMES: Record<Quality, string> = { low: "Låg", medium: "Mellan", high: "Hög" };

/** Renderer, sky, lighting and shared material helpers. */
export class Graphics {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  readonly sun: THREE.DirectionalLight;
  readonly sky: THREE.Mesh;
  private readonly hemi: THREE.HemisphereLight;
  private readonly fog: THREE.Fog;
  /** Carried torch, lit only underground. */
  private readonly torch: THREE.PointLight;
  private inCave = false;
  quality: Quality = "medium";

  constructor(host: HTMLElement) {
    const r = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.92;
    host.appendChild(r.domElement);
    this.renderer = r;

    const top = new THREE.Color("#3f4a54"), horizon = new THREE.Color("#9c9a90"), low = new THREE.Color("#25231f");
    this.sky = makeSky(top, horizon, low);
    this.scene.add(this.sky);
    this.fog = new THREE.Fog(horizon, 18, 50);
    this.scene.fog = this.fog;

    // Image-based ambient light from the sky, so metals and water have something to reflect.
    const envScene = new THREE.Scene();
    envScene.add(this.sky.clone());
    const disc = new THREE.Mesh(new THREE.SphereGeometry(10, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffe4c4").multiplyScalar(5) }));
    disc.position.set(80, 60, 30);
    envScene.add(disc);
    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(envScene, 0.03).texture;
    pm.dispose();

    this.hemi = new THREE.HemisphereLight("#8e9ca8", "#2a251e", 0.9);
    this.scene.add(this.hemi);
    this.torch = new THREE.PointLight("#ffa45a", 0, 13, 1.4);
    this.scene.add(this.torch);
    const sun = new THREE.DirectionalLight("#ffe2c2", 6.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  /**
   * Low: no shadows and a reduced render resolution. Medium: soft shadows at
   * half the map size and at most 1.25× pixel density. High: full shadows and
   * up to 2× pixel density.
   */
  setQuality(q: Quality): void {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === "low" ? Math.min(dpr, 1) * 0.75 : q === "medium" ? Math.min(dpr, 1.25) : Math.min(dpr, 2));
    this.sun.castShadow = q !== "low";
    const size = q === "high" ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  /** Swaps daylight for darkness and torchlight when the player goes underground, and back. */
  setCave(on: boolean): void {
    if (on === this.inCave) return;
    this.inCave = on;
    this.sky.visible = !on;
    this.scene.background = on ? new THREE.Color("#050404") : null;
    this.fog.color.set(on ? "#050404" : "#9c9a90");
    this.fog.near = on ? 5 : 18; this.fog.far = on ? 19 : 50;
    this.hemi.intensity = on ? 0.18 : 0.9;
    this.sun.intensity = on ? 0 : 6.6;
    this.scene.environmentIntensity = on ? 0.06 : 1;
    this.torch.intensity = on ? 30 : 0;
  }

  /** Keeps the sky centred on the camera and the shadow frustum on the player. */
  follow(target: THREE.Vector3): void {
    if (this.inCave) {
      const t = performance.now() / 1000;
      this.torch.position.set(target.x + 0.3, target.y + 1.6, target.z + 0.2);
      this.torch.intensity = 30 + Math.sin(t * 11) * 2.5 + Math.sin(t * 23.7) * 1.5;
    }
    this.sky.position.copy(this.camera.position);
    this.sun.position.set(target.x + 16, target.y + 13, target.z + 5);
    this.sun.target.position.copy(target);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

function makeSky(top: THREE.Color, horizon: THREE.Color, low: THREE.Color): THREE.Mesh {
  const geo = new THREE.SphereGeometry(150, 32, 16);
  const pa = geo.attributes.position, cols: number[] = [];
  for (let i = 0; i < pa.count; i++) {
    const y = pa.getY(i) / 150, c = new THREE.Color();
    if (y >= 0) c.copy(horizon).lerp(top, Math.pow(y, 0.55));
    else c.copy(horizon).lerp(low, Math.min(1, -y * 3));
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -1;
  return m;
}

/** Grainy greyscale texture multiplied over terrain, bark and stone. */
export const detailTex: THREE.Texture = (() => {
  const S = 256, c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!, img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = vnoise(x / 6, y / 6) * 0.35 + vnoise(x / 2.2 + 50, y / 2.2) * 0.35 + hash(x, y) * 0.3;
    const v = Math.round(150 + n * 105), i = (y * S + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
})();

export const mat = (color: string, o: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, envMapIntensity: 0.7, ...o });

/** Displaces vertices by a position-keyed hash so shared corners move together. */
export function jitter<T extends THREE.BufferGeometry>(geo: T, amount: number, seed: number): T {
  const pa = geo.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
    const k = Math.round(x * 97) * 3 + Math.round(y * 89) * 7 + Math.round(z * 83) * 11 + seed;
    pa.setXYZ(i, x + (hash(k, 1) - 0.5) * amount, y + (hash(k, 2) - 0.5) * amount, z + (hash(k, 3) - 0.5) * amount);
  }
  geo.computeVertexNormals();
  return geo;
}

export function castShadows(o: THREE.Object3D): void {
  o.traverse(c => {
    const m = c as THREE.Mesh;
    if (m.isMesh && !m.userData.noShadow) { m.castShadow = true; m.receiveShadow = true; }
  });
}
