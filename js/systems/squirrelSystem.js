// Squirrels (M1d §2.3): claim the nearest unclaimed drop, run to it in a straight line,
// collect it on contact, move on; wait when there is nothing to collect; expire.

import * as C from '../config.js';
import { SquirrelState } from '../entities/squirrel.js';
import { add, resourceName } from '../resources.js';
import { addFloatingText } from '../effects.js';

function nearestUnclaimedDrop(game, s) {
  let best = null;
  let bestDist = Infinity;
  for (const drop of game.drops) {
    if (drop.claimedBy !== null) continue;
    const d = Math.hypot(drop.x - s.x, drop.y - s.y);
    if (d < bestDist) {
      bestDist = d;
      best = drop;
    }
  }
  return best;
}

// Claim the nearest unclaimed drop, or wait if there is none.
function retarget(game, s) {
  const drop = nearestUnclaimedDrop(game, s);
  s.targetId = drop ? drop.id : null;
  s.state = drop ? SquirrelState.MOVING : SquirrelState.WAITING;
  if (drop) drop.claimedBy = s.id;
  return drop;
}

// §1.4: resource into the inventory immediately, item removed, floating "+1 Feather".
function collect(game, s, drop) {
  add(game.resources, { [drop.resource]: 1 });
  game.dropStats.collected[drop.resource]++;
  game.drops = game.drops.filter((d) => d !== drop);
  addFloatingText(game, `+1 ${resourceName(drop.resource, 1)}`, drop.x, drop.y - 14, true);
  s.targetId = null;
}

export function updateSquirrels(game, dt) {
  for (const s of game.squirrels) {
    let target = game.drops.find((d) => d.id === s.targetId) ?? null;
    if (!target) target = retarget(game, s); // also resumes a waiting Squirrel when a drop appears
    if (!target) continue;

    const dx = target.x - s.x;
    const dy = target.y - s.y;
    const dist = Math.hypot(dx, dy);
    if (dist > C.SQUIRREL_PICKUP_RANGE) {
      const step = Math.min(C.SQUIRREL_SPEED * dt, dist);
      s.x += (dx / dist) * step;
      s.y += (dy / dist) * step;
      s.stride += step;
      if (Math.abs(dx) > 0.5) s.facing = Math.sign(dx);
    }
    if (Math.hypot(target.x - s.x, target.y - s.y) <= C.SQUIRREL_PICKUP_RANGE) {
      collect(game, s, target);
      retarget(game, s); // next nearest unclaimed drop, or wait
    }
  }
}

// Blockers wolves stop for (§2.4): with SQUIRREL_BLOCKS_WOLVES, Squirrels that are not moving.
export function blockingSquirrels(game) {
  if (!C.SQUIRREL_BLOCKS_WOLVES) return [];
  return game.squirrels.filter((s) => s.state === SquirrelState.WAITING);
}

// Expire at 0 HP or when the duration runs out, releasing any claimed drop (§2.3).
export function expireSquirrels(game, dt) {
  for (const s of game.squirrels) s.remaining -= dt;
  const gone = game.squirrels.filter((s) => s.hp <= 0 || s.remaining <= 0);
  if (gone.length === 0) return;
  for (const s of gone) {
    const drop = game.drops.find((d) => d.id === s.targetId);
    if (drop) drop.claimedBy = null;
  }
  game.squirrels = game.squirrels.filter((s) => !gone.includes(s));
}
