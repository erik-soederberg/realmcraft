import * as THREE from "three";

/** Orbit camera that trails the player; drag to turn, wheel or buttons to zoom. */
export class CameraRig {
  yaw = Math.PI * 0.2;
  pitch = 0.82;
  dist = 13;
  readonly target = new THREE.Vector3();
  private keys: Record<string, boolean> = {};

  constructor(private camera: THREE.PerspectiveCamera) {
    window.addEventListener("keydown", e => { this.keys[e.key] = true; });
    window.addEventListener("keyup", e => { this.keys[e.key] = false; });
  }

  zoom(delta: number): void { this.dist = Math.min(26, Math.max(6, this.dist + delta)); }
  turn(dx: number, dy: number): void {
    this.yaw -= dx * 0.008;
    this.pitch = Math.min(1.35, Math.max(0.35, this.pitch + dy * 0.005));
  }
  snap(p: THREE.Vector3): void { this.target.copy(p); }

  update(dt: number, follow: THREE.Vector3): void {
    const k = this.keys;
    if (k.ArrowLeft || k.a) this.yaw += dt * 1.8;
    if (k.ArrowRight || k.d) this.yaw -= dt * 1.8;
    if (k.ArrowUp || k.w) this.pitch = Math.min(1.35, this.pitch + dt);
    if (k.ArrowDown || k.s) this.pitch = Math.max(0.35, this.pitch - dt);
    this.target.lerp(follow, Math.min(1, dt * 8));
    const c = Math.cos(this.pitch) * this.dist;
    this.camera.position.set(this.target.x + Math.sin(this.yaw) * c, this.target.y + Math.sin(this.pitch) * this.dist, this.target.z + Math.cos(this.yaw) * c);
    this.camera.lookAt(this.target);
  }
}

/** Turns pointer input into clicks, drags and hover positions on the canvas. */
export function bindPointer(el: HTMLElement, h: {
  click(x: number, y: number): void;
  drag(dx: number, dy: number): void;
  hover(x: number, y: number): void;
  leave(): void;
  wheel(dy: number): void;
}): void {
  let down: { x: number; y: number; moved: boolean } | null = null;
  el.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, moved: false }; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", e => {
    h.hover(e.clientX, e.clientY);
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) > 6) down.moved = true;
    if (down.moved) { h.drag(dx, dy); down.x = e.clientX; down.y = e.clientY; }
  });
  el.addEventListener("pointerup", e => { if (down && !down.moved && e.button === 0) h.click(e.clientX, e.clientY); down = null; });
  el.addEventListener("pointercancel", () => { down = null; });
  el.addEventListener("pointerleave", () => h.leave());
  el.addEventListener("contextmenu", e => e.preventDefault());
  el.addEventListener("wheel", e => { e.preventDefault(); h.wheel(Math.sign(e.deltaY) * 1.2); }, { passive: false });
}
