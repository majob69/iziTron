// HUD: Hülle, Hitze, Energie, Ziel-Scan, Funksprüche von MOTHER.
import { COMPONENTS } from '../data/components.js';
import { partsOf } from '../logic/loadout.js';
import { CAMERA_NAMES } from '../game/camera.js';
import { SENSOR_NAMES } from '../game/sensor-pass.js';
import { QUALITY_NAMES } from '../game/renderer.js';

export class Hud {
  constructor() {
    this.$ = (id) => document.getElementById(id);
    this.hull = this.$('hud-hull');
    this.heat = this.$('hud-heat');
    this.hullText = this.$('hud-hull-text');
    this.info = this.$('hud-info');
    this.status = this.$('hud-status');
    this.target = this.$('hud-target');
    this.msg = this.$('hud-msg');
    this.prompt = this.$('hud-prompt');
    this.crosshair = this.$('crosshair');
    this.msgTimer = 0;
    this.queue = [];
  }

  say(text, seconds = 3.5) {
    this.queue.push({ text, seconds });
    if (this.msgTimer <= 0) this.next();
  }

  next() {
    const m = this.queue.shift();
    if (!m) {
      this.msg.classList.remove('show');
      return;
    }
    this.msg.innerHTML = `<span class="who">MOTHER</span> ${m.text}`;
    this.msg.classList.add('show');
    this.msgTimer = m.seconds;
  }

  update(dt, { player, world, camMode, fps, quality, target, prompt, povBlend }) {
    this.msgTimer -= dt;
    if (this.msgTimer <= 0 && (this.queue.length || this.msg.classList.contains('show'))) this.next();

    const s = player.stats;
    const hr = player.hullRatio;
    this.hull.style.width = `${hr * 100}%`;
    this.hull.className = hr < 0.3 ? 'low' : '';
    this.hullText.textContent = `${Math.max(0, Math.round(player.hull))} / ${s.hull}`;
    this.heat.style.width = `${player.heat}%`;
    this.heat.className = player.overheated ? 'over' : player.heat > 70 ? 'hot' : '';
    this.info.innerHTML = [
      `<span class="${s.overloaded ? 'bad' : ''}">⚡ ${s.powerUse}/${s.powerOut}</span>`,
      `<span>◆ ${s.pulsers} Pulser</span>`,
      `<span class="${s.sluggish ? 'warn' : ''}">» ${s.maxSpeed.toFixed(1)} m/s</span>`,
      `<span>◉ ${SENSOR_NAMES[s.sensor]}</span>`,
      player.dashCooldown > 0 ? `<span class="muted">Rammen ${player.dashCooldown.toFixed(1)}s</span>` : '<span class="good">Rammen bereit</span>',
    ].join('');
    const left = world.hostiles.length;
    this.status.innerHTML = `Gegner aktiv: <b>${left}</b> · ${CAMERA_NAMES[camMode]} · Grafik ${QUALITY_NAMES[quality]} · ${fps} FPS`;

    // Ziel-Scan: in der Optik-Sicht vollständig, sonst nur Klasse und Hülle.
    if (target) {
      const full = camMode === 'pov';
      const parts = full
        ? `<ul>${partsOf(target.loadout).map((p) => `<li>${COMPONENTS[p.id].name}</li>`).join('')}</ul><p class="scan-note">${target.type.scan}</p>`
        : '<p class="muted">Optik-Sicht [C] für Detail-Scan</p>';
      this.target.innerHTML = `<div class="t-head"><b class="k${target.type.klass}">${target.code}</b> ${target.name}</div>
        <div class="bar"><div style="width:${target.hullRatio * 100}%"></div></div>
        <div class="t-sub">Pulser ${target.stats.pulsers} · Masse ${target.stats.mass}${target.hullRatio < 0.5 ? ' · <span class="good">beschädigt</span>' : ''}</div>${parts}`;
      this.target.classList.add('show');
    } else {
      this.target.classList.remove('show');
    }

    this.prompt.textContent = prompt ?? '';
    this.prompt.classList.toggle('show', !!prompt);
    this.crosshair.style.opacity = povBlend;
  }
}
