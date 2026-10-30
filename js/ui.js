// HTML UI: HUD strip, resource panel, tooltips, contextual menu, Victory/Defeat overlay
// and debug panel. Reads game state; reports clicks through callbacks. Menu and hover
// state live in `view` (UI state, not simulation).

import * as C from './config.js';
import { GameState, ActionState, WaveState } from './states.js';
import { laneStats, expectedResources, candidateProblems } from './scene.js';
import { routeBand, generateLayout } from './layout.js';
import { zoneIds, zoneQuota, zoneCandidates, quotaTotals } from './zones.js';
import { corridorWidth, featureMix, stuckTime, levelWaves, waveTotals, levelTotals } from './levelSettings.js';
import { waveCount, waveEnemiesLeft } from './systems/waveSystem.js';
import { createRng } from './rng.js';
import { RESOURCE_ICON_SVG } from './icons.js';
import { costRowsElement, costRowsKey } from './costRows.js';
import { portraitCanvas } from './render/portraits.js';
import { canAfford, RESOURCE_KEYS, resourceName, formatCost } from './resources.js';
import { canStartBuild, summonAvailability, summonMax, druidDisplayPos, isTravelling, SUMMONS } from './systems/actionSystem.js';
import { isDoubleTargeting, isDoubleTarget, doubleOnSlot, doubleJob } from './systems/doubleSystem.js';
import { DoubleState } from './entities/boughDouble.js';
import { AttackState } from './entities/enemy.js';
import { turretOnSlot } from './systems/buildSystem.js';
import { buildCost, levelStats, levelRange, nextLevelStats, maxLevel, turretType, TURRET_TYPE_KEYS } from './entities/turret.js';
import { isStepMode, stepCost, canVisit, anyVisitable, routePreview, calibrationFigures, affordableTurretTypes } from './systems/stepSystem.js';
import { enemyTotals, waveCounts } from './game.js';
import { isMuted, soundStats, audioStatus } from './audio.js';
import { chosenSpeed } from './gameSpeed.js';
import { isRunComplete, mapNode, nodeRadius } from './run.js';
import { resolveStats, changedStats, statLabel } from './stats.js';
import { drawSlotIcon } from './render/items.js';

const RESOURCE_LABELS = Object.fromEntries(Object.entries(C.RESOURCES).map(([k, r]) => [k, r.name])); // full names (data/resources.csv)
// "Pits 3  Reeds 0  Feathers 2  Boughs 1": every resource, in display order (debug panel).
const resourceLine = (o) => RESOURCE_KEYS.map((k) => `${resourceName(k, 2)} ${o[k] ?? 0}`).join('  ');
const POPUP_GAP = 16; // px between a world object and its tooltip/menu

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

function formatTime(seconds) {
  const s = Math.max(0, seconds);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(Math.floor(s % 60)).padStart(2, '0');
  return `${mm}:${ss}`;
}

// Static layout lines for the debug panel: lane lengths/travel times and expected resources.
function layoutDebugLines(scene) {
  const lines = ['', `Lanes (unopposed, wolf speed; target ×${C.LANE_LENGTH_FACTOR.toFixed(2)}):`];
  for (const lane of scene.lanes) {
    const st = laneStats(scene, lane);
    lines.push(`  ${lane.name.padEnd(12)}${Math.round(st.length)} px  ${st.travelTime.toFixed(1)} s  ×${st.factor.toFixed(2)}`);
  }
  // M1c §2: candidate validation summary (details are in the console and drawn red in the overlay).
  const failing = [...new Set(candidateProblems(scene).map((p) => p.index))];
  lines.push('', `Candidates: ${scene.candidates.length}, ${failing.length ? `failing validation: #${failing.join(' #')}` : 'all valid'}`);
  const res = expectedResources(scene.level);
  lines.push('', 'Search all features (avg):');
  lines.push(`  ${resourceLine(res)}`);
  lines.push(`  Search time ${res.searchTime.toFixed(1)} s`);
  return lines;
}

// Per-type enemy figures (M1e §6): wolves and Bears separately.
function enemyDebugLines(game) {
  return Object.entries(game.enemyCounts).map(([type, c]) => {
    const name = C.ENEMY_TYPES[type].plural;
    return `${`${name}:`.padEnd(14)} spawned ${c.spawned}/${waveCounts(game)[type] ?? 0}  alive ${c.alive}  killed ${c.killed}`;
  });
}

// Grim traits this battle (M2l §4): damage armor blocked, splash damage on summons, HP healed by lifesteal.
function traitDebugLine(game) {
  const s = game.traitStats;
  if (!s) return 'Grim traits: —';
  const n = (v) => (Number.isInteger(v) ? v : v.toFixed(2));
  return `Grim traits: armor blocked ${n(s.armorBlocked)}  splash ${n(s.splashDamage)}  lifesteal healed ${n(s.lifestealHealed)}`;
}

// Waves (M2i §7): the wave and its sub-state, this wave's spawned / alive / left, and the countdown.
function waveDebugLines(game) {
  const w = game.wave;
  if (!w) return [`Wave:     — (${waveCount(game)} waves, from Combat)`];
  const timer = w.state === WaveState.WAVE ? `wave time ${game.waveTime.toFixed(1)} s, last spawn at ${w.lastSpawnAt.toFixed(1)}` : `next in ${w.remaining.toFixed(1)} s`;
  const reason = w.state === WaveState.GAP ? `  gap: ${w.gapReason}` : '';
  return [
    `Wave:     ${w.index + 1} / ${waveCount(game)}  ${w.state}${reason}  ${timer}  (done ${w.cleared})`,
    `          spawned ${w.spawned}  alive ${game.enemies.length}  left ${waveEnemiesLeft(game)}`,
  ];
}

// Mini-bosses (M2c §4): spawned / alive / killed over every boss type, then each living one's
// HP and attack (counting to its next wind-up, or the wind-up timer).
function bossDebugLines(game) {
  const types = Object.keys(C.ENEMY_TYPES).filter((type) => C.ENEMY_TYPES[type].boss);
  const sum = (k) => types.reduce((a, type) => a + game.enemyCounts[type][k], 0);
  const lines = [`Bosses:   spawned ${sum('spawned')}  alive ${sum('alive')}  killed ${sum('killed')}`];
  for (const e of game.enemies.filter((x) => C.ENEMY_TYPES[x.type].boss)) {
    const t = C.ENEMY_TYPES[e.type];
    const attack = e.attack === AttackState.WINDUP
      ? `WIND-UP ${e.windupElapsed.toFixed(2)} / ${t.windupTime} s → ${e.windupTarget.kind === 'druid' ? 'Druid' : `summon #${e.windupTarget.id}`}`
      : `ready to wind up in ${Math.max(0, t.attackInterval - t.windupTime - e.sinceBlow).toFixed(1)} s`;
    lines.push(`  ${t.name} #${e.id}: HP ${Math.ceil(e.hp)} / ${e.maxHp}  ${attack}`);
  }
  return lines;
}

// Druid melee timer (M1e §6): counting / ready (waiting for an attacker) / paused while busy.
function druidMeleeLine(game) {
  const t = `${game.druidMeleeTimer.toFixed(2)} / ${C.DRUID_MELEE_INTERVAL} s`;
  if (game.state !== GameState.COMBAT) return `Druid melee: ${t}  (Combat only)`;
  if (game.action.state !== ActionState.IDLE) return `Druid melee: ${t}  paused — ${game.action.state}`;
  const s = game.druidStrike;
  // M1f §4: the strike in progress (wind-up / swing / recover), else counting or ready.
  const status = s
    ? `striking: ${s.impactAt !== null ? 'recover' : s.elapsed < C.STRIKE_WINDUP_TIME ? 'wind-up' : 'swing'}`
    : game.druidMeleeTimer >= C.DRUID_MELEE_INTERVAL ? 'READY' : 'counting';
  const target = game.druidMeleeTargetId === null ? 'no attacker' : `target #${game.druidMeleeTargetId}`;
  return `Druid melee: ${t}  ${status}, ${target}`;
}

// Turret figures for this encounter (M1f §7): active clouds, and damage dealt by turret type
// and, for each type, by impacts vs clouds. Damage counts only HP actually removed.
function turretDebugLines(game) {
  const s = game.damageStats;
  const lines = [`Clouds active: ${game.clouds.length}   Turrets: ${TURRET_TYPE_KEYS.map((t) => `${turretType(t).name} ${game.turrets.filter((x) => x.type === t).length}`).join(', ')}`];
  // Damage keys carry the level that dealt it, e.g. "toader:cloud:2" (M1h §4).
  const sum = (type, kind, level = null) => Object.entries(s)
    .filter(([k]) => k.startsWith(`${type}:${kind}:`) && (level === null || k.endsWith(`:${level}`)))
    .reduce((a, [, v]) => a + v, 0);
  for (const type of TURRET_TYPE_KEYS) {
    const impact = sum(type, 'impact');
    const cloud = sum(type, 'cloud');
    const split = turretType(type).attack === 'cloud' ? `  (impacts ${impact}, clouds ${cloud})` : '';
    lines.push(`  damage ${turretType(type).name.padEnd(16)} ${impact + cloud}${split}`);
    if (turretType(type).attack === 'cloud') {
      // Toader by level (M1h §4): impact + cloud damage from shots fired at each level.
      const byLevel = Array.from({ length: maxLevel(type) }, (_, i) => i + 1)
        .map((l) => `L${l} ${sum(type, 'impact', l) + sum(type, 'cloud', l)} (${sum(type, 'impact', l)} + ${sum(type, 'cloud', l)})`);
      lines.push(`    by level: ${byLevel.join('  ')}`);
    }
  }
  lines.push(`  damage ${'Squirrels'.padEnd(16)} ${s.squirrel ?? 0}`); // M1h §4: counter-attacks
  return lines;
}

// Enemy drop figures for this encounter (M1d §3).
function dropDebugLines(game) {
  const { dropped, collected } = game.dropStats;
  const sum = (o) => RESOURCE_KEYS.reduce((a, k) => a + o[k], 0);
  const per = resourceLine;
  return [
    `Drops (×${game.dropMult}, X toggles): dropped ${sum(dropped)}  collected ${sum(collected)}  on field ${game.drops.length}`,
    `  dropped:   ${per(dropped)}`,
    `  collected: ${per(collected)}`,
  ];
}

// Bough figures and Double jobs this encounter (M1i §4).
function doubleDebugLines(game) {
  const s = game.doubleStats;
  return [`Boughs: gained ${s.boughsGained}  spent ${s.boughsSpent}   Doubles active ${game.doubles.length}/${game.stats['double.max']}  `
    + `jobs completed ${s.completed}  cancelled ${s.cancelled}`];
}

// Sounds played / skipped by minGap or maxVoices over the last few seconds (M1g §5).
function soundDebugLines() {
  const stats = soundStats();
  const lines = ['', `Sound: ${audioStatus()}  (V mutes)  last ${C.SOUND_STATS_WINDOW} s — played / skipped gap / skipped cap`];
  for (const [name, s] of Object.entries(stats)) {
    lines.push(`  ${name.padEnd(14)} ${String(s.played).padStart(3)} / ${String(s.gap).padStart(3)} / ${String(s.cap).padStart(3)}`);
  }
  if (lines.length === 2) lines.push('  (none)');
  return lines;
}

// This run's layout lines for the debug panel (M1c §6.3, M1b §8). Recomputed each frame;
// the layout only changes on restart.
// Feature-route cost over many seeded layouts (M1j §6), computed once: { median, min, max, n }.
const TYPICAL_ROUTE_SEEDS = 40;
const typicalRoutes = {}; // per level

function typicalRouteCost(scene) {
  if (typicalRoutes[scene.levelId]) return typicalRoutes[scene.levelId];
  const costs = [];
  for (let seed = 1; seed <= TYPICAL_ROUTE_SEEDS; seed++) costs.push(generateLayout(createRng(seed), scene, { quiet: true }).routeCost);
  costs.sort((a, b) => a - b);
  typicalRoutes[scene.levelId] = { median: costs[Math.floor(costs.length / 2)], min: costs[0], max: costs[costs.length - 1], n: costs.length };
  return typicalRoutes[scene.levelId];
}

// Zones (M1j §6): per zone its candidates and quota (turret slots, resource spots, vacant), with
// this run's actual roles in brackets; totals derived from the quotas; typical route cost.
function zoneDebugLines(game, scene) {
  const roles = game.layout.roles;
  const lines = ['', 'Zones   cand  turret  feature  vacant   (this run: T / F / V)'];
  const level = scene.level;
  for (const zone of zoneIds(level)) {
    const q = zoneQuota(level, zone);
    const mine = zoneCandidates(level, zone).map((i) => roles[i].kind);
    const n = (k) => mine.filter((r) => r === k).length;
    lines.push(`  ${zone.padEnd(5)} ${String(mine.length).padStart(4)} ${String(q.turret).padStart(7)} ${String(q.feature).padStart(8)} ${String(q.vacant).padStart(7)}`
      + `   (${n('slot')} / ${n('feature')} / ${n('vacant')})${level.zoneQuotaOverrides[zone] ? '  override' : ''}`);
  }
  const t = quotaTotals(level);
  lines.push(`  total ${String(t.candidates).padStart(4)} ${String(t.turret).padStart(7)} ${String(t.feature).padStart(8)} ${String(t.vacant).padStart(7)}`);
  const r = typicalRouteCost(scene);
  lines.push(`  Feature route over ${r.n} seeds: median ${r.median} steps (${r.min}–${r.max}) vs stepBudget ${level.stepBudget}`);
  return lines;
}

function runDebugLines(game, scene) {
  const L = game.layout;
  const band = routeBand(scene.level);
  const failures = Object.entries(L.failures).map(([k, n]) => `${k.replace('coverage:', 'cover ')} ${n}`).join(' · ') || 'none';
  const lines = ['', `Layout: zone-based, ${L.randomised ? 'randomised' : `FIXED (RANDOMISE_LAYOUT false, seed ${C.FIXED_LAYOUT_SEED})`}  attempts ${L.attempts}/${C.MAX_LAYOUT_ATTEMPTS}  (L = new seed)`];
  lines.push(`  failed constraints over all attempts: ${failures}`);
  lines.push(`  Lane coverage (min ${C.LANE_MIN_TURRET_SLOTS}): ${scene.lanes.map((lane) => `${lane.name} ${L.coverage[lane.id]}`).join(' · ')}`);
  lines.push(`  Feature route ${L.routeCost} steps  (band ${Math.ceil(band.min)}–${Math.floor(band.max)})`);
  if (L.fallback) lines.push(`  ⚠ FALLBACK: best failed attempt used — fails ${L.failed.join(', ')}`);
  lines.push(...zoneDebugLines(game, scene));

  // M1b §8: greedy nearest-neighbour routes from home, for tuning the level's stepBudget.
  const cal = calibrationFigures(game);
  const budget = scene.level.stepBudget;
  const ratio = cal.featuresAndSlots.steps / budget;
  lines.push('', `Step calibration (greedy from home, budget ${budget}):`);
  lines.push(`  ${cal.features.visits} features            ${cal.features.steps} steps`);
  lines.push(`  + ${C.CALIBRATION_SLOT_COUNT} nearest slots (${cal.featuresAndSlots.visits})  ${cal.featuresAndSlots.steps} steps`);
  lines.push(`  = ${ratio.toFixed(2)} × budget (target ≈ ${C.CALIBRATION_TARGET_RATIO}; budget for target ${Math.round(cal.featuresAndSlots.steps / C.CALIBRATION_TARGET_RATIO)})`);
  return lines;
}

// Place a popup beside a world-space anchor: to the right, or to the left if it would
// leave the stage; kept below the HUD strip and above the bottom edge.
function placeBeside(popup, x, y, halfWidth) {
  const w = popup.offsetWidth;
  const h = popup.offsetHeight;
  let left = x + halfWidth + POPUP_GAP;
  if (left + w > C.STAGE_WIDTH - 8) left = x - halfWidth - POPUP_GAP - w;
  const top = Math.max(C.HUD_STRIP_HEIGHT + 8, Math.min(C.STAGE_HEIGHT - h - 8, y - h / 2));
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

// callbacks: { onStartCombat(), onEndButton(), onMenuAction(), onToggleMute(), onCallNextWave() }
export function createUI(callbacks) {
  // Static layout lines of each level's scene, built once per level.
  const layoutLinesByLevel = {};
  const layoutLinesFor = (scene) => (layoutLinesByLevel[scene.levelId] ??= layoutDebugLines(scene));
  const el = {
    hud: document.getElementById('hud'),
    levelName: document.getElementById('level-name'),
    phase: document.getElementById('hud-phase'),
    timer: document.getElementById('hud-timer'),
    steps: document.getElementById('hud-steps'),
    stepsBar: document.getElementById('hud-steps-bar'),
    stepsFill: document.getElementById('hud-steps-fill'),
    stepsPreview: document.getElementById('hud-steps-preview'),
    stepsText: document.getElementById('hud-steps-text'),
    wolves: document.getElementById('hud-wolves'),
    hpFill: document.getElementById('hud-hp-fill'),
    hpText: document.getElementById('hud-hp-text'),
    res: {
      pits: document.getElementById('res-pits'),
      reeds: document.getElementById('res-reeds'),
      feathers: document.getElementById('res-feathers'),
      boughs: document.getElementById('res-boughs'),
      shells: document.getElementById('res-shells'),
    },
    startCombat: document.getElementById('btn-start-combat'),
    mute: document.getElementById('btn-mute'),
    speed: document.getElementById('hud-speed'),
    endOverlay: document.getElementById('end-overlay'),
    endTitle: document.getElementById('end-title'),
    endStats: document.getElementById('end-stats'),
    endCarry: document.getElementById('end-carry'),
    endCarryRows: document.getElementById('end-carry-rows'),
    endGathered: document.getElementById('end-gathered'),
    endGatheredRows: document.getElementById('end-gathered-rows'),
    endMessage: document.getElementById('end-message'),
    restart: document.getElementById('btn-restart'),
    tooltip: document.getElementById('tooltip'),
    menu: document.getElementById('menu'),
    menuHeader: document.getElementById('menu-header'),
    menuOptions: document.getElementById('menu-options'),
    modeBanner: document.getElementById('mode-banner'),
    uiLayer: document.getElementById('ui-layer'),
    bossBar: document.getElementById('boss-bar'),
    bossName: document.getElementById('boss-name'),
    bossFill: document.getElementById('boss-bar-fill'),
    bossHp: document.getElementById('boss-hp'),
    bossBanner: document.getElementById('boss-banner'),
    itemFound: document.getElementById('item-found'),
    itemFoundIcon: document.getElementById('item-found-icon'),
    itemFoundText: document.getElementById('item-found-text'),
    hudItem: document.getElementById('hud-item'),
    hudItemIcon: document.getElementById('hud-item-icon'),
    endFound: document.getElementById('end-found'),
    endFoundLine: document.getElementById('end-found-line'),
    debugPanel: document.getElementById('debug-panel'),
    wavePreview: document.getElementById('wave-preview'),
    wavePreviewTitle: document.getElementById('wave-preview-title'),
    wavePreviewEntries: document.getElementById('wave-preview-entries'),
    nextWave: document.getElementById('btn-next-wave'),
  };

  el.hud.style.height = `${C.HUD_STRIP_HEIGHT}px`;
  // Resource icons from the shared definition (M1d §1.3), also used for drops on the canvas.
  for (const icon of document.querySelectorAll('.res-icon')) {
    icon.innerHTML = RESOURCE_ICON_SVG[icon.dataset.resource];
    icon.style.width = `${C.RESOURCE_ICON_SIZE}px`;
    icon.style.height = `${C.RESOURCE_ICON_SIZE}px`;
  }
  el.stepsBar.style.setProperty('--blink-period', `${1 / C.STEP_BAR_BLINK_HZ}s`);
  el.startCombat.addEventListener('click', () => {
    callbacks.onStartCombat();
    el.startCombat.blur(); // so Space (Call next wave) doesn't press it again
  });
  el.nextWave.addEventListener('click', () => {
    callbacks.onCallNextWave();
    el.nextWave.blur();
  });
  el.restart.addEventListener('click', () => callbacks.onEndButton());
  el.mute.addEventListener('click', () => {
    callbacks.onToggleMute();
    el.mute.blur(); // so Space / Enter later don't toggle it again
  });
  el.speed.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    callbacks.onSetSpeed(Number(button.dataset.speed));
    button.blur();
  });
  // Menu option buttons are created per menu (see updateMenu); clicks report the option index.
  // The whole option card is the click target (M1f §2), button or not.
  el.menu.addEventListener('click', (e) => {
    const card = e.target.closest('.menu-option');
    if (card && !card.classList.contains('disabled')) callbacks.onMenuAction(Number(card.dataset.option));
  });
  // Which option card the pointer is over (build menu range preview, M1f §5.2).
  let menuHoverIndex = null;
  el.menu.addEventListener('mouseover', (e) => {
    const card = e.target.closest('.menu-option');
    menuHoverIndex = card ? Number(card.dataset.option) : null;
  });
  el.menu.addEventListener('mouseleave', () => { menuHoverIndex = null; });

  let lastState = null;
  let tooltipKey = null;
  let menuKey = null;

  function update(game, clock, view) {
    // Phase change closes any open menu (§16.2).
    if (game.state !== lastState) {
      if (lastState !== null) view.menu = null;
      lastState = game.state;
    }
    updateHud(el, game);
    updateSpeedButtons(el, game);
    updateStepBar(el, game, view);
    tooltipKey = updateTooltip(el, game, view, tooltipKey);
    menuKey = updateMenu(el, game, view, menuKey, menuHoverIndex);
    const placing = game.action.state === ActionState.SUMMON_PLACEMENT;
    el.modeBanner.hidden = !placing;
    if (placing) {
      setText(el.modeBanner, isDoubleTargeting(game)
        ? 'Bough Double — click a highlighted slot or turret · Esc / right-click to cancel'
        : `Placing ${SUMMONS[game.action.target].name} — click the battlefield to place · Esc / right-click to cancel`);
    }
    updateEndOverlay(el, game);
    updateLevelName(el, game);
    updateBoss(el, game);
    updateWavePreview(el, game);
    updateFoundItem(el, game);
    updateDebugPanel(el, game, clock, view, layoutLinesFor(game.scene), game.scene);
  }

  // Stage coordinates of each HUD resource icon (M2d §2.2: where swept items fly to).
  function resourceTargets() {
    const stageRect = document.getElementById('stage').getBoundingClientRect();
    const s = stageRect.width / C.STAGE_WIDTH;
    const out = {};
    for (const icon of document.querySelectorAll('#hud-resources .res-icon')) {
      const r = icon.getBoundingClientRect();
      out[icon.dataset.resource] = { x: (r.left + r.width / 2 - stageRect.left) / s, y: (r.top + r.height / 2 - stageRect.top) / s };
    }
    return out;
  }

  return { update, resourceTargets };
}

// The current Wilds' name, bottom-left (M2a §6): during Prep and Combat, and still through
// ENDING and under the Victory / Defeat overlay.
function updateLevelName(el, game) {
  const shown = game.state !== GameState.START && game.state !== GameState.MAP;
  el.levelName.hidden = !shown;
  if (shown) setText(el.levelName, game.scene.level.name);
}

// "a Crown Charm", but "Shoes" (a plural slot label takes no article).
const withArticle = (label) => (label.endsWith('s') ? label : `a ${label}`);

// Draw a slot-type silhouette into a small canvas, only when the slot changes.
function paintSlotIcon(canvas, slot) {
  if (canvas.dataset.slot === slot) return;
  canvas.dataset.slot = slot;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSlotIcon(ctx, slot, canvas.width / 2, canvas.height / 2, canvas.width * 0.92);
}

// Found items (M2e §3.2–3.3): the centred "You found a …!" message fading over its last third,
// the HUD reminder for the rest of the battle, and the Victory overlay line. Only the slot type is
// ever named, never the item.
function updateFoundItem(el, game) {
  const inBattle = [GameState.PREP, GameState.COMBAT, GameState.ENDING].includes(game.state);
  const m = inBattle ? game.itemMessage : null;
  el.itemFound.hidden = !m;
  if (m) {
    paintSlotIcon(el.itemFoundIcon, m.slot);
    setText(el.itemFoundText, `You found ${withArticle(C.SLOT_TYPES[m.slot].label)}!`);
    el.itemFound.style.opacity = String(Math.min(1, (C.ITEM_FOUND_TIME - m.age) / (C.ITEM_FOUND_TIME / 3)));
  }
  const found = game.hiddenItem?.found ? C.ITEMS[game.hiddenItem.itemId].slot : null;
  el.hudItem.hidden = !(inBattle && found);
  if (inBattle && found) paintSlotIcon(el.hudItemIcon, found);
  const shownOnVictory = game.state === GameState.VICTORY && found;
  el.endFound.hidden = !shownOnVictory;
  if (shownOnVictory) setText(el.endFoundLine, `Found: ${C.SLOT_TYPES[found].label}`);
}

// The living mini-boss, if any (M2c §2.7): the first one spawned.
function livingBoss(game) {
  return game.enemies?.find((e) => C.ENEMY_TYPES[e.type].boss) ?? null;
}

// Mini-boss HP bar while one is alive (from its spawn, not its first damage), and the arrival
// banner fading out over its last third (M2c §2.6–2.7).
// Wave preview (M2i §4.2): during the countdown and gaps, the next wave's number, countdown and
// enemies (icons with counts, an Ogre outlined in red), with Call next wave.
// Enemy types in display order: by base type, each followed by its variants (a Grim, M2l §2.1).
const PREVIEW_ORDER = ['wolf', 'stirge', 'bear', 'ogre'];
function enemyDisplayOrder() {
  const rank = (type) => {
    const base = C.ENEMY_TYPES[type].baseType;
    const i = PREVIEW_ORDER.indexOf(base);
    return (i < 0 ? PREVIEW_ORDER.length : i) * 2 + (type === base ? 0 : 1);
  };
  return Object.keys(C.ENEMY_TYPES).sort((a, b) => rank(a) - rank(b));
}

function wavePreviewEntries(wave) {
  const totals = waveTotals(wave);
  const types = enemyDisplayOrder();
  const row = document.createDocumentFragment();
  for (const type of types.filter((t) => totals[t])) {
    const t = C.ENEMY_TYPES[type];
    const entry = document.createElement('span');
    entry.className = t.boss ? 'wave-entry boss' : 'wave-entry';
    entry.append(portraitCanvas(type, C.WAVE_ICON_SIZE), t.boss ? `${t.name} ×${totals[type]}` : `×${totals[type]}`);
    row.append(entry);
  }
  return row;
}

function updateWavePreview(el, game) {
  const w = game.wave;
  const shown = game.state === GameState.COMBAT && w && w.state !== WaveState.WAVE;
  el.wavePreview.hidden = !shown;
  el.phase.hidden = shown; // the preview takes the wave label's and the clock's place in the strip
  if (shown) el.timer.hidden = true;
  if (!shown) return;
  setText(el.wavePreviewTitle, `Wave ${w.index + 1} of ${waveCount(game)} — in ${Math.max(1, Math.ceil(w.remaining))}`);
  const key = `${game.levelId}:${w.index}`;
  if (el.wavePreviewEntries.dataset.key !== key) {
    el.wavePreviewEntries.dataset.key = key;
    el.wavePreviewEntries.replaceChildren(wavePreviewEntries(levelWaves(game.scene.level)[w.index]));
  }
}

// Start-up check (M2i §4.2): the preview must not cover any candidate location, in any level. It is
// measured with the level's largest wave (most icons).
export function checkWavePreview(scenes) {
  const panel = document.getElementById('wave-preview');
  const entries = document.getElementById('wave-preview-entries');
  const wasHidden = panel.hidden;
  panel.hidden = false;
  document.getElementById('wave-preview-title').textContent = 'Wave 3 of 5 — in 6';
  const footprint = C.LOCATION_RADIUS; // visible footprint only, as for the boss bar
  for (const scene of scenes) {
    const waves = levelWaves(scene.level);
    const widest = waves.reduce((a, w) => (Object.keys(waveTotals(w)).length > Object.keys(waveTotals(a)).length ? w : a), waves[0]);
    entries.replaceChildren(wavePreviewEntries(widest));
    // Stage coordinates (the panel sits in the HUD strip, inside the scaled stage).
    const stage = document.getElementById('stage').getBoundingClientRect();
    const s = stage.width / C.STAGE_WIDTH;
    const b = panel.getBoundingClientRect();
    const r = { left: (b.left - stage.left) / s, top: (b.top - stage.top) / s, right: (b.right - stage.left) / s, bottom: (b.bottom - stage.top) / s };
    for (const c of scene.candidates) {
      const nx = Math.max(r.left, Math.min(c.x, r.right));
      const ny = Math.max(r.top, Math.min(c.y, r.bottom));
      if (Math.hypot(c.x - nx, c.y - ny) < footprint) {
        console.warn(`${scene.levelId}: candidate ${c.index} at (${c.x}, ${c.y}) is under the wave preview`);
      }
    }
  }
  entries.replaceChildren();
  delete entries.dataset.key;
  panel.hidden = wasHidden;
}

function updateBoss(el, game) {
  const inBattle = game.state === GameState.COMBAT || game.state === GameState.ENDING;
  const boss = inBattle ? livingBoss(game) : null;
  el.bossBar.hidden = !boss;
  el.bossBar.classList.toggle('grim', !!boss && C.ENEMY_TYPES[boss.type].variant === 'grim'); // darker frame (M2l §2.1)
  el.uiLayer.classList.toggle('boss-active', !!boss);
  if (boss) {
    const max = boss.maxHp; // scaled by the level's enemyHpMult (M2f §3.1)
    const hp = Math.max(0, Math.ceil(boss.hp));
    setText(el.bossName, C.ENEMY_TYPES[boss.type].name.toUpperCase());
    el.bossFill.style.width = `${(100 * hp) / max}%`;
    setText(el.bossHp, `${hp} / ${max}`);
  }
  const a = inBattle ? game.bossAnnouncement : null;
  el.bossBanner.hidden = !a;
  if (a) {
    setText(el.bossBanner, a.text);
    const fade = C.BOSS_BANNER_TIME / 3;
    el.bossBanner.style.opacity = String(Math.min(1, (C.BOSS_BANNER_TIME - a.age) / fade));
  }
}

// Start-up check (M2c §2.7): the boss HP bar must not cover any candidate location, in any level
// (like the level name label), measured with sample content. Agreed relaxation: only each
// candidate's visible footprint (LOCATION_RADIUS) must stay clear, not its jitter allowance, so a
// jittered top location may be partly under the bar while a boss is alive.
export function checkBossBar(scenes) {
  const bar = document.getElementById('boss-bar');
  const wasHidden = bar.hidden;
  bar.hidden = false;
  document.getElementById('boss-name').textContent = 'OGRE';
  document.getElementById('boss-hp').textContent = '450 / 450';
  const r = { left: bar.offsetLeft - bar.offsetWidth / 2, top: bar.offsetTop, right: bar.offsetLeft + bar.offsetWidth / 2, bottom: bar.offsetTop + bar.offsetHeight };
  const footprint = C.LOCATION_RADIUS; // visible footprint only (see above)
  for (const scene of scenes) {
    for (const c of scene.candidates) {
      const nx = Math.max(r.left, Math.min(c.x, r.right));
      const ny = Math.max(r.top, Math.min(c.y, r.bottom));
      if (Math.hypot(c.x - nx, c.y - ny) < footprint) {
        console.warn(`${scene.levelId}: candidate ${c.index} at (${c.x}, ${c.y}) is under the boss HP bar`);
      }
    }
  }
  bar.hidden = wasHidden;
}

// Start-up check (M2a §6): the label must not cover any candidate location, in any level. The
// label is measured with each level's name; a candidate's footprint + jitter must stay clear.
export function checkLevelNameLabel(scenes) {
  const label = document.getElementById('level-name');
  const wasHidden = label.hidden;
  const text = label.textContent;
  label.hidden = false;
  const occupied = C.LOCATION_RADIUS + C.LOCATION_JITTER;
  for (const scene of scenes) {
    label.textContent = scene.level.name;
    // Stage coordinates: the label sits at its CSS offsets inside the unscaled 1920×1080 stage.
    const r = { left: label.offsetLeft, top: label.offsetTop, right: label.offsetLeft + label.offsetWidth, bottom: label.offsetTop + label.offsetHeight };
    for (const c of scene.candidates) {
      const nx = Math.max(r.left, Math.min(c.x, r.right));
      const ny = Math.max(r.top, Math.min(c.y, r.bottom));
      if (Math.hypot(c.x - nx, c.y - ny) < occupied) {
        console.warn(`${scene.levelId}: candidate ${c.index} at (${c.x}, ${c.y}) is under the level name label`);
      }
    }
  }
  label.textContent = text;
  label.hidden = wasHidden;
}

function updateHud(el, game) {
  const isPrep = game.state === GameState.PREP;
  // ENDING (M1e §1) still reads as Combat in the HUD, frozen, until the result overlay appears.
  const isCombat = game.state === GameState.COMBAT || game.state === GameState.ENDING;

  // M2i §4.1: in Combat, the wave (the current one, or the next during the countdown and gaps).
  setText(el.phase, isCombat && game.wave
    ? `WAVE ${Math.min(game.wave.index + 1, waveCount(game))} / ${waveCount(game)}`
    : game.state);
  if (isPrep) {
    // Countdown shows 00:25 at the start and 00:00 only at the moment Combat begins.
    setText(el.timer, formatTime(Math.ceil(game.prepRemaining)));
  } else {
    setText(el.timer, formatTime(game.combatTime));
  }
  // M2i §4.1: every enemy alive (from any wave) plus this wave's still to spawn; between waves only
  // while some are still alive (a gap started by WAVE_GAP_AFTER_LAST_SPAWN).
  const left = game.wave ? waveEnemiesLeft(game) : 0;
  const showLeft = isCombat && game.wave && (game.wave.state === WaveState.WAVE || left > 0);
  setText(el.wolves, showLeft ? `Enemies left: ${left}` : '');
  el.startCombat.hidden = !isPrep;
  const muted = isMuted();
  if (el.mute.classList.contains('muted') !== muted) {
    el.mute.classList.toggle('muted', muted);
    el.mute.title = muted ? 'Sound muted (V to unmute)' : 'Sound on (V to mute)';
  }
  setText(el.startCombat, isStepMode(game) ? 'Start Battle' : 'Start Combat');
  // Nothing left to click: prompt the player to start (M1b §5.6).
  el.startCombat.classList.toggle('pulse', isPrep && isStepMode(game) && !isTravelling(game) && !anyVisitable(game));

  const maxHp = game.stats['druid.maxHp']; // effective (M2e)
  const hpFrac = Math.max(0, game.druidHp) / maxHp;
  const hpWidth = `${hpFrac * 100}%`;
  if (el.hpFill.style.width !== hpWidth) el.hpFill.style.width = hpWidth;
  el.hpFill.dataset.level = hpFrac > 0.5 ? 'high' : hpFrac > 0.25 ? 'mid' : 'low';
  // HP may be fractional (Stirge bites, M2h §2): the text rounds up (79.5 shows 80), the bar is exact.
  setText(el.hpText, `${Math.ceil(game.druidHp)} / ${maxHp}`);

  for (const [k, node] of Object.entries(el.res)) {
    setText(node, String(game.resources[k]));
    // M2d §2.2: a counter pulses briefly when a swept item lands on it.
    const pulsing = game.state === GameState.ENDING && game.endElapsed - (game.hudPulses?.[k] ?? -Infinity) < C.SWEEP_PULSE_TIME;
    node.parentElement.classList.toggle('sweep-pulse', pulsing);
  }
}

// Step bar (M1b §6): remaining fill, the segment the hovered marker would spend, and a red
// blink when it costs more than what's left. Visual state only; reads the shared preview.
function updateStepBar(el, game, view) {
  const shown = game.state === GameState.PREP && isStepMode(game);
  el.steps.hidden = !shown;
  el.timer.hidden = shown || game.state === GameState.MAP; // no clock on the map (M2a §4)
  if (!shown) return;

  const preview = routePreview(game, view.hover);
  const spend = preview?.affordable ? preview.cost : 0;
  const budget = game.stats['steps.budget']; // effective (M2e)
  const pct = (n) => `${(n / budget) * 100}%`;
  const fillWidth = pct(game.stepsRemaining - spend);
  if (el.stepsFill.style.width !== fillWidth) el.stepsFill.style.width = fillWidth;
  el.stepsPreview.hidden = spend === 0;
  el.stepsPreview.style.left = pct(game.stepsRemaining - spend);
  el.stepsPreview.style.width = pct(spend);
  el.stepsBar.classList.toggle('blink', !!preview && !preview.affordable);
  setText(el.stepsText, `${game.stepsRemaining} / ${budget}`);
}

// Tooltip content for the hovered object in Prep, or null (§8.4; step mode M1b §5.2.1).
// { title, lines: [[className, text]], anchor: { x, y, halfWidth } }.
function tooltipContent(game, hover) {
  if (game.state === GameState.COMBAT) return combatTooltip(game, hover);
  if (game.state !== GameState.PREP || !hover) return null;
  const stepMode = isStepMode(game);
  // Travel cost changes as the Druid moves; hidden mid-travel, when it has no origin yet.
  const preview = stepMode ? routePreview(game, hover) : null;
  const travelLine = preview && [preview.affordable ? '' : 'tip-warn', `Travel: ${preview.cost} ${preview.cost === 1 ? 'step' : 'steps'}`];

  if (hover.kind === 'feature') {
    const feature = game.features[hover.index];
    const type = C.FEATURE_TYPES[feature.type];
    const lines = feature.exhausted
      ? [['tip-muted', 'Searched']]
      : RESOURCE_KEYS.filter((k) => type.yields[k]).map((k) => ['', `${RESOURCE_LABELS[k]}: ${type.yields[k][0]}–${type.yields[k][1]}`]);
    if (!feature.exhausted && !stepMode) lines.push(['', `Search: ${type.searchTime.toFixed(1)} sec`]);
    if (travelLine) lines.push(travelLine);
    return { title: type.name, lines, anchor: { x: feature.x, y: feature.y, halfWidth: C.LOCATION_RADIUS } };
  }
  // Empty slots have a tooltip in step mode (M1f §5.2): the travel cost and which turrets can be
  // built there with current resources. The costs themselves are in the build menu.
  if (hover.kind === 'slot' && stepMode) {
    const slot = game.slots[hover.index];
    const lines = [];
    if (travelLine) lines.push(travelLine);
    const buildable = affordableTurretTypes(game);
    if (buildable.length === 0) lines.push(['tip-warn', 'Not enough resources for any turret']);
    else lines.push(['tip-muted', 'Can build:'], ...buildable.map((type) => ['', `· ${turretType(type).name}`]));
    return { title: 'Turret slot', lines, anchor: { x: slot.x, y: slot.y, halfWidth: C.LOCATION_RADIUS } };
  }
  return null;
}

// Combat tooltips for turret slots (M1i §2.4). While targeting a Bough Double: the job on a valid
// target with its full cost rows (resources + Bough; red rows where short), or why a target is
// not valid. Otherwise: the hint on an empty slot, and the job on a slot a Double is building on.
function combatTooltip(game, hover) {
  if (!hover || (hover.kind !== 'slot' && hover.kind !== 'turret')) return null;
  const slot = game.slots[hover.index];
  const anchor = { x: slot.x, y: slot.y, halfWidth: C.LOCATION_RADIUS };
  const d = doubleOnSlot(game, hover.index);
  if (isDoubleTargeting(game)) {
    if (d) return { title: 'Bough Double at work', lines: [['tip-muted', 'One Double per target']], anchor };
    if (!isDoubleTarget(game, hover.index)) return { title: 'Max level', lines: [['tip-muted', 'Nothing to upgrade']], anchor };
    if (hover.kind === 'slot') {
      return { title: 'Build', cost: C.BOUGH_DOUBLE_COST, lines: [['tip-muted', 'Choose turret on click']], anchor };
    }
    const job = doubleJob(game, hover.index);
    const lines = upgradeDetail(job.turretType, job.toLevel).split('\n').map((text) => ['', text]); // gains and time
    if (!canAfford(game.resources, job.cost)) lines.push(['tip-warn', 'Not enough resources']);
    return { title: `Upgrade to Level ${job.toLevel}`, cost: job.cost, lines, anchor };
  }
  if (hover.kind === 'slot' && !d) {
    return { title: 'Turret slot', lines: [['tip-muted', 'Summon a Bough Double from the Druid to build here.']], anchor };
  }
  if (hover.kind === 'slot') {
    return { title: `Bough Double building ${turretType(d.turretType).name}`, lines: [['tip-muted', 'Click for the job · Cancel job refunds it']], anchor };
  }
  return null;
}

// Hover tooltip (Prep; turret slots in Combat). Rebuilt only when its content changes.
// Map node tooltip (M2a §4.3), e.g. "Gallows Copse — A restless swarm." / "Wolves 44 · Bears 3".
// Fell Wilds (M2c §1.3): "Forgotten Barrow — Fell Wilds", the description, the counts without the
// mini-bosses, then "Mini-boss: Ogre". Everything from the level data.
function mapTooltip(nodeId) {
  if (!nodeId) return null;
  const node = mapNode(nodeId);
  const level = C.LEVELS[node.levelId];
  const anchor = { x: node.pos.x, y: node.pos.y, halfWidth: nodeRadius(node) * C.MAP_HOVER_SCALE };
  // M2i §4.3: "3 waves · Wolves 42 · Stirges 4 · Bears 3" (types in display order, from the waves).
  const waves = `${levelWaves(level).length} waves`;
  const counts = (types) => [waves, ...types.map(([type, n]) => `${C.ENEMY_TYPES[type].plural} ${n}`)].join(' · ');
  const totals = levelTotals(level);
  const entries = enemyDisplayOrder().filter((type) => totals[type] > 0).map((type) => [type, totals[type]]);
  if (node.type === 'wilds') return { title: `${node.name} — ${level.description}`, lines: [['', counts(entries)]], anchor };
  // Fell Wilds: "Mini-boss: Ogre"; the Boss node (M2f §2): "Bosses: Ogre ×2" (counted from its level).
  const bosses = entries.filter(([type]) => C.ENEMY_TYPES[type].boss)
    .map(([type, n]) => (n > 1 ? `${C.ENEMY_TYPES[type].name} ×${n}` : C.ENEMY_TYPES[type].name)).join(', ');
  return {
    title: `${node.name} — ${C.NODE_TYPES[node.type].label}`,
    lines: [
      ['', level.description],
      ['', counts(entries.filter(([type]) => !C.ENEMY_TYPES[type].boss))],
      ['tip-boss', `${node.type === 'boss' ? 'Bosses' : 'Mini-boss'}: ${bosses || '—'}`],
    ],
    anchor,
  };
}

function updateTooltip(el, game, view, prevKey) {
  const content = game.state === GameState.MAP ? mapTooltip(view.mapHover) : tooltipContent(game, view.hover);
  const key = content ? JSON.stringify(content) + (content.cost ? costRowsKey(content.cost, game.resources) : '') : null;
  if (key === prevKey) return key;

  el.tooltip.hidden = !content;
  if (!content) return key;

  el.tooltip.replaceChildren();
  const title = document.createElement('div');
  title.className = 'tip-title';
  title.textContent = content.title;
  el.tooltip.append(title);
  if (content.cost) el.tooltip.append(costRowsElement(content.cost, game.resources));
  for (const [cls, text] of content.lines) {
    const line = document.createElement('div');
    line.className = cls;
    line.textContent = text;
    el.tooltip.append(line);
  }
  const { x, y, halfWidth } = content.anchor;
  placeBeside(el.tooltip, x, y, halfWidth);
  return key;
}

// "Damage 3 → 5 · Every 0.75 → 0.6 s · Range 220 → 264": what the upgrade to `level` buys.
// For a cloud turret (M1h §2) also the cloud's radius, duration and tick interval.
function upgradeDetail(type, level) {
  const from = levelStats(type, level - 1);
  const to = levelStats(type, level);
  const cloud = from.cloud && to.cloud
    ? `Cloud ${from.cloud.radius} → ${to.cloud.radius} px, ${from.cloud.duration} → ${to.cloud.duration} s, `
      + `tick every ${from.cloud.tickInterval} → ${to.cloud.tickInterval} s\n`
    : '';
  return `${from.cloud ? 'Impact' : 'Damage'} ${from.damage} → ${to.damage}\n`
    + `Every ${from.fireInterval} → ${to.fireInterval} s\n`
    + `Range ${Math.round(levelRange(type, level - 1))} → ${Math.round(levelRange(type, level))}\n`
    + cloud
    + `Takes ${to.time} s — turret stops firing`;
}

// What a turret type does, for its build card (M1f §5.2).
function turretSummary(type) {
  const t = turretType(type);
  const l1 = t.levels[0];
  if (t.attack === 'cloud') {
    return `Poison cloud: ${l1.damage} on impact, then ${l1.cloud.tickDamage} every ${l1.cloud.tickInterval} s to all inside\n`
      + `Every ${l1.fireInterval} s · range ${Math.round(levelRange(type, 1))}`;
  }
  return `${l1.damage} damage every ${l1.fireInterval} s · range ${Math.round(levelRange(type, 1))}`;
}

// Build menu (§9.2, M1f §5.2): one card per turret type. In step mode it also needs the steps
// to get there; choosing a turret travels there and builds on arrival.
function buildOptions(game, menu) {
  const stepMode = isStepMode(game);
  const steps = stepMode ? stepCost(game, { kind: 'slot', index: menu.index }) : 0;
  return TURRET_TYPE_KEYS.map((type) => {
    const affordable = canAfford(game.resources, buildCost(type));
    const enoughSteps = !stepMode || steps <= game.stepsRemaining;
    const disabled = stepMode
      ? !affordable || !enoughSteps || game.action.state !== ActionState.IDLE
      : !canStartBuild(game, menu.index, type);
    const reason = !affordable ? 'Not enough resources' : !enoughSteps ? 'Not enough steps' : '';
    return {
      title: turretType(type).name, portrait: type, cost: buildCost(type), costText: null,
      detail: turretSummary(type), action: 'Build', disabled, reason, turretType: type,
    };
  });
}

// Header line above a menu's options, or null: the travel cost of a step-mode build (M1f §5.2).
function menuHeader(game, menu) {
  if (menu.kind === 'doubleBuild') return { text: 'Bough Double: choose a turret to build', warn: false }; // M1i §2.4
  if (menu.kind !== 'build' || !isStepMode(game)) return null;
  const steps = stepCost(game, { kind: 'slot', index: menu.index });
  return { text: `Travel: ${steps} ${steps === 1 ? 'step' : 'steps'}`, warn: steps > game.stepsRemaining };
}

// Effective durations from the stats resolver (M2e §4.5: summon changes show in the Druid's menu).
const summonDetail = (game) => ({
  vulture: `Lasts ${game.stats['vulture.duration']} s · flies to the wolf nearest to it`,
  squirrel: `Lasts ${game.stats['squirrel.duration']} s · collects the nearest drop`
    + (C.SQUIRREL_BLOCKS_WOLVES ? ' · blocks wolves while waiting' : ''),
  double: 'Builds or upgrades one turret, then vanishes · plus that job\'s cost',
  slowWisp: `Floats to the point and bursts · slows enemies within ${C.WISP_BURST_RADIUS} px (flyers too) to ×${C.WISP_SLOW_MULT} for ${C.WISP_SLOW_DURATION} s`,
});

// Turret choice for a Bough Double's build job (M1i §2.4 step 3): one card per turret type, its
// cost rows including the Bough.
function doubleBuildOptions(game, menu) {
  return TURRET_TYPE_KEYS.map((type) => {
    const job = doubleJob(game, menu.index, type);
    const affordable = canAfford(game.resources, job.cost);
    return {
      title: turretType(type).name, portrait: type, cost: job.cost, costText: null,
      detail: `${turretSummary(type)}\nBuild time ${job.time} s`, action: 'Build',
      disabled: !affordable, reason: affordable ? '' : 'Not enough resources', turretType: type,
    };
  });
}

// "Damage 3 every 0.75 s · range 220": a built turret's current level (Combat info menu).
function turretStats(turret) {
  const s = levelStats(turret.type, turret.level);
  const range = Math.round(levelRange(turret.type, turret.level));
  if (s.cloud) {
    return `Impact ${s.damage} every ${s.fireInterval} s · range ${range}\n`
      + `Cloud ${s.cloud.radius} px, ${s.cloud.duration} s, ${s.cloud.tickDamage} every ${s.cloud.tickInterval} s`;
  }
  return `Damage ${s.damage} every ${s.fireInterval} s · range ${range}`;
}

// Turret menu in Combat (M1i §2.4, §2.6): type, level and stats, with no build or upgrade button
// (Bough Doubles do that). While a Double works here, its job comes first with "Cancel job",
// which refunds the full cost. `info` cards are shown normally but are not clickable.
function turretMenuOptions(game, menu) {
  const options = [];
  const d = doubleOnSlot(game, menu.index);
  if (d) {
    const what = d.job === 'build' ? `building ${turretType(d.turretType).name}` : `upgrading to level ${d.toLevel}`;
    const left = d.state === DoubleState.WISP ? 'arriving' : `${Math.max(0, d.duration - d.elapsed).toFixed(1)} s left`;
    options.push({
      title: `Bough Double: ${what}`, portrait: 'double', cost: null, costText: `Refund: ${formatCost(d.paid)}`,
      detail: left, action: 'Cancel job', disabled: false, reason: '',
    });
  }
  const turret = turretOnSlot(game, menu.index);
  if (turret) {
    options.push({
      title: `${turretType(turret.type).name} · level ${turret.level}`, portrait: turret.type, cost: null,
      // "No upgrades available" stays for future single-level types (M1h §2.3).
      costText: maxLevel(turret.type) === 1 ? 'No upgrades available'
        : turret.level >= maxLevel(turret.type) ? 'Max level' : `Upgrade with a Bough Double (level ${turret.level + 1})`,
      detail: turretStats(turret), action: null, disabled: true, info: true, reason: '',
    });
  }
  return options;
}

// The options a menu shows, each { title, portrait, cost, costText, detail, action, disabled, reason }.
// portrait: entity image key (portraits.js) or null. cost: shown as cost rows (M1f §3); or
// costText instead (e.g. "Max level"). action: button label, or null for none. Every option
// card is clickable as a whole while not disabled (M1f §2).
function menuOptions(game, menu) {
  if (menu.kind === 'build') return buildOptions(game, menu);
  if (menu.kind === 'summon') {
    // Druid menu (§15.1, M1d §2.1, M1f §2): one card per summon with its image; greyed out with a
    // reason if the Druid is not idle, it is at its own cap, or it is unaffordable.
    return Object.entries(SUMMONS).map(([kind, s]) => {
      const { available, reason } = summonAvailability(game, kind);
      return {
        title: `Summon ${s.name}`, portrait: kind, cost: s.cost, costText: null,
        detail: `Active: ${s.active(game).length} / ${summonMax(game, kind)}\n${summonDetail(game)[kind]}`,
        action: null, disabled: !available, reason,
        keyBadge: C.SUMMON_KEYS[kind].toUpperCase(), // its keyboard shortcut
      };
    });
  }
  if (menu.kind === 'doubleBuild') return doubleBuildOptions(game, menu);
  return turretMenuOptions(game, menu);
}

function createMenuOption(index, option) {
  const card = document.createElement('div');
  card.className = 'menu-option';
  card.dataset.option = String(index);
  if (option.portrait) card.append(portraitCanvas(option.portrait));
  if (option.keyBadge) {
    const badge = document.createElement('span');
    badge.className = 'menu-key';
    badge.textContent = option.keyBadge;
    card.append(badge);
  }
  const body = document.createElement('div');
  body.className = 'menu-body';
  for (const part of ['title', 'cost', 'detail']) {
    const div = document.createElement('div');
    div.className = `menu-${part}`;
    body.append(div);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'menu-action';
  const reason = document.createElement('div');
  reason.className = 'menu-reason';
  body.append(button, reason);
  card.append(body);
  return card;
}

// Contextual menu (§9.2, §11.1, §15.1, §16.2): build menu in Prep; turret and Druid menus in
// Combat. Each option is greyed out with its cost and a reason when it cannot be confirmed.
function updateMenu(el, game, view, prevKey, hoverIndex) {
  const menu = view.menu;
  el.menu.hidden = !menu;
  view.menuHoverType = null;
  if (!menu) return null;

  const options = menuOptions(game, menu);
  if (options.length === 0) { // e.g. a cancelled build job's slot is empty again
    view.menu = null;
    el.menu.hidden = true;
    return null;
  }
  if ((menu.kind === 'build' || menu.kind === 'doubleBuild') && hoverIndex !== null) view.menuHoverType = options[hoverIndex]?.turretType ?? null;
  const header = menuHeader(game, menu);
  el.menuHeader.hidden = !header;
  if (header) {
    setText(el.menuHeader, header.text);
    el.menuHeader.classList.toggle('warn', header.warn);
  }
  const key = `${menu.kind}:${menu.index}:${options.map((o) => o.portrait).join()}`; // cards change when a Double's job ends
  if (key !== prevKey || el.menuOptions.children.length !== options.length) {
    el.menuOptions.replaceChildren(...options.map((o, i) => createMenuOption(i, o)));
  }
  options.forEach((o, i) => {
    const node = el.menuOptions.children[i];
    setText(node.querySelector('.menu-title'), o.title);
    // Cost rows are rebuilt only when what they show changes.
    const costBox = node.querySelector('.menu-cost');
    const costKey = o.cost ? costRowsKey(o.cost, game.resources) : `text:${o.costText}`;
    if (costBox.dataset.key !== costKey) {
      costBox.dataset.key = costKey;
      costBox.replaceChildren(o.cost ? costRowsElement(o.cost, game.resources) : document.createTextNode(o.costText ?? ''));
    }
    setText(node.querySelector('.menu-detail'), o.detail);
    setText(node.querySelector('.menu-reason'), o.reason);
    const button = node.querySelector('.menu-action');
    setText(button, o.action ?? '');
    button.hidden = !o.action;
    button.disabled = o.disabled;
    node.classList.toggle('disabled', o.disabled && !o.info);
    node.classList.toggle('clickable', !o.disabled);
    // A summon shortcut pressed while unavailable flashes its option (real time, UI only).
    const flash = view.flashSummon;
    node.classList.toggle('flash', menu.kind === 'summon' && !!flash && flash.kind === Object.keys(SUMMONS)[i] && performance.now() < flash.until);
  });

  if (key !== prevKey) {
    if (menu.kind === 'summon') {
      const d = druidDisplayPos(game);
      placeBeside(el.menu, d.x, d.y - C.DRUID_RADIUS * 0.6, C.DRUID_RADIUS);
    } else {
      const slot = game.slots[menu.index];
      placeBeside(el.menu, slot.x, slot.y, C.LOCATION_RADIUS);
    }
  }
  return key;
}

// Victory / Defeat (M2a §4.4): Victory with more nodes reachable shows what carries over and
// Continue; Victory that completes the run shows a closing line and Start again; Defeat shows
// Start again.
const RUN_COMPLETE_LINE = 'The wilds are quiet… for now.';

function updateEndOverlay(el, game) {
  const ended = game.state === GameState.VICTORY || game.state === GameState.DEFEAT;
  el.endOverlay.hidden = !ended;
  if (!ended) return;
  setText(el.endTitle, game.state);
  el.endOverlay.dataset.result = game.state;
  const totals = enemyTotals(game);
  const won = game.state === GameState.VICTORY;
  // M2i §4.3: the waves cleared (Victory) or the wave the Druid fell in (Defeat).
  const waves = won ? `Waves cleared: ${game.wave?.cleared ?? 0} / ${waveCount(game)}` : `Fell during wave ${(game.wave?.index ?? 0) + 1} of ${waveCount(game)}`;
  setText(el.endStats, `${waves}  ·  Combat time ${formatTime(game.combatTime)}  ·  Enemies killed ${totals.killed} / ${totals.total}`);
  const goesOn = won && !isRunComplete(game.run);
  // M2d §2.3: what the field sweep gathered, on Victory only and only if anything.
  const gathered = won ? game.sweep?.gathered : null;
  el.endGathered.hidden = !gathered || !Object.values(gathered).some((n) => n > 0);
  if (!el.endGathered.hidden) {
    const key = JSON.stringify(gathered);
    if (el.endGatheredRows.dataset.key !== key) {
      el.endGatheredRows.dataset.key = key;
      el.endGatheredRows.replaceChildren(costRowsElement(gathered, gathered));
    }
  }
  el.endCarry.hidden = !goesOn;
  el.endMessage.hidden = !(won && !goesOn);
  // M2f §2: winning the Boss node closes the run with its own line.
  if (!el.endMessage.hidden) setText(el.endMessage, C.NODE_TYPES[mapNode(game.run.currentNodeId)?.type]?.finalLine ?? RUN_COMPLETE_LINE);
  if (goesOn) {
    const inv = game.run.inventory;
    const key = JSON.stringify(inv);
    if (el.endCarryRows.dataset.key !== key) {
      el.endCarryRows.dataset.key = key;
      const any = Object.values(inv).some((n) => n > 0);
      el.endCarryRows.replaceChildren(any ? costRowsElement(inv, inv) : document.createTextNode('nothing'));
    }
  }
  setText(el.restart, goesOn ? 'Continue' : 'Start again');
}

// Equipment (M2e §6): owned and equipped items, and every stat the resolver has changed
// (base → effective). In battle, the battle's fixed stats; on the map, what the next battle
// would get (for the last level shown).
function equipmentLines(game) {
  const r = game.run;
  const stats = game.state === GameState.MAP ? resolveStats(r.equipped, game.scene.level) : game.stats;
  const equipped = Object.entries(r.equipped).filter(([, id]) => id).map(([slot, id]) => `${slot} ${id}`);
  const changed = changedStats(stats, game.scene.level).map((c) => `${statLabel(c.stat)} ${fmt(c.base)} → ${fmt(c.value)}`);
  return [
    `Items:  ${r.items.join(', ') || '—'}   (I on the map adds one)`,
    `Equipped: ${equipped.join(', ') || '—'}`,
    `Changed stats: ${changed.join(' · ') || 'none'}`,
  ];
}
const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

// Run figures (M2a §8): run seed, current and completed nodes, carried inventory, level.
function runLines(game) {
  const r = game.run;
  return [
    `Run seed: ${r.seed}  (reload for a new run)`,
    `Node:   ${r.currentNodeId ?? '—'}   completed: ${r.completedNodeIds.join(', ') || '—'}${isRunComplete(r) ? '   RUN COMPLETE' : ''}`,
    `Carried: ${resourceLine(r.inventory)}   Druid HP ${r.druidHp.toFixed(1)}${C.CARRY_DRUID_HP ? ' (carried)' : ' (not carried)'}`,
    ...equipmentLines(game),
    // M2d §4: items the field sweep gathered on the last Victory.
    `Last sweep: ${game.lastSweep ? `${game.lastSweep.items} items  ${resourceLine(game.lastSweep.gathered)}` : 'none yet'}`,
  ];
}

// M2k §1.1: ×1 / ×2 / ×4 in Combat (countdown, waves and gaps), the chosen one highlighted.
function updateSpeedButtons(el, game) {
  el.speed.hidden = game.state !== GameState.COMBAT;
  if (el.speed.hidden) return;
  const speed = chosenSpeed();
  for (const button of el.speed.children) {
    const active = Number(button.dataset.speed) === speed;
    if (button.classList.contains('active') !== active) button.classList.toggle('active', active);
  }
}

function updateDebugPanel(el, game, clock, view, layoutLines, scene) {
  el.debugPanel.hidden = !view.debug;
  if (!view.debug) return;
  if (game.state === GameState.MAP) {
    setText(el.debugPanel, [`State:  ${game.state}`, ...runLines(game), `Level:  ${game.levelId} (last scene)`].join('\n'));
    return;
  }
  const speed = clock.paused ? `PAUSED (×${clock.speed})` : `×${clock.speed}`;
  const a = game.action;
  const target = a.state === ActionState.TRAVELLING ? `→ ${a.target.kind} #${a.target.index}`
    : a.state === ActionState.SUMMON_PLACEMENT ? a.target : `#${a.target}`;
  const action = a.target === null ? a.state : `${a.state} ${target} ${a.elapsed.toFixed(1)}/${a.duration.toFixed(1)} s`;
  const stepLines = [];
  if (isStepMode(game)) {
    const d = game.druidPos;
    stepLines.push(`Steps:  ${game.stepsRemaining} / ${game.stats['steps.budget']}  (${game.stats['steps.length'].toFixed(2)} px/step)`);
    stepLines.push(`Druid at: (${Math.round(d.x)}, ${Math.round(d.y)})  moves ${game.moveHistory.length} (U undoes)`);
    const h = view.hover;
    if (game.state === GameState.PREP && (h?.kind === 'feature' || h?.kind === 'slot')) {
      stepLines.push(`Hover:  ${h.kind} #${h.index}  cost ${stepCost(game, h)}  ${canVisit(game, h) ? 'clickable' : 'not clickable'}`);
    }
  }
  setText(el.debugPanel, [
    ...runLines(game),
    `Level:  ${game.levelId} (${game.scene.level.name})  ([ / ] previous / next level)`,
    `  corridor ${corridorWidth(game.scene.level)} px · feature mix ${Object.entries(featureMix(game.scene.level)).map(([t, n]) => `${n} ${C.FEATURE_TYPES[t].name}`).join(', ')}`,
    `  enemy HP ×${game.stats['enemy.hpMult']} · stuck time ${stuckTime(game.scene.level)} s`, // M2f §3.1, §4
    `Seed:   ${game.seed}`,
    `Mode:   ${game.prepMode}  (M to toggle + restart)`,
    `State:  ${game.state}`,
    `Action: ${action}`,
    ...stepLines,
    `Speed:  ${speed}`,
    `FPS:    ${Math.round(view.fps)}`,
    '',
    `Druid HP: ${game.druidHp.toFixed(1)} / ${game.stats['druid.maxHp']}`,
    druidMeleeLine(game),
    ...enemyDebugLines(game),
    traitDebugLine(game),
    ...bossDebugLines(game),
    ...waveDebugLines(game),
    `Resources: ${resourceLine(game.resources)}`,
    `Turrets: ${game.turrets.length}  Pebbles in flight: ${game.projectiles.length}  Vultures: ${game.vultures.length}/${C.MAX_VULTURES}  Squirrels: ${game.squirrels.length}/${C.MAX_SQUIRRELS}${C.SQUIRREL_BLOCKS_WOLVES ? ' (block wolves)' : ''}`,
    ...dropDebugLines(game),
    ...doubleDebugLines(game),
    ...turretDebugLines(game),
    ...soundDebugLines(),
    ...layoutLines,
    ...runDebugLines(game, scene),
  ].join('\n'));
}
