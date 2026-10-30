// Timed enemy statuses (M2k §3.4). Each status lives on enemy.statuses until its `until` (combat
// time) passes. Applying one again refreshes it rather than stacking. For now there is one,
// slowed: { until, mult } — the enemy moves at mult × its speed (see enemySpeed in enemy.js).

// Slows an enemy for `duration` s from now; already slowed: the duration restarts.
export function applySlow(game, enemy, mult, duration) {
  enemy.statuses.slowed = { until: game.combatTime + duration, mult };
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
