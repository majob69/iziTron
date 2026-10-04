// Deck: Kachelkarte → 3D-Geometrie und Abfragen (Boden? Wand? Sichtlinie?).
import * as THREE from 'three';
import { floorTextures, gratingTexture, hazardStripeTexture, gridTexture, panelTexture } from './textures.js';

export const TILE = 2;
const FLOOR_THICK = 0.5;
const PILLAR_H = 5;
const BRIDGE_HALF = 0.36;

export class Deck {
  constructor(def) {
    this.def = def;
    const width = Math.max(...def.map.map((r) => r.length));
    this.rows = def.map.map((r) => r.padEnd(width, ' '));
    this.w = width;
    this.h = this.rows.length;
    this.spawns = [];
    this.player = null;
    this.terminals = [];
    this.rows.forEach((row, z) =>
      [...row].forEach((ch, x) => {
        const p = this.tileCenter(x, z);
        if (ch === 'S') this.player = p;
        else if (ch === 'T') this.terminals.push(p);
        else if ('135'.includes(ch)) this.spawns.push({ type: { 1: '123', 3: '349', 5: '516' }[ch], pos: p });
      }),
    );
    this.group = new THREE.Group();
    this.animated = [];
  }

  tileCenter(x, z) {
    return new THREE.Vector3((x - this.w / 2 + 0.5) * TILE, 0, (z - this.h / 2 + 0.5) * TILE);
  }

  tileCoords(px, pz) {
    return [Math.floor(px / TILE + this.w / 2), Math.floor(pz / TILE + this.h / 2)];
  }

  charAt(x, z) {
    if (z < 0 || z >= this.h || x < 0 || x >= this.w) return ' ';
    return this.rows[z][x];
  }

  charAtPos(px, pz) {
    const [x, z] = this.tileCoords(px, pz);
    return this.charAt(x, z);
  }

  isFloorChar(ch) {
    return ch !== ' ' && ch !== 'X';
  }

  /** Stege sind schmaler als eine Kachel: daneben geht es in die Tiefe. */
  isFloor(px, pz) {
    const [x, z] = this.tileCoords(px, pz);
    const ch = this.charAt(x, z);
    if (!this.isFloorChar(ch)) return false;
    if (ch !== '=') return true;
    const c = this.tileCenter(x, z);
    const half = TILE * BRIDGE_HALF;
    return this.bridgeHorizontal(x, z) ? Math.abs(pz - c.z) < half : Math.abs(px - c.x) < half;
  }

  bridgeHorizontal(x, z) {
    const solid = (ch) => this.isFloorChar(ch);
    return solid(this.charAt(x - 1, z)) || solid(this.charAt(x + 1, z));
  }

  isWall(px, pz) {
    return this.charAtPos(px, pz) === 'X';
  }

  isHazard(px, pz) {
    return this.charAtPos(px, pz) === 'G';
  }

  isTerminal(px, pz) {
    return this.charAtPos(px, pz) === 'T';
  }

  /** Sichtlinie: nur Pfeiler blockieren, Abgründe nicht. */
  lineOfSight(a, b) {
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.ceil(dist / (TILE * 0.25));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.isWall(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }

  /** Alle begehbaren Kachelmittelpunkte (für Patrouillen). */
  floorTiles() {
    const out = [];
    this.rows.forEach((row, z) => [...row].forEach((ch, x) => this.isFloorChar(ch) && ch !== 'G' && out.push(this.tileCenter(x, z))));
    return out;
  }

  build(quality) {
    const { map, roughnessMap } = floorTextures();
    const floorMat = new THREE.MeshStandardMaterial({ map, roughnessMap, metalness: 0.75, roughness: 1 });
    const grating = new THREE.MeshStandardMaterial({ map: gratingTexture(), metalness: 0.8, roughness: 0.55 });
    const stripe = new THREE.MeshStandardMaterial({ map: hazardStripeTexture(), metalness: 0.3, roughness: 0.6, emissive: 0x332200, emissiveIntensity: 0.6 });
    const gridMat = new THREE.MeshStandardMaterial({ map: gridTexture(), emissive: 0x2aa8ff, emissiveMap: gridTexture(), emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.4 });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x2a2e33, metalness: 0.7, roughness: 0.6 });
    const panelMat = new THREE.MeshStandardMaterial({ map: panelTexture(), metalness: 0.6, roughness: 0.5 });
    const glowCyan = new THREE.MeshStandardMaterial({ color: 0x0a2a33, emissive: 0x33e0ff, emissiveIntensity: 2.2 });
    const glowAmber = new THREE.MeshStandardMaterial({ color: 0x331a00, emissive: 0xffa024, emissiveIntensity: 2.0 });
    this.gridMat = gridMat;

    const floorGeo = new THREE.BoxGeometry(TILE, FLOOR_THICK, TILE);
    const bridgeGeo = new THREE.BoxGeometry(TILE * BRIDGE_HALF * 2, FLOOR_THICK * 0.5, TILE);
    const counts = { floor: 0, bridge: 0, grid: 0 };
    this.rows.forEach((row) => [...row].forEach((ch) => {
      if (ch === '=') counts.bridge++;
      else if (ch === 'G') counts.grid++;
      else if (this.isFloorChar(ch) || ch === 'X') counts.floor++;
    }));
    const floors = new THREE.InstancedMesh(floorGeo, [sideMat, sideMat, floorMat, sideMat, sideMat, sideMat], counts.floor);
    const bridges = new THREE.InstancedMesh(bridgeGeo, grating, counts.bridge);
    const grids = new THREE.InstancedMesh(floorGeo, [sideMat, sideMat, gridMat, sideMat, sideMat, sideMat], counts.grid);
    for (const m of [floors, bridges, grids]) {
      m.receiveShadow = true;
      m.castShadow = false;
    }
    const mtx = new THREE.Matrix4();
    const idx = { floor: 0, bridge: 0, grid: 0 };
    const stripeGeoX = new THREE.BoxGeometry(TILE, 0.06, 0.22);
    const stripeGeoZ = new THREE.BoxGeometry(0.22, 0.06, TILE);
    const stripes = [];

    this.rows.forEach((row, z) => [...row].forEach((ch, x) => {
      if (ch === ' ') return;
      const p = this.tileCenter(x, z);
      if (ch === '=') {
        const horizontal = this.bridgeHorizontal(x, z);
        mtx.makeRotationY(horizontal ? Math.PI / 2 : 0).setPosition(p.x, -FLOOR_THICK * 0.25, p.z);
        bridges.setMatrixAt(idx.bridge++, mtx);
        return;
      }
      mtx.makeTranslation(p.x, -FLOOR_THICK / 2, p.z);
      if (ch === 'G') grids.setMatrixAt(idx.grid++, mtx);
      else floors.setMatrixAt(idx.floor++, mtx);

      // Warnstreifen an Kanten zum Abgrund (nicht an Stegen)
      const edges = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [dx, dz] of edges) {
        if (this.charAt(x + dx, z + dz) !== ' ') continue;
        const s = new THREE.Mesh(dx === 0 ? stripeGeoX : stripeGeoZ, stripe);
        s.position.set(p.x + dx * (TILE / 2 - 0.11), 0.03, p.z + dz * (TILE / 2 - 0.11));
        s.receiveShadow = true;
        stripes.push(s);
      }

      if (ch === 'X') {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(TILE * 0.9, PILLAR_H, TILE * 0.9), panelMat);
        pillar.position.set(p.x, PILLAR_H / 2, p.z);
        pillar.castShadow = pillar.receiveShadow = true;
        this.group.add(pillar);
        for (const side of [-1, 1]) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, PILLAR_H * 0.8, 0.3), glowCyan);
          strip.position.set(p.x + side * TILE * 0.455, PILLAR_H / 2, p.z);
          this.group.add(strip);
        }
      }
      if (ch === 'T') this.buildTerminal(p, glowAmber, panelMat);
    }));
    for (const m of [floors, bridges, grids]) m.instanceMatrix.needsUpdate = true;
    this.group.add(floors, bridges, grids, ...stripes);

    // Bodenleuchten an Stegen
    this.rows.forEach((row, z) => [...row].forEach((ch, x) => {
      if (ch !== '=') return;
      const p = this.tileCenter(x, z);
      const horizontal = this.bridgeHorizontal(x, z);
      for (const side of [-1, 1]) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? TILE : 0.06, 0.05, horizontal ? 0.06 : TILE), glowCyan);
        l.position.set(p.x + (horizontal ? 0 : side * TILE * 0.36), 0.02, p.z + (horizontal ? side * TILE * 0.36 : 0));
        this.group.add(l);
      }
    }));

    this.buildBackdrop(quality);
    return this.group;
  }

  buildTerminal(p, glow, panelMat) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.6), panelMat);
    base.position.set(p.x, 0.65, p.z - 0.6);
    base.castShadow = true;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), glow);
    screen.position.set(p.x, 1.05, p.z - 0.29);
    screen.rotation.x = -0.3;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.9, 32), new THREE.MeshBasicMaterial({ color: 0xffa024, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(p.x, 0.03, p.z);
    this.animated.push((t) => (ring.material.opacity = 0.35 + 0.25 * Math.sin(t * 3)));
    const light = new THREE.PointLight(0xffa024, 6, 6, 2);
    light.position.set(p.x, 1.5, p.z);
    this.group.add(base, screen, ring, light);
  }

  buildBackdrop(quality) {
    // Glühender Schacht tief unten + Nebel sorgen für Tiefe beim Absturz.
    const pit = new THREE.Mesh(
      new THREE.PlaneGeometry(this.w * TILE * 3, this.h * TILE * 3),
      new THREE.MeshBasicMaterial({ color: 0x401008 }),
    );
    pit.rotation.x = -Math.PI / 2;
    pit.position.y = -40;
    this.group.add(pit);

    // Ferne Stützträger rund um das Deck
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x1b1e22, metalness: 0.8, roughness: 0.5 });
    const n = quality === 'low' ? 6 : 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = Math.max(this.w, this.h) * TILE * 0.75;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.5, 60, 1.5), beamMat);
      beam.position.set(Math.cos(a) * r, -15, Math.sin(a) * r);
      this.group.add(beam);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff4422 : 0x33ccff }));
      lamp.position.set(beam.position.x, 4 - (i % 3) * 6, beam.position.z);
      this.group.add(lamp);
    }
  }

  update(t) {
    if (this.gridMat) this.gridMat.emissiveIntensity = 1.2 + Math.abs(Math.sin(t * 7)) * 1.4 * (Math.random() > 0.1 ? 1 : 0.2);
    for (const f of this.animated) f(t);
  }
}
