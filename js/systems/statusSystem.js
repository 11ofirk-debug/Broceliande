// Timed enemy statuses (M2k §3.4). Each status lives on enemy.statuses until its `until` (combat
// time) passes. Applying one again refreshes it rather than stacking. For now there is one,
// slowed: { until, mult } — the enemy moves at mult × its speed (see enemySpeed in enemy.js).

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

// Removes statuses whose time is up.
export function updateStatuses(game) {
  for (const enemy of game.enemies) {
    for (const [name, status] of Object.entries(enemy.statuses)) {
      if (game.combatTime >= status.until) delete enemy.statuses[name];
    }
  }
}
