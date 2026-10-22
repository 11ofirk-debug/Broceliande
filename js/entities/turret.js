// Pebble Sprinkler data (spec §10). Behaviour lives in the combat system.

import * as C from '../config.js';

export function createTurret(id, slotIndex, slot) {
  return {
    id,
    slotIndex,
    x: slot.x,
    y: slot.y,
    upgraded: false,
    cooldown: 0,          // s until it may fire; 0 = ready, fires as soon as a target appears
    targetId: null,       // wolf currently aimed at (re-evaluated before every shot)
    angle: -Math.PI / 2,  // facing, turned toward the target at TURRET_TURN_SPEED
  };
}

export function turretRange(turret) {
  return C.TURRET_RANGE * (turret.upgraded ? C.UPGRADED_RANGE_MULT : 1);
}

export function turretDamage(turret) {
  return turret.upgraded ? C.UPGRADED_DAMAGE : C.TURRET_DAMAGE;
}

export function turretFireInterval(turret) {
  return turret.upgraded ? C.UPGRADED_FIRE_INTERVAL : C.TURRET_FIRE_INTERVAL;
}

// World point pebbles leave from: the cup at the top of the post, which stands on a pad
// TURRET_BASE_OFFSET below the location centre (M1c §2.1).
export function turretMuzzle(turret) {
  return { x: turret.x, y: turret.y + C.TURRET_BASE_OFFSET - C.TURRET_MUZZLE_HEIGHT };
}
