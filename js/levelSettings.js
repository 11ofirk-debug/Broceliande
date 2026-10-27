// Per-level settings with global defaults (M2b §2): a level may set its own corridorWidth and
// featureMix (from data/levels.csv); otherwise CORRIDOR_WIDTH applies. Everything that used the globals
// reads them through here.

import * as C from './config.js';

export function corridorWidth(level) {
  return level.corridorWidth ?? C.CORRIDOR_WIDTH;
}

export function featureMix(level) {
  return level.featureMix;
}

// M2f §4: how long an enemy waits behind a slower one before passing through it (M2d §3.4).
export function stuckTime(level) {
  return level.stuckTime ?? C.STUCK_TIME;
}

// M2i §2: the level's waves, each { gapAfter, spawns: [{ t, lane, type, count }], tolls? }.
export function levelWaves(level) {
  return level.waves;
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
