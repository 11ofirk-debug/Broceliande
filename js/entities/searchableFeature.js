// Searchable feature state (spec §8). Position and type come from config; only
// `exhausted` changes, and it resets on Restart.

import * as C from '../config.js';

export function createFeatures() {
  return C.FEATURES.map((f, index) => ({ index, type: f.type, x: f.x, y: f.y, exhausted: false }));
}
