// Vultures (spec §15.3–15.4): local targeting, straight-line flight, landing, pecking,
// retargeting, expiry, and blocking wolves while landed.

import * as C from '../config.js';
import { VultureState } from '../entities/vulture.js';
import { damageWolf } from './combatSystem.js';

// Geometric tolerance (px) so a Vulture landing exactly at melee range does not flicker
// between landed and flying from rounding error (which would reset its attack timer).
const LANDING_SLACK = 1;

function nearestWolf(game, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const wolf of game.wolves) {
    const d = Math.hypot(wolf.x - x, wolf.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = wolf;
    }
  }
  return best;
}

export function updateVultures(game, dt) {
  for (const v of game.vultures) {
    // Sticky target: only re-picked when it dies (or there was none).
    let target = game.wolves.find((w) => w.id === v.targetId) ?? null;
    if (!target) {
      target = nearestWolf(game, v.x, v.y);
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
        damageWolf(game, target, C.VULTURE_DAMAGE); // if it dies, next step picks a new target
      }
    }
  }
}

// §15.4: a wolf whose centre is within VULTURE_BLOCK_RADIUS of a landed Vulture stops
// and bites it (the nearest one if several). Runs before movement each step; a wolf
// with no blocker this step simply resumes.
export function updateBlocking(game, dt) {
  const landed = game.vultures.filter((v) => v.state === VultureState.LANDED);
  for (const wolf of game.wolves) {
    let blocker = null;
    let bestDist = Infinity;
    for (const v of landed) {
      const d = Math.hypot(v.x - wolf.x, v.y - wolf.y);
      if (d <= C.VULTURE_BLOCK_RADIUS && d < bestDist) {
        bestDist = d;
        blocker = v;
      }
    }
    if (!blocker) {
      wolf.blockedBy = null;
      wolf.vultureBiteTimer = 0;
      continue;
    }
    if (wolf.blockedBy !== blocker.id) wolf.vultureBiteTimer = 0; // newly blocked: wind up a bite
    wolf.blockedBy = blocker.id;
    wolf.facing = blocker.x >= wolf.x ? 1 : -1;
    wolf.vultureBiteTimer += dt;
    if (wolf.vultureBiteTimer >= C.WOLF_ATTACK_INTERVAL) {
      wolf.vultureBiteTimer -= C.WOLF_ATTACK_INTERVAL;
      wolf.lastBiteTime = game.combatTime;
      blocker.hp -= C.WOLF_DAMAGE;
      blocker.lastHitTime = game.combatTime;
    }
  }
}

// Expire Vultures at 0 HP or when their duration runs out (§15.3).
export function expireVultures(game, dt) {
  for (const v of game.vultures) v.remaining -= dt;
  game.vultures = game.vultures.filter((v) => v.hp > 0 && v.remaining > 0);
}
