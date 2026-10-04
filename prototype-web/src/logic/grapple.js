// Grapple-Minispiel (Kapern): reine Spiellogik ohne Darstellung.
//
// Regeln:
// - Die Platine hat ROWS Zeilen. In der Mitte liegt pro Zeile ein Zielsegment,
//   das entweder dem Spieler (P) oder dem Gegner (E) gehört.
// - Jede Seite hat pro Zeile eine Leitung (Lane). Wer einen Pulser in eine Leitung
//   schickt, speist nach der Laufzeit (delay) für pulseDuration Sekunden die Ziele.
// - Wird ein Ziel nur von einer Farbe gespeist, wechselt es zu dieser Farbe.
//   Speisen beide Farben gleichzeitig, bleibt es umkämpft und unverändert.
// - Nach Ablauf der Zeit gewinnt, wem die Mehrheit der Ziele gehört.
//
// Leitungstypen: plain, split (2 Ziele), dead (unterbrochen),
// invert (speist die Gegnerfarbe), delay (lange Laufzeit).

import { createRng } from './rng.js';

export const PLAYER = 'P';
export const ENEMY = 'E';
export const ROWS = 12;
export const TRAVEL_TIME = 0.35;
export const DELAY_EXTRA = 1.2;
export const LANE_TYPES = ['plain', 'split', 'dead', 'invert', 'delay'];

const SPECIALS = ['split', 'dead', 'invert', 'delay'];

export const opponent = (side) => (side === PLAYER ? ENEMY : PLAYER);

export function laneOf(type, row) {
  switch (type) {
    case 'split':
      return { type, to: [row, row + 1], delay: TRAVEL_TIME };
    case 'dead':
      return { type, to: [], delay: TRAVEL_TIME };
    case 'delay':
      return { type, to: [row], delay: TRAVEL_TIME + DELAY_EXTRA };
    case 'invert':
    case 'plain':
      return { type, to: [row], delay: TRAVEL_TIME };
    default:
      throw new Error(`Unbekannter Leitungstyp: ${type}`);
  }
}

const isUseful = (lane) => lane.type !== 'dead' && lane.type !== 'invert';

function makeLanes(rows, rng, complexity) {
  const types = [];
  for (let r = 0; r < rows; r++) {
    let type = rng.chance(complexity) ? rng.pick(SPECIALS) : 'plain';
    if (type === 'split' && r === rows - 1) type = 'plain';
    types.push(type);
  }
  const lanes = types.map((t, r) => laneOf(t, r));
  // Mindestens die Hälfte der Leitungen muss nutzbar sein, sonst ist die Seite chancenlos.
  let useful = lanes.filter(isUseful).length;
  for (let r = 0; r < rows && useful < Math.ceil(rows / 2); r++) {
    if (!isUseful(lanes[r])) {
      lanes[r] = laneOf('plain', r);
      useful++;
    }
  }
  return lanes;
}

/** Erzeugt eine Platine. complexity = Anteil der Sonderleitungen (0..1). */
export function createBoard({ rows = ROWS, seed = 1, complexity = 0.3 } = {}) {
  const rng = createRng(seed);
  const first = rng.chance(0.5) ? PLAYER : ENEMY;
  const cells = Array.from({ length: rows }, (_, r) => (r % 2 === 0 ? first : opponent(first)));
  return {
    rows,
    cells,
    lanes: {
      [PLAYER]: makeLanes(rows, rng, complexity),
      [ENEMY]: makeLanes(rows, rng, complexity),
    },
  };
}

/**
 * Startet ein Match.
 * player/enemy: { pulsers, pulseDuration }
 */
export function createMatch({ board, player, enemy, duration = 12, seed = 1, warmup = 0 }) {
  return {
    board,
    cells: board.cells.slice(),
    time: -warmup,
    duration,
    sides: {
      [PLAYER]: { pulsers: player.pulsers, pulseDuration: player.pulseDuration },
      [ENEMY]: { pulsers: enemy.pulsers, pulseDuration: enemy.pulseDuration },
    },
    pulses: [],
    rng: createRng((seed ^ 0x9e3779b9) >>> 0),
    ai: { nextDecision: 0.5 },
    done: false,
  };
}

export const isRunning = (m) => !m.done && m.time >= 0;

export function laneBusy(m, side, lane) {
  return m.pulses.some((p) => p.side === side && p.lane === lane && p.endAt > m.time);
}

export function canFire(m, side, lane) {
  return (
    isRunning(m) &&
    lane >= 0 &&
    lane < m.board.rows &&
    m.sides[side].pulsers > 0 &&
    !laneBusy(m, side, lane)
  );
}

export function fire(m, side, lane) {
  if (!canFire(m, side, lane)) return false;
  const l = m.board.lanes[side][lane];
  const s = m.sides[side];
  s.pulsers--;
  m.pulses.push({
    side,
    lane,
    firedAt: m.time,
    arriveAt: m.time + l.delay,
    endAt: m.time + l.delay + s.pulseDuration,
  });
  return true;
}

/** Welche Farben speisen jede Zeile gerade? Ergebnis: Array von Sets. */
export function feeding(m) {
  const feeds = m.cells.map(() => new Set());
  for (const p of m.pulses) {
    if (m.time < p.arriveAt || m.time >= p.endAt) continue;
    const lane = m.board.lanes[p.side][p.lane];
    const color = lane.type === 'invert' ? opponent(p.side) : p.side;
    for (const r of lane.to) feeds[r].add(color);
  }
  return feeds;
}

const MAX_SUBSTEP = 0.05;

export function step(m, dt) {
  while (dt > 0 && !m.done) {
    const sub = Math.min(dt, MAX_SUBSTEP);
    dt -= sub;
    m.time = Math.min(m.duration, m.time + sub);
    if (m.time < 0) continue;
    feeding(m).forEach((f, r) => {
      if (f.size === 1) m.cells[r] = f.values().next().value;
    });
    if (m.time >= m.duration) m.done = true;
  }
}

export function count(m) {
  let p = 0;
  let e = 0;
  for (const c of m.cells) c === PLAYER ? p++ : e++;
  return { [PLAYER]: p, [ENEMY]: e };
}

/** winner: 'P' | 'E' | 'draw'; margin: -1..1 aus Spielersicht. */
export function result(m) {
  const c = count(m);
  const winner = c[PLAYER] > c[ENEMY] ? PLAYER : c[ENEMY] > c[PLAYER] ? ENEMY : 'draw';
  return { done: m.done, winner, counts: c, margin: (c[PLAYER] - c[ENEMY]) / m.board.rows };
}

/** Bewertet, wie lohnend ein Schuss in diese Leitung für side wäre. */
export function laneScore(m, side, lane) {
  if (laneBusy(m, side, lane)) return -Infinity;
  const l = m.board.lanes[side][lane];
  if (l.type === 'dead') return -1;
  if (l.type === 'invert') return -2;
  const remaining = m.duration - m.time;
  if (l.delay + 0.2 >= remaining) return -1;
  const feeds = feeding(m);
  let score = 0;
  for (const r of l.to) {
    if (m.cells[r] !== side) score += 2;
    else score += 0.4;
    if (feeds[r].has(opponent(side))) score += 0.6;
    if (feeds[r].has(side)) score -= 0.8;
  }
  if (l.type === 'delay') score -= 0.3;
  return score;
}

/**
 * Gegner-KI. skill: { interval: Sekunden zwischen Entscheidungen, smart: 0..1 }.
 * Gibt die gewählte Leitung zurück oder null.
 */
export function aiThink(m, side, skill) {
  if (!isRunning(m) || m.time < m.ai.nextDecision) return null;
  m.ai.nextDecision = m.time + skill.interval * (0.7 + m.rng.next() * 0.6);
  const s = m.sides[side];
  if (s.pulsers <= 0) return null;

  const options = [];
  for (let lane = 0; lane < m.board.rows; lane++) {
    const score = laneScore(m, side, lane);
    if (score > -Infinity) options.push({ lane, score });
  }
  if (!options.length) return null;

  const remaining = m.duration - m.time;
  // Pulser auf die Restzeit verteilen, statt alle sofort zu verschießen.
  const urgency = s.pulsers / Math.max(1, remaining / (s.pulseDuration + 0.5));
  if (urgency < 0.6 && !m.rng.chance(0.5)) return null;

  let choice;
  if (m.rng.chance(skill.smart)) {
    const best = Math.max(...options.map((o) => o.score));
    if (best <= 0.5 && remaining > 3) return null;
    const top = options.filter((o) => o.score >= best - 0.01);
    choice = m.rng.pick(top);
  } else {
    // Unaufmerksam: irgendeine brauchbare Leitung, auch wenn es eine bessere gäbe.
    const usable = options.filter((o) => o.score >= 0);
    if (!usable.length) return null;
    choice = m.rng.pick(usable);
  }
  return fire(m, side, choice.lane) ? choice.lane : null;
}
