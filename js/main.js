// Bootstrap, stage scaling and the fixed-timestep loop (spec §3.4, §3.5).

import * as C from './config.js';
import { GameState, createGame, startEncounter, startCombat, endEncounter, updateGame, validateConfig, killAllWolves, grantResources, togglePrepMode } from './game.js';
import { createInput } from './input.js';
import { createRenderer } from './renderer.js';
import { createUI } from './ui.js';
import { createScene, validateLayout } from './scene.js';
import { createInteraction, isInteractive } from './interaction.js';
import { pick } from './picking.js';
import { ActionState } from './states.js';
import { undoLastMove } from './systems/actionSystem.js';

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

const scene = createScene();   // static layout: lane paths, decorative forest
validateLayout(scene);

const game = createGame(scene);
const clock = { speed: 1, paused: false };            // acts on simulation time only
// UI-only state: never read by the simulation.
const view = { debug: C.DEBUG_START_ENABLED, clickMarker: null, fps: 0, hover: null, menu: null, pointer: null };
const interaction = createInteraction(game, view);

// options.newSeed: always a new seed, so a new layout even with DEBUG_SEED set (debug L).
function restart(options) {
  startEncounter(game, options);
  view.clickMarker = null;
  interaction.closeMenu();
}

const renderer = createRenderer(canvas, scene);
const ui = createUI(scene, {
  onStartCombat: () => interaction.onStartCombat(),
  onRestart: restart,
  onMenuAction: () => interaction.onMenuAction(),
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
  onKeyDown(key) {
    switch (key) {
      case 'd': view.debug = !view.debug; break;
      case 'p': clock.paused = !clock.paused; break;
      case '1': case '2': case '4':
        if (C.SIM_SPEEDS.includes(Number(key))) clock.speed = Number(key);
        break;
      case 'n': if (game.state === GameState.PREP) startCombat(game); break;
      case 'r': restart(); break;
      case 'l': restart({ newSeed: true }); break;      // M1c §6.1: restart with a new layout
      case 'm': togglePrepMode(game); restart(); break; // M1b §2: switch timed / steps Prep
      case 'u': undoLastMove(game); break;              // M1b §8: undo last step-mode move
      case 'k': killAllWolves(game); break; // extra debug key (not in §18.1): kill all living wolves
      case 'g': grantResources(game); break;
      case 'Escape': interaction.onEscape(); break;
      default: break;
    }
  },
});

// Temporary console hook so VICTORY/DEFEAT and Restart can be tested before wolves exist:
//   broceliande.forceEnd('VICTORY')  /  broceliande.forceEnd('DEFEAT')
window.broceliande = { game, forceEnd: (result) => endEncounter(game, result) };

startEncounter(game); // START → PREP on page load

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
  view.hover = input.mouse.inside ? pick(game, input.mouse) : null;
  canvas.style.cursor = game.action.state === ActionState.SUMMON_PLACEMENT
    ? 'crosshair'
    : isInteractive(game, view.hover) ? 'pointer' : 'default';

  renderer.render(game, view);
  ui.update(game, clock, view);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
