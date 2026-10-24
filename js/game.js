// Game state, phase transitions and restart (spec §6).

import * as C from './config.js';
import { createRng, makeRandomSeed } from './rng.js';
import { buildSpawnQueues, updateSpawning, queueDebugBear } from './systems/spawnSystem.js';
import { updateEnemyMovement } from './systems/movementSystem.js';
import { updateMelee, killEnemy, updateTurrets, updateProjectiles } from './systems/combatSystem.js';
import { createIdleAction, updateAction, enforceActionAllowed } from './systems/actionSystem.js';
import { createFeatures } from './entities/searchableFeature.js';
import { generateLayout } from './layout.js';
import { emptyDropStats, updateDrops } from './systems/dropSystem.js';
import { emptyResources, add } from './resources.js';
import { updateEffects } from './effects.js';
import { updateVultures, updateBlocking, expireVultures } from './systems/vultureSystem.js';
import { updateSquirrels, expireSquirrels } from './systems/squirrelSystem.js';
import { isStepMode } from './systems/stepSystem.js';
import { GameState, PrepMode, ActionState } from './states.js';
import { updateDruidMelee } from './systems/druidMeleeSystem.js';
import { updateClouds } from './systems/cloudSystem.js';

export { GameState };

// Allowed transitions. Restart (→ PREP) is allowed from any post-START state,
// since the debug R key can restart mid-encounter.
const TRANSITIONS = {
  [GameState.START]: [GameState.PREP],
  [GameState.PREP]: [GameState.COMBAT, GameState.PREP],
  [GameState.COMBAT]: [GameState.ENDING, GameState.PREP],
  [GameState.ENDING]: [GameState.VICTORY, GameState.DEFEAT, GameState.PREP],
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
      enemyId: null, // enemy holding this slot (a Bear holds two adjacent slots, M1e §3.5)
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
    pendingResult: null, // ENDING (M1e §1): VICTORY or DEFEAT, shown when endRemaining reaches 0
    endRemaining: 0,      // s of END_DELAY left during ENDING
    endElapsed: 0,        // s spent in ENDING; extends the animation clock so effects finish (see animationTime)
    druidHp: 0,
    druidLastHitTime: -Infinity, // combat time of the last bite (hit flash)
    druidMeleeTimer: 0,   // M1e §2: s counted while the Druid is idle in Combat; strikes at DRUID_MELEE_INTERVAL
    druidWasBusy: false,  // the Druid was upgrading / placing last step; the timer restarts when that ends
    druidMeleeTargetId: null, // enemy the next strike would hit (debug overlay)
    swipes: [],           // Druid strike swoosh arcs { x1, y1, x2, y2, age } (visual only)
    sparks: [],           // Druid strike impact sparks { x, y, age } (visual only)
    druidStrike: null,    // strike in progress (M1f §4): { elapsed, targetId, dirX, dirY, fromReady, impactAt }
    resources: emptyResources(),
    layout: null,      // this run's layout (M1c §3): slots, features, candidate roles, fairness stats
    slots: [],         // this run's turret slot positions { x, y, candidate, lanes }
    features: [],
    turrets: [],
    projectiles: [],
    clouds: [],        // Toader poison clouds (M1f §6.4)
    damageStats: {},   // damage dealt this encounter by source, e.g. "sprinkler:impact", "toader:cloud" (M1f §7)
    vultures: [],
    squirrels: [],                // Squirrel summons (M1d §2)
    drops: [],                   // wolf drop items on the field (M1d §1): { id, resource, x, y, lane }
    dropStats: emptyDropStats(), // this encounter's dropped / collected units per resource
    dropMult: 1,                 // debug X: drop chance multiplier; kept across restarts
    action: createIdleAction(),  // Druid action state machine (§7)
    floatingTexts: [],
    nextEntityId: 1,
    enemies: [],       // all living enemies, every type (M1e §3.4)
    meleeSlots: createMeleeSlots(),
    spawnQueues: [],
    enemyCounts: emptyEnemyCounts(), // per type: { spawned, alive, killed }
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
  game.pendingResult = null;
  game.endRemaining = 0;
  game.endElapsed = 0;
  game.druidHp = C.DRUID_HP;
  game.druidLastHitTime = -Infinity;
  game.druidMeleeTimer = 0;
  game.druidWasBusy = false;
  game.druidMeleeTargetId = null;
  game.swipes = [];
  game.sparks = [];
  game.druidStrike = null;
  game.resources = emptyResources();
  game.features = createFeatures(game.layout);
  game.turrets = [];
  game.projectiles = [];
  game.clouds = [];
  game.damageStats = {};
  game.vultures = [];
  game.squirrels = [];
  game.drops = [];
  game.dropStats = emptyDropStats();
  game.action = createIdleAction();
  game.floatingTexts = [];
  game.nextEntityId = 1;
  game.enemies = [];
  game.meleeSlots = createMeleeSlots();
  game.spawnQueues = buildSpawnQueues(game.lanes, game.rng);
  game.enemyCounts = emptyEnemyCounts();
  setState(game, GameState.PREP);
}

// Prep timer reaching 0, Start Combat / Start Battle button, or debug N.
export function startCombat(game) {
  if (game.state !== GameState.PREP) return;
  game.prepRemaining = 0;
  game.druidPos = C.DRUID_POS; // step mode: the Druid snaps home and the trail is cleared (M1b §5.6)
  game.route = [];
  game.moveHistory = [];
  game.druidMeleeTimer = 0; // M1e §2.2: the melee timer starts from zero when Combat begins
  game.druidStrike = null;
  game.druidWasBusy = false;
  setState(game, GameState.COMBAT);
  enforceActionAllowed(game); // a search, build or travel in progress is cancelled (§9.3)
}

// Debug key M (M1b §2): switch Prep mode. The caller restarts the encounter.
export function togglePrepMode(game) {
  game.prepMode = isStepMode(game) ? PrepMode.TIMED : PrepMode.STEPS;
}

// M1e §1: Combat → ENDING. Gameplay stops at once: pebbles in flight are removed and summon
// placement is cancelled (an upgrade in progress just freezes). The result shows after END_DELAY.
export function beginEnding(game, result) {
  if (game.state !== GameState.COMBAT) return;
  setState(game, GameState.ENDING);
  game.pendingResult = result;
  game.endRemaining = C.END_DELAY;
  game.endElapsed = 0;
  game.projectiles = [];
  if (game.action.state === ActionState.SUMMON_PLACEMENT) game.action = createIdleAction();
}

// ENDING → VICTORY / DEFEAT once END_DELAY has passed.
function finishEnding(game) {
  setState(game, game.pendingResult);
  game.clouds = []; // M1f §6.4: clouds clear when Combat ends (they froze during ENDING)
  game.action = createIdleAction();
}

function checkEndConditions(game) {
  if (game.druidHp <= 0) {
    beginEnding(game, GameState.DEFEAT);
  } else if (allEnemiesDefeated(game)) {
    beginEnding(game, GameState.VICTORY);
  }
}

// Expected number of each enemy type in the wave (M1e §3.6).
export const WAVE_COUNTS = { wolf: C.WAVE_TOTAL, bear: C.BEAR_COUNT };

function emptyEnemyCounts() {
  return Object.fromEntries(Object.keys(C.ENEMY_TYPES).map((type) => [type, { spawned: 0, alive: 0, killed: 0 }]));
}

// Victory (M1e §3.6): every enemy of every type has spawned and died.
function allEnemiesDefeated(game) {
  return Object.entries(WAVE_COUNTS).every(([type, n]) => game.enemyCounts[type].spawned >= n)
    && game.spawnQueues.every((q) => q.spawns.length === 0) // includes debug-queued Bears
    && game.enemies.length === 0;
}

// Combined counts for the HUD and end screen: { total, killed, remaining }.
export function enemyTotals(game) {
  const total = Object.values(WAVE_COUNTS).reduce((a, b) => a + b, 0);
  const killed = Object.values(game.enemyCounts).reduce((a, c) => a + c.killed, 0);
  return { total, killed, remaining: Math.max(0, total - killed) };
}

// Clock for animations and hit flashes: combat time, plus time spent in ENDING so that
// effects started in the last moments of Combat finish playing (M1e §1.2). Visual only.
export function animationTime(game) {
  return game.combatTime + game.endElapsed;
}

// Extra debug key K (not in spec §18.1, kept on request): kill every living enemy, e.g. to check Victory and Restart quickly.
export function killAllEnemies(game) {
  if (game.state !== GameState.COMBAT) return;
  for (const enemy of [...game.enemies]) killEnemy(game, enemy);
}

// Debug key B (M1e §6): spawn one Bear at the start of a random lane. Combat only.
export function spawnDebugBear(game) {
  if (game.state !== GameState.COMBAT) return;
  queueDebugBear(game);
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
      updateBlocking(game, dt);      // wolves held by landed Vultures (and, if enabled, waiting Squirrels) stop and bite them
      updateEnemyMovement(game, dt);
      updateTurrets(game, dt);
      updateProjectiles(game, dt);
      updateClouds(game, dt);
      updateVultures(game, dt);
      updateDrops(game, dt);         // drop pop flight (M1g §1); before Squirrels so a just-landed item can be claimed
      updateSquirrels(game, dt);
      updateMelee(game, dt);
      expireVultures(game, dt);
      expireSquirrels(game, dt);
      updateAction(game, dt);
      updateDruidMelee(game, dt);   // after updateAction, so a just-finished upgrade restarts the timer
      updateEffects(game, dt);
      checkEndConditions(game);
      break;
    case GameState.ENDING:
      // M1e §1.2: gameplay is frozen; only visual effects keep playing.
      game.endElapsed += dt;
      game.endRemaining -= dt;
      updateEffects(game, dt);
      if (game.endRemaining <= 0) finishEnding(game);
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
  // Per-type wave totals, checked separately (M1e §3.6): wolves vs WAVE_TOTAL, Bears vs BEAR_COUNT.
  const totals = Object.fromEntries(Object.keys(C.ENEMY_TYPES).map((type) => [type, 0]));
  for (const lane of C.LANES) {
    const bursts = C.WAVE[lane.id];
    if (!bursts) {
      console.error(`WAVE has no bursts for lane "${lane.id}"`);
      continue;
    }
    for (const burst of bursts) {
      const type = burst.type ?? 'wolf';
      if (!(type in totals)) console.error(`WAVE burst on lane "${lane.id}" has unknown type "${type}"`);
      else totals[type] += burst.count;
    }
  }
  for (const [type, expected] of Object.entries(WAVE_COUNTS)) {
    if (totals[type] !== expected) {
      console.error(`WAVE has ${totals[type]} ${C.ENEMY_TYPES[type].plural}, expected ${expected} (${type === 'wolf' ? 'WAVE_TOTAL' : 'BEAR_COUNT'})`);
    }
  }
}
