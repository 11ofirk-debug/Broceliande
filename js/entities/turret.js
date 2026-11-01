// Turret data (spec §10, levels M1e §4, types M1f §5). Every turret has a type (a TURRET_TYPES
// key) and a level within that type. Behaviour lives in the combat and cloud systems.

import * as C from '../config.js';

export const TURRET_TYPE_KEYS = Object.keys(C.TURRET_TYPES);

export function turretType(type) {
  return C.TURRET_TYPES[type];
}

export function maxLevel(type) {
  return C.TURRET_TYPES[type].levels.length;
}

// Build cost and time are level 1's (M1e §4.1).
export function buildCost(type) {
  return C.TURRET_TYPES[type].levels[0].cost;
}

export function buildTime(type) {
  return C.TURRET_TYPES[type].levels[0].time;
}

export function createTurret(id, slotIndex, slot, type) {
  return {
    id,
    type,
    slotIndex,
    x: slot.x,
    y: slot.y,
    level: 1,             // 1 … maxLevel(type)
    cooldown: 0,          // s until it may fire; 0 = ready, fires as soon as a target appears
    targetId: null,       // enemy currently aimed at (re-evaluated before every shot)
    angle: -Math.PI / 2,  // facing, turned toward the target at TURRET_TURN_SPEED
    lastFireTime: -Infinity, // combat time it last fired (Toader mouth animation)
  };
}

// Stats of a level (1-based) of a type.
export function levelStats(type, level) {
  return C.TURRET_TYPES[type].levels[level - 1];
}

// The level the next upgrade leads to, or null at max level (or for a one-level type).
export function nextLevelStats(turret) {
  return turret.level < maxLevel(turret.type) ? levelStats(turret.type, turret.level + 1) : null;
}

export function levelRange(type, level) {
  return levelStats(type, level).range;
}

export function turretRange(turret) {
  return levelRange(turret.type, turret.level);
}

export function turretDamage(turret) {
  return levelStats(turret.type, turret.level).damage;
}

// Cloud stats of a cloud-attack type at a level (M1h §2.1), or undefined for other types.
export function cloudStats(type, level) {
  return levelStats(type, level).cloud;
}

export function turretFireInterval(turret) {
  return levelStats(turret.type, turret.level).fireInterval;
}

// World point its shots leave from: the Sprinkler's cup or the Toader's mouth, above a pad
// that sits TURRET_BASE_OFFSET below the location centre (M1c §2.1).
export function turretMuzzle(turret) {
  return { x: turret.x, y: turret.y + (C.TURRET_BASE_OFFSET - C.TURRET_TYPES[turret.type].muzzleHeight) * C.SPOT_SCALE };
}

// Pebbles per volley (M2m §2.3, Twin shot): 2 at the Stormspinner, else 1.
export function turretTargets(turret) {
  return levelStats(turret.type, turret.level).targets;
}

// The level's name (M2m §2.1), e.g. 'Hailstone', or null for an unnamed level.
export function levelName(type, level) {
  return levelStats(type, level).name;
}
