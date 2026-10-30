// Vultures (spec §15.3–15.4): local targeting, straight-line flight, landing, pecking,
// retargeting, expiry, and blocking enemies while landed. Vultures treat every enemy type alike.

import * as C from '../config.js';
import { VultureState } from '../entities/vulture.js';
import { damageEnemy, lifestealOnBite } from './combatSystem.js';
import { enemyType } from '../entities/enemy.js';
import { blockingSquirrels } from './squirrelSystem.js';
import { events } from '../events.js';

// Geometric tolerance (px) so a Vulture landing exactly at melee range does not flicker
// between landed and flying from rounding error (which would reset its attack timer).
const LANDING_SLACK = 1;

function nearestEnemy(game, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const enemy of game.enemies) {
    const d = Math.hypot(enemy.x - x, enemy.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = enemy;
    }
  }
  return best;
}

export function updateVultures(game, dt) {
  for (const v of game.vultures) {
    // Sticky target: only re-picked when it dies (or there was none).
    let target = game.enemies.find((e) => e.id === v.targetId) ?? null;
    if (!target) {
      target = nearestEnemy(game, v.x, v.y);
      v.targetId = target ? target.id : null;
      v.state = target ? VultureState.FLYING : VultureState.HOVERING;
      v.attackTimer = 0;
    }
    if (!target) continue; // hovers in place

    const dx = target.x - v.x;
    const dy = target.y - v.y;
    const dist = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.5) v.facing = Math.sign(dx);

    if (v.state === VultureState.LANDED && dist > C.VULTURE_MELEE_RANGE + LANDING_SLACK) {
      v.state = VultureState.FLYING; // target got away: take off again
    }
    if (v.state === VultureState.FLYING) {
      if (dist <= C.VULTURE_MELEE_RANGE) {
        v.state = VultureState.LANDED;
        v.attackTimer = 0;
      } else {
        // Fly until just inside melee range, then land.
        const step = Math.min(C.VULTURE_SPEED * dt, dist - (C.VULTURE_MELEE_RANGE - LANDING_SLACK));
        v.x += (dx / dist) * step;
        v.y += (dy / dist) * step;
        if (Math.hypot(target.x - v.x, target.y - v.y) <= C.VULTURE_MELEE_RANGE) {
          v.state = VultureState.LANDED;
          v.attackTimer = 0;
        }
      }
    }
    if (v.state === VultureState.LANDED) {
      v.attackTimer += dt;
      if (v.attackTimer >= C.VULTURE_ATTACK_INTERVAL) {
        v.attackTimer -= C.VULTURE_ATTACK_INTERVAL;
        v.lastPeckTime = game.combatTime;
        events.emit('vulturePecked', { x: v.x, y: v.y });
        damageEnemy(game, target, game.stats['vulture.damage']); // effective (M2e); if it dies, next step picks a new target
      }
    }
  }
}

// §15.4: an enemy (any type) whose centre is within the block radius of a landed Vulture stops and
// attacks it (the nearest one if several). With SQUIRREL_BLOCKS_WOLVES, a waiting Squirrel blocks and
// is attacked the same way (M1d §2.4). Runs before movement each step; an enemy with no blocker
// this step simply resumes.
export function updateBlocking(game, dt) {
  const blockers = [
    ...game.vultures.filter((v) => v.state === VultureState.LANDED).map((unit) => ({ unit, radius: C.VULTURE_BLOCK_RADIUS })),
    ...blockingSquirrels(game).map((unit) => ({ unit, radius: C.SQUIRREL_BLOCK_RADIUS, squirrel: true })),
  ];
  for (const enemy of game.enemies) {
    let blocker = null;
    let bestDist = Infinity;
    for (const { unit, radius, squirrel } of blockers) {
      if (squirrel && enemy.flying) continue; // M2h §3.2: Squirrels never block flyers
      const d = Math.hypot(unit.x - enemy.x, unit.y - enemy.y);
      if (d <= radius && d < bestDist) {
        bestDist = d;
        blocker = unit;
      }
    }
    if (!blocker) {
      enemy.blockedBy = null;
      enemy.vultureBiteTimer = 0;
      continue;
    }
    if (enemy.blockedBy !== blocker.id) enemy.vultureBiteTimer = 0; // newly blocked: wind up a bite
    enemy.blockedBy = blocker.id;
    enemy.facing = blocker.x >= enemy.x ? 1 : -1;
    const t = enemyType(enemy); // attacks the blocker with its own type's damage and interval (M1e §3.4)
    if (t.windupTime) continue; // wind-up attackers (the Ogre) strike it in updateWindupAttacks (M2c §2.5)
    enemy.vultureBiteTimer += dt;
    if (enemy.vultureBiteTimer >= t.attackInterval) {
      enemy.vultureBiteTimer -= t.attackInterval;
      enemy.lastBiteTime = game.combatTime;
      blocker.hp -= t.damage;
      blocker.lastHitTime = game.combatTime;
      lifestealOnBite(game, enemy);
      events.emit('enemyAttacked', { type: enemy.type, target: 'summon' });
    }
  }
}

// Expire Vultures at 0 HP or when their duration runs out (§15.3).
export function expireVultures(game, dt) {
  for (const v of game.vultures) v.remaining -= dt;
  game.vultures = game.vultures.filter((v) => v.hp > 0 && v.remaining > 0);
}
