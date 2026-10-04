// iziTron P0 – Einstieg: Spielablauf, Zustände und Hauptschleife.
import * as THREE from 'three';
import { Renderer, QUALITY_LEVELS, QUALITY_NAMES } from './game/renderer.js';
import { Deck } from './game/deck.js';
import { DECK1 } from './data/deck1.js';
import { World } from './game/world.js';
import { CameraRig, CAMERA_NAMES } from './game/camera.js';
import { Input } from './game/input.js';
import { think } from './game/ai.js';
import { Sfx } from './game/sfx.js';
import { SENSOR_NAMES } from './game/sensor-pass.js';
import { Hud } from './ui/hud.js';
import { GrappleView } from './ui/grapple-view.js';
import { PartsView } from './ui/parts-view.js';
import { PLAYER } from './logic/grapple.js';
import { salvageCondition } from './logic/loadout.js';

const $ = (id) => document.getElementById(id);

function loadQuality() {
  try {
    const q = localStorage.getItem('izitron.quality');
    if (QUALITY_LEVELS.includes(q)) return q;
  } catch {
    /* privater Modus */
  }
  return 'medium';
}

function saveQuality(q) {
  try {
    localStorage.setItem('izitron.quality', q);
  } catch {
    /* egal */
  }
}

const gfx = new Renderer($('app'), loadQuality());
const sfx = new Sfx();
const input = new Input(document.body);
const hud = new Hud();
const grapple = new GrappleView(document.body, sfx);
const parts = new PartsView(document.body, sfx);
const rig = new CameraRig(gfx.camera);

let deck = null;
let world = null;
let player = null;
let inventory = [];
let state = 'intro'; // intro | play | grapple | parts | pause | over | won
let slowmo = 0;
let glitch = 0;
let playTime = 0;
let lowFpsTime = 0;
let endTimer = 0;
const once = new Set();
const controls = new Map();

const key = (k, touch) => (input.usingTouch ? touch : k);

function sayOnce(id, text, seconds) {
  if (once.has(id)) return;
  once.add(id);
  hud.say(text, seconds);
}

function newGame() {
  if (world) {
    world.clear();
    gfx.scene.remove(deck.group);
  }
  deck = new Deck(DECK1);
  gfx.scene.add(deck.build(gfx.quality));
  world = new World(gfx.scene, deck, onEvent);
  player = world.spawn('klx', deck.player, { isPlayer: true });
  player.facing = Math.PI * 0.75;
  for (const s of deck.spawns) world.spawn(s.type, s.pos);
  inventory = [];
  playTime = 0;
  slowmo = 0;
  once.clear();
  rig.setMode('iso');
  rig.transition = 0;
  rig.update(0, player, true);
}

function startPlay() {
  sfx.unlock();
  if (input.usingTouch) enterFullscreen();
  $('intro').classList.add('hidden');
  state = 'play';
  hud.say('Hier MOTHER. Klix, du bist der letzte Droide, den ARCHON nicht umprogrammiert hat.', 4.5);
  hud.say(`Säubere Deck 1. Fahr an einen Droiden heran und kapere ihn ${key('[F]', '(KAPERN)')} – seine Teile machen dich stärker.`, 5.5);
  hud.say(`Oder ramm ihn ${key('[Shift]', '(RAMMEN)')} in den Schacht. Dann bleibt allerdings nichts zum Ausschlachten übrig.`, 5.5);
  hud.say(`Fang klein an: Die Putzdroiden (123) sind harmlos. ${key('[C]', 'SICHT')} wechselt in deine Optik.`, 5);
}

// ---------- Ereignisse aus der Welt ----------

function onEvent(type, data) {
  const d = data.droid;
  switch (type) {
    case 'shot':
      sfx.play('shot', { enemy: !d.isPlayer });
      break;
    case 'hit':
      sfx.play('hit');
      if (d.isPlayer) rig.shake(0.12);
      if (data.precise) sayOnce('precise', 'Präzisionstreffer! In der Optik-Sicht trifft Klix Schwachstellen (×1,5 Schaden).');
      if (!d.isPlayer && d.hullRatio < 0.5 && d.active) sayOnce('weakened', 'Angeschossene Droiden wehren sich beim Kapern schwächer (unter 50 % Hülle −1 Pulser, unter 25 % −2) – ihre Teile sind dann aber beschädigt.', 5);
      break;
    case 'ram':
      sfx.play('ram', { speed: data.speed });
      if (data.a === player || data.b === player) rig.shake(Math.min(0.45, data.speed * 0.05));
      break;
    case 'dash':
      sfx.play('dash');
      break;
    case 'zap':
      sfx.play('zap');
      if (d.isPlayer) sayOnce('zap', 'Stromgitter! Nur Schwebe-Antriebe sind dagegen immun.');
      break;
    case 'overheat':
      if (d.isPlayer) {
        sfx.play('overheat');
        sayOnce('overheat', 'Waffe überhitzt! Kurz abkühlen lassen.');
      }
      break;
    case 'falling':
      sfx.play('fall');
      if (!d.isPlayer && data.by === player) {
        slowmo = 0.9;
        world.stats.fallen++;
        hud.say(`${d.code} abgestürzt!${once.has('fallInfo') ? '' : ' Sauber – aber ohne Beute.'}`, 2.5);
        once.add('fallInfo');
      } else if (!d.isPlayer) {
        world.stats.fallen++;
      }
      break;
    case 'fallen':
      if (d === player) gameOver('Klix ist in den Schacht gestürzt.');
      break;
    case 'destroyed':
      sfx.play('explosion');
      rig.shake(0.35);
      if (d === player) gameOver('Klix wurde zerstört.');
      else {
        world.stats.destroyed++;
        if (data.by === player) sayOnce('destroyInfo', 'Zerstört. Von verschmorten Droiden lässt sich nichts ausschlachten.');
      }
      break;
  }
}

// ---------- Spieler-Steuerung ----------

function playerControl(dt) {
  const m = input.move;
  const ctrl = { move: new THREE.Vector3(), face: null, fire: null, dash: input.consume('dash'), precise: false };
  if (!player.active) return ctrl;

  if (rig.mode === 'iso') {
    const { forward, right } = rig.screenAxes();
    ctrl.move.addScaledVector(forward, m.y).addScaledVector(right, m.x);
    if (ctrl.move.lengthSq() > 0.01) ctrl.face = Math.atan2(ctrl.move.x, ctrl.move.z);
  } else {
    // Panzersteuerung: links/rechts dreht, vor/zurück fährt.
    ctrl.face = player.facing - m.x * 2.6 * dt;
    ctrl.move.copy(player.forward).multiplyScalar(m.y);
  }

  if (input.fireHeld && player.stats.weapon) {
    if (rig.mode === 'pov') {
      ctrl.fire = player.forward;
      ctrl.precise = true;
    } else {
      const target = world.nearestHostile(player.pos, player.stats.weapon.range, { cone: 0.8, facing: player.facing, los: true });
      if (target) {
        const dir = new THREE.Vector3(target.pos.x - player.pos.x, 0, target.pos.z - player.pos.z).normalize();
        ctrl.fire = dir;
        if (ctrl.move.lengthSq() < 0.01 || rig.mode !== 'iso') ctrl.face = rig.mode === 'iso' ? Math.atan2(dir.x, dir.z) : ctrl.face;
      } else {
        ctrl.fire = player.forward;
      }
    }
  }
  return ctrl;
}

function grappleTarget() {
  let best = null;
  let bestD = Infinity;
  for (const d of world.hostiles) {
    const dist = Math.hypot(d.pos.x - player.pos.x, d.pos.z - player.pos.z);
    if (dist < player.radius + d.radius + 0.9 && dist < bestD) {
      best = d;
      bestD = dist;
    }
  }
  return best;
}

function scanTarget() {
  if (rig.mode === 'pov') return world.nearestHostile(player.pos, 16, { cone: 0.35, facing: player.facing, los: true });
  return world.nearestHostile(player.pos, 9, { los: true });
}

// ---------- Kapern ----------

function startGrapple(enemy) {
  state = 'grapple';
  input.clear();
  player.vel.set(0, 0, 0);
  enemy.vel.set(0, 0, 0);
  grapple.open(player, enemy, (res, info) => {
    if (res.winner === PLAYER) {
      enemy.disable();
      world.stats.captured++;
      const cond = salvageCondition(res.margin, enemy.hullRatio);
      state = 'parts';
      parts.openSalvage(player, inventory, enemy, cond, () => {
        state = 'play';
        sayOnce('afterSalvage', `Neue Teile verändern Klix: mehr Masse = stärkeres Rammen, aber träger. Achte auf die Energie! Werkstatt-Terminals (orange) erlauben Umbauten.`, 6);
        if (player.stats.sensor !== 'cheap') sayOnce('newSensor', `Neuer Sensor: ${SENSOR_NAMES[player.stats.sensor]}. Probier ihn in der Optik-Sicht ${key('[C]', '(SICHT)')} aus.`, 5);
      });
      return;
    }
    const away = new THREE.Vector3(player.pos.x - enemy.pos.x, 0, player.pos.z - enemy.pos.z).normalize();
    enemy.ai.alerted = true;
    state = 'play';
    if (res.winner === 'draw') {
      player.damage(8, enemy, world.time);
      enemy.damage(8, player, world.time);
      player.vel.addScaledVector(away, 4);
      hud.say('Patt – beide Systeme überlastet.', 3);
    } else {
      const dmg = Math.round(15 + 30 * Math.abs(res.margin));
      player.vel.addScaledVector(away, 6);
      hud.say(`Abgewehrt! Rückkopplung: −${dmg} Hülle. Mehr Pulser (stärkere Energie) oder längere Impulse (besseres Chassis) helfen.`, 5);
      if (player.damage(dmg, enemy, world.time)) world.destroyed(player, enemy);
    }
  });
}

// ---------- Spielende ----------

function gameOver(text) {
  if (state === 'over') return;
  state = 'over';
  endTimer = 1.4;
  showEnd('Klix ist ausgefallen', text, false);
}

function checkVictory() {
  if (state === 'play' && world.hostiles.length === 0) {
    state = 'won';
    endTimer = 1.2;
    sfx.play('win');
    showEnd('Deck 1 gesäubert!', 'MOTHER: „Gut gemacht, kleiner Dieb. Der Lift nach Deck 2 ist leider noch nicht gebaut – das ist ja erst der Prototyp.“', true);
  }
}

function showEnd(title, text) {
  $('end-title').textContent = title;
  $('end-text').textContent = text;
  const s = world.stats;
  const row = (l, v) => `<div class="st"><span>${l}</span><b>${v}</b></div>`;
  $('end-stats').innerHTML = row('Gekapert', s.captured) + row('Abgestürzt', s.fallen) + row('Zerstört', s.destroyed) + row('Zeit', `${Math.floor(playTime / 60)}:${String(Math.floor(playTime % 60)).padStart(2, '0')}`);
}

// ---------- Vollbild (wie Galaxy-Sisters: Knopf + automatisch beim Start auf Touch-Geräten) ----------

const canFullscreen = !!document.documentElement.requestFullscreen;

function enterFullscreen() {
  if (!canFullscreen) return;
  document.documentElement
    .requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation?.lock?.('landscape'))
    .catch(() => {
      /* abgelehnt oder nicht unterstützt (z. B. iPhone Safari) */
    });
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else enterFullscreen();
}

function updateFullscreenLabels() {
  const on = !!document.fullscreenElement;
  $('btn-fullscreen').textContent = on ? '🗗' : '⛶';
  $('btn-fullscreen').title = on ? 'Vollbild beenden' : 'Vollbild';
  $('btn-fullscreen-menu').textContent = on ? 'Vollbild beenden' : 'Vollbild';
}

if (!canFullscreen) {
  $('btn-fullscreen').remove();
  $('btn-fullscreen-menu').remove();
} else {
  $('btn-fullscreen').addEventListener('click', (e) => {
    toggleFullscreen();
    e.currentTarget.blur();
  });
  $('btn-fullscreen-menu').addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    updateFullscreenLabels();
    // Manche Browser melden die neue Größe verzögert.
    setTimeout(() => window.dispatchEvent(new Event('resize')), 250);
  });
}

// ---------- Menü ----------

function setPaused(on) {
  if (on && state === 'play') {
    state = 'pause';
    $('pause').classList.remove('hidden');
    updateMenuLabels();
    $('btn-resume').focus();
  } else if (!on && state === 'pause') {
    state = 'play';
    $('pause').classList.add('hidden');
    input.clear();
  }
}

function updateMenuLabels() {
  $('btn-quality').textContent = `Grafik: ${QUALITY_NAMES[gfx.quality]}`;
  $('btn-sound').textContent = `Ton: ${sfx.muted ? 'aus' : 'an'}`;
}

function cycleQuality() {
  const next = QUALITY_LEVELS[(QUALITY_LEVELS.indexOf(gfx.quality) + 1) % QUALITY_LEVELS.length];
  gfx.setQuality(next);
  saveQuality(next);
  lowFpsTime = 0;
  updateMenuLabels();
  return next;
}

$('btn-start').addEventListener('click', startPlay);
$('btn-pause').addEventListener('click', () => setPaused(state !== 'pause'));
$('btn-resume').addEventListener('click', () => setPaused(false));
$('btn-quality').addEventListener('click', cycleQuality);
$('btn-sound').addEventListener('click', () => {
  sfx.toggleMute();
  updateMenuLabels();
});
$('btn-restart').addEventListener('click', () => {
  $('pause').classList.add('hidden');
  newGame();
  state = 'play';
});
$('btn-again').addEventListener('click', () => {
  $('end').classList.add('hidden');
  newGame();
  state = 'play';
  hud.say('Neuer Versuch. Diesmal vorsichtiger an den Kanten!', 3);
});

// ---------- Hauptschleife ----------

function updatePlay(dt) {
  playTime += dt;
  const scaled = slowmo > 0 ? dt * 0.3 : dt;
  slowmo -= dt;

  if (input.consume('cam')) {
    const mode = rig.cycle();
    glitch = 1;
    sfx.play('cam');
    hud.say(CAMERA_NAMES[mode] + (mode === 'pov' ? ` (${SENSOR_NAMES[player.stats.sensor]})` : ''), 1.5);
    if (mode === 'pov') sayOnce('pov', 'Optik-Sicht: Was du siehst, hängt vom eingebauten Sensor ab. Treffer hier sind präziser, Scans zeigen alle Bauteile.', 5.5);
  }
  if (input.consume('rotL')) rig.rotate(-1);
  if (input.consume('rotR')) rig.rotate(1);
  rig.addZoom(input.takeZoom());
  if (input.consume('quality')) hud.say(`Grafik: ${QUALITY_NAMES[cycleQuality()]}`, 1.5);
  if (input.consume('pause')) {
    setPaused(true);
    return;
  }

  controls.clear();
  controls.set(player, playerControl(scaled));
  for (const d of world.droids) if (!d.isPlayer && d.active) controls.set(d, think(d, world, player, scaled));
  world.update(scaled, controls, rig.mode === 'pov' && player.stats.sensor === 'thermal');

  if (state !== 'play') return;
  const onTerminal = player.active && deck.isTerminal(player.pos.x, player.pos.z);
  const target = player.active ? grappleTarget() : null;
  input.setActionLabel(onTerminal ? 'WERKSTATT' : 'KAPERN');
  if (input.consume('action')) {
    if (onTerminal) {
      state = 'parts';
      player.vel.set(0, 0, 0);
      parts.openWorkshop(player, inventory, () => (state = 'play'));
    } else if (target) {
      startGrapple(target);
    } else {
      sfx.play('click');
      hud.say('Zum Kapern direkt an einen aktiven Droiden heranfahren.', 2);
    }
  }
  checkVictory();
}

function promptText() {
  if (state !== 'play' || !player.active) return null;
  if (deck.isTerminal(player.pos.x, player.pos.z)) return `${key('[F]', 'WERKSTATT')} Werkstatt öffnen`;
  const t = grappleTarget();
  return t ? `${key('[F]', 'KAPERN')} Kapern: ${t.code} ${t.name}` : null;
}

let last = performance.now();
let fpsFrames = 0;
let fpsTime = 0;
let fps = 60;
let frameNo = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frameNo++;
  fpsFrames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    fps = Math.round(fpsFrames / fpsTime);
    fpsFrames = 0;
    fpsTime = 0;
  }

  input.poll();
  if (state === 'play') {
    updatePlay(dt);
    // Automatisch herunterschalten, wenn es dauerhaft ruckelt.
    lowFpsTime = fps < 24 ? lowFpsTime + dt : 0;
    if (lowFpsTime > 6 && gfx.quality !== 'low') {
      const lower = QUALITY_LEVELS[QUALITY_LEVELS.indexOf(gfx.quality) - 1];
      gfx.setQuality(lower);
      saveQuality(lower);
      lowFpsTime = 0;
      hud.say(`Grafik automatisch auf „${QUALITY_NAMES[lower]}“ gesenkt (${fps} FPS).`, 3);
    }
  } else if (state === 'grapple') {
    grapple.update(dt);
  } else if (state === 'pause') {
    if (input.consume('pause')) setPaused(false);
  } else if (state === 'over' || state === 'won') {
    // Welt läuft noch kurz weiter (Absturz, Explosion), dann Endbildschirm.
    controls.clear();
    for (const d of world.droids) if (!d.isPlayer && d.active) controls.set(d, think(d, world, player, dt));
    world.update(dt, controls, false);
    endTimer -= dt;
    if (endTimer <= 0) $('end').classList.remove('hidden');
  } else if (state === 'intro') {
    // Langsame Kamerafahrt im Hintergrund
    rig.yawTarget += dt * 0.08;
  }

  if (world) {
    deck.update(now / 1000);
    rig.update(dt, player);
    gfx.sensor.setSensor(player.stats.sensor, rig.povBlend, glitch, now / 1000);
    glitch = Math.max(0, glitch - dt * 2.5);
    hud.update(dt, {
      player,
      world,
      camMode: rig.mode,
      fps,
      quality: gfx.quality,
      target: state === 'play' && player.active ? scanTarget() : null,
      prompt: promptText(),
      povBlend: rig.povBlend,
    });
  }
  // Während Minispiel und Werkstatt reicht ein seltenes Neuzeichnen der 3D-Szene.
  if ((state !== 'grapple' && state !== 'parts') || frameNo % 6 === 0) gfx.render();
}

newGame();
requestAnimationFrame(frame);

// Für Tests im Browser: tick(sekunden) lässt das Spiel auch bei ausgeblendetem Fenster weiterlaufen.
window.izitron = {
  get world() { return world; },
  get player() { return player; },
  get state() { return state; },
  rig, gfx, grapple, parts, input, startGrapple,
  tick(seconds, dt = 1 / 60) {
    for (let t = 0; t < seconds; t += dt) {
      input.poll();
      if (state === 'play') updatePlay(dt);
      else if (state === 'grapple') grapple.update(dt);
    }
    rig.update(dt, player, true);
    gfx.render();
  },
};
