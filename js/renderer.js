// Canvas drawing. Reads game state, the static scene and view (UI) state; never modifies them.

import * as C from './config.js';
import { GameState, ActionState } from './states.js';
import { drawDebugOverlay } from './debug/debugOverlay.js';
import { drawFloor, drawCorridors, drawDecor } from './render/environment.js';
import {
  drawTurretSlot, drawDruid, drawFeature, drawWolf, drawBear, drawEnemyHpBar, drawDruidHpBar,
  drawTurret, drawToader, toaderMouthOpen, drawPellet, drawCloud, drawRange, drawProgressBar, drawFloatingText, drawPebble,
  drawVulture, drawVultureStatus, drawVultureGhost, featureBase, slotBase, drawDrop,
  drawSquirrel, drawSquirrelStatus, drawSquirrelGhost, drawSwipe, drawSpark, drawNextRange, DRUID_REST_POSE,
} from './render/entities.js';
import { turretRange, levelRange, maxLevel, turretType } from './entities/turret.js';
import { druidDisplayPos, actionTargetPos, isTimedAction, isUpgradingSlot } from './systems/actionSystem.js';
import { isStepMode, routePreview } from './systems/stepSystem.js';
import { footprintLayout, drawFootsteps } from './render/footsteps.js';
import { animationTime } from './game.js';

const HIT_FLASH_TIME = 0.15; // s of hit flash on the Druid (bite) or an enemy (pebble); visual only
// Draw function per enemy type (M1e §3.4): ENEMY_TYPES holds the data, this holds the look.
const ENEMY_DRAW = { wolf: drawWolf, bear: drawBear };
const PROGRESS_GAP = 12;     // px between the top of a location's footprint and its progress bar

const COLORS = {
  hudBackdrop: '#10160e',
  marker: '#ffe066',
  trail: 'rgba(245, 232, 190, 0.32)',   // route so far (M1b §5.5)
};

export function createRenderer(canvas, scene) {
  const ctx = canvas.getContext('2d');
  canvas.width = C.STAGE_WIDTH;
  canvas.height = C.STAGE_HEIGHT;

  // Static decor; everything else is merged in and y-sorted per frame.
  const decor = scene.decor.map((item) => ({ y: item.y, draw: () => drawDecor(ctx, item) }));

  function render(game, view) {
    const isPrep = game.state === GameState.PREP;
    const hover = view.hover;

    // Ground layer.
    drawFloor(ctx, scene);
    drawCorridors(ctx, scene);
    game.slots.forEach((slot, i) => {
      drawTurretSlot(ctx, slot, !isPrep, isPrep && hover?.kind === 'slot' && hover.index === i);
    });
    // Enemy drops lie on the ground: above floor, corridors and pads, below anything upright (M1d §1.3).
    const now = performance.now() / 1000;
    for (const drop of game.drops) drawDrop(ctx, drop, now);
    // Poison clouds lie on the ground too, under anything upright (M1f §6.5).
    for (const cloud of game.clouds) {
      const spec = turretType(cloud.source).cloud;
      drawCloud(ctx, cloud, spec.radius, spec.duration);
    }
    drawRanges(ctx, game, view);
    if (isPrep && isStepMode(game)) drawRouteTrail(ctx, game.route);

    // Upright layer, y-sorted so lower objects appear in front (§5.2).
    const druidPos = druidDisplayPos(game);
    // Animation clock: keeps running through ENDING so effects finish (M1e §1.2).
    const anim = animationTime(game);
    const recent = (time) => anim - time < HIT_FLASH_TIME;
    const hurt = recent(game.druidLastHitTime);
    const drawables = [
      ...decor,
      ...game.features.map((f) => ({
        y: featureBase(f).y,
        draw: () => drawFeature(ctx, f, isPrep && hover?.kind === 'feature' && hover.index === f.index),
      })),
      ...game.turrets.map((t) => ({ y: slotBase(t).y, draw: () => drawTurretOfType(ctx, t, isUpgradingSlot(game, t.slotIndex), anim) })),
      { y: druidPos.y + C.DRUID_RADIUS * 0.6, draw: () => drawDruid(ctx, druidPos.x, druidPos.y, hurt, defeatProgress(game), druidPose(game)) },
      ...game.enemies.map((e) => ({
        y: e.y + e.radius * 0.5,
        draw: () => ENEMY_DRAW[e.type](ctx, knockedBack(e, anim), strikeFlash(e, anim) ? 'strike' : recent(e.lastHitTime), recent(e.lastBiteTime)),
      })),
      ...game.vultures.map((v) => ({
        y: v.y + C.VULTURE_RADIUS * 0.4,
        draw: () => drawVulture(ctx, v, anim, recent(v.lastHitTime), recent(v.lastPeckTime)),
      })),
      ...game.squirrels.map((s) => ({
        y: s.y + C.SQUIRREL_RADIUS * 0.4,
        draw: () => drawSquirrel(ctx, s, anim, recent(s.lastHitTime)),
      })),
    ].sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();
    for (const p of game.projectiles) (p.kind === 'pellet' ? drawPellet : drawPebble)(ctx, p);
    for (const s of game.swipes) drawSwipe(ctx, s, s.age / C.DRUID_SWIPE_TIME);
    for (const s of game.sparks) drawSpark(ctx, s, s.age / C.STRIKE_SPARK_TIME);

    // Bars and text on top of everything so they stay readable.
    for (const e of game.enemies) drawEnemyHpBar(ctx, e);
    for (const v of game.vultures) drawVultureStatus(ctx, v);
    for (const s of game.squirrels) drawSquirrelStatus(ctx, s);
    // Nothing can hurt the Druid in Prep, so his world HP bar only appears from Combat on.
    if (!isPrep) drawDruidHpBar(ctx, druidPos.x, druidPos.y, game.druidHp);
    drawActionProgress(ctx, game, druidPos);
    drawFootstepPreview(ctx, game, hover);
    for (const t of game.floatingTexts) {
      drawFloatingText(ctx, t.text, t.x, t.y - (t.age / C.FLOATING_TEXT_TIME) * C.FLOATING_TEXT_RISE, t.age / C.FLOATING_TEXT_TIME, t.small);
    }

    // Summon placement ghost of the chosen summon under the cursor (§15.1, M1d §2.1).
    if (game.action.state === ActionState.SUMMON_PLACEMENT && view.pointer && view.pointer.y >= C.HUD_STRIP_HEIGHT) {
      const drawGhost = game.action.target === 'squirrel' ? drawSquirrelGhost : drawVultureGhost;
      drawGhost(ctx, view.pointer, performance.now() / 1000);
    }

    // Area behind the HTML HUD strip.
    ctx.fillStyle = COLORS.hudBackdrop;
    ctx.fillRect(0, 0, C.STAGE_WIDTH, C.HUD_STRIP_HEIGHT);

    if (view.debug) {
      drawDebugOverlay(ctx, game, scene);
      if (view.clickMarker) drawClickMarker(ctx, view.clickMarker);
    }
  }

  return { render };
}

// Range circles (§9.2, §10.4): an empty slot shows the base range while hovered in Prep
// or while its build menu is open; a turret shows its range while hovered or while its menu is
// open; debug shows all.
function drawRanges(ctx, game, view) {
  const shown = new Set();
  const hover = view.hover;
  if (game.state === GameState.PREP && hover?.kind === 'slot') shown.add(hover.index);
  if (view.menu?.kind === 'build') shown.add(view.menu.index);
  if (game.action.state === ActionState.BUILDING) shown.add(game.action.target);
  // Which turret's range an empty slot previews (M1f §5.2): the one being built, else the build
  // menu card under the pointer, else the Sprinkler.
  const previewType = game.action.state === ActionState.BUILDING ? game.action.turretType : (view.menuHoverType ?? 'sprinkler');
  for (const i of shown) drawRange(ctx, game.slots[i].x, game.slots[i].y, levelRange(previewType, 1));

  for (const t of game.turrets) {
    const hovered = hover?.kind === 'turret' && hover.index === t.slotIndex;
    const menuOpen = view.menu?.kind === 'upgrade' && view.menu.index === t.slotIndex;
    if (hovered || menuOpen || view.debug) {
      drawRange(ctx, t.x, t.y, turretRange(t));
    }
    // M1e §4.3: with its upgrade menu open, the next level's range as a faint dashed circle.
    if (menuOpen && t.level < maxLevel(t.type)) drawNextRange(ctx, t.x, t.y, levelRange(t.type, t.level + 1));
  }
}

// Turret drawing per type (M1f §5): the Sprinkler, or the Toader with its mouth animation.
function drawTurretOfType(ctx, t, upgrading, anim) {
  if (t.type === 'toader') drawToader(ctx, t, upgrading, toaderMouthOpen(t, anim));
  else drawTurret(ctx, t, upgrading);
}

// Progress bar above the object the Druid is working on (§16.3), raised above the
// Druid's head too when he is the taller of the two.
function drawActionProgress(ctx, game, druidPos) {
  if (!isTimedAction(game.action)) return;
  const p = actionTargetPos(game);
  const druidTop = druidPos.y - C.DRUID_RADIUS * 2.55; // top of his HP bar in Combat
  const y = Math.min(p.y - C.LOCATION_RADIUS - PROGRESS_GAP, druidTop - 16);
  drawProgressBar(ctx, p.x, y, game.action.elapsed / game.action.duration);
}

// Faint solid line through every visited marker, starting at home (M1b §5.5).
function drawRouteTrail(ctx, route) {
  if (route.length < 2) return;
  ctx.save();
  ctx.strokeStyle = COLORS.trail;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  route.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

// Footstep route preview (M1g §2): which trail is showing and when it started (real time, so
// it still animates while debug-paused). Moving within the same marker keeps the trail; a new
// marker, or the Druid having moved, starts a new one.
let footsteps = { key: null, start: 0 };

function drawFootstepPreview(ctx, game, hover) {
  const preview = routePreview(game, hover);
  if (!preview) {
    footsteps.key = null;
    return;
  }
  const key = `${hover.kind}:${hover.index}:${preview.from.x},${preview.from.y}`;
  const now = performance.now() / 1000;
  if (key !== footsteps.key) footsteps = { key, start: now };
  const fromMarker = preview.from.x !== C.DRUID_POS.x || preview.from.y !== C.DRUID_POS.y;
  const prints = footprintLayout(preview.from, preview.to, preview.cost, fromMarker);
  drawFootsteps(ctx, prints, now - footsteps.start, preview.cost, preview.affordable);
}

const DEFEAT_FALL_TIME = 0.4; // s for the defeated Druid to tip over (visual only)

// Druid strike pose (M1f §4), visual only. Staff angles in rad around his hand.
const STRIKE_WIND_BACK = 1.0;  // wind-up: staff top pulled back away from the target
const STRIKE_FOLLOW = 1.5;     // swing: carried through past upright toward the target
const STRIKE_FLASH_TIME = 0.1; // s the struck enemy flashes white
const ease = (t) => t * t * (3 - 2 * t);

// Pose from the strike in progress: wind-up → swing + lunge → (impact) → recover.
function druidPose(game) {
  const s = game.druidStrike;
  if (!s) return DRUID_REST_POSE;
  const facing = s.dirX < 0 ? -1 : 1;
  let angle;
  let lunge;
  if (s.impactAt === null && s.elapsed < C.STRIKE_WINDUP_TIME) {
    angle = -STRIKE_WIND_BACK * ease(s.elapsed / C.STRIKE_WINDUP_TIME);
    lunge = 0;
  } else if (s.impactAt === null) {
    const p = Math.min(1, (s.elapsed - C.STRIKE_WINDUP_TIME) / C.STRIKE_SWING_TIME);
    angle = -STRIKE_WIND_BACK + (STRIKE_WIND_BACK + STRIKE_FOLLOW) * ease(p);
    lunge = C.STRIKE_LUNGE_PX * ease(p);
  } else {
    const q = 1 - ease(Math.min(1, (s.elapsed - s.impactAt) / C.STRIKE_RECOVER_TIME));
    angle = STRIKE_FOLLOW * q;
    lunge = C.STRIKE_LUNGE_PX * q;
  }
  return { staffAngle: angle, lungeX: s.dirX * lunge, lungeY: s.dirY * lunge, facing };
}

// Where an enemy is drawn: pushed back a few px just after a Druid strike, settling over
// STRIKE_KNOCKBACK_TIME. Its simulation position is untouched (M1f §4).
function knockedBack(e, anim) {
  const age = anim - e.lastKnockTime;
  if (!e.knockDir || age >= C.STRIKE_KNOCKBACK_TIME) return e;
  const d = C.STRIKE_KNOCKBACK_PX * (1 - age / C.STRIKE_KNOCKBACK_TIME);
  return { ...e, x: e.x + e.knockDir.x * d, y: e.y + e.knockDir.y * d };
}

function strikeFlash(e, anim) {
  return anim - e.lastKnockTime < STRIKE_FLASH_TIME;
}

// M1e §1.2: 0 = standing, 1 = fallen. The Druid falls during a pending Defeat and stays down.
function defeatProgress(game) {
  if (game.state === GameState.DEFEAT) return 1;
  if (game.state === GameState.ENDING && game.pendingResult === GameState.DEFEAT) {
    return Math.min(1, game.endElapsed / DEFEAT_FALL_TIME);
  }
  return 0;
}

// Debug: crosshair where the player last clicked, to check screen → world conversion.
function drawClickMarker(ctx, p) {
  ctx.save();
  ctx.strokeStyle = COLORS.marker;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
  ctx.moveTo(p.x - 18, p.y);
  ctx.lineTo(p.x + 18, p.y);
  ctx.moveTo(p.x, p.y - 18);
  ctx.lineTo(p.x, p.y + 18);
  ctx.stroke();
  ctx.fillStyle = COLORS.marker;
  ctx.font = '16px monospace';
  ctx.fillText(`(${Math.round(p.x)}, ${Math.round(p.y)})`, p.x + 14, p.y - 14);
  ctx.restore();
}
