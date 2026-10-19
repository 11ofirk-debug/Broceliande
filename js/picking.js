// Which world object is under a point (for clicks, hover and tooltips). Read-only.

import * as C from './config.js';
import { turretOnSlot } from './systems/buildSystem.js';
import { druidDisplayPos } from './systems/actionSystem.js';
import { GameState } from './states.js';

// Features are drawn upright above their base point, so the hit area is an
// ellipse covering the base and the body.
function hitsFeature(f, p) {
  const R = C.FEATURE_RADIUS;
  const dx = (p.x - f.x) / R;
  const dy = (p.y - (f.y - R * 0.5)) / (R * 1.25);
  return dx * dx + dy * dy <= 1;
}

// Slots are flat pads (drawn as a squashed ellipse); a built turret also stands up from it.
function hitsSlot(slot, p, hasTurret) {
  const R = C.TURRET_SLOT_RADIUS;
  const cy = hasTurret ? slot.y - R * 0.6 : slot.y;
  const ry = hasTurret ? R * 1.4 : R * 0.8;
  const dx = (p.x - slot.x) / R;
  const dy = (p.y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

// The Druid is drawn upright around his display position.
function hitsDruid(d, p) {
  const R = C.DRUID_RADIUS;
  const dx = (p.x - d.x) / (R * 0.9);
  const dy = (p.y - (d.y - R * 0.6)) / (R * 1.5);
  return dx * dx + dy * dy <= 1;
}

// Returns { kind: 'feature' | 'slot' | 'turret' | 'druid', index } or null. Lower objects win
// ties, matching y-sorted drawing (the one in front is picked).
export function pick(game, p) {
  if (p.y < C.HUD_STRIP_HEIGHT) return null;
  let best = null;
  game.features.forEach((f, index) => {
    if (hitsFeature(f, p) && (!best || f.y > best.y)) best = { kind: 'feature', index, y: f.y };
  });
  C.TURRET_SLOTS.forEach((slot, index) => {
    const turret = turretOnSlot(game, index);
    if (hitsSlot(slot, p, !!turret) && (!best || slot.y > best.y)) {
      best = { kind: turret ? 'turret' : 'slot', index, y: slot.y };
    }
  });
  // The Druid is only clickable in Combat (summon menu), so in Prep he never hides a feature.
  const druid = druidDisplayPos(game);
  if (game.state === GameState.COMBAT && hitsDruid(druid, p) && (!best || druid.y >= best.y)) {
    best = { kind: 'druid', index: 0, y: druid.y };
  }
  return best && { kind: best.kind, index: best.index };
}
