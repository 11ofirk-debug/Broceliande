// Player game speed (M2k §1): ×1 / ×2 / ×4, chosen with the HUD buttons or keys 1 / 2 / 4 in
// Combat. The choice carries over between battles and is remembered in localStorage, like the
// mute setting. Outside Combat (Prep, ENDING, overlays, the map) the game runs at ×1; main.js
// applies that. UI-only state: the simulation never reads it.

import * as C from './config.js';

function load() {
  try {
    const speed = Number(localStorage.getItem(C.GAME_SPEED_KEY));
    return C.SIM_SPEEDS.includes(speed) ? speed : 1;
  } catch {
    return 1;
  }
}

let chosen = load();

export function chosenSpeed() {
  return chosen;
}

export function setChosenSpeed(speed) {
  if (!C.SIM_SPEEDS.includes(speed)) return;
  chosen = speed;
  try {
    localStorage.setItem(C.GAME_SPEED_KEY, String(speed));
  } catch {
    // storage unavailable: the choice still holds for this page
  }
}
