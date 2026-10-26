// Game state, phase transitions and restart (spec §6).

import * as C from './config.js';
import { createRng, makeRandomSeed } from './rng.js';
import { buildSpawnQueues, updateSpawning, queueDebugEnemy } from './systems/spawnSystem.js';
import { updateEnemyMovement } from './systems/movementSystem.js';
import { updateMelee, updateWindupAttacks, killEnemy, updateTurrets, updateProjectiles } from './systems/combatSystem.js';
import { fitsCorridor } from './entities/enemy.js';
import { corridorWidth } from './levelSettings.js';
import { createIdleAction, updateAction, enforceActionAllowed } from './systems/actionSystem.js';
import { createFeatures } from './entities/searchableFeature.js';
import { generateLayout } from './layout.js';
import { emptyDropStats, updateDrops } from './systems/dropSystem.js';
import { emptyResources, add, RESOURCE_KEYS } from './resources.js';
import { updateEffects, addResourceFloaters } from './effects.js';
import { updateVultures, updateBlocking, expireVultures } from './systems/vultureSystem.js';
import { updateSquirrels, updateSquirrelStrikes, expireSquirrels } from './systems/squirrelSystem.js';
import { isStepMode } from './systems/stepSystem.js';
import { GameState, PrepMode, ActionState } from './states.js';
import { sceneFor } from './scene.js';
import { createRun, mapNode, nodeState, encounterSeed, recordVictory, isRunComplete, startingDruidHp, randomUnownedItem, addItem } from './run.js';
import { resolveStats } from './stats.js';
import { events } from './events.js';
import { updateDruidMelee } from './systems/druidMeleeSystem.js';
import { updateClouds } from './systems/cloudSystem.js';
import { updateDoubles } from './systems/doubleSystem.js';
import { startSweep, updateSweep, finishSweep } from './systems/sweepSystem.js';

export { GameState };

// Allowed transitions (M2a §2.1). Restart (→ PREP) is allowed from any encounter state, since the
// debug R key can restart mid-encounter; a new run (→ MAP) from any state (Start again, Shift+R).
const TRANSITIONS = {
  [GameState.START]: [GameState.MAP, GameState.PREP], // PREP: a direct start without the map (tests, debug)
  [GameState.MAP]: [GameState.PREP, GameState.MAP],
  [GameState.PREP]: [GameState.COMBAT, GameState.PREP, GameState.MAP],
  [GameState.COMBAT]: [GameState.ENDING, GameState.PREP, GameState.MAP],
  [GameState.ENDING]: [GameState.VICTORY, GameState.DEFEAT, GameState.PREP, GameState.MAP],
  [GameState.VICTORY]: [GameState.MAP, GameState.PREP],
  [GameState.DEFEAT]: [GameState.MAP, GameState.PREP],
};

// Druid melee slots: DRUID_MELEE_SLOTS evenly spaced on the melee ring around home (§12.5).
function createMeleeSlots(home) {
  const slots = [];
  for (let i = 0; i < C.DRUID_MELEE_SLOTS; i++) {
    const angle = (i / C.DRUID_MELEE_SLOTS) * Math.PI * 2;
    slots.push({
      index: i,
      angle,
      x: home.x + Math.cos(angle) * C.DRUID_MELEE_RADIUS,
      y: home.y + Math.sin(angle) * C.DRUID_MELEE_RADIUS,
      enemyId: null, // enemy holding this slot (a Bear holds two adjacent slots, M1e §3.5)
    });
  }
  return slots;
}

// levelId: a LEVELS key (M2a §5.1). game.scene is that level's static scene from scene.js (its
// lanes, candidates and decoration never change between encounters); game.scene.level its data.
export function createGame(levelId) {
  const scene = sceneFor(levelId);
  return {
    state: GameState.START,
    prepMode: C.PREP_MODE, // PrepMode; kept across restarts, toggled by debug M (M1b §2)
    run: null,             // M2a §2.2: the run (map progress, inventory), kept apart from the encounter state
    encounterStart: null,  // how the current encounter started { levelId, seed, resources, druidHp } (debug R)
    stats: resolveStats(null, scene.level), // M2e §2.2: effective stats, resolved again when each battle starts
    levelId,
    scene,
    lanes: scene.lanes,
    seed: null,
    rng: null,
    prepRemaining: 0,  // s, counts down during timed PREP
    stepsRemaining: 0, // step-mode PREP budget (M1b §4)
    druidPos: scene.level.druidPos, // where the Druid logically stands; only leaves home in step-mode Prep
    trail: [],             // step-mode Prep: committed legs, each the list of its footprints (M1h §1)
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
    doubles: [],                  // Bough Doubles at work (M1i §2), each with its job
    doubleFades: [],              // Doubles fading out after a job { x, y, facing, age } (visual only)
    chips: [],                    // wood chips from crafting swings { x, y, vx, vy, age } (visual only)
    doubleStats: emptyDoubleStats(), // this encounter's Bough figures and Double jobs (M1i §4)
    drops: [],                   // wolf drop items on the field (M1d §1): { id, resource, x, y, lane }
    dropStats: emptyDropStats(), // this encounter's dropped / collected units per resource
    dropMult: 1,                 // debug X: drop chance multiplier; kept across restarts
    action: createIdleAction(),  // Druid action state machine (§7)
    floatingTexts: [],
    floaters: [],                // resource gain floaters (M2d §1)
    sweep: null,                 // field sweep in progress on Victory (M2d §2), see sweepSystem.js
    lastSweep: null,             // what the last Victory's sweep gathered (debug panel); kept across encounters
    hudPulses: {},               // resource → endElapsed when a swept item landed on its counter
    nextEntityId: 1,
    enemies: [],       // all living enemies, every type (M1e §3.4)
    meleeSlots: createMeleeSlots(scene.level.druidPos),
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

// A map node (MAP → PREP) or a restart (any encounter state → PREP). seed: the encounter's seed
// (a node's is derived from the run seed, M2a §2.2); without one, a new seed is drawn (unless
// DEBUG_SEED is set). The layout is generated from it before anything else uses the RNG (M1c §3).
// newSeed: always draw a new seed, even with DEBUG_SEED (debug key L, §6.1). levelId: switch to
// that level first; otherwise the current level. resources: start Prep with these instead of
// none. druidHp: start with this HP instead of full (CARRY_DRUID_HP, M2a §3).
export function startEncounter(game, { newSeed = false, levelId = null, resources = null, seed = null, druidHp = null } = {}) {
  if (levelId && levelId !== game.levelId) {
    game.levelId = levelId;
    game.scene = sceneFor(levelId);
    game.lanes = game.scene.lanes;
  }
  const level = game.scene.level;
  // M2e §2.2: effective stats from the run's equipment, fixed for this battle.
  game.stats = resolveStats(game.run?.equipped, level);
  game.seed = seed ?? (newSeed ? makeRandomSeed() : (C.DEBUG_SEED ?? makeRandomSeed()));
  game.rng = createRng(game.seed);
  game.layout = generateLayout(game.rng, game.scene);
  game.slots = game.layout.slots;
  game.prepRemaining = C.PREP_DURATION;
  game.stepsRemaining = game.stats['steps.budget'];
  game.druidPos = level.druidPos;
  game.trail = [];
  game.moveHistory = [];
  game.combatTime = 0;
  game.pendingResult = null;
  game.endRemaining = 0;
  game.endElapsed = 0;
  game.druidHp = druidHp ?? game.stats['druid.maxHp'];
  game.regenTimer = 0; // M2e: s towards the next regen tick (Sap Pendant)
  game.druidLastHitTime = -Infinity;
  game.druidMeleeTimer = 0;
  game.druidWasBusy = false;
  game.druidMeleeTargetId = null;
  game.swipes = [];
  game.sparks = [];
  game.druidStrike = null;
  game.resources = resources ? { ...emptyResources(), ...resources } : emptyResources();
  game.features = createFeatures(game.layout);
  game.hiddenItem = hideItem(game); // M2e §3.1: chosen from the encounter's seed, after its layout
  game.itemMessage = null;          // M2e §3.2: { slot, age } of the "You found a …!" message
  game.turrets = [];
  game.projectiles = [];
  game.clouds = [];
  game.damageStats = {};
  game.vultures = [];
  game.squirrels = [];
  game.doubles = [];
  game.doubleFades = [];
  game.chips = [];
  game.doubleStats = emptyDoubleStats();
  game.drops = [];
  game.dropStats = emptyDropStats();
  game.action = createIdleAction();
  game.floatingTexts = [];
  game.floaters = [];
  game.sweep = null;
  game.hudPulses = {};
  game.bossAnnouncement = null; // M2c §2.6: { text, age } of the arrival banner
  game.lanePulses = [];         // M2c §2.6: { laneId, age }, a boss's lane entrance pulsing red
  game.dustRings = [];          // M2c §2.5: { x, y, age } at each Ogre blow
  game.shake = null;            // M2c §2.5: { age } of the screen shake after a blow (drawing only)
  game.nextEntityId = 1;
  game.enemies = [];
  game.meleeSlots = createMeleeSlots(level.druidPos);
  game.spawnQueues = buildSpawnQueues(level, game.lanes, game.rng);
  game.tolls = [...(level.tolls ?? [])].sort((a, b) => a - b); // M2f §4.10: bell tolls still to ring (s)
  game.enemyCounts = emptyEnemyCounts();
  setState(game, GameState.PREP);
}

// Prep timer reaching 0, Start Combat / Start Battle button, or debug N.
export function startCombat(game) {
  if (game.state !== GameState.PREP) return;
  game.prepRemaining = 0;
  game.druidPos = game.scene.level.druidPos; // step mode: the Druid snaps home and the trail is cleared (M1b §5.6)
  game.trail = [];
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
  if (result === GameState.VICTORY) startSweep(game); // M2d §2: the field's drops fly to the HUD
}

// ENDING → VICTORY / DEFEAT once END_DELAY has passed.
// On Victory the node is won and the resources carry over (M2a §3); winning a node with no
// `next` completes the run.
function finishEnding(game) {
  setState(game, game.pendingResult);
  game.clouds = []; // M1f §6.4: clouds clear when Combat ends (they froze during ENDING)
  game.action = createIdleAction();
  if (game.state === GameState.VICTORY) {
    finishSweep(game); // every swept item counted before the carry-over is saved (M2d §2.1)
    // M2e §3.3: a found item joins the run only now, on Victory.
    if (game.hiddenItem?.found) addItem(game.run, game.hiddenItem.itemId);
    recordVictory(game.run, game.resources, game.druidHp);
    if (isRunComplete(game.run)) events.emit('runComplete', {});
  }
}

// ---------------------------------------------------------------------------
// Run and map (M2a §2–§4)
// ---------------------------------------------------------------------------

// Page load, Start again and Shift+R: a new run on the map — progress, inventory and the
// Druid's HP all reset.
export function newRun(game) {
  game.run = createRun();
  game.encounterStart = null;
  game.resources = { ...game.run.inventory };
  game.druidHp = game.run.druidHp;
  setState(game, GameState.MAP);
}

// Clicking an available map node: its encounter's Prep, with the carried resources, the node's
// derived seed and (with CARRY_DRUID_HP) the carried HP. Returns false for any other node.
export function enterNode(game, nodeId) {
  if (game.state !== GameState.MAP || nodeState(game.run, nodeId) !== 'available') return false;
  const node = mapNode(nodeId);
  game.run.currentNodeId = nodeId;
  game.encounterStart = {
    levelId: node.levelId,
    seed: encounterSeed(game.run, nodeId),
    resources: { ...game.run.inventory },
    druidHp: startingDruidHp(game.run, resolveStats(game.run.equipped, C.LEVELS[node.levelId])['druid.maxHp']),
  };
  events.emit('mapNodeChosen', { nodeId });
  startEncounter(game, game.encounterStart);
  return true;
}

// Debug R (M2a §8): the current encounter again, from how it started (same node, layout,
// resources). Before any node was entered, a plain restart of the current level.
export function restartEncounter(game) {
  if (game.state === GameState.MAP) return;
  if (game.encounterStart) startEncounter(game, { ...game.encounterStart, resources: { ...game.encounterStart.resources } });
  else startEncounter(game);
}

// Victory with more nodes reachable: Continue, back to the map (§4.4).
export function continueRun(game) {
  if (game.state !== GameState.VICTORY || isRunComplete(game.run)) return false;
  return setState(game, GameState.MAP);
}

// Debug W (M2a §8): win the battle now (Combat only), through ENDING to Victory.
export function winNow(game) {
  beginEnding(game, GameState.VICTORY);
}

function checkEndConditions(game) {
  if (game.druidHp <= 0) {
    beginEnding(game, GameState.DEFEAT);
  } else if (allEnemiesDefeated(game)) {
    beginEnding(game, GameState.VICTORY);
  }
}

// M2e §3.1: hide one item the run doesn't own yet in one random resource spot, both with the
// encounter's seeded RNG. Nothing in the spot's look or tooltip shows it. Null when there is no
// run (direct starts), no spot, or the run owns every item.
// hiddenItem: { featureIndex, itemId, found }
function hideItem(game) {
  if (!game.run || C.ITEMS_PER_BATTLE < 1 || game.features.length === 0) return null;
  const itemId = randomUnownedItem(game.run, game.rng);
  if (!itemId) return null;
  return { featureIndex: game.rng.int(0, game.features.length - 1), itemId, found: false };
}

// Bell tolls (M2f §4.10): at each of the level's toll times in Combat, a bellToll event (heard as a
// deep bell just before a surge). No gameplay effect.
function updateTolls(game) {
  while (game.tolls.length && game.tolls[0] <= game.combatTime) {
    game.tolls.shift();
    events.emit('bellToll', {});
  }
}

// Equipment HP regen (M2e §2.3, Sap Pendant): druid.regenAmount HP every DRUID_REGEN_INTERVAL of
// Combat, never above his max HP. Nothing happens without it.
function updateDruidRegen(game, dt) {
  const amount = game.stats['druid.regenAmount'];
  if (amount <= 0) return;
  game.regenTimer += dt;
  if (game.regenTimer < C.DRUID_REGEN_INTERVAL - 1e-9) return;
  game.regenTimer -= C.DRUID_REGEN_INTERVAL;
  game.druidHp = Math.min(game.stats['druid.maxHp'], game.druidHp + amount);
}

// Expected number of each enemy type in the level's wave (M1e §3.6, M2a §5.2).
export function waveCounts(game) {
  return game.scene.level.enemyCounts;
}

// M1i §4: Boughs gained (searches and debug G) and spent (net of refunds); Double jobs done.
function emptyDoubleStats() {
  return { boughsGained: 0, boughsSpent: 0, completed: 0, cancelled: 0 };
}

function emptyEnemyCounts() {
  return Object.fromEntries(Object.keys(C.ENEMY_TYPES).map((type) => [type, { spawned: 0, alive: 0, killed: 0 }]));
}

// Victory (M1e §3.6): every enemy of every type has spawned and died.
function allEnemiesDefeated(game) {
  return Object.entries(waveCounts(game)).every(([type, n]) => game.enemyCounts[type].spawned >= n)
    && game.spawnQueues.every((q) => q.spawns.length === 0) // includes debug-queued Bears
    && game.enemies.length === 0;
}

// Combined counts for the HUD and end screen: { total, killed, remaining }.
export function enemyTotals(game) {
  const total = Object.values(waveCounts(game)).reduce((a, b) => a + b, 0);
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
  queueDebugEnemy(game, 'bear');
}

// Debug key O (M2c §4): spawn an Ogre at the start of a random lane. Combat only; nothing but an
// error if the level's corridors are too narrow for it.
export function spawnDebugOgre(game) {
  if (game.state !== GameState.COMBAT) return false;
  const width = corridorWidth(game.scene.level);
  if (!fitsCorridor('ogre', width)) {
    console.error(`${game.levelId}: corridors are ${width} px, too narrow for an Ogre (needs ${2 * C.ENEMY_TYPES.ogre.radius + 2})`);
    return false;
  }
  queueDebugEnemy(game, 'ogre');
  return true;
}

// Debug key G: +DEBUG_GRANT_AMOUNT of each resource.
export function grantResources(game) {
  const n = C.DEBUG_GRANT_AMOUNT;
  const grant = Object.fromEntries(RESOURCE_KEYS.map((k) => [k, n])); // every resource, Boughs too (M1i §1.3)
  add(game.resources, grant);
  game.doubleStats.boughsGained += n;
  // On the map, the grant goes to the carried inventory the next encounter starts with (M2a §3).
  if (game.state === GameState.MAP) add(game.run.inventory, grant);
  // M2d §1.3: the same floaters as any gain, above the Druid (not on the map).
  else addResourceFloaters(game, grant, game.druidPos.x, game.druidPos.y - C.DRUID_RADIUS * 2.2);
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
      updateTolls(game);             // M2f §4.10: a bell toll just before each surge (sound only)
      updateBlocking(game, dt);      // wolves held by landed Vultures (and, if enabled, waiting Squirrels) stop and bite them
      updateSquirrelStrikes(game, dt); // M1h §3: a Squirrel being attacked strikes back
      updateEnemyMovement(game, dt);
      updateTurrets(game, dt);
      updateProjectiles(game, dt);
      updateClouds(game, dt);
      updateVultures(game, dt);
      updateDrops(game, dt);         // drop pop flight (M1g §1); before Squirrels so a just-landed item can be claimed
      updateSquirrels(game, dt);
      updateDoubles(game, dt);       // Bough Double jobs (M1i §2)
      updateMelee(game, dt);
      updateWindupAttacks(game, dt); // the Ogre's wind-up and blow (M2c §2.5), on the Druid or a blocker
      expireVultures(game, dt);
      expireSquirrels(game, dt);
      updateAction(game, dt);
      updateDruidMelee(game, dt);   // after updateAction, so a just-finished upgrade restarts the timer
      updateDruidRegen(game, dt);   // M2e: equipment HP regen
      updateEffects(game, dt);
      checkEndConditions(game);
      break;
    case GameState.ENDING:
      // M1e §1.2: gameplay is frozen; only visual effects keep playing.
      game.endElapsed += dt;
      game.endRemaining -= dt;
      updateSweep(game);             // M2d §2.2: swept items landing on their counters
      updateEffects(game, dt);
      if (game.endRemaining <= 0) finishEnding(game);
      break;
    default:
      break;
  }
}

// Start-up validation of global config (spec §14). Per-level checks, waves included: scene.js validateLevels.
export function validateConfig() {
  if (!Object.values(PrepMode).includes(C.PREP_MODE)) {
    console.error(`PREP_MODE is "${C.PREP_MODE}", expected one of: ${Object.values(PrepMode).join(', ')}`);
  }
}
