// Footstep route preview (M1g §2), replacing the dashed preview line of M1b §5.2.2. Visual only.
// One footprint per step of the travel cost, so the trail itself shows the cost.

import * as C from '../config.js';

const COLORS = {
  print: 'rgba(226, 200, 152, 0.85)',  // soft earthy tone
  printBad: 'rgba(235, 85, 58, 0.9)',  // unaffordable: matches the step bar's red blink
  labelBg: 'rgba(16, 22, 14, 0.85)',
};

// Footprint positions from `from` to the hovered marker at `to`: `cost` prints evenly spaced,
// the last on the edge of the target's footprint circle (not on the object), alternating
// left / right of the line by FOOTPRINT_SIDE_OFFSET and facing the direction of travel.
// fromMarker: the Druid stands on a marker (not at home), so the trail starts at that marker's
// edge too. Returns [{ x, y, angle, side }].
export function footprintLayout(from, to, cost, fromMarker) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const start = fromMarker ? Math.min(C.LOCATION_RADIUS, dist / 2) : 0;
  const end = Math.max(start, dist - C.LOCATION_RADIUS);
  const angle = Math.atan2(uy, ux);
  const prints = [];
  for (let i = 1; i <= cost; i++) {
    const along = start + (end - start) * (i / cost);
    const side = i % 2 === 1 ? -1 : 1; // left, right, left, …
    prints.push({
      x: from.x + ux * along - uy * C.FOOTPRINT_SIDE_OFFSET * side,
      y: from.y + uy * along + ux * C.FOOTPRINT_SIDE_OFFSET * side,
      angle,
      side,
    });
  }
  return prints;
}

// One small footprint (sole + heel), pointing along +x before rotation.
function drawPrint(ctx, p, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.scale(1, p.side); // mirror left and right feet
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(2.5, 0.6, 4.2, 2.6, 0.15, 0, Math.PI * 2); // sole
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-4, 0, 2.4, 2.1, 0, 0, Math.PI * 2); // heel
  ctx.fill();
  ctx.restore();
}

// elapsed: s since the trail started (real time). Prints appear one after another from the
// Druid toward the target, the whole trail complete at FOOTPRINT_REVEAL_TIME; each fades in over
// FOOTPRINT_FADE_TIME. The step-cost label appears beside the last print once the reveal is done.
export function drawFootsteps(ctx, prints, elapsed, cost, affordable) {
  const color = affordable ? COLORS.print : COLORS.printBad;
  const n = prints.length;
  const span = C.FOOTPRINT_REVEAL_TIME - C.FOOTPRINT_FADE_TIME;
  prints.forEach((p, i) => {
    const appear = n > 1 ? span * (i / (n - 1)) : 0;
    const alpha = Math.min(1, Math.max(0, (elapsed - appear) / C.FOOTPRINT_FADE_TIME));
    if (alpha > 0) drawPrint(ctx, p, color, alpha);
  });
  if (elapsed < C.FOOTPRINT_REVEAL_TIME || n === 0) return;

  const last = prints[n - 1];
  const text = `${cost} ${cost === 1 ? 'step' : 'steps'}`;
  // Beside the last print, on the side away from the route.
  const nx = -Math.sin(last.angle) * last.side;
  const ny = Math.cos(last.angle) * last.side;
  ctx.save();
  ctx.font = 'bold 20px Georgia, serif';
  const w = ctx.measureText(text).width + 16;
  const lx = last.x + nx * 26 + (nx >= 0 ? 0 : -w);
  const ly = last.y + ny * 26 - 15;
  ctx.fillStyle = COLORS.labelBg;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(lx, ly, w, 30, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, lx + 8, ly + 16);
  ctx.restore();
}
