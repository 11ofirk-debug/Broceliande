// Placeholder forest: floor, corridors, Druid clearing and decorative objects (spec §5.3), in
// the level's palette.
// Upright objects are anchored at their base (x, y) so they can be y-sorted.

import * as C from '../config.js';
import { corridorWidth } from '../levelSettings.js';

// Scene colours come from the level's palette (M2a §5.5); only the ground shadow is shared, since
// entities use it too.
const SHADOW = 'rgba(0, 0, 0, 0.28)';

export function drawFloor(ctx, scene) {
  const P = scene.level.palette;
  ctx.fillStyle = P.floor;
  ctx.fillRect(0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);
  for (const p of scene.groundPatches) {
    ctx.fillStyle = p.light ? P.floorAccent.light : P.floorAccent.dark;
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
  const P = scene.level.palette;
  const d = scene.level.druidPos;
  const clearing = C.DECOR.clearingRadius;
  const W = corridorWidth(scene.level); // the level's corridor width (M2b §2)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Dark rim under everything, then the dirt, then a worn centre track.
  for (const lane of scene.lanes) strokeLane(ctx, lane, W + 10, P.corridorEdge);
  ctx.fillStyle = P.corridorEdge;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, clearing * 0.8 + 5, clearing * 0.65 + 5, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const lane of scene.lanes) strokeLane(ctx, lane, W, P.corridor.base);
  ctx.fillStyle = P.corridor.base;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, clearing * 0.8, clearing * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const lane of scene.lanes) strokeLane(ctx, lane, W * 0.4, P.corridor.worn);
  ctx.restore();
}

export function drawShadow(ctx, x, y, rx, ry) {
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// level: its palette, thornBushes (M2a §5.3) for spiky thorn bushes instead of round ones, and
// gnarledTrees (M2b §3.3) for twisted trees.
export function drawDecor(ctx, item, level) {
  const palette = level.palette;
  if (item.kind === 'tree') (level.gnarledTrees ? drawGnarledTree : drawTree)(ctx, item, palette);
  else if (item.kind === 'bush') (level.thornBushes ? drawThornBush : drawBush)(ctx, item, palette);
  else if (item.kind === 'rock') drawRock(ctx, item, palette);
  else THEMED[item.kind](ctx, item, palette);
}

// Flat ground decoration (M2b §3): water and mist patches, drawn over the floor and under the
// corridors. Each avoids corridors and candidates (scene.js).
export function drawFlats(ctx, scene) {
  const P = scene.level.palette;
  for (const f of scene.flats) {
    if (f.kind === 'water') {
      ctx.fillStyle = P.water.rim;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.rx + 6, f.ry + 5, f.rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = P.water.deep;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.rx, f.ry, f.rot, 0, Math.PI * 2);
      ctx.fill();
      // A few pale ripples.
      ctx.strokeStyle = P.water.ripple;
      ctx.lineWidth = 2;
      for (const [dx, dy, w] of [[-0.35, -0.25, 0.22], [0.2, 0.15, 0.3], [-0.05, 0.45, 0.16]]) {
        ctx.beginPath();
        ctx.ellipse(f.x + dx * f.rx, f.y + dy * f.ry, w * f.rx, w * f.ry * 0.35, f.rot, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
    } else {
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.rx);
      g.addColorStop(0, P.mist);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(1, f.ry / f.rx);
      ctx.translate(-f.x, -f.y);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// Themed decoration kinds (M2b §3). Each fits its DECOR.extent entry.
const THEMED = {
  sunkenRoof: drawSunkenRoof,
  brokenFence: drawBrokenFence,
  reeds: drawReeds,
  mushrooms: drawMushrooms,
  standingStone: drawStandingStone,
  gravestone: drawGravestone,
  slab: drawSlab,
  mound: drawMound,
  kiln: drawKiln,
  chapelWall: drawChapelWall,
  sunkenStones: drawSunkenStones,
};

// M2f §4.2: a shallow stream across the map, drawn before the corridors so they cross it as
// fords. level.stream: { points: [{ x, y }, …], width }. Decoration only.
export function drawStream(ctx, scene) {
  const s = scene.level.stream;
  if (!s) return;
  const P = scene.level.palette;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [w, color] of [[s.width + 10, P.water.rim], [s.width, P.water.deep], [s.width * 0.35, P.water.ripple]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    s.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
}

// M2f §4.1: a charcoal kiln, a low domed mound of earth with a faint orange glow at its vent.
function drawKiln(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 26 * s, 7 * s);
  ctx.fillStyle = P.kiln.dark;
  ctx.beginPath();
  ctx.ellipse(x, y, 24 * s, 20 * s, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.kiln.light;
  ctx.beginPath();
  ctx.ellipse(x - 5 * s, y - 4 * s, 15 * s, 12 * s, 0, Math.PI * 1.05, Math.PI * 1.8);
  ctx.fill();
  const vx = x + (variant - 1) * 6 * s;
  const g = ctx.createRadialGradient(vx, y - 3 * s, 0, vx, y - 3 * s, 12 * s);
  g.addColorStop(0, P.ember);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(vx, y - 3 * s, 12 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a120c';
  ctx.beginPath();
  ctx.ellipse(vx, y - 2 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

// M2f §4.3: a ruined chapel wall with a pointed window, overgrown with briars. size = half-width.
function drawChapelWall(ctx, { x, y, size: w }, P) {
  const h = w * 0.45;
  drawShadow(ctx, x, y, w * 1.02, h * 0.18);
  ctx.fillStyle = P.rock.dark;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(x - w, y - h * 0.55);
  ctx.lineTo(x - w * 0.55, y - h * 0.8);
  ctx.lineTo(x - w * 0.2, y - h * 1.05);
  ctx.lineTo(x + w * 0.25, y - h * 0.7);
  ctx.lineTo(x + w * 0.7, y - h * 0.45);
  ctx.lineTo(x + w, y - h * 0.2);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.rock.base;
  ctx.fillRect(x - w * 0.95, y - h * 0.5, w * 1.9, h * 0.08);
  // Pointed window, dark inside.
  ctx.fillStyle = '#141a12';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.12, y - h * 0.15);
  ctx.lineTo(x - w * 0.12, y - h * 0.6);
  ctx.quadraticCurveTo(x - w * 0.02, y - h * 0.85, x + w * 0.08, y - h * 0.6);
  ctx.lineTo(x + w * 0.08, y - h * 0.15);
  ctx.closePath();
  ctx.fill();
  // Briars climbing it, with red berries.
  ctx.strokeStyle = P.vegetation.base;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const [sx, top] of [[-0.85, 0.65], [-0.45, 0.85], [0.35, 0.6], [0.8, 0.35]]) {
    ctx.beginPath();
    ctx.moveTo(x + w * sx, y);
    ctx.quadraticCurveTo(x + w * (sx + 0.15), y - h * top * 0.5, x + w * (sx - 0.05), y - h * top);
    ctx.stroke();
  }
  ctx.fillStyle = P.berry;
  for (const [bx, by] of [[-0.8, 0.4], [-0.4, 0.6], [0.4, 0.45], [0.75, 0.25], [-0.55, 0.2]]) {
    ctx.beginPath();
    ctx.arc(x + w * bx, y - h * by, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// M2f §4.4: broken causeway stones half under water: three tilted slabs with a water line.
function drawSunkenStones(ctx, { x, y, size: s, variant }, P) {
  for (const [dx, dy, rot] of [[-20, 2, -0.2], [0, -2, 0.1], [20, 3, 0.3]]) {
    ctx.save();
    ctx.translate(x + dx * s, y + dy * s);
    ctx.rotate(rot + (variant - 1) * 0.1);
    ctx.fillStyle = P.rock.dark;
    ctx.fillRect(-9 * s, -12 * s, 18 * s, 12 * s);
    ctx.fillStyle = P.rock.base;
    ctx.fillRect(-8 * s, -12 * s, 16 * s, 5 * s);
    ctx.restore();
  }
  ctx.strokeStyle = P.water.ripple;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, 34 * s, 5 * s, 0, 0, Math.PI);
  ctx.stroke();
}

// A cottage roof poking out of dark water at a slant: the gable, its ridge and the water line.
function drawSunkenRoof(ctx, { x, y, size: s, variant }, P) {
  const tilt = (variant - 1) * 0.18;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = P.roof.dark;
  ctx.beginPath();
  ctx.moveTo(-30 * s, 0);
  ctx.lineTo(-8 * s, -30 * s);
  ctx.lineTo(24 * s, -30 * s);
  ctx.lineTo(34 * s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.roof.light;
  ctx.beginPath();
  ctx.moveTo(-30 * s, 0);
  ctx.lineTo(-8 * s, -30 * s);
  ctx.lineTo(4 * s, 0);
  ctx.closePath();
  ctx.fill();
  // Thatch lines.
  ctx.strokeStyle = P.roof.dark;
  ctx.lineWidth = 1.5 * s;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-30 * s + i * 8 * s, 0);
    ctx.lineTo(-8 * s + i * 3 * s, -30 * s + i * 2 * s);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = P.water.ripple;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x + 2 * s, y, 36 * s, 6 * s, 0, 0, Math.PI);
  ctx.stroke();
}

// Leaning fence posts with one broken rail, half in water.
function drawBrokenFence(ctx, { x, y, size: s, variant }, P) {
  ctx.strokeStyle = P.roof.dark;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4 * s;
  const posts = [[-22, 0.15], [-4, -0.1], [16, 0.3]];
  for (const [dx, lean] of posts) {
    ctx.beginPath();
    ctx.moveTo(x + dx * s, y);
    ctx.lineTo(x + (dx + lean * 20) * s, y - (22 + variant * 3) * s);
    ctx.stroke();
  }
  ctx.lineWidth = 3 * s;
  ctx.strokeStyle = P.roof.light;
  ctx.beginPath();
  ctx.moveTo(x - 20 * s, y - 14 * s);
  ctx.lineTo(x + 2 * s, y - 17 * s);
  ctx.lineTo(x + 8 * s, y - 8 * s); // the broken end dips into the water
  ctx.stroke();
  ctx.strokeStyle = P.water.ripple;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x - 3 * s, y, 26 * s, 4 * s, 0, 0, Math.PI);
  ctx.stroke();
}

// A tuft of reeds with brown cat-tail heads.
function drawReeds(ctx, { x, y, size: s, variant }, P) {
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 4 * s;
    const h = (18 + ((i * 5 + variant * 3) % 9)) * s;
    const lean = (i - 2) * 0.12;
    ctx.strokeStyle = P.vegetation.light;
    ctx.lineWidth = 1.8 * s;
    ctx.beginPath();
    ctx.moveTo(x + dx, y);
    ctx.lineTo(x + dx + lean * h, y - h);
    ctx.stroke();
    if (i % 2 === 0) {
      ctx.strokeStyle = P.roof.dark;
      ctx.lineWidth = 3.5 * s;
      ctx.beginPath();
      ctx.moveTo(x + dx + lean * h * 0.75, y - h * 0.75);
      ctx.lineTo(x + dx + lean * h * 0.95, y - h * 0.95);
      ctx.stroke();
    }
  }
}

// Twisted trunk with crooked branches and a few dark leaf clumps.
function drawGnarledTree(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 24 * s, 8 * s);
  const bend = (variant - 1) * 8;
  ctx.strokeStyle = P.treeDark.trunk;
  ctx.lineCap = 'round';
  ctx.lineWidth = 9 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + (10 + bend) * s, y - 14 * s, x - (12 - bend) * s, y - 26 * s, x + bend * 0.5 * s, y - 40 * s);
  ctx.stroke();
  ctx.lineWidth = 4 * s;
  for (const [ex, ey] of [[-24, -54], [22, -56], [4, -68]]) {
    ctx.beginPath();
    ctx.moveTo(x + bend * 0.5 * s, y - 40 * s);
    ctx.quadraticCurveTo(x + ex * 0.3 * s, y + (ey + 12) * s, x + ex * s, y + ey * s);
    ctx.stroke();
  }
  ctx.fillStyle = P.treeDark.canopy[variant];
  for (const [dx, dy, r] of [[-24, -56, 13], [22, -58, 13], [4, -70, 12]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = P.treeLight[variant];
  ctx.beginPath();
  ctx.arc(x + 1 * s, y - 74 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
}

// A little cluster of glowing mushrooms.
function drawMushrooms(ctx, { x, y, size: s, variant }, P) {
  const g = ctx.createRadialGradient(x, y - 5 * s, 0, x, y - 5 * s, 16 * s);
  g.addColorStop(0, P.glow);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - 5 * s, 16 * s, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, h, r] of [[-6, 7, 4.5], [3, 10, 5.5], [9, 5, 3.5]].slice(0, 2 + (variant % 2))) {
    ctx.fillStyle = P.mushroom.stem;
    ctx.fillRect(x + (dx - 1) * s, y - h * s, 2 * s, h * s);
    ctx.fillStyle = P.mushroom.cap;
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y - h * s, r * s, r * 0.6 * s, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }
}

// A tall weathered standing stone with a faintly glowing rune.
function drawStandingStone(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 16 * s, 5 * s);
  const w = (12 + variant * 2) * s;
  const h = (46 + variant * 6) * s;
  ctx.fillStyle = P.rock.dark;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(x - w * 0.8, y - h * 0.85);
  ctx.quadraticCurveTo(x, y - h * 1.08, x + w * 0.75, y - h * 0.9);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.rock.base;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.75, y - 2 * s);
  ctx.lineTo(x - w * 0.6, y - h * 0.82);
  ctx.quadraticCurveTo(x - w * 0.1, y - h * 0.98, x + w * 0.1, y - h * 0.9);
  ctx.lineTo(x, y - 2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = P.glow;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(x - 3 * s, y - h * 0.62);
  ctx.lineTo(x + 3 * s, y - h * 0.5);
  ctx.lineTo(x - 3 * s, y - h * 0.38);
  ctx.stroke();
}

// An old upright grave-stone, round-topped, a little tilted.
function drawGravestone(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 12 * s, 4 * s);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((variant - 1) * 0.12);
  ctx.fillStyle = P.rock.dark;
  ctx.beginPath();
  ctx.moveTo(-9 * s, 0);
  ctx.lineTo(-9 * s, -20 * s);
  ctx.arc(0, -20 * s, 9 * s, Math.PI, 0);
  ctx.lineTo(9 * s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.rock.base;
  ctx.fillRect(-6 * s, -22 * s, 9 * s, 20 * s);
  ctx.strokeStyle = P.rock.dark;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(-4 * s, -16 * s);
  ctx.lineTo(1 * s, -16 * s);
  ctx.moveTo(-1.5 * s, -20 * s);
  ctx.lineTo(-1.5 * s, -9 * s);
  ctx.stroke();
  ctx.restore();
}

// A flat, cracked stone slab lying in the grass.
function drawSlab(ctx, { x, y, size: s, variant }, P) {
  ctx.save();
  ctx.translate(x, y - 4 * s);
  ctx.rotate((variant - 1) * 0.3);
  ctx.fillStyle = P.rock.dark;
  ctx.fillRect(-20 * s, -8 * s, 40 * s, 15 * s);
  ctx.fillStyle = P.rock.base;
  ctx.fillRect(-19 * s, -9 * s, 38 * s, 13 * s);
  ctx.strokeStyle = P.rock.dark;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(-6 * s, -9 * s);
  ctx.lineTo(-2 * s, -2 * s);
  ctx.lineTo(-8 * s, 4 * s);
  ctx.stroke();
  ctx.restore();
}

// The great burial mound: a long grassy hill with a dark stone-framed doorway at its foot.
// size = its half-width in px; it is about 0.45 × as tall.
function drawMound(ctx, { x, y, size: w }, P) {
  const h = w * 0.45;
  drawShadow(ctx, x, y, w * 1.02, h * 0.22);
  ctx.fillStyle = P.mound.dark;
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.mound.light;
  ctx.beginPath();
  ctx.ellipse(x - w * 0.12, y - h * 0.1, w * 0.78, h * 0.8, 0, Math.PI * 1.05, Math.PI * 1.85);
  ctx.fill();
  // Doorway: two upright stones, a lintel and the dark opening.
  const dw = w * 0.11;
  const dh = h * 0.42;
  ctx.fillStyle = '#1a1612';
  ctx.beginPath();
  ctx.moveTo(x - dw, y);
  ctx.lineTo(x - dw, y - dh * 0.75);
  ctx.quadraticCurveTo(x, y - dh * 1.05, x + dw, y - dh * 0.75);
  ctx.lineTo(x + dw, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.rock.base;
  ctx.fillRect(x - dw - 9, y - dh, 9, dh);
  ctx.fillRect(x + dw, y - dh, 9, dh);
  ctx.fillStyle = P.rock.light;
  ctx.fillRect(x - dw - 13, y - dh - 9, dw * 2 + 26, 10);
}

// Thorn bush: a tangle of dark spiky stems, each with small thorns, over a low dark mass. Fits
// the same drawn extent as a bush (DECOR.extent.bush), so decoration placement is unchanged.
function drawThornBush(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 18 * s, 6 * s);
  ctx.fillStyle = P.vegetation.base;
  ctx.beginPath();
  ctx.ellipse(x, y - 8 * s, 14 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = P.vegetation.light;
  ctx.lineCap = 'round';
  const stems = 7;
  for (let i = 0; i < stems; i++) {
    const a = -Math.PI * (0.12 + 0.76 * (i / (stems - 1))) + (variant - 1) * 0.08;
    const len = (17 + ((i * 7 + variant * 3) % 6)) * s;
    const bx = x + Math.cos(a) * 3 * s;
    const by = y - 8 * s;
    const ex = bx + Math.cos(a) * len;
    const ey = by + Math.sin(a) * len;
    ctx.lineWidth = 2.2 * s;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // Two thorns along each stem, alternating sides.
    ctx.lineWidth = 1.4 * s;
    for (const [t, side] of [[0.45, 1], [0.75, -1]]) {
      const tx = bx + (ex - bx) * t;
      const ty = by + (ey - by) * t;
      const ta = a + side * 0.9;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(ta) * 4.5 * s, ty + Math.sin(ta) * 4.5 * s);
      ctx.stroke();
    }
  }
}

function drawTree(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 24 * s, 8 * s);
  ctx.fillStyle = P.treeDark.trunk;
  ctx.fillRect(x - 4 * s, y - 26 * s, 8 * s, 26 * s);

  if (variant === 2) {
    // Pine: stacked triangles.
    ctx.fillStyle = P.treeDark.canopy[variant];
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
  ctx.fillStyle = P.treeDark.canopy[variant];
  for (const [dx, dy, r] of [[-14, 6, 18], [14, 6, 18], [0, -8, 22]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, cy + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = P.treeLight[variant];
  ctx.beginPath();
  ctx.arc(x - 6 * s, cy - 12 * s, 10 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawBush(ctx, { x, y, size: s }, P) {
  drawShadow(ctx, x, y, 18 * s, 6 * s);
  ctx.fillStyle = P.vegetation.base;
  for (const [dx, dy, r] of [[-9, -8, 10], [9, -8, 10], [0, -15, 11]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = P.vegetation.light;
  ctx.beginPath();
  ctx.arc(x - 3 * s, y - 19 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawRock(ctx, { x, y, size: s }, P) {
  drawShadow(ctx, x, y, 15 * s, 5 * s);
  ctx.fillStyle = P.rock.dark;
  ctx.beginPath();
  ctx.ellipse(x, y - 7 * s, 14 * s, 9 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.rock.base;
  ctx.beginPath();
  ctx.ellipse(x - 1 * s, y - 9 * s, 12 * s, 7.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.rock.light;
  ctx.beginPath();
  ctx.ellipse(x - 4 * s, y - 12 * s, 5 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}
