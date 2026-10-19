// Placeholder forest: floor, corridors, Druid clearing and decorative objects (spec §5.3).
// Upright objects are anchored at their base (x, y) so they can be y-sorted.

import * as C from '../config.js';

const COLORS = {
  floor: '#2f4a26',
  patchDark: 'rgba(20, 36, 16, 0.35)',
  patchLight: 'rgba(80, 110, 50, 0.22)',
  corridorEdge: '#3b3222',
  corridor: '#6e5a3c',
  corridorWorn: 'rgba(150, 128, 90, 0.35)',
  shadow: 'rgba(0, 0, 0, 0.28)',
  trunk: '#4a3524',
  canopy: ['#1f3d1c', '#28481f', '#21422a'],
  canopyLight: ['#2f5a27', '#3a6328', '#2e5a39'],
  bush: '#2c5a2a',
  bushLight: '#3f7334',
  rock: '#6d6f68',
  rockLight: '#8d8f86',
  rockDark: '#4d4f49',
};

export function drawFloor(ctx, scene) {
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);
  for (const p of scene.groundPatches) {
    ctx.fillStyle = p.light ? COLORS.patchLight : COLORS.patchDark;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function strokeLane(ctx, lane, width, color) {
  const pts = lane.path.points;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

// Broad dirt corridors plus the open clearing around the Druid where they meet.
export function drawCorridors(ctx, scene) {
  const d = C.DRUID_POS;
  const clearing = C.DECOR.clearingRadius;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Dark rim under everything, then the dirt, then a worn centre track.
  for (const lane of scene.lanes) strokeLane(ctx, lane, C.CORRIDOR_WIDTH + 10, COLORS.corridorEdge);
  ctx.fillStyle = COLORS.corridorEdge;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, clearing * 0.8 + 5, clearing * 0.65 + 5, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const lane of scene.lanes) strokeLane(ctx, lane, C.CORRIDOR_WIDTH, COLORS.corridor);
  ctx.fillStyle = COLORS.corridor;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, clearing * 0.8, clearing * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const lane of scene.lanes) strokeLane(ctx, lane, C.CORRIDOR_WIDTH * 0.4, COLORS.corridorWorn);
  ctx.restore();
}

export function drawShadow(ctx, x, y, rx, ry) {
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawDecor(ctx, item) {
  if (item.kind === 'tree') drawTree(ctx, item);
  else if (item.kind === 'bush') drawBush(ctx, item);
  else drawRock(ctx, item);
}

function drawTree(ctx, { x, y, size: s, variant }) {
  drawShadow(ctx, x, y, 24 * s, 8 * s);
  ctx.fillStyle = COLORS.trunk;
  ctx.fillRect(x - 4 * s, y - 26 * s, 8 * s, 26 * s);

  if (variant === 2) {
    // Pine: stacked triangles.
    ctx.fillStyle = COLORS.canopy[variant];
    for (let i = 0; i < 3; i++) {
      const baseY = y - 18 * s - i * 18 * s;
      const w = (26 - i * 6) * s;
      ctx.beginPath();
      ctx.moveTo(x - w, baseY);
      ctx.lineTo(x + w, baseY);
      ctx.lineTo(x, baseY - 34 * s);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }

  // Broadleaf: cluster of circles with a lighter highlight.
  const cy = y - 46 * s;
  ctx.fillStyle = COLORS.canopy[variant];
  for (const [dx, dy, r] of [[-14, 6, 18], [14, 6, 18], [0, -8, 22]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, cy + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.canopyLight[variant];
  ctx.beginPath();
  ctx.arc(x - 6 * s, cy - 12 * s, 10 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawBush(ctx, { x, y, size: s }) {
  drawShadow(ctx, x, y, 18 * s, 6 * s);
  ctx.fillStyle = COLORS.bush;
  for (const [dx, dy, r] of [[-9, -8, 10], [9, -8, 10], [0, -15, 11]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.bushLight;
  ctx.beginPath();
  ctx.arc(x - 3 * s, y - 19 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawRock(ctx, { x, y, size: s }) {
  drawShadow(ctx, x, y, 15 * s, 5 * s);
  ctx.fillStyle = COLORS.rockDark;
  ctx.beginPath();
  ctx.ellipse(x, y - 7 * s, 14 * s, 9 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.rock;
  ctx.beginPath();
  ctx.ellipse(x - 1 * s, y - 9 * s, 12 * s, 7.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.rockLight;
  ctx.beginPath();
  ctx.ellipse(x - 4 * s, y - 12 * s, 5 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}
