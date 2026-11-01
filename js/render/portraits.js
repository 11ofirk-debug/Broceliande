// Menu portraits (M1f §1–2): small <canvas> images of entities for HTML menus, drawn with the
// same draw functions as the battlefield (no menu-only artwork). Each portrait is rendered once
// into a cached bitmap, cropped to what the draw function actually painted; menus get a cheap
// copy of that bitmap.

import * as C from '../config.js';
import { drawVulture, drawSquirrel, drawTurretSlot, drawTurret, drawToader, drawDruid, DRUID_REST_POSE } from './entities.js';
import { drawCinderjaw } from './cinderjaw.js';
import { drawEnemyLook } from './enemyLook.js';
import { drawWisp } from './wisp.js';

const SCRATCH = 240;   // px, scratch canvas the entity is first drawn on
const RESOLUTION = 2;  // bitmap pixels per CSS pixel, so portraits stay sharp when the stage scales
const PAD = 1;         // px of margin inside the portrait

// A resting enemy for its portrait (wave preview, M2i §4.2): just what the draw functions read.
const restingEnemy = (type, x, y) => ({ x, y, type, radius: C.ENEMY_TYPES[type].radius, facing: 1, id: 0, stride: 0, attack: null, lastBlowTime: -Infinity, windupElapsed: 0 });

function designSize(draw) {
  return (ctx, x, y) => {
    const s = 1 / C.SPOT_SCALE;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.translate(-x, -y);
    draw(ctx, x, y);
    ctx.restore();
  };
}

// How each portrait is drawn: an entity's own draw function, in a neutral resting pose.
const PORTRAIT_DRAW = {
  vulture: (ctx, x, y) => drawVulture(ctx, { x, y, state: 'LANDED', facing: 1, id: 0 }, 0, false, false),
  squirrel: (ctx, x, y) => drawSquirrel(ctx, { x, y, state: 'WAITING', facing: 1, id: 0, stride: 0 }, 0, false),
  // Bough Double (M1i §2.7): the Druid's drawing, monochrome brown and translucent.
  double: (ctx, x, y) => drawDruid(ctx, x, y, false, 0, DRUID_REST_POSE, { tint: C.DOUBLE_TINT, alpha: C.DOUBLE_ALPHA }),
  // Slow Wisp (M2k §3.2): its orb, as in flight.
  slowWisp: (ctx, x, y) => drawWisp(ctx, { x, y, from: { x, y }, to: { x, y }, age: 0 }),
  // Turrets on their slot pad, level 1 (M1f §5.2 build menu), at their design size (the
  // battlefield scales spot art by SPOT_SCALE; the portrait undoes it).
  sprinkler: designSize((ctx, x, y) => {
    drawTurretSlot(ctx, { x, y }, false, false);
    drawTurret(ctx, { x, y, level: 1, angle: -0.5 }, false);
  }),
  toader: designSize((ctx, x, y) => {
    drawTurretSlot(ctx, { x, y }, false, false);
    drawToader(ctx, { x, y }, false, 0);
  }),
  cinderjaw: designSize((ctx, x, y) => { // M2o §4.1
    drawTurretSlot(ctx, { x, y }, false, false);
    drawCinderjaw(ctx, { x, y, level: 1, angle: -0.3, lastFireTime: -Infinity }, false, 1);
  }),
};

// Enemies (M2i §4.2) with their battlefield look, a Grim's outline, cracks and features included
// (M2l §2.1); not its smoke, which would only make the cropped icon smaller.
const enemyPortrait = (kind) => (ctx, x, y) => drawEnemyLook(ctx, restingEnemy(kind, x, y), false, false, 0, { smoke: false });

const cache = new Map();

// Render once: draw on a scratch canvas, find the painted bounding box, fit it into a
// MENU_PORTRAIT_SIZE square.
function renderBitmap(kind) {
  const scratch = document.createElement('canvas');
  scratch.width = SCRATCH;
  scratch.height = SCRATCH;
  const sctx = scratch.getContext('2d');
  (PORTRAIT_DRAW[kind] ?? enemyPortrait(kind))(sctx, SCRATCH / 2, SCRATCH * 0.6);
  const { data } = sctx.getImageData(0, 0, SCRATCH, SCRATCH);
  let x0 = SCRATCH, y0 = SCRATCH, x1 = 0, y1 = 0;
  for (let y = 0; y < SCRATCH; y++) {
    for (let x = 0; x < SCRATCH; x++) {
      if (data[(y * SCRATCH + x) * 4 + 3] > 8) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
  }
  const size = C.MENU_PORTRAIT_SIZE * RESOLUTION;
  const bitmap = document.createElement('canvas');
  bitmap.width = size;
  bitmap.height = size;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const k = Math.min((size - PAD * 2 * RESOLUTION) / w, (size - PAD * 2 * RESOLUTION) / h);
  bitmap.getContext('2d').drawImage(scratch, x0, y0, w, h, (size - w * k) / 2, (size - h * k) / 2, w * k, h * k);
  return bitmap;
}

// A new <canvas> of size px (MENU_PORTRAIT_SIZE by default) showing the entity, copied from the
// cached rendering.
export function portraitCanvas(kind, size = C.MENU_PORTRAIT_SIZE) {
  if (!cache.has(kind)) cache.set(kind, renderBitmap(kind));
  const bitmap = cache.get(kind);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.className = 'menu-portrait';
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  return canvas;
}
