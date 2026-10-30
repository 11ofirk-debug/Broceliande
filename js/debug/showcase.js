// Debug Shift+C (Grim look rework): each normal enemy beside its Grim, standing still in a row in
// the middle of the stage, to compare them. They are display figures only, not enemies: never in
// game.enemies, so nothing moves, attacks, targets or counts them. View state, drawing only.

import * as C from '../config.js';
import { AttackState } from '../entities/enemy.js';
import { drawEnemyLook } from '../render/enemyLook.js';

const PAIRS = ['wolf', 'stirge', 'bear', 'ogre']; // each followed by its Grim
const FIRST_ID = 9000; // figure ids (smoke and pulse phases only), clear of real enemy ids

const figure = (type, x, y, id) => ({
  type, x, y, id, radius: C.ENEMY_TYPES[type].radius, facing: 1, stride: 0,
  attack: AttackState.READY, windupElapsed: 0, lastBlowTime: -Infinity,
});

// The row: [{ figure, label }], centred on the stage, feet on one line.
export function buildShowcase() {
  const types = PAIRS.flatMap((base) => [base, ...Object.keys(C.ENEMY_TYPES).filter((t) => t !== base && C.ENEMY_TYPES[t].baseType === base)]);
  const halfWidth = (type) => C.ENEMY_TYPES[type].radius * (C.ENEMY_TYPES[type].drawScale ?? 1) * 1.3;
  let width = 0;
  types.forEach((type, i) => {
    width += 2 * halfWidth(type);
    if (i > 0) width += C.ENEMY_TYPES[type].baseType === type ? C.SHOWCASE_PAIR_GAP : C.SHOWCASE_GAP;
  });
  const groundY = C.STAGE_HEIGHT * 0.55;
  let x = (C.STAGE_WIDTH - width) / 2;
  return types.map((type, i) => {
    if (i > 0) x += C.ENEMY_TYPES[type].baseType === type ? C.SHOWCASE_PAIR_GAP : C.SHOWCASE_GAP;
    const cx = x + halfWidth(type);
    x += 2 * halfWidth(type);
    const r = C.ENEMY_TYPES[type].radius;
    return { figure: figure(type, cx, groundY - r * 0.5, FIRST_ID + i), label: C.ENEMY_TYPES[type].name };
  });
}

// Draws the row on a soft dark band, each figure's name under it.
export function drawShowcase(ctx, showcase, anim) {
  const y = C.STAGE_HEIGHT * 0.55;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 10, 0.55)';
  ctx.fillRect(0, y - 190, C.STAGE_WIDTH, 240);
  ctx.restore();
  for (const { figure: f } of showcase) drawEnemyLook(ctx, f, false, false, anim);
  ctx.save();
  ctx.fillStyle = '#f1e8cc';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  for (const { figure: f, label } of showcase) ctx.fillText(label, f.x, y + 28);
  ctx.restore();
}
