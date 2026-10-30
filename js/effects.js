// Short-lived feedback effects (spec §16.3). Aged in simulation time so pause and
// speed apply, but they never affect gameplay.

import * as C from './config.js';
import { RESOURCE_KEYS } from './resources.js';

// small: drawn at a smaller size (damage numbers on enemies). muted: small grey text ("Nothing found").
export function addFloatingText(game, text, x, y, small = false, muted = false) {
  game.floatingTexts.push({ text, x, y, age: 0, small, muted });
}

// Resource floaters (M2d §1), the one component for every resource gain: one rising icon + "×N"
// per resource gained, in resource order, FLOATER_STAGGER apart, each starting FLOATER_STACK_PX
// higher than the last. Zero amounts are not shown; nothing at all shows "Nothing found".
// Returns how many floaters it launched (so others can follow them, M2e §3.2).
export function addResourceFloaters(game, gained, x, y) {
  const found = RESOURCE_KEYS.filter((k) => (gained[k] ?? 0) > 0);
  if (found.length === 0) {
    addFloatingText(game, 'Nothing found', x, y, true, true);
    return 0;
  }
  found.forEach((resource, i) => {
    game.floaters.push({ resource, amount: gained[resource], x, y: y - i * C.FLOATER_STACK_PX, delay: i * C.FLOATER_STAGGER, age: 0 });
  });
  return found.length;
}

export function updateEffects(game, dt) {
  for (const f of game.floaters) f.age += dt;
  if (game.itemMessage) {
    game.itemMessage.age += dt;
    if (game.itemMessage.age >= C.ITEM_FOUND_TIME) game.itemMessage = null;
  }
  game.floaters = game.floaters.filter((f) => f.age < f.delay + C.FLOATER_TIME);
  for (const t of game.floatingTexts) t.age += dt;
  game.floatingTexts = game.floatingTexts.filter((t) => t.age < C.FLOATING_TEXT_TIME);
  for (const s of game.swipes) s.age += dt;
  game.swipes = game.swipes.filter((s) => s.age < C.DRUID_SWIPE_TIME);
  for (const b of game.wispBursts) b.age += dt; // Slow Wisp bursts (M2k §3.5)
  game.wispBursts = game.wispBursts.filter((b) => b.age < C.WISP_BURST_TIME);
  for (const s of game.sparks) s.age += dt;
  game.sparks = game.sparks.filter((s) => s.age < C.STRIKE_SPARK_TIME);
  // Bough Double effects (M1i §2.7): wood chips and Doubles fading out after a job.
  for (const c of game.chips) c.age += dt;
  game.chips = game.chips.filter((c) => c.age < C.DOUBLE_CHIP_TIME);
  for (const f of game.doubleFades) f.age += dt;
  game.doubleFades = game.doubleFades.filter((f) => f.age < C.DOUBLE_FADE_TIME);
  // Mini-boss feedback (M2c §2.5–2.6): dust rings, screen shake, arrival banner, lane pulses.
  for (const d of game.dustRings) d.age += dt;
  game.dustRings = game.dustRings.filter((d) => d.age < C.OGRE_DUST_TIME);
  if (game.shake) {
    game.shake.age += dt;
    if (game.shake.age >= C.OGRE_SHAKE_TIME) game.shake = null;
  }
  if (game.bossAnnouncement) {
    game.bossAnnouncement.age += dt;
    if (game.bossAnnouncement.age >= C.BOSS_BANNER_TIME) game.bossAnnouncement = null;
  }
  for (const p of game.lanePulses) p.age += dt;
  game.lanePulses = game.lanePulses.filter((p) => p.age < C.BOSS_LANE_PULSE_TIME);
}
