// Timed enemy statuses (M2k §3.4). Each status lives on enemy.statuses until its `until` (combat
// time) passes. Applying one again refreshes it rather than stacking. Three so far:
//   slowed:   { until, mult } — the enemy moves at mult × its speed (see enemySpeed in enemy.js)
//   corroded: { until, mult } — it takes mult × damage from every source, before armor (M2m §2.4)
//   burning:  { until, nextTick, tickDamage, tickInterval, spreadRadius, level, sourceTurretId } —
//             tickDamage every tickInterval s (burnSystem.js), M2o §2.2; spreadRadius > 0: Wildfire

import { enemyType } from '../entities/enemy.js';

// Slows an enemy for `duration` s from now; already slowed: the duration restarts. Its type's
// slowResist (M2l §1.3, the Grim Wolf's Dogged) ignores that fraction of the slow:
// effective mult = 1 − (1 − mult) × (1 − slowResist).
export function applySlow(game, enemy, mult, duration) {
  const resist = enemyType(enemy).slowResist ?? 0;
  enemy.statuses.slowed = { until: game.combatTime + duration, mult: 1 - (1 - mult) * (1 - resist) };
}

export function isSlowed(enemy) {
  return !!enemy.statuses.slowed;
}

// Corrodes an enemy until `linger` s from now (M2m §2.4). Level 5 Toader clouds call it every
// step for each enemy inside, so it lasts while inside and `linger` s after leaving.
export function applyCorrode(game, enemy, mult, linger) {
  enemy.statuses.corroded = { until: game.combatTime + linger, mult };
}

export function isCorroded(enemy) {
  return !!enemy.statuses.corroded;
}

// Damage taken multiplier from its statuses: Corroded's mult, else 1.
export function corrodeMult(enemy) {
  return enemy.statuses.corroded?.mult ?? 1;
}

// Sets an enemy burning (M2o §2.2) with `burn` ({ duration, tickInterval, tickDamage, spreadRadius })
// from a turret (id and level). Its first tick comes one tickInterval after it catches fire. Burned
// again while burning: the duration restarts (no stacking), and it keeps whichever burn is stronger
// (more damage per second), its next tick no later than the stronger burn's interval from now.
export function applyBurn(game, enemy, burn, turretId, level) {
  const now = game.combatTime;
  const fresh = { until: now + burn.duration, nextTick: now + burn.tickInterval, tickDamage: burn.tickDamage, tickInterval: burn.tickInterval, spreadRadius: burn.spreadRadius, level, sourceTurretId: turretId, duration: burn.duration };
  const old = enemy.statuses.burning;
  if (!old) {
    enemy.statuses.burning = fresh;
    return;
  }
  const stronger = fresh.tickDamage / fresh.tickInterval > old.tickDamage / old.tickInterval;
  const kept = stronger ? { ...fresh, nextTick: Math.min(old.nextTick, fresh.nextTick) } : { ...old, until: fresh.until };
  enemy.statuses.burning = kept;
}

export function isBurning(enemy) {
  return !!enemy.statuses.burning;
}

// Removes statuses whose time is up.
export function updateStatuses(game) {
  for (const enemy of game.enemies) {
    for (const [name, status] of Object.entries(enemy.statuses)) {
      if (game.combatTime >= status.until) delete enemy.statuses[name];
    }
  }
}
