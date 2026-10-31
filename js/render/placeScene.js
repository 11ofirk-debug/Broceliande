// Place scene template (M2n §1): every non-combat map node opens a full-screen scene of that
// place, drawn in the same layers so a future rest site or shrine can reuse it:
//   1. background: the place's palette, a forest band at the back, an open clearing in front,
//      trees and bushes from the shared decoration drawing (environment.js);
//   2. props: the place's own objects (a callback, e.g. the trader's cart and campfire);
//   3. characters: the Druid on the left, the host on the right (callbacks), at PLACE_SCENE;
//      then a foreground callback for anything in front of them;
//   4. the interaction area is HTML over the canvas (e.g. traderScreen.js).
// Each layer keeps to its zone, so sprites can replace the placeholder art later.

import * as C from '../config.js';
import { createRng } from '../rng.js';
import { drawDecor } from './environment.js';
import { drawDruid, DRUID_REST_POSE } from './entities.js';

const backdrops = new Map(); // place id → its decoration list, built once (visual only)

// The background decoration: big trees along the clearing's back edge and bushes on its sides,
// from a fixed seed so the place looks the same every visit.
function backdropOf(placeId) {
  if (backdrops.has(placeId)) return backdrops.get(placeId);
  const S = C.PLACE_SCENE;
  const rng = createRng(S.decorSeed);
  const items = [];
  for (let i = 0; i < S.backTrees; i++) {
    const x = (i + 0.5) * (C.STAGE_WIDTH / S.backTrees) + rng.range(-40, 40);
    items.push({ kind: 'tree', x, y: S.horizonY + rng.range(-30, 25), size: rng.range(2.2, 3), variant: rng.int(0, 2) });
  }
  for (let i = 0; i < S.sideBushes; i++) {
    const left = i % 2 === 0;
    const x = left ? rng.range(20, 160) : C.STAGE_WIDTH - rng.range(20, 160);
    items.push({ kind: 'bush', x, y: rng.range(S.horizonY + 60, C.STAGE_HEIGHT - 40), size: rng.range(1.8, 2.6), variant: 0 });
  }
  items.sort((a, b) => a.y - b.y);
  backdrops.set(placeId, items);
  return items;
}

// Draws a place scene. place: { id (its PLACE_PALETTE key), drawProps(ctx, t), drawHost(ctx, x, y, t),
// drawDruidExtras(ctx, x, y, t), drawForeground(ctx, t) }, all optional but id. The character callbacks
// draw at unscaled size about the feet point (x, y). t: animation time, s.
export function drawPlaceScene(ctx, place, t) {
  const P = C.PLACE_PALETTE[place.id];
  const S = C.PLACE_SCENE;
  const level = { palette: P }; // what the decoration drawing expects

  // Background: forest floor, the darker forest band at the back, the clearing.
  ctx.fillStyle = P.floor;
  ctx.fillRect(0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);
  ctx.fillStyle = P.floorAccent.dark;
  ctx.fillRect(0, 0, C.STAGE_WIDTH, S.horizonY);
  const c = S.clearing;
  ctx.fillStyle = P.corridorEdge;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, c.rx + 14, c.ry + 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.corridor.base;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.corridor.worn;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 40, c.rx * 0.6, c.ry * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const item of backdropOf(place.id)) drawDecor(ctx, item, level);

  // Props, then the two characters.
  place.drawProps?.(ctx, t);
  const d = S.druid;
  withScale(ctx, d.x, d.y, d.scale, () => {
    drawDruid(ctx, d.x, d.y - C.DRUID_RADIUS * 0.6, false, 0, DRUID_REST_POSE);
    place.drawDruidExtras?.(ctx, d.x, d.y, t);
  });
  const h = S.host;
  withScale(ctx, h.x, h.y, h.scale, () => place.drawHost?.(ctx, h.x, h.y, t));
  place.drawForeground?.(ctx, t); // in front of the characters (the trader's blanket, the scale)
}

// Draws at `scale` about the feet point (x, y), so callbacks use unscaled sizes.
function withScale(ctx, x, y, scale, draw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y);
  draw();
  ctx.restore();
}
