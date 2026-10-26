// Squirrels (M1d §2.3): claim the nearest unclaimed drop, run to it in a straight line,
// collect it on contact, move on; wait when there is nothing to collect; expire.

import * as C from '../config.js';
import { SquirrelState } from '../entities/squirrel.js';
import { add } from '../resources.js';
import { addFloatingText, addResourceFloaters } from '../effects.js';
import { isLanded } from './dropSystem.js';
import { events } from '../events.js';
import { damageEnemy } from './combatSystem.js';

const TIMER_EPSILON = 1e-9; // s, so 2.1 s of 1/60 s steps strikes on time

function nearestUnclaimedDrop(game, s) {
  let best = null;
  let bestDist = Infinity;
  for (const drop of game.drops) {
    if (drop.claimedBy !== null || !isLanded(drop)) continue; // only landed items (M1g §1.3)
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

// §1.4: resource into the inventory immediately, item removed, a resource floater (M2d §1).
function collect(game, s, drop) {
  add(game.resources, { [drop.resource]: 1 });
  game.dropStats.collected[drop.resource]++;
  if (drop.resource === 'boughs') game.doubleStats.boughsGained++; // M1i §4 debug figure
  game.drops = game.drops.filter((d) => d !== drop);
  addResourceFloaters(game, { [drop.resource]: 1 }, drop.x, drop.y - 14); // M2d §1.3, at the item
  events.emit('resourcesGained', { resources: [drop.resource] });
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

// Counter-attack (M1h §3): a Squirrel being attacked strikes back at the attacker with the lowest
// HP (ties: lowest ID), once every SQUIRREL_ATTACK_INTERVAL. Its attackers are the enemies it is
// blocking this step (set by updateBlocking just before), so it never seeks enemies out. The
// timer counts only while it is being attacked and resets to zero when it is not.
export function updateSquirrelStrikes(game, dt) {
  for (const s of game.squirrels) {
    const attackers = game.enemies.filter((e) => e.blockedBy === s.id);
    if (attackers.length === 0) {
      s.strikeTimer = 0;
      s.strikeTargetId = null;
      continue;
    }
    const target = attackers.reduce((a, b) => (b.hp < a.hp || (b.hp === a.hp && b.id < a.id) ? b : a));
    s.strikeTargetId = target.id;
    s.strikeTimer += dt;
    if (s.strikeTimer < C.SQUIRREL_ATTACK_INTERVAL - TIMER_EPSILON) continue;
    s.strikeTimer -= C.SQUIRREL_ATTACK_INTERVAL;
    strike(game, s, target);
  }
}

// One strike: a small swipe toward the target, a white flash on it and a small "-1". Damage
// reveals its HP bar; a kill counts normally and rolls drops (damageEnemy → killEnemy).
function strike(game, s, target) {
  if (Math.abs(target.x - s.x) > 0.5) s.facing = Math.sign(target.x - s.x);
  game.swipes.push({ x1: s.x, y1: s.y, x2: target.x, y2: target.y, age: 0, small: true });
  target.lastStruckTime = game.combatTime;
  addFloatingText(game, `-${C.SQUIRREL_DAMAGE}`, target.x, target.y - target.radius * 2, true);
  events.emit('squirrelStrikes', { x: s.x, y: s.y });
  damageEnemy(game, target, C.SQUIRREL_DAMAGE, 'squirrel');
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
