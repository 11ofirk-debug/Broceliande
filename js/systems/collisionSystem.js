// Wolf–wolf collision (spec §12.4): wolves are circles of WOLF_RADIUS that must never
// overlap. Movement systems propose a position and ask here whether it is free.
// The check is in world space, so it also covers lanes converging near the Druid.

import * as C from '../config.js';

const MIN_GAP = C.WOLF_RADIUS * 2;

// Returns the first other wolf a wolf at (x, y) would overlap, or null.
export function findBlocker(wolves, self, x, y) {
  for (const other of wolves) {
    if (other === self) continue;
    if (Math.hypot(other.x - x, other.y - y) < MIN_GAP) return other;
  }
  return null;
}
