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

// Attack state machine of enemies whose attacks have a wind-up (ENEMY_TYPES windupTime, the Ogre,
// M2c §2.5); other enemies stay READY and use the plain bite timers.
//   READY  → counting since the last blow; winds up once the interval allows and it has a target
//   WINDUP → club raised for windupTime; the blow then lands on that target if it is still there
export const AttackState = Object.freeze({
  READY: 'READY',
  WINDUP: 'WINDUP',
});

export function enemyType(enemy) {
  return C.ENEMY_TYPES[enemy.type];
}

// Largest |offset| that keeps the enemy's collision circle inside its lane's corridor (the level's
// width, M2b §2; collision radius, M2d §3.2 — the Ogre's drawn body may overhang a little).
// Never below 0: an enemy wider than its corridor walks the centreline (M2c §2.4).
export function maxOffset(type, lane) {
  return Math.max(0, lane.corridorWidth / 2 - collisionRadiusOf(type));
}

// Collision radius of a type (M2d §3.2): its own collisionRadius, else its radius.
export function collisionRadiusOf(type) {
  return C.ENEMY_TYPES[type].collisionRadius ?? C.ENEMY_TYPES[type].radius;
}

// Whether a level's corridors are wide enough for an enemy type (M2c §2.4): 2 × radius + 2, with
// the drawn radius (M2d §3.2).
export function fitsCorridor(type, corridorWidth) {
  return corridorWidth >= 2 * C.ENEMY_TYPES[type].radius + 2;
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
    radius: t.radius,      // drawn size: drawing, HP bar, hover, Druid melee positioning
    collisionRadius: collisionRadiusOf(type), // collisions with other enemies, corridor clamping (M2d §3.2)
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
    lastStruckTime: -Infinity, // combat time of the last Squirrel strike (white flash only, M1h §3.2)
    lastBiteTime: -Infinity, // combat time of its last bite on the Druid or a summon (lunge)
    blockedBy: null,       // id of the landed Vulture (or Squirrel) holding it up (§15.4), or null
    vultureBiteTimer: 0,   // s since it started biting that blocker / last bit it
    // Wind-up attacks only (M2c §2.5): see AttackState. sinceBlow starts ready to wind up.
    attack: AttackState.READY,
    sinceBlow: t.windupTime ? t.attackInterval - t.windupTime : 0, // s since the last blow
    windupElapsed: 0,
    windupTarget: null,    // { kind: 'druid' } or { kind: 'summon', id } chosen at the wind-up
    lastBlowTime: -Infinity, // combat time of the last blow (club-down pose)
    stepTimer: 0,          // s towards the next footstep sound (stepSoundInterval)
    sideOffset: offset,    // keepSide enemies: the offset of the side it keeps to (M2d §3.3)
    stuckTimer: 0,         // s its forward movement has been blocked by one slower walking enemy (M2d §3.4)
    stuckOn: null,         // id of that enemy
    passThroughId: null,   // id of the enemy it is passing through (unstick rule), until they no longer overlap
    passTime: 0,           // s since it started passing
    passOverlapped: false, // whether they have overlapped yet
    advancing: false,      // moved forward along its lane this step
    blockerId: null,       // id of the enemy that held up its full step this step
  };
}

// Remaining lane distance (turret targeting, §12.3). Enemies off the lane count as 0.
export function remainingDistance(enemy) {
  return enemy.state === EnemyState.WALKING || enemy.state === EnemyState.WAITING
    ? enemy.lane.path.length - enemy.s
    : 0;
}
