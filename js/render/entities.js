// Placeholder drawings for gameplay entities. One function per entity so each can
// later be swapped for a sprite without touching gameplay code (spec §5.2).

import * as C from '../config.js';
import { drawShadow } from './environment.js';

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
  rangeFill: 'rgba(255, 245, 200, 0.08)',
  rangeEdge: 'rgba(255, 245, 200, 0.7)',
  progress: '#f0d878',
  floatText: '#fff1c4',
  floatOutline: 'rgba(30, 20, 10, 0.85)',
  vulture: '#4a3326',
  vultureDark: '#2f2019',
  vultureHit: '#a8857a',
  vultureRuff: '#e9e2d2',
  vultureHead: '#d98b80',
  vultureBeak: '#e3c15a',
  duration: '#e8c547',
  durationBack: 'rgba(0, 0, 0, 0.45)',
};

// M1c §2.1: every feature and turret is drawn inside its location's footprint circle
// (LOCATION_RADIUS around the location centre). Upright sprites therefore stand on a base
// point below the centre; these offsets centre each sprite's drawn extent on the location.
// Visual only: gameplay (range, travel cost, targeting) uses the location centre.
const FEATURE_BASE_OFFSET = { tree: 36, reedPatch: 15, shrub: 20, ruins: 22, pond: 0 };

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

// The Druid, drawn upright and centred on (x, y) with feet just below. hurt: brief red flash.
export function drawDruid(ctx, x, y, hurt) {
  const r = C.DRUID_RADIUS;
  const feet = y + r * 0.6;
  drawShadow(ctx, x, feet, r * 0.9, r * 0.3);

  // Staff behind the body.
  ctx.strokeStyle = COLORS.staff;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.75, feet);
  ctx.lineTo(x + r * 0.75, y - r * 1.9);
  ctx.stroke();
  ctx.fillStyle = COLORS.staffGem;
  ctx.beginPath();
  ctx.arc(x + r * 0.75, y - r * 2, 5, 0, Math.PI * 2);
  ctx.fill();

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

  if (hurt) {
    ctx.fillStyle = COLORS.hitFlash;
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.55, r * 0.6, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Demonic Wolf: side-view quadruped with red eyes, standing on its collision centre.
// hit: brief pale flash when a pebble lands; lunging: just bit something.
export function drawWolf(ctx, wolf, hit, lunging) {
  const r = C.WOLF_RADIUS;
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
  ctx.fillStyle = hit ? COLORS.wolfHit : COLORS.wolf;
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
export function drawDruidHpBar(ctx, x, y, hp) {
  drawHpBar(ctx, x, y - C.DRUID_RADIUS * 2.55, 56, hp / C.DRUID_HP);
}

// Wolf HP bar: hidden until the wolf first takes damage (§13).
export function drawWolfHpBar(ctx, wolf) {
  if (wolf.hp >= C.WOLF_HP) return;
  drawHpBar(ctx, wolf.x, wolf.y - C.WOLF_RADIUS * 2.9, 30, wolf.hp / C.WOLF_HP);
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
// hub at the muzzle (turretMuzzle). upgrading: drawn faded (it is not firing); upgraded:
// gold ring and bands (§11.2).
export function drawTurret(ctx, turret, upgrading) {
  const { x, y } = slotBase(turret);
  const top = y - C.TURRET_MUZZLE_HEIGHT;
  ctx.save();
  if (turret.upgraded) {
    ctx.strokeStyle = COLORS.upgradeBand;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(x, y, C.TURRET_SLOT_RADIUS - 2, (C.TURRET_SLOT_RADIUS - 2) * 0.7, 0, 0, Math.PI * 2);
    ctx.stroke();
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
    const ex = x + Math.cos(a) * 27;
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
      ctx.arc(ex, ey, 6.5, 0, Math.PI * 2);
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
  if (turret.upgraded) {
    // Gold bands on the post and hub.
    ctx.strokeStyle = COLORS.upgradeBand;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 6, top + 14);
    ctx.lineTo(x + 6, top + 14);
    ctx.moveTo(x - 6, top + 22);
    ctx.lineTo(x + 6, top + 22);
    ctx.stroke();
    ctx.fillStyle = COLORS.upgradeBand;
    ctx.beginPath();
    ctx.arc(x, top, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Pebble in flight (§10.3).
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
export function drawFloatingText(ctx, text, x, y, t) {
  ctx.save();
  ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = COLORS.floatOutline;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = COLORS.floatText;
  ctx.fillText(text, x, y);
  ctx.restore();
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
export function drawVultureStatus(ctx, v) {
  const r = C.VULTURE_RADIUS;
  const lift = v.state !== 'LANDED' ? C.VULTURE_FLIGHT_HEIGHT : 0;
  const frac = Math.max(0, v.remaining / C.VULTURE_DURATION);
  ctx.save();
  ctx.strokeStyle = COLORS.durationBack;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(v.x, v.y + r * 0.4, r + 8, (r + 8) * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = COLORS.duration;
  ctx.beginPath();
  ctx.ellipse(v.x, v.y + r * 0.4, r + 8, (r + 8) * 0.55, 0, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawHpBar(ctx, v.x, v.y - lift - r * 3.6, 28, v.hp / C.VULTURE_HP);
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
