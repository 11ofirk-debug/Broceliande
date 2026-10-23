// Enemy data (spec §12.3, §13; Bear M1e §3). One entity for every type; per-type stats come
// from ENEMY_TYPES. Behaviour lives in the systems.

import * as C from '../config.js';

// Explicit per-enemy state machine:
//   WALKING     → following its lane
//   WAITING     → at the lane end, no free melee slot(s) yet (queues via collision)
//   APPROACHING → left the lane, walking to its claimed melee slot(s)
//   BITING      → in place at its slot(s), attacking the Druid
export const EnemyState = Object.freeze({
  WALKING: 'WALKING',
  WAITING: 'WAITING',
  APPROACHING: 'APPROACHING',
  BITING: 'BITING',
});

export function enemyType(enemy) {
  return C.ENEMY_TYPES[enemy.type];
}

// Largest |offset| that keeps the whole enemy inside its corridor.
export function maxOffset(type) {
  return C.CORRIDOR_WIDTH / 2 - C.ENEMY_TYPES[type].radius;
}

export function laneWorldPos(lane, s, offset) {
  const p = lane.path.pointAt(s);
  const n = lane.path.normalAt(s);
  return { x: p.x + n.x * offset, y: p.y + n.y * offset };
}

export function createEnemy(id, type, lane, offset, rng) {
  const t = C.ENEMY_TYPES[type];
  const pos = laneWorldPos(lane, 0, offset);
  return {
    id,
    type,
    radius: t.radius,
    lane,
    state: EnemyState.WALKING,
    s: 0,                  // distance along the lane
    offset,                // lateral offset from the centreline, along the normal
    wanderTarget: offset,
    wanderTimer: rng.range(C.ENEMY_WANDER_INTERVAL[0], C.ENEMY_WANDER_INTERVAL[1]),
    x: pos.x,
    y: pos.y,
    hp: t.hp,
    slots: [],             // claimed Druid melee slot indices (meleeSlotsUsed of them, adjacent)
    stand: null,           // where it stands while attacking the Druid { x, y, angle }
    biteTimer: 0,          // s since the last bite (or since reaching its slot)
    bites: 0,
    bitingSince: Infinity, // combat time it started biting the Druid (M1e §2.3)
    facing: 1,             // +1 right, −1 left (side-view drawing)
    stride: 0,             // distance walked, drives the leg animation
    lastHitTime: -Infinity, // combat time of the last pebble hit (hit flash)
    lastKnockTime: -Infinity, // combat time of the last Druid strike (visual knock-back, M1f §4)
    knockDir: null,        // unit direction of that knock-back
    lastBiteTime: -Infinity, // combat time of its last bite on the Druid or a summon (lunge)
    blockedBy: null,       // id of the landed Vulture (or Squirrel) holding it up (§15.4), or null
    vultureBiteTimer: 0,   // s since it started biting that blocker / last bit it
  };
}

// Remaining lane distance (turret targeting, §12.3). Enemies off the lane count as 0.
export function remainingDistance(enemy) {
  return enemy.state === EnemyState.WALKING || enemy.state === EnemyState.WAITING
    ? enemy.lane.path.length - enemy.s
    : 0;
}
