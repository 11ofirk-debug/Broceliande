// Resource helpers (spec §8.1, M1i §1). An amount/cost is { pits, reeds, feathers, boughs };
// a missing key counts as 0. RESOURCE_KEYS is the display order everywhere (HUD, tooltips, cost rows).

import * as C from './config.js';

// From data/resources.csv (its `order` column).
export const RESOURCE_KEYS = C.RESOURCE_ORDER;

export function emptyResources() {
  return Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 0]));
}

export function resourceName(key, n) {
  return n === 1 ? C.RESOURCES[key].singular : C.RESOURCES[key].plural;
}

export function canAfford(resources, cost) {
  return RESOURCE_KEYS.every((k) => (resources[k] ?? 0) >= (cost[k] ?? 0));
}

export function deduct(resources, cost) {
  for (const k of RESOURCE_KEYS) resources[k] = (resources[k] ?? 0) - (cost[k] ?? 0);
}

export function add(resources, amount) {
  for (const k of RESOURCE_KEYS) resources[k] = (resources[k] ?? 0) + (amount[k] ?? 0);
}

// "2 Pits · 1 Reed" — zero entries are skipped.
export function formatCost(cost) {
  return RESOURCE_KEYS.filter((k) => cost[k] > 0)
    .map((k) => `${cost[k]} ${resourceName(k, cost[k])}`)
    .join(' · ');
}
