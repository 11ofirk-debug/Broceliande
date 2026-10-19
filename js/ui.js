// HTML UI: HUD strip, resource panel, tooltips, contextual menu, Victory/Defeat overlay
// and debug panel. Reads game state; reports clicks through callbacks. Menu and hover
// state live in `view` (UI state, not simulation).

import * as C from './config.js';
import { GameState, ActionState } from './states.js';
import { laneStats, expectedResources } from './scene.js';
import { canAfford, formatCost } from './resources.js';
import { canStartBuild, upgradeAvailability, summonAvailability, druidDisplayPos } from './systems/actionSystem.js';
import { turretOnSlot } from './systems/buildSystem.js';

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
  const lines = ['', `Lanes (unopposed, WOLF_SPEED; target ×${C.LANE_LENGTH_FACTOR.toFixed(2)}):`];
  for (const lane of scene.lanes) {
    const st = laneStats(lane);
    lines.push(`  ${lane.name.padEnd(12)}${Math.round(st.length)} px  ${st.travelTime.toFixed(1)} s  ×${st.factor.toFixed(2)}`);
  }
  const res = expectedResources();
  lines.push('', 'Search all features (avg):');
  lines.push(`  Pits ${res.pits}  Reeds ${res.reeds}  Feathers ${res.feathers}`);
  lines.push(`  Search time ${res.searchTime.toFixed(1)} s`);
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
    wolves: document.getElementById('hud-wolves'),
    hpFill: document.getElementById('hud-hp-fill'),
    hpText: document.getElementById('hud-hp-text'),
    res: {
      pits: document.getElementById('res-pits'),
      reeds: document.getElementById('res-reeds'),
      feathers: document.getElementById('res-feathers'),
    },
    startCombat: document.getElementById('btn-start-combat'),
    endOverlay: document.getElementById('end-overlay'),
    endTitle: document.getElementById('end-title'),
    endStats: document.getElementById('end-stats'),
    restart: document.getElementById('btn-restart'),
    tooltip: document.getElementById('tooltip'),
    menu: document.getElementById('menu'),
    menuTitle: document.getElementById('menu-title'),
    menuCost: document.getElementById('menu-cost'),
    menuDetail: document.getElementById('menu-detail'),
    menuAction: document.getElementById('menu-action'),
    menuReason: document.getElementById('menu-reason'),
    modeBanner: document.getElementById('mode-banner'),
    debugPanel: document.getElementById('debug-panel'),
  };

  el.hud.style.height = `${C.HUD_STRIP_HEIGHT}px`;
  el.startCombat.addEventListener('click', () => callbacks.onStartCombat());
  el.restart.addEventListener('click', () => callbacks.onRestart());
  el.menuAction.addEventListener('click', () => callbacks.onMenuAction());

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
    tooltipKey = updateTooltip(el, game, view, tooltipKey);
    menuKey = updateMenu(el, game, view, menuKey);
    el.modeBanner.hidden = game.action.state !== ActionState.SUMMON_PLACEMENT;
    updateEndOverlay(el, game);
    updateDebugPanel(el, game, clock, view, layoutLines);
  }

  return { update };
}

function updateHud(el, game) {
  const isPrep = game.state === GameState.PREP;
  const isCombat = game.state === GameState.COMBAT;

  setText(el.phase, game.state);
  if (isPrep) {
    // Countdown shows 00:25 at the start and 00:00 only at the moment Combat begins.
    setText(el.timer, formatTime(Math.ceil(game.prepRemaining)));
  } else {
    setText(el.timer, formatTime(game.combatTime));
  }
  setText(el.wolves, isCombat ? `Wolves: ${C.WAVE_TOTAL - game.wolvesKilled} / ${C.WAVE_TOTAL}` : '');
  el.startCombat.hidden = !isPrep;

  const hpFrac = Math.max(0, game.druidHp) / C.DRUID_HP;
  const hpWidth = `${hpFrac * 100}%`;
  if (el.hpFill.style.width !== hpWidth) el.hpFill.style.width = hpWidth;
  el.hpFill.dataset.level = hpFrac > 0.5 ? 'high' : hpFrac > 0.25 ? 'mid' : 'low';
  setText(el.hpText, `${game.druidHp} / ${C.DRUID_HP}`);

  for (const [k, node] of Object.entries(el.res)) setText(node, String(game.resources[k]));
}

// Feature tooltip on hover, PREP only (§8.4). Rebuilt only when its content changes.
function updateTooltip(el, game, view, prevKey) {
  const hover = view.hover;
  const feature = game.state === GameState.PREP && hover?.kind === 'feature' ? game.features[hover.index] : null;
  const key = feature ? `${feature.index}:${feature.exhausted}` : null;
  if (key === prevKey) return key;

  el.tooltip.hidden = !feature;
  if (!feature) return key;

  const type = C.FEATURE_TYPES[feature.type];
  el.tooltip.replaceChildren();
  const title = document.createElement('div');
  title.className = 'tip-title';
  title.textContent = type.name;
  el.tooltip.append(title);
  const lines = feature.exhausted
    ? [['tip-muted', 'Searched']]
    : [
      ...Object.entries(type.yields).map(([res, [min, max]]) => ['', `${RESOURCE_LABELS[res]}: ${min}–${max}`]),
      ['', `Search: ${type.searchTime.toFixed(1)} sec`],
    ];
  for (const [cls, text] of lines) {
    const line = document.createElement('div');
    line.className = cls;
    line.textContent = text;
    el.tooltip.append(line);
  }
  placeBeside(el.tooltip, feature.x, feature.y - C.FEATURE_RADIUS * 0.6, C.FEATURE_RADIUS);
  return key;
}

// "Damage 3 → 5 · Every 0.75 → 0.6 s · Range 220 → 264": what the upgrade buys.
const UPGRADE_DETAIL = `Damage ${C.TURRET_DAMAGE} → ${C.UPGRADED_DAMAGE}\n`
  + `Every ${C.TURRET_FIRE_INTERVAL} → ${C.UPGRADED_FIRE_INTERVAL} s\n`
  + `Range ${C.TURRET_RANGE} → ${Math.round(C.TURRET_RANGE * C.UPGRADED_RANGE_MULT)}\n`
  + `Takes ${C.UPGRADE_TIME} s — turret stops firing`;

// Contextual menu (§9.2, §11.1, §16.2): build menu in Prep, turret menu in Combat.
// Greyed out with its cost and a reason when it cannot be confirmed.
function updateMenu(el, game, view, prevKey) {
  const menu = view.menu;
  el.menu.hidden = !menu;
  if (!menu) return null;

  if (menu.kind === 'build') {
    const affordable = canAfford(game.resources, C.TURRET_COST);
    setText(el.menuTitle, 'Pebble Sprinkler');
    setText(el.menuCost, formatCost(C.TURRET_COST));
    setText(el.menuDetail, '');
    setText(el.menuAction, 'Build');
    setText(el.menuReason, affordable ? '' : 'Not enough resources');
    el.menuAction.hidden = false;
    el.menuAction.disabled = !canStartBuild(game, menu.index);
    el.menu.classList.toggle('unavailable', !affordable);
  } else if (menu.kind === 'summon') {
    // Druid menu (§15.1): greyed out with a reason if not idle, at the Vulture cap, or short of Feathers.
    const { available, reason } = summonAvailability(game);
    setText(el.menuTitle, 'Summon Vulture');
    setText(el.menuCost, formatCost(C.VULTURE_COST));
    setText(el.menuDetail, `Active: ${game.vultures.length} / ${C.MAX_VULTURES}
Lasts ${C.VULTURE_DURATION} s · flies to the wolf nearest to it`);
    setText(el.menuAction, 'Summon');
    setText(el.menuReason, reason);
    el.menuAction.hidden = false;
    el.menuAction.disabled = !available;
    el.menu.classList.toggle('unavailable', !canAfford(game.resources, C.VULTURE_COST));
  } else if (menu.kind === 'upgrade') {
    const turret = turretOnSlot(game, menu.index);
    const { available, reason } = upgradeAvailability(game, menu.index);
    if (turret?.upgraded) {
      // Already upgraded: shows "Upgraded" with no option (§11.1).
      setText(el.menuTitle, 'Pebble Sprinkler');
      setText(el.menuCost, 'Upgraded');
      setText(el.menuDetail, '');
      setText(el.menuReason, '');
      el.menuAction.hidden = true;
      el.menu.classList.remove('unavailable');
    } else {
      setText(el.menuTitle, 'Upgrade');
      setText(el.menuCost, formatCost(C.UPGRADE_COST));
      setText(el.menuDetail, UPGRADE_DETAIL);
      setText(el.menuAction, 'Upgrade');
      setText(el.menuReason, reason);
      el.menuAction.hidden = false;
      el.menuAction.disabled = !available;
      el.menu.classList.toggle('unavailable', !canAfford(game.resources, C.UPGRADE_COST));
    }
  }

  const key = `${menu.kind}:${menu.index}`;
  if (key !== prevKey) {
    if (menu.kind === 'summon') {
      const d = druidDisplayPos(game);
      placeBeside(el.menu, d.x, d.y - C.DRUID_RADIUS * 0.6, C.DRUID_RADIUS);
    } else {
      const slot = C.TURRET_SLOTS[menu.index];
      placeBeside(el.menu, slot.x, slot.y, C.TURRET_SLOT_RADIUS);
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
  setText(el.endStats, `Combat time ${formatTime(game.combatTime)}  ·  Wolves killed ${game.wolvesKilled} / ${C.WAVE_TOTAL}`);
}

function updateDebugPanel(el, game, clock, view, layoutLines) {
  el.debugPanel.hidden = !view.debug;
  if (!view.debug) return;
  const speed = clock.paused ? `PAUSED (×${clock.speed})` : `×${clock.speed}`;
  const a = game.action;
  const action = a.target === null ? a.state : `${a.state} #${a.target} ${a.elapsed.toFixed(1)}/${a.duration.toFixed(1)} s`;
  setText(el.debugPanel, [
    `Seed:   ${game.seed}`,
    `State:  ${game.state}`,
    `Action: ${action}`,
    `Speed:  ${speed}`,
    `FPS:    ${Math.round(view.fps)}`,
    '',
    `Druid HP: ${game.druidHp} / ${C.DRUID_HP}`,
    `Wolves:   spawned ${game.wolvesSpawned}  alive ${game.wolvesAlive}  killed ${game.wolvesKilled}`,
    `Resources: Pits ${game.resources.pits}  Reeds ${game.resources.reeds}  Feathers ${game.resources.feathers}`,
    `Turrets: ${game.turrets.length}  Pebbles in flight: ${game.projectiles.length}  Vultures: ${game.vultures.length}/${C.MAX_VULTURES}`,
    ...layoutLines,
  ].join('\n'));
}
