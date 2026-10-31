// The trader scene's HTML (M2n §4.2–4.4): title and speech, the player's pack and the trader's
// goods (icon, count, tag), the ratio, quantity, preview and Trade button, Undo and Back to the
// road; plus the fade into and out of the scene (§1). Shown only in the TRADER state. It reads
// game state and calls back for every action; the art is on the canvas (render/trader.js).

import * as C from './config.js';
import { GameState } from './states.js';
import { RESOURCE_ICON_SVG } from './icons.js';
import { RESOURCE_KEYS, resourceName } from './resources.js';
import { goodsTag, packTag } from './trade.js';
import { visitRatio, visitMaxBundles, visitBlocker } from './visit.js';

// Tag text and colour class (§3.4).
const TAGS = {
  cheap: ['cheap', 'good'],
  pricey: ['pricey', 'bad'],
  sellsWell: ['sells well', 'good'],
  sellsPoorly: ['sells poorly', 'poor'],
};

const amount = (n, k) => `${n} ${resourceName(k, n)}`;

// callbacks: { onSelect(side, resource), onStep(delta), onMax(), onTrade(), onUndo(), onLeave() }
export function createTraderScreen(callbacks) {
  const $ = (id) => document.getElementById(id);
  const el = {
    root: $('trader-screen'), title: $('trader-title'), speech: $('trader-speech'),
    ratio: $('trade-ratio'), get: $('trade-get'), preview: $('trade-preview'), reason: $('trade-reason'),
    less: $('btn-trade-less'), more: $('btn-trade-more'), max: $('btn-trade-max'), trade: $('btn-trade'),
    undo: $('btn-trade-undo'), leave: $('btn-trade-leave'), fade: $('scene-fade'),
  };
  const cards = { give: buildShelf($('trader-pack'), 'give', callbacks), get: buildShelf($('trader-goods'), 'get', callbacks) };
  el.less.addEventListener('click', () => callbacks.onStep(-1));
  el.more.addEventListener('click', () => callbacks.onStep(1));
  el.max.addEventListener('click', () => callbacks.onMax());
  el.trade.addEventListener('click', () => callbacks.onTrade());
  el.undo.addEventListener('click', () => callbacks.onUndo());
  el.leave.addEventListener('click', () => callbacks.onLeave());

  let lastState = null;
  let mapFadeFrom = null; // performance.now() when the map came back after a visit (fade in, visual only)

  function update(game) {
    if (game.state !== lastState) {
      if (lastState === GameState.TRADER && game.state === GameState.MAP) mapFadeFrom = performance.now();
      lastState = game.state;
    }
    updateFade(el, game, mapFadeFrom);
    const v = game.visit;
    el.root.hidden = game.state !== GameState.TRADER || !v;
    if (el.root.hidden) return;
    const inv = game.run.inventory;
    setText(el.title, `${v.trader.name}'s Cart`);
    setText(el.speech, `“${v.line}”`);

    for (const k of RESOURCE_KEYS) {
      fillCard(cards.give[k], inv[k], packTag(v.trader, k), v.give === k, false);
      fillCard(cards.get[k], v.trader.stock[k], goodsTag(v.trader, k), v.get === k, v.trader.stock[k] <= 0);
    }

    const ratio = visitRatio(game);
    el.ratio.classList.toggle('muted', !ratio);
    setText(el.ratio, ratio ? `${amount(ratio.a, v.give)}  →  ${amount(ratio.b, v.get)}` : 'Pick something from your pack, and something from his goods');
    const blocker = visitBlocker(game);
    const max = visitMaxBundles(game);
    const bundles = Math.min(v.bundles, Math.max(1, max));
    setText(el.get, ratio ? `get ${amount(ratio.b * bundles, v.get)}` : '');
    setText(el.preview, ratio && !blocker
      ? `${resourceName(v.give, 2)} ${inv[v.give]} → ${inv[v.give] - ratio.a * bundles}      ${resourceName(v.get, 2)} ${inv[v.get]} → ${inv[v.get] + ratio.b * bundles}`
      : '');
    const leaving = v.leaving !== null;
    el.less.disabled = !ratio || !!blocker || bundles <= 1 || leaving;
    el.more.disabled = !ratio || !!blocker || bundles >= max || leaving;
    el.max.disabled = !ratio || !!blocker || bundles >= max || leaving;
    el.trade.disabled = !!blocker || leaving;
    setText(el.reason, ratio && blocker ? blocker : '');
    el.undo.disabled = !v.trades.length || leaving;
    el.leave.disabled = leaving;
  }

  return { update };
}

// One card per resource: icon, count and tag. side: 'give' (the pack) or 'get' (the goods).
function buildShelf(shelf, side, callbacks) {
  const list = shelf.querySelector('.trade-items');
  const out = {};
  for (const k of RESOURCE_KEYS) {
    const card = document.createElement('div');
    card.className = 'trade-item';
    card.title = C.RESOURCES[k].name;
    card.innerHTML = `<span class="res-icon">${RESOURCE_ICON_SVG[k]}</span><span class="trade-count"></span><span class="trade-tag"></span>`;
    card.addEventListener('click', () => callbacks.onSelect(side, k));
    list.appendChild(card);
    out[k] = { card, count: card.querySelector('.trade-count'), tag: card.querySelector('.trade-tag') };
  }
  return out;
}

function fillCard(c, count, tag, selected, soldOut) {
  setText(c.count, String(count));
  const [text, cls] = soldOut ? ['Sold out', 'poor'] : (TAGS[tag] ?? ['', '']);
  setText(c.tag, text);
  if (c.tag.dataset.cls !== cls) {
    c.tag.className = `trade-tag ${cls}`;
    c.tag.dataset.cls = cls;
  }
  if (c.card.classList.contains('selected') !== selected) c.card.classList.toggle('selected', selected);
  if (c.card.classList.contains('soldout') !== soldOut) c.card.classList.toggle('soldout', soldOut);
}

// The fade (§1): from black as the scene opens, to black while leaving, then from black again as
// the map comes back.
function updateFade(el, game, mapFadeFrom) {
  let opacity = 0;
  const v = game.visit;
  if (game.state === GameState.TRADER && v) {
    opacity = v.leaving !== null ? v.leaving / C.TRADER_FADE_TIME : 1 - v.time / C.TRADER_FADE_TIME;
  } else if (game.state === GameState.MAP && mapFadeFrom !== null) {
    opacity = 1 - (performance.now() - mapFadeFrom) / 1000 / C.TRADER_FADE_TIME;
  }
  const value = String(Math.max(0, Math.min(1, opacity)).toFixed(3));
  if (el.fade.style.opacity !== value) el.fade.style.opacity = value;
}

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}
