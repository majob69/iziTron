// Loadout & Werte: reine Logik ohne Darstellung.
//
// Ein Loadout ist { chassis, drive, power, weapon, devices: [] }.
// Jedes Teil ist { id, condition } (condition 0..1, Verschleiß).

import { COMPONENTS, REQUIRED_SLOTS, SET_BONUS } from '../data/components.js';

/** Trägheit: unterhalb dieser Beschleunigung wird der Droide träge. */
export const SLUGGISH_ACCEL = 15;
/** Leistungsabfall bei Energie-Überlast. */
export const OVERLOAD_PERF = 0.6;

export const part = (id, condition = 1) => ({ id, condition });

export function partsOf(loadout) {
  return [loadout.chassis, loadout.drive, loadout.power, loadout.weapon, ...(loadout.devices ?? [])].filter(Boolean);
}

export function validateLoadout(loadout, defs = COMPONENTS) {
  const errors = [];
  for (const slot of REQUIRED_SLOTS) {
    if (!loadout[slot]) errors.push(`${slot} fehlt`);
  }
  for (const p of partsOf(loadout)) {
    if (!defs[p.id]) errors.push(`Unbekanntes Teil: ${p.id}`);
  }
  for (const slot of ['chassis', 'drive', 'power', 'weapon']) {
    const p = loadout[slot];
    if (p && defs[p.id] && defs[p.id].slot !== slot) errors.push(`${p.id} passt nicht in ${slot}`);
  }
  for (const d of loadout.devices ?? []) {
    if (defs[d.id] && defs[d.id].slot !== 'device') errors.push(`${d.id} ist kein Gerät`);
  }
  const ch = loadout.chassis && defs[loadout.chassis.id];
  if (ch && (loadout.devices?.length ?? 0) > ch.deviceSlots) {
    errors.push(`Zu viele Geräte (max. ${ch.deviceSlots})`);
  }
  return errors;
}

export function setBonusOf(loadout, defs = COMPONENTS) {
  const counts = {};
  for (const p of partsOf(loadout)) {
    const s = defs[p.id]?.series;
    if (s) counts[s] = (counts[s] ?? 0) + 1;
  }
  const series = Object.keys(counts).find((s) => counts[s] >= 3 && SET_BONUS[s]);
  return series ? { series, ...SET_BONUS[series] } : null;
}

export function computeStats(loadout, defs = COMPONENTS) {
  const errors = validateLoadout(loadout, defs);
  if (errors.length) throw new Error(`Ungültiges Loadout: ${errors.join(', ')}`);

  const parts = partsOf(loadout);
  const d = (p) => defs[p.id];
  const ch = d(loadout.chassis);
  const dr = d(loadout.drive);
  const pw = d(loadout.power);
  const wp = loadout.weapon ? d(loadout.weapon) : null;
  const devices = (loadout.devices ?? []).map(d);

  const mass = parts.reduce((m, p) => m + d(p).mass, 0);
  const powerUse = parts.reduce((s, p) => s + (d(p).draw ?? 0), 0);
  const powerOut = pw.output;
  const overloaded = powerUse > powerOut;
  const perf = overloaded ? OVERLOAD_PERF : 1;
  const bonus = setBonusOf(loadout, defs);

  // Verschleiß wirkt auf die Leistung des jeweiligen Teils (max. -30 %).
  const wear = (p) => 0.7 + 0.3 * (p?.condition ?? 1);

  const accel = (dr.thrust * wear(loadout.drive)) / mass * perf;
  const speedFactor = Math.min(1, Math.max(0.4, accel / SLUGGISH_ACCEL));
  const maxSpeed = dr.maxSpeed * speedFactor * perf * (bonus?.speed ?? 1);
  const hull = Math.round(ch.hull * wear(loadout.chassis) * (bonus?.hull ?? 1));
  const armor = Math.min(0.6, devices.reduce((a, x) => a + (x.armor ?? 0), 0));
  const sensor = devices.find((x) => x.sensor)?.sensor ?? 'none';

  return {
    mass,
    hull,
    armor,
    accel,
    maxSpeed,
    sluggish: speedFactor < 1,
    powerUse,
    powerOut,
    overloaded,
    pulsers: Math.max(1, pw.pulsers - (overloaded ? 1 : 0)),
    pulseDuration: ch.pulseDuration,
    hover: dr.look === 'hover',
    sensor,
    ramFactor: bonus?.ram ?? 1,
    setBonus: bonus,
    weapon: wp
      ? {
          damage: wp.damage * wear(loadout.weapon),
          fireRate: wp.fireRate * perf,
          heat: wp.heat,
          speed: wp.speed,
          range: wp.range,
        }
      : null,
  };
}

/**
 * Baut ein Teil ein. Gibt { loadout, removed } zurück (removed = ausgebaute Teile).
 * Geräte: index bestimmt den Platz; ist ein Platz frei, wird angehängt.
 */
export function equip(loadout, newPart, { index = null, defs = COMPONENTS } = {}) {
  const def = defs[newPart.id];
  if (!def) throw new Error(`Unbekanntes Teil: ${newPart.id}`);
  const next = { ...loadout, devices: [...(loadout.devices ?? [])] };
  const removed = [];
  if (def.slot === 'device') {
    const slots = defs[next.chassis.id].deviceSlots;
    if (index === null && next.devices.length < slots) {
      next.devices.push(newPart);
    } else {
      const i = Math.min(index ?? 0, slots - 1);
      if (next.devices[i]) removed.push(next.devices[i]);
      next.devices[i] = newPart;
    }
  } else {
    if (next[def.slot]) removed.push(next[def.slot]);
    next[def.slot] = newPart;
  }
  // Neues Chassis mit weniger Geräteplätzen: überzählige Geräte fallen heraus.
  if (def.slot === 'chassis') {
    const slots = def.deviceSlots;
    while (next.devices.length > slots) removed.push(next.devices.pop());
  }
  return { loadout: next, removed };
}

/** Baut ein Teil aus (nur Waffe und Geräte, Pflichtteile bleiben drin). */
export function unequip(loadout, slot, index = 0) {
  const next = { ...loadout, devices: [...(loadout.devices ?? [])] };
  let removed = null;
  if (slot === 'device') {
    removed = next.devices.splice(index, 1)[0] ?? null;
  } else if (slot === 'weapon') {
    removed = next.weapon;
    next.weapon = null;
  } else {
    throw new Error(`${slot} kann nicht leer bleiben`);
  }
  return { loadout: next, removed };
}

/** Zustand der Beute nach einem Grapple-Sieg: knapper Sieg oder angeschossener Gegner → schlechtere Teile. */
export function salvageCondition(margin, enemyHullRatio) {
  const fromMargin = 0.55 + 0.45 * Math.min(1, Math.max(0, margin) * 2.5);
  const fromHull = 0.5 + 0.5 * Math.max(0, Math.min(1, enemyHullRatio));
  return Math.round(fromMargin * fromHull * 100) / 100;
}
