// Per-run layout (M1c §3, §4): which candidate locations become turret slots, features and
// vacant spots, the feature types, jitter, and the fairness checks. Runs on every encounter
// start and restart using the run's seeded RNG, so a fixed seed always gives the same layout.

import * as C from './config.js';
import { greedyRoute } from './systems/stepSystem.js';

const SLOT_COUNT = 12;
const FEATURE_COUNT = 8;

function shuffle(rng, items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Uniform random point in a disc of radius LOCATION_JITTER around the candidate.
function jitter(rng, c) {
  const angle = rng.range(0, Math.PI * 2);
  const r = C.LOCATION_JITTER * Math.sqrt(rng.next());
  return { x: c.x + Math.cos(angle) * r, y: c.y + Math.sin(angle) * r };
}

// Lanes a slot at p covers: some centreline point within the base TURRET_RANGE (§4.1).
function coveredLanes(lanes, p) {
  return lanes.filter((lane) => lane.path.distanceTo(p) <= C.TURRET_RANGE).map((lane) => lane.id);
}

// Fairness check (§4) of a layout. Adds { coverage, routeCost, failed } where failed lists the
// constraints broken: 'coverage:<laneId>' per under-covered lane, and 'route'.
function evaluate(lanes, layout) {
  const coverage = Object.fromEntries(lanes.map((lane) => [lane.id, 0]));
  for (const slot of layout.slots) {
    slot.lanes = coveredLanes(lanes, slot);
    for (const id of slot.lanes) coverage[id]++;
  }
  const routeCost = greedyRoute(layout.features).steps;
  const failed = lanes.filter((lane) => coverage[lane.id] < C.LANE_MIN_TURRET_SLOTS).map((lane) => `coverage:${lane.id}`);
  const band = routeBand();
  if (routeCost < band.min || routeCost > band.max) failed.push('route');
  return { ...layout, coverage, routeCost, failed };
}

// Allowed feature-route cost in steps (§4.2).
export function routeBand() {
  return { min: C.FEATURE_ROUTE_MIN_FACTOR * C.STEP_BUDGET, max: C.FEATURE_ROUTE_MAX_FACTOR * C.STEP_BUDGET };
}

// role per candidate index: { kind: 'slot' | 'feature' | 'vacant', index } (index into slots/features).
function rolesFor(slots, features) {
  const roles = C.CANDIDATE_LOCATIONS.map(() => ({ kind: 'vacant', index: -1 }));
  slots.forEach((s, index) => { roles[s.candidate] = { kind: 'slot', index }; });
  features.forEach((f, index) => { roles[f.candidate] = { kind: 'feature', index }; });
  return roles;
}

// RANDOMISE_LAYOUT: false — the original M1 layout, original types, no jitter, no RNG used (§3.1).
function fixedLayout() {
  const slots = [];
  const features = [];
  C.CANDIDATE_LOCATIONS.forEach((c, candidate) => {
    if (c.role === 'slot') slots.push({ x: c.x, y: c.y, candidate });
    if (c.role === 'feature') features.push({ x: c.x, y: c.y, type: c.type, candidate });
  });
  return { slots, features };
}

// One random draw (§3 steps 1–4).
function drawLayout(rng) {
  const order = shuffle(rng, C.CANDIDATE_LOCATIONS.map((_, i) => i));
  const types = shuffle(rng, C.FEATURES.map((f) => f.type)); // the original mix (§1)
  const slots = order.slice(0, SLOT_COUNT).map((candidate) => ({ ...jitter(rng, C.CANDIDATE_LOCATIONS[candidate]), candidate }));
  const features = order.slice(SLOT_COUNT, SLOT_COUNT + FEATURE_COUNT)
    .map((candidate, i) => ({ ...jitter(rng, C.CANDIDATE_LOCATIONS[candidate]), type: types[i], candidate }));
  return { slots, features };
}

// How far a layout misses the constraints, for ranking failed attempts with the same number of
// failed constraints: total missing slot coverage plus steps outside the route band.
function shortfall(layout) {
  const band = routeBand();
  const missing = Object.values(layout.coverage).reduce((sum, n) => sum + Math.max(0, C.LANE_MIN_TURRET_SLOTS - n), 0);
  const outside = Math.max(0, band.min - layout.routeCost, layout.routeCost - band.max);
  return missing + outside;
}

// Fallback choice (§3 step 7): fewest failed constraints; ties go to the smaller shortfall,
// then to the earlier attempt.
function isBetterFallback(layout, best) {
  if (layout.failed.length !== best.failed.length) return layout.failed.length < best.failed.length;
  return shortfall(layout) < shortfall(best);
}

// Returns { slots, features, roles, coverage, routeCost, failed, attempts, failures, fallback }.
// failures counts, over all attempts, how often each constraint failed.
export function generateLayout(rng, lanes) {
  if (!C.RANDOMISE_LAYOUT) {
    const fixed = evaluate(lanes, fixedLayout());
    return { ...fixed, roles: rolesFor(fixed.slots, fixed.features), attempts: 1, failures: {}, fallback: false, randomised: false };
  }

  const failures = {};
  let best = null;
  let attempts = 0;
  let result = null;
  while (attempts < C.MAX_LAYOUT_ATTEMPTS) {
    attempts++;
    const layout = evaluate(lanes, drawLayout(rng));
    for (const f of layout.failed) failures[f] = (failures[f] ?? 0) + 1;
    if (layout.failed.length === 0) {
      result = layout;
      break;
    }
    if (!best || isBetterFallback(layout, best)) best = layout;
  }
  const fallback = !result;
  if (fallback) {
    result = best;
    console.warn(`Layout: no attempt passed in ${C.MAX_LAYOUT_ATTEMPTS}; using the best one, which fails `
      + `${result.failed.join(', ')} (coverage ${JSON.stringify(result.coverage)}, route ${result.routeCost} steps). `
      + `Failures over all attempts: ${JSON.stringify(failures)}`);
  }
  return { ...result, roles: rolesFor(result.slots, result.features), attempts, failures, fallback, randomised: true };
}
