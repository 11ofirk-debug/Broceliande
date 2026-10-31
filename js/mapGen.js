// Generated map roads (M2g): each run's map from a seed. Rows and row heights are fixed (each
// node's row is its level's); what varies is the order and x position of the nodes within a row,
// the roads between adjacent rows and their curves.
//
// A map: { nodes: [{ id, levelId, name, type, row, pos: { x, y }, next: [ids] }],
//          roads: [{ from, to, bend }] (bend: px the curve bows sideways, + to the road's left),
//          attempts, failed: [check names the chosen map fails], failCounts: { check: attempts it failed } }.
// Visual and structural only: the rules (states, availability) are in run.js.

import * as C from './config.js';
import { createRng } from './rng.js';

// The whole-map checks (§2.3), plus roads clear of other nodes and labels (§2.4).
const CHECKS = ['reachable', 'fellAvoidable', 'variety', 'choice', 'roadsClear'];

// The map for a seed: up to MAP_MAX_ATTEMPTS whole maps from one RNG stream, the first passing
// every check, or else the one failing the fewest (with a warning).
export function generateMap(seed) {
  const rng = createRng(seed >>> 0);
  const failCounts = Object.fromEntries(CHECKS.map((c) => [c, 0]));
  let best = null;
  let attempts = 0;
  while (attempts < C.MAP_MAX_ATTEMPTS) {
    attempts++;
    const map = attempt(rng);
    const failed = CHECKS.filter((c) => !CHECK_FNS[c](map));
    for (const c of failed) failCounts[c]++;
    if (!best || failed.length < best.failed.length) best = { map, failed };
    if (!failed.length) break;
  }
  if (best.failed.length) console.warn(`Map: no attempt passed every check in ${C.MAP_MAX_ATTEMPTS}; using one that fails ${best.failed.join(', ')}`);
  return { ...best.map, attempts, failed: best.failed, failCounts };
}

// The seed a run's map uses (§3): from the run seed, or MAP_FIXED_SEED when MAP_RANDOMISE is off.
export function mapSeedFor(runSeed) {
  return C.MAP_RANDOMISE ? (runSeed ^ 0x5bd1e995) >>> 0 : C.MAP_FIXED_SEED;
}

// The map's rows, bottom to top: [[node, …], …], each node a fresh copy with its row.
function rowsOf() {
  const byRow = new Map();
  for (const n of C.MAP_NODES) {
    const row = C.LEVELS[n.levelId].row;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push({ id: n.id, levelId: n.levelId, name: n.name, type: n.type, row, pos: null, next: [] });
  }
  return [...byRow.keys()].sort((a, b) => a - b).map((r) => byRow.get(r));
}

function attempt(rng) {
  const rows = rowsOf();
  rows.forEach((row, i) => {
    shuffle(rng, row);                // §2.1: order within the row
    placeRow(rng, row, i);            // x positions, the row's height with a little jitter
    row.sort((a, b) => a.pos.x - b.pos.x);
  });
  const roads = [];
  for (let i = 0; i + 1 < rows.length; i++) roads.push(...connectRows(rng, rows[i], rows[i + 1]));
  const nodes = rows.flat();
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  for (const r of roads) byId[r.from].next.push(r.to);
  const map = { nodes, roads, rows };
  for (const r of roads) r.bend = roadBend(rng, map, byId[r.from], byId[r.to]);
  return map;
}

function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [list[i], list[j]] = [list[j], list[i]];
  }
}

// §2.1: nodes anywhere across the map area, at least MAP_MIN_NODE_GAP apart, not centred or evenly
// spread (n sorted random offsets in the free room, plus the gaps); a single node near the centre.
function placeRow(rng, row, index) {
  const left = C.EQUIP_PANEL_WIDTH + C.MAP_X_MARGIN;
  const right = C.STAGE_WIDTH - C.MAP_X_MARGIN;
  const y = () => C.MAP_BOTTOM_ROW_Y - index * C.MAP_ROW_SPACING + rng.range(-C.MAP_Y_JITTER, C.MAP_Y_JITTER);
  if (row.length === 1) {
    row[0].pos = { x: (left + right) / 2 + rng.range(-C.MAP_SINGLE_NODE_SPREAD, C.MAP_SINGLE_NODE_SPREAD), y: y() };
    return;
  }
  const room = Math.max(0, right - left - (row.length - 1) * C.MAP_MIN_NODE_GAP);
  const offsets = row.map(() => rng.range(0, room)).sort((a, b) => a - b);
  row.forEach((n, i) => { n.pos = { x: left + offsets[i] + i * C.MAP_MIN_NODE_GAP, y: y() }; });
}

const reach = (a, b) => Math.exp(-Math.abs(a.pos.x - b.pos.x) / C.MAP_ROAD_REACH);

// §2.2: roads from a lower row up to the next, both sorted left to right. A sweep links the
// current pair and moves the lower pointer, the upper one or both (weighted toward the shorter
// next road), so every node gets a road and none cross; then a few extra roads that cross none
// and keep every degree within 3.
function connectRows(rng, lower, upper) {
  const links = []; // [i, j]: lower[i] → upper[j]
  let i = 0;
  let j = 0;
  links.push([0, 0]);
  while (i < lower.length - 1 || j < upper.length - 1) {
    const moves = [];
    if (i < lower.length - 1) moves.push([i + 1, j]);
    if (j < upper.length - 1) moves.push([i, j + 1]);
    if (i < lower.length - 1 && j < upper.length - 1) moves.push([i + 1, j + 1]);
    [i, j] = pickWeighted(rng, moves, ([a, b]) => reach(lower[a], upper[b]));
    links.push([i, j]);
  }
  for (let a = 0; a < lower.length; a++) {
    for (let b = 0; b < upper.length; b++) {
      if (links.some(([p, q]) => p === a && q === b)) continue;
      if (rng.next() >= C.MAP_EXTRA_ROAD_CHANCE * reach(lower[a], upper[b])) continue;
      const crosses = links.some(([p, q]) => (p < a && q > b) || (p > a && q < b));
      const full = links.filter(([p]) => p === a).length >= 3 || links.filter(([, q]) => q === b).length >= 3;
      if (!crosses && !full) links.push([a, b]);
    }
  }
  return links.map(([a, b]) => ({ from: lower[a].id, to: upper[b].id, bend: 0 }));
}

function pickWeighted(rng, options, weight) {
  const w = options.map(weight);
  let roll = rng.next() * w.reduce((s, x) => s + x, 0);
  for (let k = 0; k < options.length; k++) {
    roll -= w[k];
    if (roll <= 0) return options[k];
  }
  return options[options.length - 1];
}

// ---------------------------------------------------------------------------
// Road curves (§2.4): a quadratic curve bowing `bend` px sideways at its middle. A seeded bend;
// if the curve would pass through another node or its label, a smaller or flipped bend; null
// if none is clear (that attempt then fails roadsClear).
// ---------------------------------------------------------------------------
export function roadCurve(a, b, bend) {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const len = Math.hypot(dx, dy);
  // Control point: the midpoint pushed sideways; a quadratic's middle bows half as far, so × 2.
  const ctrl = { x: (a.pos.x + b.pos.x) / 2 + (-dy / len) * bend * 2, y: (a.pos.y + b.pos.y) / 2 + (dx / len) * bend * 2 };
  return { from: a.pos, ctrl, to: b.pos };
}

export function curvePoint(c, t) {
  const u = 1 - t;
  return { x: u * u * c.from.x + 2 * u * t * c.ctrl.x + t * t * c.to.x, y: u * u * c.from.y + 2 * u * t * c.ctrl.y + t * t * c.to.y };
}

// A map node's radius: MAP_NODE_RADIUS, × MAP_BOSS_SCALE for a large node type (M2f §2).
export function nodeRadius(node) {
  return C.MAP_NODE_RADIUS * (C.NODE_TYPES[node.type]?.large ? C.MAP_BOSS_SCALE : 1);
}

// The area a node's name takes under its circle, estimated from its length (no canvas here): one
// line, or two when wider than MAP_LABEL_MAX_WIDTH, as render/map.js wraps it.
const LABEL_CHAR_PX = 0.47; // × MAP_LABEL_FONT_PX: average italic Georgia character width

function labelBox(n) {
  const full = n.name.length * C.MAP_LABEL_FONT_PX * LABEL_CHAR_PX;
  const lines = full > C.MAP_LABEL_MAX_WIDTH && n.name.includes(' ') ? 2 : 1;
  const half = Math.min(full / lines, C.MAP_LABEL_MAX_WIDTH) / 2 + 4;
  const top = n.pos.y + nodeRadius(n) + 8;
  return { left: n.pos.x - half, right: n.pos.x + half, top, bottom: top + lines * (C.MAP_LABEL_FONT_PX + 2) };
}

function curveClear(map, a, b, bend) {
  const c = roadCurve(a, b, bend);
  const m = C.MAP_ROAD_CLEARANCE;
  const others = map.nodes.filter((n) => n !== a && n !== b);
  for (let k = 1; k < 40; k++) {
    const p = curvePoint(c, k / 40);
    for (const n of others) {
      if (Math.hypot(p.x - n.pos.x, p.y - n.pos.y) < nodeRadius(n) + m) return false;
    }
    // Labels of the other nodes (a road always enters its upper node from below, past its label).
    for (const n of others) {
      const L = labelBox(n);
      if (p.x > L.left - m && p.x < L.right + m && p.y > L.top - m && p.y < L.bottom + m) return false;
    }
  }
  return true;
}

function roadBend(rng, map, a, b) {
  const bend = rng.range(-C.MAP_ROAD_BEND, C.MAP_ROAD_BEND);
  for (const k of [1, -1, 0.5, -0.5, 0]) if (curveClear(map, a, b, bend * k)) return bend * k;
  return null;
}

// ---------------------------------------------------------------------------
// Whole-map checks (§2.3)
// ---------------------------------------------------------------------------
const startOf = (map) => map.rows[0];
const endsOf = (map) => map.rows[map.rows.length - 1];
const byIdOf = (map) => Object.fromEntries(map.nodes.map((n) => [n.id, n]));

// Ids reachable from `from` following roads, never entering `avoid`.
function reachableFrom(map, fromIds, avoid = null) {
  const byId = byIdOf(map);
  const seen = new Set();
  const queue = fromIds.filter((id) => id !== avoid);
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of byId[id].next) if (next !== avoid) queue.push(next);
  }
  return seen;
}

// Full paths from the start row to the end row (each node's count from the top down).
function pathCount(map) {
  const count = {};
  for (let r = map.rows.length - 1; r >= 0; r--) {
    for (const n of map.rows[r]) count[n.id] = r === map.rows.length - 1 ? 1 : n.next.reduce((s, id) => s + count[id], 0);
  }
  return startOf(map).reduce((s, n) => s + count[n.id], 0);
}

const CHECK_FNS = {
  // 1. Every node reachable from the start, and every node leads to the end.
  reachable(map) {
    const fromStart = reachableFrom(map, startOf(map).map((n) => n.id));
    if (map.nodes.some((n) => !fromStart.has(n.id))) return false;
    const ends = new Set(endsOf(map).map((n) => n.id));
    return map.nodes.every((n) => [...reachableFrom(map, [n.id])].some((id) => ends.has(id)));
  },
  // 2. Each Fell Wilds node has a start-to-end path around it.
  fellAvoidable(map) {
    return map.nodes.filter((n) => n.type === 'fell').every((f) => {
      const seen = reachableFrom(map, startOf(map).map((n) => n.id), f.id);
      return endsOf(map).some((n) => seen.has(n.id));
    });
  },
  // 3. At least 2 nodes with exactly one road up; at least 1 with three where a row above has
  // three nodes; not every node with the same number.
  variety(map) {
    const ups = map.rows.slice(0, -1).flat().map((n) => n.next.length);
    if (ups.filter((d) => d === 1).length < 2) return false;
    if (map.rows.slice(1).some((row) => row.length >= 3) && !ups.includes(3)) return false;
    return new Set(ups).size > 1;
  },
  // 4. At least 3 distinct full paths.
  choice(map) {
    return pathCount(map) >= 3;
  },
  // §2.4: every road has a curve clear of other nodes and labels.
  roadsClear(map) {
    return map.roads.every((r) => r.bend !== null);
  },
};

// Debug overlay (§4): each node's in and out degree.
export function nodeDegrees(map) {
  const inDeg = Object.fromEntries(map.nodes.map((n) => [n.id, 0]));
  for (const r of map.roads) inDeg[r.to]++;
  return Object.fromEntries(map.nodes.map((n) => [n.id, { in: inDeg[n.id], out: n.next.length }]));
}

export function pathTotal(map) {
  return pathCount(map);
}
