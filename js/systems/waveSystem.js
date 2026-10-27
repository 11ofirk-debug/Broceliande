// Wave flow within Combat (M2i §3): COUNTDOWN → WAVE → GAP → WAVE → … → WAVE (last) → Victory.
// game.wave: { state: WaveState, index, remaining, cleared, spawned }
//   index:     the current wave (WAVE) or the next one (COUNTDOWN / GAP), 0-based
//   remaining: s left of the countdown or gap
//   cleared:   waves done so far (their gap started, or the last one won)
//   gapReason: what started the current gap, 'cleared' or 'timer' (debug panel)
//   lastSpawnAt: wave time of the current wave's latest spawn
//   spawned:   enemies spawned in the current wave (debug panel)
// game.waveTime counts from the start of the current wave and keeps running through its gap,
// so debug-queued enemies spawn in gaps too. Spawning, tolls and wave clears all read it.

import * as C from '../config.js';
import { GameState, WaveState } from '../states.js';
import { levelWaves } from '../levelSettings.js';
import { killEnemy } from './combatSystem.js';
import { events } from '../events.js';

export function waveCount(game) {
  return levelWaves(game.scene.level).length;
}

// Combat begins: the countdown to wave 1, with its preview.
export function startWaves(game) {
  game.wave = { state: WaveState.COUNTDOWN, index: 0, remaining: C.FIRST_WAVE_DELAY, cleared: 0, spawned: 0, gapReason: null, lastSpawnAt: 0 };
  game.waveTime = 0;
  game.spawnQueues = game.lanes.map((lane) => ({ lane, spawns: [] })); // debug spawns before wave 1
  game.tolls = [];
}

// Each Combat step, before spawning: the wave clock, and the countdown or gap running out.
export function updateWaveClock(game, dt) {
  game.waveTime += dt;
  const w = game.wave;
  if (w.state === WaveState.WAVE) return;
  w.remaining -= dt;
  if (w.remaining <= 0) beginWave(game);
}

// Each Combat step, last: once all the wave's spawns have happened, its gap starts when either
//   'cleared': no enemies are alive (from any wave), or
//   'timer':   WAVE_GAP_AFTER_LAST_SPAWN s have passed since its last spawn; enemies still alive
//              keep fighting and the next wave spawns alongside them.
// The last wave has no gap: the battle is won only once every enemy is dead (the caller enters
// ENDING). Returns true when the battle is won.
export function checkWaveCleared(game) {
  const w = game.wave;
  if (w.state !== WaveState.WAVE) return false;
  if (game.spawnQueues.some((q) => q.spawns.length > 0)) return false;
  const cleared = game.enemies.length === 0;
  const last = w.index + 1 >= waveCount(game);
  if (!cleared && (last || game.waveTime - w.lastSpawnAt < C.WAVE_GAP_AFTER_LAST_SPAWN)) return false;
  w.cleared++; // waves done (Victory overlay)
  w.gapReason = cleared ? 'cleared' : 'timer';
  if (cleared) events.emit('waveCleared', { index: w.index });
  if (last) return true;
  w.state = WaveState.GAP;
  w.remaining = levelWaves(game.scene.level)[w.index].gapAfter;
  w.index++;
  return false;
}

// Call next wave (M2i §3.2): Space or the preview's button, during COUNTDOWN or GAP only. No reward.
export function callNextWave(game) {
  if (game.state !== GameState.COMBAT || game.wave.state === WaveState.WAVE) return false;
  beginWave(game);
  return true;
}

// Debug Shift+N (M2i §7): kill every enemy and drop the rest of this wave's spawns; the wave is
// then cleared on this step and its gap begins.
export function skipWave(game) {
  if (game.state !== GameState.COMBAT || game.wave.state !== WaveState.WAVE) return;
  for (const q of game.spawnQueues) q.spawns = [];
  for (const enemy of [...game.enemies]) killEnemy(game, enemy);
}

// Enemies still to deal with: every one alive (from any wave) plus this wave's not yet spawned (HUD).
export function waveEnemiesLeft(game) {
  return game.enemies.length + game.spawnQueues.reduce((a, q) => a + q.spawns.length, 0);
}

// The wave at w.index starts on its own clock. Spawns still queued (debug enemies queued in the
// gap) carry over, due at once.
function beginWave(game) {
  const w = game.wave;
  const plan = game.wavePlans[w.index];
  game.spawnQueues = plan.map(({ lane, spawns }, i) => {
    const leftover = (game.spawnQueues[i]?.spawns ?? []).map((s) => ({ ...s, time: 0 }));
    return { lane, spawns: [...leftover, ...spawns.map((s) => ({ ...s }))] };
  });
  game.tolls = [...(levelWaves(game.scene.level)[w.index].tolls ?? [])].sort((a, b) => a - b); // M2f §4.10
  game.waveTime = 0;
  w.state = WaveState.WAVE;
  w.remaining = 0;
  w.spawned = 0;
  w.lastSpawnAt = 0;
  w.gapReason = null;
  events.emit('waveStarts', { index: w.index });
}
