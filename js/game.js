// Game state, phase transitions and restart (spec §6).

import * as C from './config.js';
import { createRng, makeRandomSeed } from './rng.js';
import { buildSpawnQueues, updateSpawning } from './systems/spawnSystem.js';
import { updateWolfMovement } from './systems/movementSystem.js';
import { updateMelee, killWolf, updateTurrets, updateProjectiles } from './systems/combatSystem.js';
import { createIdleAction, updateAction, enforceActionAllowed } from './systems/actionSystem.js';
import { createFeatures } from './entities/searchableFeature.js';
import { generateLayout } from './layout.js';
import { emptyResources, add } from './resources.js';
import { updateEffects } from './effects.js';
import { updateVultures, updateBlocking, expireVultures } from './systems/vultureSystem.js';
import { isStepMode } from './systems/stepSystem.js';
import { GameState, PrepMode } from './states.js';

export { GameState };

// Allowed transitions. Restart (→ PREP) is allowed from any post-START state,
// since the debug R key can restart mid-encounter.
const TRANSITIONS = {
  [GameState.START]: [GameState.PREP],
  [GameState.PREP]: [GameState.COMBAT, GameState.PREP],
  [GameState.COMBAT]: [GameState.VICTORY, GameState.DEFEAT, GameState.PREP],
  [GameState.VICTORY]: [GameState.PREP],
  [GameState.DEFEAT]: [GameState.PREP],
};

// Druid melee slots: DRUID_MELEE_SLOTS evenly spaced on the melee ring (§12.5).
function createMeleeSlots() {
  const slots = [];
  for (let i = 0; i < C.DRUID_MELEE_SLOTS; i++) {
    const angle = (i / C.DRUID_MELEE_SLOTS) * Math.PI * 2;
    slots.push({
      index: i,
      angle,
      x: C.DRUID_POS.x + Math.cos(angle) * C.DRUID_MELEE_RADIUS,
      y: C.DRUID_POS.y + Math.sin(angle) * C.DRUID_MELEE_RADIUS,
      wolfId: null,
    });
  }
  return slots;
}

// scene: static layout from scene.js (lane paths never change between encounters).
export function createGame(scene) {
  return {
    state: GameState.START,
    prepMode: C.PREP_MODE, // PrepMode; kept across restarts, toggled by debug M (M1b §2)
    lanes: scene.lanes,
    seed: null,
    rng: null,
    prepRemaining: 0,  // s, counts down during timed PREP
    stepsRemaining: 0, // step-mode PREP budget (M1b §4)
    druidPos: C.DRUID_POS, // where the Druid logically stands; only leaves home in step-mode Prep
    route: [],             // step-mode Prep: DRUID_POS then every visited marker centre (M1b §5.5)
    moveHistory: [],       // step-mode Prep: per-move snapshots for the debug undo (M1b §8)
    combatTime: 0,     // s, counts up during COMBAT
    druidHp: 0,
    druidLastHitTime: -Infinity, // combat time of the last bite (hit flash)
    resources: emptyResources(),
    layout: null,      // this run's layout (M1c §3): slots, features, candidate roles, fairness stats
    slots: [],         // this run's turret slot positions { x, y, candidate, lanes }
    features: [],
    turrets: [],
    projectiles: [],
    vultures: [],
    action: createIdleAction(),  // Druid action state machine (§7)
    floatingTexts: [],
    nextEntityId: 1,
    wolves: [],
    meleeSlots: createMeleeSlots(),
    spawnQueues: [],
    wolvesSpawned: 0,
    wolvesAlive: 0,
    wolvesKilled: 0,
  };
}

function setState(game, next) {
  if (!TRANSITIONS[game.state].includes(next)) {
    console.error(`Invalid game state transition ${game.state} → ${next}`);
    return false;
  }
  game.state = next;
  return true;
}

// Page load (START → PREP) and Restart (any → PREP). Each start draws a new seed (unless
// DEBUG_SEED is set) and generates this run's layout from it before anything else uses the
// RNG (M1c §3). newSeed: always draw a new seed, even with DEBUG_SEED (debug key L, §6.1).
export function startEncounter(game, { newSeed = false } = {}) {
  game.seed = newSeed ? makeRandomSeed() : (C.DEBUG_SEED ?? makeRandomSeed());
  game.rng = createRng(game.seed);
  game.layout = generateLayout(game.rng, game.lanes);
  game.slots = game.layout.slots;
  game.prepRemaining = C.PREP_DURATION;
  game.stepsRemaining = C.STEP_BUDGET;
  game.druidPos = C.DRUID_POS;
  game.route = [C.DRUID_POS];
  game.moveHistory = [];
  game.combatTime = 0;
  game.druidHp = C.DRUID_HP;
  game.druidLastHitTime = -Infinity;
  game.resources = emptyResources();
  game.features = createFeatures(game.layout);
  game.turrets = [];
  game.projectiles = [];
  game.vultures = [];
  game.action = createIdleAction();
  game.floatingTexts = [];
  game.nextEntityId = 1;
  game.wolves = [];
  game.meleeSlots = createMeleeSlots();
  game.spawnQueues = buildSpawnQueues(game.lanes);
  game.wolvesSpawned = 0;
  game.wolvesAlive = 0;
  game.wolvesKilled = 0;
  setState(game, GameState.PREP);
}

// Prep timer reaching 0, Start Combat / Start Battle button, or debug N.
export function startCombat(game) {
  if (game.state !== GameState.PREP) return;
  game.prepRemaining = 0;
  game.druidPos = C.DRUID_POS; // step mode: the Druid snaps home and the trail is cleared (M1b §5.6)
  game.route = [];
  game.moveHistory = [];
  setState(game, GameState.COMBAT);
  enforceActionAllowed(game); // a search, build or travel in progress is cancelled (§9.3)
}

// Debug key M (M1b §2): switch Prep mode. The caller restarts the encounter.
export function togglePrepMode(game) {
  game.prepMode = isStepMode(game) ? PrepMode.TIMED : PrepMode.STEPS;
}

export function endEncounter(game, result) {
  if (game.state !== GameState.COMBAT) return;
  setState(game, result);
  game.action = createIdleAction();
}

function checkEndConditions(game) {
  if (game.druidHp <= 0) {
    endEncounter(game, GameState.DEFEAT);
  } else if (game.wolvesSpawned >= C.WAVE_TOTAL && game.wolvesAlive === 0) {
    endEncounter(game, GameState.VICTORY);
  }
}

// Extra debug key K (not in spec §18.1, kept on request): kill every living wolf, e.g. to check Victory and Restart quickly.
export function killAllWolves(game) {
  if (game.state !== GameState.COMBAT) return;
  for (const wolf of [...game.wolves]) killWolf(game, wolf);
}

// Debug key G: +DEBUG_GRANT_AMOUNT of each resource.
export function grantResources(game) {
  const n = C.DEBUG_GRANT_AMOUNT;
  add(game.resources, { pits: n, reeds: n, feathers: n });
}

// One fixed simulation step. VICTORY / DEFEAT / START: simulation is stopped.
export function updateGame(game, dt) {
  switch (game.state) {
    case GameState.PREP:
      // Step mode has no countdown: Prep ends only via Start Battle (M1b §5.6).
      if (!isStepMode(game)) game.prepRemaining -= dt;
      updateAction(game, dt);
      updateEffects(game, dt);
      if (!isStepMode(game) && game.prepRemaining <= 0) startCombat(game);
      break;
    case GameState.COMBAT:
      game.combatTime += dt;
      updateSpawning(game);
      updateBlocking(game, dt);      // wolves held by landed Vultures stop and bite them
      updateWolfMovement(game, dt);
      updateTurrets(game, dt);
      updateProjectiles(game, dt);
      updateVultures(game, dt);
      updateMelee(game, dt);
      expireVultures(game, dt);
      updateAction(game, dt);
      updateEffects(game, dt);
      checkEndConditions(game);
      break;
    default:
      break;
  }
}

// Start-up validation of config (spec §14).
export function validateConfig() {
  if (!Object.values(PrepMode).includes(C.PREP_MODE)) {
    console.error(`PREP_MODE is "${C.PREP_MODE}", expected one of: ${Object.values(PrepMode).join(', ')}`);
  }
  let total = 0;
  for (const lane of C.LANES) {
    const bursts = C.WAVE[lane.id];
    if (!bursts) {
      console.error(`WAVE has no bursts for lane "${lane.id}"`);
      continue;
    }
    for (const burst of bursts) total += burst.count;
  }
  if (total !== C.WAVE_TOTAL) {
    console.error(`WAVE total is ${total}, expected WAVE_TOTAL = ${C.WAVE_TOTAL}`);
  }
}
