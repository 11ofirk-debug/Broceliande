// Static encounter scenes, one per level (M2a §5): lane paths, candidate locations, decorative
// forest, the level's start-up checks and the layout stats shown in the debug panel (spec §5,
// §12, §18.3; M1c §2, §5; M1j). Nothing here depends on the run seed, so a level's scene is
// identical in every run. Scenes are built once per level and cached.

import * as C from './config.js';
import { createLanePath } from './lanePath.js';
import { createRng } from './rng.js';
import { emptyResources } from './resources.js';
import { zoneIds, geometricZone, zoneQuota, zoneCandidates, quotaTotals } from './zones.js';
import { corridorWidth, featureMix } from './levelSettings.js';
import { fitsCorridor } from './entities/enemy.js';

export const LEVEL_IDS = Object.keys(C.LEVELS);

// scene: { levelId, level (its LEVELS entry), lanes, candidates, decor, flats, groundPatches }.
export function createScene(levelId) {
  const level = C.LEVELS[levelId];
  const lanes = level.lanes.map((lane) => ({
    id: lane.id,
    name: lane.name,
    waypoints: lane.waypoints,
    corridorWidth: corridorWidth(level), // the level's width (M2b §2): enemies and drops stay inside it
    path: createLanePath(lane.waypoints),
  }));
  // Lanes each candidate could cover as a turret slot (M1c §4.1): some centreline point
  // within the base TURRET_RANGE.
  const candidates = level.candidateLocations.map((c, index) => ({
    index,
    x: c.x,
    y: c.y,
    lanes: lanes.filter((lane) => lane.path.distanceTo(c) <= C.TURRET_RANGE).map((lane) => lane.id),
  }));
  const scene = { levelId, level, lanes, candidates, decor: null, flats: null, groundPatches: null };
  scatterDecor(scene);
  return scene;
}

const scenes = {};

// The level's scene, built on first use.
export function sceneFor(levelId) {
  scenes[levelId] ??= createScene(levelId);
  return scenes[levelId];
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
// Start-up checks, per level: warnings only (errors for broken data), never block the game.
// ---------------------------------------------------------------------------

// Candidate rules (M1c §2). Returns a list of { index, problem } for the debug panel too.
export function candidateProblems(scene) {
  const problems = [];
  const clearance = corridorWidth(scene.level) / 2 + OCCUPIED_RADIUS;
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

// Zone labels (M1j §2.2, §2.3): an unknown label is an error; a label that differs from the
// geometry is only info (the designer may have moved it on purpose); a zone with fewer
// candidates than its turret + feature quota is an error.
function validateZones(scene) {
  const { level, levelId } = scene;
  const ids = zoneIds(level);
  level.candidateLocations.forEach((c, i) => {
    if (!ids.includes(c.zone)) {
      console.error(`${levelId}: candidate ${i} at (${c.x}, ${c.y}) has zone "${c.zone}", expected one of ${ids.join(', ')}`);
      return;
    }
    const geo = geometricZone(level, c);
    if (geo !== c.zone) console.info(`${levelId}: candidate ${i} labelled ${c.zone}, geometrically ${geo} (manual override)`);
  });
  for (const zone of ids) {
    const q = zoneQuota(level, zone);
    const n = zoneCandidates(level, zone).length;
    if (n < q.turret + q.feature) {
      console.error(`${levelId}: zone ${zone} has ${n} candidates, fewer than its quota of ${q.turret} turret + ${q.feature} feature`);
    }
  }
  // M1j §5: one feature type per resource spot.
  // M2b §2: the level's own mix (or the default), checked against its own quotas.
  const mixTable = featureMix(level);
  const mix = Object.values(mixTable).reduce((a, b) => a + b, 0);
  const spots = quotaTotals(level).feature;
  if (mix !== spots) console.error(`${levelId}: feature mix has ${mix} features, but the zone quotas give ${spots} resource spots`);
  for (const type of Object.keys(mixTable)) {
    if (!C.FEATURE_TYPES[type]) console.error(`${levelId}: feature mix has unknown feature type "${type}"`);
  }
}

// Wave totals (§14, M1e §3.6): per enemy type, the bursts must add up to the level's enemyCounts.
function validateWave(scene) {
  const { level, levelId } = scene;
  const totals = Object.fromEntries(Object.keys(C.ENEMY_TYPES).map((type) => [type, 0]));
  for (const lane of level.lanes) {
    const bursts = level.wave[lane.id];
    if (!bursts) {
      console.error(`${levelId}: wave has no bursts for lane "${lane.id}"`);
      continue;
    }
    for (const burst of bursts) {
      const type = burst.type ?? 'wolf';
      if (!(type in totals)) console.error(`${levelId}: wave burst on lane "${lane.id}" has unknown type "${type}"`);
      else totals[type] += burst.count;
    }
  }
  // Mini-bosses (M2c §3) count in the totals; each needs a known type and lane, and an Ogre
  // corridors wide enough for it (§2.4).
  for (const boss of level.bosses ?? []) {
    if (!(boss.type in totals)) {
      console.error(`${levelId}: boss has unknown type "${boss.type}"`);
      continue;
    }
    totals[boss.type]++;
    if (boss.lane !== 'random' && !level.lanes.some((l) => l.id === boss.lane)) {
      console.error(`${levelId}: boss ${boss.type} has unknown lane "${boss.lane}" (a lane id or 'random')`);
    }
    if (!fitsCorridor(boss.type, corridorWidth(level))) {
      console.error(`${levelId}: corridors are ${corridorWidth(level)} px, too narrow for its ${C.ENEMY_TYPES[boss.type].name} (needs ${2 * C.ENEMY_TYPES[boss.type].radius + 2})`);
    }
  }
  for (const [type, n] of Object.entries(totals)) {
    if ((level.enemyCounts[type] ?? 0) !== n) {
      console.error(`${levelId}: wave and bosses have ${n} ${C.ENEMY_TYPES[type].plural}, expected ${level.enemyCounts[type] ?? 0} (enemyCounts)`);
    }
  }
}

// Every per-scene check for one level (M2a §5.1).
export function validateLevel(scene) {
  const { levelId, level } = scene;
  validateZones(scene);
  validateWave(scene);
  for (const { index, problem } of candidateProblems(scene)) {
    const c = scene.candidates[index];
    console.warn(`${levelId}: candidate ${index} at (${c.x}, ${c.y}): ${problem}`);
  }

  for (const lane of scene.lanes) {
    const { factor } = laneStats(scene, lane);
    if (Math.abs(factor - C.LANE_LENGTH_FACTOR) > C.LANE_LENGTH_FACTOR * C.LANE_LENGTH_TOLERANCE) {
      console.warn(`${levelId}: ${lane.name} lane is ${factor.toFixed(2)}× its straight-line distance; target is LANE_LENGTH_FACTOR = ${C.LANE_LENGTH_FACTOR}`);
    }
  }

  for (const lane of scene.lanes) {
    const end = lane.waypoints[lane.waypoints.length - 1];
    const r = Math.hypot(end.x - level.druidPos.x, end.y - level.druidPos.y);
    if (Math.abs(r - C.DRUID_MELEE_RADIUS) > 2) {
      console.warn(`${levelId}: ${lane.name} lane ends ${Math.round(r)} px from the Druid, expected DRUID_MELEE_RADIUS = ${C.DRUID_MELEE_RADIUS}`);
    }
  }
}

// Start-up: every level's checks (M2a §5.1).
export function validateLevels() {
  for (const id of LEVEL_IDS) validateLevel(sceneFor(id));
}

// ---------------------------------------------------------------------------
// Debug-panel stats
// ---------------------------------------------------------------------------
export function laneStats(scene, lane) {
  const spawn = lane.waypoints[0];
  const d = scene.level.druidPos;
  const straight = Math.hypot(d.x - spawn.x, d.y - spawn.y);
  return {
    length: lane.path.length,
    factor: lane.path.length / straight,
    travelTime: lane.path.length / C.ENEMY_TYPES.wolf.speed,
  };
}

// Average yield of searching every feature of a level's mix once, plus the total search time.
export function expectedResources(level) {
  const totals = { ...emptyResources(), searchTime: 0 }; // every resource, Boughs included (M1i §1.3)
  // One of each feature in the mix (M1j §5): every resource spot of a run, searched once.
  for (const [typeKey, n] of Object.entries(featureMix(level))) {
    const type = C.FEATURE_TYPES[typeKey];
    for (let i = 0; i < n; i++) {
      for (const [res, [min, max]] of Object.entries(type.yields)) totals[res] += (min + max) / 2;
      totals.searchTime += type.searchTime;
    }
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Decorative forest: deterministic jittered-grid scatter (visual only, M1c §5), seeded with the
// level's decorSeed; the level's decorDensity scales the tree / bush / rock chances. Themed
// decoration (M2b §3) is placed first, from its own stream (decorSeed + 1) so the forest's rolls
// are unchanged: flat patches (water, mist), fixed landmarks (the burial mound), a stone ring
// round the Druid, and the props in water patches. The forest then keeps off their ground.
// ---------------------------------------------------------------------------

// Whether a circle (centre, radius r) stays clear of corridors and of every candidate
// (footprint + jitter + margin).
function circleFits(scene, centre, r) {
  if (corridorDistance(scene.lanes, centre) - corridorWidth(scene.level) / 2 < r + C.DECOR.corridorGap) return false;
  const keepOut = OCCUPIED_RADIUS + C.DECOR_MARGIN + r;
  return scene.candidates.every((c) => Math.hypot(centre.x - c.x, centre.y - c.y) >= keepOut);
}

// Whether a decor object of this kind and size, based at p, stays clear of corridors and of
// every candidate. Tested on its drawn extent, not its base.
function decorFits(scene, kind, p, size) {
  const e = C.DECOR.extent[kind];
  return circleFits(scene, { x: p.x, y: p.y - e.lift * size }, e.r * size);
}

// The same for an ellipse rotated by rot, tested at its middle and at points round its edge.
function ellipseFits(scene, x, y, rx, ry, rot) {
  if (!circleFits(scene, { x, y }, Math.min(rx, ry))) return false;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const ex = Math.cos(a) * rx;
    const ey = Math.sin(a) * ry;
    const p = { x: x + ex * Math.cos(rot) - ey * Math.sin(rot), y: y + ex * Math.sin(rot) + ey * Math.cos(rot) };
    if (!circleFits(scene, p, 4)) return false;
  }
  return true;
}

// Themed decoration (M2b §3). Returns { flats, items, blocked }; blocked: circles the forest
// keeps out of.
function themedDecor(scene) {
  const { level } = scene;
  const rng = createRng(level.decorSeed + 1);
  const flats = [];
  const items = [];
  const blocked = [];

  // Fixed landmarks (the burial mound): size = half-width; tested as an ellipse over the hill.
  for (const lm of level.landmarks ?? []) {
    const h = lm.size * 0.45;
    if (!ellipseFits(scene, lm.x, lm.y - h * 0.5, lm.size, h * 0.6, 0)) {
      console.warn(`${scene.levelId}: landmark ${lm.kind} at (${lm.x}, ${lm.y}) overlaps a corridor or candidate; left out`);
      continue;
    }
    items.push({ kind: lm.kind, x: lm.x, y: lm.y, size: lm.size, variant: 0 });
    blocked.push({ x: lm.x, y: lm.y - h * 0.5, r: lm.size });
  }

  // Standing stones (or another kind, e.g. the Heartwood's roots) in a ring round the Druid: one per
  // evenly spaced angle, at the first radius
  // in [min, max] (10 px steps) where it clears corridors, candidates and the stones before it;
  // left out where there is none.
  if (level.stoneRing) {
    const { radius: [rMin, rMax], count, size, kind = 'standingStone' } = level.stoneRing;
    const d = level.druidPos;
    const e = C.DECOR.extent[kind];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rng.range(-0.08, 0.08);
      const variant = rng.int(0, 2);
      for (let r = rMin; r <= rMax; r += 10) {
        const p = { x: d.x + Math.cos(a) * r, y: d.y + Math.sin(a) * r };
        const c = { x: p.x, y: p.y - e.lift * size };
        if (!decorFits(scene, kind, p, size)) continue;
        if (blocked.some((b) => Math.hypot(b.x - c.x, b.y - c.y) < b.r + e.r * size)) continue;
        items.push({ kind, x: p.x, y: p.y, size, variant, angle: a }); // angle: which way a root points
        blocked.push({ x: c.x, y: c.y, r: e.r * size });
        break;
      }
    }
  }

  // Low mist: a faint ground tint that may lie anywhere (over corridors too); it never blocks
  // other decoration.
  if (level.flats?.kind === 'mist') {
    const F = level.flats;
    for (let i = 0; i < F.count; i++) {
      const rx = rng.range(F.rx[0], F.rx[1]);
      flats.push({ kind: 'mist', x: rng.range(0, C.STAGE_WIDTH), y: rng.range(C.HUD_STRIP_HEIGHT + 40, C.STAGE_HEIGHT), rx, ry: rng.range(F.ry[0], F.ry[1]), rot: 0 });
    }
  }

  // Water patches, each with a sunken roof or broken fence in it and reeds round its edge: placed
  // at random until `count` fit, clear of corridors, candidates, each other and the above.
  if (level.flats?.kind === 'water') {
    const F = level.flats;
    for (let tries = 0; tries < F.count * 40 && flats.length < F.count; tries++) {
      const rx = rng.range(F.rx[0], F.rx[1]);
      const ry = rng.range(F.ry[0], F.ry[1]);
      const rot = rng.range(-0.3, 0.3);
      const x = rng.range(rx, C.STAGE_WIDTH - rx);
      const y = rng.range(C.HUD_STRIP_HEIGHT + ry + 20, C.STAGE_HEIGHT - ry);
      const variant = rng.int(0, 2);
      if (!ellipseFits(scene, x, y, rx + F.edge, ry + F.edge, rot)) continue;
      if (blocked.some((b) => Math.hypot(b.x - x, b.y - y) < b.r + rx)) continue;
      flats.push({ kind: F.kind, x, y, rx, ry, rot });
      blocked.push({ x, y, r: rx });
      const s = Math.min(1, rx / 70);
      // The water's prop: flats.props cycles through its own list (M2f: sunken causeway stones), else
      // a sunken roof or broken fence, alternating.
      const kinds = F.props ?? ['brokenFence', 'sunkenRoof'];
      items.push({ kind: kinds[flats.length % kinds.length], x: x + rx * 0.1, y: y + ry * 0.3, size: s, variant });
      for (const t of [0.1, 0.42, 0.62, 0.85]) {
        const a = t * Math.PI * 2;
        items.push({ kind: 'reeds', x: x + Math.cos(a) * rx * 0.92, y: y + Math.sin(a) * ry * 0.92 + 4, size: 0.9, variant });
      }
    }
  }
  return { flats, items, blocked };
}

function scatterDecor(scene) {
  const D = C.DECOR;
  const { level } = scene;
  const themed = themedDecor(scene);
  const rng = createRng(level.decorSeed);
  const top = C.HUD_STRIP_HEIGHT;
  const home = level.druidPos;
  const inClearing = (p) => Math.hypot(p.x - home.x, p.y - home.y) < D.clearingRadius;
  const density = level.decorDensity;
  // Themed props (decorProps: kind → chance per cell, × decorDensity), taken from the same roll
  // after trees, bushes and rocks, so levels without them are unchanged.
  const props = Object.entries(level.decorProps ?? {});
  const onThemed = (kind, p, size) => {
    const e = D.extent[kind];
    const c = { x: p.x, y: p.y - e.lift * size };
    return themed.blocked.some((b) => Math.hypot(b.x - c.x, b.y - c.y) < b.r + e.r * size);
  };

  const decor = [...themed.items];
  for (let gy = top; gy < C.STAGE_HEIGHT + D.cellSize; gy += D.cellSize) {
    for (let gx = -D.cellSize / 2; gx < C.STAGE_WIDTH + D.cellSize / 2; gx += D.cellSize) {
      // Draw every random value up front so each cell's rolls never depend on the checks below.
      const p = { x: gx + rng.range(0, D.cellSize), y: gy + rng.range(0, D.cellSize) };
      const roll = rng.next();
      const size = rng.range(0.8, 1.25);
      const variant = rng.int(0, 2);
      if (inClearing(p)) continue;

      const edge = Math.min(p.x, C.STAGE_WIDTH - p.x, p.y - top, C.STAGE_HEIGHT - p.y);
      const treeChance = edge < D.edgeBand ? 1 : D.treeChance * density;
      const bushChance = D.bushChance * density;
      const rockChance = D.rockChance * density;

      let kind = null;
      if (roll < treeChance) kind = 'tree';
      else if (roll < treeChance + bushChance) kind = 'bush';
      else if (roll < treeChance + bushChance + rockChance) kind = 'rock';
      else {
        let sum = treeChance + bushChance + rockChance;
        for (const [k, chance] of props) {
          sum += chance * density;
          if (roll < sum) {
            kind = k;
            break;
          }
        }
      }
      if (!kind) continue;
      // Trees need canopy room below the HUD strip.
      if (kind === 'tree' && p.y < top + 60) kind = 'bush';
      // A tree with no room becomes a bush if that fits.
      if (kind === 'tree' && (!decorFits(scene, kind, p, size) || onThemed(kind, p, size))) kind = 'bush';
      if (!decorFits(scene, kind, p, size) || onThemed(kind, p, size)) continue;

      decor.push({ kind, x: p.x, y: p.y, size, variant });
    }
  }
  scene.decor = decor;
  scene.flats = themed.flats;

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
