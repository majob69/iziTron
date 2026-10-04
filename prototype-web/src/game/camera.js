// Kamera-Rig: Taktik-Iso, Verfolger, Roboter-Sicht (POV) mit weichem Kameraflug dazwischen.
import * as THREE from 'three';

export const CAMERA_MODES = ['iso', 'chase', 'pov'];
export const CAMERA_NAMES = { iso: 'Taktik-Iso', chase: 'Verfolger', pov: 'Optik-Sicht' };

const ISO_ELEVATION = 0.92; // ~53°
const TRANSITION = 0.45;

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'iso';
    this.yaw = Math.PI / 4;
    this.yawTarget = this.yaw;
    this.zoom = 1;
    this.pos = new THREE.Vector3(0, 20, 20);
    this.look = new THREE.Vector3();
    this.fov = 32;
    this.transition = 0;
    this.shakeAmt = 0;
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.transition = TRANSITION;
  }

  cycle() {
    this.setMode(CAMERA_MODES[(CAMERA_MODES.indexOf(this.mode) + 1) % CAMERA_MODES.length]);
    return this.mode;
  }

  rotate(dir) {
    this.yawTarget += (dir * Math.PI) / 2;
  }

  addZoom(delta) {
    this.zoom = Math.min(1.8, Math.max(0.55, this.zoom * (1 + delta)));
  }

  shake(amount) {
    this.shakeAmt = Math.min(0.6, this.shakeAmt + amount);
  }

  /** Bildschirm-"oben" in Weltrichtung (für die Iso-Steuerung). */
  screenAxes() {
    const f = new THREE.Vector3(-Math.sin(this.yawTarget), 0, -Math.cos(this.yawTarget));
    const r = new THREE.Vector3(-f.z, 0, f.x);
    return { forward: f, right: r };
  }

  /** Mischfaktor 0..1 für den Sensor-Effekt (nur in der POV-Sicht und nach dem Kameraflug). */
  get povBlend() {
    if (this.mode !== 'pov') return 0;
    return 1 - Math.min(1, this.transition / TRANSITION);
  }

  update(dt, droid, instant = false) {
    this.yaw += (this.yawTarget - this.yaw) * (1 - Math.exp(-dt * 8));
    this.transition = Math.max(0, this.transition - dt);
    const p = new THREE.Vector3(droid.pos.x, droid.y, droid.pos.z);
    const fwd = droid.forward;
    let desiredPos;
    let desiredLook;
    let fov;

    if (this.mode === 'iso') {
      const dist = 19 * this.zoom;
      desiredPos = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(ISO_ELEVATION) * dist,
        Math.sin(ISO_ELEVATION) * dist,
        Math.cos(this.yaw) * Math.cos(ISO_ELEVATION) * dist,
      ).add(p);
      desiredLook = p.clone();
      fov = 32;
    } else if (this.mode === 'chase') {
      desiredPos = p.clone().addScaledVector(fwd, -4.6 * this.zoom).setY(p.y + 2.6 * this.zoom);
      desiredLook = p.clone().addScaledVector(fwd, 3).setY(p.y + 0.8);
      fov = 60;
    } else {
      const eye = droid.mesh.eyeHeight + droid.y;
      desiredPos = p.clone().addScaledVector(fwd, 0.3).setY(eye);
      desiredLook = desiredPos.clone().addScaledVector(fwd, 10).setY(eye - 0.6);
      fov = 72;
    }

    const k = instant ? 1 : 1 - Math.exp(-dt * (this.transition > 0 ? 7 : this.mode === 'pov' ? 28 : 9));
    this.pos.lerp(desiredPos, k);
    this.look.lerp(desiredLook, k);
    this.fov += (fov - this.fov) * k;

    const cam = this.camera;
    cam.position.copy(this.pos);
    if (this.shakeAmt > 0) {
      cam.position.x += (Math.random() - 0.5) * this.shakeAmt;
      cam.position.y += (Math.random() - 0.5) * this.shakeAmt;
      cam.position.z += (Math.random() - 0.5) * this.shakeAmt;
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.5);
    }
    cam.lookAt(this.look);
    if (Math.abs(cam.fov - this.fov) > 0.01) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
    // In der Roboter-Sicht den eigenen Körper ausblenden, sobald die Kamera drin ist.
    droid.mesh.body.visible = !(this.mode === 'pov' && this.pos.distanceTo(desiredPos) < 1.2);
  }
}
