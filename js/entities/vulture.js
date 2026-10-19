// Vulture ally data (spec §15). Behaviour lives in the vulture system.

import * as C from '../config.js';

// Explicit per-Vulture state machine (§15.3):
//   FLYING   → heading for its target in a straight line; collides with nothing
//   LANDED   → within melee range of its target: pecks it and blocks nearby wolves
//   HOVERING → no living wolves; waits in place
export const VultureState = Object.freeze({
  FLYING: 'FLYING',
  LANDED: 'LANDED',
  HOVERING: 'HOVERING',
});

export function createVulture(id, x, y) {
  return {
    id,
    x,
    y,
    hp: C.VULTURE_HP,
    state: VultureState.HOVERING, // picks a target on its first update
    targetId: null,
    remaining: C.VULTURE_DURATION, // s left before it expires
    attackTimer: 0,                // s since landing / last peck
    lastHitTime: -Infinity,        // combat time it was last bitten (hit flash)
    lastPeckTime: -Infinity,       // combat time of its last peck (animation)
    facing: 1,
  };
}
