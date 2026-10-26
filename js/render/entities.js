// Placeholder drawings for gameplay entities. One function per entity so each can
// later be swapped for a sprite without touching gameplay code (spec §5.2).

import * as C from '../config.js';
import { drawShadow } from './environment.js';
import { resourceIconImage } from '../icons.js';
import { AttackState } from '../entities/enemy.js';

const COLORS = {
  slotFill: 'rgba(170, 160, 130, 0.35)',
  slotRim: 'rgba(230, 220, 180, 0.85)',
  slotFillHover: 'rgba(240, 225, 170, 0.55)',
  featureGlow: 'rgba(255, 236, 170, 0.16)',
  robe: '#3d6b4a',
  robeDark: '#2b4f36',
  hood: '#4c7f58',
  skin: '#d9b48f',
  beard: '#e8e4d8',
  staff: '#7a5530',
  staffGem: '#9fe8a8',
  peachTreeCanopy: '#3f6e2c',
  peach: '#f0a066',
  water: '#3f6f8f',
  waterLight: '#6d9bb8',
  waterRim: '#55704a',
  reed: '#6f8f3a',
  cattail: '#6b4428',
  shrub: '#35602f',
  feather: '#ece6da',
  stone: '#8a877c',
  stoneDark: '#5f5d55',
  moss: '#4f6e34',
  wolf: '#2b2430',
  bear: '#3b2618',
  bearDark: '#24160d',
  bearHit: '#a88a78',
  bearMuzzle: '#5c3d27',
  wolfDark: '#1a151d',
  wolfHit: '#b9a9b8',
  pebbleFlight: '#c9c2b2',
  pebbleEdge: '#4a443a',
  pebbleTrail: 'rgba(255, 250, 230, 0.6)',
  wolfEye: '#ff2a1a',
  wolfEyeGlow: 'rgba(255, 40, 20, 0.35)',
  hpBack: 'rgba(0, 0, 0, 0.7)',
  hpHigh: '#7ccf5a',
  hpMid: '#e0c04a',
  hpLow: '#e0553a',
  hitFlash: 'rgba(255, 60, 40, 0.28)',
  featureGlowHover: 'rgba(255, 236, 170, 0.38)',
  stick: '#5b3d22',
  stickLight: '#8a6236',
  cup: '#4a3a2c',
  pebble: '#b8b2a4',
  upgradeBand: '#e8c547',
  level3Band: '#8fd8ff',
  rangeFill: 'rgba(255, 245, 200, 0.08)',
  rangeEdge: 'rgba(255, 245, 200, 0.7)',
  nextRangeEdge: 'rgba(255, 245, 200, 0.4)',
  progress: '#f0d878',
  floatText: '#fff1c4',
  floatOutline: 'rgba(30, 20, 10, 0.85)',
  floatMuted: '#b8b4a6',
  floaterBacking: 'rgba(20, 14, 8, 0.45)',
  vulture: '#4a3326',
  vultureDark: '#2f2019',
  vultureHit: '#a8857a',
  vultureRuff: '#e9e2d2',
  vultureHead: '#d98b80',
  vultureBeak: '#e3c15a',
  duration: '#e8c547',
  durationBack: 'rgba(0, 0, 0, 0.45)',
  swipe: 'rgba(255, 252, 235, 1)',
  swipeGlow: 'rgba(255, 236, 170, 0.45)',
  spark: '#fffbe8',
  strikeFlash: '#f4f0ff',
  toaderBody: '#4f8a3c',
  toaderBelly: '#9cc46a',
  toaderSpot: '#8a4fb0',
  toaderEye: '#f2e27a',
  toaderPipe: '#6c3d8c',
  toaderPipeCap: '#a173c4',
  toaderMouth: '#3b1d4f',
  toaderMouthLine: '#2b4a22',
  toaderLevelRing: '#a173c4',      // level ring (M1h §2.4): purple …
  toaderLevelRingInner: '#9cdb6a', // … with a green inner line
  pellet: '#8f4fc4',
  pelletLight: '#d6b3f0',
  cloudCore: 'rgba(150, 90, 190, 0.55)',
  cloudMid: 'rgba(110, 170, 90, 0.40)',
  cloudEdge: 'rgba(120, 180, 100, 0.2)',
  cloudSwirl: 'rgba(210, 180, 240, 0.45)',
  cloudRing: 'rgba(190, 150, 230, 0.75)',
  squirrel: '#8b5530',
  squirrelHit: '#c09070',
  squirrelBelly: '#e6cfa6',
  squirrelTail: '#a0623a',
  squirrelTailTip: '#c58a5a',
};

// M1c §2.1: every feature and turret is drawn inside its location's footprint circle
// (LOCATION_RADIUS around the location centre). Upright sprites therefore stand on a base
// point below the centre; these offsets centre each sprite's drawn extent on the location.
// Visual only: gameplay (range, travel cost, targeting) uses the location centre.
const FEATURE_BASE_OFFSET = { tree: 36, reedPatch: 15, shrub: 20, ruins: 22, pond: 0 };

// Wolf drop idle effect (M1d §1.3), visual only: a slow bob and a soft pulsing glow.
const DROP_BOB_PX = 1.5;
const DROP_BOB_PERIOD = 2.4;   // s
const DROP_GLOW_ALPHA = [0.16, 0.34];

// A dropped resource item: the shared HUD icon at DROP_ICON_SCALE (M1d §1.3).
// M1g §1: before its launch it is not drawn; in the air it follows a parabola from the death
// point to its resting spot, DROP_POP_HEIGHT above the straight line, with a ground shadow that
// shrinks as it rises; on landing it squashes and settles, then rests with the idle bob and glow.
// t: seconds (wall clock, for the idle effect only); the flight uses the drop's simulation age.
export function drawDrop(ctx, drop, t) {
  const size = C.RESOURCE_ICON_SIZE * C.DROP_ICON_SCALE;
  const img = resourceIconImage(drop.resource);
  const flight = drop.age - drop.delay;
  if (flight < 0) return; // not launched yet

  ctx.save();
  if (flight < C.DROP_POP_TIME) {
    const p = flight / C.DROP_POP_TIME;
    const gx = drop.fromX + (drop.x - drop.fromX) * p;
    const gy = drop.fromY + (drop.y - drop.fromY) * p;
    const h = 4 * C.DROP_POP_HEIGHT * p * (1 - p);
    const shrink = 1 - 0.45 * (h / C.DROP_POP_HEIGHT);
    drawShadow(ctx, gx, gy + size * 0.42, size * 0.32 * shrink, size * 0.1 * shrink);
    if (img.complete) ctx.drawImage(img, gx - size / 2, gy - size / 2 - h, size, size);
    ctx.restore();
    return;
  }

  // Squash on touchdown, settling back to shape over DROP_SETTLE_TIME.
  const settle = Math.min(1, (flight - C.DROP_POP_TIME) / C.DROP_SETTLE_TIME);
  const squash = 0.28 * (1 - settle);
  const phase = settle < 1 ? 0 : Math.sin((t / DROP_BOB_PERIOD + drop.id * 0.37) * Math.PI * 2);
  const glow = (DROP_GLOW_ALPHA[0] + (DROP_GLOW_ALPHA[1] - DROP_GLOW_ALPHA[0]) * (phase + 1) / 2) * settle;
  const g = ctx.createRadialGradient(drop.x, drop.y, 0, drop.x, drop.y, size * 0.6);
  g.addColorStop(0, `rgba(255, 240, 190, ${glow})`);
  g.addColorStop(1, 'rgba(255, 240, 190, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(drop.x, drop.y, size * 0.6, 0, Math.PI * 2);
  ctx.fill();
  drawShadow(ctx, drop.x, drop.y + size * 0.42, size * 0.32, size * 0.1);
  if (img.complete) {
    const w = size * (1 + squash * 0.6);
    const h = size * (1 - squash);
    const bottom = drop.y + size / 2 - phase * DROP_BOB_PX; // squash anchored at the bottom
    ctx.drawImage(img, drop.x - w / 2, bottom - h, w, h);
  }
  ctx.restore();
}

// Ground point a feature's sprite stands on (also its y-sort key).
export function featureBase(feature) {
  return { x: feature.x, y: feature.y + FEATURE_BASE_OFFSET[feature.type] };
}

// Ground point a slot pad and its turret stand on.
export function slotBase(slot) {
  return { x: slot.x, y: slot.y + C.TURRET_BASE_OFFSET };
}

// Turret slot: flat stone pad on the ground. Faint during Combat (spec §9.1), brighter when hovered.
export function drawTurretSlot(ctx, slot, faint, hovered) {
  const r = C.TURRET_SLOT_RADIUS;
  const { x, y } = slotBase(slot);
  ctx.save();
  ctx.globalAlpha = faint ? 0.35 : 1;
  ctx.fillStyle = hovered ? COLORS.slotFillHover : COLORS.slotFill;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.slotRim;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([7, 5]);
  ctx.stroke();
  ctx.restore();
}

// The Druid standing at rest: staff upright, no lunge, facing right.
export const DRUID_REST_POSE = { staffAngle: 0, lungeX: 0, lungeY: 0, facing: 1 };

// The Druid, upright around (x, y) with feet just below. hurt: brief red flash.
// defeat: 0 standing … 1 fallen; a defeated Druid tips over onto his back and greys out (M1e §1.2).
// pose (M1f §4): staffAngle in rad around his hand (+ swings the top toward where he faces),
// lunge offset in px, facing ±1 (mirrors him so the staff side faces his target).
// look (optional, M1i §2.7): { tint, alpha, scale } draws the Druid as a monochrome, translucent
// double of himself (the Bough Double): the same drawing, recoloured to `tint` keeping its light
// and shade, at `alpha`, scaled about his feet by `scale`.
export function drawDruid(ctx, x, y, hurt, defeat = 0, pose = DRUID_REST_POSE, look = null) {
  if (look) {
    drawTintedDruid(ctx, x, y, pose, look);
    return;
  }
  const r = C.DRUID_RADIUS;
  const feet = y + r * 0.6;
  drawShadow(ctx, x, feet, r * 0.9, r * 0.3);
  ctx.save();
  if (defeat > 0) {
    ctx.translate(x, feet);
    ctx.rotate(-defeat * 1.35);
    ctx.translate(-x, -feet);
    ctx.filter = `grayscale(${defeat})`;
    ctx.globalAlpha = 1 - 0.25 * defeat;
  }
  ctx.translate(pose.lungeX, pose.lungeY);
  if (pose.facing < 0) {
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-x, 0);
  }
  drawDruidBody(ctx, x, y, r, feet, hurt && defeat === 0, pose.staffAngle);
  ctx.restore();
}

// The tinted Druid is drawn on scratch canvases: his normal drawing (also kept as the outline
// mask), then the tint laid over it with the 'color' blend (tint hue, the drawing's brightness),
// then cut back to his outline in one step.
const TINT_CANVAS_SIZE = 220; // px, room for the Druid and his staff at any pose
let tintCanvas = null;
let maskCanvas = null;

function scratchCanvas() {
  const c = document.createElement('canvas');
  c.width = TINT_CANVAS_SIZE;
  c.height = TINT_CANVAS_SIZE;
  return c;
}

function drawTintedDruid(ctx, x, y, pose, look) {
  tintCanvas ??= scratchCanvas();
  maskCanvas ??= scratchCanvas();
  const ox = TINT_CANVAS_SIZE / 2;
  const oy = TINT_CANVAS_SIZE * 0.6;
  const m = maskCanvas.getContext('2d');
  m.clearRect(0, 0, TINT_CANVAS_SIZE, TINT_CANVAS_SIZE);
  drawDruid(m, ox, oy, false, 0, pose);
  const t = tintCanvas.getContext('2d');
  t.globalCompositeOperation = 'source-over';
  t.clearRect(0, 0, TINT_CANVAS_SIZE, TINT_CANVAS_SIZE);
  t.drawImage(maskCanvas, 0, 0);
  t.globalCompositeOperation = 'color';
  t.fillStyle = look.tint;
  t.fillRect(0, 0, TINT_CANVAS_SIZE, TINT_CANVAS_SIZE);
  t.globalCompositeOperation = 'destination-in';
  t.drawImage(maskCanvas, 0, 0);
  t.globalCompositeOperation = 'source-over';

  const s = look.scale ?? 1;
  const feet = C.DRUID_RADIUS * 0.6;
  ctx.save();
  ctx.globalAlpha *= look.alpha;
  ctx.translate(x, y + feet);
  ctx.scale(s, s);
  ctx.drawImage(tintCanvas, -ox, -oy - feet);
  ctx.restore();
}

// Bough Double effects (M1i §2.4, §2.7), all visual only.
const DOUBLE_COLORS = {
  wispCore: 'rgba(214, 232, 150, 0.95)',
  wispGlow: 'rgba(122, 150, 64, 0.0)',
  puff: 'rgba(150, 160, 90, ALPHA)',
  chip: '#a0703c',
  chipDark: '#6e4a2a',
  leaf: ['#6fa13a', '#8a6a3a', '#7fb446'],
  targetRing: 'rgba(214, 232, 150, ALPHA)',
  dim: 'rgba(6, 10, 4, 0.42)',
};
const withAlpha = (c, a) => c.replace('ALPHA', a.toFixed(3));

// The wisp flying from the Druid to the target: a glowing green-brown orb with a short trail.
// t: 0 … 1 of its flight.
export function drawDoubleWisp(ctx, from, to, t) {
  ctx.save();
  for (let i = 4; i >= 0; i--) {
    const k = Math.max(0, t - i * 0.06);
    const e = k * k * (3 - 2 * k);
    const x = from.x + (to.x - from.x) * e;
    const y = from.y + (to.y - from.y) * e - Math.sin(k * Math.PI) * 30; // a slight arc
    const r = (i === 0 ? 9 : 7 - i) ;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, DOUBLE_COLORS.wispCore);
    g.addColorStop(1, DOUBLE_COLORS.wispGlow);
    ctx.globalAlpha = i === 0 ? 1 : 0.5 - i * 0.08;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Small green-brown puff where a Double appears. t: 0 … 1.
export function drawDoublePuff(ctx, x, y, t) {
  ctx.save();
  ctx.strokeStyle = withAlpha(DOUBLE_COLORS.puff, 0.8 * (1 - t));
  ctx.fillStyle = withAlpha(DOUBLE_COLORS.puff, 0.35 * (1 - t));
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, 14 + 24 * t, (14 + 24 * t) * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// A wood chip from a crafting swing, flying in a short arc and spinning. t: 0 … 1.
export function drawChip(ctx, c, age) {
  const x = c.x + c.vx * age;
  const y = c.y + c.vy * age + 0.5 * 420 * age * age;
  ctx.save();
  ctx.globalAlpha = 1 - (age / C.DOUBLE_CHIP_TIME) ** 2;
  ctx.translate(x, y);
  ctx.rotate(age * 14 + c.vx * 0.05);
  ctx.fillStyle = DOUBLE_COLORS.chip;
  ctx.fillRect(-4.5, -2, 9, 4);
  ctx.fillStyle = DOUBLE_COLORS.chipDark;
  ctx.fillRect(-4.5, 1, 9, 1);
  ctx.restore();
}

// A Double fading out after its job, shedding a few leaf / moss particles. t: 0 … 1.
export function drawDoubleFade(ctx, f, t) {
  drawDruid(ctx, f.x, f.y, false, 0, DRUID_REST_POSE, { tint: C.DOUBLE_TINT, alpha: C.DOUBLE_ALPHA * (1 - t), scale: 1 + 0.08 * t });
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55;
    const d = 10 + 34 * t;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = DOUBLE_COLORS.leaf[i % 3];
    ctx.beginPath();
    ctx.ellipse(f.x + Math.cos(a) * d, f.y - C.DRUID_RADIUS * 0.8 + Math.sin(a) * d * 0.8 + 20 * t * t, 3.5, 2, a + t * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Targeting mode (M1i §2.4 step 2): everything dimmed except the valid targets' footprints, which
// get a pulsing ring (brighter on the hovered one). targets: slot positions. t: s, for the pulse.
export function drawDoubleTargeting(ctx, targets, hovered, t) {
  const R = C.LOCATION_RADIUS + 6;
  ctx.save();
  ctx.fillStyle = DOUBLE_COLORS.dim;
  ctx.beginPath();
  ctx.rect(0, C.HUD_STRIP_HEIGHT, C.STAGE_WIDTH, C.STAGE_HEIGHT - C.HUD_STRIP_HEIGHT);
  for (const p of targets) {
    ctx.moveTo(p.x + R, p.y);
    ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
  }
  ctx.fill('evenodd');
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  for (const p of targets) {
    const hot = p === hovered;
    ctx.strokeStyle = withAlpha(DOUBLE_COLORS.targetRing, hot ? 1 : 0.45 + 0.35 * pulse);
    ctx.lineWidth = hot ? 4 : 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, R - 2 + (hot ? 0 : pulse * 2), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// Wolf's head silhouette, front-on (M2a §4.2): pointed ears, broad cheeks, a narrowing muzzle,
// with slanted eyes and a nose cut out in `cutColor`. Shared draw function, reusable anywhere.
// (x, y): centre of the head; size: half its height in px. redEyes (Fell Wilds, M2c §1.2): the
// eyes bright red with a very faint red glow instead of cut out; nothing else changes.
export function drawWolfHead(ctx, x, y, size, color, cutColor, { redEyes = false } = {}) {
  const s = size;
  const half = [
    [0, 0.82], [0.2, 0.62], [0.36, 0.38], [0.62, 0.16], [0.78, -0.02], [0.6, -0.22],
    [0.66, -0.98], [0.24, -0.5], [0, -0.44],
  ];
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  half.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * s, y + py * s) : ctx.moveTo(x + px * s, y + py * s)));
  for (let i = half.length - 2; i > 0; i--) ctx.lineTo(x - half[i][0] * s, y + half[i][1] * s);
  ctx.closePath();
  ctx.fill();
  const eye = (side, grow) => {
    ctx.beginPath();
    ctx.ellipse(x + side * 0.27 * s, y - 0.06 * s, 0.13 * s * grow, 0.06 * s * grow, side * 0.45, 0, Math.PI * 2);
    ctx.fill();
  };
  if (redEyes) {
    ctx.fillStyle = COLORS.wolfEyeGlow;
    for (const side of [-1, 1]) eye(side, 1.9);
    ctx.fillStyle = COLORS.wolfEye;
  } else {
    ctx.fillStyle = cutColor;
  }
  for (const side of [-1, 1]) eye(side, 1);
  ctx.fillStyle = cutColor;
  ctx.beginPath();
  ctx.ellipse(x, y + 0.6 * s, 0.11 * s, 0.07 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Druid strike swoosh (M1e §2.4, M1f §4): a bright, broad crescent sweeping across the
// target's direction, with a soft glow, fading out. t: 0 … 1 over DRUID_SWIPE_TIME.
export function drawSwipe(ctx, s, t) {
  const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
  const reach = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) * 0.9;
  const sweep = -0.5 + t * 1.0; // the arc sweeps across the target direction
  // s.small: a Squirrel's counter-attack (M1h §3.2), a thinner swipe from a smaller body.
  const cy = s.y1 - (s.small ? C.SQUIRREL_RADIUS : C.DRUID_RADIUS) * 0.4;
  const strokes = s.small ? [[7, COLORS.swipeGlow], [3, COLORS.swipe]] : [[16, COLORS.swipeGlow], [8, COLORS.swipe]];
  ctx.save();
  ctx.globalAlpha = 1 - t * t;
  ctx.lineCap = 'round';
  for (const [width, color] of strokes) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(s.x1, cy, reach, angle + sweep - 0.6, angle + sweep + 0.35);
    ctx.stroke();
  }
  ctx.restore();
}

// Impact spark on the target (M1f §4): a white burst of rays, growing and fading. t: 0 … 1.
export function drawSpark(ctx, s, t) {
  const inner = 4 + t * 6;
  const outer = 10 + t * 14;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = COLORS.spark;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    ctx.moveTo(s.x + Math.cos(a) * inner, s.y + Math.sin(a) * inner);
    ctx.lineTo(s.x + Math.cos(a) * outer, s.y + Math.sin(a) * outer);
  }
  ctx.stroke();
  ctx.fillStyle = COLORS.spark;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 5 * (1 - t) + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Body drawn facing right. The staff turns around his hand by staffAngle and is drawn in
// front of the robe so a strike reads clearly.
function drawDruidBody(ctx, x, y, r, feet, hurt, staffAngle) {
  // Robe.
  ctx.fillStyle = COLORS.robe;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, feet);
  ctx.lineTo(x + r * 0.7, feet);
  ctx.lineTo(x + r * 0.35, y - r * 0.9);
  ctx.lineTo(x - r * 0.35, y - r * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.robeDark;
  ctx.fillRect(x - 2, y - r * 0.8, 4, r * 1.35);

  // Head, beard, hood.
  ctx.fillStyle = COLORS.hood;
  ctx.beginPath();
  ctx.arc(x, y - r * 1.2, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(x, y - r * 1.12, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.beard;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.25, y - r * 1.02);
  ctx.lineTo(x + r * 0.25, y - r * 1.02);
  ctx.lineTo(x, y - r * 0.55);
  ctx.closePath();
  ctx.fill();

  // Staff, turning around his hand (M1f §4). At rest it stands upright from his feet to above
  // his head, as before; the gem marks its top.
  const handX = x + r * 0.68;
  const handY = y - r * 0.45;
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(staffAngle);
  ctx.strokeStyle = COLORS.staff;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(0, r * 1.05);
  ctx.lineTo(0, -r * 1.45);
  ctx.stroke();
  ctx.fillStyle = COLORS.staffGem;
  ctx.beginPath();
  ctx.arc(0, -r * 1.55, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = COLORS.skin; // hand gripping the staff
  ctx.beginPath();
  ctx.arc(handX, handY, 4, 0, Math.PI * 2);
  ctx.fill();

  if (hurt) {
    ctx.fillStyle = COLORS.hitFlash;
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.55, r * 0.6, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Demonic Wolf: side-view quadruped with red eyes, standing on its collision centre.
// hit: brief pale flash when a pebble lands; lunging: just bit something.
export function drawWolf(ctx, wolf, hit, lunging) { // (enemy of type wolf)
  const r = wolf.radius;
  const feet = wolf.y + r * 0.5;
  drawShadow(ctx, wolf.x, feet, r * 1.1, r * 0.3);

  ctx.save();
  ctx.translate(wolf.x, feet);
  ctx.scale(wolf.facing * (r / 16), r / 16); // drawn at radius 16, facing right
  if (lunging) ctx.translate(5, 0); // lunge on a bite (Druid or Vulture)

  // Legs, swinging with distance walked.
  const swing = Math.sin(wolf.stride * 0.3) * 4;
  ctx.strokeStyle = COLORS.wolfDark;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [x, dir] of [[-10, 1], [-6, -1], [7, -1], [11, 1]]) {
    ctx.moveTo(x, -10);
    ctx.lineTo(x + swing * dir, 0);
  }
  ctx.stroke();

  // Tail and body.
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-14, -17);
  ctx.quadraticCurveTo(-22, -18, -25, -26);
  ctx.stroke();
  ctx.fillStyle = hit === 'strike' ? COLORS.strikeFlash : hit ? COLORS.wolfHit : COLORS.wolf; // 'strike': white flash from a Druid strike (M1f §4)
  ctx.beginPath();
  ctx.ellipse(0, -16, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head, snout and ears.
  ctx.beginPath();
  ctx.arc(14, -23, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18, -27);
  ctx.lineTo(28, -21);
  ctx.lineTo(18, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.wolfDark;
  ctx.beginPath();
  ctx.moveTo(9, -28);
  ctx.lineTo(11, -37);
  ctx.lineTo(15, -29);
  ctx.closePath();
  ctx.fill();

  // Glowing red eyes.
  ctx.fillStyle = COLORS.wolfEyeGlow;
  ctx.beginPath();
  ctx.arc(17.5, -25, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.wolfEye;
  ctx.beginPath();
  ctx.arc(17.5, -25, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Small world-space HP bar centred on x with its top at y.
export function drawHpBar(ctx, x, y, width, fraction) {
  const h = 6;
  const f = Math.max(0, Math.min(1, fraction));
  ctx.fillStyle = COLORS.hpBack;
  ctx.fillRect(x - width / 2 - 1, y - 1, width + 2, h + 2);
  ctx.fillStyle = f > 0.5 ? COLORS.hpHigh : f > 0.25 ? COLORS.hpMid : COLORS.hpLow;
  ctx.fillRect(x - width / 2, y, width * f, h);
}

// Druid HP bar, always shown above his head.
export function drawDruidHpBar(ctx, x, y, hp, maxHp = C.DRUID_HP) {
  drawHpBar(ctx, x, y - C.DRUID_RADIUS * 2.55, 56, hp / maxHp);
}

// Enemy HP bars (§13, M1e §3.4): hidden until first damage; sized to the sprite.
// lift: bar height above the collision centre, × radius; width in px.
const HP_BAR = { wolf: { lift: 2.9, width: 30 }, bear: { lift: 1.75, width: 48 }, ogre: { lift: 2.15, width: 90 } };

// Mini-bosses (M2c §2.7) keep theirs visible all the time.
export function drawEnemyHpBar(ctx, enemy) {
  const t = C.ENEMY_TYPES[enemy.type];
  const maxHp = t.hp;
  if (enemy.hp >= maxHp && !t.boss) return;
  const bar = HP_BAR[enemy.type];
  drawHpBar(ctx, enemy.x, enemy.y - enemy.radius * bar.lift, bar.width, enemy.hp / maxHp);
}

// Demonic Bear (M1e §3.7): bulky side-view quadruped, dark brown with hunched shoulders and
// the wolves' glowing red eyes. Drawn at radius 26 facing right, feet below its centre.
// hit: brief pale flash; lunging: just struck something.
export function drawBear(ctx, bear, hit, lunging) {
  const r = bear.radius;
  const feet = bear.y + r * 0.5;
  drawShadow(ctx, bear.x, feet, r * 1.25, r * 0.32);

  ctx.save();
  ctx.translate(bear.x, feet);
  ctx.scale(bear.facing * (r / 26), r / 26);
  if (lunging) ctx.translate(6, 0);

  // Heavy legs with a slow lumbering swing.
  const swing = Math.sin(bear.stride * 0.18) * 3;
  ctx.fillStyle = COLORS.bearDark;
  for (const [x, dir] of [[-17, 1], [-8, -1], [9, -1], [18, 1]]) {
    ctx.beginPath();
    ctx.roundRect(x - 4 + swing * dir * 0.5, -16, 8, 16, 3);
    ctx.fill();
  }

  const body = hit === 'strike' ? COLORS.strikeFlash : hit ? COLORS.bearHit : COLORS.bear;
  ctx.fillStyle = body;
  ctx.beginPath(); // stubby tail
  ctx.arc(-26, -26, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath(); // body
  ctx.ellipse(0, -24, 26, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath(); // hunched shoulders
  ctx.ellipse(9, -31, 15, 12, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath(); // head and ears
  ctx.ellipse(25, -27, 10.5, 9, 0.1, 0, Math.PI * 2);
  ctx.arc(19, -35, 4, 0, Math.PI * 2);
  ctx.arc(26, -36, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.bearMuzzle;
  ctx.beginPath();
  ctx.ellipse(33, -24, 6.5, 4.5, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.wolfDark;
  ctx.beginPath(); // nose
  ctx.arc(38.5, -25, 2, 0, Math.PI * 2);
  ctx.fill();

  // Glowing red eyes, like the wolf's.
  ctx.fillStyle = COLORS.wolfEyeGlow;
  ctx.beginPath();
  ctx.arc(28, -30, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.wolfEye;
  ctx.beginPath();
  ctx.arc(28, -30, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Club angles (rad; 0 = straight ahead, positive = downward) for the Ogre's poses (M2c §2.8).
const OGRE_CLUB_WALK = 0.95;   // carried low in front
const OGRE_CLUB_RAISED = -2.4; // wind-up: lifted overhead and back
const OGRE_CLUB_DOWN = 1.35;   // blow: slammed down to the ground in front

// The Ogre (M2c §2.8): a hulking, hunched side-view humanoid, twice the Bear's size, grey-green
// skin, small head with the enemies' red eyes and a huge wooden club. Its body sways with each
// heavy step. Pose from its attack: walk, wind-up (club rising overhead), blow (club down for
// OGRE_BLOW_POSE_TIME). Drawn at radius 52 facing right, feet below its centre.
export function drawOgre(ctx, ogre, hit, lunging, anim) {
  const t = C.ENEMY_TYPES.ogre;
  const r = ogre.radius;
  const feet = ogre.y + r * 0.5;
  drawShadow(ctx, ogre.x, feet, r * 1.05, r * 0.26);

  let club = OGRE_CLUB_WALK;
  if (ogre.attack === AttackState.WINDUP) {
    const k = Math.min(1, ogre.windupElapsed / t.windupTime);
    club = OGRE_CLUB_WALK + (OGRE_CLUB_RAISED - OGRE_CLUB_WALK) * (1 - (1 - k) * (1 - k));
  } else if (anim - ogre.lastBlowTime < C.OGRE_BLOW_POSE_TIME) {
    club = OGRE_CLUB_DOWN;
  }
  const step = Math.sin(ogre.stride * 0.07);

  ctx.save();
  ctx.translate(ogre.x, feet);
  ctx.scale(ogre.facing * (r / 52), r / 52);
  if (lunging) ctx.translate(4, 0);
  ctx.rotate(step * 0.045); // heavy side-to-side sway

  // Legs: thick, stepping in turn.
  ctx.fillStyle = OGRE.skinDark;
  for (const [x, dir] of [[-15, 1], [13, -1]]) {
    ctx.beginPath();
    ctx.roundRect(x - 10 + step * dir * 5, -46, 20, 46, 7);
    ctx.fill();
  }
  // Loincloth.
  ctx.fillStyle = OGRE.cloth;
  ctx.beginPath();
  ctx.moveTo(-28, -50);
  ctx.lineTo(26, -50);
  ctx.lineTo(18, -30);
  ctx.lineTo(-22, -30);
  ctx.closePath();
  ctx.fill();

  const skin = hit === 'strike' ? COLORS.strikeFlash : hit ? OGRE.skinHit : OGRE.skin;
  // Back arm behind the body.
  ctx.strokeStyle = OGRE.skinDark;
  ctx.lineCap = 'round';
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(-8, -84);
  ctx.lineTo(-20 - step * 4, -52);
  ctx.stroke();
  // Body: big torso and belly, hunched back hump.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, -72, 34, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-12, -92, 24, 18, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = OGRE.belly;
  ctx.beginPath();
  ctx.ellipse(12, -64, 18, 20, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Small head, jutting forward from the hump, with tusks and red eyes.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(24, -98, 13, 12, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = OGRE.tusk;
  ctx.beginPath();
  ctx.moveTo(31, -91);
  ctx.lineTo(34, -98);
  ctx.lineTo(36, -90);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.wolfEyeGlow;
  ctx.beginPath();
  ctx.arc(29, -102, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.wolfEye;
  ctx.beginPath();
  ctx.arc(29, -102, 2.6, 0, Math.PI * 2);
  ctx.fill();

  // Club arm and the club along one line from the shoulder: arm, fist, handle, knotted head.
  const shoulder = { x: 10, y: -86 };
  const dx = Math.cos(club);
  const dy = Math.sin(club);
  const hand = { x: shoulder.x + dx * 30, y: shoulder.y + dy * 30 };
  ctx.strokeStyle = skin;
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(shoulder.x, shoulder.y);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(club);
  ctx.fillStyle = OGRE.club;
  ctx.fillRect(-6, -4.5, 34, 9); // handle
  ctx.beginPath();               // head, widening to the end
  ctx.moveTo(24, -6);
  ctx.lineTo(62, -14);
  ctx.quadraticCurveTo(74, 0, 62, 14);
  ctx.lineTo(24, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = OGRE.clubDark;
  for (const [x, y] of [[40, -6], [52, 5], [60, -8]]) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = skin; // fist over the handle
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const OGRE = {
  skin: '#6f7f55',
  skinDark: '#4d5a3a',
  skinHit: '#b9c4a6',
  belly: '#859468',
  cloth: '#5a4430',
  tusk: '#efe6cf',
  club: '#6e4a2a',
  clubDark: '#4a3019',
};

// Dust ring where an Ogre blow lands (M2c §2.5): a flattened ring spreading to OGRE_DUST_RADIUS
// and fading, with a few puffs. progress 0 → 1.
export function drawDustRing(ctx, d, progress) {
  const r = C.OGRE_DUST_RADIUS * (0.35 + 0.65 * progress);
  const a = 1 - progress;
  ctx.save();
  ctx.strokeStyle = `rgba(190, 170, 130, ${0.7 * a})`;
  ctx.lineWidth = 6 * a + 1;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(200, 182, 145, ${0.45 * a})`;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(d.x + Math.cos(ang) * r, d.y + Math.sin(ang) * r * 0.4 - progress * 8, 7 * (1 - progress * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// A mini-boss's lane entrance pulsing red as it arrives (M2c §2.6). progress 0 → 1.
export function drawLanePulse(ctx, p, progress) {
  const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 2 * 3);
  const a = (1 - progress) * (0.35 + 0.45 * pulse);
  const R = C.BOSS_LANE_PULSE_RADIUS;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
  g.addColorStop(0, `rgba(255, 40, 25, ${a})`);
  g.addColorStop(1, 'rgba(255, 40, 25, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
  ctx.fill();
}

// Searchable feature, centred on its location (M1c §2.1). A soft glow filling the footprint
// marks it as interactive; hovered: brighter glow; exhausted: dimmed, no glow (§8.4).
export function drawFeature(ctx, feature, hovered) {
  const { x, y } = featureBase(feature);
  const R = C.FEATURE_RADIUS;
  ctx.save();
  if (feature.exhausted) {
    ctx.globalAlpha = 0.4;
  } else {
    ctx.fillStyle = hovered ? COLORS.featureGlowHover : COLORS.featureGlow;
    ctx.beginPath();
    ctx.arc(feature.x, feature.y, C.LOCATION_RADIUS - 1, 0, Math.PI * 2); // −1: anti-aliased edge stays inside
    ctx.fill();
  }

  switch (feature.type) {
    case 'tree': drawPeachTree(ctx, x, y, R); break;
    case 'reedPatch': drawReedPatch(ctx, x, y, R); break;
    case 'shrub': drawFeatherShrub(ctx, x, y, R); break;
    case 'ruins': drawRuins(ctx, x, y, R); break;
    case 'pond': drawPond(ctx, x, y, R); break;
    default: break;
  }
  ctx.restore();
}

// Pebble Sprinkler: a stick post with rotating stick arms and a pebble cup on the
// arm that points along turret.angle (§10.1). Stands on its slot pad, with its pebble cup
// hub at the muzzle (turretMuzzle). upgrading: drawn faded (it is not firing).
// Level 2: gold ring and bands (§11.2). Level 3 (M1e §4.4): a double ring and bands in sky
// blue, and slightly longer arms with a bigger cup.
export function drawTurret(ctx, turret, upgrading) {
  const { x, y } = slotBase(turret);
  const top = y - C.TURRET_MUZZLE_HEIGHT;
  const band = turret.level >= 3 ? COLORS.level3Band : COLORS.upgradeBand;
  const armLength = turret.level >= 3 ? 29 : 27;
  const cupRadius = turret.level >= 3 ? 7 : 6.5;
  ctx.save();
  if (turret.level >= 2) {
    ctx.strokeStyle = band;
    ctx.lineWidth = 3.5;
    const rings = turret.level >= 3 ? [C.TURRET_SLOT_RADIUS - 2, C.TURRET_SLOT_RADIUS + 3] : [C.TURRET_SLOT_RADIUS - 2];
    for (const r of rings) {
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (upgrading) ctx.globalAlpha = 0.5;
  drawShadow(ctx, x, y, 20, 7);

  // Tripod legs and post.
  ctx.strokeStyle = COLORS.stick;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 14, y + 2);
  ctx.lineTo(x, top + 10);
  ctx.moveTo(x + 14, y + 2);
  ctx.lineTo(x, top + 10);
  ctx.moveTo(x, y - 2);
  ctx.lineTo(x, top);
  ctx.stroke();

  // Arms, seen from slightly above (y squashed). Back arms first, front arm last.
  const arms = [0, 1, 2].map((i) => ({ a: turret.angle + (i * 2 * Math.PI) / 3, cup: i === 0 }));
  arms.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
  for (const { a, cup } of arms) {
    const ex = x + Math.cos(a) * armLength;
    const ey = top + Math.sin(a) * 11;
    ctx.strokeStyle = COLORS.stickLight;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    if (cup) {
      ctx.fillStyle = COLORS.cup;
      ctx.beginPath();
      ctx.arc(ex, ey, cupRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.pebble;
      ctx.beginPath();
      ctx.arc(ex, ey - 1.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = COLORS.stick;
  ctx.beginPath();
  ctx.arc(x, top, 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (turret.level >= 2) {
    // Bands on the post and hub, in the level colour.
    ctx.strokeStyle = band;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 6, top + 14);
    ctx.lineTo(x + 6, top + 14);
    ctx.moveTo(x - 6, top + 22);
    ctx.lineTo(x + 6, top + 22);
    ctx.stroke();
    ctx.fillStyle = band;
    ctx.beginPath();
    ctx.arc(x, top, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Pebble in flight (§10.3).
// Poison Toader (M1f §6.5): a squat green-and-purple toad contraption on its slot pad, with
// pipes on its back and a wide mouth that opens briefly when it fires. Drawn front-on; it fits
// inside LOCATION_RADIUS. mouthOpen: 0 … 1. upgrading: faded (not firing).
const TOADER_MOUTH_TIME = 0.25; // s the mouth stays open after a shot (visual only)

export function toaderMouthOpen(turret, t) {
  const age = t - turret.lastFireTime;
  return age >= 0 && age < TOADER_MOUTH_TIME ? 1 - age / TOADER_MOUTH_TIME : 0;
}

// Levels (M1h §2.4), like the Sprinkler's: level 2 a single ring round the pad, level 3 a double
// ring, a slightly larger toad and a third pipe. The rings are purple with a green inner line.
const TOADER_L3_SCALE = 1.1;

export function drawToader(ctx, turret, upgrading, mouthOpen = 0) {
  const { x, y } = slotBase(turret);
  ctx.save();
  if (turret.level >= 2) {
    const rings = turret.level >= 3 ? [C.TURRET_SLOT_RADIUS - 2, C.TURRET_SLOT_RADIUS + 3] : [C.TURRET_SLOT_RADIUS - 2];
    for (const r of rings) {
      for (const [width, color] of [[3.5, COLORS.toaderLevelRing], [1.5, COLORS.toaderLevelRingInner]]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  if (upgrading) ctx.globalAlpha = 0.5;
  drawShadow(ctx, x, y, 24, 8);
  ctx.translate(x, y);
  if (turret.level >= 3) ctx.scale(TOADER_L3_SCALE, TOADER_L3_SCALE);

  // Pipes on its back, behind the body (a third, central one at level 3).
  const pipes = [[-12, -20, -19, -34], [11, -22, 16, -33]];
  if (turret.level >= 3) pipes.push([0, -24, -1, -39]);
  ctx.strokeStyle = COLORS.toaderPipe;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of pipes) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.fillStyle = COLORS.toaderPipeCap;
  for (const [, , px, py] of pipes) {
    ctx.beginPath();
    ctx.ellipse(px, py, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Body, belly and purple spots.
  ctx.fillStyle = COLORS.toaderBody;
  ctx.beginPath();
  ctx.ellipse(0, -13, 23, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.toaderBelly;
  ctx.beginPath();
  ctx.ellipse(0, -7, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.toaderSpot;
  for (const [sx, sy, sr] of [[-14, -17, 3.5], [13, -18, 3], [-5, -23, 2.5], [6, -24, 2]]) {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bulging eyes.
  for (const ex of [-9, 9]) {
    ctx.fillStyle = COLORS.toaderBody;
    ctx.beginPath();
    ctx.arc(ex, -26, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.toaderEye;
    ctx.beginPath();
    ctx.arc(ex, -26.5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1410';
    ctx.beginPath();
    ctx.ellipse(ex, -26.5, 1.2, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Wide mouth: a line at rest, an open purple maw when it fires.
  if (mouthOpen > 0) {
    ctx.fillStyle = COLORS.toaderMouth;
    ctx.beginPath();
    ctx.ellipse(0, -11, 15, 2 + 6 * mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = COLORS.toaderMouthLine;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-15, -12);
    ctx.quadraticCurveTo(0, -7, 15, -12);
    ctx.stroke();
  }
  ctx.restore();
}

// Toader pellet in flight (M1f §6.5): a small purple ball with a highlight.
export function drawPellet(ctx, p) {
  ctx.save();
  ctx.fillStyle = COLORS.pellet;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.pelletLight;
  ctx.beginPath();
  ctx.arc(p.x - 1.5, p.y - 1.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Poison cloud (M1f §6.5): grows from pellet size to its full radius over CLOUD_GROW_TIME,
// swirls slowly, and fades out over its last CLOUD_FADE_TIME. Its outer ring is drawn at the
// damage radius, so the visible edge matches what it hits. radius: full damage radius.
export function drawCloud(ctx, cloud, radius, duration) {
  const grow = Math.min(1, cloud.age / C.CLOUD_GROW_TIME);
  const r = 5 + (radius - 5) * grow;
  const fade = Math.min(1, Math.max(0, (duration - cloud.age) / C.CLOUD_FADE_TIME));
  const pulse = 1 + 0.06 * Math.sin(cloud.age * 4);
  ctx.save();
  ctx.globalAlpha = fade;
  const g = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, r);
  g.addColorStop(0, COLORS.cloudCore);
  g.addColorStop(0.7, COLORS.cloudMid);
  g.addColorStop(1, COLORS.cloudEdge);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cloud.x, cloud.y, r, 0, Math.PI * 2);
  ctx.fill();
  // Slow swirl: two arcs turning inside.
  ctx.strokeStyle = COLORS.cloudSwirl;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const a = cloud.age * 1.6 + i * Math.PI;
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, r * 0.55 * pulse, a, a + 1.6);
    ctx.stroke();
  }
  // Edge ring at the damage radius.
  ctx.strokeStyle = COLORS.cloudRing;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cloud.x, cloud.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawPebble(ctx, p) {
  // Short fading trail behind it so fast pebbles read as motion.
  const trail = ctx.createLinearGradient(p.x, p.y, p.x - p.dirX * 22, p.y - p.dirY * 22);
  trail.addColorStop(0, COLORS.pebbleTrail);
  trail.addColorStop(1, 'rgba(255, 250, 230, 0)');
  ctx.strokeStyle = trail;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x - p.dirX * 22, p.y - p.dirY * 22);
  ctx.stroke();

  ctx.fillStyle = COLORS.pebbleEdge;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.pebbleFlight;
  ctx.beginPath();
  ctx.arc(p.x - 0.5, p.y - 0.5, 4.8, 0, Math.PI * 2);
  ctx.fill();
}

// Range circle centred on (x, y).
// The next level's range while the upgrade menu is open (M1e §4.3): faint, dashed, no fill.
export function drawNextRange(ctx, x, y, radius) {
  ctx.save();
  ctx.strokeStyle = COLORS.nextRangeEdge;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawRange(ctx, x, y, radius) {
  ctx.save();
  ctx.fillStyle = COLORS.rangeFill;
  ctx.strokeStyle = COLORS.rangeEdge;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 6]);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Timed-action progress bar centred on x with its top at y (§16.3).
export function drawProgressBar(ctx, x, y, fraction) {
  const w = 60;
  const h = 8;
  const f = Math.max(0, Math.min(1, fraction));
  ctx.fillStyle = COLORS.hpBack;
  ctx.fillRect(x - w / 2 - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = COLORS.progress;
  ctx.fillRect(x - w / 2, y, w * f, h);
}

// Rising, fading text such as "+2 Pits". t: 0 → 1 over its lifetime.
// small: Squirrel pickups (M1d §1.4), which come in quick bursts and must not drown each other out.
// muted: grey ("Nothing found", M2d §1.2).
export function drawFloatingText(ctx, text, x, y, t, small = false, muted = false) {
  ctx.save();
  ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
  ctx.font = small ? 'bold 15px Georgia, serif' : 'bold 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = small ? 3 : 4;
  ctx.strokeStyle = COLORS.floatOutline;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = muted ? COLORS.floatMuted : COLORS.floatText;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Resource floater (M2d §1.1): the resource's shared icon with "×N" beside it, rising
// FLOATER_RISE_PX with an ease-out and fading over the last 40%. t: 0 → 1 over FLOATER_TIME.
export function drawFloater(ctx, f, t) {
  const img = resourceIconImage(f.resource);
  const size = C.FLOATER_ICON_SIZE;
  const rise = C.FLOATER_RISE_PX * (1 - (1 - t) * (1 - t));
  const y = f.y - rise;
  const text = `×${f.amount}`;
  ctx.save();
  ctx.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
  ctx.font = 'bold 20px Georgia, serif';
  const w = size + 4 + ctx.measureText(text).width;
  const left = f.x - w / 2;
  // Soft dark backing behind icon and text, so it reads on every palette.
  ctx.fillStyle = COLORS.floaterBacking;
  ctx.beginPath();
  ctx.roundRect(left - 5, y - size / 2 - 3, w + 10, size + 6, 9);
  ctx.fill();
  if (img.complete) ctx.drawImage(img, left, y - size / 2, size, size);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = COLORS.floatOutline;
  ctx.strokeText(text, left + size + 4, y + 1);
  ctx.fillStyle = COLORS.floatText;
  ctx.fillText(text, left + size + 4, y + 1);
  ctx.restore();
}

// A swept drop (M2d §2.2) at (x, y), at `scale` of its size on the ground.
export function drawSweepItem(ctx, resource, x, y, scale) {
  const img = resourceIconImage(resource);
  const size = C.RESOURCE_ICON_SIZE * C.DROP_ICON_SCALE * scale;
  if (img.complete) ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
}

function drawPeachTree(ctx, x, y, R) {
  drawShadow(ctx, x, y, R * 0.65, R * 0.25);
  ctx.fillStyle = '#5a3d26';
  ctx.fillRect(x - 5, y - R * 1.1, 10, R * 1.1);
  const cy = y - R * 1.6;
  ctx.fillStyle = COLORS.peachTreeCanopy;
  ctx.beginPath();
  ctx.arc(x, cy, R * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.peach;
  for (const [dx, dy] of [[-14, -6], [10, -14], [16, 8], [-4, 12], [-20, 12], [2, -24]]) {
    ctx.beginPath();
    ctx.arc(x + dx, cy + dy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawReedPatch(ctx, x, y, R) {
  ctx.fillStyle = COLORS.water;
  ctx.beginPath();
  ctx.ellipse(x, y, R, R * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const rx = x - R * 0.75 + (i * R * 1.5) / 8;
    const h = R * (0.9 + ((i * 7) % 5) * 0.12);
    const lean = ((i % 3) - 1) * 4;
    ctx.strokeStyle = COLORS.reed;
    ctx.beginPath();
    ctx.moveTo(rx, y + ((i % 2) * 6 - 3));
    ctx.lineTo(rx + lean, y - h);
    ctx.stroke();
    if (i % 2 === 0) {
      ctx.fillStyle = COLORS.cattail;
      ctx.fillRect(rx + lean - 3, y - h - 2, 6, 12);
    }
  }
}

function drawFeatherShrub(ctx, x, y, R) {
  drawShadow(ctx, x, y, R * 0.9, R * 0.28);
  ctx.fillStyle = COLORS.shrub;
  for (const [dx, dy, r] of [[-16, -14, 18], [16, -14, 18], [0, -28, 20], [0, -12, 18]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Feathers caught in the branches.
  ctx.fillStyle = COLORS.feather;
  for (const [dx, dy, a] of [[-18, -30, -0.6], [14, -36, 0.5], [22, -16, 1.1], [-6, -18, -0.2]]) {
    ctx.save();
    ctx.translate(x + dx, y + dy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawRuins(ctx, x, y, R) {
  drawShadow(ctx, x, y, R, R * 0.3);
  // Fallen blocks.
  ctx.fillStyle = COLORS.stoneDark;
  ctx.fillRect(x - R, y - 14, 26, 14);
  ctx.fillRect(x + R * 0.3, y - 10, 22, 10);
  // Broken column and arch stub.
  ctx.fillStyle = COLORS.stone;
  ctx.fillRect(x - 12, y - R * 1.5, 18, R * 1.5);
  ctx.fillRect(x + 10, y - R * 0.9, 14, R * 0.9);
  ctx.fillStyle = COLORS.stoneDark;
  ctx.beginPath();
  ctx.moveTo(x - 12, y - R * 1.5);
  ctx.lineTo(x + 6, y - R * 1.5);
  ctx.lineTo(x + 6, y - R * 1.3);
  ctx.lineTo(x - 4, y - R * 1.65);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.moss;
  ctx.fillRect(x - 12, y - 10, 18, 4);
}

function drawPond(ctx, x, y, R) {
  ctx.fillStyle = COLORS.waterRim;
  ctx.beginPath();
  ctx.ellipse(x, y, R + 4, R * 0.6 + 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.water;
  ctx.beginPath();
  ctx.ellipse(x, y, R, R * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.waterLight;
  ctx.beginPath();
  ctx.ellipse(x - R * 0.3, y - R * 0.15, R * 0.35, R * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.moss;
  ctx.beginPath();
  ctx.arc(x + R * 0.4, y + R * 0.1, 6, 0, Math.PI * 2);
  ctx.fill();
}

// Visual size of the Vulture sprite relative to VULTURE_RADIUS (drawing only; collision is unchanged).
const VULTURE_DRAW_SCALE = 1.35;

// Vulture (§15.2): side-view bird with a bald pink head. Flying/hovering: drawn above its
// ground shadow with flapping wings. Landed: on the ground, wings folded, pecking.
// t: time in seconds (wing flap); hit: bitten flash; pecking: head down.
export function drawVulture(ctx, v, t, hit, pecking, ghost = false) {
  const r = C.VULTURE_RADIUS;
  const airborne = v.state !== 'LANDED';
  const lift = airborne ? C.VULTURE_FLIGHT_HEIGHT : 0;
  const k = (r / 14) * VULTURE_DRAW_SCALE; // drawn at radius 14, facing right
  drawShadow(ctx, v.x, v.y + r * 0.4, r * (airborne ? 0.9 : 1.1) * VULTURE_DRAW_SCALE, r * 0.3 * VULTURE_DRAW_SCALE);

  ctx.save();
  if (ghost) ctx.globalAlpha = 0.5;
  ctx.translate(v.x, v.y + r * 0.4 - lift);
  ctx.scale(v.facing * k, k);

  if (!airborne) {
    ctx.strokeStyle = COLORS.vultureBeak;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-3, -6);
    ctx.lineTo(-4, 0);
    ctx.moveTo(4, -6);
    ctx.lineTo(5, 0);
    ctx.stroke();
  }

  const body = hit ? COLORS.vultureHit : COLORS.vulture;
  // Far wing (flying only), body, near wing.
  const flap = airborne ? Math.sin(t * 14 + v.id) : 0;
  if (airborne) drawWing(ctx, -flap, COLORS.vultureDark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(-2, -14, 14, 9, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath(); // tail
  ctx.moveTo(-14, -16);
  ctx.lineTo(-24, -10);
  ctx.lineTo(-13, -9);
  ctx.closePath();
  ctx.fill();
  if (airborne) {
    drawWing(ctx, flap, body);
  } else {
    ctx.fillStyle = COLORS.vultureDark;
    ctx.beginPath();
    ctx.ellipse(-4, -14, 10, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // White ruff, neck and bald head; head drops forward when pecking.
  const hx = pecking ? 17 : 13;
  const hy = pecking ? -12 : -25;
  ctx.fillStyle = COLORS.vultureRuff;
  ctx.beginPath();
  ctx.arc(8, -19, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.vultureHead;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(9, -20);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.fillStyle = COLORS.vultureHead;
  ctx.beginPath();
  ctx.arc(hx, hy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.vultureBeak;
  ctx.beginPath();
  ctx.moveTo(hx + 3, hy - 2);
  ctx.lineTo(hx + 10, hy + 1);
  ctx.lineTo(hx + 4, hy + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a1410';
  ctx.beginPath();
  ctx.arc(hx + 1.5, hy - 1.5, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// One wing seen from the side; flap −1 … 1 swings it up and down.
function drawWing(ctx, flap, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-8, -16);
  ctx.lineTo(6, -16);
  ctx.lineTo(-6 + flap * 4, -16 - 22 * flap - 4);
  ctx.lineTo(-20, -16 - 16 * flap - 2);
  ctx.closePath();
  ctx.fill();
}

// Vulture HP bar and its duration indicator: a ring that shrinks as time runs out (§15.2).
// Summon status (§15.2, M1d §2.5): duration ring on the ground and an HP bar at hpY.
function drawSummonStatus(ctx, x, y, r, hpY, durationFrac, hpFrac) {
  const frac = Math.max(0, durationFrac);
  ctx.save();
  ctx.strokeStyle = COLORS.durationBack;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.4, r + 8, (r + 8) * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = COLORS.duration;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.4, r + 8, (r + 8) * 0.55, 0, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawHpBar(ctx, x, hpY, 28, hpFrac);
}

export function drawVultureStatus(ctx, v) {
  const r = C.VULTURE_RADIUS;
  const lift = v.state !== 'LANDED' ? C.VULTURE_FLIGHT_HEIGHT : 0;
  drawSummonStatus(ctx, v.x, v.y, r, v.y - lift - r * 3.6, v.remaining / v.duration, v.hp / C.VULTURE_HP);
}

// Visual size of the Squirrel sprite relative to SQUIRREL_RADIUS (drawing only).
const SQUIRREL_DRAW_SCALE = 1.35;

// Squirrel (M1d §2.5): small side-view placeholder, brown body and a large bushy tail.
// Running: hops (driven by distance run). Waiting: tail sways. t: seconds; hit: bitten flash.
export function drawSquirrel(ctx, s, t, hit, ghost = false) {
  const r = C.SQUIRREL_RADIUS;
  const k = (r / 12) * SQUIRREL_DRAW_SCALE; // drawn at radius 12, facing right
  const moving = s.state === 'MOVING';
  const hop = moving ? Math.abs(Math.sin(s.stride * 0.12)) * 5 : 0;
  const sway = moving ? -0.15 : Math.sin(t * 3 + s.id) * 0.12;
  drawShadow(ctx, s.x, s.y + r * 0.4, r * 1.1 * SQUIRREL_DRAW_SCALE, r * 0.3 * SQUIRREL_DRAW_SCALE);

  ctx.save();
  if (ghost) ctx.globalAlpha = 0.5;
  ctx.translate(s.x, s.y + r * 0.4 - hop);
  ctx.scale(s.facing * k, k);

  // Tail behind the body: two overlapping puffs, curling up and over the back.
  ctx.save();
  ctx.translate(-8, -6);
  ctx.rotate(sway);
  ctx.fillStyle = COLORS.squirrelTail;
  ctx.beginPath();
  ctx.ellipse(-6, -12, 8, 14, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.squirrelTailTip;
  ctx.beginPath();
  ctx.ellipse(-1, -27, 7.5, 6.5, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const body = hit ? COLORS.squirrelHit : COLORS.squirrel;
  ctx.fillStyle = body;
  ctx.beginPath(); // feet
  ctx.ellipse(-4, -1, 4, 2.2, 0, 0, Math.PI * 2);
  ctx.ellipse(6, -1, 3.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath(); // body
  ctx.ellipse(0, -9, 10, 8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath(); // head and ear
  ctx.arc(9, -17, 6, 0, Math.PI * 2);
  ctx.moveTo(6, -21);
  ctx.lineTo(8, -28);
  ctx.lineTo(11, -21);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.squirrelBelly;
  ctx.beginPath();
  ctx.ellipse(4, -7, 4.5, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1410';
  ctx.beginPath();
  ctx.arc(11, -18, 1.4, 0, Math.PI * 2);
  ctx.arc(15, -16, 1, 0, Math.PI * 2); // nose
  ctx.fill();
  ctx.restore();
}

export function drawSquirrelStatus(ctx, s) {
  const r = C.SQUIRREL_RADIUS;
  drawSummonStatus(ctx, s.x, s.y, r, s.y - r * 4.2, s.remaining / s.duration, s.hp / C.SQUIRREL_HP);
}

// Placement ghost (M1d §2.1): the same shape, translucent; with SQUIRREL_BLOCKS_WOLVES it also
// shows the block radius, like the Vulture's ghost.
export function drawSquirrelGhost(ctx, p, t) {
  if (C.SQUIRREL_BLOCKS_WOLVES) {
    ctx.save();
    ctx.strokeStyle = COLORS.duration;
    ctx.fillStyle = 'rgba(232, 197, 71, 0.12)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, C.SQUIRREL_BLOCK_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  drawSquirrel(ctx, { x: p.x, y: p.y, state: 'WAITING', facing: 1, id: 0, stride: 0 }, t, false, true);
}

// Placement ghost under the cursor (§15.1): translucent Vulture plus its block radius.
export function drawVultureGhost(ctx, p, t) {
  ctx.save();
  ctx.strokeStyle = COLORS.duration;
  ctx.fillStyle = 'rgba(232, 197, 71, 0.12)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.arc(p.x, p.y, C.VULTURE_BLOCK_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drawVulture(ctx, { x: p.x, y: p.y, state: 'HOVERING', facing: 1, id: 0 }, t, false, false, true);
}
