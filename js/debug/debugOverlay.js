// Canvas debug overlay (spec §18.2). Visual only — must not affect gameplay.
// Lanes (waypoints, centrelines, corridor edges, spawns), Druid position and melee slots,
// all candidate locations (footprint, jitter, role, covered lanes), enemy collision radii, IDs and held melee slots, turret IDs and target
// lines, Vulture IDs, block radii and target lines, pebble IDs. All turret ranges are drawn by the renderer in debug mode.

import * as C from '../config.js';
import { GameState } from '../states.js';
import { isStepMode, isVisitTarget, stepCost } from '../systems/stepSystem.js';
import { candidateProblems } from '../scene.js';
import { turretMuzzle, turretRange, levelStats } from '../entities/turret.js';
import { doubleStandPos } from '../systems/doubleSystem.js';
import { geometricZone } from '../zones.js';
import { AttackState } from '../entities/enemy.js';

const COLOR = 'rgba(120, 220, 255, 0.9)';
const EDGE_COLOR = 'rgba(120, 220, 255, 0.45)';
const SPAWN_COLOR = 'rgba(255, 110, 110, 0.95)';
const ENEMY_COLOR = 'rgba(255, 150, 90, 0.95)';
const ITEM_COLOR = 'rgba(255, 215, 60, 1)'; // the hidden item's spot (M2e §6)
const UNSTICK_COLOR = 'rgba(255, 230, 40, 0.95)'; // enemies passing through a slower one (M2d §4)
const TARGET_COLOR = 'rgba(255, 235, 120, 0.9)';
const VULTURE_COLOR = 'rgba(255, 140, 220, 0.9)';
const SQUIRREL_COLOR = 'rgba(170, 255, 140, 0.95)';
const DOUBLE_COLOR = 'rgba(230, 190, 120, 0.95)'; // Bough Double jobs (M1i §4)
const STRIKE_COLOR = 'rgba(255, 120, 80, 0.95)'; // Squirrel counter-attack target (M1h §4)
const MELEE_COLOR = 'rgba(255, 255, 255, 0.95)';
const CLOUD_COLOR = 'rgba(210, 150, 255, 0.95)';
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

// revealItem: debug key I in battle (M2e §6) marks the spot holding the hidden item.
export function drawDebugOverlay(ctx, game, scene, revealItem = false) {
  ctx.save();
  ctx.strokeStyle = COLOR;
  ctx.fillStyle = COLOR;
  ctx.lineWidth = 1.5;
  ctx.font = '13px monospace';

  for (const lane of scene.lanes) drawLane(ctx, lane);
  drawDruid(ctx, game);

  drawZones(ctx, scene.level);
  drawCandidates(ctx, game, scene);

  drawEnemies(ctx, game);
  drawTurretTargets(ctx, game);
  drawCinderjawCones(ctx, game); // M2o §5
  drawVultureTargets(ctx, game);
  drawSquirrelTargets(ctx, game);
  drawCloudsAndPellets(ctx, game);
  drawDoubleJobs(ctx, game);
  if (revealItem) drawHiddenItem(ctx, game);
  ctx.font = '11px monospace';
  ctx.fillStyle = TARGET_COLOR;
  for (const p of game.projectiles) ctx.fillText(`#${p.id}`, p.x + 7, p.y - 6);
  ctx.font = '13px monospace';

  ctx.restore();
}

// Label for this run's role of a candidate (M1c §6.2): T<slot>, F:<type> or V.
// M1j §6: zone and this run's role, e.g. "fSW·T", "nE·F:Pond", "fNW·V". A zone label that
// overrides the candidate's geometric zone is marked with *.
function roleTag(game, role, index) {
  const level = game.scene.level;
  const c = level.candidateLocations[index];
  const zone = `${c.zone}${geometricZone(level, c) !== c.zone ? '*' : ''}`;
  if (role.kind === 'slot') return `${zone}·T`;
  if (role.kind === 'feature') return `${zone}·F:${C.FEATURE_TYPES[game.features[role.index].type].name}`;
  return `${zone}·V`;
}

// Zones (M1j §6): each zone faintly tinted (near brighter than far) with its ID, the sector
// boundary lines from the Druid and the NEAR_RADIUS ring.
const ZONE_TINTS = ['120, 200, 255', '255, 190, 110', '170, 255, 150']; // per sector, in order
function drawZones(ctx, level) {
  const D = level.druidPos;
  const B = level.sectorBoundaryAngles;
  const far = 3000; // px, past every screen corner
  const rad = (deg) => deg * Math.PI / 180;
  ctx.save();
  B.forEach((from, i) => {
    let to = B[(i + 1) % B.length];
    if (to <= from) to += 360;
    const name = level.sectorNames[i];
    const tint = ZONE_TINTS[i % ZONE_TINTS.length];
    for (const [r0, r1, alpha] of [[0, level.nearRadius, 0.09], [level.nearRadius, far, 0.045]]) {
      ctx.fillStyle = `rgba(${tint}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(D.x, D.y, r1, rad(from), rad(to));
      ctx.arc(D.x, D.y, r0, rad(to), rad(from), true);
      ctx.closePath();
      ctx.fill();
    }
    // Zone IDs on the sector's middle angle: near halfway out, far beyond the ring (kept on screen).
    const mid = rad((from + to) / 2);
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(${tint}, 0.9)`;
    const at = (r) => ({
      x: Math.min(C.STAGE_WIDTH - 60, Math.max(60, D.x + Math.cos(mid) * r)),
      y: Math.min(C.STAGE_HEIGHT - 20, Math.max(C.HUD_STRIP_HEIGHT + 30, D.y + Math.sin(mid) * r)),
    });
    const n = at(level.nearRadius * 0.6);
    const f = at(level.nearRadius + 260);
    ctx.fillText(`n${name}`, n.x, n.y);
    ctx.fillText(`f${name}`, f.x, f.y);
  });
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  for (const a of B) {
    ctx.beginPath();
    ctx.moveTo(D.x, D.y);
    ctx.lineTo(D.x + Math.cos(rad(a)) * far, D.y + Math.sin(rad(a)) * far);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(D.x, D.y, level.nearRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// All candidates (M1c §6.2): footprint and footprint + jitter circles around the
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
    label(ctx, `#${c.index} ${roleTag(game, role, c.index)} (${c.x}, ${c.y})`, x, y, color);
    if (role.kind === 'slot') {
      y += 17;
      label(ctx, `covers ${placed.lanes.map((id) => laneNames[id]).join(', ') || 'none'}`, x, y, color);
    }
    if (role.kind !== 'vacant') stepCostLabel(ctx, game, { kind: role.kind, index: role.index }, x, y + 17);
  }
}

function drawLane(ctx, lane) {
  const { path } = lane;
  const half = lane.corridorWidth / 2;

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
    const target = game.enemies.find((e) => e.id === t.targetId);
    const muzzle = turretMuzzle(t);
    if (target) {
      ctx.strokeStyle = TARGET_COLOR;
      ctx.beginPath();
      ctx.moveTo(muzzle.x, muzzle.y);
      ctx.lineTo(target.x, target.y - C.ENEMY_TYPES[target.type].hitHeight);
      ctx.stroke();
    }
    label(ctx, `T#${t.id} ${{ sprinkler: 'Spr', toader: 'Toader', cinderjaw: 'Cinder' }[t.type] ?? t.type} L${t.level}`, t.x - 16, muzzle.y - 20);
  }
}

// M2o §5: each Cinderjaw's cone at its current aim (always, not only while it breathes), and each
// burning enemy's remaining burn time.
function drawCinderjawCones(ctx, game) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 150, 60, 0.9)';
  ctx.lineWidth = 1.5;
  for (const t of game.turrets) {
    const cone = levelStats(t.type, t.level).cone;
    if (!cone) continue;
    const half = (cone.angle / 2) * (Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.arc(t.x, t.y, turretRange(t), t.angle - half, t.angle + half);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 170, 80, 0.95)';
  for (const e of game.enemies) {
    const b = e.statuses.burning;
    if (b) ctx.fillText(`burn ${Math.max(0, b.until - game.combatTime).toFixed(1)}s L${b.level}${b.spreadRadius ? ' WF' : ''}`, e.x - 26, e.y + e.radius + 14);
  }
  ctx.restore();
}

// Vulture IDs and state, block radius, and a line to the current target (§18.2).
function drawVultureTargets(ctx, game) {
  ctx.lineWidth = 1.5;
  for (const v of game.vultures) {
    const target = game.enemies.find((e) => e.id === v.targetId);
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

// M1d §3: Squirrel → target lines and IDs/state; claimed drops ringed with their claimer's ID.
function drawSquirrelTargets(ctx, game) {
  ctx.lineWidth = 1.5;
  for (const d of game.drops) {
    if (d.claimedBy === null) continue;
    ctx.strokeStyle = SQUIRREL_COLOR;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const s of game.squirrels) {
    const target = game.drops.find((d) => d.id === s.targetId);
    if (target) {
      ctx.strokeStyle = SQUIRREL_COLOR;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
    if (C.SQUIRREL_BLOCKS_WOLVES) {
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(s.x, s.y, C.SQUIRREL_BLOCK_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // M1h §4: counter-attack target (the attacker it will strike), with time to the next strike.
    const foe = game.enemies.find((e) => e.id === s.strikeTargetId);
    if (foe) {
      ctx.save();
      ctx.strokeStyle = STRIKE_COLOR;
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(foe.x, foe.y);
      ctx.stroke();
      ctx.restore();
      label(ctx, `strike #${foe.id} in ${(C.SQUIRREL_ATTACK_INTERVAL - s.strikeTimer).toFixed(1)}s`, s.x + 16, s.y + 20, STRIKE_COLOR);
    }
    label(ctx, `S#${s.id} ${s.state.toLowerCase()} ${s.remaining.toFixed(1)}s${target ? ` → #${target.id}` : ''}`, s.x + 16, s.y + 4, SQUIRREL_COLOR);
  }
}

// M1f §7: each cloud's damage reach (cloud radius, plus a wolf's radius as a dashed ring, since
// an enemy is hit when its body overlaps) with time left; each pellet's line to its target, or
// to the spot it will burst on if the target has died.
function drawCloudsAndPellets(ctx, game) {
  ctx.lineWidth = 1.5;
  for (const c of game.clouds) {
    const spec = c.spec; // the stats it was created with (M1h §2.3)
    ctx.strokeStyle = CLOUD_COLOR;
    ctx.beginPath();
    ctx.arc(c.x, c.y, spec.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(c.x, c.y, spec.radius + C.ENEMY_TYPES.wolf.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, `C#${c.id} L${c.level} r${spec.radius} ${(spec.duration - c.age).toFixed(1)}s ticks ${c.ticks}`, c.x - 30, c.y + spec.radius + 30, CLOUD_COLOR);
  }
  for (const p of game.projectiles) {
    if (p.kind !== 'pellet') continue;
    const target = game.enemies.find((e) => e.id === p.targetId);
    const tx = target ? target.x : p.lastX;
    const ty = target ? target.y : p.lastY;
    if (tx === null) continue;
    ctx.strokeStyle = CLOUD_COLOR;
    ctx.setLineDash(target ? [] : [4, 4]); // dashed: target dead, flying to its last position
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawEnemies(ctx, game) {
  ctx.lineWidth = 1.5;
  for (const w of game.enemies) {
    ctx.strokeStyle = ENEMY_COLOR;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2); // drawn radius (Bears: 26 px, M1e §6)
    ctx.stroke();
    // M2d §4: a smaller collision circle (the Ogre's 30 px) inside it, dashed.
    if (w.collisionRadius !== w.radius) {
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.collisionRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // M2d §4: passing through a slower enemy (unstick rule): small yellow outline.
    if (w.passThroughId !== null) {
      ctx.strokeStyle = UNSTICK_COLOR;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.collisionRadius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = ENEMY_COLOR;
    }
    // M2h §6: a flyer's ground point (a cross) and its shadow, and a line to the Vulture holding it.
    if (w.flying) {
      ctx.beginPath();
      ctx.moveTo(w.x - 4, w.y - 4); ctx.lineTo(w.x + 4, w.y + 4);
      ctx.moveTo(w.x + 4, w.y - 4); ctx.lineTo(w.x - 4, w.y + 4);
      ctx.stroke();
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.ellipse(w.x, w.y, w.radius, w.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const holder = w.blockedBy !== null && game.vultures.find((v) => v.id === w.blockedBy);
      if (holder) {
        ctx.beginPath();
        ctx.moveTo(w.x, w.y);
        ctx.lineTo(holder.x, holder.y);
        ctx.stroke();
      }
    }
    const tag = w.type === 'wolf' ? '' : `${C.ENEMY_TYPES[w.type].name} `;
    const slots = w.slots.length ? ` s${w.slots.join('+')}` : '';
    label(ctx, `${tag}#${w.id} ${w.blockedBy !== null ? 'blocked' : STATE_TAGS[w.state]}${slots}`, w.x - 14, w.y + w.radius + 14);
    // Wind-up attackers (the Ogre, M2c §4): a line to each claimed melee slot and the wind-up timer.
    const t = C.ENEMY_TYPES[w.type];
    if (t.windupTime) {
      for (const i of w.slots) {
        const slot = game.meleeSlots[i];
        ctx.beginPath();
        ctx.moveTo(w.x, w.y);
        ctx.lineTo(slot.x, slot.y);
        ctx.stroke();
      }
      const timer = w.attack === AttackState.WINDUP
        ? `wind-up ${w.windupElapsed.toFixed(2)}/${t.windupTime}s`
        : `next wind-up in ${Math.max(0, t.attackInterval - t.windupTime - w.sinceBlow).toFixed(1)}s`;
      label(ctx, timer, w.x - 14, w.y + w.radius + 30);
    }
  }
}

function drawDruid(ctx, game) {
  const d = game.scene.level.druidPos;
  ctx.strokeStyle = COLOR;
  cross(ctx, d.x, d.y, 8);
  label(ctx, `Druid (${d.x}, ${d.y})`, d.x + 12, d.y - 12);

  // Melee ring and slots
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(d.x, d.y, C.DRUID_MELEE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Approach ring wolves walk round to reach far slots (larger enemies use a wider one).
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  ctx.arc(d.x, d.y, C.DRUID_APPROACH_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Slots: filled orange when claimed by an enemy, labelled with the holder's ID (M1e §6; a Bear holds two).
  ctx.font = '11px monospace';
  for (const slot of game.meleeSlots) {
    ctx.fillStyle = slot.enemyId === null ? COLOR : ENEMY_COLOR;
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (slot.enemyId !== null) {
      const out = 14; // label just outside the ring
      ctx.fillText(`${slot.index}:#${slot.enemyId}`, slot.x + Math.cos(slot.angle) * out - 12, slot.y + Math.sin(slot.angle) * out + 4);
    }
  }
  ctx.font = '13px monospace';

  // Druid melee target line (M1e §6): to the attacker his next strike will hit.
  const target = game.enemies.find((e) => e.id === game.druidMeleeTargetId);
  if (target) {
    ctx.strokeStyle = MELEE_COLOR;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.lineWidth = 1.5;
  }
}

// M1i §4: each Bough Double's line to its target, with its job and the job time left (or the wisp).
function drawDoubleJobs(ctx, game) {
  ctx.lineWidth = 1.5;
  for (const d of game.doubles) {
    const slot = game.slots[d.slotIndex];
    const p = doubleStandPos(game, d);
    ctx.strokeStyle = DOUBLE_COLOR;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(slot.x, slot.y);
    ctx.stroke();
    const what = d.job === 'build' ? `build ${d.turretType}` : `upgrade → L${d.toLevel}`;
    const time = d.state === 'WISP' ? 'wisp' : `${Math.max(0, d.duration - d.elapsed).toFixed(1)}s left`;
    label(ctx, `D#${d.id} ${what} ${time}`, p.x - 60, p.y + 34, DOUBLE_COLOR);
  }
}

// M2e §6: a gold double ring round the resource spot holding the battle's hidden item, with the
// item's ID (or "found" once searched); "no item" when none was hidden.
function drawHiddenItem(ctx, game) {
  const h = game.hiddenItem;
  if (!h) {
    label(ctx, 'Hidden item: none this battle', 24, C.HUD_STRIP_HEIGHT + 24, ITEM_COLOR);
    return;
  }
  const f = game.features[h.featureIndex];
  ctx.strokeStyle = ITEM_COLOR;
  ctx.lineWidth = 3;
  for (const r of [C.LOCATION_RADIUS + 6, C.LOCATION_RADIUS + 12]) {
    ctx.beginPath();
    ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 1.5;
  label(ctx, `ITEM: ${h.itemId}${h.found ? ' (found)' : ''}`, f.x - 60, f.y - C.LOCATION_RADIUS - 20, ITEM_COLOR);
}
