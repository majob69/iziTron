// Welt: Droiden-Physik (Bewegen, Rammen, Abstürzen), Laser, Gefahren, Effekte.
import * as THREE from 'three';
import { Droid } from './droid.js';
import { TILE } from './deck.js';
import { Effects } from './effects.js';

const GRAVITY = 30;
const RESTITUTION = 0.25;
const RAM_THRESHOLD = 3.2;
const RAM_DAMAGE = 0.9; // Schaden pro m/s über der Schwelle, skaliert mit dem Massenverhältnis (0,5–2)
/** Nach einem Rammtreffer kurz keinen weiteren Rammschaden (verhindert Dauerschaden beim Einklemmen). */
const RAM_IMMUNITY = 0.5;
const ATTACKER_SHARE = 0.3;
const DASH_SPEED = 10;
const DASH_TIME = 0.35; // so lange wird beim Rammstoß nicht gebremst
const DASH_COOLDOWN = 1.4;
const COOL_RATE = 30;
const OVERHEAT_RECOVER = 35;
const HAZARD_DPS = 18;
const COYOTE = 0.12;
const COYOTE_HOVER = 0.6;
const FALL_DEPTH = -25;
/** Gegner schießen langsamer als der Spieler (Fairness). */
const ENEMY_FIRE_FACTOR = 0.45;

export class World {
  constructor(scene, deck, emit) {
    this.scene = scene;
    this.deck = deck;
    this.emit = emit; // (event, data) → Ton, HUD, Kamera
    this.droids = [];
    this.projectiles = [];
    this.time = 0;
    this.effects = new Effects(scene);
    this.boltGeo = new THREE.CapsuleGeometry(0.05, 0.6, 4, 8);
    this.boltGeo.rotateX(Math.PI / 2);
    this.boltMats = {
      player: new THREE.MeshBasicMaterial({ color: 0x9fe8ff }),
      enemy: new THREE.MeshBasicMaterial({ color: 0xff3355 }),
    };
    this.stats = { destroyed: 0, fallen: 0, captured: 0 };
    this.floorTiles = deck.floorTiles();
  }

  spawn(typeKey, pos, opts) {
    const d = new Droid(typeKey, pos, opts);
    this.scene.add(d.mesh.root);
    this.droids.push(d);
    return d;
  }

  get hostiles() {
    return this.droids.filter((d) => d.hostile);
  }

  /**
   * Ein Schritt. controls: Map droid → { move: Vector3 (Weltrichtung, Länge ≤ 1),
   * face: Zahl|null, fire: Vector3|null (Zielrichtung), dash: bool, precise: bool }
   */
  update(dt, controls, thermal) {
    this.time += dt;
    for (const d of this.droids) {
      const c = controls.get(d);
      if (d.state === 'active' && c) this.applyControl(d, c, dt);
      this.integrate(d, dt);
    }
    this.collideDroids();
    this.updateProjectiles(dt);
    for (const d of this.droids) {
      if (d.state === 'destroyed' && !d.removed) this.remove(d);
      else d.syncMesh(dt, thermal && !d.isPlayer);
    }
    this.effects.update(dt);
  }

  applyControl(d, c, dt) {
    // Drehen
    if (c.face !== null && c.face !== undefined) {
      let diff = c.face - d.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const turn = (d.isPlayer ? 10 : 5) * dt;
      d.facing += Math.max(-turn, Math.min(turn, diff));
    }
    // Beschleunigen
    const s = d.stats;
    d.vel.addScaledVector(c.move, s.accel * dt);
    if (c.move.lengthSq() < 0.01 && d.dashTime <= 0) d.vel.multiplyScalar(Math.exp(-dt * (s.hover ? 1.2 : 3)));
    // Rammstoß
    d.dashCooldown -= dt;
    if (c.dash && d.dashCooldown <= 0) {
      d.dashCooldown = DASH_COOLDOWN * (d.isPlayer ? 1 : 2);
      d.dashTime = DASH_TIME;
      const boost = DASH_SPEED * (s.overloaded ? 0.6 : 1) * (d.isPlayer ? 1 : 0.8);
      d.vel.addScaledVector(d.forward, boost);
      this.emit('dash', { droid: d });
      this.effects.dashTrail(d.pos, d.forward);
    }
    // Waffe
    d.fireCooldown -= dt;
    d.heat = Math.max(0, d.heat - COOL_RATE * dt);
    if (d.overheated && d.heat <= OVERHEAT_RECOVER) d.overheated = false;
    if (c.fire && s.weapon && d.fireCooldown <= 0 && !d.overheated) this.fire(d, c.fire, c.precise);
  }

  integrate(d, dt) {
    if (d.state === 'falling') {
      d.vy -= GRAVITY * dt;
      d.y += d.vy * dt;
      d.pos.addScaledVector(d.vel, dt);
      if (d.y < FALL_DEPTH) {
        d.state = 'destroyed';
        this.emit('fallen', { droid: d, by: d.lastHitBy });
      }
      return;
    }
    if (!d.solid) return;
    // Luftwiderstand: Endgeschwindigkeit = maxSpeed bei vollem Schub
    d.dashTime = Math.max(0, (d.dashTime ?? 0) - dt);
    d.ramImmunity = Math.max(0, (d.ramImmunity ?? 0) - dt);
    const drag = (d.stats.accel / d.stats.maxSpeed) * (d.stats.hover ? 0.75 : 1) * (d.dashTime > 0 ? 0.15 : 1);
    d.vel.multiplyScalar(Math.max(0, 1 - drag * dt));
    if (d.state === 'disabled') d.vel.multiplyScalar(Math.exp(-dt * 2));
    d.pos.addScaledVector(d.vel, dt);
    this.collideWalls(d);

    // Abgrund?
    if (!this.deck.isFloor(d.pos.x, d.pos.z)) {
      d.offFloorTime += dt;
      if (d.offFloorTime > (d.stats.hover && d.active ? COYOTE_HOVER : COYOTE)) {
        d.state = 'falling';
        d.vy = 0;
        this.emit('falling', { droid: d, by: this.time - d.lastHitTime < 3 ? d.lastHitBy : null });
      }
    } else {
      d.offFloorTime = 0;
    }
    // Hover schwebt leicht
    d.y = d.stats.hover && d.active ? 0.05 + Math.sin(this.time * 3 + d.id) * 0.05 : 0;

    // Stromgitter
    if (d.active && !d.stats.hover && this.deck.isHazard(d.pos.x, d.pos.z)) {
      d.hazardTick -= dt;
      if (d.hazardTick <= 0) {
        d.hazardTick = 0.25;
        this.effects.sparks(new THREE.Vector3(d.pos.x, 0.3, d.pos.z), 0x66ccff, 8);
        this.emit('zap', { droid: d });
        if (d.damage(HAZARD_DPS * 0.25, null, this.time)) this.destroyed(d, null);
      }
    }
  }

  collideWalls(d) {
    const [tx, tz] = this.deck.tileCoords(d.pos.x, d.pos.z);
    const half = TILE * 0.45;
    for (let z = tz - 1; z <= tz + 1; z++) {
      for (let x = tx - 1; x <= tx + 1; x++) {
        if (this.deck.charAt(x, z) !== 'X') continue;
        const c = this.deck.tileCenter(x, z);
        const cx = Math.max(c.x - half, Math.min(d.pos.x, c.x + half));
        const cz = Math.max(c.z - half, Math.min(d.pos.z, c.z + half));
        const dx = d.pos.x - cx;
        const dz = d.pos.z - cz;
        const dist = Math.hypot(dx, dz);
        if (dist < d.radius && dist > 1e-5) {
          const nx = dx / dist;
          const nz = dz / dist;
          d.pos.x += nx * (d.radius - dist);
          d.pos.z += nz * (d.radius - dist);
          const vn = d.vel.x * nx + d.vel.z * nz;
          if (vn < 0) {
            d.vel.x -= (1 + RESTITUTION) * vn * nx;
            d.vel.z -= (1 + RESTITUTION) * vn * nz;
            if (-vn > RAM_THRESHOLD && !(d.ramImmunity > 0)) {
              d.ramImmunity = RAM_IMMUNITY;
              if (d.damage((-vn - RAM_THRESHOLD) * RAM_DAMAGE, null, this.time)) this.destroyed(d, null);
              this.emit('ram', { a: d, b: null, speed: -vn });
            }
          }
        }
      }
    }
  }

  collideDroids() {
    const list = this.droids.filter((d) => d.solid);
    const n = new THREE.Vector3();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        n.set(b.pos.x - a.pos.x, 0, b.pos.z - a.pos.z);
        const dist = n.length();
        const minD = a.radius + b.radius;
        if (dist >= minD || dist < 1e-5) continue;
        n.divideScalar(dist);
        const invA = 1 / a.stats.mass;
        const invB = 1 / b.stats.mass;
        const overlap = minD - dist;
        a.pos.addScaledVector(n, (-overlap * invA) / (invA + invB));
        b.pos.addScaledVector(n, (overlap * invB) / (invA + invB));
        const vn = a.vel.clone().sub(b.vel).dot(n);
        if (vn <= 0) continue;
        const imp = ((1 + RESTITUTION) * vn) / (invA + invB);
        a.vel.addScaledVector(n, -imp * invA);
        b.vel.addScaledVector(n, imp * invB);
        if (vn > RAM_THRESHOLD) {
          const base = (vn - RAM_THRESHOLD) * RAM_DAMAGE;
          const ratio = Math.min(2, Math.max(0.5, a.stats.mass / b.stats.mass));
          // Wer schneller in Richtung des anderen fuhr, gilt als Angreifer und steckt weniger ein.
          const aAttacks = a.vel.dot(n) + imp * invA > -b.vel.dot(n) + imp * invB;
          const dmgB = base * ratio * a.stats.ramFactor * (aAttacks ? 1 : ATTACKER_SHARE);
          const dmgA = (base / ratio) * b.stats.ramFactor * (aAttacks ? ATTACKER_SHARE : 1);
          b.lastHitBy = a;
          b.lastHitTime = this.time;
          a.lastHitBy = b;
          a.lastHitTime = this.time;
          if (!(b.ramImmunity > 0)) {
            b.ramImmunity = RAM_IMMUNITY;
            if (b.damage(dmgB, a, this.time)) this.destroyed(b, a);
          }
          if (!(a.ramImmunity > 0)) {
            a.ramImmunity = RAM_IMMUNITY;
            if (a.damage(dmgA, b, this.time)) this.destroyed(a, b);
          }
          const mid = a.pos.clone().addScaledVector(n, a.radius);
          mid.y = 0.5;
          this.effects.sparks(mid, 0xffcc66, 14);
          this.emit('ram', { a: aAttacks ? a : b, b: aAttacks ? b : a, speed: vn });
        }
      }
    }
  }

  fire(d, dir, precise = false) {
    const w = d.stats.weapon;
    d.fireCooldown = 1 / (w.fireRate * (d.isPlayer ? 1 : ENEMY_FIRE_FACTOR));
    d.heat += w.heat;
    if (d.heat >= 100) {
      d.heat = 100;
      d.overheated = true;
      this.emit('overheat', { droid: d });
    }
    const origin = new THREE.Vector3();
    d.mesh.muzzle.getWorldPosition(origin);
    const v = dir.clone().setY(0).normalize();
    const mesh = new THREE.Mesh(this.boltGeo, d.isPlayer ? this.boltMats.player : this.boltMats.enemy);
    mesh.position.copy(origin);
    mesh.lookAt(origin.clone().add(v));
    this.scene.add(mesh);
    this.projectiles.push({
      mesh,
      pos: origin,
      vel: v.multiplyScalar(w.speed),
      owner: d,
      damage: w.damage * (precise ? 1.5 : 1),
      precise,
      life: w.range / w.speed,
    });
    this.effects.muzzle(origin, d.isPlayer ? 0x9fe8ff : 0xff3355);
    this.emit('shot', { droid: d });
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);
      p.life -= dt;
      if (this.deck.isWall(p.pos.x, p.pos.z)) {
        p.life = 0;
        this.effects.sparks(p.pos.clone(), 0xffddaa, 6);
        continue;
      }
      for (const d of this.droids) {
        if (d === p.owner || !d.solid) continue;
        const dx = d.pos.x - p.pos.x;
        const dz = d.pos.z - p.pos.z;
        if (dx * dx + dz * dz < (d.radius + 0.15) ** 2) {
          p.life = 0;
          this.effects.sparks(p.pos.clone(), p.owner.isPlayer ? 0x9fe8ff : 0xff5566, 10);
          d.vel.addScaledVector(p.vel.clone().normalize(), 30 / d.stats.mass);
          const killed = d.damage(p.damage, p.owner, this.time);
          this.emit('hit', { droid: d, by: p.owner, precise: p.precise });
          if (killed) this.destroyed(d, p.owner);
          break;
        }
      }
    }
    for (const p of this.projectiles.filter((x) => x.life <= 0)) this.scene.remove(p.mesh);
    this.projectiles = this.projectiles.filter((x) => x.life > 0);
  }

  destroyed(d, by) {
    d.state = 'destroyed';
    this.effects.explosion(new THREE.Vector3(d.pos.x, 0.6, d.pos.z), d.stats.mass);
    this.emit('destroyed', { droid: d, by });
  }

  remove(d) {
    d.removed = true;
    d.dispose();
  }

  /** Nächster aktiver Gegner in Reichweite (für Kapern und Zielhilfe). */
  nearestHostile(from, maxDist, { cone = null, facing = 0, los = false } = {}) {
    let best = null;
    let bestD = maxDist;
    for (const d of this.hostiles) {
      const dist = Math.hypot(d.pos.x - from.x, d.pos.z - from.z);
      if (dist > bestD) continue;
      if (cone !== null) {
        const ang = Math.atan2(d.pos.x - from.x, d.pos.z - from.z);
        const diff = Math.abs(Math.atan2(Math.sin(ang - facing), Math.cos(ang - facing)));
        if (diff > cone) continue;
      }
      if (los && !this.deck.lineOfSight(from, d.pos)) continue;
      best = d;
      bestD = dist;
    }
    return best;
  }

  clear() {
    for (const d of this.droids) if (!d.removed) d.dispose();
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.droids = [];
    this.projectiles = [];
    this.effects.clear();
  }
}
