// Partikel-Effekte: Funken, Mündungsfeuer, Explosionen. Feste Pools, damit nichts nachläuft.
import * as THREE from 'three';

const MAX_PARTICLES = 600;

export class Effects {
  constructor(scene) {
    this.scene = scene;
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.particles = Array.from({ length: MAX_PARTICLES }, () => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color(), grav: 1 }));
    this.cursor = 0;

    // Ein wiederverwendetes Licht für Explosionen und Mündungsfeuer (günstiger als viele Lichter).
    this.flashLight = new THREE.PointLight(0xffaa55, 0, 10, 2);
    scene.add(this.flashLight);
    this.flashTime = 0;
    this.flashMax = 1;
    this.flashPeak = 0;

    this.shockwaves = [];
    this.waveGeo = new THREE.RingGeometry(0.6, 1, 40);
    this.waveGeo.rotateX(-Math.PI / 2);
  }

  emit(pos, color, count, { speed = 4, up = 2, life = 0.5, grav = 1 } = {}) {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const part = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % MAX_PARTICLES;
      part.p.copy(pos);
      part.v.set((Math.random() - 0.5) * speed, Math.random() * up, (Math.random() - 0.5) * speed);
      part.c.copy(c);
      part.max = part.life = life * (0.6 + Math.random() * 0.8);
      part.grav = grav;
    }
  }

  sparks(pos, color = 0xffcc66, count = 10) {
    this.emit(pos, color, count, { speed: 6, up: 4, life: 0.4 });
  }

  muzzle(pos, color) {
    this.emit(pos, color, 4, { speed: 1.5, up: 0.5, life: 0.12, grav: 0 });
    this.flash(pos, color, 3, 0.06);
  }

  dashTrail(pos, dir) {
    const p = pos.clone().addScaledVector(dir, -0.5).setY(0.15);
    this.emit(p, 0xaaccff, 16, { speed: 2.5, up: 0.6, life: 0.35, grav: 0.2 });
  }

  explosion(pos, mass = 60) {
    const s = Math.min(2, mass / 70);
    this.emit(pos, 0xffaa33, Math.round(60 * s), { speed: 10 * s, up: 8, life: 0.9 });
    this.emit(pos, 0xff4411, Math.round(40 * s), { speed: 6 * s, up: 5, life: 1.2 });
    this.emit(pos, 0x444444, 30, { speed: 4, up: 6, life: 1.6, grav: 0.4 });
    this.flash(pos, 0xffaa55, 40 * s, 0.5);
    const wave = new THREE.Mesh(this.waveGeo, new THREE.MeshBasicMaterial({ color: 0xffbb66, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    wave.position.set(pos.x, 0.05, pos.z);
    this.scene.add(wave);
    this.shockwaves.push({ mesh: wave, t: 0, max: 0.5, scale: 4 * s });
  }

  flash(pos, color, intensity, duration) {
    if (intensity < this.flashPeak * (this.flashTime / this.flashMax)) return;
    this.flashLight.position.copy(pos).setY(Math.max(pos.y, 0.8));
    this.flashLight.color.setHex(color);
    this.flashPeak = intensity;
    this.flashTime = this.flashMax = duration;
  }

  update(dt) {
    const pos = this.positions;
    const col = this.colors;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const part = this.particles[i];
      if (part.life > 0) {
        part.life -= dt;
        part.v.y -= 12 * part.grav * dt;
        part.p.addScaledVector(part.v, dt);
        if (part.p.y < 0.02 && part.grav > 0) {
          part.p.y = 0.02;
          part.v.y *= -0.3;
          part.v.x *= 0.7;
          part.v.z *= 0.7;
        }
        const k = Math.max(0, part.life / part.max);
        pos[i * 3] = part.p.x;
        pos[i * 3 + 1] = part.p.y;
        pos[i * 3 + 2] = part.p.z;
        col[i * 3] = part.c.r * k;
        col[i * 3 + 1] = part.c.g * k;
        col[i * 3 + 2] = part.c.b * k;
      } else {
        pos[i * 3 + 1] = -1000;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;

    if (this.flashTime > 0) {
      this.flashTime -= dt;
      this.flashLight.intensity = Math.max(0, this.flashPeak * (this.flashTime / this.flashMax));
    } else {
      this.flashLight.intensity = 0;
      this.flashPeak = 0;
    }

    for (const w of this.shockwaves) {
      w.t += dt;
      const k = w.t / w.max;
      w.mesh.scale.setScalar(0.3 + k * w.scale);
      w.mesh.material.opacity = 0.8 * (1 - k);
    }
    for (const w of this.shockwaves.filter((x) => x.t >= x.max)) {
      this.scene.remove(w.mesh);
      w.mesh.material.dispose();
    }
    this.shockwaves = this.shockwaves.filter((x) => x.t < x.max);
  }

  clear() {
    for (const p of this.particles) p.life = 0;
    for (const w of this.shockwaves) this.scene.remove(w.mesh);
    this.shockwaves = [];
  }
}
