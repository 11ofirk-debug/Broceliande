// Searching features (spec §8.4): seeded yield roll on completion.

import * as C from '../config.js';
import { RESOURCE_KEYS, add, resourceName } from '../resources.js';
import { addFloatingText } from '../effects.js';
import { events } from '../events.js';

export function searchTime(feature) {
  return C.FEATURE_TYPES[feature.type].searchTime;
}

// Integers rolled uniformly within each range, inclusive; each resource independently (§8.2).
function rollYield(rng, type) {
  const gained = {};
  for (const [res, [min, max]] of Object.entries(C.FEATURE_TYPES[type].yields)) gained[res] = rng.int(min, max);
  return gained;
}

export function completeSearch(game, featureIndex) {
  const feature = game.features[featureIndex];
  if (feature.exhausted) return;
  const gained = rollYield(game.rng, feature.type);
  add(game.resources, gained);
  feature.exhausted = true;

  const found = RESOURCE_KEYS.filter((k) => gained[k] > 0);
  if (found.length) events.emit('resourcesGained', { resources: found }); // one chime per resource found
  const parts = RESOURCE_KEYS.filter((k) => gained[k] > 0).map((k) => `+${gained[k]} ${resourceName(k, gained[k])}`);
  addFloatingText(game, parts.length ? parts.join('  ') : 'Nothing found', feature.x, feature.y - C.LOCATION_RADIUS - 20);
}
