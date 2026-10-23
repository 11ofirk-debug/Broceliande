// Squirrel ally data (M1d §2). Behaviour lives in the squirrel system.

import * as C from '../config.js';

// Explicit per-Squirrel state machine (§2.3):
//   MOVING  → running in a straight line to its claimed drop; collects it on contact
//   WAITING → no unclaimed drop on the field; waits in place (and, with
//             SQUIRREL_BLOCKS_WOLVES, blocks wolves like a landed Vulture)
export const SquirrelState = Object.freeze({
  MOVING: 'MOVING',
  WAITING: 'WAITING',
});

export function createSquirrel(id, x, y) {
  return {
    id,
    x,
    y,
    hp: C.SQUIRREL_HP,
    state: SquirrelState.WAITING, // picks a target on its first update
    targetId: null,               // id of the claimed drop
    remaining: C.SQUIRREL_DURATION, // s left before it expires
    lastHitTime: -Infinity,       // combat time it was last bitten (hit flash)
    facing: 1,
    stride: 0,                    // distance run, drives the hop animation
  };
}
