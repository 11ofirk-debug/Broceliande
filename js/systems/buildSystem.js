// Building turrets of a type on slots (spec §9.3, M1f §5.2) and upgrading them one level at a
// time (§11.2, M1e §4.3). The Druid's Prep builds pay on completion (completeBuild); Bough
// Double jobs in Combat pay up front (M1i §2.6) and then only place or raise the turret.

import { canAfford, deduct } from '../resources.js';
import { createTurret, buildCost, nextLevelStats } from '../entities/turret.js';
import { events } from '../events.js';

export function turretOnSlot(game, slotIndex) {
  return game.turrets.find((t) => t.slotIndex === slotIndex) ?? null;
}

// Prep build completion: deduct and place a turret of that type. If resources are somehow
// short now, the build fails with no effect (§7.5).
export function completeBuild(game, slotIndex, type) {
  if (turretOnSlot(game, slotIndex)) return;
  const cost = buildCost(type);
  if (!canAfford(game.resources, cost)) {
    console.warn(`Build on slot ${slotIndex} failed: resources no longer sufficient`);
    return;
  }
  deduct(game.resources, cost);
  placeTurret(game, slotIndex, type);
}

// A turret of that type appears on the slot (already paid for).
export function placeTurret(game, slotIndex, type) {
  if (turretOnSlot(game, slotIndex)) return false;
  game.turrets.push(createTurret(game.nextEntityId++, slotIndex, game.slots[slotIndex], type));
  events.emit('turretBuilt', { slotIndex, type });
  return true;
}

// The turret on the slot goes up one level (already paid for). No effect at max level.
export function raiseTurretLevel(game, slotIndex) {
  const turret = turretOnSlot(game, slotIndex);
  if (!turret || !nextLevelStats(turret)) return false;
  turret.level++;
  events.emit('upgradeCompleted', { slotIndex, level: turret.level });
  return true;
}
