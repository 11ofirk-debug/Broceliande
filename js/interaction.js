// Player commands: turns clicks and Esc into Druid actions and menu changes,
// following the start/switch/cancel rules of spec §7.4 and §16.2.
//   - Opening a menu never cancels the current action; confirming a new action does.
//   - Clicking empty ground closes the menu and does not cancel the action.
//   - Esc / right-click: close menu → exit summon placement / Double targeting → cancel timed action.
//     They never cancel a Bough Double's job (only "Cancel job" in the target's menu does, M1i §2.6).

import { GameState, ActionState } from './states.js';
import { pick } from './picking.js';
import {
  startSearch, startBuild, cancelAction, isBuildingSlot,
  startSummonPlacement, exitSummonPlacement, placeSummon, startTravel, isTravelling, SUMMONS,
} from './systems/actionSystem.js';
import { isStepMode, canVisit } from './systems/stepSystem.js';
import { isDoubleTargeting, isDoubleTarget, doubleOnSlot, startDoubleJob, cancelDoubleJob } from './systems/doubleSystem.js';
import { TURRET_TYPE_KEYS } from './entities/turret.js';
import { startCombat } from './game.js';

export function createInteraction(game, view) {
  function closeMenu() {
    view.menu = null;
  }

  function onLeftClick(world) {
    if (game.state !== GameState.PREP && game.state !== GameState.COMBAT) return;
    const hit = pick(game, world);
    // Bough Double targeting (M1i §2.4 step 3): a turret starts its upgrade job at once; an empty
    // slot opens the turret choice. Anything else closes that menu and keeps targeting.
    if (isDoubleTargeting(game)) {
      const target = (hit?.kind === 'turret' || hit?.kind === 'slot') && isDoubleTarget(game, hit.index);
      if (target && hit.kind === 'turret') {
        if (startDoubleJob(game, hit.index)) closeMenu(); // unaffordable: nothing happens
      } else if (target) {
        view.menu = { kind: 'doubleBuild', index: hit.index };
      } else {
        closeMenu();
      }
      return;
    }
    // Summon placement (§15.1): a left-click anywhere on the battlefield places the chosen summon.
    if (game.action.state === ActionState.SUMMON_PLACEMENT) {
      placeSummon(game, world); // ignored on the HUD strip
      return;
    }
    const isPrep = game.state === GameState.PREP;

    // Step-mode Prep (M1b §5.3, M1f §5.2). Clicking a valid, affordable feature travels there and
    // searches on arrival. Clicking a valid, affordable slot opens the build menu (with the travel
    // cost); choosing a turret there travels and builds. Anything else closes the menu at no
    // cost. Input is ignored while travelling.
    if (isPrep && isStepMode(game)) {
      if (isTravelling(game)) return;
      if (hit?.kind === 'slot' && canVisit(game, hit)) view.menu = { kind: 'build', index: hit.index };
      else if (hit?.kind === 'feature' && startTravel(game, hit)) closeMenu();
      else closeMenu();
      return;
    }

    if (hit?.kind === 'feature' && isPrep && !game.features[hit.index].exhausted) {
      // Starting a search confirms a new action, so it also closes any open menu.
      // Clicking the feature already being searched does nothing.
      if (startSearch(game, hit.index)) closeMenu();
      return;
    }
    if (hit?.kind === 'slot' && isPrep) {
      if (!isBuildingSlot(game, hit.index)) view.menu = { kind: 'build', index: hit.index };
      return;
    }
    // Combat (M1i §2.4): clicking a turret, or a slot a Double is building on, opens its info menu
    // (with Cancel job while a Double works there). It never starts a job; an empty slot only
    // shows its hint tooltip.
    if (game.state === GameState.COMBAT && (hit?.kind === 'turret' || (hit?.kind === 'slot' && doubleOnSlot(game, hit.index)))) {
      view.menu = { kind: 'turret', index: hit.index };
      return;
    }
    if (hit?.kind === 'druid') {
      // Druid menu (§15.1): opens whenever he is clicked; greyed out with a reason if he is busy.
      view.menu = { kind: 'summon', index: 0 };
      return;
    }
    // Empty ground, or something not interactive in this phase.
    closeMenu();
  }

  function onEscape() {
    if (game.state === GameState.ENDING) return; // M1e §1.2: input disabled while the battle ends
    if (view.menu) {
      closeMenu(); // closing the turret choice returns to Double targeting
      return;
    }
    if (exitSummonPlacement(game)) return;
    cancelAction(game);
  }

  // option: which of the menu's options was clicked (the Druid menu has one per summon).
  function onMenuAction(option = 0) {
    const menu = view.menu;
    if (!menu) return;
    if (menu.kind === 'build') {
      // One card per turret type (M1f §5.2): build it, or in step mode travel there to build it.
      const type = TURRET_TYPE_KEYS[option];
      const started = isStepMode(game)
        ? startTravel(game, { kind: 'slot', index: menu.index }, type)
        : startBuild(game, menu.index, type);
      if (started) closeMenu();
    }
    // M1i §2.4: the turret choice for a Double's build job.
    if (menu.kind === 'doubleBuild' && startDoubleJob(game, menu.index, TURRET_TYPE_KEYS[option])) closeMenu();
    // M1i §2.6: the turret menu's first card is "Cancel job" while a Double works there.
    if (menu.kind === 'turret' && option === 0 && cancelDoubleJob(game, menu.index)) closeMenu();
    if (menu.kind === 'summon' && startSummonPlacement(game, Object.keys(SUMMONS)[option])) closeMenu();
  }

  // Start Combat / Start Battle button. Ignored mid-travel so a paid move always lands.
  function onStartCombat() {
    if (!isTravelling(game)) startCombat(game);
  }

  return { onLeftClick, onEscape, onMenuAction, onStartCombat, closeMenu };
}

// Whether the hovered object reacts to a click right now (for the pointer cursor).
export function isInteractive(game, hover) {
  if (!hover) return false;
  if (game.state === GameState.COMBAT) {
    if (isDoubleTargeting(game)) return (hover.kind === 'turret' || hover.kind === 'slot') && isDoubleTarget(game, hover.index);
    if (hover.kind === 'druid' || hover.kind === 'turret') return true;
    return hover.kind === 'slot' && doubleOnSlot(game, hover.index) !== null;
  }
  if (game.state !== GameState.PREP) return false;
  if (isStepMode(game)) return !isTravelling(game) && canVisit(game, hover);
  if (hover.kind === 'feature') return !game.features[hover.index].exhausted;
  if (hover.kind === 'slot') return !isBuildingSlot(game, hover.index);
  return false;
}
