// Static encounter scene built once from config: lane paths, decorative forest,
// layout checks and the layout stats shown in the debug panel (spec §5, §12, §18.3).

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
  const scene = { lanes, decor: null, groundPatches: null };
  scatterDecor(scene);
  return scene;
}

// Nearest distance from p to any corridor centreline.
function corridorDistance(lanes, p) {
  let best = Infinity;
  for (const lane of lanes) best = Math.min(best, lane.path.distanceTo(p));
  return best;
}

// ---------------------------------------------------------------------------
// Start-up layout checks: warnings only, never block the game.
// ---------------------------------------------------------------------------
export function validateLayout(scene) {
  const half = C.CORRIDOR_WIDTH / 2;
  const check = (label, p, radius) => {
    for (const lane of scene.lanes) {
      const d = lane.path.distanceTo(p);
      if (d < half + radius) {
        console.warn(`${label} at (${p.x}, ${p.y}) overlaps the ${lane.name} corridor ` +
          `(${Math.round(d)} px from centreline, needs ≥ ${half + radius})`);
      }
    }
    if (p.y - radius < C.HUD_STRIP_HEIGHT) {
      console.warn(`${label} at (${p.x}, ${p.y}) sits under the HUD strip`);
    }
  };

  C.TURRET_SLOTS.forEach((s, i) => check(`Turret slot ${i}`, s, C.TURRET_SLOT_RADIUS));
  C.FEATURES.forEach((f, i) => check(`Feature ${i} (${f.type})`, f, C.FEATURE_RADIUS));

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
// Decorative forest: deterministic jittered-grid scatter (visual only).
// ---------------------------------------------------------------------------
function scatterDecor(scene) {
  const D = C.DECOR;
  const rng = createRng(D.seed);
  const half = C.CORRIDOR_WIDTH / 2;
  const top = C.HUD_STRIP_HEIGHT;
  const blockers = [
    ...C.TURRET_SLOTS.map((p) => ({ x: p.x, y: p.y, r: C.TURRET_SLOT_RADIUS + D.objectGap })),
    ...C.FEATURES.map((p) => ({ x: p.x, y: p.y, r: C.FEATURE_RADIUS + D.objectGap })),
    { x: C.DRUID_POS.x, y: C.DRUID_POS.y, r: D.clearingRadius },
  ];
  const blocked = (p) => blockers.some((b) => Math.hypot(p.x - b.x, p.y - b.y) < b.r);

  const decor = [];
  for (let gy = top; gy < C.STAGE_HEIGHT + D.cellSize; gy += D.cellSize) {
    for (let gx = -D.cellSize / 2; gx < C.STAGE_WIDTH + D.cellSize / 2; gx += D.cellSize) {
      const p = { x: gx + rng.range(0, D.cellSize), y: gy + rng.range(0, D.cellSize) };
      const roll = rng.next();
      const size = rng.range(0.8, 1.25);
      const variant = rng.int(0, 2);
      if (blocked(p)) continue;

      const corridorGap = corridorDistance(scene.lanes, p) - half;
      const edge = Math.min(p.x, C.STAGE_WIDTH - p.x, p.y - top, C.STAGE_HEIGHT - p.y);
      const treeChance = edge < D.edgeBand ? 1 : D.treeChance;

      let kind = null;
      if (roll < treeChance) kind = corridorGap > D.treeCorridorGap ? 'tree' : 'bush';
      else if (roll < treeChance + D.bushChance) kind = 'bush';
      else if (roll < treeChance + D.bushChance + D.rockChance) kind = 'rock';
      if (!kind || corridorGap < D.smallCorridorGap) continue;
      // Trees need canopy room below the HUD strip.
      if (kind === 'tree' && p.y < top + 60) kind = 'bush';

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
