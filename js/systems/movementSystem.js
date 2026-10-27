// Enemy movement (spec §12.3–12.5, M1e §3.4–3.5): lane-space walking with lateral offset and
// wander, side-stepping round blockers, then leaving the lane for the Druid's melee slots.
// Every proposed position is checked against all other enemies (each with its own radius),
// so enemies never overlap. Per-type values come from ENEMY_TYPES; everything else is shared.

import * as C from '../config.js';
import { EnemyState, AttackState, enemyType, maxOffset, laneWorldPos, remainingDistance } from '../entities/enemy.js';
import { findBlocker } from './collisionSystem.js';
import { events } from '../events.js';
import { stuckTime } from '../levelSettings.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const clampOffset = (enemy, o) => clamp(o, -maxOffset(enemy.type, enemy.lane), maxOffset(enemy.type, enemy.lane));

// How much wider than a wolf an enemy is. Larger enemies stand and walk round the Druid this
// much further out (M1e §3.5); for a wolf it is 0, so wolves use the original positions.
const extraRadius = (enemy) => enemy.radius - C.ENEMY_TYPES.wolf.radius;

// Wrap an angle to [−π, π].
function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function updateEnemyMovement(game, dt) {
  // Front-most enemies move first, so followers react to where leaders went this step.
  for (const enemy of game.enemies) endPassing(game, enemy, dt); // M2d §3.4
  const order = [...game.enemies].sort((a, b) => remainingDistance(a) - remainingDistance(b));
  for (const enemy of order) {
    if (enemy.blockedBy !== null) continue; // held up by a landed Vulture (§15.4)
    if (enemy.attack === AttackState.WINDUP) continue; // finishes its swing where it stands (M2c §2.5)
    if (enemy.flying) {
      moveFlyer(game, enemy, dt); // M2h §3: its own rules, over the ground enemies
      continue;
    }
    const before = { x: enemy.x, y: enemy.y };
    switch (enemy.state) {
      case EnemyState.WALKING: walk(game, enemy, dt); break;
      case EnemyState.WAITING: tryClaimSlots(game, enemy); break;
      case EnemyState.APPROACHING: approach(game, enemy, dt); break;
      case EnemyState.BITING: break; // stands still; attacking is handled by the combat system
      default: break;
    }
    footsteps(enemy, before, dt);
  }
}

// ---------------------------------------------------------------------------
// Flying enemies (M2h §3.1, §3.3). They follow their lane (s + lateral offset) like the others,
// with a quicker flutter, but never collide with ground enemies (so no queues and no unstick
// rule); flyers only ease apart from each other a little. At the lane end each picks a random
// point on STIRGE_DRUID_RING over the Druid, flies straight to it and hovers there biting, with
// no melee slots, so any number can attack at once.
// ---------------------------------------------------------------------------
function moveFlyer(game, enemy, dt) {
  if (enemy.state === EnemyState.WALKING) flyAlongLane(game, enemy, dt);
  else if (enemy.state === EnemyState.APPROACHING) flyToStand(game, enemy, dt);
  // BITING: hovers in place; the combat system handles its bites.
}

function flyAlongLane(game, enemy, dt) {
  const lane = enemy.lane;
  const max = maxOffset(enemy.type, lane);
  enemy.wanderTimer -= dt;
  if (enemy.wanderTimer <= 0) {
    enemy.wanderTarget = game.rng.range(-max, max);
    enemy.wanderTimer = game.rng.range(C.STIRGE_WANDER_INTERVAL[0], C.STIRGE_WANDER_INTERVAL[1]);
  }
  let offset = enemy.offset + clamp(enemy.wanderTarget - enemy.offset, -C.STIRGE_WANDER_SPEED * dt, C.STIRGE_WANDER_SPEED * dt);
  // Light separation from other flyers on the same lane: ease apart sideways, never blocked.
  for (const other of game.enemies) {
    if (other === enemy || !other.flying || other.lane !== lane || other.state !== EnemyState.WALKING) continue;
    if (Math.hypot(other.x - enemy.x, other.y - enemy.y) >= C.STIRGE_SEPARATION) continue;
    const away = Math.sign(offset - other.offset) || (enemy.id % 2 ? 1 : -1);
    offset += away * C.STIRGE_SEPARATION_SPEED * dt;
  }
  offset = clamp(offset, -max, max);
  const exitS = lane.path.length - C.ENEMY_SLOT_CLAIM_DISTANCE;
  const s = Math.min(enemy.s + enemyType(enemy).speed * dt, exitS);
  const p = laneWorldPos(lane, s, offset);
  if (Math.abs(p.x - enemy.x) > 0.01) enemy.facing = Math.sign(p.x - enemy.x);
  enemy.stride += Math.hypot(p.x - enemy.x, p.y - enemy.y);
  enemy.s = s;
  enemy.offset = offset;
  enemy.x = p.x;
  enemy.y = p.y;
  if (s >= exitS) {
    const d = game.scene.level.druidPos;
    const angle = game.rng.range(0, Math.PI * 2);
    enemy.stand = { x: d.x + Math.cos(angle) * C.STIRGE_DRUID_RING, y: d.y + Math.sin(angle) * C.STIRGE_DRUID_RING, angle };
    enemy.state = EnemyState.APPROACHING;
  }
}

function flyToStand(game, enemy, dt) {
  const dx = enemy.stand.x - enemy.x;
  const dy = enemy.stand.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.min(enemyType(enemy).speed * dt, dist);
  if (dist > 0) {
    if (Math.abs(dx) > 0.01) enemy.facing = Math.sign(dx);
    enemy.x += (dx / dist) * step;
    enemy.y += (dy / dist) * step;
    enemy.stride += step;
  }
  if (dist - step < 0.5) {
    enemy.state = EnemyState.BITING;
    enemy.biteTimer = 0;
    enemy.bitingSince = game.combatTime; // the Druid's strike counts it as an attacker (M1e §2.3)
    const d = game.scene.level.druidPos;
    enemy.facing = d.x >= enemy.x ? 1 : -1;
  }
}

// Heavy footsteps (M2c §2.9): a sound event every stepSoundInterval s of walking.
function footsteps(enemy, before, dt) {
  const interval = enemyType(enemy).stepSoundInterval;
  if (!interval || (enemy.x === before.x && enemy.y === before.y)) return;
  enemy.stepTimer += dt;
  if (enemy.stepTimer < interval) return;
  enemy.stepTimer -= interval;
  events.emit('enemyStep', { type: enemy.type, x: enemy.x, y: enemy.y });
}

// Move the enemy to (x, y) if nothing is in the way. Returns the blocking enemy, or null on success.
function tryMoveTo(game, enemy, x, y) {
  const blocker = findBlocker(game.enemies, enemy, x, y, enemy.collisionRadius);
  if (blocker) return blocker;
  const dx = x - enemy.x;
  if (Math.abs(dx) > 0.01) enemy.facing = Math.sign(dx);
  enemy.stride += Math.hypot(dx, y - enemy.y);
  enemy.x = x;
  enemy.y = y;
  return null;
}

function tryLaneMove(game, enemy, s, offset) {
  const pos = laneWorldPos(enemy.lane, s, offset);
  const blocker = tryMoveTo(game, enemy, pos.x, pos.y);
  if (!blocker) {
    enemy.s = s;
    enemy.offset = offset;
  }
  return blocker;
}

function updateWander(game, enemy, dt) {
  const t = enemyType(enemy);
  enemy.wanderTimer -= dt;
  if (enemy.wanderTimer <= 0) {
    // keepSide (M2d §3.3): only a little wander round the side it keeps to.
    enemy.wanderTarget = t.keepSide
      ? clampOffset(enemy, enemy.sideOffset + game.rng.range(-t.sideWander, t.sideWander))
      : game.rng.range(-maxOffset(enemy.type, enemy.lane), maxOffset(enemy.type, enemy.lane));
    enemy.wanderTimer = game.rng.range(C.ENEMY_WANDER_INTERVAL[0], C.ENEMY_WANDER_INTERVAL[1]);
  }
}

function walk(game, enemy, dt) {
  const exitS = enemy.lane.path.length - C.ENEMY_SLOT_CLAIM_DISTANCE;
  const s0 = enemy.s;
  updateWander(game, enemy, dt);

  const ds = enemyType(enemy).speed * dt;
  const drift = clamp(enemy.wanderTarget - enemy.offset, -C.ENEMY_WANDER_SPEED * dt, C.ENEMY_WANDER_SPEED * dt);
  const blocker = tryLaneMove(game, enemy, Math.min(enemy.s + ds, exitS), clampOffset(enemy, enemy.offset + drift));

  if (blocker) {
    // Side-step away from the blocker (or the other way if against the corridor edge),
    // otherwise slow down, otherwise stop and queue.
    const n = enemy.lane.path.normalAt(enemy.s);
    let dir = Math.sign(n.x * (enemy.x - blocker.x) + n.y * (enemy.y - blocker.y)) || (enemy.id % 2 ? 1 : -1);
    const step = C.ENEMY_SIDESTEP_SPEED * dt;
    if (Math.abs(enemy.offset + dir * step) > maxOffset(enemy.type, enemy.lane)) dir = -dir;
    const side = clampOffset(enemy, enemy.offset + dir * step);
    const candidates = [
      [enemy.s + ds * 0.5, side],
      [enemy.s, side],
      [enemy.s + ds * 0.5, enemy.offset],
    ];
    for (const [s, offset] of candidates) {
      if (!tryLaneMove(game, enemy, Math.min(s, exitS), offset)) {
        // Keep drifting to the side we stepped to, so it doesn't wander back into the blocker.
        if (offset === side) enemy.wanderTarget = clampOffset(enemy, side + dir * enemy.collisionRadius);
        break;
      }
    }
  }

  enemy.advancing = enemy.s > s0; // moving forward this step (the unstick rule's "walking" blocker)
  enemy.blockerId = blocker ? blocker.id : null; // what held up its full step (unstick rule)
  updateStuck(enemy, blocker, dt, stuckTime(game.scene.level));

  if (enemy.s >= exitS) {
    enemy.state = EnemyState.WAITING;
    tryClaimSlots(game, enemy);
  }
}

// Unstick rule (M2d §3.4): a walking enemy whose full forward step has been blocked for more than
// STUCK_TIME by the same slower enemy, itself walking freely (not queuing at the lane end, not
// held by a summon), passes through that one enemy until the two no longer overlap. Everything
// else still collides as normal.
// limit: the level's stuckTime (M2f §4; default STUCK_TIME).
function updateStuck(enemy, blocker, dt, limit) {
  if (enemy.passThroughId !== null) return;
  const slower = blocker
    && blocker.state === EnemyState.WALKING
    && blocker.blockedBy === null
    // actually moving (not queued behind enemies waiting for melee slots), or held up by this
    // enemy in turn (two enemies blocking each other on a bend)
    && (blocker.advancing || blocker.blockerId === enemy.id)
    && enemyType(blocker).speed < enemyType(enemy).speed;
  if (!slower) {
    // A free step lets the timer run down rather than reset it, so an enemy that creeps behind
    // its blocker (blocked on most steps, now and then a free one) still counts as held up.
    enemy.stuckTimer = Math.max(0, enemy.stuckTimer - dt * C.STUCK_DECAY_RATE);
    if (enemy.stuckTimer === 0) enemy.stuckOn = null;
    return;
  }
  if (enemy.stuckOn !== blocker.id) {
    enemy.stuckOn = blocker.id;
    enemy.stuckTimer = 0;
  }
  enemy.stuckTimer += dt;
  if (enemy.stuckTimer > limit) {
    enemy.passThroughId = blocker.id;
    enemy.passTime = 0;
    enemy.passOverlapped = false;
    enemy.stuckTimer = 0;
    enemy.stuckOn = null;
  }
}

// An enemy stops passing through another once their collision circles have overlapped and no
// longer do (it is past), or the other is gone, or it never moved into it within STUCK_TIME
// (the way cleared some other way). When the rule triggers they are only touching, so "no
// longer overlap" counts only after they first overlapped.
function endPassing(game, enemy, dt) {
  if (enemy.passThroughId === null) return;
  const other = game.enemies.find((e) => e.id === enemy.passThroughId);
  enemy.passTime += dt;
  const overlap = other && Math.hypot(other.x - enemy.x, other.y - enemy.y) < other.collisionRadius + enemy.collisionRadius - 1e-6;
  if (overlap) enemy.passOverlapped = true;
  if (!other || (!overlap && (enemy.passOverlapped || enemy.passTime > stuckTime(game.scene.level)))) {
    enemy.passThroughId = null;
  }
}

// Where an enemy holding melee slots [first, first + n) stands: the slot itself for one slot;
// for more, the midpoint angle between them, further out by its extra radius (M1e §3.5).
function standPoint(game, enemy, first, n) {
  const slots = game.meleeSlots;
  if (n === 1 && extraRadius(enemy) === 0) {
    const slot = slots[first];
    return { x: slot.x, y: slot.y, angle: slot.angle };
  }
  const angle = slots[first].angle + ((n - 1) / 2) * ((Math.PI * 2) / slots.length);
  const r = C.DRUID_MELEE_RADIUS + extraRadius(enemy);
  const home = game.scene.level.druidPos;
  return { x: home.x + Math.cos(angle) * r, y: home.y + Math.sin(angle) * r, angle };
}

// Claim the nearest group of meleeSlotsUsed adjacent free slots (§12.5, M1e §3.5). Without
// one, the enemy keeps waiting at the lane end.
function tryClaimSlots(game, enemy) {
  const slots = game.meleeSlots;
  const n = enemyType(enemy).meleeSlotsUsed;
  let best = null;
  let bestDist = Infinity;
  for (let first = 0; first < slots.length; first++) {
    const group = Array.from({ length: n }, (_, k) => (first + k) % slots.length);
    if (group.some((i) => slots[i].enemyId !== null)) continue;
    const stand = standPoint(game, enemy, first, n);
    const d = Math.hypot(stand.x - enemy.x, stand.y - enemy.y);
    if (d < bestDist) {
      bestDist = d;
      best = { group, stand };
    }
  }
  if (!best) return;
  for (const i of best.group) slots[i].enemyId = enemy.id;
  enemy.slots = best.group;
  enemy.stand = best.stand;
  enemy.state = EnemyState.APPROACHING;
}

// Steering tries: straight at the target first, then turned progressively further.
// Always trying the same side first makes two enemies meeting head-on pass each other.
const STEER_ANGLES = [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5];

// Walk to the claimed stand point (world space): straight at it when it is close in angle,
// otherwise round the Druid along the approach ring so the enemy passes outside the biters.
function approach(game, enemy, dt) {
  const stand = enemy.stand;
  const d = game.scene.level.druidPos;
  const angle = Math.atan2(enemy.y - d.y, enemy.x - d.x);
  const dAngle = wrapAngle(stand.angle - angle);

  let target = stand;
  if (Math.abs(dAngle) > C.ENEMY_DIRECT_APPROACH_ANGLE) {
    // A point a little further round the approach ring, toward the stand point.
    const a = angle + Math.sign(dAngle) * C.ENEMY_DIRECT_APPROACH_ANGLE * 0.5;
    const ring = C.DRUID_APPROACH_RADIUS + extraRadius(enemy);
    target = { x: d.x + Math.cos(a) * ring, y: d.y + Math.sin(a) * ring };
  }

  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.min(enemyType(enemy).speed * dt, dist);
  const heading = Math.atan2(dy, dx);
  const minDruidDist = C.DRUID_RADIUS + enemy.radius;
  for (const turn of STEER_ANGLES) {
    const x = enemy.x + Math.cos(heading + turn) * step;
    const y = enemy.y + Math.sin(heading + turn) * step;
    if (Math.hypot(x - d.x, y - d.y) < minDruidDist) continue; // never walk into the Druid
    if (!tryMoveTo(game, enemy, x, y)) break;
  }

  if (Math.hypot(stand.x - enemy.x, stand.y - enemy.y) < 0.5) {
    enemy.state = EnemyState.BITING;
    enemy.biteTimer = 0;
    enemy.bitingSince = game.combatTime; // Druid melee tie-break: attacking longest (M1e §2.3)
    enemy.facing = d.x >= enemy.x ? 1 : -1;
  }
}
