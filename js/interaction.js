// Player commands: turns clicks and Esc into Druid actions and menu changes,
// following the start/switch/cancel rules of spec §7.4 and §16.2.
//   - Opening a menu never cancels the current action; confirming a new action does.
//   - Clicking empty ground closes the menu and does not cancel the action.
//   - Esc / right-click: close menu → exit summon placement → cancel timed action.

import { GameState, ActionState } from './states.js';
import { pick } from './picking.js';
import {
  startSearch, startBuild, startUpgrade, cancelAction, isBuildingSlot, isUpgradingSlot,
  startSummonPlacement, exitSummonPlacement, placeVulture,
} from './systems/actionSystem.js';

export function createInteraction(game, view) {
  function closeMenu() {
    view.menu = null;
  }

  function onLeftClick(world) {
    if (game.state !== GameState.PREP && game.state !== GameState.COMBAT) return;
    // Summon placement (§15.1): a left-click anywhere on the battlefield places the Vulture.
    if (game.action.state === ActionState.SUMMON_PLACEMENT) {
      placeVulture(game, world); // ignored on the HUD strip
      return;
    }
    const hit = pick(game, world);
    const isPrep = game.state === GameState.PREP;

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
    if (hit?.kind === 'turret' && game.state === GameState.COMBAT) {
      // Turret menu (§11.1). Clicking the turret currently being upgraded does nothing.
      if (!isUpgradingSlot(game, hit.index)) view.menu = { kind: 'upgrade', index: hit.index };
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
    if (view.menu) {
      closeMenu();
      return;
    }
    if (exitSummonPlacement(game)) return;
    cancelAction(game);
  }

  function onMenuAction() {
    const menu = view.menu;
    if (!menu) return;
    if (menu.kind === 'build' && startBuild(game, menu.index)) closeMenu();
    if (menu.kind === 'upgrade' && startUpgrade(game, menu.index)) closeMenu();
    if (menu.kind === 'summon' && startSummonPlacement(game)) closeMenu();
  }

  return { onLeftClick, onEscape, onMenuAction, closeMenu };
}

// Whether the hovered object reacts to a click right now (for the pointer cursor).
export function isInteractive(game, hover) {
  if (!hover) return false;
  if (game.state === GameState.COMBAT) {
    if (hover.kind === 'druid') return true;
    return hover.kind === 'turret' && !isUpgradingSlot(game, hover.index);
  }
  if (game.state !== GameState.PREP) return false;
  if (hover.kind === 'feature') return !game.features[hover.index].exhausted;
  if (hover.kind === 'slot') return !isBuildingSlot(game, hover.index);
  return false;
}
