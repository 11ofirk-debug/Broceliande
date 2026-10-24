// Enemy drops (M1d §1, M1e §3.3): resource items left where enemies die, rolled from each
// type's drop table. They stay on the field until a Squirrel collects them (squirrelSystem.js)
// or the encounter ends.

import * as C from '../config.js';
import { laneWorldPos, enemyType } from '../entities/enemy.js';
import { emptyResources } from '../resources.js';

// Furthest an item's centre may sit from its lane's centreline, so everything drawn for it
// (icon, bob and glow, which reaches 0.6 × icon size; see drawDrop) stays inside the corridor (§1.2).
const MAX_DROP_OFFSET = C.CORRIDOR_WIDTH / 2 - C.RESOURCE_ICON_SIZE * C.DROP_ICON_SCALE * 0.6;

export function emptyDropStats() {
  return { dropped: emptyResources(), collected: emptyResources() };
}

// Roll each resource independently with the seeded RNG (§1.1). Chances are multiplied by the
// debug drop multiplier (key X), capped at certainty. Returns one resource key per unit.
function rollDrops(game, table) {
  const units = [];
  for (const { resource, chance, min, max } of table) {
    if (game.rng.next() >= Math.min(1, chance * game.dropMult)) continue;
    const amount = game.rng.int(min, max);
    for (let i = 0; i < amount; i++) units.push(resource);
  }
  return units;
}

const SEARCH_STEP = 2; // px along the lane when looking for the next item position

// The death point in lane coordinates { s, offset }, with the offset clamped so items stay
// inside the corridor. An enemy that died off its lane (attacking the Druid) maps onto the nearest
// point of its lane, which is near the lane end, i.e. near the Druid (§1.2).
function laneAnchor(lane, p) {
  const q = lane.path.closestPoint(p);
  const n = lane.path.normalAt(q.s);
  const offset = (p.x - q.x) * n.x + (p.y - q.y) * n.y;
  return { s: q.s, offset: Math.max(-MAX_DROP_OFFSET, Math.min(MAX_DROP_OFFSET, offset)) };
}

// Next position along the lane (dir ±1) at the same offset that is at least DROP_SPACING from
// `from`, or null if the lane ends first.
function nextAlong(lane, offset, from, dir) {
  for (let s = from.s + dir * SEARCH_STEP; s >= 0 && s <= lane.path.length; s += dir * SEARCH_STEP) {
    const p = laneWorldPos(lane, s, offset);
    if (Math.hypot(p.x - from.p.x, p.y - from.p.y) >= C.DROP_SPACING) return { s, p };
  }
  return null;
}

// n positions in a short row centred on the anchor, following the lane at a fixed offset so
// every item is inside the corridor, each DROP_SPACING from its neighbour even on bends.
function rowPositions(lane, anchor, n) {
  const first = { s: anchor.s, p: laneWorldPos(lane, anchor.s, anchor.offset) };
  const out = [first.p];
  const ends = { 1: first, [-1]: first };
  let dir = 1;
  while (out.length < n) {
    const next = nextAlong(lane, anchor.offset, ends[dir], dir) ?? nextAlong(lane, anchor.offset, ends[-dir], -dir);
    if (!next) break; // cannot happen on a real lane: far longer than a few items
    const used = next.s > anchor.s ? 1 : -1;
    ends[used] = next;
    out.push(next.p);
    dir = -dir;
  }
  return out;
}

// Called when an enemy dies. Each unit becomes its own item (§1.2), in a short row along the
// lane centred on the death point.
// Items pop out of the death point and arc to their resting spot (M1g §1): (x, y) is where the
// item comes to rest; (fromX, fromY) where it was launched from. They launch DROP_POP_STAGGER
// apart in the order rolled, and only count as on the ground (for Squirrels) once landed.
export function dropLoot(game, enemy) {
  const units = rollDrops(game, enemyType(enemy).drops);
  if (units.length === 0) return;
  const anchor = laneAnchor(enemy.lane, enemy);
  if (units.length === 1) {
    // A lone item lands a few px along the lane, so it still visibly arcs (seeded).
    const shift = game.rng.range(C.DROP_SINGLE_OFFSET[0], C.DROP_SINGLE_OFFSET[1]) * (game.rng.next() < 0.5 ? -1 : 1);
    anchor.s = Math.max(0, Math.min(enemy.lane.path.length, anchor.s + shift));
  }
  const positions = rowPositions(enemy.lane, anchor, units.length);
  units.forEach((resource, i) => {
    const p = positions[i];
    game.drops.push({
      id: game.nextEntityId++, resource, x: p.x, y: p.y, lane: enemy.lane.id, claimedBy: null,
      fromX: enemy.x, fromY: enemy.y, delay: i * C.DROP_POP_STAGGER, age: 0,
    });
    game.dropStats.dropped[resource]++;
  });
}

// Whether a drop has finished its pop and lies on the ground (M1g §1.3).
export function isLanded(drop) {
  return drop.age >= drop.delay + C.DROP_POP_TIME;
}

// Drops age in simulation time during Combat only, so they respect pause and speed and freeze
// in the air during ENDING (M1g §1.3).
export function updateDrops(game, dt) {
  for (const drop of game.drops) drop.age += dt;
}

// Debug key X (§3): drop chances ×1 ↔ ×DEBUG_DROP_MULT. Kept across restarts.
export function toggleDropMult(game) {
  game.dropMult = game.dropMult === 1 ? C.DEBUG_DROP_MULT : 1;
}
