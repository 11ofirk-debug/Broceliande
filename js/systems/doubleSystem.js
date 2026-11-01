// Bough Doubles (M1i §2): in Combat, the only way to build or upgrade turrets. The Druid summons
// one from his menu, points it at a valid target (targeting mode = SUMMON_PLACEMENT with target
// 'double'), and pays the job's full cost plus BOUGH_DOUBLE_COST at once. A wisp flies to the
// target; the Double appears beside it and works for the job time, then builds or upgrades the
// turret and fades out. Cancelling from the target's menu refunds everything. Doubles are not
// targetable or blockable and block nothing. They freeze during ENDING (not updated).

import * as C from '../config.js';
import { GameState, ActionState } from '../states.js';
import { canAfford, deduct, add, RESOURCE_KEYS } from '../resources.js';
import { turretOnSlot, placeTurret, raiseTurretLevel } from './buildSystem.js';
import { buildCost, buildTime, nextLevelStats } from '../entities/turret.js';
import { createDouble, DoubleState } from '../entities/boughDouble.js';
import { events } from '../events.js';
import { addResourceFloaters } from '../effects.js';

const TIMER_EPSILON = 1e-9; // s, so 1/60 s steps reach the wisp and job times on time

export function doubleOnSlot(game, slotIndex) {
  return game.doubles.find((d) => d.slotIndex === slotIndex) ?? null;
}

// The turret on this slot is being upgraded by a Double: it does not fire (M1i §2.5).
export function isBeingUpgraded(game, slotIndex) {
  return doubleOnSlot(game, slotIndex)?.job === 'upgrade';
}

// A valid target (§2.4): an empty slot, or a turret below max level, with no Double on it.
export function isDoubleTarget(game, slotIndex) {
  if (doubleOnSlot(game, slotIndex)) return false;
  const turret = turretOnSlot(game, slotIndex);
  return !turret || nextLevelStats(turret) !== null;
}

export function doubleTargets(game) {
  return game.slots.map((_, i) => i).filter((i) => isDoubleTarget(game, i));
}

export function isDoubleTargeting(game) {
  return game.action.state === ActionState.SUMMON_PLACEMENT && game.action.target === 'double';
}

function sumCosts(a, b) {
  return Object.fromEntries(RESOURCE_KEYS.map((k) => [k, (a[k] ?? 0) + (b[k] ?? 0)]));
}

// The job a Double would do on a slot: { job, turretType, toLevel, cost, time }, with cost the
// full price (resources + Bough) and time divided by the effective work speed (M2e, Wright's Belt).
// An empty slot needs the turret type chosen; null if none fits.
export function doubleJob(game, slotIndex, turretType = null) {
  const turret = turretOnSlot(game, slotIndex);
  if (turret) {
    const next = nextLevelStats(turret);
    if (!next) return null;
    return { job: 'upgrade', turretType: turret.type, toLevel: turret.level + 1, cost: sumCosts(next.cost, C.BOUGH_DOUBLE_COST), time: next.time / game.stats['work.speed'] };
  }
  if (!turretType) return null;
  return { job: 'build', turretType, toLevel: 1, cost: sumCosts(buildCost(turretType), C.BOUGH_DOUBLE_COST), time: buildTime(turretType) / game.stats['work.speed'] };
}

// Druid-menu availability (§2.4 step 1): no Bough, the effective double.max already working, or no
// valid target. (The Druid being busy is checked with the other summons.)
export function doubleAvailability(game) {
  const max = game.stats['double.max']; // effective (M2e, Twin-root Ferrule)
  if (game.doubles.length >= max) {
    return { available: false, reason: `${max} Bough Doubles already working` };
  }
  if (!canAfford(game.resources, C.BOUGH_DOUBLE_COST)) return { available: false, reason: 'Not enough Boughs' };
  if (doubleTargets(game).length === 0) return { available: false, reason: 'Nothing to build or upgrade' };
  return { available: true, reason: '' };
}

// Confirm (§2.4 step 3): pay the full cost now, send the wisp, Druid back to IDLE (his melee
// timer restarts, as after any summon). turretType: for an empty slot, the type chosen.
export function startDoubleJob(game, slotIndex, turretType = null) {
  if (game.state !== GameState.COMBAT || !isDoubleTargeting(game)) return false;
  if (!isDoubleTarget(game, slotIndex) || game.doubles.length >= game.stats['double.max']) return false;
  const job = doubleJob(game, slotIndex, turretType);
  if (!job || !canAfford(game.resources, job.cost)) return false;
  deduct(game.resources, job.cost);
  game.doubleStats.boughsSpent += job.cost.boughs;
  game.doubles.push(createDouble(game.nextEntityId++, {
    slotIndex, job: job.job, turretType: job.turretType, toLevel: job.toLevel, duration: job.time, paid: job.cost,
  }));
  game.action = { state: ActionState.IDLE, target: null, elapsed: 0, duration: 0 };
  return true;
}

// Where a Double stands: beside its target, like the Druid did (DRUID_ACTION_OFFSET).
export function doubleStandPos(game, d) {
  const slot = game.slots[d.slotIndex];
  return { x: slot.x + C.DRUID_ACTION_OFFSET.x, y: slot.y + C.DRUID_ACTION_OFFSET.y };
}

// "Cancel job" in the target's menu (§2.6): the Double goes and the full cost comes back.
export function cancelDoubleJob(game, slotIndex) {
  if (game.state !== GameState.COMBAT) return false;
  const d = doubleOnSlot(game, slotIndex);
  if (!d) return false;
  add(game.resources, d.paid);
  game.doubleStats.boughsSpent -= d.paid.boughs;
  game.doubleStats.cancelled++;
  removeDouble(game, d);
  events.emit('doubleCancelled', { slotIndex });
  return true;
}

function removeDouble(game, d) {
  game.doubles = game.doubles.filter((x) => x !== d);
  if (d.state === DoubleState.WORKING) {
    const p = doubleStandPos(game, d);
    game.doubleFades.push({ x: p.x, y: p.y, facing: 1, age: 0 }); // fade out with leaf particles (visual only)
  }
}

// Mossheart Ferrule (M2e §2.3): when a job starts, a double.boughRefundChance chance that the
// Bough comes back (a floater shows it). No roll at all without the item, so the seeded RNG
// sequence is unchanged.
function refundBough(game, d) {
  const chance = game.stats['double.boughRefundChance'];
  if (chance <= 0 || game.rng.next() >= chance) return;
  add(game.resources, C.BOUGH_DOUBLE_COST);
  d.paid = Object.fromEntries(Object.entries(d.paid).map(([k, n]) => [k, n - (C.BOUGH_DOUBLE_COST[k] ?? 0)])); // a cancel won't refund it twice
  game.doubleStats.boughsSpent -= C.BOUGH_DOUBLE_COST.boughs ?? 0;
  const slot = game.slots[d.slotIndex];
  addResourceFloaters(game, C.BOUGH_DOUBLE_COST, slot.x, slot.y - C.LOCATION_RADIUS - 20);
}

export function updateDoubles(game, dt) {
  for (const d of [...game.doubles]) {
    if (d.state === DoubleState.WISP) {
      d.wispElapsed += dt;
      if (d.wispElapsed < C.DOUBLE_WISP_TIME - TIMER_EPSILON) continue;
      d.state = DoubleState.WORKING; // the job time starts when the Double appears
      events.emit('doubleAppears', { slotIndex: d.slotIndex });
      refundBough(game, d);
      continue;
    }
    d.elapsed += dt;
    // One staff swing per DOUBLE_CRAFT_SWING_INTERVAL; each impact pops a few wood chips.
    const swings = Math.floor((d.elapsed + TIMER_EPSILON) / C.DOUBLE_CRAFT_SWING_INTERVAL);
    if (swings > d.swings && d.elapsed < d.duration - TIMER_EPSILON) {
      d.swings = swings;
      craftHit(game, d);
    }
    if (d.elapsed < d.duration - TIMER_EPSILON) continue;
    if (d.job === 'build') placeTurret(game, d.slotIndex, d.turretType);
    else raiseTurretLevel(game, d.slotIndex);
    game.doubleStats.completed++;
    removeDouble(game, d);
  }
}

// 2–3 wood chips from the target, in a fixed fan that turns with each swing (no randomness needed).
function craftHit(game, d) {
  const slot = game.slots[d.slotIndex];
  const n = 2 + (d.swings % 2);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.7 + (d.swings % 3 - 1) * 0.25;
    game.chips.push({ x: slot.x, y: slot.y + (C.TURRET_BASE_OFFSET - 12) * C.SPOT_SCALE, vx: Math.cos(a) * 70, vy: Math.sin(a) * 90, age: 0 });
  }
  events.emit('doubleCraftHit', { slotIndex: d.slotIndex });
}
