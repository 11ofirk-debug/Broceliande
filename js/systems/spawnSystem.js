// Wave spawning (spec §14): per-lane bursts from config, wolves in a burst staggered
// by BURST_STAGGER. A spawn whose entry point is blocked is delayed until clear.

import * as C from '../config.js';
import { createWolf, laneWorldPos, MAX_WOLF_OFFSET } from '../entities/wolf.js';
import { findBlocker } from './collisionSystem.js';

// One queue of spawn times per lane, built at encounter start.
export function buildSpawnQueues(lanes) {
  return lanes.map((lane) => {
    const times = [];
    for (const burst of C.WAVE[lane.id] ?? []) {
      for (let k = 0; k < burst.count; k++) times.push(burst.time + k * C.BURST_STAGGER);
    }
    times.sort((a, b) => a - b);
    return { lane, times };
  });
}

export function updateSpawning(game) {
  for (const queue of game.spawnQueues) {
    while (queue.times.length > 0 && queue.times[0] <= game.combatTime) {
      if (!trySpawn(game, queue.lane)) break; // blocked: retry next step
      queue.times.shift();
    }
  }
}

function trySpawn(game, lane) {
  const offset = game.rng.range(-MAX_WOLF_OFFSET, MAX_WOLF_OFFSET);
  const pos = laneWorldPos(lane, 0, offset);
  if (findBlocker(game.wolves, null, pos.x, pos.y)) return false;
  game.wolves.push(createWolf(game.nextEntityId++, lane, offset, game.rng));
  game.wolvesSpawned++;
  game.wolvesAlive++;
  return true;
}
