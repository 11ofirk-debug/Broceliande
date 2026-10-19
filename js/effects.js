// Short-lived feedback effects (spec §16.3). Aged in simulation time so pause and
// speed apply, but they never affect gameplay.

import * as C from './config.js';

export function addFloatingText(game, text, x, y) {
  game.floatingTexts.push({ text, x, y, age: 0 });
}

export function updateEffects(game, dt) {
  for (const t of game.floatingTexts) t.age += dt;
  game.floatingTexts = game.floatingTexts.filter((t) => t.age < C.FLOATING_TEXT_TIME);
}
