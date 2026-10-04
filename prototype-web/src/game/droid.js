// Droiden-Objekt: Werte aus dem Loadout, Zustand, 3D-Modell.
import * as THREE from 'three';
import { computeStats } from '../logic/loadout.js';
import { DROID_TYPES } from '../data/droids.js';
import { buildDroidMesh, disposeMesh } from './droid-mesh.js';

let nextId = 1;

export class Droid {
  constructor(typeKey, pos, { isPlayer = false } = {}) {
    this.id = nextId++;
    this.typeKey = typeKey;
    this.type = DROID_TYPES[typeKey];
    this.isPlayer = isPlayer;
    this.loadout = this.type.loadout();
    this.pos = pos.clone();
    this.home = pos.clone();
    this.vel = new THREE.Vector3();
    this.y = 0;
    this.vy = 0;
    this.facing = Math.random() * Math.PI * 2;
    this.state = 'active'; // active | disabled | falling | destroyed
    this.heat = 0;
    this.overheated = false;
    this.fireCooldown = 0;
    this.dashCooldown = 0;
    this.dashTime = 0;
    this.offFloorTime = 0;
    this.hazardTick = 0;
    this.flash = 0;
    this.lastHitBy = null;
    this.lastHitTime = -99;
    this.ai = { alerted: false, timer: 0, target: null, strafe: 1 };
    this.mesh = null;
    this.applyLoadout({ resetHull: true });
  }

  get code() {
    return this.type.code;
  }

  get name() {
    return this.type.name;
  }

  get forward() {
    return new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
  }

  get active() {
    return this.state === 'active';
  }

  get solid() {
    return this.state === 'active' || this.state === 'disabled';
  }

  get hostile() {
    return !this.isPlayer && this.state === 'active';
  }

  get hullRatio() {
    return Math.max(0, this.hull / this.stats.hull);
  }

  /** Neues Loadout übernehmen: Werte neu berechnen und Modell neu bauen. */
  applyLoadout({ resetHull = false } = {}) {
    const ratio = this.stats ? this.hullRatio : 1;
    this.stats = computeStats(this.loadout);
    this.hull = resetHull ? this.stats.hull : Math.max(1, Math.round(this.stats.hull * ratio));
    this.rebuildMesh();
  }

  rebuildMesh() {
    const parent = this.mesh?.root.parent ?? null;
    if (this.mesh) {
      parent?.remove(this.mesh.root);
      disposeMesh(this.mesh.root);
    }
    this.mesh = buildDroidMesh(this.loadout, {
      label: this.isPlayer ? null : this.code,
      labelColor: { 1: '#9fffa0', 3: '#ffd23f', 5: '#ff5c5c' }[this.type.klass] ?? '#ffffff',
      isPlayer: this.isPlayer,
    });
    this.radius = this.mesh.radius;
    parent?.add(this.mesh.root);
    if (this.state === 'disabled') this.showDisabled();
    this.syncMesh(0);
  }

  showDisabled() {
    for (const m of this.mesh.hot) {
      m.emissive?.setHex(0x000000);
      m.color?.multiplyScalar(0.45);
    }
    this.mesh.root.traverse((o) => {
      if (o.material?.emissiveIntensity !== undefined) o.material.emissiveIntensity = 0.05;
    });
    const label = this.mesh.root.userData.label;
    if (label) label.material.opacity = 0.35;
    this.mesh.body.rotation.z = 0.25;
    this.mesh.body.position.y = -0.1;
  }

  disable() {
    this.state = 'disabled';
    this.vel.multiplyScalar(0.2);
    this.showDisabled();
  }

  /** Schaden mit Panzerung. Gibt true zurück, wenn der Droide dabei zerstört wurde. */
  damage(amount, source = null, time = 0) {
    if (!this.solid) return false;
    const dealt = amount * (1 - this.stats.armor);
    this.hull -= dealt;
    this.flash = 0.12;
    if (source) {
      this.lastHitBy = source;
      this.lastHitTime = time;
    }
    if (!this.isPlayer && source?.isPlayer) this.ai.alerted = true;
    if (this.hull <= 0) {
      this.hull = 0;
      this.state = 'destroyed';
      return true;
    }
    return false;
  }

  syncMesh(dt, thermal = false) {
    const r = this.mesh.root;
    r.position.set(this.pos.x, this.y, this.pos.z);
    r.rotation.y = this.facing;
    if (this.state === 'falling') {
      r.rotation.x += dt * 3;
      r.rotation.z += dt * 2;
    }
    // Trefferblitz / Thermalsicht
    if (this.state === 'active') {
      const glow = this.flash > 0 ? 1 : thermal ? 0.9 : 0;
      for (const m of this.mesh.hot) {
        if (!m.userData.baseEmissive) {
          m.userData.baseEmissive = m.emissive.getHex();
          m.userData.baseIntensity = m.emissiveIntensity;
        }
        if (glow > 0) {
          m.emissive.setHex(this.flash > 0 ? 0xffffff : 0xffe0c0);
          m.emissiveIntensity = this.flash > 0 ? 1.2 : 0.9;
        } else {
          m.emissive.setHex(m.userData.baseEmissive);
          m.emissiveIntensity = m.userData.baseIntensity;
        }
      }
    }
    this.flash = Math.max(0, this.flash - dt);
    const shield = r.userData.shield;
    if (shield) shield.material.opacity = this.active ? 0.06 + Math.max(0, this.flash) * 2 : 0;
    const marker = r.userData.marker;
    if (marker) marker.material.opacity = 0.35 + 0.25 * Math.sin(performance.now() / 300);
  }

  dispose() {
    this.mesh.root.parent?.remove(this.mesh.root);
    disposeMesh(this.mesh.root);
  }
}
