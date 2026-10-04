// Eingabe: Tastatur, Gamepad und Touch (virtueller Stick + Tasten).
// Liefert eine Bewegungsachse und Ereignisse ("dash", "action", "cam", ...).

const KEY_ACTIONS = {
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyF: 'action',
  KeyG: 'action',
  Enter: 'action',
  KeyC: 'cam',
  KeyV: 'cam',
  KeyQ: 'rotL',
  KeyE: 'rotR',
  KeyP: 'quality',
  Escape: 'pause',
};

export class Input {
  constructor(root) {
    this.keys = new Set();
    this.triggers = new Set();
    this.move = { x: 0, y: 0 };
    this.fireHeld = false;
    this.zoomDelta = 0;
    this.stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.touchFire = false;
    this.gamepadPrev = {};
    this.usingTouch = false;
    this.enabled = true;

    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.repeat) return;
      this.keys.add(e.code);
      const a = KEY_ACTIONS[e.code];
      if (a) this.triggers.add(a);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('wheel', (e) => (this.zoomDelta += Math.sign(e.deltaY) * 0.08), { passive: true });
    this.buildTouch(root);
  }

  buildTouch(root) {
    const touch = document.createElement('div');
    touch.id = 'touch';
    touch.innerHTML = `
      <div class="stick-zone"><div class="stick-base"><div class="stick-knob"></div></div></div>
      <div class="touch-buttons">
        <button data-act="fire" class="tb tb-fire">FEUER</button>
        <button data-act="dash" class="tb tb-dash">RAMMEN</button>
        <button data-act="action" class="tb tb-action">KAPERN</button>
        <button data-act="cam" class="tb tb-cam">SICHT</button>
        <button data-act="rotL" class="tb tb-rot tb-rotl">⟲</button>
        <button data-act="rotR" class="tb tb-rot tb-rotr">⟳</button>
      </div>`;
    root.appendChild(touch);
    this.touchEl = touch;
    const zone = touch.querySelector('.stick-zone');
    const base = touch.querySelector('.stick-base');
    const knob = touch.querySelector('.stick-knob');
    const R = 55;

    zone.addEventListener('pointerdown', (e) => {
      this.setTouchMode(true);
      this.stick = { active: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      base.style.left = `${e.clientX - 70}px`;
      base.style.top = `${e.clientY - 70}px`;
      base.classList.add('on');
      zone.setPointerCapture(e.pointerId);
    });
    zone.addEventListener('pointermove', (e) => {
      if (!this.stick.active || e.pointerId !== this.stick.id) return;
      let dx = e.clientX - this.stick.ox;
      let dy = e.clientY - this.stick.oy;
      const len = Math.hypot(dx, dy);
      if (len > R) {
        dx = (dx / len) * R;
        dy = (dy / len) * R;
      }
      this.stick.x = dx / R;
      this.stick.y = -dy / R;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const end = (e) => {
      if (e.pointerId !== this.stick.id) return;
      this.stick.active = false;
      this.stick.x = this.stick.y = 0;
      knob.style.transform = '';
      base.classList.remove('on');
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    for (const b of touch.querySelectorAll('.tb')) {
      const act = b.dataset.act;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.setTouchMode(true);
        b.classList.add('down');
        if (act === 'fire') this.touchFire = true;
        else this.triggers.add(act);
      });
      const up = () => {
        b.classList.remove('down');
        if (act === 'fire') this.touchFire = false;
      };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointerleave', up);
      b.addEventListener('pointercancel', up);
    }
    if (matchMedia('(pointer: coarse)').matches) this.setTouchMode(true);
  }

  setTouchMode(on) {
    if (this.usingTouch === on) return;
    this.usingTouch = on;
    document.body.classList.toggle('touch-mode', on);
  }

  setActionLabel(text) {
    const b = this.touchEl.querySelector('.tb-action');
    if (b.textContent !== text) b.textContent = text;
  }

  /** Einmal pro Frame aufrufen. */
  poll() {
    const k = this.keys;
    let x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let fire = k.has('Space') || this.touchFire;
    if (this.stick.active) {
      x = this.stick.x;
      y = this.stick.y;
    }

    // Gamepad (Standard-Layout)
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const ax = Math.abs(gp.axes[0]) > 0.15 ? gp.axes[0] : 0;
      const ay = Math.abs(gp.axes[1]) > 0.15 ? -gp.axes[1] : 0;
      if (ax || ay) {
        x = ax;
        y = ay;
      }
      const map = { 1: 'dash', 2: 'action', 3: 'cam', 4: 'rotL', 5: 'rotR', 9: 'pause' };
      gp.buttons.forEach((b, i) => {
        const was = this.gamepadPrev[i];
        if (b.pressed && !was && map[i]) this.triggers.add(map[i]);
        this.gamepadPrev[i] = b.pressed;
      });
      if (gp.buttons[0]?.pressed || gp.buttons[7]?.pressed) fire = true;
      if (Math.abs(gp.axes[3] ?? 0) > 0.3) this.zoomDelta += gp.axes[3] * 0.02;
      break;
    }

    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    this.move.x = x;
    this.move.y = y;
    this.fireHeld = fire;
  }

  consume(name) {
    const had = this.triggers.has(name);
    this.triggers.delete(name);
    return had;
  }

  takeZoom() {
    const z = this.zoomDelta;
    this.zoomDelta = 0;
    return z;
  }

  clear() {
    this.triggers.clear();
  }
}
