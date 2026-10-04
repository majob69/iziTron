// Droiden-Typen. Klasse = Sicherheitsstufe (1xx harmlos … 9xx extrem gefährlich).
import { part } from '../logic/loadout.js';

export const DROID_TYPES = {
  klx: {
    code: 'KLX-7',
    name: 'Klix',
    klass: 0,
    loadout: () => ({
      chassis: part('ch_scrap'),
      drive: part('dr_crawler'),
      power: part('pw_cell'),
      weapon: part('wp_zapper'),
      devices: [part('dv_cam_cheap')],
    }),
  },
  123: {
    code: '123',
    name: 'Putzdroide',
    klass: 1,
    ai: 'wander',
    complexity: 0.15,
    grapple: { interval: 1.5, smart: 0.3 },
    scan: 'Reinigt Böden. Harmlos, flieht bei Gefahr.',
    loadout: () => ({
      chassis: part('ch_light'),
      drive: part('dr_wheels'),
      power: part('pw_tiny'),
      weapon: null,
      devices: [part('dv_thermal')],
    }),
  },
  349: {
    code: '349',
    name: 'Lastdroide',
    klass: 3,
    ai: 'pusher',
    complexity: 0.3,
    grapple: { interval: 1.5, smart: 0.35 },
    scan: 'Schwerer Arbeitsdroide. Rammt Eindringlinge von den Plattformen.',
    loadout: () => ({
      chassis: part('ch_heavy'),
      drive: part('dr_tracks'),
      power: part('pw_mid'),
      weapon: null,
      devices: [],
    }),
  },
  516: {
    code: '516',
    name: 'Wachdroide',
    klass: 5,
    ai: 'guard',
    complexity: 0.45,
    grapple: { interval: 1.15, smart: 0.5 },
    scan: 'Bewaffneter Wächter mit Militär-Optik und Schild.',
    loadout: () => ({
      chassis: part('ch_guard'),
      drive: part('dr_hover'),
      power: part('pw_high'),
      weapon: part('wp_laser'),
      devices: [part('dv_optic_mil'), part('dv_shield')],
    }),
  },
};
