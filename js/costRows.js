// Cost rows (M1f §3): the single component for every cost shown in the UI (build menu, step-mode
// slot tooltip, upgrade menu, summon menu). One row per resource the cost uses, in the order
// Pits, Reeds, Feathers, Boughs (up to four rows, M1i §1.1): [icon] × N. A row the player cannot cover turns red: × N (have M).
// Icons come from the shared resource-icon definition (icons.js).

import * as C from './config.js';
import { RESOURCE_KEYS } from './resources.js';
import { RESOURCE_ICON_SVG } from './icons.js';

// [{ resource, amount, have, short }] for the resources the cost uses.
export function costRowData(cost, resources) {
  return RESOURCE_KEYS.filter((k) => (cost[k] ?? 0) > 0).map((k) => {
    const have = resources[k] ?? 0;
    return { resource: k, amount: cost[k], have, short: have < cost[k] };
  });
}

// Changes whenever what the rows show changes (cheap per-frame comparison).
export function costRowsKey(cost, resources) {
  return costRowData(cost, resources).map((r) => `${r.resource}${r.amount}${r.short ? `/${r.have}` : ''}`).join(',');
}

export function costRowsElement(cost, resources) {
  const box = document.createElement('div');
  box.className = 'cost-rows';
  for (const row of costRowData(cost, resources)) {
    const line = document.createElement('div');
    line.className = row.short ? 'cost-row short' : 'cost-row';
    const icon = document.createElement('span');
    icon.className = 'cost-icon';
    icon.style.width = `${C.MENU_COST_ICON_SIZE}px`;
    icon.style.height = `${C.MENU_COST_ICON_SIZE}px`;
    icon.innerHTML = RESOURCE_ICON_SVG[row.resource];
    const text = document.createElement('span');
    text.textContent = row.short ? `× ${row.amount} (have ${row.have})` : `× ${row.amount}`;
    line.append(icon, text);
    box.append(line);
  }
  return box;
}
