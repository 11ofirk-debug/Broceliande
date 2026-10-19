// Resource helpers (spec §8.1). An amount/cost is { pits, reeds, feathers }.

export const RESOURCE_KEYS = ['pits', 'reeds', 'feathers'];

const NAMES = {
  pits: ['Pit', 'Pits'],
  reeds: ['Reed', 'Reeds'],
  feathers: ['Feather', 'Feathers'],
};

export function emptyResources() {
  return { pits: 0, reeds: 0, feathers: 0 };
}

export function resourceName(key, n) {
  return NAMES[key][n === 1 ? 0 : 1];
}

export function canAfford(resources, cost) {
  return RESOURCE_KEYS.every((k) => (resources[k] ?? 0) >= (cost[k] ?? 0));
}

export function deduct(resources, cost) {
  for (const k of RESOURCE_KEYS) resources[k] -= cost[k] ?? 0;
}

export function add(resources, amount) {
  for (const k of RESOURCE_KEYS) resources[k] += amount[k] ?? 0;
}

// "2 Pits · 1 Reed" — zero entries are skipped.
export function formatCost(cost) {
  return RESOURCE_KEYS.filter((k) => cost[k] > 0)
    .map((k) => `${cost[k]} ${resourceName(k, cost[k])}`)
    .join(' · ');
}
