// Demonic Wolf data (spec §12.3, §13). Behaviour lives in the systems.

import * as C from '../config.js';

// Explicit per-wolf state machine:
//   WALKING     → following its lane
//   WAITING     → at the lane end, no free melee slot yet (queues via collision)
//   APPROACHING → left the lane, walking to its claimed melee slot
//   BITING      → in its melee slot, biting the Druid
export const WolfState = Object.freeze({
  WALKING: 'WALKING',
  WAITING: 'WAITING',
  APPROACHING: 'APPROACHING',
  BITING: 'BITING',
});

// Largest |offset| that keeps the whole wolf inside its corridor.
export const MAX_WOLF_OFFSET = C.CORRIDOR_WIDTH / 2 - C.WOLF_RADIUS;

export function laneWorldPos(lane, s, offset) {
  const p = lane.path.pointAt(s);
  const n = lane.path.normalAt(s);
  return { x: p.x + n.x * offset, y: p.y + n.y * offset };
}

export function createWolf(id, lane, offset, rng) {
  const pos = laneWorldPos(lane, 0, offset);
  return {
    id,
    lane,
    state: WolfState.WALKING,
    s: 0,                  // distance along the lane
    offset,                // lateral offset from the centreline, along the normal
    wanderTarget: offset,
    wanderTimer: rng.range(C.WOLF_WANDER_INTERVAL[0], C.WOLF_WANDER_INTERVAL[1]),
    x: pos.x,
    y: pos.y,
    hp: C.WOLF_HP,
    slot: null,            // claimed Druid melee slot index
    biteTimer: 0,          // s since the last bite (or since reaching the slot)
    bites: 0,
    facing: 1,             // +1 right, −1 left (side-view drawing)
    stride: 0,             // distance walked, drives the leg animation
    lastHitTime: -Infinity, // combat time of the last pebble hit (hit flash)
    lastBiteTime: -Infinity, // combat time of its last bite on the Druid or a Vulture (lunge)
    blockedBy: null,       // id of the landed Vulture holding it up (§15.4), or null
    vultureBiteTimer: 0,   // s since it started biting that Vulture / last bit it
  };
}

// Remaining lane distance (turret targeting, §12.3). Wolves off the lane count as 0.
export function remainingDistance(wolf) {
  return wolf.state === WolfState.WALKING || wolf.state === WolfState.WAITING
    ? wolf.lane.path.length - wolf.s
    : 0;
}
