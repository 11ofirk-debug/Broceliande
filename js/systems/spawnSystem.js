// Wave spawning (spec §14, M1e §3.6): per-lane typed bursts from config, enemies in a burst
// staggered by BURST_STAGGER. A spawn whose entry point is blocked is delayed until clear.

import * as C from '../config.js';
import { createEnemy, laneWorldPos, maxOffset } from '../entities/enemy.js';
import { findBlocker } from './collisionSystem.js';

// Seeded shuffle of the Bears' lanes (M1e §3.6): each Bear burst keeps its time but is moved
// to a lane from a shuffled list of the lanes the Bears were written on, so with one Bear per
// lane in config there is still one per lane. Returns a laneId → laneId map per burst.
function bearLanes(rng, bursts) {
  const lanes = bursts.map((b) => b.lane);
  if (C.RANDOMISE_BEAR_LANES) {
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }
  }
  return lanes;
}

// One queue of spawns { time, type } per lane, built at encounter start.
export function buildSpawnQueues(lanes, rng) {
  const bursts = [];
  for (const lane of lanes) {
    for (const burst of C.WAVE[lane.id] ?? []) bursts.push({ ...burst, type: burst.type ?? 'wolf', lane: lane.id });
  }
  const bears = bursts.filter((b) => b.type === 'bear');
  bearLanes(rng, bears).forEach((laneId, i) => { bears[i].lane = laneId; });

  return lanes.map((lane) => {
    const spawns = [];
    for (const burst of bursts.filter((b) => b.lane === lane.id)) {
      for (let k = 0; k < burst.count; k++) spawns.push({ time: burst.time + k * C.BURST_STAGGER, type: burst.type });
    }
    spawns.sort((a, b) => a.time - b.time);
    return { lane, spawns };
  });
}

export function updateSpawning(game) {
  for (const queue of game.spawnQueues) {
    while (queue.spawns.length > 0 && queue.spawns[0].time <= game.combatTime) {
      if (!trySpawn(game, queue.lane, queue.spawns[0].type)) break; // blocked: retry next step
      queue.spawns.shift();
    }
  }
}

function trySpawn(game, lane, type) {
  const offset = game.rng.range(-maxOffset(type), maxOffset(type));
  const pos = laneWorldPos(lane, 0, offset);
  if (findBlocker(game.enemies, null, pos.x, pos.y, C.ENEMY_TYPES[type].radius)) return false;
  game.enemies.push(createEnemy(game.nextEntityId++, type, lane, offset, game.rng));
  game.enemyCounts[type].spawned++;
  game.enemyCounts[type].alive++;
  return true;
}

// Debug key B (M1e §6): queue one Bear at the start of a random lane, now. It spawns as soon
// as the entry point is clear. Uses the seeded RNG.
export function queueDebugBear(game) {
  const queue = game.spawnQueues[game.rng.int(0, game.spawnQueues.length - 1)];
  queue.spawns.unshift({ time: game.combatTime, type: 'bear' });
  return queue.lane;
}
