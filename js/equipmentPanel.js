// Equipment panel on the map (M2e §4): the Druid portrait with six slots, a popover per slot to
// equip / remove items, badges for unseen items, the stats strip and the carried resources.
// HTML over the left EQUIP_PANEL_WIDTH px of the stage; only shown in the MAP state. It reads the
// run and changes it only through the callbacks it is given (main.js).

import * as C from './config.js';
import { GameState } from './states.js';
import { resolveStats, baseStats } from './stats.js';
import { drawEquipmentPortrait } from './render/equipment.js';
import { drawSlotIcon, drawItemIcon } from './render/items.js';
import { RESOURCE_ICON_SVG } from './icons.js';
import { RESOURCE_KEYS, resourceName } from './resources.js';

const SLOTS = Object.keys(C.SLOT_TYPES);
const ICON_PX = 60;     // item / slot icon inside a slot circle
const ROW_ICON_PX = 40; // item icon in a popover row

// callbacks: { onEquip(itemId), onUnequip(slot), onSlotViewed(slot) }
export function createEquipmentPanel(callbacks) {
  const panel = document.getElementById('equip-panel');
  panel.style.width = `${C.EQUIP_PANEL_WIDTH}px`;
  panel.style.top = `${C.HUD_STRIP_HEIGHT}px`;
  panel.style.height = `${C.STAGE_HEIGHT - C.HUD_STRIP_HEIGHT}px`;
  drawEquipmentPortrait(document.getElementById('equip-portrait').getContext('2d'));

  const popover = document.getElementById('equip-popover');
  const tip = document.getElementById('equip-tip');
  const stats = document.getElementById('equip-stats');
  const carried = document.getElementById('equip-carried-rows');

  // One button per slot: frame, icon canvas, badge.
  const slotEls = {};
  for (const slot of SLOTS) {
    const p = C.EQUIP_SLOT_POS[slot];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'equip-slot';
    btn.style.width = btn.style.height = `${C.EQUIP_SLOT_SIZE}px`;
    btn.style.left = `${p.x - C.EQUIP_SLOT_SIZE / 2}px`;
    btn.style.top = `${p.y - C.EQUIP_SLOT_SIZE / 2}px`;
    const icon = document.createElement('canvas');
    icon.width = icon.height = ICON_PX;
    const badge = document.createElement('span');
    badge.className = 'equip-badge';
    badge.hidden = true;
    const label = document.createElement('span');
    label.className = 'equip-slot-label';
    label.textContent = C.SLOT_TYPES[slot].label;
    btn.append(icon, badge, label);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (openSlot === slot) closePopover(); else openPopover(slot);
      btn.blur();
    });
    btn.addEventListener('mouseenter', () => showTip(slot));
    btn.addEventListener('mouseleave', () => { tip.hidden = true; });
    panel.querySelector('#equip-slots').append(btn);
    slotEls[slot] = { btn, icon, badge };
  }
  panel.addEventListener('click', (e) => {
    if (!popover.contains(e.target)) closePopover();
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopover(); });

  let run = null;
  let openSlot = null;
  let newInPopover = [];  // items marked New when the popover opened (their marks clear next time)
  let key = null;

  function itemsFor(slot) {
    return run.items.filter((id) => C.ITEMS[id].slot === slot);
  }

  function showTip(slot) {
    const id = run?.equipped[slot];
    if (!id || openSlot) {
      tip.hidden = true;
      return;
    }
    const item = C.ITEMS[id];
    tip.replaceChildren(textDiv('equip-tip-name', item.name), textDiv('equip-tip-desc', item.description));
    placeBeside(tip, slot, 14);
    tip.hidden = false;
  }

  // Opening a slot's popover lists the run's items for it; its New marks show this once and the
  // slot's badge clears (M2e §4.3–4.4).
  function openPopover(slot) {
    openSlot = slot;
    tip.hidden = true;
    newInPopover = itemsFor(slot).filter((id) => !run.seenItems.includes(id));
    callbacks.onSlotViewed(slot);
    renderPopover();
    popover.hidden = false;
  }

  function closePopover() {
    openSlot = null;
    popover.hidden = true;
  }

  function renderPopover() {
    const slot = openSlot;
    const rows = [textDiv('equip-pop-title', C.SLOT_TYPES[slot].label)];
    const owned = itemsFor(slot);
    if (owned.length === 0) {
      rows.push(textDiv('equip-pop-empty', 'No items yet'), textDiv('equip-pop-hint', 'Search resource spots in battle to find them.'));
    }
    for (const id of owned) {
      const item = C.ITEMS[id];
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'equip-pop-item' + (run.equipped[slot] === id ? ' equipped' : '');
      const icon = document.createElement('canvas');
      icon.width = icon.height = ROW_ICON_PX;
      drawItemIcon(icon.getContext('2d'), id, ROW_ICON_PX / 2, ROW_ICON_PX / 2, ROW_ICON_PX * 0.92);
      const text = document.createElement('div');
      text.className = 'equip-pop-text';
      const name = textDiv('equip-pop-name', item.name);
      if (newInPopover.includes(id)) name.append(textSpan('equip-new', 'New'));
      if (run.equipped[slot] === id) name.append(textSpan('equip-on', 'Equipped'));
      text.append(name, textDiv('equip-pop-desc', item.description));
      row.append(icon, text);
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onEquip(id);
        renderPopover();
      });
      rows.push(row);
    }
    if (run.equipped[slot]) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'equip-pop-remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onUnequip(slot);
        renderPopover();
      });
      rows.push(remove);
    }
    popover.replaceChildren(...rows);
    placeBeside(popover, slot, 16);
  }

  // Beside a slot: to the right of the left column, to the left of the right column.
  function placeBeside(el, slot, gap) {
    const p = C.EQUIP_SLOT_POS[slot];
    const onLeft = p.x < C.EQUIP_PANEL_WIDTH / 2;
    el.style.top = `${Math.max(8, p.y - C.EQUIP_SLOT_SIZE / 2)}px`;
    el.style.left = onLeft ? `${p.x + C.EQUIP_SLOT_SIZE / 2 + gap}px` : '';
    el.style.right = onLeft ? '' : `${C.EQUIP_PANEL_WIDTH - (p.x - C.EQUIP_SLOT_SIZE / 2 - gap)}px`;
  }

  function renderSlots() {
    for (const slot of SLOTS) {
      const { btn, icon, badge } = slotEls[slot];
      const id = run.equipped[slot];
      const ctx = icon.getContext('2d');
      ctx.clearRect(0, 0, ICON_PX, ICON_PX);
      if (id) drawItemIcon(ctx, id, ICON_PX / 2, ICON_PX / 2, ICON_PX * 0.9);
      else drawSlotIcon(ctx, slot, ICON_PX / 2, ICON_PX / 2, ICON_PX * 0.9, null, 0.35); // faded silhouette
      btn.classList.toggle('filled', !!id);
      badge.hidden = !itemsFor(slot).some((i) => !run.seenItems.includes(i));
    }
  }

  // Stats strip (M2e §4.5): the stats equipment can change, changed ones highlighted with the
  // base value on hover. Steps vary by Wilds, so the strip shows the change to every Wilds' budget.
  function renderStats() {
    const level = C.LEVELS[C.MAP_NODES.find((n) => n.id === C.MAP_START_NODE).levelId];
    const eff = resolveStats(run.equipped, level);
    const base = baseStats(level);
    const pct = (v) => `${Math.round(v * 100)}%`;
    const entries = [
      ['HP', 'druid.maxHp', (v) => String(v)],
      ['Steps', 'steps.budget', (v, b) => (v === b ? '—' : `${v > b ? '+' : ''}${v - b}`)],
      ['Step length', 'steps.length', (v) => String(Math.round(v * 100) / 100)],
      ['Build speed', 'work.speed', pct],
      ['Search bonus', 'search.mainBonus', (v) => (v ? `+${v}` : '—')],
      ['Regen', 'druid.regenAmount', (v) => (v ? `${v} HP / ${C.DRUID_REGEN_INTERVAL} s` : '—')],
    ];
    stats.replaceChildren(...entries.map(([label, k, fmt]) => {
      const el = document.createElement('span');
      const changed = eff[k] !== base[k];
      el.className = 'equip-stat' + (changed ? ' changed' : '');
      el.textContent = `${label} ${fmt(eff[k], base[k])}`;
      if (changed) el.title = `Base: ${fmt(base[k], base[k]) === '—' ? 'none' : fmt(base[k], base[k])}`;
      return el;
    }));
  }

  function renderCarried() {
    carried.replaceChildren(...RESOURCE_KEYS.map((k) => {
      const el = document.createElement('span');
      el.className = 'equip-res';
      el.title = resourceName(k, 2);
      const icon = document.createElement('span');
      icon.className = 'equip-res-icon';
      icon.innerHTML = RESOURCE_ICON_SVG[k];
      el.append(icon, textSpan('', String(run.inventory[k] ?? 0)));
      return el;
    }));
  }

  function update(game) {
    const shown = game.state === GameState.MAP && !!game.run;
    panel.hidden = !shown;
    if (!shown) {
      closePopover();
      tip.hidden = true;
      return;
    }
    run = game.run;
    const k = JSON.stringify([run.items, run.equipped, run.seenItems, run.inventory]);
    if (k === key) return;
    key = k;
    renderSlots();
    renderStats();
    renderCarried();
    if (openSlot) renderPopover();
  }

  return { update };
}

function textDiv(cls, text) {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = text;
  return d;
}

function textSpan(cls, text) {
  const s = document.createElement('span');
  if (cls) s.className = cls;
  s.textContent = text;
  return s;
}
