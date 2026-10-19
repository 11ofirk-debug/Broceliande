// Building turrets on slots (spec §9.3) and upgrading them (§11.2). Costs are deducted on completion.

import * as C from '../config.js';
import { canAfford, deduct } from '../resources.js';
import { createTurret } from '../entities/turret.js';

export function turretOnSlot(game, slotIndex) {
  return game.turrets.find((t) => t.slotIndex === slotIndex) ?? null;
}

// On completion: deduct and place the turret. If resources are somehow short now,
// the build fails with no effect (§7.5).
export function completeBuild(game, slotIndex) {
  if (turretOnSlot(game, slotIndex)) return;
  if (!canAfford(game.resources, C.TURRET_COST)) {
    console.warn(`Build on slot ${slotIndex} failed: resources no longer sufficient`);
    return;
  }
  deduct(game.resources, C.TURRET_COST);
  game.turrets.push(createTurret(game.nextEntityId++, slotIndex, C.TURRET_SLOTS[slotIndex]));
}

// Upgrade completion (§11.2): deduct, then apply the upgraded stats. Fails with no
// effect if resources are somehow short now (§7.5).
export function completeUpgrade(game, slotIndex) {
  const turret = turretOnSlot(game, slotIndex);
  if (!turret || turret.upgraded) return;
  if (!canAfford(game.resources, C.UPGRADE_COST)) {
    console.warn(`Upgrade on slot ${slotIndex} failed: resources no longer sufficient`);
    return;
  }
  deduct(game.resources, C.UPGRADE_COST);
  turret.upgraded = true;
}
