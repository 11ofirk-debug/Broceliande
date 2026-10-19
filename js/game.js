// Game state, phase transitions and restart (spec §6).

import * as C from './config.js';
import { createRng, makeRandomSeed } from './rng.js';
import { buildSpawnQueues, updateSpawning } from './systems/spawnSystem.js';
import { updateWolfMovement } from './systems/movementSystem.js';
import { updateMelee, killWolf, updateTurrets, updateProjectiles } from './systems/combatSystem.js';
import { createIdleAction, updateAction, enforceActionAllowed } from './systems/actionSystem.js';
import { createFeatures } from './entities/searchableFeature.js';
import { emptyResources, add } from './resources.js';
import { updateEffects } from './effects.js';
import { updateVultures, updateBlocking, expireVultures } from './systems/vultureSystem.js';
import { GameState } from './states.js';

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
    lanes: scene.lanes,
    seed: null,
    rng: null,
    prepRemaining: 0,  // s, counts down during PREP
    combatTime: 0,     // s, counts up during COMBAT
    druidHp: 0,
    druidLastHitTime: -Infinity, // combat time of the last bite (hit flash)
    resources: emptyResources(),
    features: createFeatures(),
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

// Page load (START → PREP) and Restart (any → PREP). Layout comes from config and
// never changes; only the seed (and therefore yields) is re-rolled.
export function startEncounter(game) {
  game.seed = C.DEBUG_SEED ?? makeRandomSeed();
  game.rng = createRng(game.seed);
  game.prepRemaining = C.PREP_DURATION;
  game.combatTime = 0;
  game.druidHp = C.DRUID_HP;
  game.druidLastHitTime = -Infinity;
  game.resources = emptyResources();
  game.features = createFeatures();
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

// Prep timer reaching 0, Start Combat button, or debug N.
export function startCombat(game) {
  if (game.state !== GameState.PREP) return;
  game.prepRemaining = 0;
  setState(game, GameState.COMBAT);
  enforceActionAllowed(game); // a search or build in progress is cancelled at no cost (§9.3)
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
      game.prepRemaining -= dt;
      updateAction(game, dt);
      updateEffects(game, dt);
      if (game.prepRemaining <= 0) startCombat(game);
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
