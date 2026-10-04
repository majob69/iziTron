// Ausschlachten (nach erfolgreichem Kapern) und Werkstatt (am Terminal).
import { COMPONENTS, SLOT_NAMES } from '../data/components.js';
import { equip, unequip, partsOf } from '../logic/loadout.js';
import { SENSOR_NAMES } from '../game/sensor-pass.js';

export const INVENTORY_SIZE = 8;

function partStats(def) {
  const s = [];
  switch (def.slot) {
    case 'chassis':
      s.push(`Hülle ${def.hull}`, `Masse ${def.mass}`, `Impulsdauer ${def.pulseDuration}s`, `${def.deviceSlots} Geräteplatz${def.deviceSlots > 1 ? 'e' : ''}`);
      break;
    case 'drive':
      s.push(`Schub ${def.thrust}`, `max. ${def.maxSpeed} m/s`, `Masse ${def.mass}`, `Energie −${def.draw}`, def.look === 'hover' ? 'schwebt (Gitter-immun)' : def.look === 'tracks' ? 'Ketten' : 'Räder');
      break;
    case 'power':
      s.push(`Leistung ${def.output}`, `${def.pulsers} Pulser`, `Masse ${def.mass}`);
      break;
    case 'weapon':
      s.push(`Schaden ${def.damage}`, `${def.fireRate}/s`, `Reichweite ${def.range}`, `Energie −${def.draw}`, `Masse ${def.mass}`);
      break;
    case 'device':
      if (def.sensor) s.push(SENSOR_NAMES[def.sensor]);
      if (def.armor) s.push(`Panzerung ${Math.round(def.armor * 100)} %`);
      s.push(`Energie −${def.draw}`, `Masse ${def.mass}`);
      break;
  }
  return s.join(' · ');
}

function statsSummary(stats) {
  const row = (label, value, cls = '') => `<div class="st ${cls}"><span>${label}</span><b>${value}</b></div>`;
  return [
    row('Hülle', stats.hull),
    row('Masse', stats.mass),
    row('Tempo', `${stats.maxSpeed.toFixed(1)} m/s`, stats.sluggish ? 'warn' : ''),
    row('Energie', `${stats.powerUse} / ${stats.powerOut}`, stats.overloaded ? 'bad' : ''),
    row('Pulser', stats.pulsers, stats.overloaded ? 'bad' : ''),
    row('Impulsdauer', `${stats.pulseDuration} s`),
    row('Waffe', stats.weapon ? `${stats.weapon.damage.toFixed(0)} Schaden` : '—'),
    row('Sensor', SENSOR_NAMES[stats.sensor]),
    row('Panzerung', `${Math.round(stats.armor * 100)} %`),
    stats.setBonus ? row('Set-Bonus', stats.setBonus.label, 'good') : '',
  ].join('');
}

export class PartsView {
  constructor(root, sfx) {
    this.sfx = sfx;
    this.el = document.createElement('div');
    this.el.id = 'parts';
    this.el.className = 'overlay hidden';
    root.appendChild(this.el);
    this.el.addEventListener('click', (e) => this.onClick(e));
  }

  get active() {
    return !this.el.classList.contains('hidden');
  }

  /** Beute aus einem gekaperten Droiden. */
  openSalvage(player, inventory, enemy, condition, onDone) {
    this.mode = 'salvage';
    this.player = player;
    this.inventory = inventory;
    this.loot = partsOf(enemy.loadout).map((p) => ({ id: p.id, condition: Math.min(p.condition, condition) }));
    this.title = `Ausschlachten: ${enemy.code} ${enemy.name}`;
    this.onDone = onDone;
    this.notice = 'Nicht mitgenommene Teile gehen verloren.';
    this.show();
  }

  openWorkshop(player, inventory, onDone) {
    this.mode = 'workshop';
    this.player = player;
    this.inventory = inventory;
    this.loot = [];
    this.title = 'Werkstatt-Terminal';
    this.onDone = onDone;
    this.notice = 'Hier kannst du Teile tauschen und Klix reparieren.';
    this.show();
  }

  show() {
    this.el.classList.remove('hidden');
    this.render();
    this.el.querySelector('button')?.focus();
  }

  close() {
    this.el.classList.add('hidden');
    const cb = this.onDone;
    this.onDone = null;
    cb?.();
  }

  card(p, actions, extraClass = '') {
    const def = COMPONENTS[p.id];
    const cond = Math.round(p.condition * 100);
    return `<div class="card ${extraClass}">
      <div class="card-slot">${SLOT_NAMES[def.slot]} · ${def.series}</div>
      <div class="card-name">${def.name}</div>
      <div class="card-stats">${partStats(def)}</div>
      <div class="card-cond"><div style="width:${cond}%" class="${cond < 50 ? 'low' : ''}"></div><span>Zustand ${cond} %</span></div>
      <div class="card-actions">${actions}</div>
    </div>`;
  }

  render() {
    const L = this.player.loadout;
    const stats = this.player.stats;
    const equipped = [
      ['chassis', L.chassis],
      ['drive', L.drive],
      ['power', L.power],
      ['weapon', L.weapon],
      ...L.devices.map((d) => ['device', d]),
    ];
    const canRemove = (slot) => slot === 'weapon' || slot === 'device';
    let devIndex = -1;
    const equippedHtml = equipped
      .map(([slot, p]) => {
        if (slot === 'device') devIndex++;
        if (!p) return `<div class="card empty"><div class="card-slot">${SLOT_NAMES[slot]}</div><div class="card-name">— leer —</div></div>`;
        const act = this.mode === 'workshop' && canRemove(slot) ? `<button data-act="unequip" data-slot="${slot}" data-index="${slot === 'device' ? devIndex : 0}">Ausbauen</button>` : '';
        return this.card(p, act, 'equipped');
      })
      .join('');

    const lootHtml = this.loot
      .map((p, i) => this.card(p, `<button data-act="equip-loot" data-i="${i}" class="primary">Einbauen</button><button data-act="store-loot" data-i="${i}">Einlagern</button>`, 'loot'))
      .join('');

    const invHtml = this.inventory
      .map((p, i) =>
        this.card(
          p,
          this.mode === 'workshop' ? `<button data-act="equip-inv" data-i="${i}" class="primary">Einbauen</button><button data-act="scrap" data-i="${i}">Verschrotten</button>` : '',
          'inv',
        ),
      )
      .join('');

    this.el.innerHTML = `<div class="panel">
      <div class="panel-head"><h2>${this.title}</h2><button data-act="done" class="primary">Fertig</button></div>
      <p class="notice">${this.notice}</p>
      <div class="panel-body">
        <section class="col">
          <h3>Klix (eingebaut)</h3>
          <div class="stats">${statsSummary(stats)}</div>
          ${this.mode === 'workshop' ? `<button data-act="repair" class="wide" ${this.player.hull >= stats.hull ? 'disabled' : ''}>Reparieren (${Math.round(this.player.hull)} → ${stats.hull})</button>` : ''}
          <div class="cards">${equippedHtml}</div>
        </section>
        ${this.mode === 'salvage' ? `<section class="col"><h3>Beute</h3><div class="cards">${lootHtml || '<p class="muted">Alles mitgenommen.</p>'}</div></section>` : ''}
        <section class="col">
          <h3>Lager (${this.inventory.length}/${INVENTORY_SIZE})</h3>
          <div class="cards">${invHtml || '<p class="muted">leer</p>'}</div>
        </section>
      </div>
    </div>`;
  }

  /** Teil einbauen; ausgebaute Teile wandern ins Lager (oder gehen verloren, wenn es voll ist). */
  install(part) {
    const { loadout, removed } = equip(this.player.loadout, part);
    this.player.loadout = loadout;
    this.player.applyLoadout();
    const lost = [];
    for (const r of removed) {
      if (this.inventory.length < INVENTORY_SIZE) this.inventory.push(r);
      else lost.push(COMPONENTS[r.id].name);
    }
    const s = this.player.stats;
    this.notice = `${COMPONENTS[part.id].name} eingebaut.`;
    if (s.overloaded) this.notice += ' ⚠ Energie-Überlast: weniger Tempo und Pulser. Stärkere Energiequelle einbauen!';
    else if (s.sluggish) this.notice += ' ⚠ Zu schwer für den Antrieb: Klix ist träge.';
    if (lost.length) this.notice += ` Lager voll – verloren: ${lost.join(', ')}.`;
    this.sfx.play('equip');
  }

  onClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const i = Number(b.dataset.i);
    switch (b.dataset.act) {
      case 'done':
        this.sfx.play('click');
        this.close();
        return;
      case 'equip-loot':
        this.install(this.loot.splice(i, 1)[0]);
        break;
      case 'store-loot':
        if (this.inventory.length >= INVENTORY_SIZE) {
          this.notice = 'Lager voll.';
          this.sfx.play('click');
          break;
        }
        this.inventory.push(this.loot.splice(i, 1)[0]);
        this.notice = 'Eingelagert.';
        this.sfx.play('click');
        break;
      case 'equip-inv':
        this.install(this.inventory.splice(i, 1)[0]);
        break;
      case 'scrap':
        this.notice = `${COMPONENTS[this.inventory[i].id].name} verschrottet.`;
        this.inventory.splice(i, 1);
        this.sfx.play('click');
        break;
      case 'unequip': {
        if (this.inventory.length >= INVENTORY_SIZE) {
          this.notice = 'Lager voll.';
          break;
        }
        const { loadout, removed } = unequip(this.player.loadout, b.dataset.slot, Number(b.dataset.index));
        this.player.loadout = loadout;
        this.player.applyLoadout();
        if (removed) this.inventory.push(removed);
        this.notice = 'Ausgebaut.';
        this.sfx.play('click');
        break;
      }
      case 'repair':
        this.player.hull = this.player.stats.hull;
        this.notice = 'Hülle repariert.';
        this.sfx.play('equip');
        break;
    }
    this.render();
  }
}

