// Per-level settings with global defaults (M2b §2): a level may set its own corridorWidth and
// featureMix; otherwise CORRIDOR_WIDTH and FEATURE_MIX apply. Everything that used the globals
// reads them through here.

import * as C from './config.js';

export function corridorWidth(level) {
  return level.corridorWidth ?? C.CORRIDOR_WIDTH;
}

export function featureMix(level) {
  return level.featureMix ?? C.FEATURE_MIX;
}

// M2f §4: how long an enemy waits behind a slower one before passing through it (M2d §3.4).
export function stuckTime(level) {
  return level.stuckTime ?? C.STUCK_TIME;
}

// M2i §2: the level's waves, each { gapAfter, spawns: [{ t, lane, type, count }], tolls? }.
// TEMPORARY (until rows 4–8 are migrated, M2i I2): a level still written with the old single
// schedule (wave / bosses / tolls) runs it as one wave; its Bears' lanes are 'random' (spread
// as before) when RANDOMISE_BEAR_LANES.
const legacyWaves = new WeakMap();
export function levelWaves(level) {
  if (level.waves) return level.waves;
  if (!legacyWaves.has(level)) {
    const spawns = [];
    for (const [laneId, bursts] of Object.entries(level.wave ?? {})) {
      for (const b of bursts) {
        const type = b.type ?? 'wolf';
        spawns.push({ t: b.time, lane: type === 'bear' && C.RANDOMISE_BEAR_LANES ? 'random' : laneId, type, count: b.count });
      }
    }
    for (const boss of level.bosses ?? []) spawns.push({ t: boss.time, lane: boss.lane, type: boss.type, count: 1 });
    spawns.sort((a, b) => a.t - b.t);
    legacyWaves.set(level, [{ gapAfter: 0, spawns, tolls: level.tolls ?? [] }]);
  }
  return legacyWaves.get(level);
}

// Per-type enemy totals { type: n } of one wave, or of all the level's waves.
export function waveTotals(wave) {
  const totals = {};
  for (const s of wave.spawns) totals[s.type] = (totals[s.type] ?? 0) + s.count;
  return totals;
}

export function levelTotals(level) {
  const totals = {};
  for (const wave of levelWaves(level)) {
    for (const [type, n] of Object.entries(waveTotals(wave))) totals[type] = (totals[type] ?? 0) + n;
  }
  return totals;
}
