// Alle Bauteile. Spieler und Gegner nutzen dieselben Teile ("Klix ist auch nur ein Droide").
//
// Gemeinsame Felder: slot, name, series, mass, draw (Energieverbrauch)
// chassis: hull, pulseDuration (Grapple), deviceSlots, look
// drive:   thrust, maxSpeed, look ('wheels' | 'tracks' | 'hover')
// power:   output, pulsers (Grapple), color
// weapon:  damage, fireRate (Schuss/s), heat (pro Schuss), speed, range
// device:  sensor ('cheap' | 'military' | 'thermal') oder armor (0..1)

export const SLOTS = ['chassis', 'drive', 'power', 'weapon', 'device'];
export const REQUIRED_SLOTS = ['chassis', 'drive', 'power'];

export const SLOT_NAMES = {
  chassis: 'Chassis',
  drive: 'Antrieb',
  power: 'Energie',
  weapon: 'Waffe',
  device: 'Gerät',
};

export const COMPONENTS = {
  // Chassis
  ch_scrap: { slot: 'chassis', name: 'Schrott-Rahmen KLX', series: 'KLX', mass: 40, draw: 0, hull: 60, pulseDuration: 1.6, deviceSlots: 1, look: 'scrap' },
  ch_light: { slot: 'chassis', name: 'Leichtrahmen L-1', series: 'Servo', mass: 28, draw: 0, hull: 40, pulseDuration: 1.8, deviceSlots: 1, look: 'light' },
  ch_heavy: { slot: 'chassis', name: 'Lastrahmen H-3', series: 'Hauler', mass: 110, draw: 0, hull: 150, pulseDuration: 2.2, deviceSlots: 1, look: 'heavy' },
  ch_guard: { slot: 'chassis', name: 'Wachpanzer G-5', series: 'Sentinel', mass: 75, draw: 0, hull: 110, pulseDuration: 2.4, deviceSlots: 2, look: 'guard' },

  // Antriebe
  dr_crawler: { slot: 'drive', name: 'Kriechantrieb', series: 'KLX', mass: 15, draw: 10, thrust: 1100, maxSpeed: 4.2, look: 'wheels' },
  dr_wheels: { slot: 'drive', name: 'Servo-Räder', series: 'Servo', mass: 10, draw: 8, thrust: 800, maxSpeed: 5.2, look: 'wheels' },
  dr_tracks: { slot: 'drive', name: 'Kettenlaufwerk', series: 'Hauler', mass: 35, draw: 25, thrust: 2900, maxSpeed: 4.4, look: 'tracks' },
  dr_hover: { slot: 'drive', name: 'Schwebe-Turbine', series: 'Sentinel', mass: 20, draw: 30, thrust: 2000, maxSpeed: 6.5, look: 'hover' },

  // Energie
  pw_tiny: { slot: 'power', name: 'Kleinstakku', series: 'Servo', mass: 5, draw: 0, output: 20, pulsers: 2, color: 0x88ff88 },
  pw_cell: { slot: 'power', name: 'Notzelle', series: 'KLX', mass: 8, draw: 0, output: 30, pulsers: 3, color: 0x66ccff },
  pw_mid: { slot: 'power', name: 'Fusionspack M', series: 'Hauler', mass: 18, draw: 0, output: 60, pulsers: 4, color: 0xffaa33 },
  pw_high: { slot: 'power', name: 'Kernreaktor S', series: 'Sentinel', mass: 25, draw: 0, output: 90, pulsers: 5, color: 0xff3366 },

  // Waffen
  wp_zapper: { slot: 'weapon', name: 'Funkenzapper', series: 'KLX', mass: 5, draw: 8, damage: 8, fireRate: 3, heat: 12, speed: 22, range: 14 },
  wp_laser: { slot: 'weapon', name: 'Wachlaser L5', series: 'Sentinel', mass: 12, draw: 20, damage: 13, fireRate: 3.5, heat: 13, speed: 30, range: 18 },

  // Geräte
  dv_cam_cheap: { slot: 'device', name: 'Billig-Optik', series: 'KLX', mass: 2, draw: 2, sensor: 'cheap' },
  dv_optic_mil: { slot: 'device', name: 'Militär-Optik', series: 'Sentinel', mass: 3, draw: 6, sensor: 'military' },
  dv_thermal: { slot: 'device', name: 'Thermalsensor', series: 'Hauler', mass: 3, draw: 8, sensor: 'thermal' },
  dv_shield: { slot: 'device', name: 'Prallschild', series: 'Sentinel', mass: 6, draw: 15, armor: 0.3 },
};

// Set-Bonus ab 3 Teilen derselben Baureihe
export const SET_BONUS = {
  Sentinel: { label: 'Sentinel-Reihe: +20 % Hülle', hull: 1.2 },
  Hauler: { label: 'Hauler-Reihe: +25 % Rammkraft', ram: 1.25 },
  Servo: { label: 'Servo-Reihe: +15 % Tempo', speed: 1.15 },
};
