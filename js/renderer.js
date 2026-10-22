// Canvas drawing. Reads game state, the static scene and view (UI) state; never modifies them.

import * as C from './config.js';
import { GameState, ActionState } from './states.js';
import { drawDebugOverlay } from './debug/debugOverlay.js';
import { drawFloor, drawCorridors, drawDecor } from './render/environment.js';
import {
  drawTurretSlot, drawDruid, drawFeature, drawWolf, drawWolfHpBar, drawDruidHpBar,
  drawTurret, drawRange, drawProgressBar, drawFloatingText, drawPebble,
  drawVulture, drawVultureStatus, drawVultureGhost, featureBase, slotBase,
} from './render/entities.js';
import { turretRange } from './entities/turret.js';
import { druidDisplayPos, actionTargetPos, isTimedAction, isUpgradingSlot } from './systems/actionSystem.js';
import { isStepMode, routePreview } from './systems/stepSystem.js';

const HIT_FLASH_TIME = 0.15; // s of hit flash on the Druid (bite) or a wolf (pebble); visual only
const PROGRESS_GAP = 12;     // px between the top of a location's footprint and its progress bar

const COLORS = {
  hudBackdrop: '#10160e',
  marker: '#ffe066',
  trail: 'rgba(245, 232, 190, 0.32)',   // route so far (M1b §5.5)
  preview: 'rgba(250, 240, 205, 0.95)', // route preview (M1b §5.2.2)
  previewBad: 'rgba(235, 85, 58, 0.95)', // preview when unaffordable (§5.2.4)
  labelBg: 'rgba(16, 22, 14, 0.85)',
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
    drawRanges(ctx, game, view);
    if (isPrep && isStepMode(game)) drawRouteTrail(ctx, game.route);

    // Upright layer, y-sorted so lower objects appear in front (§5.2).
    const druidPos = druidDisplayPos(game);
    const recent = (time) => game.combatTime - time < HIT_FLASH_TIME;
    const hurt = recent(game.druidLastHitTime);
    const drawables = [
      ...decor,
      ...game.features.map((f) => ({
        y: featureBase(f).y,
        draw: () => drawFeature(ctx, f, isPrep && hover?.kind === 'feature' && hover.index === f.index),
      })),
      ...game.turrets.map((t) => ({ y: slotBase(t).y, draw: () => drawTurret(ctx, t, isUpgradingSlot(game, t.slotIndex)) })),
      { y: druidPos.y + C.DRUID_RADIUS * 0.6, draw: () => drawDruid(ctx, druidPos.x, druidPos.y, hurt) },
      ...game.wolves.map((w) => ({
        y: w.y + C.WOLF_RADIUS * 0.5,
        draw: () => drawWolf(ctx, w, recent(w.lastHitTime), recent(w.lastBiteTime)),
      })),
      ...game.vultures.map((v) => ({
        y: v.y + C.VULTURE_RADIUS * 0.4,
        draw: () => drawVulture(ctx, v, game.combatTime, recent(v.lastHitTime), recent(v.lastPeckTime)),
      })),
    ].sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();
    for (const p of game.projectiles) drawPebble(ctx, p);

    // Bars and text on top of everything so they stay readable.
    for (const w of game.wolves) drawWolfHpBar(ctx, w);
    for (const v of game.vultures) drawVultureStatus(ctx, v);
    // Nothing can hurt the Druid in Prep, so his world HP bar only appears from Combat on.
    if (!isPrep) drawDruidHpBar(ctx, druidPos.x, druidPos.y, game.druidHp);
    drawActionProgress(ctx, game, druidPos);
    const preview = routePreview(game, hover);
    if (preview) drawRoutePreview(ctx, preview);
    for (const t of game.floatingTexts) {
      drawFloatingText(ctx, t.text, t.x, t.y - (t.age / C.FLOATING_TEXT_TIME) * C.FLOATING_TEXT_RISE, t.age / C.FLOATING_TEXT_TIME);
    }

    // Summon placement ghost under the cursor (§15.1).
    if (game.action.state === ActionState.SUMMON_PLACEMENT && view.pointer && view.pointer.y >= C.HUD_STRIP_HEIGHT) {
      drawVultureGhost(ctx, view.pointer, performance.now() / 1000);
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
  for (const i of shown) drawRange(ctx, game.slots[i].x, game.slots[i].y, C.TURRET_RANGE);

  for (const t of game.turrets) {
    const hovered = hover?.kind === 'turret' && hover.index === t.slotIndex;
    const menuOpen = view.menu?.kind === 'upgrade' && view.menu.index === t.slotIndex;
    if (hovered || menuOpen || view.debug) {
      drawRange(ctx, t.x, t.y, turretRange(t));
    }
  }
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

// Dashed line from the Druid's position to the hovered marker, with the step cost at its
// midpoint; red when the marker costs more than what's left (M1b §5.2.2, §5.2.4).
function drawRoutePreview(ctx, { from, to, cost, affordable }) {
  const color = affordable ? COLORS.preview : COLORS.previewBad;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const text = `${cost} ${cost === 1 ? 'step' : 'steps'}`;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 16;
  ctx.fillStyle = COLORS.labelBg;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(mx - w / 2, my - 15, w, 30, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, mx, my + 1);
  ctx.restore();
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
