// Burning (M2o §2.2–2.3): the Cinderjaw's burn ticks, and Wildfire. A burning enemy takes its
// burn's tickDamage every tickInterval s until the burn runs out (statusSystem.js removes it at
// `until`); the damage is normal damage (armor, Corrosion, kills and drops all apply). A burning
// enemy that dies with a Wildfire burn (spreadRadius > 0) sets every enemy within that radius
// burning with the same burn, at full duration; it chains, since they spread in turn.

import { damageEnemy } from './combatSystem.js';
import { applyBurn } from './statusSystem.js';
import { events } from '../events.js';

const TICK_EPSILON = 1e-9;

// Runs before updateStatuses, so the last tick at or before `until` still lands.
export function updateBurns(game) {
  for (const enemy of [...game.enemies]) {
    const b = enemy.statuses.burning;
    if (!b) continue;
    while (b.nextTick <= game.combatTime + TICK_EPSILON && b.nextTick <= b.until + TICK_EPSILON && game.enemies.includes(enemy)) {
      b.nextTick += b.tickInterval;
      damageEnemy(game, enemy, b.tickDamage, `cinderjaw:burn:${b.level}`);
      events.emit('burnTick', {});
    }
  }
}

// Called by killEnemy (combatSystem.js) for every enemy that dies.
export function spreadWildfire(game, dead) {
  const b = dead.statuses.burning;
  if (!b || !(b.spreadRadius > 0)) return;
  let spread = 0;
  for (const other of game.enemies) {
    if (Math.hypot(other.x - dead.x, other.y - dead.y) > b.spreadRadius) continue;
    applyBurn(game, other, { duration: b.duration, tickInterval: b.tickInterval, tickDamage: b.tickDamage, spreadRadius: b.spreadRadius }, b.sourceTurretId, b.level);
    game.traitStats.wildfireSpreads++;
    spread++;
    game.emberJumps.push({ from: { x: dead.x, y: dead.y }, toId: other.id, to: { x: other.x, y: other.y }, age: 0 });
  }
  if (spread) events.emit('wildfireSpread', { x: dead.x, y: dead.y });
}
