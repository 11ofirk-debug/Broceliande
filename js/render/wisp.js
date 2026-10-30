// Slow Wisp drawing (M2k §3.5): the orb with its lazy spiralling trail, its target marker while it
// travels, the burst, the placement ghost, and the look of a slowed enemy (tint and spiral).

import * as C from '../config.js';

const TAU = Math.PI * 2;

// The lazy spiral the orb drifts along: an offset that turns slowly round its straight path.
function wobble(age) {
  const a = age * C.WISP_SPIRAL_RATE;
  return { x: Math.cos(a) * C.WISP_SPIRAL_RADIUS, y: Math.sin(a) * C.WISP_SPIRAL_RADIUS * 0.6 };
}

function orb(ctx, x, y, r, alpha) {
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.3, C.WISP_COLOR);
  g.addColorStop(1, 'rgba(190, 215, 245, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, TAU);
  ctx.fill();
}

// Position along its path `back` s ago (straight from `from`, plus the wobble then).
function pastPos(w, back) {
  const age = Math.max(0, w.age - back);
  const dx = w.to.x - w.from.x;
  const dy = w.to.y - w.from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, (age * C.WISP_SPEED) / dist);
  const o = wobble(age);
  return { x: w.from.x + dx * k + o.x, y: w.from.y + dy * k + o.y };
}

// A Wisp in flight: a short fading trail of past positions, then the orb.
export function drawWisp(ctx, w) {
  ctx.save();
  for (let i = C.WISP_TRAIL_POINTS; i >= 1; i--) {
    if (w.age < i * C.WISP_TRAIL_SPACING) continue;
    const p = pastPos(w, i * C.WISP_TRAIL_SPACING);
    const k = 1 - i / (C.WISP_TRAIL_POINTS + 1);
    orb(ctx, p.x, p.y, C.WISP_RADIUS * (0.25 + 0.45 * k), 0.45 * k);
  }
  const o = wobble(w.age);
  orb(ctx, w.x + o.x, w.y + o.y, C.WISP_RADIUS, 1);
  ctx.restore();
}

// The burst radius as a faint dashed silver-blue circle (the target marker and the ghost).
function radiusCircle(ctx, x, y, alpha) {
  ctx.save();
  ctx.strokeStyle = C.WISP_COLOR;
  ctx.fillStyle = 'rgba(190, 215, 245, 0.08)';
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(x, y, C.WISP_BURST_RADIUS, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// While it travels (M2k §3.3): a faint dotted line from the Wisp to its point and the radius there.
export function drawWispTarget(ctx, w) {
  ctx.save();
  ctx.strokeStyle = C.WISP_COLOR;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  ctx.moveTo(w.x, w.y);
  ctx.lineTo(w.to.x, w.to.y);
  ctx.stroke();
  ctx.restore();
  radiusCircle(ctx, w.to.x, w.to.y, 0.6);
}

// Placement ghost (M2k §3.2): the burst radius round the cursor, and the orb at its centre.
export function drawWispGhost(ctx, p, t) {
  radiusCircle(ctx, p.x, p.y, 0.9);
  ctx.save();
  orb(ctx, p.x + Math.cos(t * 2) * 2, p.y + Math.sin(t * 2) * 2, C.WISP_RADIUS, 0.7);
  ctx.restore();
}

// The burst (M2k §3.5): a soft ring of silver-blue mist expanding to the full radius, with a few
// spiral swirls, fading over WISP_BURST_TIME. Its edge reaches exactly WISP_BURST_RADIUS.
export function drawWispBurst(ctx, b) {
  const t = Math.min(1, b.age / C.WISP_BURST_TIME);
  const grow = 1 - (1 - Math.min(1, t * 2.5)) ** 3; // reaches full size early, then fades there
  const r = C.WISP_BURST_RADIUS * grow;
  const fade = 1 - t;
  ctx.save();
  // Mist: a soft disc, densest toward its edge.
  const g = ctx.createRadialGradient(b.x, b.y, r * 0.2, b.x, b.y, Math.max(1, r));
  g.addColorStop(0, 'rgba(190, 215, 245, 0)');
  g.addColorStop(0.75, `rgba(190, 215, 245, ${0.22 * fade})`);
  g.addColorStop(1, `rgba(200, 220, 240, ${0.35 * fade})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(b.x, b.y, Math.max(1, r), 0, TAU);
  ctx.fill();
  // The edge.
  ctx.strokeStyle = C.WISP_COLOR;
  ctx.globalAlpha = 0.7 * fade;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(b.x, b.y, Math.max(1, r), 0, TAU);
  ctx.stroke();
  // Swirls: short spiral arms turning outward.
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6 * fade;
  for (let i = 0; i < 4; i++) {
    const base = (i / 4) * TAU + b.seed + t * 2;
    ctx.beginPath();
    for (let k = 0; k <= 12; k++) {
      const s = k / 12;
      const a = base + s * 2.2;
      const rr = r * (0.25 + 0.55 * s);
      const x = b.x + Math.cos(a) * rr;
      const y = b.y + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// A slowed enemy's mark (M2k §3.5): a small slowly turning spiral (snail-shell-like) floating at
// (x, y), above its head. dogged (M2l §2.2): faster and fainter, on an enemy only partly slowed.
export function drawSlowSpiral(ctx, x, y, anim, dogged = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(anim * C.SLOW_SPIRAL_TURN_RATE * (dogged ? C.DOGGED_SPIRAL_SPEED : 1));
  if (dogged) ctx.globalAlpha = C.DOGGED_SPIRAL_ALPHA;
  ctx.strokeStyle = C.WISP_COLOR;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 2;
  ctx.beginPath();
  for (let k = 0; k <= 30; k++) {
    const s = k / 30;
    const a = s * TAU * 2;
    const r = C.SLOW_SPIRAL_SIZE * s;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}
