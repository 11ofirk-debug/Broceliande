// Per-run layout (M1c §3, §4; zone-based since M1j §4): which candidate locations become turret slots, features and
// vacant spots, the feature types, jitter, and the fairness checks, for the scene's level. Runs on every encounter
// start and restart using the run's seeded RNG, so a fixed seed always gives the same layout.

import * as C from './config.js';
import { greedyRoute } from './systems/stepSystem.js';
import { zoneIds, zoneQuota, zoneCandidates } from './zones.js';
import { featureMix } from './levelSettings.js';
import { createRng } from './rng.js';

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
function evaluate(scene, layout) {
  const { lanes, level } = scene;
  const coverage = Object.fromEntries(lanes.map((lane) => [lane.id, 0]));
  for (const slot of layout.slots) {
    slot.lanes = coveredLanes(lanes, slot);
    for (const id of slot.lanes) coverage[id]++;
  }
  const routeCost = greedyRoute(layout.features, level.druidPos).steps;
  const failed = lanes.filter((lane) => coverage[lane.id] < C.LANE_MIN_TURRET_SLOTS).map((lane) => `coverage:${lane.id}`);
  const band = routeBand(level);
  if (routeCost < band.min || routeCost > band.max) failed.push('route');
  return { ...layout, coverage, routeCost, failed };
}

// Allowed feature-route cost in steps (§4.2), from the level's stepBudget.
export function routeBand(level) {
  return { min: C.FEATURE_ROUTE_MIN_FACTOR * level.stepBudget, max: C.FEATURE_ROUTE_MAX_FACTOR * level.stepBudget };
}

// role per candidate index: { kind: 'slot' | 'feature' | 'vacant', index } (index into slots/features).
function rolesFor(level, slots, features) {
  const roles = level.candidateLocations.map(() => ({ kind: 'vacant', index: -1 }));
  slots.forEach((s, index) => { roles[s.candidate] = { kind: 'slot', index }; });
  features.forEach((f, index) => { roles[f.candidate] = { kind: 'feature', index }; });
  return roles;
}

// One random draw (M1j §4 steps 1–2, then jitter): for each zone, shuffle its candidates and
// take its turret quota as slots and its feature quota as resource spots (the rest stay
// vacant); then shuffle the feature type mix across all resource spots.
function drawLayout(rng, level) {
  const slotCandidates = [];
  const featureCandidates = [];
  for (const zone of zoneIds(level)) {
    const q = zoneQuota(level, zone);
    const order = shuffle(rng, zoneCandidates(level, zone));
    slotCandidates.push(...order.slice(0, q.turret));
    featureCandidates.push(...order.slice(q.turret, q.turret + q.feature));
  }
  const types = shuffle(rng, featureMixTypes(level));
  const slots = slotCandidates.map((candidate) => ({ ...jitter(rng, level.candidateLocations[candidate]), candidate }));
  const features = featureCandidates.map((candidate, i) => ({ ...jitter(rng, level.candidateLocations[candidate]), type: types[i], candidate }));
  return { slots, features };
}

// The level's feature mix as a list of types, one per resource spot (M1j §5, M2b §2).
export function featureMixTypes(level) {
  return Object.entries(featureMix(level)).flatMap(([type, n]) => Array(n).fill(type));
}

// How far a layout misses the constraints, for ranking failed attempts with the same number of
// failed constraints: total missing slot coverage plus steps outside the route band.
function shortfall(level, layout) {
  const band = routeBand(level);
  const missing = Object.values(layout.coverage).reduce((sum, n) => sum + Math.max(0, C.LANE_MIN_TURRET_SLOTS - n), 0);
  const outside = Math.max(0, band.min - layout.routeCost, layout.routeCost - band.max);
  return missing + outside;
}

// Fallback choice (§3 step 7): fewest failed constraints; ties go to the smaller shortfall,
// then to the earlier attempt.
function isBetterFallback(level, layout, best) {
  if (layout.failed.length !== best.failed.length) return layout.failed.length < best.failed.length;
  return shortfall(level, layout) < shortfall(level, best);
}

// Returns { slots, features, roles, coverage, routeCost, failed, attempts, failures, fallback }.
// failures counts, over all attempts, how often each constraint failed.
// quiet: no fallback warning (debug-panel statistics over many seeds).
// RANDOMISE_LAYOUT false (M1j §4.2): the same generation, from its own RNG seeded with
// FIXED_LAYOUT_SEED, so the layout is identical every run (and the run's RNG is not used).
export function generateLayout(runRng, scene, { quiet = false } = {}) {
  const { level } = scene;
  const randomised = C.RANDOMISE_LAYOUT;
  const rng = randomised ? runRng : createRng(C.FIXED_LAYOUT_SEED);
  const failures = {};
  let best = null;
  let attempts = 0;
  let result = null;
  while (attempts < C.MAX_LAYOUT_ATTEMPTS) {
    attempts++;
    const layout = evaluate(scene, drawLayout(rng, level));
    for (const f of layout.failed) failures[f] = (failures[f] ?? 0) + 1;
    if (layout.failed.length === 0) {
      result = layout;
      break;
    }
    if (!best || isBetterFallback(level, layout, best)) best = layout;
  }
  const fallback = !result;
  if (fallback) result = best;
  if (fallback && !quiet) {
    console.warn(`Layout: no attempt passed in ${C.MAX_LAYOUT_ATTEMPTS}; using the best one, which fails `
      + `${result.failed.join(', ')} (coverage ${JSON.stringify(result.coverage)}, route ${result.routeCost} steps). `
      + `Failures over all attempts: ${JSON.stringify(failures)}`);
  }
  return { ...result, roles: rolesFor(level, result.slots, result.features), attempts, failures, fallback, randomised };
}
