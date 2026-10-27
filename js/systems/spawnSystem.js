// Wave spawning (M2i §2, after spec §14 and M1e §3.6): each wave's spawns, per lane, on that
// wave's own clock (game.waveTime); an entry with count > 1 is staggered by its type's
// burstStagger (BURST_STAGGER by default). A spawn whose entry point is blocked is delayed
// until clear.

import * as C from '../config.js';
import { createEnemy, laneWorldPos, maxOffset, collisionRadiusOf } from '../entities/enemy.js';
import { findBlocker } from './collisionSystem.js';
import { levelWaves } from '../levelSettings.js';
import { events } from '../events.js';

function shuffle(rng, items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Lanes for n 'random' entries of one type in a wave (M2a §5.4 for Bears, M2i §2): spread as
// evenly as possible with the seeded RNG. Every lane gets one while there are entries to go
// round, the extras go to random different lanes (then round again), and the result is shuffled.
function spreadLanes(rng, n, laneIds) {
  const lanes = [];
  while (n - lanes.length >= laneIds.length) lanes.push(...laneIds);
  const extra = n - lanes.length;
  if (extra > 0) lanes.push(...shuffle(rng, laneIds).slice(0, extra));
  return shuffle(rng, lanes);
}

// One plan per wave, built at encounter start (so the seeded lanes don't depend on play): per
// lane, its queue of spawns { time, type, first } in wave time. first: the first of its entry
// (a Stirge flock's sound plays once).
export function buildWavePlans(level, lanes, rng) {
  const laneIds = lanes.map((l) => l.id);
  return levelWaves(level).map((wave) => {
    const entries = wave.spawns.map((s) => ({ ...s }));
    const types = [...new Set(entries.filter((e) => e.lane === 'random').map((e) => e.type))];
    for (const type of types) {
      const random = entries.filter((e) => e.lane === 'random' && e.type === type);
      spreadLanes(rng, random.length, laneIds).forEach((laneId, i) => { random[i].lane = laneId; });
    }
    return lanes.map((lane) => {
      const spawns = [];
      for (const e of entries.filter((x) => x.lane === lane.id)) {
        const stagger = C.ENEMY_TYPES[e.type].burstStagger ?? C.BURST_STAGGER;
        for (let k = 0; k < e.count; k++) spawns.push({ time: e.t + k * stagger, type: e.type, first: k === 0 });
      }
      spawns.sort((a, b) => a.time - b.time);
      return { lane, spawns };
    });
  });
}

export function updateSpawning(game) {
  for (const queue of game.spawnQueues) {
    while (queue.spawns.length > 0 && queue.spawns[0].time <= game.waveTime) {
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
  if (game.wave) game.wave.spawned++; // this wave's figures (M2i §7)
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
  for (let k = 0; k < count; k++) queue.spawns.push({ time: game.waveTime + k * stagger, type, first: k === 0 });
  queue.spawns.sort((a, b) => a.time - b.time); // stable: wave spawns already due keep their order
  return queue.lane;
}
