// Wave spawning (spec §14, M1e §3.6): per-lane typed bursts from the level's wave (M2a §5.1), enemies in a burst
// staggered by BURST_STAGGER, and its mini-bosses (M2c §3). A spawn whose entry point is blocked is
// delayed until clear.

import * as C from '../config.js';
import { createEnemy, laneWorldPos, maxOffset, collisionRadiusOf } from '../entities/enemy.js';
import { findBlocker } from './collisionSystem.js';
import { events } from '../events.js';

function shuffle(rng, items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Lanes for the Bear bursts (M1e §3.6, M2a §5.4), one per burst in order; each burst keeps its
// time. With RANDOMISE_BEAR_LANES, Bears are spread as evenly as possible with the seeded RNG:
// every lane gets one while there are Bears to go round, the extras go to random different
// lanes (then round again), and the result is shuffled. Otherwise the lanes as written.
function bearLanes(rng, bursts, laneIds) {
  if (!C.RANDOMISE_BEAR_LANES) return bursts.map((b) => b.lane);
  const lanes = [];
  while (bursts.length - lanes.length >= laneIds.length) lanes.push(...laneIds);
  const extra = bursts.length - lanes.length;
  if (extra > 0) lanes.push(...shuffle(rng, laneIds).slice(0, extra));
  return shuffle(rng, lanes);
}

// One queue of spawns { time, type } per lane, built at encounter start from the level's wave
// and its bosses (M2c §3: lane 'random' is picked with the seeded RNG, after the Bears' lanes).
export function buildSpawnQueues(level, lanes, rng) {
  const bursts = [];
  for (const lane of lanes) {
    for (const burst of level.wave[lane.id] ?? []) bursts.push({ ...burst, type: burst.type ?? 'wolf', lane: lane.id });
  }
  const bears = bursts.filter((b) => b.type === 'bear');
  bearLanes(rng, bears, lanes.map((l) => l.id)).forEach((laneId, i) => { bears[i].lane = laneId; });
  for (const boss of level.bosses ?? []) {
    const lane = boss.lane === 'random' ? lanes[rng.int(0, lanes.length - 1)].id : boss.lane;
    bursts.push({ time: boss.time, count: 1, type: boss.type, lane });
  }

  return lanes.map((lane) => {
    const spawns = [];
    for (const burst of bursts.filter((b) => b.lane === lane.id)) {
      // Each type may space its burst its own way (Stirge flocks, M2h §4); the first of a burst is marked
      // so a flock's sound plays once.
      const stagger = C.ENEMY_TYPES[burst.type].burstStagger ?? C.BURST_STAGGER;
      for (let k = 0; k < burst.count; k++) spawns.push({ time: burst.time + k * stagger, type: burst.type, first: k === 0 });
    }
    spawns.sort((a, b) => a.time - b.time);
    return { lane, spawns };
  });
}

export function updateSpawning(game) {
  for (const queue of game.spawnQueues) {
    while (queue.spawns.length > 0 && queue.spawns[0].time <= game.combatTime) {
      if (!trySpawn(game, queue.lane, queue.spawns[0].type, queue.spawns[0].first)) break; // blocked: retry next step
      queue.spawns.shift();
    }
  }
}

function trySpawn(game, lane, type, first = true) {
  const t = C.ENEMY_TYPES[type];
  // A keepSide enemy (the Ogre, M2d §3.3) picks a side with the seeded RNG and enters near it.
  const offset = t.keepSide
    ? (game.rng.next() < 0.5 ? -1 : 1) * Math.max(0, maxOffset(type, lane) - C.SIDE_KEEP_MARGIN)
    : game.rng.range(-maxOffset(type, lane), maxOffset(type, lane));
  const pos = laneWorldPos(lane, 0, offset);
  // Flyers (M2h §3.1) enter over anything on the ground.
  if (!t.flying && findBlocker(game.enemies, null, pos.x, pos.y, collisionRadiusOf(type))) return false;
  game.enemies.push(createEnemy(game.nextEntityId++, type, lane, offset, game.rng, game.stats['enemy.hpMult']));
  game.enemyCounts[type].spawned++;
  game.enemyCounts[type].alive++;
  // A mini-boss arrives (M2c §2.6): banner, its lane's entrance pulses red, roar (audio).
  if (t.boss) {
    game.bossAnnouncement = { text: `An ${t.name} approaches!`, age: 0 };
    game.lanePulses.push({ laneId: lane.id, age: 0 });
  }
  events.emit('enemySpawned', { type, lane: lane.id, first }); // first: of its burst (one flock sound)
  return true;
}

// Debug keys B (M1e §6), O (M2c §4) and S (M2h §6): queue `count` enemies of the type at the
// start of a random lane, from now, spaced by its burst stagger. They spawn as soon as the entry
// point is clear. Uses the seeded RNG.
export function queueDebugEnemy(game, type, count = 1) {
  const queue = game.spawnQueues[game.rng.int(0, game.spawnQueues.length - 1)];
  const stagger = C.ENEMY_TYPES[type].burstStagger ?? C.BURST_STAGGER;
  for (let k = 0; k < count; k++) queue.spawns.push({ time: game.combatTime + k * stagger, type, first: k === 0 });
  queue.spawns.sort((a, b) => a.time - b.time); // stable: wave spawns already due keep their order
  return queue.lane;
}
