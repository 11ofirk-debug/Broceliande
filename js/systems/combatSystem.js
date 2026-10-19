// Damage and death: turrets and pebbles (spec §10), wolves biting the Druid (§12.5).
// Vulture pecks and blocking live in vultureSystem.js and use damageWolf from here.

import * as C from '../config.js';
import { WolfState, remainingDistance } from '../entities/wolf.js';
import { turretRange, turretDamage, turretFireInterval, turretMuzzle } from '../entities/turret.js';
import { createProjectile } from '../entities/projectile.js';
import { ActionState } from '../states.js';

// ---------------------------------------------------------------------------
// Turrets (§10.2)
// ---------------------------------------------------------------------------

// The in-range wolf with the least remaining lane distance to the Druid
// (wolves already at the Druid count as 0). Ties go to the nearer wolf.
function selectTarget(game, turret) {
  const range = turretRange(turret);
  let best = null;
  let bestRemaining = Infinity;
  let bestDist = Infinity;
  for (const wolf of game.wolves) {
    const dist = Math.hypot(wolf.x - turret.x, wolf.y - turret.y);
    if (dist > range) continue;
    const remaining = remainingDistance(wolf);
    if (remaining < bestRemaining || (remaining === bestRemaining && dist < bestDist)) {
      best = wolf;
      bestRemaining = remaining;
      bestDist = dist;
    }
  }
  return best;
}

function turnToward(turret, target, dt) {
  const desired = Math.atan2(target.y - turret.y, target.x - turret.x);
  const diff = Math.atan2(Math.sin(desired - turret.angle), Math.cos(desired - turret.angle));
  const maxTurn = C.TURRET_TURN_SPEED * dt;
  turret.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
}

function isUpgrading(game, turret) {
  return game.action.state === ActionState.UPGRADING && game.action.target === turret.slotIndex;
}

export function updateTurrets(game, dt) {
  for (const turret of game.turrets) {
    turret.cooldown -= dt;
    // No firing while being upgraded (§11.2). It stays ready, so a cancel resumes firing immediately.
    if (isUpgrading(game, turret)) {
      turret.cooldown = Math.max(0, turret.cooldown);
      turret.targetId = null;
      continue;
    }
    const target = selectTarget(game, turret);
    turret.targetId = target ? target.id : null;
    if (!target) {
      turret.cooldown = Math.max(0, turret.cooldown); // stays ready while there is no target
      continue;
    }

    turnToward(turret, target, dt);
    if (turret.cooldown > 0) continue;
    game.projectiles.push(createProjectile(game.nextEntityId++, turretMuzzle(turret), target.id, turretDamage(turret)));
    turret.cooldown += turretFireInterval(turret); // carry the remainder so the rate is exact
  }
}

// ---------------------------------------------------------------------------
// Pebbles (§10.3): homing; vanish without damage if the target died first.
// ---------------------------------------------------------------------------
export function updateProjectiles(game, dt) {
  const step = C.PROJECTILE_SPEED * dt;
  const remaining = [];
  for (const p of game.projectiles) {
    const target = game.wolves.find((w) => w.id === p.targetId);
    if (!target) continue; // target gone: pebble disappears

    const tx = target.x;
    const ty = target.y - C.WOLF_HIT_HEIGHT;
    const dist = Math.hypot(tx - p.x, ty - p.y);
    if (dist <= step) {
      damageWolf(game, target, p.damage);
      continue;
    }
    p.dirX = (tx - p.x) / dist;
    p.dirY = (ty - p.y) / dist;
    p.x += p.dirX * step;
    p.y += p.dirY * step;
    remaining.push(p);
  }
  game.projectiles = remaining;
}

export function damageWolf(game, wolf, damage) {
  wolf.hp -= damage;
  wolf.lastHitTime = game.combatTime;
  if (wolf.hp <= 0) killWolf(game, wolf);
}

// ---------------------------------------------------------------------------
// Wolves biting the Druid (§12.5)
// ---------------------------------------------------------------------------
export function updateMelee(game, dt) {
  for (const wolf of game.wolves) {
    if (wolf.state !== WolfState.BITING) continue;
    if (wolf.blockedBy !== null) continue; // biting a Vulture instead; Druid bites pause
    wolf.biteTimer += dt;
    if (wolf.biteTimer >= C.WOLF_ATTACK_INTERVAL) {
      wolf.biteTimer -= C.WOLF_ATTACK_INTERVAL;
      wolf.bites++;
      wolf.lastBiteTime = game.combatTime;
      game.druidHp = Math.max(0, game.druidHp - C.WOLF_DAMAGE);
      game.druidLastHitTime = game.combatTime;
    }
  }
}

// Remove a wolf immediately and release its melee slot (§12.5, §13).
export function killWolf(game, wolf) {
  const i = game.wolves.indexOf(wolf);
  if (i === -1) return;
  game.wolves.splice(i, 1);
  if (wolf.slot !== null) game.meleeSlots[wolf.slot].wolfId = null;
  game.wolvesAlive--;
  game.wolvesKilled++;
}
