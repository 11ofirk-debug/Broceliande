// Enemy movement (spec §12.3–12.5, M1e §3.4–3.5): lane-space walking with lateral offset and
// wander, side-stepping round blockers, then leaving the lane for the Druid's melee slots.
// Every proposed position is checked against all other enemies (each with its own radius),
// so enemies never overlap. Per-type values come from ENEMY_TYPES; everything else is shared.

import * as C from '../config.js';
import { EnemyState, enemyType, maxOffset, laneWorldPos, remainingDistance } from '../entities/enemy.js';
import { findBlocker } from './collisionSystem.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const clampOffset = (enemy, o) => clamp(o, -maxOffset(enemy.type), maxOffset(enemy.type));

// How much wider than a wolf an enemy is. Larger enemies stand and walk round the Druid this
// much further out (M1e §3.5); for a wolf it is 0, so wolves use the original positions.
const extraRadius = (enemy) => enemy.radius - C.ENEMY_TYPES.wolf.radius;

// Wrap an angle to [−π, π].
function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function updateEnemyMovement(game, dt) {
  // Front-most enemies move first, so followers react to where leaders went this step.
  const order = [...game.enemies].sort((a, b) => remainingDistance(a) - remainingDistance(b));
  for (const enemy of order) {
    if (enemy.blockedBy !== null) continue; // held up by a landed Vulture (§15.4)
    switch (enemy.state) {
      case EnemyState.WALKING: walk(game, enemy, dt); break;
      case EnemyState.WAITING: tryClaimSlots(game, enemy); break;
      case EnemyState.APPROACHING: approach(game, enemy, dt); break;
      case EnemyState.BITING: break; // stands still; attacking is handled by the combat system
      default: break;
    }
  }
}

// Move the enemy to (x, y) if nothing is in the way. Returns the blocking enemy, or null on success.
function tryMoveTo(game, enemy, x, y) {
  const blocker = findBlocker(game.enemies, enemy, x, y, enemy.radius);
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
  enemy.wanderTimer -= dt;
  if (enemy.wanderTimer <= 0) {
    enemy.wanderTarget = game.rng.range(-maxOffset(enemy.type), maxOffset(enemy.type));
    enemy.wanderTimer = game.rng.range(C.ENEMY_WANDER_INTERVAL[0], C.ENEMY_WANDER_INTERVAL[1]);
  }
}

function walk(game, enemy, dt) {
  const exitS = enemy.lane.path.length - C.ENEMY_SLOT_CLAIM_DISTANCE;
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
    if (Math.abs(enemy.offset + dir * step) > maxOffset(enemy.type)) dir = -dir;
    const side = clampOffset(enemy, enemy.offset + dir * step);
    const candidates = [
      [enemy.s + ds * 0.5, side],
      [enemy.s, side],
      [enemy.s + ds * 0.5, enemy.offset],
    ];
    for (const [s, offset] of candidates) {
      if (!tryLaneMove(game, enemy, Math.min(s, exitS), offset)) {
        // Keep drifting to the side we stepped to, so it doesn't wander back into the blocker.
        if (offset === side) enemy.wanderTarget = clampOffset(enemy, side + dir * enemy.radius);
        break;
      }
    }
  }

  if (enemy.s >= exitS) {
    enemy.state = EnemyState.WAITING;
    tryClaimSlots(game, enemy);
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
  return { x: C.DRUID_POS.x + Math.cos(angle) * r, y: C.DRUID_POS.y + Math.sin(angle) * r, angle };
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
  const d = C.DRUID_POS;
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
