// Druid action state machine (spec §7). One action at a time. Starting a new action
// cancels the current one (cancelled actions cost nothing and give nothing). Actions
// not allowed in the current game state are refused, never merely hidden.

import * as C from '../config.js';
import { GameState, ActionState, ACTION_ALLOWED_IN } from '../states.js';
import { canAfford, deduct } from '../resources.js';
import { searchTime, completeSearch } from './searchSystem.js';
import { turretOnSlot, completeBuild, completeUpgrade } from './buildSystem.js';
import { createVulture } from '../entities/vulture.js';
import { canVisit, stepCost, markerPos } from './stepSystem.js';

// Timed actions show a progress bar and can be cancelled. TRAVELLING is neither:
// its steps are already spent and input is ignored until it lands (M1b §5.3).
const TIMED = [ActionState.SEARCHING, ActionState.BUILDING, ActionState.UPGRADING];

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
  return setAction(game, ActionState.SEARCHING, featureIndex, searchTime(feature));
}

// Whether a slot can take a build order now (used by the build menu too).
export function canStartBuild(game, slotIndex) {
  return game.state === GameState.PREP
    && !turretOnSlot(game, slotIndex)
    && !isBuildingSlot(game, slotIndex)
    && canAfford(game.resources, C.TURRET_COST);
}

export function isBuildingSlot(game, slotIndex) {
  return game.action.state === ActionState.BUILDING && game.action.target === slotIndex;
}

// Confirming Build in the menu (§9.2). Cost is checked now but only deducted on completion.
export function startBuild(game, slotIndex) {
  if (!canStartBuild(game, slotIndex)) return false;
  return setAction(game, ActionState.BUILDING, slotIndex, C.BUILD_TIME);
}

export function isTravelling(game) {
  return game.action.state === ActionState.TRAVELLING;
}

// Step mode (M1b §5.3): clicking a valid, affordable marker spends the steps now and starts
// the travel tween. The search or build happens instantly on arrival. target: { kind, index }.
export function startTravel(game, marker) {
  if (game.action.state !== ActionState.IDLE || !canVisit(game, marker)) return false;
  const cost = stepCost(game, marker);
  if (!setAction(game, ActionState.TRAVELLING, { kind: marker.kind, index: marker.index }, C.TRAVEL_TWEEN_TIME)) return false;
  game.action.from = game.druidPos;
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
  game.route.pop();
  if (move.marker.kind === 'feature') game.features[move.marker.index].exhausted = false;
  else game.turrets = game.turrets.filter((t) => t.slotIndex !== move.marker.index);
  return true;
}

// Arrival: the Druid now stands at the marker, which is the origin of the next cost (§4).
function completeTravel(game, marker) {
  game.druidPos = markerPos(game, marker);
  game.route.push(game.druidPos);
  if (marker.kind === 'feature') completeSearch(game, marker.index);
  else completeBuild(game, marker.index);
}

// Upgrade menu state for a turret (§11.1): { available, reason }. Only one upgrade at a
// time: while any turret is upgrading, every Upgrade button is disabled.
export function upgradeAvailability(game, slotIndex) {
  const turret = turretOnSlot(game, slotIndex);
  if (game.state !== GameState.COMBAT || !turret) return { available: false, reason: '' };
  if (turret.upgraded) return { available: false, reason: 'Upgraded' };
  if (game.action.state === ActionState.UPGRADING) return { available: false, reason: 'Another upgrade in progress' };
  if (!canAfford(game.resources, C.UPGRADE_COST)) return { available: false, reason: 'Not enough resources' };
  return { available: true, reason: '' };
}

export function isUpgradingSlot(game, slotIndex) {
  return game.action.state === ActionState.UPGRADING && game.action.target === slotIndex;
}

// Confirming Upgrade in the turret menu. Cost is deducted only on completion.
export function startUpgrade(game, slotIndex) {
  if (!upgradeAvailability(game, slotIndex).available) return false;
  return setAction(game, ActionState.UPGRADING, slotIndex, C.UPGRADE_TIME);
}

// Druid menu (§15.1): { available, reason }. Needs the Druid idle, a free Vulture slot and
// enough Feathers.
export function summonAvailability(game) {
  if (game.state !== GameState.COMBAT) return { available: false, reason: '' };
  if (game.action.state !== ActionState.IDLE) return { available: false, reason: 'Druid is busy' };
  if (game.vultures.length >= C.MAX_VULTURES) return { available: false, reason: `${C.MAX_VULTURES} Vultures already active` };
  if (!canAfford(game.resources, C.VULTURE_COST)) return { available: false, reason: 'Not enough Feathers' };
  return { available: true, reason: '' };
}

// Confirming Summon: enter placement mode. Nothing is paid yet.
export function startSummonPlacement(game) {
  if (!summonAvailability(game).available) return false;
  return setAction(game, ActionState.SUMMON_PLACEMENT);
}

// Esc / right-click step 2. Returns true if placement mode was exited.
export function exitSummonPlacement(game) {
  if (game.action.state !== ActionState.SUMMON_PLACEMENT) return false;
  game.action = createIdleAction();
  return true;
}

// Left-click on the battlefield in placement mode: the Vulture appears instantly and
// the cost is deducted now (§7.5). Re-checked here in case things changed meanwhile.
export function placeVulture(game, p) {
  if (game.action.state !== ActionState.SUMMON_PLACEMENT) return false;
  if (p.y < C.HUD_STRIP_HEIGHT) return false;
  game.action = createIdleAction();
  if (game.vultures.length >= C.MAX_VULTURES || !canAfford(game.resources, C.VULTURE_COST)) return false;
  deduct(game.resources, C.VULTURE_COST);
  game.vultures.push(createVulture(game.nextEntityId++, p.x, p.y));
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
      completeTravel(game, a.target);
    }
    return;
  }
  if (!isTimedAction(a)) return;
  a.elapsed += dt;
  if (a.elapsed < a.duration) return;

  if (a.state === ActionState.SEARCHING) completeSearch(game, a.target);
  else if (a.state === ActionState.BUILDING) completeBuild(game, a.target);
  else if (a.state === ActionState.UPGRADING) completeUpgrade(game, a.target);
  game.action = createIdleAction();
}

// World position of the action's target object, or null when idle.
export function actionTargetPos(game) {
  const a = game.action;
  if (a.state === ActionState.SEARCHING) return game.features[a.target];
  if (a.state === ActionState.BUILDING || a.state === ActionState.UPGRADING) return game.slots[a.target];
  return null;
}

// Where the Druid stands for a logical position: home, or beside a marker.
function standPos(p) {
  if (p.x === C.DRUID_POS.x && p.y === C.DRUID_POS.y) return C.DRUID_POS;
  return { x: p.x + C.DRUID_ACTION_OFFSET.x, y: p.y + C.DRUID_ACTION_OFFSET.y };
}

// Where the Druid is drawn (§7.3). Visual only: wolves always attack DRUID_POS.
// In step mode he stays beside the last marker he visited (game.druidPos) and is
// tweened between markers while TRAVELLING; in timed mode game.druidPos is always home.
export function druidDisplayPos(game) {
  const a = game.action;
  if (a.state === ActionState.TRAVELLING) {
    const from = standPos(a.from);
    const to = standPos(markerPos(game, a.target));
    const t = Math.min(1, a.elapsed / a.duration);
    const e = t * t * (3 - 2 * t); // smoothstep ease
    return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
  }
  const target = actionTargetPos(game);
  if (!target) return standPos(game.druidPos);
  return { x: target.x + C.DRUID_ACTION_OFFSET.x, y: target.y + C.DRUID_ACTION_OFFSET.y };
}
