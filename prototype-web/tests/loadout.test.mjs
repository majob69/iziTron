import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENTS } from '../src/data/components.js';
import { DROID_TYPES } from '../src/data/droids.js';
import {
  part, computeStats, validateLoadout, equip, unequip, setBonusOf, salvageCondition, partsOf,
} from '../src/logic/loadout.js';

const klix = () => DROID_TYPES.klx.loadout();

test('alle Droiden-Typen haben gültige Loadouts', () => {
  for (const [key, type] of Object.entries(DROID_TYPES)) {
    assert.deepEqual(validateLoadout(type.loadout()), [], key);
    assert.doesNotThrow(() => computeStats(type.loadout()), key);
  }
});

test('alle Bauteile haben Pflichtfelder', () => {
  for (const [id, c] of Object.entries(COMPONENTS)) {
    assert.ok(c.slot && c.name && c.series && typeof c.mass === 'number', id);
  }
});

test('Masse und Energieverbrauch werden summiert', () => {
  const s = computeStats(klix());
  const expectedMass = partsOf(klix()).reduce((m, p) => m + COMPONENTS[p.id].mass, 0);
  assert.equal(s.mass, expectedMass);
  assert.equal(s.powerUse, 10 + 8 + 2);
  assert.equal(s.powerOut, 30);
  assert.equal(s.overloaded, false);
  assert.equal(s.pulsers, 3);
  assert.equal(s.sensor, 'cheap');
});

test('Überlast senkt Tempo und Pulser', () => {
  const normal = computeStats(klix());
  const { loadout } = equip(klix(), part('dr_tracks'));
  const s = computeStats(loadout);
  assert.equal(s.overloaded, true);
  assert.equal(s.pulsers, 2);
  assert.ok(s.maxSpeed < normal.maxSpeed);
});

test('stärkere Energie behebt die Überlast', () => {
  let l = equip(klix(), part('dr_tracks')).loadout;
  l = equip(l, part('pw_mid')).loadout;
  const s = computeStats(l);
  assert.equal(s.overloaded, false);
  assert.equal(s.pulsers, 4);
});

test('schweres Chassis ohne starken Antrieb macht träge', () => {
  const { loadout } = equip(klix(), part('ch_heavy'));
  const s = computeStats(loadout);
  assert.ok(s.sluggish);
  assert.ok(s.accel < computeStats(klix()).accel);
  assert.ok(s.hull > computeStats(klix()).hull);
});

test('Pflichtteile und Geräteplätze werden geprüft', () => {
  const l = klix();
  assert.ok(validateLoadout({ ...l, drive: null }).some((e) => e.includes('drive')));
  assert.ok(validateLoadout({ ...l, devices: [part('dv_shield'), part('dv_thermal')] }).some((e) => e.includes('Geräte')));
  assert.ok(validateLoadout({ ...l, drive: part('pw_mid') }).length > 0);
  assert.throws(() => computeStats({ ...l, power: null }));
});

test('equip gibt das alte Teil zurück', () => {
  const { loadout, removed } = equip(klix(), part('wp_laser', 0.8));
  assert.equal(loadout.weapon.id, 'wp_laser');
  assert.deepEqual(removed, [part('wp_zapper')]);
});

test('equip hängt Geräte an freie Plätze an und ersetzt sonst', () => {
  let r = equip(klix(), part('ch_guard'));
  assert.equal(r.loadout.devices.length, 1);
  r = equip(r.loadout, part('dv_shield'));
  assert.equal(r.loadout.devices.length, 2);
  assert.deepEqual(r.removed, []);
  r = equip(r.loadout, part('dv_thermal'), { index: 0 });
  assert.equal(r.loadout.devices[0].id, 'dv_thermal');
  assert.equal(r.removed[0].id, 'dv_cam_cheap');
});

test('Chassis mit weniger Plätzen wirft überzählige Geräte aus', () => {
  let l = equip(klix(), part('ch_guard')).loadout;
  l = equip(l, part('dv_shield')).loadout;
  const r = equip(l, part('ch_heavy'));
  assert.equal(r.loadout.devices.length, 1);
  assert.ok(r.removed.some((p) => p.id === 'dv_shield'));
  assert.ok(r.removed.some((p) => p.id === 'ch_guard'));
});

test('equip verändert das Original nicht', () => {
  const l = klix();
  equip(l, part('dv_thermal'), { index: 0 });
  assert.equal(l.devices[0].id, 'dv_cam_cheap');
});

test('unequip erlaubt nur Waffe und Geräte', () => {
  const r = unequip(klix(), 'weapon');
  assert.equal(r.loadout.weapon, null);
  assert.equal(computeStats(r.loadout).weapon, null);
  assert.throws(() => unequip(klix(), 'drive'));
});

test('Set-Bonus ab drei Teilen derselben Baureihe', () => {
  const guard = DROID_TYPES[516].loadout();
  assert.equal(setBonusOf(guard).series, 'Sentinel');
  const base = computeStats({ ...guard, devices: [] });
  assert.ok(computeStats(guard).hull >= base.hull);
  assert.equal(setBonusOf(klix()), null, 'KLX hat keinen Set-Bonus');
  assert.equal(setBonusOf(DROID_TYPES[349].loadout()).series, 'Hauler');
});

test('Verschleiß senkt die Leistung', () => {
  const worn = { ...klix(), drive: part('dr_crawler', 0) };
  assert.ok(computeStats(worn).accel < computeStats(klix()).accel);
});

test('Beute-Zustand: klarer Sieg gegen unbeschädigten Gegner gibt Bestzustand', () => {
  assert.equal(salvageCondition(0.5, 1), 1);
  assert.ok(salvageCondition(0.1, 1) < 1);
  assert.ok(salvageCondition(0.5, 0.3) < salvageCondition(0.5, 1));
});
