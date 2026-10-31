// Run state (M2a §2.2): a path through the level map, kept apart from the encounter state in
// game.js. A run starts on MAP_START_NODE; winning a node makes its `next` nodes available, and
// winning a node with no `next` completes the run. Nothing here is tied to particular nodes.

import * as C from './config.js';
import { emptyResources } from './resources.js';
import { makeRandomSeed, createRng } from './rng.js';
import { rollTrader } from './trade.js';
import { generateMap, mapSeedFor, nodeRadius } from './mapGen.js';

export { nodeRadius };

// run: { seed, map, currentNodeId, completedNodeIds, inventory, druidHp, items, equipped, seenItems, traders }
// map (M2g): this run's generated map (mapGen.js), nodes with positions and `next` roads.
// currentNodeId: the node last entered (null before the first). inventory: resources carried
// between encounters. druidHp: used for the next encounter only with CARRY_DRUID_HP. Equipment
// (M2e §5): items owned this run (ITEMS keys), the one equipped in each slot (or null), and the
// owned items the player has looked at (badges and New marks). traders (M2n §5): each Trader node's
// rolled trader (name, multipliers, stock), by node id, rolled with the run.
export function createRun() {
  const seed = C.DEBUG_SEED ?? makeRandomSeed(); // DEBUG_SEED reproduces the whole run
  const map = generateMap(mapSeedFor(seed));
  return {
    seed,
    map,
    currentNodeId: null,
    completedNodeIds: [],
    inventory: emptyResources(),
    druidHp: C.DRUID_HP,
    items: [],
    equipped: Object.fromEntries(Object.keys(C.SLOT_TYPES).map((slot) => [slot, null])),
    seenItems: [],
    traders: rollRunTraders(seed, map),
  };
}

// M2n §5: a trader for every Trader node on the map, seeded from the run seed, no name used twice.
// keep: traders already rolled (by node id), kept as they are (debug L, regenerateMap).
function rollRunTraders(seed, map, keep = {}) {
  const rng = createRng((seed ^ 0x7a3d1) >>> 0);
  const nodes = map.nodes.filter((n) => n.type === 'trader');
  const traders = Object.fromEntries(nodes.filter((n) => keep[n.id]).map((n) => [n.id, keep[n.id]]));
  for (const node of nodes) {
    if (!traders[node.id]) traders[node.id] = rollTrader(rng, Object.values(traders).map((t) => t.name));
  }
  return traders;
}

// A node of the run's map (M2g: positions and roads differ per run), or null.
export function mapNode(run, id) {
  return run.map.nodes.find((n) => n.id === id) ?? null;
}

// The last node won, or null at the start of a run.
function lastCompleted(run) {
  return run.completedNodeIds.length ? mapNode(run, run.completedNodeIds[run.completedNodeIds.length - 1]) : null;
}

// Nodes the player may enter now (§4.3): the start node at the beginning of a run, then the
// not-yet-won `next` nodes of the last node won.
// Once the player has entered one of them, that choice is made: only it stays available and its
// siblings are bypassed.
export function availableNodeIds(run) {
  const last = lastCompleted(run);
  if (!last) return [C.MAP_START_NODE];
  const choices = last.next.filter((id) => !run.completedNodeIds.includes(id));
  return choices.includes(run.currentNodeId) ? [run.currentNodeId] : choices;
}

// Nodes still reachable by following `next` links from the available nodes (not counting them).
function reachableNodeIds(run) {
  const seen = new Set();
  const queue = availableNodeIds(run).flatMap((id) => mapNode(run, id).next);
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...mapNode(run, id).next);
  }
  return seen;
}

// 'available' | 'completed' | 'locked' | 'bypassed', for any map shape (M2b §1.2, replacing
// M2a §4.3): completed = won this run; available = see above; locked = not yet reachable but still
// reachable from where the run stands; bypassed = no longer reachable (e.g. a skipped sibling and
// anything reachable only through it).
export function nodeState(run, id) {
  if (run.completedNodeIds.includes(id)) return 'completed';
  if (availableNodeIds(run).includes(id)) return 'available';
  return reachableNodeIds(run).has(id) ? 'locked' : 'bypassed';
}

// The run is complete when the last node won has no `next` nodes (§4.1).
export function isRunComplete(run) {
  const last = lastCompleted(run);
  return !!last && last.next.length === 0;
}

// Each encounter's seed, derived from the run seed and the node ID (§2.2), so a fixed run seed
// reproduces every encounter of the run.
export function encounterSeed(run, nodeId) {
  let h = run.seed >>> 0;
  for (let i = 0; i < nodeId.length; i++) h = Math.imul(h ^ nodeId.charCodeAt(i), 2654435761) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

// On Victory (§3): the node is won and the resources (all four) are carried; with
// CARRY_DRUID_HP, the Druid's HP too.
export function recordVictory(run, resources, druidHp) {
  if (run.currentNodeId && !run.completedNodeIds.includes(run.currentNodeId)) run.completedNodeIds.push(run.currentNodeId);
  run.inventory = { ...emptyResources(), ...resources };
  run.druidHp = druidHp;
}

// HP the Druid starts the next encounter with: full (his effective max HP, M2e §5), or with
// CARRY_DRUID_HP the HP he won with, clamped to that max (it may have dropped after unequipping).
export function startingDruidHp(run, maxHp) {
  return C.CARRY_DRUID_HP ? Math.min(run.druidHp, maxHp) : maxHp;
}

// The available node under p (for hover and clicks), or null. Locked, completed and bypassed
// nodes do not react.
export function availableNodeAt(run, p) {
  for (const id of availableNodeIds(run)) {
    const n = mapNode(run, id);
    if (Math.hypot(p.x - n.pos.x, p.y - n.pos.y) <= nodeRadius(n) * C.MAP_HOVER_SCALE) return id;
  }
  return null;
}

// Start-up check of MAP_NODES (M2a §4.1, M2c §1.1, M2g §1): unique IDs, a known start node, known
// levels and types, every node in a row (its level's), the start node alone in the lowest row and
// rows numbered without gaps.
export function validateMap() {
  const ids = C.MAP_NODES.map((n) => n.id);
  if (new Set(ids).size !== ids.length) console.error(`MAP_NODES has duplicate IDs: ${ids.join(', ')}`);
  if (!ids.includes(C.MAP_START_NODE)) console.error(`MAP_START_NODE "${C.MAP_START_NODE}" is not in MAP_NODES`);
  for (const n of C.MAP_NODES) {
    if (!C.LEVELS[n.levelId]) console.error(`Map node ${n.id}: unknown level "${n.levelId}"`);
    else if (!Number.isInteger(C.LEVELS[n.levelId].row)) console.error(`Map node ${n.id}: its level "${n.levelId}" has no row (levels tab)`);
    if (!C.NODE_TYPES[n.type]) console.error(`Map node ${n.id}: unknown type "${n.type}" (NODE_TYPES)`);
  }
  const rows = C.MAP_NODES.map((n) => C.LEVELS[n.levelId]?.row).filter(Number.isInteger);
  const lowest = Math.min(...rows);
  const start = C.MAP_NODES.find((n) => n.id === C.MAP_START_NODE);
  if (start && (C.LEVELS[start.levelId]?.row !== lowest || rows.filter((r) => r === lowest).length !== 1)) console.error('MAP_START_NODE must be alone in the lowest row');
  for (let r = lowest; r <= Math.max(...rows); r++) if (!rows.includes(r)) console.error(`Map: no node in row ${r} (rows must not skip)`);
}

// ---------------------------------------------------------------------------
// Equipment (M2e §5). Items fit only their own slot; one per slot; swapping is free (on the map).
// ---------------------------------------------------------------------------

// A random ITEMS key the run doesn't own yet (seeded rng), or null if it owns them all.
export function randomUnownedItem(run, rng) {
  const left = Object.keys(C.ITEMS).filter((id) => !run.items.includes(id));
  return left.length ? left[rng.int(0, left.length - 1)] : null;
}

export function addItem(run, itemId) {
  if (!C.ITEMS[itemId] || run.items.includes(itemId)) return false;
  run.items.push(itemId);
  return true;
}

// Equip an owned item in its slot, replacing whatever was there.
export function equipItem(run, itemId) {
  const item = C.ITEMS[itemId];
  if (!item || !run.items.includes(itemId)) return false;
  run.equipped[item.slot] = itemId;
  return true;
}

export function unequipSlot(run, slot) {
  if (!(slot in run.equipped)) return false;
  run.equipped[slot] = null;
  return true;
}

// The player has looked at a slot's items (its popover opened, M2e §4.4): they lose their New
// marks and the slot's badge clears.
export function markSlotSeen(run, slot) {
  for (const id of run.items) {
    if (C.ITEMS[id].slot === slot && !run.seenItems.includes(id)) run.seenItems.push(id);
  }
}

// Debug L on the map (M2g §4): the map again from a new seed. The run's progress stays only if
// the node last entered still exists in the same row (else false: the caller starts a new run).
export function regenerateMap(run, seed) {
  const was = run.currentNodeId ? mapNode(run, run.currentNodeId) : null;
  run.map = generateMap(seed);
  run.traders = rollRunTraders(seed, run.map, run.traders); // M2n §5: the same traders where their nodes remain
  if (!was) return true;
  const now = mapNode(run, was.id);
  return !!now && now.row === was.row;
}
