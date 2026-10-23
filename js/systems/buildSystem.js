// Building turrets of a type on slots (spec §9.3, M1f §5.2) and upgrading them one level at a
// time (§11.2, M1e §4.3). Costs are deducted on completion.

import { canAfford, deduct } from '../resources.js';
import { createTurret, buildCost, nextLevelStats } from '../entities/turret.js';

export function turretOnSlot(game, slotIndex) {
  return game.turrets.find((t) => t.slotIndex === slotIndex) ?? null;
}

// On completion: deduct and place a turret of that type. If resources are somehow short now,
// the build fails with no effect (§7.5).
export function completeBuild(game, slotIndex, type) {
  if (turretOnSlot(game, slotIndex)) return;
  const cost = buildCost(type);
  if (!canAfford(game.resources, cost)) {
    console.warn(`Build on slot ${slotIndex} failed: resources no longer sufficient`);
    return;
  }
  deduct(game.resources, cost);
  game.turrets.push(createTurret(game.nextEntityId++, slotIndex, game.slots[slotIndex], type));
}

// Upgrade completion: deduct the next level's cost, then go up one level. Fails with no
// effect if resources are somehow short now (§7.5) or the turret is already at max level.
export function completeUpgrade(game, slotIndex) {
  const turret = turretOnSlot(game, slotIndex);
  const next = turret && nextLevelStats(turret);
  if (!next) return;
  if (!canAfford(game.resources, next.cost)) {
    console.warn(`Upgrade on slot ${slotIndex} failed: resources no longer sufficient`);
    return;
  }
  deduct(game.resources, next.cost);
  turret.level++;
}
