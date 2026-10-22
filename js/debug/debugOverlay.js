// Canvas debug overlay (spec §18.2). Visual only — must not affect gameplay.
// Lanes (waypoints, centrelines, corridor edges, spawns), Druid position and melee slots,
// all candidate locations (footprint, jitter, role, covered lanes), wolf collision radii and IDs, turret IDs and target
// lines, Vulture IDs, block radii and target lines, pebble IDs. All turret ranges are drawn by the renderer in debug mode.

import * as C from '../config.js';
import { GameState } from '../states.js';
import { isStepMode, isVisitTarget, stepCost } from '../systems/stepSystem.js';
import { candidateProblems } from '../scene.js';
import { turretMuzzle } from '../entities/turret.js';

const COLOR = 'rgba(120, 220, 255, 0.9)';
const EDGE_COLOR = 'rgba(120, 220, 255, 0.45)';
const SPAWN_COLOR = 'rgba(255, 110, 110, 0.95)';
const WOLF_COLOR = 'rgba(255, 150, 90, 0.95)';
const TARGET_COLOR = 'rgba(255, 235, 120, 0.9)';
const VULTURE_COLOR = 'rgba(255, 140, 220, 0.9)';
const LABEL_BG = 'rgba(0, 0, 0, 0.55)';
const STATE_TAGS = { WALKING: 'walk', WAITING: 'wait', APPROACHING: 'appr', BITING: 'bite' };

function label(ctx, text, x, y, color = COLOR) {
  const w = ctx.measureText(text).width;
  ctx.fillStyle = LABEL_BG;
  ctx.fillRect(x - 2, y - 13, w + 4, 17);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// Step-mode Prep (M1b §4): current travel cost under each valid marker; red when unaffordable.
function stepCostLabel(ctx, game, marker, x, y) {
  if (!isStepMode(game) || game.state !== GameState.PREP || !isVisitTarget(game, marker)) return;
  const cost = stepCost(game, marker);
  label(ctx, `${cost} steps`, x, y, cost <= game.stepsRemaining ? TARGET_COLOR : SPAWN_COLOR);
}

function cross(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
}

export function drawDebugOverlay(ctx, game, scene) {
  ctx.save();
  ctx.strokeStyle = COLOR;
  ctx.fillStyle = COLOR;
  ctx.lineWidth = 1.5;
  ctx.font = '13px monospace';

  for (const lane of scene.lanes) drawLane(ctx, lane);
  drawDruid(ctx, game);

  drawCandidates(ctx, game, scene);

  drawWolves(ctx, game);
  drawTurretTargets(ctx, game);
  drawVultureTargets(ctx, game);
  ctx.font = '11px monospace';
  ctx.fillStyle = TARGET_COLOR;
  for (const p of game.projectiles) ctx.fillText(`#${p.id}`, p.x + 7, p.y - 6);
  ctx.font = '13px monospace';

  ctx.restore();
}

// Label for this run's role of a candidate (M1c §6.2): T<slot>, F:<type> or V.
function roleTag(game, role) {
  if (role.kind === 'slot') return `T${role.index}`;
  if (role.kind === 'feature') return `F:${C.FEATURE_TYPES[game.features[role.index].type].name}`;
  return 'V';
}

// All 25 candidates (M1c §6.2): footprint and footprint + jitter circles around the
// candidate, a line to this run's jittered position, index and role, and covered lanes for
// turret slots (measured from the jittered position). Candidates failing start-up
// validation are drawn red.
function drawCandidates(ctx, game, scene) {
  const failing = new Set(candidateProblems(scene).map((p) => p.index));
  const laneNames = Object.fromEntries(scene.lanes.map((l) => [l.id, l.name]));
  for (const c of scene.candidates) {
    const role = game.layout.roles[c.index];
    const placed = role.kind === 'slot' ? game.slots[role.index] : role.kind === 'feature' ? game.features[role.index] : null;
    const color = failing.has(c.index) ? SPAWN_COLOR : COLOR;
    if (placed) {
      ctx.strokeStyle = TARGET_COLOR;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(placed.x, placed.y);
      ctx.stroke();
      ctx.fillStyle = TARGET_COLOR;
      ctx.beginPath();
      ctx.arc(placed.x, placed.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, C.LOCATION_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.arc(c.x, c.y, C.LOCATION_RADIUS + C.LOCATION_JITTER, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    cross(ctx, c.x, c.y, 5);

    const x = c.x - C.LOCATION_RADIUS;
    let y = c.y + C.LOCATION_RADIUS + C.LOCATION_JITTER + 14;
    label(ctx, `#${c.index} ${roleTag(game, role)} (${c.x}, ${c.y})`, x, y, color);
    if (role.kind === 'slot') {
      y += 17;
      label(ctx, `covers ${placed.lanes.map((id) => laneNames[id]).join(', ') || 'none'}`, x, y, color);
    }
    if (role.kind !== 'vacant') stepCostLabel(ctx, game, { kind: role.kind, index: role.index }, x, y + 17);
  }
}

function drawLane(ctx, lane) {
  const { path } = lane;
  const half = C.CORRIDOR_WIDTH / 2;

  // Sampled centreline.
  ctx.strokeStyle = COLOR;
  ctx.beginPath();
  path.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  // Corridor boundaries: centreline offset along the normal.
  ctx.strokeStyle = EDGE_COLOR;
  ctx.setLineDash([6, 6]);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    path.points.forEach((p, i) => {
      const n = path.normalAt(Math.min(p.s, path.length - 0.01));
      const x = p.x + n.x * half * side;
      const y = p.y + n.y * half * side;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Waypoints with index.
  ctx.fillStyle = COLOR;
  lane.waypoints.forEach((w, i) => {
    ctx.beginPath();
    ctx.arc(w.x, w.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(String(i), w.x + 6, w.y - 6);
  });

  // Spawn point (first waypoint, just off-screen), marker clamped onto the screen.
  const spawn = lane.waypoints[0];
  const sx = Math.max(12, Math.min(C.STAGE_WIDTH - 12, spawn.x));
  const sy = Math.max(C.HUD_STRIP_HEIGHT + 12, Math.min(C.STAGE_HEIGHT - 12, spawn.y));
  ctx.strokeStyle = SPAWN_COLOR;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx, sy, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  const text = `SPAWN ${lane.name} (${spawn.x}, ${spawn.y})`;
  const tx = Math.min(sx + 14, C.STAGE_WIDTH - ctx.measureText(text).width - 8);
  const ty = sy > C.STAGE_HEIGHT - 30 ? sy - 16 : sy + 4;
  label(ctx, text, tx, ty);
}

// Turret IDs and a line from each turret to its current target (§18.2).
function drawTurretTargets(ctx, game) {
  ctx.lineWidth = 1.5;
  for (const t of game.turrets) {
    const target = game.wolves.find((w) => w.id === t.targetId);
    const muzzle = turretMuzzle(t);
    if (target) {
      ctx.strokeStyle = TARGET_COLOR;
      ctx.beginPath();
      ctx.moveTo(muzzle.x, muzzle.y);
      ctx.lineTo(target.x, target.y - C.WOLF_HIT_HEIGHT);
      ctx.stroke();
    }
    label(ctx, `T#${t.id}${t.upgraded ? ' +' : ''}`, t.x - 16, muzzle.y - 20);
  }
}

// Vulture IDs and state, block radius, and a line to the current target (§18.2).
function drawVultureTargets(ctx, game) {
  ctx.lineWidth = 1.5;
  for (const v of game.vultures) {
    const target = game.wolves.find((w) => w.id === v.targetId);
    if (target) {
      ctx.strokeStyle = VULTURE_COLOR;
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
    ctx.strokeStyle = VULTURE_COLOR;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(v.x, v.y, C.VULTURE_BLOCK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, `V#${v.id} ${v.state.toLowerCase()} ${v.remaining.toFixed(1)}s`, v.x + 18, v.y + 4);
  }
}

function drawWolves(ctx, game) {
  ctx.lineWidth = 1.5;
  for (const w of game.wolves) {
    ctx.strokeStyle = WOLF_COLOR;
    ctx.beginPath();
    ctx.arc(w.x, w.y, C.WOLF_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    label(ctx, `#${w.id} ${w.blockedBy !== null ? 'blocked' : STATE_TAGS[w.state]}`, w.x - 14, w.y + C.WOLF_RADIUS + 14);
  }
}

function drawDruid(ctx, game) {
  const d = C.DRUID_POS;
  ctx.strokeStyle = COLOR;
  cross(ctx, d.x, d.y, 8);
  label(ctx, `Druid (${d.x}, ${d.y})`, d.x + 12, d.y - 12);

  // Melee ring and slots
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(d.x, d.y, C.DRUID_MELEE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Approach ring wolves walk round to reach far slots.
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  ctx.arc(d.x, d.y, C.DRUID_APPROACH_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Slots: filled orange when claimed by a wolf.
  for (const slot of game.meleeSlots) {
    ctx.fillStyle = slot.wolfId === null ? COLOR : WOLF_COLOR;
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
