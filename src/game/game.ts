import * as THREE from "three";
import { events } from "../core/events";
import { GOALS } from "../data/goals";
import { ITEMS } from "../data/items";
import { REGIONS } from "../data/regions";
import { DEFAULT_APPEARANCE, lookFor, type Appearance } from "../data/appearance";
import { Creator } from "../ui/creator";
import { LocalNameRegistry, type NameRegistry } from "./names";
import { FISH_TABLE } from "../data/resources";
import { RECIPES, STATION_EMPTY, STATION_START, type Recipe } from "../data/recipes";
import { SKILLS, levelForXp } from "../data/skills";
import type { ItemId, SkillId } from "../data/types";
import { CameraRig, bindPointer } from "../engine/controls";
import { GLOW, HpBar, heldItems, humanoid, type Humanoid } from "../entities/models";
import { Mob, Npc, ResourceNode, Station, populateRegion, type Interactable } from "../entities/entities";
import { DialogueBox, type DialogueChoice } from "../ui/dialogue";
import { $, Hud } from "../ui/hud";
import { Minimap } from "../ui/minimap";
import { Panels } from "../ui/panels";
import { nearestBeside, nearestReachable, reach } from "../world/pathfinding";
import { RegionTerrain } from "../world/terrain";
import { World } from "../world/world";
import { Graphics } from "../engine/graphics";
import { QuestEngine } from "./quests";
import { clearSave, freshState, loadSaved, restoreState, writeSave, type GameState } from "./state";

export const TICK = 0.6;
const WALK = 1.67, RUN = 3.33;

type Action = { kind: "gather"; node: ResourceNode } | { kind: "craft"; station: Station } | { kind: "fight"; mob: Mob };

/** Owns the world, the player and the 0.6 s game tick. */
export class Game {
  readonly gfx: Graphics;
  readonly world = new World(REGIONS);
  readonly hud = new Hud();
  readonly dialogue = new DialogueBox();
  readonly quests: QuestEngine;
  readonly rig: CameraRig;
  private panels!: Panels;
  private minimap: Minimap;
  private terrains: RegionTerrain[] = [];
  readonly resources: ResourceNode[] = [];
  readonly stations: Station[] = [];
  readonly mobs: Mob[] = [];
  readonly npcs: Npc[] = [];
  private hitboxes: THREE.Object3D[] = [];
  private grounds: THREE.Object3D[] = [];
  private spawn: [number, number];

  s: GameState;
  clock = 0;
  private tickAcc = 0;
  private saveAcc = 0;

  // player
  tx: number; tz: number; fx: number; fz: number;
  path: [number, number][] = [];
  pending: Interactable | null = null;
  act: Action | null = null;
  private face = 0; private walkPhase = 0; private swing = 0; private strike = 0;
  private atkCd = 0; private tickWait = 0; private regen = 0; private hurtBar = 0;
  private body: Humanoid;
  private held: ReturnType<typeof heldItems>;
  private bar: HpBar;
  private marker: THREE.Group;
  private markerT = 9;
  private hoverAt: [number, number] | null = null;
  private hoverDirty = false;
  private ray = new THREE.Raycaster();

  constructor(view: HTMLElement) {
    this.gfx = new Graphics(view);
    const scene = this.gfx.scene;
    for (const region of this.world.regions) {
      const t = new RegionTerrain(this.world, region);
      scene.add(t.group);
      this.terrains.push(t);
      this.grounds.push(t.ground);
      const c = populateRegion(this.world, region, scene);
      this.resources.push(...c.resources); this.stations.push(...c.stations); this.mobs.push(...c.mobs); this.npcs.push(...c.npcs);
    }
    for (const t of this.everything()) this.hitboxes.push(t.hit);
    const first = this.world.regions[0];
    this.spawn = [first.ox + (first.def.spawn?.[0] ?? 0), first.oz + (first.def.spawn?.[1] ?? 0)];

    this.s = restoreState(loadSaved(), this.spawn);
    if (this.world.isBlocked(this.s.pos[0], this.s.pos[1])) this.s.pos = this.spawn;
    [this.tx, this.tz] = this.s.pos;
    this.fx = this.tx + 0.5; this.fz = this.tz + 0.5;

    this.body = humanoid(lookFor(this.s.profile?.appearance ?? DEFAULT_APPEARANCE));
    this.held = heldItems(this.body.hand);
    scene.add(this.body.group);
    this.creator = new Creator(this.names, a => this.setAppearance(a), (name, a) => this.finishCreation(name, a));
    this.bar = new HpBar(scene);
    this.marker = clickMarker(); scene.add(this.marker);

    this.quests = new QuestEngine(() => this.s, {
      take: items => { for (const [id, n] of Object.entries(items)) for (let i = 0; i < (n ?? 0); i++) this.take(id as ItemId); },
      give: id => this.giveItem(id),
      xp: (sk, amount) => this.gainXp(sk, amount),
      message: (t, k) => this.hud.message(t, k),
      toast: (a, b) => this.hud.toast(a, b),
    });

    this.rig = new CameraRig(this.gfx.camera);
    this.rig.snap(new THREE.Vector3(this.fx, 1, this.fz));
    this.minimap = new Minimap($<HTMLCanvasElement>("minimap"), this.world);
    this.panels = new Panels(this);
    this.bindInput();
    events.on("quest", () => this.refreshMarkers());
    events.on("inventory", () => this.refreshMarkers());
    this.refreshMarkers();
    this.panels.render();
    this.hud.hp(this.s.hp, this.maxHp());
    this.hud.region(this.world.regionAt(this.tx, this.tz)?.def.name ?? "");
    if (this.s.profile) this.welcome(false);
    else this.startCreation();
  }

  /* ---------- character ---------- */
  readonly names: NameRegistry = new LocalNameRegistry();
  private creator: Creator;
  creating = false;

  private startCreation(): void {
    this.creating = true;
    this.path = []; this.act = null; this.pending = null;
    this.dialogue.close();
    $("hint").hidden = true;
    $("pname").textContent = "";
    this.creator.open(DEFAULT_APPEARANCE);
  }

  /** Rebuilds the player model with a new look, keeping position and facing. */
  setAppearance(a: Appearance): void {
    const old = this.body.group;
    this.body = humanoid(lookFor(a));
    this.body.group.position.copy(old.position);
    this.body.group.rotation.copy(old.rotation);
    this.held = heldItems(this.body.hand);
    old.parent?.add(this.body.group);
    old.removeFromParent();
    old.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
  }

  private finishCreation(name: string, a: Appearance): void {
    this.s.profile = { name, appearance: { ...a } };
    this.creating = false;
    this.rig.dist = 13; this.rig.pitch = 0.82;
    this.face = this.body.group.rotation.y;
    $("hint").hidden = !this.s.hint;
    this.welcome(true);
    this.afterChange();
  }

  private welcome(first: boolean): void {
    const name = this.s.profile?.name ?? "";
    $("pname").textContent = name;
    this.hud.message(first ? `Välkommen till Ekdal, ${name}.` : `Välkommen tillbaka, ${name}.`, "sys");
    this.hud.message("Leta efter gula utropstecken. Där finns det folk som behöver hjälp.");
  }

  *everything(): Generator<Interactable> { yield* this.resources; yield* this.stations; yield* this.mobs; yield* this.npcs; }

  /* ---------- stats ---------- */
  level(skill: SkillId): number { return levelForXp(this.s.xp[skill]); }
  maxHp(): number { return this.level("hp"); }
  combatLevel(): number { return Math.floor(this.level("melee") * 0.65 + this.level("hp") * 0.25) + 1; }
  totalLevel(): number { return (Object.keys(SKILLS) as SkillId[]).reduce((a, k) => a + this.level(k), 0); }

  gainXp(skill: SkillId, xp: number): void {
    const before = this.level(skill);
    this.s.xp[skill] = Math.min(200_000_000, this.s.xp[skill] + xp);
    const after = this.level(skill);
    this.hud.xpDrop(skill, xp);
    events.emit("xp", { skill, amount: xp });
    if (after > before) {
      this.hud.message(`Grattis! Du har nått nivå ${after} i ${SKILLS[skill].name}.`, "lvl");
      this.hud.toast(`Nivå ${after}`, SKILLS[skill].name);
      if (skill === "hp") { this.s.hp += after - before; this.hud.hp(this.s.hp, this.maxHp()); }
      events.emit("levelUp", { skill, level: after });
    }
  }

  /* ---------- inventory ---------- */
  freeSlots(): number { return this.s.inv.filter(v => !v).length; }
  has(id: ItemId, n = 1): boolean { return this.s.inv.filter(i => i === id).length >= n; }
  take(id: ItemId): void { const i = this.s.inv.indexOf(id); if (i >= 0) this.s.inv[i] = null; events.emit("inventory", {}); }
  giveItem(id: ItemId): boolean {
    const i = this.s.inv.indexOf(null);
    if (i < 0) return false;
    this.s.inv[i] = id;
    events.emit("inventory", {});
    return true;
  }

  useItem(i: number): void {
    const id = this.s.inv[i]; if (!id) return;
    const it = ITEMS[id] as (typeof ITEMS)[ItemId] & { heal?: number; weapon?: unknown };
    if (it.heal) {
      this.s.inv[i] = null;
      const before = this.s.hp;
      this.s.hp = Math.min(this.maxHp(), this.s.hp + it.heal);
      this.hud.message(`Du äter ${it.name.toLowerCase()}.${this.s.hp > before ? ` Det läker ${this.s.hp - before} hälsa.` : ""}`);
      if (this.act?.kind === "fight") this.atkCd = Math.max(this.atkCd, 2);
      this.hud.hp(this.s.hp, this.maxHp());
    } else if (it.weapon) {
      this.s.inv[i] = this.s.weapon;
      this.s.weapon = id;
      this.hud.message(`Du tar på dig ${it.name.toLowerCase()}.`);
    } else {
      this.s.inv[i] = null;
      this.hud.message(`Du slänger ${it.name.toLowerCase()}.`);
    }
    events.emit("inventory", {});
    this.afterChange();
  }

  unequip(): void {
    if (!this.s.weapon) return;
    if (!this.giveItem(this.s.weapon)) { this.hud.message("Packningen är full.", "warn"); return; }
    this.hud.message(`Du tar av dig ${ITEMS[this.s.weapon].name.toLowerCase()}.`);
    this.s.weapon = null;
    this.afterChange();
  }

  private deposit(): void {
    let n = 0;
    this.s.inv.forEach((id, i) => { if (id) { this.s.bank[id] = (this.s.bank[id] ?? 0) + 1; this.s.inv[i] = null; n++; } });
    this.s.deposited += n;
    this.hud.message(n ? `Du satte in ${n} föremål i banken.` : "Du har inget att sätta in.", n ? "sys" : "");
    if (n) { events.emit("deposit", { count: n }); events.emit("inventory", {}); this.panels.show("bank"); }
    this.afterChange();
  }

  /** Re-renders panels, checks goals and saves after any state change. */
  afterChange(): void {
    for (const g of GOALS) if (!this.s.goals[g.id] && g.value(this.s) >= g.target) {
      this.s.goals[g.id] = true;
      this.hud.message(`Mål klart: ${g.text}.`, "sys");
    }
    this.panels.render();
    this.save();
  }

  save(): void { this.s.pos = [this.tx, this.tz]; writeSave(this.s); }

  reset(): void {
    if (this.s.profile) void this.names.release(this.s.profile.name);
    clearSave();
    const hint = this.s.hint;
    this.s = freshState(this.spawn);
    this.s.hint = hint;
    this.path = []; this.act = null; this.pending = null;
    this.teleport(this.spawn);
    for (const m of this.mobs) m.target = false;
    this.dialogue.close();
    this.hud.hp(this.s.hp, this.maxHp());
    this.refreshMarkers();
    this.panels.render();
    this.startCreation();
  }

  private teleport([x, z]: [number, number]): void {
    this.tx = x; this.tz = z; this.fx = x + 0.5; this.fz = z + 0.5;
  }

  /* ---------- movement ---------- */
  private startTile(): [number, number] { return this.path.length ? this.path[0] : [this.tx, this.tz]; }
  private setPath(p: [number, number][]): void {
    if (this.path.length) {
      const head = this.path[0];
      this.path = [head, ...(p.length && p[0][0] === head[0] && p[0][1] === head[1] ? p.slice(1) : p)];
    } else this.path = p;
  }

  walkTo(x: number, z: number): void {
    this.act = null; this.pending = null; this.dialogue.close();
    const [sx, sz] = this.startTile(), r = reach(this.world, sx, sz);
    const goal = nearestReachable(r, x, z, sx, sz);
    if (goal) this.setPath(r.pathTo(goal[0], goal[1]));
  }

  approach(t: Interactable): void {
    this.act = null; this.dialogue.close();
    const [sx, sz] = this.startTile(), r = reach(this.world, sx, sz);
    if (Math.abs(sx - t.x) + Math.abs(sz - t.z) === 1 && !this.path.length) { this.pending = t; return; }
    const goal = nearestBeside(r, t.x, t.z);
    if (!goal) { this.hud.message("Du kan inte nå dit härifrån.", "warn"); return; }
    this.setPath(r.pathTo(goal[0], goal[1]));
    this.pending = t;
  }

  private adjacent(x: number, z: number): boolean { return Math.abs(x - this.tx) + Math.abs(z - this.tz) === 1; }

  /* ---------- interaction ---------- */
  private interact(t: Interactable): void {
    this.face = Math.atan2(t.x + 0.5 - this.fx, t.z + 0.5 - this.fz);
    if (t.type === "npc") return this.talk(t);
    if (t.type === "mob") { if (!t.dead) { this.act = { kind: "fight", mob: t }; this.atkCd = 1; t.target = true; } return; }
    if (t.type === "station") {
      if (t.kind === "bank") return this.deposit();
      const recipe = this.recipeFor(t);
      if (!recipe) { this.hud.message(STATION_EMPTY[t.kind] ?? "Du har inget att göra här.", "warn"); return; }
      this.hud.message(STATION_START[t.kind] ?? "");
      this.act = { kind: "craft", station: t }; this.tickWait = 1;
      return;
    }
    const d = t.def;
    if (t.depleted) { this.hud.message(t.kind === "tree" || t.kind === "oak" ? "Det finns inget kvar att hugga här." : "Stenen är tom just nu.", "warn"); return; }
    if (this.level(d.skill) < d.level) { this.hud.message(`Du behöver nivå ${d.level} i ${SKILLS[d.skill].name} för det här.`, "warn"); return; }
    if (!this.freeSlots()) { this.hud.message("Din packning är full.", "warn"); return; }
    this.hud.message(d.start);
    this.act = { kind: "gather", node: t }; this.tickWait = 1;
  }

  private talk(npc: Npc): void {
    const node = this.quests.nodeFor(npc.def);
    if (!node) return;
    npc.model.group.rotation.y = Math.atan2(this.fx - npc.x - 0.5, this.fz - npc.z - 0.5);
    const choices: DialogueChoice[] = (node.options ?? []).map(o => ({
      text: o.text,
      pick: () => {
        this.quests.run(o.actions);
        this.afterChange();
        if (o.reply?.length) this.dialogue.show(npc.def.name, o.reply, []);
        else this.dialogue.close();
      },
    }));
    this.dialogue.show(npc.def.name, node.lines, choices);
  }

  refreshMarkers(): void { for (const n of this.npcs) n.marker.set(this.quests.marker(n.def)); }

  private recipeFor(st: Station): Recipe | undefined {
    return RECIPES.find(r => r.station === st.kind && this.level(r.skill) >= r.level && Object.entries(r.input).every(([id, n]) => this.has(id as ItemId, n ?? 1)));
  }

  /* ---------- the tick ---------- */
  private tick(): void {
    for (const n of this.resources) if (n.depleted && this.clock >= n.respawnAt) n.setDepleted(false, this.clock);
    for (const m of this.mobs) this.mobTick(m);
    if (++this.regen >= 10) { this.regen = 0; if (this.s.hp < this.maxHp()) { this.s.hp++; this.hud.hp(this.s.hp, this.maxHp()); } }
    const a = this.act;
    if (!a) return;
    if (a.kind === "fight") return this.fightTick(a.mob);
    if (this.tickWait > 0) { this.tickWait--; return; }
    if (a.kind === "craft") return this.craftTick(a.station);
    this.gatherTick(a.node);
  }

  private gatherTick(node: ResourceNode): void {
    const d = node.def;
    if (node.depleted) { this.act = null; return; }
    if (!this.freeSlots()) { this.hud.message("Din packning är full. Gå till bankkistan.", "warn"); this.act = null; return; }
    const lvl = this.level(d.skill);
    let item = d.item, xp = d.xp, got = d.got;
    if (node.kind === "fish") for (const f of FISH_TABLE) if (lvl >= f.level && Math.random() < f.chance) { item = f.item; xp = f.xp; got = f.got; break; }
    if (Math.random() >= Math.min(0.9, 0.28 + (lvl - d.level) * 0.025)) return;
    this.giveItem(item);
    this.s.gathered[item] = (this.s.gathered[item] ?? 0) + 1;
    this.hud.message(got);
    this.gainXp(d.skill, xp);
    events.emit("gather", { item });
    if (Math.random() < d.deplete) {
      node.setDepleted(true, this.clock);
      this.act = null;
      if (node.kind === "tree" || node.kind === "oak") this.hud.message("Trädet faller.");
    }
    this.afterChange();
  }

  private craftTick(st: Station): void {
    const r = this.recipeFor(st);
    if (!r) { this.hud.message("Du har inget mer att göra här.", "sys"); this.act = null; return; }
    this.tickWait = 2;
    for (const [id, n] of Object.entries(r.input)) for (let i = 0; i < (n ?? 1); i++) this.take(id as ItemId);
    const lvl = this.level(r.skill);
    let ok = true;
    if (r.success !== undefined) ok = Math.random() < Math.min(1, r.success + (lvl - r.level) * 0.02);
    if (r.burn !== undefined) ok = Math.random() >= Math.max(0, r.burn - (lvl - r.level) * 0.015);
    if (ok) {
      this.giveItem(r.output);
      this.s.made[r.output] = (this.s.made[r.output] ?? 0) + 1;
      this.hud.message(r.got);
      this.gainXp(r.skill, r.xp);
      events.emit("make", { item: r.output });
    } else {
      if (r.failItem) this.giveItem(r.failItem);
      this.hud.message(r.fail ?? "Det misslyckades.", "warn");
    }
    this.afterChange();
  }

  /* ---------- combat ---------- */
  private hitChance(att: number, acc: number, def: number): number {
    const A = (att + 8) * (64 + acc), D = (def + 8) * 64;
    return A > D ? 1 - (D + 2) / (2 * (A + 1)) : A / (2 * (D + 1));
  }
  private maxHit(str: number, bonus: number): number { return Math.max(1, Math.floor(1.3 + ((str + 8) * (64 + bonus)) / 500)); }

  private fightTick(m: Mob): void {
    if (m.dead) { this.act = null; return; }
    if (!this.adjacent(m.x, m.z)) { if (!this.path.length) { this.approach(m); this.act = null; } return; }
    this.face = Math.atan2(m.x + 0.5 - this.fx, m.z + 0.5 - this.fz);
    if (--this.atkCd > 0) return;
    const w = this.s.weapon ? (ITEMS[this.s.weapon] as { weapon?: { acc: number; str: number; speed: number } }).weapon : undefined;
    this.atkCd = w?.speed ?? 4;
    const lv = this.level("melee");
    const dmg = Math.random() < this.hitChance(lv, w?.acc ?? 0, m.def.def) ? 1 + Math.floor(Math.random() * this.maxHit(lv, w?.str ?? 0)) : 0;
    m.hp -= dmg; m.target = true; m.showBar = 5; m.flash = 0.15; this.strike = 0.35;
    this.hud.splat(m.group.position, dmg, this.gfx.camera, this.gfx.renderer.domElement);
    if (dmg) { this.gainXp("melee", dmg * 4); this.gainXp("hp", Math.round(dmg * 13.3) / 10); }
    if (m.hp <= 0) this.killMob(m);
  }

  private killMob(m: Mob): void {
    m.dead = true; m.respawnAt = this.clock + m.def.respawn;
    m.group.visible = false; m.bar.group.visible = false; m.hit.position.y = -50;
    if (this.act?.kind === "fight" && this.act.mob === m) this.act = null;
    this.s.kills[m.id] = (this.s.kills[m.id] ?? 0) + 1;
    const loot: string[] = [];
    for (const [id, chance] of m.def.drops) {
      if (Math.random() >= chance) continue;
      if (this.giveItem(id)) loot.push(ITEMS[id].name.toLowerCase());
      else { this.hud.message("Packningen är full, bytet går förlorat.", "warn"); break; }
    }
    this.hud.message(`Du besegrade ${m.def.the}${loot.length ? " och fick " + loot.join(" och ") : ""}.`, "sys");
    events.emit("kill", { mob: m.id });
    this.refreshMarkers();
    this.afterChange();
  }

  private hurt(dmg: number): void {
    this.s.hp -= dmg; this.hurtBar = 5;
    this.hud.splat(this.body.group.position, dmg, this.gfx.camera, this.gfx.renderer.domElement);
    if (this.s.hp <= 0) {
      this.hud.message("Du svimmade. Du vaknar vid startplatsen och har kvar allt du bar på.", "warn");
      this.s.hp = this.maxHp(); this.act = null; this.pending = null; this.path = [];
      this.teleport(this.spawn);
      for (const mob of this.mobs) mob.target = false;
      this.save();
    }
    this.hud.hp(this.s.hp, this.maxHp());
  }

  private mobTick(m: Mob): void {
    const d = m.def;
    if (m.dead) {
      if (this.clock >= m.respawnAt) { m.dead = false; m.hp = d.hp; [m.x, m.z] = m.home; m.fx = m.x + 0.5; m.fz = m.z + 0.5; m.group.visible = true; m.target = false; }
      return;
    }
    const pd = Math.hypot(m.x - this.tx, m.z - this.tz);
    if (!m.target && d.aggressive && pd <= 3 && this.combatLevel() < 20) { m.target = true; this.hud.message(`${d.name}en anfaller dig!`, "warn"); }
    if (m.target) {
      if (Math.hypot(m.x - m.home[0], m.z - m.home[1]) > 12 || pd > 14) { m.target = false; return; }
      if (!this.adjacent(m.x, m.z)) {
        const r = reach(this.world, m.x, m.z), goal = nearestBeside(r, this.tx, this.tz);
        if (goal) { const p = r.pathTo(goal[0], goal[1]); if (p.length) [m.x, m.z] = p[0]; }
        return;
      }
      if (--m.atkCd > 0) return;
      m.atkCd = 4;
      const dmg = Math.random() < this.hitChance(d.att, 0, this.level("melee")) ? 1 + Math.floor(Math.random() * this.maxHit(d.str, 0)) : 0;
      this.hurt(dmg);
      if (!this.act && !this.path.length && !this.pending) { this.act = { kind: "fight", mob: m }; this.atkCd = 1; }
    } else if (Math.random() < 0.12) {
      const [dx, dz] = [[1, 0], [-1, 0], [0, 1], [0, -1]][(Math.random() * 4) | 0], x = m.x + dx, z = m.z + dz;
      if (!this.world.isBlocked(x, z) && Math.hypot(x - m.home[0], z - m.home[1]) <= 3) { m.x = x; m.z = z; }
    }
  }

  /* ---------- input ---------- */
  private pick(cx: number, cy: number): { target?: Interactable; tile?: [number, number]; point: THREE.Vector3 } | null {
    const r = this.gfx.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), this.gfx.camera);
    const hits = this.ray.intersectObjects([...this.hitboxes, ...this.grounds], false);
    for (const h of hits) {
      const owner = h.object.userData.owner as Interactable | undefined;
      if (owner) return { target: owner, point: h.point };
      if (h.object.userData.ground) return { tile: [Math.floor(h.point.x), Math.floor(h.point.z)], point: h.point };
    }
    return null;
  }

  private bindInput(): void {
    const el = this.gfx.renderer.domElement;
    bindPointer(el, {
      click: (x, y) => {
        if (this.creating) return;
        const h = this.pick(x, y);
        if (!h) return;
        if (h.target) {
          const t = h.target;
          this.showMarker(new THREE.Vector3(t.x + 0.5, h.point.y, t.z + 0.5), true);
          if (t.type === "mob" && this.adjacent(t.x, t.z)) { this.path = []; this.pending = null; this.interact(t); }
          else this.approach(t);
        } else if (h.tile) { this.showMarker(h.point, false); this.walkTo(h.tile[0], h.tile[1]); }
      },
      drag: (dx, dy) => this.rig.turn(dx, dy),
      hover: (x, y) => { this.hoverAt = [x, y]; this.hoverDirty = true; },
      leave: () => { this.hoverAt = null; this.hud.hover(""); },
      wheel: d => this.rig.zoom(d),
    });
    $("zin").addEventListener("click", () => this.rig.zoom(-2));
    $("zout").addEventListener("click", () => this.rig.zoom(2));
    $("minimap").addEventListener("click", e => {
      const [x, z] = this.minimap.toWorld(e.clientX, e.clientY, this.fx, this.fz, this.rig.yaw);
      this.showMarker(new THREE.Vector3(x + 0.5, this.world.tileY(x, z), z + 0.5), false);
      this.walkTo(x, z);
    });
    const run = $("run");
    const syncRun = () => { run.setAttribute("aria-pressed", String(this.s.run)); run.textContent = this.s.run ? "Spring" : "Gå"; };
    syncRun();
    run.addEventListener("click", () => { this.s.run = !this.s.run; syncRun(); this.save(); });
    $("hint").hidden = !this.s.hint || !this.s.profile;
    $("hintx").addEventListener("click", () => { this.s.hint = false; $("hint").hidden = true; this.save(); });
  }

  private showMarker(p: THREE.Vector3, red: boolean): void {
    this.marker.position.set(p.x, p.y + 0.05, p.z);
    this.marker.visible = true; this.markerT = 0;
    (this.marker.userData.mat as THREE.MeshBasicMaterial).color.set(red ? "#ff4a3a" : "#ffe14a");
  }

  private updateHover(): void {
    if (!this.hoverAt || !this.hoverDirty) return;
    this.hoverDirty = false;
    const h = this.pick(this.hoverAt[0], this.hoverAt[1]);
    const el = this.gfx.renderer.domElement;
    const t = h?.target;
    if (!t) { this.hud.hover(h ? `<span class="verb">Gå hit</span>` : ""); el.style.cursor = "default"; return; }
    el.style.cursor = "pointer";
    if (t.type === "mob") {
      const cl = this.combatLevel(), col = t.def.level > cl ? "#ff6a5a" : t.def.level < cl ? "#7fdc5a" : "#f3e27a";
      this.hud.hover(`<span class="verb">Anfall</span> <span class="obj" style="color:#f3e27a">${t.def.name}</span> <span style="color:${col}">(nivå ${t.def.level})</span>`);
    } else if (t.type === "npc") this.hud.hover(`<span class="verb">Prata med</span> <span class="obj" style="color:#f3e27a">${t.def.name}</span>`);
    else if (t.type === "station") this.hud.hover(`<span class="verb">${t.def.verb}</span> <span class="obj">${t.def.name}</span>`);
    else {
      const d = t.def, req = this.level(d.skill) < d.level ? ` <span class="req">(kräver nivå ${d.level})</span>` : "";
      this.hud.hover(`<span class="verb">${t.depleted ? "Undersök" : d.verb}</span> <span class="obj">${t.depleted ? d.depletedName ?? d.name : d.name}</span>${req}`);
    }
  }

  /* ---------- frame ---------- */
  frame(dt: number): void {
    this.clock += dt;
    let moving = false;
    if (this.path.length) {
      const [gx0, gz0] = this.path[0], gx = gx0 + 0.5, gz = gz0 + 0.5;
      const dx = gx - this.fx, dz = gz - this.fz, d = Math.hypot(dx, dz), step = (this.s.run ? RUN : WALK) * dt;
      if (d <= step) { this.fx = gx; this.fz = gz; this.tx = gx0; this.tz = gz0; this.path.shift(); this.onEnterTile(); }
      else { this.fx += (dx / d) * step; this.fz += (dz / d) * step; }
      if (d > 0.001) this.face = Math.atan2(dx, dz);
      moving = this.path.length > 0;
    } else if (this.pending) {
      const t = this.pending; this.pending = null;
      this.interact(t);
    }
    if (this.dialogue.isOpen && moving) this.dialogue.close();

    this.tickAcc += dt;
    while (this.tickAcc >= TICK) { this.tickAcc -= TICK; this.tick(); }

    this.animatePlayer(dt, moving);
    this.animateWorld(dt);

    const follow = new THREE.Vector3(this.fx, this.world.heightAt(this.fx, this.fz) + 0.8, this.fz);
    if (this.creating) {
      // Close-up of the hero, shifted so the creator panel does not cover them.
      const wide = window.innerWidth > 720;
      this.rig.dist = wide ? 3.4 : 5.6; this.rig.pitch = wide ? 0.2 : 0.16;
      const side = wide ? -0.9 : 0;
      follow.y = this.world.heightAt(this.fx, this.fz) + (wide ? 0.85 : -0.55);
      follow.x += Math.cos(this.rig.yaw) * side; follow.z -= Math.sin(this.rig.yaw) * side;
      this.body.group.rotation.y += dt * 0.5;
    }
    this.rig.update(dt, follow);
    this.gfx.follow(this.rig.target);
    if (moving || this.act) this.hoverDirty = true;
    this.updateHover();
    const dest = this.path.length ? this.path[this.path.length - 1] : null;
    this.minimap.draw(this.fx, this.fz, this.rig.yaw, [...this.everything()], dest);
    this.gfx.render();

    this.saveAcc += dt;
    if (this.saveAcc > 5) { this.saveAcc = 0; this.save(); }
  }

  private onEnterTile(): void {
    const r = this.world.regionAt(this.tx, this.tz);
    if (r) this.hud.region(r.def.name);
  }

  private animatePlayer(dt: number, moving: boolean): void {
    const b = this.body, y = this.world.heightAt(this.fx, this.fz);
    b.group.position.set(this.fx, y, this.fz);
    if (!this.creating) {
      let dr = this.face - b.group.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      b.group.rotation.y += dr * Math.min(1, dt * 12);
    }
    if (moving) this.walkPhase += dt * (this.s.run ? 13 : 8); else this.walkPhase *= 0.85;
    const sw = Math.sin(this.walkPhase) * (moving ? 0.7 : 0);
    b.legL.rotation.x = sw; b.legR.rotation.x = -sw; b.armL.rotation.x = -sw * 0.8;
    if (b.cape) b.cape.rotation.x = 0.14 + (moving ? 0.35 + Math.sin(this.walkPhase * 2) * 0.06 : Math.sin(this.clock * 1.5) * 0.03);
    this.strike = Math.max(0, this.strike - dt);
    const a = this.act;
    if (this.s.weapon) this.held.setBlade(this.s.weapon === "iron_sword" ? "#a8aeb4" : "#c08040");
    if (a?.kind === "fight") {
      this.held.show(this.s.weapon ? "sword" : null);
      b.armR.rotation.x = this.strike > 0 ? -2.2 + ((0.35 - this.strike) / 0.35) * 2.0 : -0.5;
      b.armL.rotation.x = -0.3;
    } else if (a?.kind === "craft") {
      this.held.show(null);
      this.swing += dt;
      b.armR.rotation.x = -1.1 + Math.sin(this.swing * 5) * 0.15; b.armL.rotation.x = -1.1 - Math.sin(this.swing * 5) * 0.15;
    } else if (a?.kind === "gather") {
      const sk = a.node.def.skill;
      this.held.show(sk === "wc" ? "axe" : sk === "mining" ? "pick" : "net");
      this.swing += dt;
      const beat = Math.abs(Math.sin((this.swing * Math.PI) / TICK));
      b.armR.rotation.x = sk === "fishing" ? -1.0 + Math.sin(this.swing * 2) * 0.12 : -1.9 + beat * 1.5;
    } else {
      this.held.show(this.s.weapon ? "sword" : null);
      b.armR.rotation.x = sw * 0.8; this.swing = 0;
    }
    this.hurtBar = Math.max(0, this.hurtBar - dt);
    this.bar.group.visible = this.hurtBar > 0 || a?.kind === "fight";
    if (this.bar.group.visible) this.bar.set(this.s.hp / this.maxHp(), new THREE.Vector3(this.fx, y + 1.6, this.fz), this.gfx.camera);
  }

  private animateWorld(dt: number): void {
    for (const t of this.terrains) t.update(this.clock);
    for (const n of this.resources) n.model.update?.(this.clock);
    GLOW.emissiveIntensity = 2.0 + Math.sin(this.clock * 9) * 0.25 + Math.sin(this.clock * 23) * 0.15;
    for (const n of this.npcs) {
      n.marker.sprite.position.y = this.world.tileY(n.x, n.z) + 1.75 + Math.sin(this.clock * 2.5) * 0.05;
      n.model.armL.rotation.x = Math.sin(this.clock * 0.9 + n.x) * 0.05;
    }
    const cam = this.gfx.camera;
    for (const m of this.mobs) {
      if (m.dead) continue;
      const gx = m.x + 0.5, gz = m.z + 0.5, dx = gx - m.fx, dz = gz - m.fz, dd = Math.hypot(dx, dz), st = 1.8 * dt;
      if (dd > 0.001) { if (dd <= st) { m.fx = gx; m.fz = gz; } else { m.fx += (dx / dd) * st; m.fz += (dz / dd) * st; } m.face = Math.atan2(dx, dz); }
      if (m.target && this.adjacent(m.x, m.z)) m.face = Math.atan2(this.fx - m.fx, this.fz - m.fz);
      let fr = m.face - m.group.rotation.y; fr = Math.atan2(Math.sin(fr), Math.cos(fr));
      m.group.rotation.y += fr * Math.min(1, dt * 10);
      const y = this.world.heightAt(m.fx, m.fz) + (dd > 0.01 ? Math.abs(Math.sin(this.clock * 14)) * 0.05 : 0);
      m.group.position.set(m.fx, y, m.fz);
      m.hit.position.set(m.fx, y + 0.8, m.fz);
      m.flash = Math.max(0, m.flash - dt); m.group.scale.setScalar(1 + m.flash * 0.6);
      m.showBar = Math.max(0, m.showBar - dt);
      m.bar.group.visible = m.target || m.showBar > 0 || m.hp < m.def.hp;
      if (m.bar.group.visible) m.bar.set(m.hp / m.def.hp, new THREE.Vector3(m.fx, y + (m.def.look === "rat" ? 0.75 : 1.25), m.fz), cam);
    }
    if (this.marker.visible) {
      this.markerT += dt;
      this.marker.scale.setScalar(Math.max(0.01, 1 - this.markerT * 0.6));
      this.marker.rotation.y = this.markerT * 1.5;
      if (this.markerT > 0.9) this.marker.visible = false;
    }
  }

  resize(): void {
    const v = this.gfx.renderer.domElement.parentElement!;
    this.gfx.resize(v.clientWidth, v.clientHeight);
  }
}

function clickMarker(): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: "#ffe14a", transparent: true, depthTest: false });
  for (const r of [Math.PI / 4, -Math.PI / 4]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.08), m); b.rotation.y = r; g.add(b); }
  g.renderOrder = 5; g.visible = false; g.userData.mat = m;
  return g;
}
