// Baut das 3D-Modell eines Droiden modular aus seinen Bauteilen.
// So sieht man jedes erbeutete Teil direkt am Droiden.
import * as THREE from 'three';
import { COMPONENTS } from '../data/components.js';
import { labelTexture } from './textures.js';

const CHASSIS_STYLE = {
  scrap: { color: 0xb5652b, metal: 0.6, rough: 0.7 },
  light: { color: 0xaab1b8, metal: 0.5, rough: 0.4 },
  heavy: { color: 0xd9a514, metal: 0.5, rough: 0.5 },
  guard: { color: 0x34445a, metal: 0.85, rough: 0.3 },
};

const mat = (color, metalness = 0.6, roughness = 0.5, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

/**
 * Gibt { root, body, head, muzzle, hot } zurück.
 * root: Position/Drehung im Spiel, head: Kameraposition für die Roboter-Sicht,
 * muzzle: Mündung, hot: Materialien, die in der Thermalsicht glühen.
 */
export function buildDroidMesh(loadout, { label = null, labelColor = '#ffffff', isPlayer = false } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hot = [];
  const def = (p) => (p ? COMPONENTS[p.id] : null);
  const ch = def(loadout.chassis);
  const dr = def(loadout.drive);
  const pw = def(loadout.power);
  const wp = def(loadout.weapon);
  const devices = (loadout.devices ?? []).map(def);
  const style = CHASSIS_STYLE[ch.look];
  const hullMat = mat(style.color, style.metal, style.rough);
  const darkMat = mat(0x1d2024, 0.7, 0.6);
  hot.push(hullMat);

  // --- Antrieb ---
  let lift = 0.35;
  const scale = ch.look === 'heavy' ? 1.25 : ch.look === 'light' ? 0.85 : 1;
  if (dr.look === 'wheels') {
    const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 14);
    for (const [x, z] of [[-0.38, 0.3], [0.38, 0.3], [-0.38, -0.3], [0.38, -0.3]]) {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x * scale, 0.2, z * scale);
      w.castShadow = true;
      root.add(w);
    }
  } else if (dr.look === 'tracks') {
    lift = 0.45;
    for (const x of [-0.5, 0.5]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.4, 1.15), darkMat);
      t.position.set(x * scale, 0.2, 0);
      t.castShadow = true;
      root.add(t);
      for (let i = -2; i <= 2; i++) {
        const tread = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.08), mat(0x55595e, 0.8, 0.4));
        tread.position.set(x * scale, 0.42, i * 0.22);
        root.add(tread);
      }
    }
  } else if (dr.look === 'hover') {
    lift = 0.6;
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x113344, emissive: 0x44ddff, emissiveIntensity: 2.5 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42 * scale, 0.07, 10, 28), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.32;
    root.add(ring);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.55 * scale, 24),
      new THREE.MeshBasicMaterial({ color: 0x44ddff, transparent: true, opacity: 0.25, depthWrite: false }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    root.add(glow);
  }

  // --- Chassis ---
  let hull;
  let topY;
  if (ch.look === 'scrap') {
    hull = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.6, 8), hullMat);
    hull.position.y = lift + 0.3;
    topY = lift + 0.6;
    // aufgeschweißte Flicken
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.05), mat(0x777b80, 0.8, 0.5));
    patch.position.set(0.15, lift + 0.32, 0.46);
    patch.rotation.z = 0.2;
    body.add(patch);
  } else if (ch.look === 'light') {
    hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.3, 6, 14), hullMat);
    hull.position.y = lift + 0.45;
    topY = lift + 0.85;
  } else if (ch.look === 'heavy') {
    hull = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 1.2), hullMat);
    hull.position.y = lift + 0.38;
    topY = lift + 0.75;
    for (const x of [-0.4, 0, 0.4]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.76, 1.21), mat(0x151515, 0.4, 0.6));
      stripe.position.set(x, lift + 0.38, 0);
      body.add(stripe);
    }
    const ram = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.15), mat(0x8a8f96, 0.9, 0.35));
    ram.position.set(0, lift + 0.2, 0.66);
    body.add(ram);
  } else {
    hull = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.7, 6), hullMat);
    hull.position.y = lift + 0.35;
    topY = lift + 0.7;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.05, 6, 6), mat(0x8899aa, 0.9, 0.25));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = topY;
    body.add(collar);
  }
  hull.castShadow = true;
  hull.receiveShadow = true;
  body.add(hull);

  // --- Energiekern (sichtbar am Rücken) ---
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: pw.color, emissiveIntensity: 1.3 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.13 + pw.pulsers * 0.015, 14, 10), coreMat);
  core.position.set(0, topY - 0.15, -0.45 * scale - (ch.look === 'heavy' ? 0.2 : 0));
  body.add(core);
  hot.push(coreMat);

  // --- Kopf / Sensor ---
  const sensor = devices.find((d) => d?.sensor)?.sensor ?? 'none';
  const head = new THREE.Group();
  head.position.y = topY + 0.18;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x2b2f35, 0.8, 0.3));
  dome.castShadow = true;
  head.add(dome);
  const eyeColor = { cheap: 0xff3322, military: 0x33ffee, thermal: 0xff8800, none: 0x888888 }[sensor];
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: eyeColor, emissiveIntensity: 3 });
  if (sensor === 'military') {
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.1), eyeMat);
    visor.position.set(0, 0.1, 0.18);
    head.add(visor);
  } else {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(sensor === 'thermal' ? 0.08 : 0.06, 10, 8), eyeMat);
    eye.position.set(0, 0.1, 0.2);
    head.add(eye);
  }
  body.add(head);

  // --- Schild ---
  if (devices.some((d) => d?.armor)) {
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(0.95 * scale, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.08, depthWrite: false }),
    );
    shield.position.y = lift + 0.4;
    root.add(shield);
    root.userData.shield = shield;
  }

  // --- Waffe ---
  const muzzle = new THREE.Object3D();
  if (wp) {
    const len = wp.damage > 10 ? 0.75 : 0.5;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, len, 10), mat(0x3a3f45, 0.9, 0.3));
    barrel.rotation.x = Math.PI / 2;
    const side = ch.look === 'heavy' ? 0.62 : 0.5 * scale;
    barrel.position.set(side, topY - 0.15, len / 2);
    barrel.castShadow = true;
    body.add(barrel);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ emissive: wp.damage > 10 ? 0xff2244 : 0x66ccff, emissiveIntensity: 3 }));
    tip.position.set(side, topY - 0.15, len);
    body.add(tip);
    muzzle.position.set(side, topY - 0.15, len + 0.1);
  } else {
    muzzle.position.set(0, topY - 0.15, 0.6);
  }
  body.add(muzzle);

  // --- Klassennummer (wie im Original über dem Droiden) ---
  if (label) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(label, labelColor), depthTest: false, transparent: true }));
    sprite.scale.set(0.9, 0.9, 1);
    sprite.position.y = topY + 0.85;
    sprite.renderOrder = 10;
    root.add(sprite);
    root.userData.label = sprite;
  }

  // Spieler: kleiner Lichtring am Boden zur Orientierung
  if (isPlayer) {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.75 * scale, 0.85 * scale, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.03;
    root.add(marker);
    root.userData.marker = marker;
  }

  const radius = ch.look === 'heavy' ? 0.75 : ch.look === 'guard' ? 0.65 : 0.5;
  return { root, body, head, muzzle, hot, hullMat, radius, eyeHeight: head.position.y + 0.12 };
}

export function disposeMesh(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose();
    const m = o.material;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else if (m) {
      m.map?.dispose?.();
      m.dispose();
    }
  });
}
