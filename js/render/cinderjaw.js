// Cinderjaw (M2o §4): the turret (a carved Komodo dragon head on a squat stone-and-wood base),
// its fire cone, burning enemies and Wildfire embers. Visual only.

import * as C from '../config.js';
import { drawShadow } from './environment.js';
import { artBase, spotDrawn, levelRingRadii } from './entities.js';

const COLORS = {
  stone: '#6d675c',
  stoneLight: '#8c867a',
  wood: '#6a4a2c',
  woodDark: '#43301c',
  head: '#6f6c4c',
  headDark: '#4d4b34',
  jaw: '#5d5a3f',
  plate: '#5a5840',
  plateEdge: '#3f3e2b',
  mouth: '#3a1c12',
  tongue: '#c8473a',
  eye: '#e8d27a',
  ember: '#ff8a2a',
  emberHot: '#ffd36a',
  crack: '#ff9a3a',
  smoke: 'rgba(170, 165, 158, ALPHA)',
  ring: '#c0622a',
  ringInner: '#ffb260',
  flame: ['#fff2a8', '#ffc64a', '#ff8a2a', '#e2551e'],
};
const alpha = (c, a) => c.replace('ALPHA', a.toFixed(3));

const JAW_OPEN_TIME = 0.4; // s the jaw stays open after a breath (matches the cone)

// The turret on its slot. upgrading: faded. anim: animation time, s (tongue, smoke, shimmer).
// The head turns to face turret.angle: it flips left / right and tilts a little up or down.
export const drawCinderjaw = spotDrawn(drawCinderjawArt);

function drawCinderjawArt(ctx, turret, upgrading, anim = 0) {
  const { x, y } = artBase(turret);
  const level = turret.level ?? 1;
  ctx.save();
  // Level rings round the pad, in ember colours (as the other turrets have theirs).
  if (level >= 2) {
    for (const r of levelRingRadii(level)) {
      for (const [width, color] of [[3.5, COLORS.ring], [1.5, COLORS.ringInner]]) {
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

  // Base: a squat block of stones with a wooden collar.
  ctx.fillStyle = COLORS.stone;
  ctx.beginPath();
  ctx.roundRect(x - 20, y - 18, 40, 20, 5);
  ctx.fill();
  ctx.fillStyle = COLORS.stoneLight;
  for (const [sx, sy] of [[-12, -12], [2, -14], [12, -8], [-4, -6]]) {
    ctx.beginPath();
    ctx.ellipse(x + sx, y + sy, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.wood;
  ctx.fillRect(x - 16, y - 24, 32, 7);
  ctx.strokeStyle = COLORS.woodDark;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 16, y - 24, 32, 7);

  // Head, about its neck on the collar.
  const angle = turret.angle ?? -Math.PI / 2;
  const facing = Math.cos(angle) >= 0 ? 1 : -1;
  const tilt = Math.max(-0.35, Math.min(0.35, Math.sin(angle) * 0.4));
  const age = anim - (turret.lastFireTime ?? -Infinity);
  const open = age >= 0 && age < JAW_OPEN_TIME ? Math.sin((age / JAW_OPEN_TIME) * Math.PI) : 0;
  const neckY = y - C.TURRET_TYPES.cinderjaw.muzzleHeight + 4;
  ctx.translate(x, neckY);
  ctx.scale(facing, 1);
  ctx.rotate(tilt * facing);
  drawHead(ctx, level, open, anim, turret.id ?? 0);
  ctx.restore();
}

// The head in its own frame: neck at (0, 0), snout toward +x. open: 0 … 1.
function drawHead(ctx, level, open, anim, seed) {
  // Neck.
  ctx.fillStyle = COLORS.headDark;
  ctx.beginPath();
  ctx.ellipse(-4, 4, 10, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lower jaw, swinging down when it breathes.
  ctx.save();
  ctx.translate(-2, 2);
  ctx.rotate(open * 0.5);
  ctx.fillStyle = COLORS.jaw;
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.quadraticCurveTo(14, 7, 27, 2);
  ctx.lineTo(27, -1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Mouth inside, glowing as it breathes.
  if (open > 0) {
    ctx.fillStyle = COLORS.mouth;
    ctx.beginPath();
    ctx.moveTo(-1, -1);
    ctx.lineTo(27, -2);
    ctx.lineTo(25, 2 + open * 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = alpha('rgba(255, 170, 60, ALPHA)', 0.8 * open);
    ctx.beginPath();
    ctx.ellipse(12, 2 + open * 4, 9, 3 + open * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Upper head: a long flat skull tapering to a blunt snout.
  ctx.fillStyle = COLORS.head;
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.quadraticCurveTo(-10, -13, 6, -12);
  ctx.quadraticCurveTo(22, -10, 30, -4);
  ctx.quadraticCurveTo(31, 0, 27, 0);
  ctx.lineTo(-1, 0);
  ctx.closePath();
  ctx.fill();
  // Level 3+: heavier scale plates along the top of the head.
  ctx.fillStyle = level >= 3 ? COLORS.plate : COLORS.headDark;
  ctx.strokeStyle = COLORS.plateEdge;
  ctx.lineWidth = 1;
  const plates = level >= 3 ? [[-6, -11, 5], [2, -12, 5], [10, -11, 4.5], [17, -9, 4]] : [[-2, -11, 3], [8, -11, 2.5]];
  for (const [px, py, r] of plates) {
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (level >= 3) ctx.stroke();
  }
  // Nostril and eye (level 2+: glowing ember eye).
  ctx.fillStyle = COLORS.headDark;
  ctx.beginPath();
  ctx.arc(27, -4, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  if (level >= 2) {
    ctx.shadowColor = COLORS.ember;
    ctx.shadowBlur = 7;
  }
  ctx.fillStyle = level >= 2 ? COLORS.ember : COLORS.eye;
  ctx.beginPath();
  ctx.ellipse(6, -6.5, 3, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#1a120c';
  ctx.beginPath();
  ctx.ellipse(6.5, -6.5, 0.9, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Level 5: molten cracks across the head.
  if (level >= 5) {
    ctx.save();
    ctx.strokeStyle = COLORS.crack;
    ctx.shadowColor = COLORS.ember;
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-8, -6); ctx.lineTo(-2, -3); ctx.lineTo(3, -8);
    ctx.moveTo(14, -9); ctx.lineTo(18, -5); ctx.lineTo(23, -6);
    ctx.stroke();
    ctx.restore();
  }
  // Idle: the forked tongue flicks out now and then (not while breathing).
  const flick = (anim + seed * 0.37) % C.CINDERJAW_TONGUE_PERIOD;
  if (open === 0 && flick < 0.25) {
    const out = Math.sin((flick / 0.25) * Math.PI) * 12;
    ctx.strokeStyle = COLORS.tongue;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(28, -1);
    ctx.lineTo(28 + out, -1);
    ctx.lineTo(31 + out, -4);
    ctx.moveTo(28 + out, -1);
    ctx.lineTo(31 + out, 2);
    ctx.stroke();
  }
  // Level 4+: smoke curls from the nostril between bursts.
  if (level >= 4 && open === 0) {
    for (let i = 0; i < 3; i++) {
      const k = ((anim * 0.6 + i / 3 + seed * 0.13) % 1);
      ctx.fillStyle = alpha(COLORS.smoke, 0.45 * (1 - k));
      ctx.beginPath();
      ctx.arc(28 + Math.sin(k * 6 + i) * 3, -6 - k * 22, 2 + k * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Level 5: a faint heat shimmer rising over the head.
  if (level >= 5) {
    ctx.strokeStyle = 'rgba(255, 210, 150, 0.22)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const sx = -4 + i * 9;
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) {
        const py = -16 - k * 3;
        const px = sx + Math.sin(anim * 5 + k * 0.9 + i) * 2;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
}

// A breath (§4.2): orange-yellow flame filling the cone, its edges the real cone's, fading over
// CONE_BURST_TIME. Particles are placed from the burst's own numbers (no RNG).
export function drawConeBurst(ctx, b) {
  const k = b.age / C.CONE_BURST_TIME;
  const reach = b.range * Math.min(1, k * 3); // the flame shoots out fast, then fades
  ctx.save();
  ctx.globalAlpha = 1 - k;
  const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.range);
  g.addColorStop(0, 'rgba(255, 240, 160, 0.75)');
  g.addColorStop(0.5, 'rgba(255, 170, 60, 0.55)');
  g.addColorStop(1, 'rgba(230, 80, 30, 0.15)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.arc(b.x, b.y, reach, b.aim - b.half, b.aim + b.half);
  ctx.closePath();
  ctx.fill();
  // Flame tongues along the cone.
  for (let i = 0; i < 18; i++) {
    const a = b.aim + b.half * (((i * 7) % 18) / 9 - 1) * 0.9;
    const d = reach * (0.25 + ((i * 5) % 18) / 24);
    const r = 5 + (i % 4) * 2;
    ctx.fillStyle = COLORS.flame[i % COLORS.flame.length];
    ctx.beginPath();
    ctx.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d - k * 14, r * (1 - k * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  // The cone's edge (also the "faint cone outline toward the target while firing", §4.1).
  ctx.strokeStyle = 'rgba(255, 190, 90, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.arc(b.x, b.y, b.range, b.aim - b.half, b.aim + b.half);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// A burning enemy (§4.2): a subtle warm glow over its body (added light, so its own colours show
// through, and a slow or Corrosion tint still reads under it), small flickering flames and a few
// rising sparks. (x, y): its body centre; r: its radius.
export function drawBurning(ctx, x, y, r, anim, seed) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 1.3);
  glow.addColorStop(0, `rgba(255, 110, 30, ${0.22 + 0.06 * Math.sin(anim * 9 + seed)})`);
  glow.addColorStop(1, 'rgba(255, 110, 30, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 3; i++) {
    const fx = x + (i - 1) * r * 0.45;
    const h = r * (0.55 + 0.25 * Math.sin(anim * 11 + i * 2.1 + seed));
    const w = r * 0.22;
    ctx.fillStyle = i === 1 ? COLORS.emberHot : COLORS.ember;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(fx - w, y);
    ctx.quadraticCurveTo(fx - w * 0.5, y - h * 0.6, fx + Math.sin(anim * 7 + i) * w * 0.5, y - h);
    ctx.quadraticCurveTo(fx + w * 0.5, y - h * 0.6, fx + w, y);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 3; i++) {
    const k = (anim * 0.9 + i / 3 + seed * 0.21) % 1;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = COLORS.emberHot;
    ctx.beginPath();
    ctx.arc(x + Math.sin(k * 9 + i * 2) * r * 0.5, y - r * 0.6 - k * r * 1.6, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Wildfire (§4.2): a small burst of embers arcing from the dying enemy to a newly lit one, at `to`.
export function drawEmberJump(ctx, j, to) {
  const k = j.age / C.EMBER_JUMP_TIME;
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const t = Math.max(0, Math.min(1, k * 1.3 - i * 0.08));
    const px = j.from.x + (to.x - j.from.x) * t + Math.sin(i * 2.4) * 5;
    const py = j.from.y + (to.y - j.from.y) * t - Math.sin(t * Math.PI) * 28 - 10;
    ctx.globalAlpha = 1 - k * 0.7;
    ctx.fillStyle = i % 2 ? COLORS.ember : COLORS.emberHot;
    ctx.beginPath();
    ctx.arc(px, py, 2.4 - i * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
