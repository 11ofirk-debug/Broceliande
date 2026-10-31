// Timed enemy statuses (M2k §3.4). Each status lives on enemy.statuses until its `until` (combat
// time) passes. Applying one again refreshes it rather than stacking. Two so far:
//   slowed:   { until, mult } — the enemy moves at mult × its speed (see enemySpeed in enemy.js)
//   corroded: { until, mult } — it takes mult × damage from every source, before armor (M2m §2.4)

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

// Removes statuses whose time is up.
export function updateStatuses(game) {
  for (const enemy of game.enemies) {
    for (const [name, status] of Object.entries(enemy.statuses)) {
      if (game.combatTime >= status.until) delete enemy.statuses[name];
    }
  }
}
