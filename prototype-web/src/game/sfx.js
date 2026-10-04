// Synthetische Soundeffekte per WebAudio – keine Audiodateien nötig.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.last = {};
  }

  /** Muss nach einer Nutzeraktion aufgerufen werden (Browser-Regel). */
  unlock() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  // Gleiche Töne nicht zu dicht hintereinander
  throttle(name, ms) {
    const now = performance.now();
    if (now - (this.last[name] ?? 0) < ms) return false;
    this.last[name] = now;
    return true;
  }

  tone({ type = 'square', from = 440, to = from, dur = 0.1, vol = 0.3, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise({ dur = 0.2, vol = 0.3, freq = 1000, q = 1, type = 'bandpass', to = freq, delay = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  play(name, opts = {}) {
    switch (name) {
      case 'shot':
        if (!this.throttle('shot', 50)) return;
        this.tone({ type: 'square', from: opts.enemy ? 520 : 900, to: opts.enemy ? 160 : 280, dur: 0.09, vol: opts.enemy ? 0.08 : 0.12 });
        break;
      case 'hit':
        this.noise({ dur: 0.08, vol: 0.25, freq: 2500, q: 2 });
        break;
      case 'ram':
        this.tone({ type: 'sine', from: 140, to: 40, dur: 0.25, vol: Math.min(0.6, 0.2 + (opts.speed ?? 4) * 0.05) });
        this.noise({ dur: 0.15, vol: 0.3, freq: 600, q: 0.8 });
        break;
      case 'dash':
        this.noise({ dur: 0.25, vol: 0.18, freq: 400, to: 2400, q: 1.5 });
        break;
      case 'explosion':
        this.noise({ dur: 0.9, vol: 0.6, freq: 1200, to: 80, type: 'lowpass', q: 0.5 });
        this.tone({ type: 'sine', from: 90, to: 30, dur: 0.6, vol: 0.5 });
        break;
      case 'fall':
        this.tone({ type: 'sawtooth', from: 700, to: 60, dur: 1.2, vol: 0.12 });
        break;
      case 'zap':
        if (!this.throttle('zap', 120)) return;
        this.noise({ dur: 0.1, vol: 0.2, freq: 4000, q: 4 });
        break;
      case 'overheat':
        this.tone({ type: 'square', from: 200, dur: 0.08, vol: 0.15 });
        this.tone({ type: 'square', from: 200, dur: 0.08, vol: 0.15, delay: 0.12 });
        break;
      case 'pulse':
        this.tone({ type: 'triangle', from: opts.enemy ? 300 : 600, to: opts.enemy ? 450 : 1200, dur: 0.12, vol: 0.2 });
        break;
      case 'flip':
        if (!this.throttle('flip', 40)) return;
        this.tone({ type: 'sine', from: opts.enemy ? 330 : 880, dur: 0.05, vol: 0.12 });
        break;
      case 'grappleStart':
        this.tone({ type: 'sawtooth', from: 120, to: 900, dur: 0.5, vol: 0.15 });
        this.noise({ dur: 0.5, vol: 0.15, freq: 300, to: 5000, q: 2 });
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this.tone({ type: 'triangle', from: f, dur: 0.15, vol: 0.2, delay: i * 0.1 }));
        break;
      case 'lose':
        [400, 300, 200].forEach((f, i) => this.tone({ type: 'sawtooth', from: f, to: f * 0.9, dur: 0.2, vol: 0.15, delay: i * 0.15 }));
        break;
      case 'click':
        this.tone({ type: 'square', from: 1200, dur: 0.03, vol: 0.08 });
        break;
      case 'cam':
        this.tone({ type: 'sine', from: 300, to: 1200, dur: 0.15, vol: 0.1 });
        this.noise({ dur: 0.12, vol: 0.08, freq: 3000, q: 1 });
        break;
      case 'equip':
        this.tone({ type: 'square', from: 300, to: 600, dur: 0.08, vol: 0.12 });
        this.tone({ type: 'square', from: 600, to: 900, dur: 0.08, vol: 0.12, delay: 0.09 });
        break;
      default:
        break;
    }
  }
}
