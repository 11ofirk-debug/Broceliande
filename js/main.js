// Bootstrap, stage scaling and the fixed-timestep loop (spec §3.4, §3.5).

import * as C from './config.js';
import { GameState, createGame, startEncounter, startCombat, beginEnding, updateGame, validateConfig, killAllEnemies, spawnDebugBear, spawnDebugOgre, grantResources, togglePrepMode, newRun, restartEncounter, continueRun, winNow } from './game.js';
import { createInput } from './input.js';
import { createRenderer } from './renderer.js';
import { createUI, checkLevelNameLabel, checkBossBar } from './ui.js';
import { LEVEL_IDS, sceneFor, validateLevels } from './scene.js';
import { createInteraction, isInteractive } from './interaction.js';
import { pick } from './picking.js';
import { ActionState } from './states.js';
import { undoLastMove } from './systems/actionSystem.js';
import { toggleDropMult } from './systems/dropSystem.js';
import { initAudio, toggleMute } from './audio.js';
import { isRunComplete, mapNode, availableNodeAt, validateMap, addItem, equipItem, unequipSlot, randomUnownedItem, markSlotSeen } from './run.js';
import { createEquipmentPanel } from './equipmentPanel.js';
import { validateItems } from './stats.js';
import { createRng } from './rng.js';
import { events } from './events.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('game-canvas');

// ---------------------------------------------------------------------------
// Stage scaling: fixed 1920×1080 stage, CSS-scaled and letterboxed to 16:9.
// ---------------------------------------------------------------------------
let scale = 1;

function fitStage() {
  scale = Math.min(window.innerWidth / C.STAGE_WIDTH, window.innerHeight / C.STAGE_HEIGHT);
  const left = (window.innerWidth - C.STAGE_WIDTH * scale) / 2;
  const top = (window.innerHeight - C.STAGE_HEIGHT * scale) / 2;
  stage.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
}

stage.style.width = `${C.STAGE_WIDTH}px`;
stage.style.height = `${C.STAGE_HEIGHT}px`;
window.addEventListener('resize', fitStage);
fitStage();

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
validateConfig();

validateLevels(); // every level's scene checks (M2a §5.1)
validateMap();    // MAP_NODES links and levels (M2a §4.1)
validateItems();  // ITEMS slots, stats and ops (M2e §2)

const game = createGame(mapNode(C.MAP_START_NODE).levelId);
const clock = { speed: 1, paused: false };            // acts on simulation time only
// UI-only state: never read by the simulation.
const view = { debug: C.DEBUG_START_ENABLED, revealItem: false, clickMarker: null, fps: 0, hover: null, menu: null, pointer: null, menuHoverType: null, mapHover: null }; // menuHoverType: build-menu card under the pointer (range preview); mapHover: available map node under the pointer
const interaction = createInteraction(game, view);

// UI state to clear whenever an encounter (re)starts or the map opens.
function afterRestart() {
  view.clickMarker = null;
  view.mapHover = null;
  interaction.closeMenu();
}

// options.newSeed: always a new seed, so a new layout even with DEBUG_SEED set (debug L).
function restart(options) {
  startEncounter(game, options);
  afterRestart();
}

// Start again / Shift+R (M2a §2.1, §8): a new run on the map.
function startNewRun() {
  newRun(game);
  afterRestart();
}

// The Victory / Defeat overlay's button (M2a §4.4): Continue back to the map while the run goes
// on, otherwise Start again.
function endButton() {
  const goOn = game.state === GameState.VICTORY && !isRunComplete(game.run);
  if (goOn) continueRun(game);
  else startNewRun();
  afterRestart();
}

// Debug [ / ] (M2a §8): jump to the previous / next level in LEVELS, starting its Prep with the
// resources the player has now. The run treats it as entering that level's map node, if any.
function switchLevel(step) {
  const i = LEVEL_IDS.indexOf(game.levelId);
  const levelId = LEVEL_IDS[(i + step + LEVEL_IDS.length) % LEVEL_IDS.length];
  const node = C.MAP_NODES.find((n) => n.levelId === levelId);
  if (node) game.run.currentNodeId = node.id;
  game.encounterStart = { levelId, resources: { ...game.resources } };
  restart(game.encounterStart);
}

initAudio(); // M1g §3: subscribes to gameplay events; starts on the first click or key press

const renderer = createRenderer(canvas);
const ui = createUI({
  onStartCombat: () => interaction.onStartCombat(),
  onEndButton: endButton,
  onMenuAction: (option) => interaction.onMenuAction(option),
  onToggleMute: toggleMute,
});
checkLevelNameLabel(LEVEL_IDS.map(sceneFor)); // M2a §6: the label must not cover a candidate in any level
checkBossBar(LEVEL_IDS.map(sceneFor));        // M2c §2.7: nor may the boss HP bar
// Equipment panel on the map (M2e §4): equipping is free and only possible there, between battles.
const equipPanel = createEquipmentPanel({
  onEquip: (itemId) => equipItem(game.run, itemId),
  onUnequip: (slot) => unequipSlot(game.run, slot),
  onSlotViewed: (slot) => markSlotSeen(game.run, slot),
});

const input = createInput(stage, canvas, () => scale, {
  onPointerDown(world, button) {
    if (button === 0) {
      view.clickMarker = world;
      interaction.onLeftClick(world);
    } else if (button === 2) {
      interaction.onEscape();
    }
  },
  onKeyDown(key, e) {
    switch (key) {
      case 'd': view.debug = !view.debug; break;
      case 'p': clock.paused = !clock.paused; break;
      case '1': case '2': case '4':
        if (C.SIM_SPEEDS.includes(Number(key))) clock.speed = Number(key);
        break;
      case 'n': if (game.state === GameState.PREP) startCombat(game); break;
      case 'r': if (e.shiftKey) startNewRun(); else if (game.state !== GameState.MAP) { restartEncounter(game); afterRestart(); } break; // M2a §8: R this encounter again, Shift+R a new run
      case 'w': winNow(game); break;                    // M2a §8: win the battle now (Combat only)
      case 'l': if (game.state !== GameState.MAP) restart({ newSeed: true }); break; // M1c §6.1: restart with a new layout
      case 'm': // M1b §2: switch timed / steps Prep, then restart this encounter
        togglePrepMode(game);
        if (game.state !== GameState.MAP) { restartEncounter(game); afterRestart(); }
        break;
      case 'u': undoLastMove(game); break;              // M1b §8: undo last step-mode move
      case 'k': killAllEnemies(game); break; // extra debug key (not in §18.1): kill all living enemies
      case 'b': spawnDebugBear(game); break;  // M1e §6: spawn a Bear at the start of a random lane (Combat only)
      case 'o': spawnDebugOgre(game); break;  // M2c §4: spawn an Ogre likewise (an error if the corridors are too narrow)
      case '[': switchLevel(-1); break;                 // M2a §8: previous / next level in LEVELS,
      case ']': switchLevel(1); break;                  //   starting its Prep with the current resources
      case 'g': grantResources(game); break;
      case 'v': toggleMute(); break;                    // M1g §3.6: mute / unmute sound
      case 'x': toggleDropMult(game); break;            // M1d §3: enemy drop chances ×1 / ×DEBUG_DROP_MULT
      case 'i': // M2e §6: on the map, add a random unowned item; in battle, reveal the hidden item's spot (debug overlay)
        if (game.state === GameState.MAP) debugAddItem();
        else view.revealItem = !view.revealItem;
        break;
      case 'Escape': interaction.onEscape(); break;
      default: break;
    }
  },
});

// Temporary console hook so VICTORY/DEFEAT and Restart can be tested before wolves exist:
//   broceliande.forceEnd('VICTORY')  /  broceliande.forceEnd('DEFEAT')
window.broceliande = {
  game,
  forceEnd: (result) => beginEnding(game, result),
  // Temporary equipment helpers (M2e E1, until the map's equipment panel exists):
  //   broceliande.equip('talonCrown')  — adds the item to the run if needed and equips it
  //   broceliande.unequip('crown')     — empties a slot
  // Equipment applies from the next battle that starts (stats are resolved at its start).
  equip: (itemId) => { addItem(game.run, itemId); return equipItem(game.run, itemId); },
  unequip: (slot) => unequipSlot(game.run, slot),
};

// Debug key I on the map (M2e §6): a random unowned item joins the run (seeded from the run seed).
function debugAddItem() {
  if (game.state !== GameState.MAP) return;
  const id = randomUnownedItem(game.run, createRng(game.run.seed + 7919 * (game.run.items.length + 1)));
  if (id) addItem(game.run, id);
}

newRun(game); // START → MAP on page load (M2a §2.1)

// ---------------------------------------------------------------------------
// Loop: fixed simulation step via accumulator, one render per animation frame.
// ---------------------------------------------------------------------------
let lastTime = performance.now();
let accumulator = 0;

function frame(now) {
  const realDt = Math.min((now - lastTime) / 1000, C.MAX_FRAME_DT);
  lastTime = now;
  if (realDt > 0) view.fps = view.fps * 0.9 + (1 / realDt) * 0.1;

  if (!clock.paused) accumulator += realDt * clock.speed;

  let steps = 0;
  while (accumulator >= C.SIM_STEP && steps < C.MAX_STEPS_PER_FRAME) {
    updateGame(game, C.SIM_STEP);
    accumulator -= C.SIM_STEP;
    steps++;
  }
  if (steps === C.MAX_STEPS_PER_FRAME) accumulator = 0; // drop backlog rather than spiral

  // Hover is re-picked every frame so it stays correct when objects change under a still cursor.
  view.pointer = input.mouse.inside ? { x: input.mouse.x, y: input.mouse.y } : null;
  if (game.state === GameState.MAP) {
    // Map (M2a §4.3): the available node under the pointer, with a soft tick on entering one.
    view.hover = null;
    const mapHover = input.mouse.inside ? availableNodeAt(game.run, input.mouse) : null;
    if (mapHover && mapHover !== view.mapHover) events.emit('mapNodeHover', { nodeId: mapHover });
    view.mapHover = mapHover;
    canvas.style.cursor = mapHover ? 'pointer' : 'default';
  } else {
    view.mapHover = null;
    view.hover = input.mouse.inside ? pick(game, input.mouse) : null;
    // Placement: crosshair, except over a valid Bough Double target (pointer).
    const placing = game.action.state === ActionState.SUMMON_PLACEMENT;
    const interactive = isInteractive(game, view.hover) && (!placing || game.action.target === 'double');
    canvas.style.cursor = interactive ? 'pointer' : placing ? 'crosshair' : 'default';
  }

  // M2d §2.2: HUD counter positions for the field sweep, measured at the start of each sweep.
  view.resourceTargets = game.sweep ? (view.resourceTargets ?? ui.resourceTargets()) : null;
  renderer.render(game, view);
  ui.update(game, clock, view);
  equipPanel.update(game);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
