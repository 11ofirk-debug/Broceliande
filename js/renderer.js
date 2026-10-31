// Canvas drawing. Reads game state, the static scene and view (UI) state; never modifies them.

import * as C from './config.js';
import { GameState, ActionState } from './states.js';
import { drawDebugOverlay } from './debug/debugOverlay.js';
import { drawFloor, drawCorridors, drawFlats, drawDecor, drawStream, drawAshFlecks, drawLaneGlow } from './render/environment.js';
import {
  drawTurretSlot, drawDruid, drawFeature, drawEnemyHpBar, enemyBarY, drawArmorSpark, drawHealSparkle, drawCorrodeDrips, drawDruidHpBar, drawDustRing, drawLanePulse,
  drawTurret, drawToader, toaderMouthOpen, drawPellet, drawCloud, drawRange, drawProgressBar, drawFloatingText, drawPebble,
  drawVulture, drawVultureStatus, drawVultureGhost, featureBase, slotBase, drawDrop,
  drawSquirrel, drawSquirrelStatus, drawSquirrelGhost, drawSwipe, drawSpark, drawNextRange, DRUID_REST_POSE,
  drawDoubleWisp, drawDoublePuff, drawChip, drawDoubleFade, drawDoubleTargeting, drawFloater, drawSweepItem,
} from './render/entities.js';
import { turretRange, levelRange, maxLevel } from './entities/turret.js';
import { druidDisplayPos, actionTargetPos, isTimedAction } from './systems/actionSystem.js';
import { isBeingUpgraded, isDoubleTargeting, isDoubleTarget, doubleTargets, doubleStandPos } from './systems/doubleSystem.js';
import { DoubleState } from './entities/boughDouble.js';
import { isStepMode, routePreview } from './systems/stepSystem.js';
import { drawFootsteps, drawTrail } from './render/footsteps.js';
import { animationTime } from './game.js';
import { drawMap } from './render/map.js';
import { drawTraderScene } from './render/trader.js';
import { drawCinderjaw, drawConeBurst, drawBurning, drawEmberJump } from './render/cinderjaw.js';
import { drawSlotFloater } from './render/items.js';
import { drawWisp, drawWispTarget, drawWispGhost, drawWispBurst, drawSlowSpiral } from './render/wisp.js';
import { isSlowed, isCorroded, isBurning } from './systems/statusSystem.js';
import { drawEnemyLook } from './render/enemyLook.js'; // an enemy's look, Grims included (M2l §2.1)
import { drawShowcase } from './debug/showcase.js';

const HIT_FLASH_TIME = 0.15; // s of hit flash on the Druid (bite) or an enemy (pebble); visual only
const PROGRESS_GAP = 12;     // px between the top of a location's footprint and its progress bar

const COLORS = {
  hudBackdrop: '#10160e',
  marker: '#ffe066',
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = C.STAGE_WIDTH;
  canvas.height = C.STAGE_HEIGHT;

  // Static decor of each level's scene, built once per level; everything else is merged in
  // and y-sorted per frame.
  const decorByLevel = new Map();
  const decorOf = (scene) => {
    if (!decorByLevel.has(scene.levelId)) {
      decorByLevel.set(scene.levelId, scene.decor.map((item) => ({ y: item.y, draw: () => drawDecor(ctx, item, scene.level) })));
    }
    return decorByLevel.get(scene.levelId);
  };

  function render(game, view) {
    if (game.state === GameState.MAP) {
      // The level map (M2a §4) instead of an encounter scene.
      drawMap(ctx, game.run, view.mapHover, performance.now() / 1000, view.debug);
      ctx.fillStyle = COLORS.hudBackdrop;
      ctx.fillRect(0, 0, C.STAGE_WIDTH, C.HUD_STRIP_HEIGHT);
      return;
    }
    if (game.state === GameState.TRADER) {
      // M2n §4.2: the trader's scene; its text and controls are HTML (traderScreen.js).
      drawTraderScene(ctx, game.visit, game.visit.time);
      ctx.fillStyle = COLORS.hudBackdrop;
      ctx.fillRect(0, 0, C.STAGE_WIDTH, C.HUD_STRIP_HEIGHT);
      return;
    }
    const scene = game.scene; // the current level's scene (M2a §5)
    const isPrep = game.state === GameState.PREP;
    const hover = view.hover;

    // Screen shake after an Ogre blow (M2c §2.5): the canvas drawing only, not the HUD strip.
    ctx.save();
    const shake = shakeOffset(game);
    if (shake) {
      ctx.fillStyle = COLORS.hudBackdrop;
      ctx.fillRect(0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);
      ctx.translate(shake.x, shake.y);
    }

    // Ground layer.
    drawFloor(ctx, scene);
    drawStream(ctx, scene); // M2f §4.2: under the corridors, which cross it as fords
    drawCorridors(ctx, scene);
    drawFlats(ctx, scene);
    // M2f §4.11: the Heartwood's sickly glow at its lane entrances.
    if (scene.level.laneGlow) for (const lane of game.lanes) drawLaneGlow(ctx, laneEntrance(lane), scene.level.palette.laneGlow, performance.now() / 1000);
    // A mini-boss's lane entrance pulsing red as it arrives (M2c §2.6).
    for (const p of game.lanePulses) drawLanePulse(ctx, laneEntrance(game.lanes.find((l) => l.id === p.laneId)), p.age / C.BOSS_LANE_PULSE_TIME);
    game.slots.forEach((slot, i) => {
      drawTurretSlot(ctx, slot, !isPrep, isPrep && hover?.kind === 'slot' && hover.index === i);
    });
    // Enemy drops lie on the ground: above floor, corridors and pads, below anything upright (M1d §1.3).
    const now = performance.now() / 1000;
    for (const drop of game.drops) drawDrop(ctx, drop, now);
    // Poison clouds lie on the ground too, under anything upright (M1f §6.5).
    // Each is drawn at its own creation stats, so its visible edge is its damage radius (M1h §2.4).
    for (const cloud of game.clouds) drawCloud(ctx, cloud, cloud.spec.radius, cloud.spec.duration);
    // Dust rings where Ogre blows land (M2c §2.5), on the ground.
    for (const d of game.dustRings) drawDustRing(ctx, d, d.age / C.OGRE_DUST_TIME);
    drawRanges(ctx, game, view);
    // Committed route trail (M1h §1): the footprints of every leg so far, under anything upright.
    if (isPrep && isStepMode(game)) drawTrail(ctx, game.trail);

    // Upright layer, y-sorted so lower objects appear in front (§5.2).
    const druidPos = druidDisplayPos(game);
    // Animation clock: keeps running through ENDING so effects finish (M1e §1.2).
    const anim = animationTime(game);
    const recent = (time) => anim - time < HIT_FLASH_TIME;
    const hurt = recent(game.druidLastHitTime);
    // An enemy, with a pale silver-blue tint while slowed (M2k §3.5), a faint yellow-green one while
    // Corroded (M2m §2.5), a teal mix of the two while both.
    const drawEnemy = (e) => {
      const filter = enemyTintFilter(e);
      if (filter) {
        ctx.save();
        ctx.filter = filter;
      }
      drawEnemyLook(ctx, knockedBack(e, anim), strikeFlash(e, anim) ? 'strike' : recent(e.lastHitTime), recent(e.lastBiteTime), anim);
      if (filter) ctx.restore();
    };
    // Slow Wisps' target points while they travel (M2k §3.3): on the ground, under everything upright.
    for (const w of game.wisps) drawWispTarget(ctx, w);
    const drawables = [
      ...decorOf(scene),
      ...game.features.map((f) => ({
        y: featureBase(f).y,
        draw: () => drawFeature(ctx, f, isPrep && hover?.kind === 'feature' && hover.index === f.index),
      })),
      ...game.turrets.map((t) => ({ y: slotBase(t).y, draw: () => drawTurretOfType(ctx, t, isBeingUpgraded(game, t.slotIndex), anim) })),
      ...doubleDrawables(ctx, game, anim),
      { y: druidPos.y + C.DRUID_RADIUS * 0.6, draw: () => drawDruid(ctx, druidPos.x, druidPos.y, hurt, defeatProgress(game), druidPose(game)) },
      ...game.enemies.filter((e) => !e.flying).map((e) => ({ // flyers: drawn after, above them
        y: e.y + e.radius * 0.5,
        draw: () => drawEnemy(e),
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
    // Flyers (M2h §5): above every ground enemy (not y-sorted with them), below projectiles and UI.
    for (const e of game.enemies) {
      if (e.flying) drawEnemy(e);
    }
    drawAshFlecks(ctx, scene, performance.now() / 1000); // M2f §4.7: ambient, over the ground and entities
    // Slow Wisp bursts and Wisps in flight (M2k §3.5): over the field and the flyers.
    for (const b of game.wispBursts) drawWispBurst(ctx, b);
    for (const w of game.wisps) drawWisp(ctx, w);
    for (const p of game.projectiles) (p.kind === 'pellet' ? drawPellet : drawPebble)(ctx, p);
    for (const s of game.swipes) drawSwipe(ctx, s, s.age / C.DRUID_SWIPE_TIME);
    for (const s of game.sparks) drawSpark(ctx, s, s.age / C.STRIKE_SPARK_TIME);
    // Grim trait feedback (M2l §2.2): armor sparks; lifesteal sparkles on the biter, wherever it is now.
    // Cinderjaw breaths and Wildfire embers (M2o §4.2), over the field and the flyers.
    for (const b of game.coneBursts) drawConeBurst(ctx, b);
    for (const j of game.emberJumps) {
      const to = game.enemies.find((e) => e.id === j.toId); // it may have moved (or died: its last spot)
      drawEmberJump(ctx, j, to ? { x: to.x, y: to.y - (C.ENEMY_TYPES[to.type].flyHeight ?? 0) } : j.to);
    }
    // Burning (M2o §4.2): small flames and sparks on the body while it lasts.
    for (const e of game.enemies) {
      if (isBurning(e)) drawBurning(ctx, e.x, e.y - (C.ENEMY_TYPES[e.type].flyHeight ?? 0) - C.ENEMY_TYPES[e.type].hitHeight * 0.3, e.radius, anim, e.id);
    }
    // Corroded (M2m §2.5): drips falling from the body while it lasts.
    for (const e of game.enemies) {
      if (isCorroded(e)) drawCorrodeDrips(ctx, e.x, e.y - (C.ENEMY_TYPES[e.type].flyHeight ?? 0) - C.ENEMY_TYPES[e.type].hitHeight * 0.5, e.radius, anim, e.id);
    }
    for (const s of game.armorSparks) drawArmorSpark(ctx, s, s.age / C.ARMOR_SPARK_TIME);
    for (const s of game.healSparkles) {
      const e = game.enemies.find((x) => x.id === s.enemyId);
      if (e) drawHealSparkle(ctx, e.x, e.y - (C.ENEMY_TYPES[e.type].flyHeight ?? 0) - e.radius * 0.6, s.age / C.HEAL_SPARKLE_TIME);
    }
    for (const c of game.chips) drawChip(ctx, c, c.age);
    // Bough Double wisps in flight from the Druid to their targets (M1i §2.4).
    for (const d of game.doubles) {
      if (d.state !== DoubleState.WISP) continue;
      const home = scene.level.druidPos;
      const from = { x: home.x, y: home.y - C.DRUID_RADIUS * 0.8 };
      const to = doubleStandPos(game, d);
      drawDoubleWisp(ctx, from, { x: to.x, y: to.y - C.DRUID_RADIUS * 0.6 }, Math.min(1, d.wispElapsed / C.DOUBLE_WISP_TIME));
    }
    // Targeting mode: valid targets lit, everything else dimmed, ghost on top (M1i §2.4).
    if (isDoubleTargeting(game)) drawTargeting(ctx, game, view);

    // Bars and text on top of everything so they stay readable.
    for (const e of game.enemies) drawEnemyHpBar(ctx, e);
    // Slowed (M2k §3.5): a small turning spiral above the head, clear of the HP bar.
    // Dogged (M2l §2.2): on a slow-resistant enemy it spins faster and fainter (only partly slowed).
    for (const e of game.enemies) if (isSlowed(e)) drawSlowSpiral(ctx, e.x, enemyBarY(e) - C.SLOW_SPIRAL_SIZE - 6, anim, !!C.ENEMY_TYPES[e.type].slowResist);
    if (view.showcase) drawShowcase(ctx, view.showcase, anim); // debug Shift+C: normal and Grim enemies side by side
    for (const v of game.vultures) drawVultureStatus(ctx, v);
    for (const s of game.squirrels) drawSquirrelStatus(ctx, s);
    // Nothing can hurt the Druid in Prep, so his world HP bar only appears from Combat on.
    if (!isPrep) drawDruidHpBar(ctx, druidPos.x, druidPos.y, game.druidHp, game.stats['druid.maxHp']); // effective max (M2e)
    drawActionProgress(ctx, game, druidPos);
    for (const d of game.doubles) {
      if (d.state !== DoubleState.WORKING) continue;
      const slot = game.slots[d.slotIndex];
      drawProgressBar(ctx, slot.x, slot.y - C.LOCATION_RADIUS - PROGRESS_GAP, d.elapsed / d.duration);
    }
    drawFootstepPreview(ctx, game, hover);
    for (const t of game.floatingTexts) {
      drawFloatingText(ctx, t.text, t.x, t.y - (t.age / C.FLOATING_TEXT_TIME) * C.FLOATING_TEXT_RISE, t.age / C.FLOATING_TEXT_TIME, t.small, t.muted);
    }
    // Resource floaters (M2d §1), above all entities; each waits for its stagger.
    for (const f of game.floaters) {
      if (f.age < f.delay) continue;
      (f.slot ? drawSlotFloater : drawFloater)(ctx, f, (f.age - f.delay) / C.FLOATER_TIME); // M2e §3.2: slot floater
    }

    // Summon placement ghost of the chosen summon under the cursor (§15.1, M1d §2.1). The Bough
    // Double's ghost is drawn with its targeting overlay.
    if (game.action.state === ActionState.SUMMON_PLACEMENT && !isDoubleTargeting(game) && view.pointer && view.pointer.y >= C.HUD_STRIP_HEIGHT) {
      const drawGhost = { squirrel: drawSquirrelGhost, slowWisp: drawWispGhost }[game.action.target] ?? drawVultureGhost;
      drawGhost(ctx, view.pointer, performance.now() / 1000);
    }

    ctx.restore(); // end of the shaken drawing

    // Area behind the HTML HUD strip.
    ctx.fillStyle = COLORS.hudBackdrop;
    ctx.fillRect(0, 0, C.STAGE_WIDTH, C.HUD_STRIP_HEIGHT);
    // Field sweep (M2d §2.2): after the backdrop, so items stay visible as they fly into the strip.
    if (game.sweep) drawSweep(ctx, game, view);

    if (view.debug) {
      drawDebugOverlay(ctx, game, scene, view.revealItem);
      if (view.clickMarker) drawClickMarker(ctx, view.clickMarker);
    }
  }

  return { render };
}

// Field sweep (M2d §2.2): items waiting their turn lie where they were; launched ones fly to
// their HUD counter (positions measured by the UI, view.resourceTargets) along a gentle curve,
// shrinking to SWEEP_END_SCALE; landed ones are gone. Timed by the simulation's endElapsed.
function drawSweep(ctx, game, view) {
  const e = game.endElapsed;
  for (const item of game.sweep.items) {
    if (item.arrived) continue;
    const k = Math.max(0, Math.min(1, (e - item.launchAt) / C.SWEEP_FLIGHT_TIME));
    if (k === 0) {
      drawSweepItem(ctx, item.resource, item.x, item.y, 1);
      continue;
    }
    const to = view.resourceTargets?.[item.resource] ?? { x: C.STAGE_WIDTH / 2, y: C.HUD_STRIP_HEIGHT / 2 };
    // Quadratic curve whose control point lies beside the start, at the height of the middle,
    // so the item first rises then swings across to its counter.
    const ctrl = { x: item.x + (to.x - item.x) * 0.15, y: (item.y + to.y) / 2 };
    const u = ease(k);
    const x = (1 - u) * (1 - u) * item.x + 2 * (1 - u) * u * ctrl.x + u * u * to.x;
    const y = (1 - u) * (1 - u) * item.y + 2 * (1 - u) * u * ctrl.y + u * u * to.y;
    drawSweepItem(ctx, item.resource, x, y, 1 + (C.SWEEP_END_SCALE - 1) * k);
  }
}

// Screen shake offset (M2c §2.5): a quick decaying wobble of up to OGRE_SHAKE_PX, from the
// shake's age (no randomness); null when there is none or SCREEN_SHAKE_ENABLED is false.
function shakeOffset(game) {
  if (!C.SCREEN_SHAKE_ENABLED || !game.shake) return null;
  const k = C.OGRE_SHAKE_PX * (1 - game.shake.age / C.OGRE_SHAKE_TIME);
  return { x: k * Math.sin(game.shake.age * 95), y: k * Math.cos(game.shake.age * 73) };
}

// Where a lane enters the screen: its first centreline point inside the stage (below the HUD).
function laneEntrance(lane) {
  const margin = 20;
  for (let s = 0; s < lane.path.length; s += 5) {
    const p = lane.path.pointAt(s);
    if (p.x >= margin && p.x <= C.STAGE_WIDTH - margin && p.y >= C.HUD_STRIP_HEIGHT + margin && p.y <= C.STAGE_HEIGHT - margin) return p;
  }
  return lane.path.pointAt(0);
}

// Range circles (§9.2, §10.4): an empty slot shows the base range while hovered in Prep
// or while its build menu is open; a turret shows its range while hovered or while its menu is
// open; debug shows all.
function drawRanges(ctx, game, view) {
  const shown = new Set();
  const hover = view.hover;
  if (game.state === GameState.PREP && hover?.kind === 'slot') shown.add(hover.index);
  if (view.menu?.kind === 'build' || view.menu?.kind === 'doubleBuild') shown.add(view.menu.index);
  if (game.action.state === ActionState.BUILDING) shown.add(game.action.target);
  // Which turret's range an empty slot previews (M1f §5.2): the one being built, else the build
  // menu card under the pointer, else the Sprinkler.
  const previewType = game.action.state === ActionState.BUILDING ? game.action.turretType : (view.menuHoverType ?? 'sprinkler');
  for (const i of shown) drawRange(ctx, game.slots[i].x, game.slots[i].y, levelRange(previewType, 1));

  for (const t of game.turrets) {
    const hovered = hover?.kind === 'turret' && hover.index === t.slotIndex;
    const menuOpen = view.menu?.kind === 'turret' && view.menu.index === t.slotIndex;
    if (hovered || menuOpen || view.debug) {
      drawRange(ctx, t.x, t.y, turretRange(t));
    }
    // M1e §4.3, M1i §2.4: the next level's range as a faint dashed circle while an upgrade is on
    // offer, i.e. while hovering the turret as a Bough Double target.
    if (hovered && isDoubleTargeting(game) && isDoubleTarget(game, t.slotIndex)) drawNextRange(ctx, t.x, t.y, levelRange(t.type, t.level + 1));
  }
}

const CRAFT_WIND_BACK = 0.9; // rad, staff pulled back before a crafting swing
const CRAFT_FOLLOW = 1.3;    // rad, staff swung down toward the target

// Crafting loop pose (M1i §2.7), reusing the strike's staff rotation: recover, wind back, swing
// down to the target, hold. Phase 0.75 is the impact, timed to each craft hit (every multiple of
// DOUBLE_CRAFT_SWING_INTERVAL of job time).
function craftPose(d) {
  const I = C.DOUBLE_CRAFT_SWING_INTERVAL;
  const ph = ((d.elapsed + 0.75 * I) % I) / I;
  let angle;
  if (ph < 0.2) angle = CRAFT_FOLLOW * (1 - ease(ph / 0.2));
  else if (ph < 0.55) angle = -CRAFT_WIND_BACK * ease((ph - 0.2) / 0.35);
  else if (ph < 0.75) angle = -CRAFT_WIND_BACK + (CRAFT_WIND_BACK + CRAFT_FOLLOW) * ease((ph - 0.55) / 0.2);
  else angle = CRAFT_FOLLOW;
  return { ...DRUID_REST_POSE, staffAngle: angle };
}

// Bough Doubles as y-sorted drawables (M1i §2.5, §2.7): a faint outline of the turret being built,
// each working Double (fading and scaling in with a puff, then bobbing and swinging), and the
// fading Doubles of finished or cancelled jobs.
function doubleDrawables(ctx, game, anim) {
  const list = [];
  for (const d of game.doubles) {
    const slot = game.slots[d.slotIndex];
    if (d.job === 'build') {
      const ghost = { x: slot.x, y: slot.y, type: d.turretType, level: 1, angle: -Math.PI / 2, lastFireTime: -Infinity };
      list.push({ y: slotBase(slot).y, draw: () => { ctx.save(); ctx.globalAlpha = 0.3; drawTurretOfType(ctx, ghost, false, anim); ctx.restore(); } });
    }
    if (d.state !== DoubleState.WORKING) continue;
    const p = doubleStandPos(game, d);
    const appear = Math.min(1, d.elapsed / C.DOUBLE_APPEAR_TIME);
    const bob = Math.sin(d.elapsed * Math.PI * 2 / (C.DOUBLE_CRAFT_SWING_INTERVAL * 2)) * C.DOUBLE_BOB_PX;
    list.push({
      y: p.y + C.DRUID_RADIUS * 0.6,
      draw: () => {
        if (appear < 1) drawDoublePuff(ctx, p.x, p.y + C.DRUID_RADIUS * 0.6, appear);
        drawDruid(ctx, p.x, p.y + bob, false, 0, craftPose(d), { tint: C.DOUBLE_TINT, alpha: C.DOUBLE_ALPHA * appear, scale: 0.6 + 0.4 * appear });
      },
    });
  }
  for (const f of game.doubleFades) {
    list.push({ y: f.y + C.DRUID_RADIUS * 0.6, draw: () => drawDoubleFade(ctx, f, f.age / C.DOUBLE_FADE_TIME) });
  }
  return list;
}

// Targeting overlay and the Double ghost: beside the hovered valid target, else at the cursor.
function drawTargeting(ctx, game, view) {
  const targets = doubleTargets(game).map((i) => game.slots[i]);
  const h = view.hover;
  const hovered = (h?.kind === 'slot' || h?.kind === 'turret') && isDoubleTarget(game, h.index) ? game.slots[h.index] : null;
  drawDoubleTargeting(ctx, targets, hovered, performance.now() / 1000);
  if (!view.pointer || view.pointer.y < C.HUD_STRIP_HEIGHT) return;
  const at = hovered
    ? { x: hovered.x + C.DRUID_ACTION_OFFSET.x, y: hovered.y + C.DRUID_ACTION_OFFSET.y }
    : { x: view.pointer.x, y: view.pointer.y - C.DRUID_RADIUS * 0.6 };
  drawDruid(ctx, at.x, at.y, false, 0, DRUID_REST_POSE, { tint: C.DOUBLE_TINT, alpha: C.DOUBLE_ALPHA * 0.7 });
}

// Turret drawing per type (M1f §5): the Sprinkler, or the Toader with its mouth animation.
// The canvas filter tinting an enemy by its statuses (M2k §3.5, M2m §2.5), or null. Burning (M2o §4.2)
// is not a filter (too slow with many burning enemies): drawBurning lays a warm glow and flames over it.
function enemyTintFilter(e) {
  const slowed = isSlowed(e);
  const corroded = isCorroded(e);
  if (slowed && corroded) return C.SLOW_CORRODE_TINT_FILTER;
  if (slowed) return C.SLOW_TINT_FILTER;
  return corroded ? C.CORRODE_TINT_FILTER : null;
}

function drawTurretOfType(ctx, t, upgrading, anim) {
  if (t.type === 'toader') drawToader(ctx, t, upgrading, toaderMouthOpen(t, anim), anim);
  else if (t.type === 'cinderjaw') drawCinderjaw(ctx, t, upgrading, anim); // M2o §4.1
  else drawTurret(ctx, t, upgrading, anim);
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
  drawFootsteps(ctx, preview.prints, now - footsteps.start, preview.cost, preview.affordable);
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

// White flash after a Druid strike (M1f §4) or a Squirrel strike (M1h §3.2).
function strikeFlash(e, anim) {
  return anim - Math.max(e.lastKnockTime, e.lastStruckTime) < STRIKE_FLASH_TIME;
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
