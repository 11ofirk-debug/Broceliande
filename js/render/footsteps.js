// Footprints in step-mode Prep, visual only: the hover route preview (M1g §2, replacing the dashed
// preview line of M1b §5.2.2) and the committed route trail (M1h §1, replacing the solid trail line).
// One footprint per step of the travel cost, so the trail itself shows the cost. The positions
// come from footprintLayout in stepSystem.js.

import * as C from '../config.js';

const COLORS = {
  print: 'rgba(226, 200, 152, 0.85)',  // soft earthy tone
  printBad: 'rgba(235, 85, 58, 0.9)',  // unaffordable: matches the step bar's red blink
  trail: 'rgb(226, 200, 152)',         // committed trail: the same earthy tone, at TRAIL_FOOTPRINT_ALPHA
  labelBg: 'rgba(16, 22, 14, 0.85)',
};

// Committed legs (M1h §1.2): every footprint at once, fainter than the preview, never red.
export function drawTrail(ctx, legs) {
  for (const leg of legs) {
    for (const p of leg) drawPrint(ctx, p, COLORS.trail, C.TRAIL_FOOTPRINT_ALPHA);
  }
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
