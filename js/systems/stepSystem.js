// Step-budget Prep (M1b addendum §3–§5): travel cost and which markers can be visited.
// Read-only queries; the travel action itself lives in the action system.

import * as C from '../config.js';
import { GameState, PrepMode, ActionState } from '../states.js';
import { canAfford } from '../resources.js';
import { turretOnSlot } from './buildSystem.js';

export function isStepMode(game) {
  return game.prepMode === PrepMode.STEPS;
}

// Centre of a marker: { kind: 'feature' | 'slot', index } (§4).
export function markerPos(game, marker) {
  return marker.kind === 'feature' ? game.features[marker.index] : game.slots[marker.index];
}

// Whole steps from the Druid's current position to a marker (§4).
export function stepCost(game, marker) {
  const p = markerPos(game, marker);
  return Math.ceil(Math.hypot(p.x - game.druidPos.x, p.y - game.druidPos.y) / C.STEP_PX);
}

// Whether a marker is a valid step-mode target, ignoring the step budget (§5.1).
export function isVisitTarget(game, marker) {
  if (!marker) return false;
  if (marker.kind === 'feature') return !game.features[marker.index].exhausted;
  if (marker.kind === 'slot') return !turretOnSlot(game, marker.index) && canAfford(game.resources, C.TURRET_COST);
  return false;
}

// Clickable right now in step-mode Prep: valid and affordable (§5.1).
export function canVisit(game, marker) {
  return isStepMode(game)
    && game.state === GameState.PREP
    && isVisitTarget(game, marker)
    && stepCost(game, marker) <= game.stepsRemaining;
}

// Whether any marker can still be clicked; when none can, Start Battle pulses (§5.6).
export function anyVisitable(game) {
  return game.features.some((f) => canVisit(game, { kind: 'feature', index: f.index }))
    || game.slots.some((_, index) => canVisit(game, { kind: 'slot', index }));
}

// ---------------------------------------------------------------------------
// Calibration figures for tuning STEP_BUDGET (§8, §9), for this run's layout.
// ---------------------------------------------------------------------------
const legCost = (a, b) => Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / C.STEP_PX);

// Greedy nearest-neighbour route from DRUID_POS through every point. Each leg is charged
// in whole steps, exactly as in play. Returns { steps, visits }. Also used for the
// M1c §4.2 feature-route fairness check.
export function greedyRoute(points) {
  const left = [...points];
  let pos = C.DRUID_POS;
  let steps = 0;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) {
      if (Math.hypot(left[i].x - pos.x, left[i].y - pos.y) < Math.hypot(left[best].x - pos.x, left[best].y - pos.y)) best = i;
    }
    steps += legCost(pos, left[best]);
    pos = left.splice(best, 1)[0];
  }
  return { steps, visits: points.length };
}

export function calibrationFigures(game) {
  const dist = (p) => Math.hypot(p.x - C.DRUID_POS.x, p.y - C.DRUID_POS.y);
  const nearestSlots = [...game.slots].sort((a, b) => dist(a) - dist(b)).slice(0, C.CALIBRATION_SLOT_COUNT);
  return {
    features: greedyRoute(game.features),
    featuresAndSlots: greedyRoute([...game.features, ...nearestSlots]),
  };
}

// Hover preview (§5.2): for a hovered unsearched feature or empty slot in step-mode Prep,
// { from, to, cost, affordable }, where affordable means within the step budget. Slots
// short of resources still preview (the tooltip says why). None while travelling, since
// the Druid has not yet reached the next origin.
export function routePreview(game, hover) {
  if (!isStepMode(game) || game.state !== GameState.PREP) return null;
  if (game.action.state === ActionState.TRAVELLING || !hover) return null;
  if (hover.kind === 'feature' && game.features[hover.index].exhausted) return null;
  if (hover.kind !== 'feature' && hover.kind !== 'slot') return null;
  const cost = stepCost(game, hover);
  return { from: game.druidPos, to: markerPos(game, hover), cost, affordable: cost <= game.stepsRemaining };
}
