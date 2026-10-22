// Static encounter scene built once from config: lane paths, candidate locations, decorative
// forest, layout checks and the layout stats shown in the debug panel (spec §5, §12, §18.3;
// M1c §2, §5). Nothing here depends on the run seed, so it is identical in every run.

import * as C from './config.js';
import { createLanePath } from './lanePath.js';
import { createRng } from './rng.js';

export function createScene() {
  const lanes = C.LANES.map((lane) => ({
    id: lane.id,
    name: lane.name,
    waypoints: lane.waypoints,
    path: createLanePath(lane.waypoints),
  }));
  // Lanes each candidate could cover as a turret slot (M1c §4.1): some centreline point
  // within the base TURRET_RANGE.
  const candidates = C.CANDIDATE_LOCATIONS.map((c, index) => ({
    index,
    x: c.x,
    y: c.y,
    lanes: lanes.filter((lane) => lane.path.distanceTo(c) <= C.TURRET_RANGE).map((lane) => lane.id),
  }));
  const scene = { lanes, candidates, decor: null, groundPatches: null };
  scatterDecor(scene);
  return scene;
}

// Nearest distance from p to any corridor centreline.
function corridorDistance(lanes, p) {
  let best = Infinity;
  for (const lane of lanes) best = Math.min(best, lane.path.distanceTo(p));
  return best;
}

// Radius around a candidate that can be occupied by its object once jittered.
const OCCUPIED_RADIUS = C.LOCATION_RADIUS + C.LOCATION_JITTER;

// ---------------------------------------------------------------------------
// Start-up layout checks: warnings only, never block the game.
// ---------------------------------------------------------------------------

// Candidate rules (M1c §2). Returns a list of { index, problem } for the debug panel too.
export function candidateProblems(scene) {
  const problems = [];
  const clearance = C.CORRIDOR_WIDTH / 2 + OCCUPIED_RADIUS;
  const spacing = 2 * OCCUPIED_RADIUS + C.LOCATION_GAP;
  for (const c of scene.candidates) {
    const add = (problem) => problems.push({ index: c.index, problem });
    if (c.lanes.length === 0) add(`no lane centreline within TURRET_RANGE (${C.TURRET_RANGE} px)`);
    const d = corridorDistance(scene.lanes, c);
    if (d < clearance) add(`${Math.round(d)} px from a corridor centreline, needs ≥ ${clearance} (short by ${Math.ceil(clearance - d)})`);
    if (c.x - OCCUPIED_RADIUS < 0 || c.x + OCCUPIED_RADIUS > C.STAGE_WIDTH
      || c.y - OCCUPIED_RADIUS < C.HUD_STRIP_HEIGHT || c.y + OCCUPIED_RADIUS > C.STAGE_HEIGHT) {
      add(`footprint + jitter leaves the screen or reaches the HUD strip`);
    }
    for (const o of scene.candidates) {
      if (o.index <= c.index) continue;
      const gap = Math.hypot(o.x - c.x, o.y - c.y);
      if (gap < spacing) add(`${Math.round(gap)} px from candidate ${o.index}, needs ≥ ${spacing}`);
    }
  }
  return problems;
}

export function validateLayout(scene) {
  if (C.CANDIDATE_LOCATIONS.length !== 25) {
    console.warn(`CANDIDATE_LOCATIONS has ${C.CANDIDATE_LOCATIONS.length} entries, expected 25 (M1c §2)`);
  }
  for (const { index, problem } of candidateProblems(scene)) {
    const c = scene.candidates[index];
    console.warn(`Candidate ${index} at (${c.x}, ${c.y}): ${problem}`);
  }

  for (const lane of scene.lanes) {
    const { factor } = laneStats(lane);
    if (Math.abs(factor - C.LANE_LENGTH_FACTOR) > C.LANE_LENGTH_FACTOR * C.LANE_LENGTH_TOLERANCE) {
      console.warn(`${lane.name} lane is ${factor.toFixed(2)}× its straight-line distance; target is LANE_LENGTH_FACTOR = ${C.LANE_LENGTH_FACTOR}`);
    }
  }

  for (const lane of scene.lanes) {
    const end = lane.waypoints[lane.waypoints.length - 1];
    const r = Math.hypot(end.x - C.DRUID_POS.x, end.y - C.DRUID_POS.y);
    if (Math.abs(r - C.DRUID_MELEE_RADIUS) > 2) {
      console.warn(`${lane.name} lane ends ${Math.round(r)} px from the Druid, expected DRUID_MELEE_RADIUS = ${C.DRUID_MELEE_RADIUS}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Debug-panel stats
// ---------------------------------------------------------------------------
export function laneStats(lane) {
  const spawn = lane.waypoints[0];
  const straight = Math.hypot(C.DRUID_POS.x - spawn.x, C.DRUID_POS.y - spawn.y);
  return {
    length: lane.path.length,
    factor: lane.path.length / straight,
    travelTime: lane.path.length / C.WOLF_SPEED,
  };
}

// Average yield of searching every feature once, plus the total search time.
export function expectedResources() {
  const totals = { pits: 0, reeds: 0, feathers: 0, searchTime: 0 };
  for (const f of C.FEATURES) {
    const type = C.FEATURE_TYPES[f.type];
    for (const [res, [min, max]] of Object.entries(type.yields)) totals[res] += (min + max) / 2;
    totals.searchTime += type.searchTime;
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Decorative forest: deterministic jittered-grid scatter (visual only, M1c §5).
// ---------------------------------------------------------------------------

// Whether a decor object of this kind and size, based at p, stays clear of corridors and of
// every candidate (footprint + jitter + margin). Tested on its drawn extent, not its base.
function decorFits(scene, kind, p, size) {
  const D = C.DECOR;
  const e = D.extent[kind];
  const centre = { x: p.x, y: p.y - e.lift * size };
  const r = e.r * size;
  if (corridorDistance(scene.lanes, centre) - C.CORRIDOR_WIDTH / 2 < r + D.corridorGap) return false;
  const keepOut = OCCUPIED_RADIUS + C.DECOR_MARGIN + r;
  return scene.candidates.every((c) => Math.hypot(centre.x - c.x, centre.y - c.y) >= keepOut);
}

function scatterDecor(scene) {
  const D = C.DECOR;
  const rng = createRng(C.DECOR_SEED);
  const top = C.HUD_STRIP_HEIGHT;
  const inClearing = (p) => Math.hypot(p.x - C.DRUID_POS.x, p.y - C.DRUID_POS.y) < D.clearingRadius;

  const decor = [];
  for (let gy = top; gy < C.STAGE_HEIGHT + D.cellSize; gy += D.cellSize) {
    for (let gx = -D.cellSize / 2; gx < C.STAGE_WIDTH + D.cellSize / 2; gx += D.cellSize) {
      // Draw every random value up front so each cell's rolls never depend on the checks below.
      const p = { x: gx + rng.range(0, D.cellSize), y: gy + rng.range(0, D.cellSize) };
      const roll = rng.next();
      const size = rng.range(0.8, 1.25);
      const variant = rng.int(0, 2);
      if (inClearing(p)) continue;

      const edge = Math.min(p.x, C.STAGE_WIDTH - p.x, p.y - top, C.STAGE_HEIGHT - p.y);
      const treeChance = edge < D.edgeBand ? 1 : D.treeChance;

      let kind = null;
      if (roll < treeChance) kind = 'tree';
      else if (roll < treeChance + D.bushChance) kind = 'bush';
      else if (roll < treeChance + D.bushChance + D.rockChance) kind = 'rock';
      if (!kind) continue;
      // Trees need canopy room below the HUD strip.
      if (kind === 'tree' && p.y < top + 60) kind = 'bush';
      // A tree with no room becomes a bush if that fits.
      if (kind === 'tree' && !decorFits(scene, kind, p, size)) kind = 'bush';
      if (!decorFits(scene, kind, p, size)) continue;

      decor.push({ kind, x: p.x, y: p.y, size, variant });
    }
  }
  scene.decor = decor;

  scene.groundPatches = [];
  for (let i = 0; i < D.groundPatches; i++) {
    scene.groundPatches.push({
      x: rng.range(0, C.STAGE_WIDTH),
      y: rng.range(top, C.STAGE_HEIGHT),
      rx: rng.range(60, 180),
      ry: rng.range(30, 90),
      light: rng.next() < 0.5,
    });
  }
}
