// Gegner-KI: wander (Putzdroide), pusher (Lastdroide), guard (Wachdroide).
import * as THREE from 'three';

const LOOKAHEAD = 1.5;

/** Richtung so drehen, dass der Droide nicht selbst in den Abgrund fährt. */
function safeDir(d, deck, dir) {
  if (dir.lengthSq() < 1e-4) return dir;
  const base = Math.atan2(dir.x, dir.z);
  const len = dir.length();
  for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6]) {
    const a = base + off;
    const x = d.pos.x + Math.sin(a) * LOOKAHEAD;
    const z = d.pos.z + Math.cos(a) * LOOKAHEAD;
    if (deck.isFloor(x, z) && !deck.isWall(x, z) && (d.stats.hover || !deck.isHazard(x, z))) {
      return new THREE.Vector3(Math.sin(a) * len, 0, Math.cos(a) * len);
    }
  }
  return new THREE.Vector3();
}

function pickPatrolTarget(d, world, radius) {
  const tiles = world.floorTiles.filter((t) => t.distanceTo(d.home) < radius);
  return tiles.length ? tiles[Math.floor(Math.random() * tiles.length)].clone() : d.home.clone();
}

function towards(from, to) {
  return new THREE.Vector3(to.x - from.x, 0, to.z - from.z);
}

function patrol(d, world, dt, speed, radius) {
  const ai = d.ai;
  ai.timer -= dt;
  if (!ai.target || ai.timer <= 0 || towards(d.pos, ai.target).length() < 0.6) {
    ai.target = pickPatrolTarget(d, world, radius);
    ai.timer = 3 + Math.random() * 3;
  }
  const dir = towards(d.pos, ai.target);
  if (dir.length() < 0.6) return { move: new THREE.Vector3(), face: null };
  dir.normalize().multiplyScalar(speed);
  const move = safeDir(d, world.deck, dir);
  return { move, face: move.lengthSq() > 0.01 ? Math.atan2(move.x, move.z) : null };
}

/** Gibt die Steuerung für einen KI-Droiden zurück (gleiches Format wie beim Spieler). */
export function think(d, world, player, dt) {
  const ctrl = { move: new THREE.Vector3(), face: null, fire: null, dash: false, precise: false };
  const seesPlayer =
    player?.active &&
    d.pos.distanceTo(player.pos) < (d.type.ai === 'guard' ? 13 : 6.5) &&
    world.deck.lineOfSight(d.pos, player.pos);
  if (seesPlayer) d.ai.alerted = true;
  if (player && !player.active) d.ai.alerted = false;

  const toPlayer = player ? towards(d.pos, player.pos) : new THREE.Vector3();
  const dist = toPlayer.length();

  switch (d.type.ai) {
    case 'wander': {
      if (d.ai.alerted && dist < 5) {
        const away = toPlayer.clone().normalize().multiplyScalar(-1);
        ctrl.move = safeDir(d, world.deck, away);
        ctrl.face = ctrl.move.lengthSq() > 0.01 ? Math.atan2(ctrl.move.x, ctrl.move.z) : null;
      } else {
        if (dist > 7) d.ai.alerted = false;
        Object.assign(ctrl, patrol(d, world, dt, 0.5, 6));
      }
      break;
    }
    case 'pusher': {
      if (d.ai.alerted && dist < 12) {
        ctrl.face = Math.atan2(toPlayer.x, toPlayer.z);
        const facingErr = Math.abs(Math.atan2(Math.sin(ctrl.face - d.facing), Math.cos(ctrl.face - d.facing)));
        const dir = toPlayer.clone().normalize();
        // Nah dran und ausgerichtet: Rammstoß, auch auf die Gefahr hin, selbst abzustürzen.
        if (dist < 3.8 && facingErr < 0.3 && d.dashCooldown <= 0) {
          ctrl.dash = true;
          ctrl.move = dir;
        } else {
          ctrl.move = safeDir(d, world.deck, dir.multiplyScalar(0.85));
        }
      } else {
        Object.assign(ctrl, patrol(d, world, dt, 0.45, 5));
      }
      break;
    }
    case 'guard': {
      if (d.ai.alerted && dist < 16 && player?.active) {
        ctrl.face = Math.atan2(toPlayer.x, toPlayer.z);
        const dir = toPlayer.clone().normalize();
        d.ai.timer -= dt;
        if (d.ai.timer <= 0) {
          d.ai.strafe = Math.random() < 0.5 ? -1 : 1;
          d.ai.timer = 1.5 + Math.random() * 1.5;
        }
        let move;
        if (dist > 9) move = dir.clone();
        else if (dist < 5) move = dir.clone().multiplyScalar(-1);
        else move = new THREE.Vector3(dir.z * d.ai.strafe, 0, -dir.x * d.ai.strafe).multiplyScalar(0.6);
        ctrl.move = safeDir(d, world.deck, move);
        const facingErr = Math.abs(Math.atan2(Math.sin(ctrl.face - d.facing), Math.cos(ctrl.face - d.facing)));
        if (facingErr < 0.15 && dist < d.stats.weapon.range && world.deck.lineOfSight(d.pos, player.pos)) {
          const spread = (Math.random() - 0.5) * 0.16;
          ctrl.fire = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
        }
      } else {
        Object.assign(ctrl, patrol(d, world, dt, 0.4, 5));
      }
      break;
    }
  }
  return ctrl;
}
