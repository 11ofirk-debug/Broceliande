// A visit to a Wandering Trader (M2n §4): the TRADER state's own state and its actions. The
// player's pack is run.inventory, changed directly (§5); game.resources mirrors it for the HUD.
//
// game.visit: { trader, nodeId (null for debug Shift+T), rng (dialogue), trades (undo stack),
//   give, get (selected resources or null), bundles (how many bundles the quantity is),
//   line (speech line), time (s since arrival, simulation time), lastTradeAt, leaving (s since
//   Back to the road, or null) }

import * as C from './config.js';
import { GameState } from './states.js';
import { setState } from './game.js';
import { createRng } from './rng.js';
import { mapNode, nodeState } from './run.js';
import { resourceName } from './resources.js';
import { rollTrader, tradeRatio, maxBundles, tradeBlocker, makeTrade, undoTrade, traderLine } from './trade.js';
import { events } from './events.js';

let debugTraders = 0; // Shift+T traders opened this page, for a fresh seed each time

// Entering a Trader node (MAP → TRADER): its trader as rolled with the run.
export function enterTrader(game, nodeId) {
  if (game.state !== GameState.MAP || nodeState(game.run, nodeId) !== 'available') return false;
  const trader = game.run.traders[nodeId];
  if (!trader) return false;
  game.run.currentNodeId = nodeId;
  return openVisit(game, trader, nodeId);
}

// Debug Shift+T on the map (§6): a trader with freshly rolled prices and stock, no node and no
// map progress.
export function openDebugTrader(game) {
  if (game.state !== GameState.MAP) return false;
  debugTraders++;
  const trader = rollTrader(createRng((game.run.seed + 104729 * debugTraders) >>> 0), Object.values(game.run.traders).map((t) => t.name));
  return openVisit(game, trader, null);
}

function openVisit(game, trader, nodeId) {
  if (!setState(game, GameState.TRADER)) return false;
  const rng = createRng((game.run.seed ^ (trader.look * 2654435761)) >>> 0);
  game.visit = { trader, nodeId, rng, trades: [], give: null, get: null, bundles: 1, line: traderLine(rng, 'greet'), time: 0, lastTradeAt: -Infinity, leaving: null };
  syncResources(game);
  events.emit('traderGreet', {});
  return true;
}

// Advances the visit's clock; Back to the road finishes after the fade (TRADER_FADE_TIME).
export function updateVisit(game, dt) {
  const v = game.visit;
  v.time += dt;
  if (v.leaving === null) return;
  v.leaving += dt;
  if (v.leaving >= C.TRADER_FADE_TIME) finishVisit(game);
}

// Click on a resource in the pack (side 'give') or on the blanket ('get') (§4.3 step 1). The two
// can't be the same: picking the other side's resource clears that side. A sold-out resource
// can't be chosen as "get" (§3.5): the trader says so instead.
export function selectResource(game, side, resource) {
  const v = game.visit;
  if (v.leaving !== null) return;
  if (side === 'get' && v.trader.stock[resource] <= 0) {
    v.line = traderLine(v.rng, 'soldout', resourceName(resource, 2));
    events.emit('soldOut', {});
    return;
  }
  v[side] = v[side] === resource ? null : resource;
  const other = side === 'give' ? 'get' : 'give';
  if (v[other] === resource) v[other] = null;
  v.bundles = 1; // a new pair starts at one bundle (§4.3 step 3)
}

// The selected pair's ratio { a, b }, or null without a pair.
export function visitRatio(game) {
  const v = game.visit;
  return v.give && v.get ? tradeRatio(v.trader, v.give, v.get) : null;
}

export function visitMaxBundles(game) {
  const v = game.visit;
  return v.give && v.get ? maxBundles(v.trader, game.run.inventory, v.give, v.get) : 0;
}

// Why Trade is disabled, or null (§4.3 step 6).
export function visitBlocker(game) {
  const v = game.visit;
  if (!v.give || !v.get) return 'Pick what to give and what to get';
  return tradeBlocker(v.trader, game.run.inventory, v.give, v.get);
}

// − / + / Max (§4.3 step 3): the quantity, in bundles, between 1 and the most possible.
export function stepBundles(game, delta) {
  const v = game.visit;
  v.bundles = Math.max(1, Math.min(Math.max(1, visitMaxBundles(game)), v.bundles + delta));
}

export function maxOutBundles(game) {
  game.visit.bundles = Math.max(1, visitMaxBundles(game));
}

// Trade (§4.3 step 5).
export function doTrade(game) {
  const v = game.visit;
  if (v.leaving !== null || visitBlocker(game)) return false;
  const trade = makeTrade(v.trader, game.run.inventory, v.give, v.get, Math.min(v.bundles, visitMaxBundles(game)));
  if (!trade) return false;
  v.trades.push(trade);
  v.lastTradeAt = v.time;
  v.line = traderLine(v.rng, 'trade', resourceName(trade.give, 2));
  v.bundles = Math.max(1, Math.min(v.bundles, visitMaxBundles(game)));
  syncResources(game);
  events.emit('tradeComplete', {});
  return true;
}

// Undo last trade (§4.4): repeatable back to the start of the visit.
export function undoVisitTrade(game) {
  const v = game.visit;
  if (v.leaving !== null || !v.trades.length) return false;
  undoTrade(v.trader, game.run.inventory, v.trades.pop());
  syncResources(game);
  events.emit('tradeUndo', {});
  return true;
}

// Back to the road (§4.4): a farewell line, the fade, then the map.
export function leaveVisit(game) {
  const v = game.visit;
  if (v.leaving !== null) return;
  v.leaving = 0;
  v.line = traderLine(v.rng, 'leave');
}

// The visit is final: a Trader node is completed (its `next` nodes become available); a debug
// trader leaves the map as it was.
function finishVisit(game) {
  const { nodeId } = game.visit;
  if (nodeId && !game.run.completedNodeIds.includes(nodeId)) game.run.completedNodeIds.push(nodeId);
  game.visit = null;
  syncResources(game);
  setState(game, GameState.MAP);
}

function syncResources(game) {
  game.resources = { ...game.run.inventory };
}

export function isTraderNode(run, nodeId) {
  return mapNode(run, nodeId)?.type === 'trader';
}
