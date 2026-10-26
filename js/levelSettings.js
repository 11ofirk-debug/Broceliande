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
