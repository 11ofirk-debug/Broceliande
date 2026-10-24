// HTML UI: HUD strip, resource panel, tooltips, contextual menu, Victory/Defeat overlay
// and debug panel. Reads game state; reports clicks through callbacks. Menu and hover
// state live in `view` (UI state, not simulation).

import * as C from './config.js';
import { GameState, ActionState } from './states.js';
import { laneStats, expectedResources, candidateProblems } from './scene.js';
import { routeBand } from './layout.js';
import { RESOURCE_ICON_SVG } from './icons.js';
import { costRowsElement, costRowsKey } from './costRows.js';
import { portraitCanvas } from './render/portraits.js';
import { canAfford } from './resources.js';
import { canStartBuild, upgradeAvailability, summonAvailability, druidDisplayPos, isTravelling, SUMMONS } from './systems/actionSystem.js';
import { turretOnSlot } from './systems/buildSystem.js';
import { buildCost, levelStats, levelRange, nextLevelStats, maxLevel, turretType, TURRET_TYPE_KEYS } from './entities/turret.js';
import { isStepMode, stepCost, canVisit, anyVisitable, routePreview, calibrationFigures, affordableTurretTypes } from './systems/stepSystem.js';
import { enemyTotals, WAVE_COUNTS } from './game.js';
import { isMuted, soundStats, audioStatus } from './audio.js';

const RESOURCE_LABELS = { pits: 'Peach Pits', reeds: 'Reeds', feathers: 'Feathers' };
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
    const st = laneStats(lane);
    lines.push(`  ${lane.name.padEnd(12)}${Math.round(st.length)} px  ${st.travelTime.toFixed(1)} s  ×${st.factor.toFixed(2)}`);
  }
  // M1c §2: candidate validation summary (details are in the console and drawn red in the overlay).
  const failing = [...new Set(candidateProblems(scene).map((p) => p.index))];
  lines.push('', `Candidates: ${scene.candidates.length}, ${failing.length ? `failing validation: #${failing.join(' #')}` : 'all valid'}`);
  const res = expectedResources();
  lines.push('', 'Search all features (avg):');
  lines.push(`  Pits ${res.pits}  Reeds ${res.reeds}  Feathers ${res.feathers}`);
  lines.push(`  Search time ${res.searchTime.toFixed(1)} s`);
  return lines;
}

// Per-type enemy figures (M1e §6): wolves and Bears separately.
function enemyDebugLines(game) {
  return Object.entries(game.enemyCounts).map(([type, c]) => {
    const name = C.ENEMY_TYPES[type].plural;
    return `${`${name}:`.padEnd(9)} spawned ${c.spawned}/${WAVE_COUNTS[type]}  alive ${c.alive}  killed ${c.killed}`;
  });
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
  for (const type of TURRET_TYPE_KEYS) {
    const impact = s[`${type}:impact`] ?? 0;
    const cloud = s[`${type}:cloud`] ?? 0;
    const split = turretType(type).attack === 'cloud' ? `  (impacts ${impact}, clouds ${cloud})` : '';
    lines.push(`  damage ${turretType(type).name.padEnd(16)} ${impact + cloud}${split}`);
  }
  return lines;
}

// Enemy drop figures for this encounter (M1d §3).
function dropDebugLines(game) {
  const { dropped, collected } = game.dropStats;
  const sum = (o) => o.pits + o.reeds + o.feathers;
  const per = (o) => `Pits ${o.pits}  Reeds ${o.reeds}  Feathers ${o.feathers}`;
  return [
    `Drops (×${game.dropMult}, X toggles): dropped ${sum(dropped)}  collected ${sum(collected)}  on field ${game.drops.length}`,
    `  dropped:   ${per(dropped)}`,
    `  collected: ${per(collected)}`,
  ];
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
function runDebugLines(game, scene) {
  const L = game.layout;
  const band = routeBand();
  const failures = Object.entries(L.failures).map(([k, n]) => `${k.replace('coverage:', 'cover ')} ${n}`).join(' · ') || 'none';
  const lines = ['', `Layout: ${L.randomised ? 'randomised' : 'FIXED (RANDOMISE_LAYOUT false)'}  attempts ${L.attempts}/${C.MAX_LAYOUT_ATTEMPTS}  (L = new seed)`];
  if (L.randomised) lines.push(`  failed constraints over all attempts: ${failures}`);
  lines.push(`  Lane coverage (min ${C.LANE_MIN_TURRET_SLOTS}): ${scene.lanes.map((lane) => `${lane.name} ${L.coverage[lane.id]}`).join(' · ')}`);
  lines.push(`  Feature route ${L.routeCost} steps  (band ${Math.ceil(band.min)}–${Math.floor(band.max)})`);
  if (L.fallback) lines.push(`  ⚠ FALLBACK: best failed attempt used — fails ${L.failed.join(', ')}`);

  // M1b §8: greedy nearest-neighbour routes from home, for tuning STEP_BUDGET.
  const cal = calibrationFigures(game);
  const ratio = cal.featuresAndSlots.steps / C.STEP_BUDGET;
  lines.push('', `Step calibration (greedy from home, budget ${C.STEP_BUDGET}):`);
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

// callbacks: { onStartCombat(), onRestart(), onMenuAction() }
export function createUI(scene, callbacks) {
  const layoutLines = layoutDebugLines(scene);
  const el = {
    hud: document.getElementById('hud'),
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
    },
    startCombat: document.getElementById('btn-start-combat'),
    mute: document.getElementById('btn-mute'),
    endOverlay: document.getElementById('end-overlay'),
    endTitle: document.getElementById('end-title'),
    endStats: document.getElementById('end-stats'),
    restart: document.getElementById('btn-restart'),
    tooltip: document.getElementById('tooltip'),
    menu: document.getElementById('menu'),
    menuHeader: document.getElementById('menu-header'),
    menuOptions: document.getElementById('menu-options'),
    modeBanner: document.getElementById('mode-banner'),
    debugPanel: document.getElementById('debug-panel'),
  };

  el.hud.style.height = `${C.HUD_STRIP_HEIGHT}px`;
  // Resource icons from the shared definition (M1d §1.3), also used for drops on the canvas.
  for (const icon of document.querySelectorAll('.res-icon')) {
    icon.innerHTML = RESOURCE_ICON_SVG[icon.dataset.resource];
    icon.style.width = `${C.RESOURCE_ICON_SIZE}px`;
    icon.style.height = `${C.RESOURCE_ICON_SIZE}px`;
  }
  el.stepsBar.style.setProperty('--blink-period', `${1 / C.STEP_BAR_BLINK_HZ}s`);
  el.startCombat.addEventListener('click', () => callbacks.onStartCombat());
  el.restart.addEventListener('click', () => callbacks.onRestart());
  el.mute.addEventListener('click', () => {
    callbacks.onToggleMute();
    el.mute.blur(); // so Space / Enter later don't toggle it again
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
    updateStepBar(el, game, view);
    tooltipKey = updateTooltip(el, game, view, tooltipKey);
    menuKey = updateMenu(el, game, view, menuKey, menuHoverIndex);
    const placing = game.action.state === ActionState.SUMMON_PLACEMENT;
    el.modeBanner.hidden = !placing;
    if (placing) setText(el.modeBanner, `Placing ${SUMMONS[game.action.target].name} — click the battlefield to place · Esc / right-click to cancel`);
    updateEndOverlay(el, game);
    updateDebugPanel(el, game, clock, view, layoutLines, scene);
  }

  return { update };
}

function updateHud(el, game) {
  const isPrep = game.state === GameState.PREP;
  // ENDING (M1e §1) still reads as Combat in the HUD, frozen, until the result overlay appears.
  const isCombat = game.state === GameState.COMBAT || game.state === GameState.ENDING;

  setText(el.phase, game.state === GameState.ENDING ? GameState.COMBAT : game.state);
  if (isPrep) {
    // Countdown shows 00:25 at the start and 00:00 only at the moment Combat begins.
    setText(el.timer, formatTime(Math.ceil(game.prepRemaining)));
  } else {
    setText(el.timer, formatTime(game.combatTime));
  }
  // M1e §3.6: all enemy types combined.
  const totals = enemyTotals(game);
  setText(el.wolves, isCombat ? `Enemies: ${totals.remaining} / ${totals.total}` : '');
  el.startCombat.hidden = !isPrep;
  const muted = isMuted();
  if (el.mute.classList.contains('muted') !== muted) {
    el.mute.classList.toggle('muted', muted);
    el.mute.title = muted ? 'Sound muted (V to unmute)' : 'Sound on (V to mute)';
  }
  setText(el.startCombat, isStepMode(game) ? 'Start Battle' : 'Start Combat');
  // Nothing left to click: prompt the player to start (M1b §5.6).
  el.startCombat.classList.toggle('pulse', isPrep && isStepMode(game) && !isTravelling(game) && !anyVisitable(game));

  const hpFrac = Math.max(0, game.druidHp) / C.DRUID_HP;
  const hpWidth = `${hpFrac * 100}%`;
  if (el.hpFill.style.width !== hpWidth) el.hpFill.style.width = hpWidth;
  el.hpFill.dataset.level = hpFrac > 0.5 ? 'high' : hpFrac > 0.25 ? 'mid' : 'low';
  setText(el.hpText, `${game.druidHp} / ${C.DRUID_HP}`);

  for (const [k, node] of Object.entries(el.res)) setText(node, String(game.resources[k]));
}

// Step bar (M1b §6): remaining fill, the segment the hovered marker would spend, and a red
// blink when it costs more than what's left. Visual state only; reads the shared preview.
function updateStepBar(el, game, view) {
  const shown = game.state === GameState.PREP && isStepMode(game);
  el.steps.hidden = !shown;
  el.timer.hidden = shown;
  if (!shown) return;

  const preview = routePreview(game, view.hover);
  const spend = preview?.affordable ? preview.cost : 0;
  const pct = (n) => `${(n / C.STEP_BUDGET) * 100}%`;
  const fillWidth = pct(game.stepsRemaining - spend);
  if (el.stepsFill.style.width !== fillWidth) el.stepsFill.style.width = fillWidth;
  el.stepsPreview.hidden = spend === 0;
  el.stepsPreview.style.left = pct(game.stepsRemaining - spend);
  el.stepsPreview.style.width = pct(spend);
  el.stepsBar.classList.toggle('blink', !!preview && !preview.affordable);
  setText(el.stepsText, `${game.stepsRemaining} / ${C.STEP_BUDGET}`);
}

// Tooltip content for the hovered object in Prep, or null (§8.4; step mode M1b §5.2.1).
// { title, lines: [[className, text]], anchor: { x, y, halfWidth } }.
function tooltipContent(game, hover) {
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
      : Object.entries(type.yields).map(([res, [min, max]]) => ['', `${RESOURCE_LABELS[res]}: ${min}–${max}`]);
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

// Hover tooltip, PREP only. Rebuilt only when its content changes.
function updateTooltip(el, game, view, prevKey) {
  const content = tooltipContent(game, view.hover);
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
function upgradeDetail(type, level) {
  const from = levelStats(type, level - 1);
  const to = levelStats(type, level);
  return `Damage ${from.damage} → ${to.damage}\n`
    + `Every ${from.fireInterval} → ${to.fireInterval} s\n`
    + `Range ${Math.round(levelRange(type, level - 1))} → ${Math.round(levelRange(type, level))}\n`
    + `Takes ${to.time} s — turret stops firing`;
}

// What a turret type does, for its build card (M1f §5.2).
function turretSummary(type) {
  const t = turretType(type);
  const l1 = t.levels[0];
  if (t.attack === 'cloud') {
    return `Poison cloud: ${l1.damage} on impact, then ${t.cloud.tickDamage} every ${t.cloud.tickInterval} s to all inside\n`
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
  if (menu.kind !== 'build' || !isStepMode(game)) return null;
  const steps = stepCost(game, { kind: 'slot', index: menu.index });
  return { text: `Travel: ${steps} ${steps === 1 ? 'step' : 'steps'}`, warn: steps > game.stepsRemaining };
}

const SUMMON_DETAIL = {
  vulture: `Lasts ${C.VULTURE_DURATION} s · flies to the wolf nearest to it`,
  squirrel: `Lasts ${C.SQUIRREL_DURATION} s · collects the nearest drop`
    + (C.SQUIRREL_BLOCKS_WOLVES ? ' · blocks wolves while waiting' : ''),
};

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
        detail: `Active: ${s.active(game).length} / ${s.max}\n${SUMMON_DETAIL[kind]}`,
        action: null, disabled: !available, reason,
      };
    });
  }
  // Turret menu (§11.1, M1e §4.3, M1f §5.1): the next level's cost and gains; at the top level
  // "Max level", or "No upgrades available" for a type with only one level; no option either way.
  const turret = turretOnSlot(game, menu.index);
  if (!turret) return [];
  const name = turretType(turret.type).name;
  const next = nextLevelStats(turret);
  if (!next) {
    const costText = maxLevel(turret.type) === 1 ? 'No upgrades available' : 'Max level';
    return [{ title: `${name} · level ${turret.level}`, portrait: null, cost: null, costText, detail: '', action: null, disabled: true, reason: '' }];
  }
  const { available, reason } = upgradeAvailability(game, menu.index);
  return [{
    title: `${name}: upgrade to level ${turret.level + 1}`, portrait: null, cost: next.cost, costText: null,
    detail: upgradeDetail(turret.type, turret.level + 1), action: 'Upgrade', disabled: !available, reason,
  }];
}

function createMenuOption(index, option) {
  const card = document.createElement('div');
  card.className = 'menu-option';
  card.dataset.option = String(index);
  if (option.portrait) card.append(portraitCanvas(option.portrait));
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
  if (menu.kind === 'build' && hoverIndex !== null) view.menuHoverType = options[hoverIndex]?.turretType ?? null;
  const header = menuHeader(game, menu);
  el.menuHeader.hidden = !header;
  if (header) {
    setText(el.menuHeader, header.text);
    el.menuHeader.classList.toggle('warn', header.warn);
  }
  const key = `${menu.kind}:${menu.index}`;
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
    node.classList.toggle('disabled', o.disabled);
    node.classList.toggle('clickable', !o.disabled);
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

function updateEndOverlay(el, game) {
  const ended = game.state === GameState.VICTORY || game.state === GameState.DEFEAT;
  el.endOverlay.hidden = !ended;
  if (!ended) return;
  setText(el.endTitle, game.state);
  el.endOverlay.dataset.result = game.state;
  const totals = enemyTotals(game);
  setText(el.endStats, `Combat time ${formatTime(game.combatTime)}  ·  Enemies killed ${totals.killed} / ${totals.total}`);
}

function updateDebugPanel(el, game, clock, view, layoutLines, scene) {
  el.debugPanel.hidden = !view.debug;
  if (!view.debug) return;
  const speed = clock.paused ? `PAUSED (×${clock.speed})` : `×${clock.speed}`;
  const a = game.action;
  const target = a.state === ActionState.TRAVELLING ? `→ ${a.target.kind} #${a.target.index}`
    : a.state === ActionState.SUMMON_PLACEMENT ? a.target : `#${a.target}`;
  const action = a.target === null ? a.state : `${a.state} ${target} ${a.elapsed.toFixed(1)}/${a.duration.toFixed(1)} s`;
  const stepLines = [];
  if (isStepMode(game)) {
    const d = game.druidPos;
    stepLines.push(`Steps:  ${game.stepsRemaining} / ${C.STEP_BUDGET}  (${C.STEP_PX} px/step)`);
    stepLines.push(`Druid at: (${Math.round(d.x)}, ${Math.round(d.y)})  moves ${game.moveHistory.length} (U undoes)`);
    const h = view.hover;
    if (game.state === GameState.PREP && (h?.kind === 'feature' || h?.kind === 'slot')) {
      stepLines.push(`Hover:  ${h.kind} #${h.index}  cost ${stepCost(game, h)}  ${canVisit(game, h) ? 'clickable' : 'not clickable'}`);
    }
  }
  setText(el.debugPanel, [
    `Seed:   ${game.seed}`,
    `Mode:   ${game.prepMode}  (M to toggle + restart)`,
    `State:  ${game.state}`,
    `Action: ${action}`,
    ...stepLines,
    `Speed:  ${speed}`,
    `FPS:    ${Math.round(view.fps)}`,
    '',
    `Druid HP: ${game.druidHp} / ${C.DRUID_HP}`,
    druidMeleeLine(game),
    ...enemyDebugLines(game),
    `Resources: Pits ${game.resources.pits}  Reeds ${game.resources.reeds}  Feathers ${game.resources.feathers}`,
    `Turrets: ${game.turrets.length}  Pebbles in flight: ${game.projectiles.length}  Vultures: ${game.vultures.length}/${C.MAX_VULTURES}  Squirrels: ${game.squirrels.length}/${C.MAX_SQUIRRELS}${C.SQUIRREL_BLOCKS_WOLVES ? ' (block wolves)' : ''}`,
    ...dropDebugLines(game),
    ...turretDebugLines(game),
    ...soundDebugLines(),
    ...layoutLines,
    ...runDebugLines(game, scene),
  ].join('\n'));
}
