// Wolf movement (spec §12.3–12.5): lane-space walking with lateral offset and wander,
// side-stepping round blockers, then leaving the lane for a Druid melee slot.
// Every proposed position is checked against all other wolves, so wolves never overlap.

import * as C from '../config.js';
import { WolfState, MAX_WOLF_OFFSET, laneWorldPos, remainingDistance } from '../entities/wolf.js';
import { findBlocker } from './collisionSystem.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const clampOffset = (o) => clamp(o, -MAX_WOLF_OFFSET, MAX_WOLF_OFFSET);

// Wrap an angle to [−π, π].
function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function updateWolfMovement(game, dt) {
  // Front-most wolves move first, so followers react to where leaders went this step.
  const order = [...game.wolves].sort((a, b) => remainingDistance(a) - remainingDistance(b));
  for (const wolf of order) {
    if (wolf.blockedBy !== null) continue; // held up by a landed Vulture (§15.4)
    switch (wolf.state) {
      case WolfState.WALKING: walk(game, wolf, dt); break;
      case WolfState.WAITING: tryClaimSlot(game, wolf); break;
      case WolfState.APPROACHING: approach(game, wolf, dt); break;
      case WolfState.BITING: break; // stands still; biting is handled by the combat system
      default: break;
    }
  }
}

// Move the wolf to (x, y) if nothing is in the way. Returns the blocking wolf, or null on success.
function tryMoveTo(game, wolf, x, y) {
  const blocker = findBlocker(game.wolves, wolf, x, y);
  if (blocker) return blocker;
  const dx = x - wolf.x;
  if (Math.abs(dx) > 0.01) wolf.facing = Math.sign(dx);
  wolf.stride += Math.hypot(dx, y - wolf.y);
  wolf.x = x;
  wolf.y = y;
  return null;
}

function tryLaneMove(game, wolf, s, offset) {
  const pos = laneWorldPos(wolf.lane, s, offset);
  const blocker = tryMoveTo(game, wolf, pos.x, pos.y);
  if (!blocker) {
    wolf.s = s;
    wolf.offset = offset;
  }
  return blocker;
}

function updateWander(game, wolf, dt) {
  wolf.wanderTimer -= dt;
  if (wolf.wanderTimer <= 0) {
    wolf.wanderTarget = game.rng.range(-MAX_WOLF_OFFSET, MAX_WOLF_OFFSET);
    wolf.wanderTimer = game.rng.range(C.WOLF_WANDER_INTERVAL[0], C.WOLF_WANDER_INTERVAL[1]);
  }
}

function walk(game, wolf, dt) {
  const exitS = wolf.lane.path.length - C.WOLF_SLOT_CLAIM_DISTANCE;
  updateWander(game, wolf, dt);

  const ds = C.WOLF_SPEED * dt;
  const drift = clamp(wolf.wanderTarget - wolf.offset, -C.WOLF_WANDER_SPEED * dt, C.WOLF_WANDER_SPEED * dt);
  const blocker = tryLaneMove(game, wolf, Math.min(wolf.s + ds, exitS), clampOffset(wolf.offset + drift));

  if (blocker) {
    // Side-step away from the blocker (or the other way if against the corridor edge),
    // otherwise slow down, otherwise stop and queue.
    const n = wolf.lane.path.normalAt(wolf.s);
    let dir = Math.sign(n.x * (wolf.x - blocker.x) + n.y * (wolf.y - blocker.y)) || (wolf.id % 2 ? 1 : -1);
    const step = C.WOLF_SIDESTEP_SPEED * dt;
    if (Math.abs(wolf.offset + dir * step) > MAX_WOLF_OFFSET) dir = -dir;
    const side = clampOffset(wolf.offset + dir * step);
    const candidates = [
      [wolf.s + ds * 0.5, side],
      [wolf.s, side],
      [wolf.s + ds * 0.5, wolf.offset],
    ];
    for (const [s, offset] of candidates) {
      if (!tryLaneMove(game, wolf, Math.min(s, exitS), offset)) {
        // Keep drifting to the side we stepped to, so the wolf doesn't wander back into the blocker.
        if (offset === side) wolf.wanderTarget = clampOffset(side + dir * C.WOLF_RADIUS);
        break;
      }
    }
  }

  if (wolf.s >= exitS) {
    wolf.state = WolfState.WAITING;
    tryClaimSlot(game, wolf);
  }
}

// Claim the nearest free melee slot (§12.5). Without one, the wolf keeps waiting.
function tryClaimSlot(game, wolf) {
  let best = null;
  let bestDist = Infinity;
  for (const slot of game.meleeSlots) {
    if (slot.wolfId !== null) continue;
    const d = Math.hypot(slot.x - wolf.x, slot.y - wolf.y);
    if (d < bestDist) {
      bestDist = d;
      best = slot;
    }
  }
  if (!best) return;
  best.wolfId = wolf.id;
  wolf.slot = best.index;
  wolf.state = WolfState.APPROACHING;
}

// Steering tries: straight at the target first, then turned progressively further.
// Always trying the same side first makes two wolves meeting head-on pass each other.
const STEER_ANGLES = [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5];

// Walk to the claimed slot (world space): straight at it when it is close in angle,
// otherwise round the Druid along the approach ring so the wolf passes outside the biters.
function approach(game, wolf, dt) {
  const slot = game.meleeSlots[wolf.slot];
  const d = C.DRUID_POS;
  const angle = Math.atan2(wolf.y - d.y, wolf.x - d.x);
  const dAngle = wrapAngle(slot.angle - angle);

  let target = slot;
  if (Math.abs(dAngle) > C.WOLF_DIRECT_APPROACH_ANGLE) {
    // A point a little further round the approach ring, toward the slot.
    const a = angle + Math.sign(dAngle) * C.WOLF_DIRECT_APPROACH_ANGLE * 0.5;
    target = { x: d.x + Math.cos(a) * C.DRUID_APPROACH_RADIUS, y: d.y + Math.sin(a) * C.DRUID_APPROACH_RADIUS };
  }

  const dx = target.x - wolf.x;
  const dy = target.y - wolf.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.min(C.WOLF_SPEED * dt, dist);
  const heading = Math.atan2(dy, dx);
  const minDruidDist = C.DRUID_RADIUS + C.WOLF_RADIUS;
  for (const turn of STEER_ANGLES) {
    const x = wolf.x + Math.cos(heading + turn) * step;
    const y = wolf.y + Math.sin(heading + turn) * step;
    if (Math.hypot(x - d.x, y - d.y) < minDruidDist) continue; // never walk into the Druid
    if (!tryMoveTo(game, wolf, x, y)) break;
  }

  if (Math.hypot(slot.x - wolf.x, slot.y - wolf.y) < 0.5) {
    wolf.state = WolfState.BITING;
    wolf.biteTimer = 0;
    wolf.facing = d.x >= wolf.x ? 1 : -1;
  }
}
