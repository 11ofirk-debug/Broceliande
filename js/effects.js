// Short-lived feedback effects (spec §16.3). Aged in simulation time so pause and
// speed apply, but they never affect gameplay.

import * as C from './config.js';

// small: drawn at a smaller size (Squirrel pickups, M1d §1.4).
export function addFloatingText(game, text, x, y, small = false) {
  game.floatingTexts.push({ text, x, y, age: 0, small });
}

export function updateEffects(game, dt) {
  for (const t of game.floatingTexts) t.age += dt;
  game.floatingTexts = game.floatingTexts.filter((t) => t.age < C.FLOATING_TEXT_TIME);
  for (const s of game.swipes) s.age += dt;
  game.swipes = game.swipes.filter((s) => s.age < C.DRUID_SWIPE_TIME);
  for (const s of game.sparks) s.age += dt;
  game.sparks = game.sparks.filter((s) => s.age < C.STRIKE_SPARK_TIME);
  // Bough Double effects (M1i §2.7): wood chips and Doubles fading out after a job.
  for (const c of game.chips) c.age += dt;
  game.chips = game.chips.filter((c) => c.age < C.DOUBLE_CHIP_TIME);
  for (const f of game.doubleFades) f.age += dt;
  game.doubleFades = game.doubleFades.filter((f) => f.age < C.DOUBLE_FADE_TIME);
}
