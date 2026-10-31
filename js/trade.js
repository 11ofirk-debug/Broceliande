// Wandering Trader (M2n §3): each trader's prices and stock, trade ratios and trades. Pure state
// and rules, no drawing; the scene (traderScreen.js, render/trader.js) reads it.
//
// A trader: { name, look, mult: { resource: price multiplier }, stock: { resource: count } }.
// A resource's value at a trader = its baseValue (trade tab) × the trader's multiplier. The trader
// sells at value × (1 + TRADE_MARGIN) and buys at value × (1 − TRADE_MARGIN), so any round trip
// loses a little.

import * as C from './config.js';
import { RESOURCE_KEYS } from './resources.js';

// Rolls a trader (§3.2, §3.5) from a seeded rng: a multiplier and a stock per resource, a name
// not in usedNames (§4.5: no two traders in a run share one) and a colour variation for its look.
export function rollTrader(rng, usedNames = []) {
  const v = C.TRADE_PRICE_VARIATION;
  const mult = {};
  const stock = {};
  for (const k of RESOURCE_KEYS) {
    mult[k] = rng.range(1 - v, 1 + v);
    stock[k] = rng.int(C.TRADE[k].stockMin, C.TRADE[k].stockMax);
  }
  const free = C.TRADER_TEXT.name.filter((n) => !usedNames.includes(n));
  const pool = free.length ? free : C.TRADER_TEXT.name;
  const name = pool[rng.int(0, pool.length - 1)];
  return { name, look: rng.int(0, 1e6), mult, stock };
}

export function tradeValue(trader, resource) {
  return C.TRADE[resource].baseValue * trader.mult[resource];
}

// Exact cost (§3.3): how many `give` buy one `get`.
export function exactCost(trader, give, get) {
  return (tradeValue(trader, get) * (1 + C.TRADE_MARGIN)) / (tradeValue(trader, give) * (1 - C.TRADE_MARGIN));
}

// The bundle ratio { a, b }: give a, get b (§3.3). The whole-number ratio with terms 1 … TRADE_MAX_RATIO_TERM
// closest to the exact cost without being better for the player (a / b ≥ exact); ties go to the
// smaller terms. When even TRADE_MAX_RATIO_TERM : 1 is too cheap (a very dear `get`), a grows past
// the limit: ⌈exact⌉ : 1, still never better for the player.
export function tradeRatio(trader, give, get) {
  const exact = exactCost(trader, give, get);
  const n = C.TRADE_MAX_RATIO_TERM;
  if (exact > n) return { a: Math.ceil(exact - 1e-9), b: 1 };
  let best = null;
  for (let b = 1; b <= n; b++) {
    for (let a = 1; a <= n; a++) {
      const over = a / b - exact;
      if (over < -1e-9) continue;
      if (!best || over < best.over - 1e-9) best = { a, b, over };
    }
  }
  return { a: best.a, b: best.b };
}

// The most bundles the player can make (§4.3 Max): limited by what they hold and the stock.
export function maxBundles(trader, inventory, give, get) {
  const { a, b } = tradeRatio(trader, give, get);
  return Math.max(0, Math.min(Math.floor((inventory[give] ?? 0) / a), Math.floor(trader.stock[get] / b)));
}

// Why a pair can't be traded right now, or null (§4.3 step 6).
export function tradeBlocker(trader, inventory, give, get) {
  if (trader.stock[get] <= 0) return 'Sold out';
  const { a, b } = tradeRatio(trader, give, get);
  if (trader.stock[get] < b) return 'Not enough in stock';
  if ((inventory[give] ?? 0) < a) return 'Not enough to trade';
  return null;
}

// Trades `bundles` bundles of give → get (§4.3 step 5): the player pays a × bundles of `give`
// and receives b × bundles of `get`; what they give joins the trader's stock (§3.5). Returns the
// trade record (for undo), or null if it can't be made.
export function makeTrade(trader, inventory, give, get, bundles) {
  if (give === get || bundles < 1 || bundles > maxBundles(trader, inventory, give, get)) return null;
  const { a, b } = tradeRatio(trader, give, get);
  const trade = { give, get, gave: a * bundles, got: b * bundles };
  applyTrade(trader, inventory, trade, 1);
  return trade;
}

// Undo (§4.4): the trade reversed, resources and stock.
export function undoTrade(trader, inventory, trade) {
  applyTrade(trader, inventory, trade, -1);
}

function applyTrade(trader, inventory, { give, get, gave, got }, sign) {
  inventory[give] -= sign * gave;
  inventory[get] += sign * got;
  trader.stock[give] += sign * gave;
  trader.stock[get] -= sign * got;
}

// Price tags (§3.4): on the trader's goods 'cheap' / 'pricey'; on the player's pack 'sellsWell' /
// 'sellsPoorly'; or null.
export function goodsTag(trader, resource) {
  const m = trader.mult[resource];
  return m <= C.TRADE_TAG_CHEAP ? 'cheap' : m >= C.TRADE_TAG_PRICEY ? 'pricey' : null;
}

export function packTag(trader, resource) {
  const m = trader.mult[resource];
  return m >= C.TRADE_TAG_PRICEY ? 'sellsWell' : m <= C.TRADE_TAG_CHEAP ? 'sellsPoorly' : null;
}

// A random line of `kind` (§4.5) with {resource} filled in, from a seeded rng.
export function traderLine(rng, kind, resourceName = '') {
  const lines = C.TRADER_TEXT[kind];
  const text = lines[rng.int(0, lines.length - 1)];
  return text.replaceAll('{resource}', resourceName);
}
