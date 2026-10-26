// Druid action state machine (spec §7). One action at a time. Starting a new action
// cancels the current one (cancelled actions cost nothing and give nothing). Actions
// not allowed in the current game state are refused, never merely hidden.

import * as C from '../config.js';
import { GameState, ActionState, ACTION_ALLOWED_IN } from '../states.js';
import { canAfford, deduct, RESOURCE_KEYS, resourceName } from '../resources.js';
import { searchTime, completeSearch } from './searchSystem.js';
import { turretOnSlot, completeBuild } from './buildSystem.js';
import { createVulture } from '../entities/vulture.js';
import { createSquirrel } from '../entities/squirrel.js';
import { canVisit, stepCost, markerPos, legFootprints } from './stepSystem.js';
import { buildCost, buildTime } from '../entities/turret.js';
import { doubleAvailability } from './doubleSystem.js';
import { events } from '../events.js';
import { addFloatingText } from '../effects.js';

// Timed actions show a progress bar and can be cancelled. TRAVELLING is neither:
// its steps are already spent and input is ignored until it lands (M1b §5.3).
const TIMED = [ActionState.SEARCHING, ActionState.BUILDING]; // Prep only; Combat jobs are Bough Doubles' (M1i §2)

export function createIdleAction() {
  return { state: ActionState.IDLE, target: null, elapsed: 0, duration: 0 };
}

function setAction(game, state, target = null, duration = 0) {
  if (!ACTION_ALLOWED_IN[state].includes(game.state)) {
    console.error(`Action ${state} is not allowed during ${game.state}`);
    return false;
  }
  game.action = { state, target, elapsed: 0, duration };
  return true;
}

export function isTimedAction(action) {
  return TIMED.includes(action.state);
}

// Clicking a feature (§7.4, §8.4). Clicking the feature already being searched does nothing.
export function startSearch(game, featureIndex) {
  if (game.state !== GameState.PREP) return false;
  const feature = game.features[featureIndex];
  if (feature.exhausted) return false;
  const a = game.action;
  if (a.state === ActionState.SEARCHING && a.target === featureIndex) return false;
  if (!setAction(game, ActionState.SEARCHING, featureIndex, searchTime(feature))) return false;
  events.emit('searchStarted', { featureIndex });
  return true;
}

// Whether a slot can take a build order for a turret type now (used by the build menu too).
export function canStartBuild(game, slotIndex, type) {
  return game.state === GameState.PREP
    && !turretOnSlot(game, slotIndex)
    && !isBuildingSlot(game, slotIndex)
    && canAfford(game.resources, buildCost(type));
}

export function isBuildingSlot(game, slotIndex) {
  return game.action.state === ActionState.BUILDING && game.action.target === slotIndex;
}

// Confirming a turret in the build menu (§9.2, M1f §5.2). Cost is checked now but only
// deducted on completion. The action's target is the slot; turretType says what is built.
export function startBuild(game, slotIndex, type) {
  if (!canStartBuild(game, slotIndex, type)) return false;
  // Build time divided by the effective work speed (M2e, Wright's Belt).
  if (!setAction(game, ActionState.BUILDING, slotIndex, buildTime(type) / game.stats['work.speed'])) return false;
  game.action.turretType = type;
  return true;
}

export function isTravelling(game) {
  return game.action.state === ActionState.TRAVELLING;
}

// Step mode (M1b §5.3): clicking a valid, affordable marker spends the steps now and starts
// the travel tween. The search or build happens instantly on arrival. target: { kind, index }.
// For a slot, turretType is the turret chosen in the build menu (M1f §5.2); it must be affordable.
export function startTravel(game, marker, turretType = null) {
  if (game.action.state !== ActionState.IDLE || !canVisit(game, marker)) return false;
  if (marker.kind === 'slot' && !(turretType && canAfford(game.resources, buildCost(turretType)))) return false;
  const cost = stepCost(game, marker);
  const leg = legFootprints(game, marker); // the footprints just previewed, from where he stands now
  if (!setAction(game, ActionState.TRAVELLING, { kind: marker.kind, index: marker.index }, C.TRAVEL_TWEEN_TIME)) return false;
  game.trail.push(leg); // M1h §1.2: committed now, so the whole leg stays on the ground at once
  game.action.from = game.druidPos;
  game.action.turretType = turretType;
  // Debug undo (M1b §8): what this move is about to change.
  game.moveHistory.push({
    marker: game.action.target,
    stepsRemaining: game.stepsRemaining,
    druidPos: game.druidPos,
    resources: { ...game.resources },
  });
  game.stepsRemaining -= cost;
  return true;
}

// Debug key U (M1b §8): undo the last step-mode move, restoring steps, position, resources
// and the marker (feature unsearched / turret removed). Only when idle in step-mode Prep.
// The RNG is not rewound, so searching the feature again may roll a different yield.
export function undoLastMove(game) {
  if (game.state !== GameState.PREP || game.action.state !== ActionState.IDLE) return false;
  const move = game.moveHistory.pop();
  if (!move) return false;
  game.stepsRemaining = move.stepsRemaining;
  game.druidPos = move.druidPos;
  game.resources = move.resources;
  game.trail.pop();
  if (move.marker.kind === 'feature') game.features[move.marker.index].exhausted = false;
  else game.turrets = game.turrets.filter((t) => t.slotIndex !== move.marker.index);
  return true;
}

// Arrival: the Druid now stands at the marker, which is the origin of the next cost (§4).
function completeTravel(game, marker, turretType) {
  game.druidPos = markerPos(game, marker);
  if (marker.kind === 'feature') {
    events.emit('searchStarted', { featureIndex: marker.index }); // step mode: rustle and chimes both on arrival
    completeSearch(game, marker.index);
  } else {
    completeBuild(game, marker.index, turretType);
  }
}

// The summons (§15, M1d §2, M1i §2.4), in Druid-menu order. Each has its own cost and its own
// cap. The Bough Double is `targeted`: instead of being placed anywhere, it is pointed at a
// turret slot and does a job there (doubleSystem.js); its cost is the Bough, and the job's.
export const SUMMONS = {
  vulture: { kind: 'vulture', name: 'Vulture', plural: 'Vultures', cost: C.VULTURE_COST, max: C.MAX_VULTURES, active: (g) => g.vultures, create: createVulture },
  squirrel: { kind: 'squirrel', name: 'Squirrel', plural: 'Squirrels', cost: C.SQUIRREL_COST, max: C.MAX_SQUIRRELS, active: (g) => g.squirrels, create: createSquirrel },
  // The Bough Double's cap is the effective double.max (M2e), checked in doubleSystem.js.
  double: { kind: 'double', name: 'Bough Double', plural: 'Bough Doubles', cost: C.BOUGH_DOUBLE_COST, active: (g) => g.doubles, targeted: true },
};

// A summon's cap: its config max, or for the Bough Double the effective double.max (M2e).
export function summonMax(game, kind) {
  return SUMMONS[kind].targeted ? game.stats['double.max'] : SUMMONS[kind].max;
}

// "Not enough Feathers" / "Not enough Pits, Feathers": the resources the cost is short of.
function shortfallReason(resources, cost) {
  const missing = RESOURCE_KEYS.filter((k) => (resources[k] ?? 0) < (cost[k] ?? 0)).map((k) => resourceName(k, 2));
  return `Not enough ${missing.join(', ')}`;
}

// Druid menu option (§15.1, M1d §2.1): { available, reason }. Needs the Druid idle, a free
// slot under that summon's cap, and its cost.
export function summonAvailability(game, kind) {
  const s = SUMMONS[kind];
  if (game.state !== GameState.COMBAT) return { available: false, reason: '' };
  if (game.action.state !== ActionState.IDLE) return { available: false, reason: 'Druid is busy' };
  if (s.targeted) return doubleAvailability(game);
  if (s.active(game).length >= s.max) return { available: false, reason: `${s.max} ${s.max === 1 ? s.name : s.plural} already active` };
  if (!canAfford(game.resources, s.cost)) return { available: false, reason: shortfallReason(game.resources, s.cost) };
  return { available: true, reason: '' };
}

// A summon shortcut that can't be used now: its reason in small grey text above the Druid and a
// soft "denied" sound. Nothing else changes.
export function denySummon(game, kind, reason) {
  const p = druidDisplayPos(game);
  addFloatingText(game, reason, p.x, p.y - C.DRUID_RADIUS * 3, true, true);
  events.emit('summonDenied', { kind });
}

// Confirming Summon: enter placement mode for that summon (the action's target). Nothing is paid yet.
export function startSummonPlacement(game, kind) {
  if (!summonAvailability(game, kind).available) return false;
  return setAction(game, ActionState.SUMMON_PLACEMENT, kind);
}

// Esc / right-click step 2. Returns true if placement mode was exited.
export function exitSummonPlacement(game) {
  if (game.action.state !== ActionState.SUMMON_PLACEMENT) return false;
  game.action = createIdleAction();
  return true;
}

// Left-click on the battlefield in placement mode: the summon appears instantly and its
// cost is deducted now (§7.5). Re-checked here in case things changed meanwhile.
export function placeSummon(game, p) {
  if (game.action.state !== ActionState.SUMMON_PLACEMENT) return false;
  if (p.y < C.HUD_STRIP_HEIGHT) return false;
  const s = SUMMONS[game.action.target];
  if (s.targeted) return false; // a Bough Double starts a job on a target instead (startDoubleJob)
  game.action = createIdleAction();
  if (s.active(game).length >= s.max || !canAfford(game.resources, s.cost)) return false;
  deduct(game.resources, s.cost);
  s.active(game).push(s.create(game.nextEntityId++, p.x, p.y, game.stats[`${s.kind}.duration`])); // effective duration (M2e)
  events.emit('summonPlaced', { kind: s.kind, x: p.x, y: p.y });
  return true;
}

// Esc / right-click step 3, Prep ending, Restart. Returns true if a timed action was cancelled.
export function cancelAction(game) {
  if (!isTimedAction(game.action)) return false;
  game.action = createIdleAction();
  return true;
}

// Phase change: drop any action the new game state does not allow (e.g. a search when Combat starts).
export function enforceActionAllowed(game) {
  const allowed = ACTION_ALLOWED_IN[game.action.state];
  if (!allowed.includes(game.state)) game.action = createIdleAction();
}

export function updateAction(game, dt) {
  const a = game.action;
  if (a.state === ActionState.TRAVELLING) {
    a.elapsed += dt;
    if (a.elapsed >= a.duration) {
      game.action = createIdleAction();
      completeTravel(game, a.target, a.turretType);
    }
    return;
  }
  if (!isTimedAction(a)) return;
  a.elapsed += dt;
  if (a.elapsed < a.duration) return;

  if (a.state === ActionState.SEARCHING) completeSearch(game, a.target);
  else if (a.state === ActionState.BUILDING) completeBuild(game, a.target, a.turretType);
  game.action = createIdleAction();
}

// World position of the action's target object, or null when idle. Prep only: in Combat the
// Druid stays at his main position (M1i §2.2).
export function actionTargetPos(game) {
  const a = game.action;
  if (a.state === ActionState.SEARCHING) return game.features[a.target];
  if (a.state === ActionState.BUILDING) return game.slots[a.target];
  return null;
}

// Where the Druid stands for a logical position: home (the level's druidPos), or beside a marker.
function standPos(game, p) {
  const home = game.scene.level.druidPos;
  if (p.x === home.x && p.y === home.y) return home;
  return { x: p.x + C.DRUID_ACTION_OFFSET.x, y: p.y + C.DRUID_ACTION_OFFSET.y };
}

// Where the Druid is drawn (§7.3). Visual only: wolves always attack his home position.
// In step mode he stays beside the last marker he visited (game.druidPos) and is
// tweened between markers while TRAVELLING; in timed mode game.druidPos is always home.
export function druidDisplayPos(game) {
  const a = game.action;
  if (a.state === ActionState.TRAVELLING) {
    const from = standPos(game, a.from);
    const to = standPos(game, markerPos(game, a.target));
    const t = Math.min(1, a.elapsed / a.duration);
    const e = t * t * (3 - 2 * t); // smoothstep ease
    return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
  }
  const target = actionTargetPos(game);
  if (!target) return standPos(game, game.druidPos);
  return { x: target.x + C.DRUID_ACTION_OFFSET.x, y: target.y + C.DRUID_ACTION_OFFSET.y };
}
