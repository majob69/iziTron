import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYER, ENEMY, ROWS, TRAVEL_TIME, DELAY_EXTRA,
  createBoard, createMatch, laneOf, fire, canFire, step, result, count, aiThink, laneScore,
} from '../src/logic/grapple.js';

// Platine mit festgelegten Leitungen: alles 'plain', außer den übergebenen Typen.
function boardWith(playerTypes = {}, enemyTypes = {}, cells = null) {
  const lanes = (types) => Array.from({ length: ROWS }, (_, r) => laneOf(types[r] ?? 'plain', r));
  return {
    rows: ROWS,
    cells: cells ?? Array.from({ length: ROWS }, () => ENEMY),
    lanes: { [PLAYER]: lanes(playerTypes), [ENEMY]: lanes(enemyTypes) },
  };
}
const stats = { pulsers: 3, pulseDuration: 2 };
const matchOf = (board, opts = {}) => createMatch({ board, player: stats, enemy: stats, ...opts });

test('createBoard ist mit gleichem Seed deterministisch', () => {
  const a = createBoard({ seed: 42, complexity: 0.5 });
  const b = createBoard({ seed: 42, complexity: 0.5 });
  const c = createBoard({ seed: 43, complexity: 0.5 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('Startbelegung ist ausgeglichen (6:6)', () => {
  for (let seed = 1; seed < 20; seed++) {
    const b = createBoard({ seed });
    assert.equal(b.cells.filter((c) => c === PLAYER).length, ROWS / 2);
  }
});

test('jede Seite hat mindestens die Hälfte nutzbare Leitungen, split nie in der letzten Zeile', () => {
  for (let seed = 1; seed < 50; seed++) {
    const b = createBoard({ seed, complexity: 1 });
    for (const side of [PLAYER, ENEMY]) {
      const useful = b.lanes[side].filter((l) => l.type !== 'dead' && l.type !== 'invert');
      assert.ok(useful.length >= ROWS / 2, `Seed ${seed} Seite ${side}`);
      assert.notEqual(b.lanes[side][ROWS - 1].type, 'split');
    }
  }
});

test('ein Impuls färbt das Ziel erst nach der Laufzeit um', () => {
  const m = matchOf(boardWith());
  assert.ok(fire(m, PLAYER, 3));
  step(m, TRAVEL_TIME - 0.1);
  assert.equal(m.cells[3], ENEMY);
  step(m, 0.2);
  assert.equal(m.cells[3], PLAYER);
});

test('das Ziel behält seine Farbe nach dem Ende des Impulses', () => {
  const m = matchOf(boardWith());
  fire(m, PLAYER, 0);
  step(m, 5);
  assert.equal(m.cells[0], PLAYER);
});

test('umkämpfte Ziele bleiben unverändert', () => {
  const m = matchOf(boardWith({}, {}, Array(ROWS).fill(ENEMY)));
  fire(m, ENEMY, 5);
  fire(m, PLAYER, 5);
  step(m, 1);
  assert.equal(m.cells[5], ENEMY);
});

test('invert speist die Gegnerfarbe', () => {
  const m = matchOf(boardWith({ 2: 'invert' }, {}, Array(ROWS).fill(PLAYER)));
  fire(m, PLAYER, 2);
  step(m, 1);
  assert.equal(m.cells[2], ENEMY);
});

test('split speist zwei Ziele', () => {
  const m = matchOf(boardWith({ 4: 'split' }));
  fire(m, PLAYER, 4);
  step(m, 1);
  assert.equal(m.cells[4], PLAYER);
  assert.equal(m.cells[5], PLAYER);
  assert.equal(m.cells[3], ENEMY);
});

test('dead hat keine Wirkung, verbraucht aber den Pulser', () => {
  const m = matchOf(boardWith({ 1: 'dead' }));
  fire(m, PLAYER, 1);
  step(m, 1);
  assert.equal(m.cells[1], ENEMY);
  assert.equal(m.sides[PLAYER].pulsers, 2);
});

test('delay kommt später an', () => {
  const m = matchOf(boardWith({ 6: 'delay' }));
  fire(m, PLAYER, 6);
  step(m, TRAVEL_TIME + 0.1);
  assert.equal(m.cells[6], ENEMY);
  step(m, DELAY_EXTRA);
  assert.equal(m.cells[6], PLAYER);
});

test('Pulser sind begrenzt, eine aktive Leitung kann nicht doppelt belegt werden', () => {
  const m = matchOf(boardWith());
  assert.ok(fire(m, PLAYER, 0));
  assert.equal(canFire(m, PLAYER, 0), false);
  assert.ok(fire(m, PLAYER, 1));
  assert.ok(fire(m, PLAYER, 2));
  assert.equal(fire(m, PLAYER, 3), false);
  step(m, 3);
  assert.equal(canFire(m, PLAYER, 0), false, 'keine Pulser mehr');
});

test('während der Aufwärmphase kann nicht gefeuert werden', () => {
  const m = matchOf(boardWith(), { warmup: 1.5 });
  assert.equal(fire(m, PLAYER, 0), false);
  step(m, 1.6);
  assert.ok(fire(m, PLAYER, 0));
});

test('nach Ablauf entscheidet die Mehrheit', () => {
  const m = matchOf(boardWith(), { duration: 4 });
  fire(m, PLAYER, 0);
  fire(m, PLAYER, 1);
  fire(m, PLAYER, 2);
  step(m, 10);
  const r = result(m);
  assert.equal(r.done, true);
  assert.equal(r.winner, ENEMY);
  assert.equal(r.counts[PLAYER], 3);
  assert.equal(r.margin, (3 - 9) / ROWS);
});

test('Gleichstand ergibt draw', () => {
  const m = matchOf(createBoard({ seed: 7 }), { duration: 1 });
  step(m, 2);
  assert.equal(result(m).winner, 'draw');
});

test('laneScore meidet dead, invert und belegte Leitungen', () => {
  const m = matchOf(boardWith({}, { 0: 'dead', 1: 'invert' }, Array(ROWS).fill(PLAYER)));
  assert.equal(laneScore(m, ENEMY, 0), -1);
  assert.equal(laneScore(m, ENEMY, 1), -2);
  assert.ok(laneScore(m, ENEMY, 2) > 0);
  fire(m, ENEMY, 2);
  assert.equal(laneScore(m, ENEMY, 2), -Infinity);
});

test('KI verbraucht Pulser, nutzt nur gültige Leitungen und gewinnt gegen einen passiven Spieler', () => {
  let wins = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const m = createMatch({
      board: createBoard({ seed, complexity: 0.4 }),
      player: stats,
      enemy: { pulsers: 5, pulseDuration: 2.5 },
      seed,
    });
    while (!m.done) {
      const lane = aiThink(m, ENEMY, { interval: 0.8, smart: 0.9 });
      if (lane !== null) {
        assert.ok(lane >= 0 && lane < ROWS);
        assert.notEqual(m.board.lanes[ENEMY][lane].type, 'dead');
      }
      step(m, 1 / 30);
    }
    assert.ok(m.sides[ENEMY].pulsers < 5, `Seed ${seed}: KI hat nicht gefeuert`);
    if (result(m).winner === ENEMY) wins++;
  }
  assert.ok(wins >= 18, `KI gewinnt nur ${wins}/20`);
});

test('count zählt beide Seiten', () => {
  const m = matchOf(boardWith({}, {}, [...Array(4).fill(PLAYER), ...Array(8).fill(ENEMY)]));
  assert.deepEqual(count(m), { [PLAYER]: 4, [ENEMY]: 8 });
});
