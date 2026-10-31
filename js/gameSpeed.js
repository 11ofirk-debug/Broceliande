// Player game speed (M2k §1, M2m §1): ×1 / ×2 / ×4, chosen with the HUD buttons or keys 1 / 2 / 4
// in Combat. The choice holds through a battle's waves and gaps; every battle's Combat starts at
// ×1 and nothing is remembered between battles or sessions. Outside Combat (Prep, ENDING,
// overlays, the map) the game runs at ×1; main.js applies that. UI-only state: the simulation
// never reads it.

import * as C from './config.js';

let chosen = 1;

export function chosenSpeed() {
  return chosen;
}

export function setChosenSpeed(speed) {
  if (C.SIM_SPEEDS.includes(speed)) chosen = speed;
}

// Back to ×1: whenever the game is outside Combat, and when an encounter (re)starts (M2m §1).
export function resetChosenSpeed() {
  chosen = 1;
}
