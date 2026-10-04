// Darstellung und Bedienung des Grapple-Minispiels (Holo-Platine auf Canvas).
import {
  PLAYER, ENEMY, createBoard, createMatch, fire, step, aiThink, result, feeding, canFire, count,
} from '../logic/grapple.js';

const COLORS = {
  [PLAYER]: '#ffd23f',
  [ENEMY]: '#c04dff',
};
const DIM = {
  [PLAYER]: 'rgba(255,210,63,0.28)',
  [ENEMY]: 'rgba(192,77,255,0.28)',
};
const WARMUP = 2.2;
const DURATION = 12;

export class GrappleView {
  constructor(root, sfx) {
    this.sfx = sfx;
    this.el = document.createElement('div');
    this.el.id = 'grapple';
    this.el.className = 'overlay hidden';
    this.canvas = document.createElement('canvas');
    this.el.appendChild(this.canvas);
    root.appendChild(this.el);
    this.ctx = this.canvas.getContext('2d');
    this.match = null;
    this.selected = 0;
    this.padPrev = {};

    this.canvas.addEventListener('pointerdown', (e) => this.onPointer(e));
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('resize', () => this.layout());
  }

  get active() {
    return !!this.match;
  }

  /** Startet das Kapern. onDone(result, info) wird nach Bestätigung aufgerufen. */
  open(player, enemy, onDone) {
    // Angeschossene Gegner wehren sich schwächer: unter 50 % Hülle −1 Pulser, unter 25 % −2.
    const penalty = enemy.hullRatio < 0.25 ? 2 : enemy.hullRatio < 0.5 ? 1 : 0;
    const damaged = penalty > 0;
    const board = createBoard({ seed: (Math.random() * 2 ** 31) >>> 0, complexity: enemy.type.complexity });
    this.match = createMatch({
      board,
      player: { pulsers: player.stats.pulsers, pulseDuration: player.stats.pulseDuration },
      enemy: { pulsers: Math.max(1, enemy.stats.pulsers - penalty), pulseDuration: enemy.stats.pulseDuration },
      duration: DURATION,
      warmup: WARMUP,
      seed: (Math.random() * 2 ** 31) >>> 0,
    });
    this.player = player;
    this.enemy = enemy;
    this.damaged = damaged;
    this.penalty = penalty;
    this.onDone = onDone;
    this.finishedAt = null;
    this.selected = 5;
    this.prevCells = this.match.cells.slice();
    this.flips = new Array(board.rows).fill(0);
    this.el.classList.remove('hidden');
    this.layout();
    this.sfx.play('grappleStart');
  }

  close() {
    this.match = null;
    this.el.classList.add('hidden');
  }

  layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bw = Math.min(this.w * 0.96, 980);
    const bh = Math.min(this.h * 0.72, 640);
    this.board = { x: (this.w - bw) / 2, y: this.h * 0.14, w: bw, h: bh };
    this.rowH = bh / 12;
  }

  rowAt(y) {
    const r = Math.floor((y - this.board.y) / this.rowH);
    return r >= 0 && r < 12 ? r : -1;
  }

  firePlayer(row) {
    if (!this.match || row < 0) return;
    this.selected = row;
    if (fire(this.match, PLAYER, row)) this.sfx.play('pulse');
    else this.sfx.play('click');
  }

  onPointer(e) {
    if (!this.match) return;
    if (this.finishedAt !== null) {
      if (performance.now() - this.finishedReal > 700) this.finish();
      return;
    }
    // Linke Hälfte: in die angetippte Leitung feuern.
    if (e.clientX < this.board.x + this.board.w / 2) this.firePlayer(this.rowAt(e.clientY));
  }

  onKey(e) {
    if (!this.match) return;
    if (this.finishedAt !== null) {
      if (['Space', 'Enter', 'KeyF', 'Escape'].includes(e.code) && performance.now() - this.finishedReal > 700) this.finish();
      return;
    }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.selected = (this.selected + 11) % 12;
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.selected = (this.selected + 1) % 12;
    else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyF') this.firePlayer(this.selected);
    else return;
    e.preventDefault();
  }

  pollGamepad() {
    const gp = navigator.getGamepads?.()[0];
    if (!gp) return;
    const pressed = (i) => gp.buttons[i]?.pressed && !this.padPrev[i];
    if (this.finishedAt !== null) {
      if (pressed(0) && performance.now() - this.finishedReal > 700) this.finish();
    } else {
      if (pressed(12)) this.selected = (this.selected + 11) % 12;
      if (pressed(13)) this.selected = (this.selected + 1) % 12;
      if (pressed(0)) this.firePlayer(this.selected);
    }
    gp.buttons.forEach((b, i) => (this.padPrev[i] = b.pressed));
  }

  finish() {
    const r = result(this.match);
    const cb = this.onDone;
    const info = { damaged: this.damaged };
    this.close();
    cb?.(r, info);
  }

  update(dt) {
    const m = this.match;
    if (!m) return;
    this.pollGamepad();
    if (!m.done) {
      const lane = aiThink(m, ENEMY, this.enemy.type.grapple);
      if (lane !== null) this.sfx.play('pulse', { enemy: true });
      step(m, dt);
      m.cells.forEach((c, r) => {
        if (c !== this.prevCells[r]) {
          this.flips[r] = 0.35;
          this.sfx.play('flip', { enemy: c === ENEMY });
        }
      });
      this.prevCells = m.cells.slice();
      if (m.done) {
        this.finishedAt = m.time;
        this.finishedReal = performance.now();
        this.sfx.play(result(m).winner === PLAYER ? 'win' : 'lose');
      }
    }
    this.flips = this.flips.map((f) => Math.max(0, f - dt));
    this.draw();
  }

  // ---------- Zeichnen ----------

  draw() {
    const { ctx, w, h } = this;
    const m = this.match;
    const B = this.board;
    const t = performance.now() / 1000;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(2,6,10,0.88)';
    ctx.fillRect(0, 0, w, h);

    // Platinen-Hintergrund
    ctx.save();
    ctx.strokeStyle = 'rgba(40,160,120,0.08)';
    ctx.lineWidth = 1;
    for (let x = B.x; x < B.x + B.w; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, B.y);
      ctx.lineTo(x, B.y + B.h);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(80,220,255,0.35)';
    ctx.lineWidth = 2;
    roundRect(ctx, B.x - 8, B.y - 8, B.w + 16, B.h + 16, 10);
    ctx.stroke();

    const cx = B.x + B.w / 2;
    const cellW = Math.max(28, B.w * 0.05);
    const leftStart = B.x + 46;
    const leftEnd = cx - cellW / 2 - 6;
    const rightStart = B.x + B.w - 46;
    const rightEnd = cx + cellW / 2 + 6;
    const feeds = feeding(m);

    for (let r = 0; r < 12; r++) {
      const y = B.y + r * this.rowH + this.rowH / 2;
      this.drawLane(PLAYER, r, y, leftStart, leftEnd, t);
      this.drawLane(ENEMY, r, y, rightStart, rightEnd, t);
      // Zielsegment
      const contested = feeds[r].size > 1;
      let color = COLORS[m.cells[r]];
      if (contested) color = Math.floor(t * 12) % 2 ? COLORS[PLAYER] : COLORS[ENEMY];
      const pad = 3;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = this.flips[r] > 0 ? 30 : 12;
      roundRect(ctx, cx - cellW / 2, y - this.rowH / 2 + pad, cellW, this.rowH - pad * 2, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Auswahlrahmen (Tastatur/Gamepad)
    if (!m.done) {
      const y = B.y + this.selected * this.rowH;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(B.x + 4, y + 2, cx - B.x - cellW / 2 - 8, this.rowH - 4);
      ctx.setLineDash([]);
    }

    this.drawHeader(cx);
    this.drawStock(PLAYER, B.x, B.y + B.h + 22);
    this.drawStock(ENEMY, B.x + B.w, B.y + B.h + 22);

    if (m.time < 0) {
      this.bigText(`Bereit … ${Math.ceil(-m.time)}`, '#ffffff', 'Tippe links in eine Leitung, um einen Impuls zu senden');
    } else if (m.done) {
      const res = result(m);
      const txt = res.winner === PLAYER ? 'GEKAPERT!' : res.winner === ENEMY ? 'ABGEWEHRT' : 'PATT';
      const col = res.winner === PLAYER ? COLORS[PLAYER] : res.winner === ENEMY ? '#ff5c5c' : '#ffffff';
      this.bigText(txt, col, 'Tippen oder [Leertaste] zum Fortfahren');
    }
  }

  drawLane(side, r, y, start, end, t) {
    const { ctx } = this;
    const m = this.match;
    const lane = m.board.lanes[side][r];
    const dir = Math.sign(end - start);
    const pulse = m.pulses.find((p) => p.side === side && p.lane === r && p.endAt > m.time);
    const live = pulse && m.time >= pulse.arriveAt;
    const travel = pulse && !live ? Math.min(1, (m.time - pulse.firedAt) / (pulse.arriveAt - pulse.firedAt)) : live ? 1 : 0;
    const base = DIM[side];
    const hot = COLORS[side];
    const usable = canFire(m, side, r) || m.time < 0;

    // Anschluss-Port
    ctx.fillStyle = pulse ? hot : usable ? base : 'rgba(120,120,120,0.25)';
    ctx.beginPath();
    ctx.arc(start - dir * 18, y, 8, 0, Math.PI * 2);
    ctx.fill();

    const segEnd = lane.type === 'split' ? end - dir * 30 : end;
    const drawLine = (x1, y1, x2, y2, color, width = 3) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    // Grundleitung
    if (lane.type === 'dead') {
      const mid = (start + end) / 2;
      drawLine(start, y, mid - dir * 14, y, base);
      drawLine(mid + dir * 14, y, end, y, base);
      ctx.strokeStyle = '#ff5c5c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mid - 6, y - 6);
      ctx.lineTo(mid + 6, y + 6);
      ctx.moveTo(mid + 6, y - 6);
      ctx.lineTo(mid - 6, y + 6);
      ctx.stroke();
    } else if (lane.type === 'delay') {
      const a = start + (end - start) * 0.35;
      const b = start + (end - start) * 0.65;
      drawLine(start, y, a, y, base);
      ctx.strokeStyle = base;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(a, y);
      const steps = 8;
      for (let i = 1; i <= steps; i++) ctx.lineTo(a + ((b - a) * i) / steps, y + (i % 2 ? -7 : 7));
      ctx.stroke();
      drawLine(b, y, end, y, base);
    } else {
      drawLine(start, y, segEnd, y, base);
      if (lane.type === 'split') {
        const yb = y + this.rowH;
        drawLine(segEnd, y, end, y, base);
        drawLine(segEnd, y, end, yb, base);
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.arc(segEnd, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (lane.type === 'invert') {
        const ix = end - dir * 26;
        ctx.fillStyle = COLORS[side === PLAYER ? ENEMY : PLAYER];
        ctx.beginPath();
        ctx.arc(ix, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↺', ix, y + 1);
      }
    }

    // Impuls
    if (pulse && lane.type !== 'dead') {
      ctx.shadowColor = hot;
      ctx.shadowBlur = 14;
      const x = start + (end - start) * travel;
      const xEnd = live ? segEnd : dir > 0 ? Math.min(x, segEnd) : Math.max(x, segEnd);
      drawLine(start, y, xEnd, y, hot, 4);
      if (live && lane.type === 'split') {
        drawLine(segEnd, y, end, y, hot, 4);
        drawLine(segEnd, y, end, y + this.rowH, hot, 4);
      }
      if (!live) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y + (lane.type === 'delay' ? Math.sin(t * 40) * 5 : 0), 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Restdauer als schrumpfender Balken am Port
      if (live) {
        const left = (pulse.endAt - m.time) / (pulse.endAt - pulse.arriveAt);
        ctx.fillStyle = hot;
        ctx.fillRect(start - dir * 30 - 4, y + 10, 8 * left * 3 * dir, 3);
      }
      ctx.shadowBlur = 0;
    } else if (pulse && lane.type === 'dead') {
      const x = start + (end - start) * Math.min(travel, 0.45);
      drawLine(start, y, x, y, hot, 4);
    }
  }

  drawHeader(cx) {
    const { ctx } = this;
    const m = this.match;
    const c = count(m);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.min(26, this.w / 28)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = '#d8f6ff';
    ctx.fillText(`KAPERN: ${this.enemy.code} ${this.enemy.name}${this.penalty ? ` (beschädigt: −${this.penalty} Pulser)` : ''}`, cx, this.h * 0.045);
    // Zeitbalken
    const bw = Math.min(this.w * 0.6, 520);
    const y = this.h * 0.085;
    const frac = m.time < 0 ? 1 : 1 - m.time / m.duration;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(cx - bw / 2, y, bw, 8);
    ctx.fillStyle = frac < 0.25 ? '#ff5c5c' : '#5fe3ff';
    ctx.fillRect(cx - bw / 2, y, bw * frac, 8);
    // Stand
    ctx.font = `bold ${Math.min(22, this.w / 32)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = COLORS[PLAYER];
    ctx.textAlign = 'right';
    ctx.fillText(`KLIX ${c[PLAYER]}`, cx - bw / 2 - 14, y + 4);
    ctx.fillStyle = COLORS[ENEMY];
    ctx.textAlign = 'left';
    ctx.fillText(`${c[ENEMY]} ${this.enemy.code}`, cx + bw / 2 + 14, y + 4);
  }

  drawStock(side, x, y) {
    const { ctx } = this;
    const s = this.match.sides[side];
    const dir = side === PLAYER ? 1 : -1;
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.textAlign = side === PLAYER ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#9fb8c8';
    ctx.fillText(`Pulser (Dauer ${s.pulseDuration.toFixed(1)} s)`, x, y);
    for (let i = 0; i < s.pulsers; i++) {
      ctx.fillStyle = COLORS[side];
      ctx.shadowColor = COLORS[side];
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x + dir * (8 + i * 22), y + 22, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  bigText(text, color, sub) {
    const { ctx, w } = this;
    const y = this.board.y + this.board.h / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, y - 60, w, 110);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.min(64, w / 12)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(text, w / 2, y - 12);
    ctx.shadowBlur = 0;
    ctx.font = '15px "Segoe UI", sans-serif';
    ctx.fillStyle = '#cfe7f2';
    ctx.fillText(sub, w / 2, y + 32);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
