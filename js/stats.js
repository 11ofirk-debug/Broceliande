// Stats resolver (M2e §2.2): the effective values of every stat equipment can change, from
// config.js (and the level, for the step budget) plus the equipped items' effects. Each item
// effect is { stat, op: 'add' | 'mult', value }; all adds apply first, then all mults.
// Systems read these stats from game.stats, resolved once when a battle starts and fixed for it.
// With nothing equipped, every effective value is exactly its base (config) value.

import * as C from './config.js';

// Each stat's base value. level: the current level's LEVELS entry.
const BASES = {
  'vulture.duration':         () => C.VULTURE_DURATION,
  'vulture.damage':           () => C.VULTURE_DAMAGE,
  'squirrel.duration':        () => C.SQUIRREL_DURATION,
  'squirrel.speed':           () => C.SQUIRREL_SPEED,
  'squirrel.pickupRange':     () => C.SQUIRREL_PICKUP_RANGE,
  'double.boughRefundChance': () => C.BOUGH_REFUND_CHANCE,
  'double.max':               () => C.MAX_BOUGH_DOUBLES,
  'druid.maxHp':              () => C.DRUID_HP,
  'druid.regenAmount':        () => C.DRUID_REGEN_AMOUNT,
  'work.speed':               () => C.WORK_SPEED,
  'search.mainBonus':         () => C.SEARCH_MAIN_BONUS,
  'steps.budget':             (level) => level.stepBudget,
  'steps.length':             () => C.STEP_PX,
  // Per level, not changed by equipment (M2f §3.1): every enemy's HP × this.
  'enemy.hpMult':             (level) => level.enemyHpMult ?? 1,
};

export const STAT_KEYS = Object.keys(BASES);

// Short labels for the debug panel (and later the stats strip).
export const STAT_LABELS = {
  'vulture.duration': 'Vulture duration (s)',
  'vulture.damage': 'Vulture damage',
  'squirrel.duration': 'Squirrel duration (s)',
  'squirrel.speed': 'Squirrel speed (px/s)',
  'squirrel.pickupRange': 'Squirrel pickup range (px)',
  'double.boughRefundChance': 'Bough refund chance',
  'double.max': 'Bough Doubles at a time',
  'druid.maxHp': 'Max HP',
  'druid.regenAmount': 'Regen (HP per interval)',
  'work.speed': 'Build speed',
  'search.mainBonus': 'Search bonus',
  'steps.budget': 'Steps',
  'steps.length': 'Step length (px)',
  'enemy.hpMult': 'Enemy HP ×',
};

export function baseStats(level) {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, BASES[k](level)]));
}

// The equipped items' IDs, one per slot (null slots and an absent equipment skipped).
function equippedItems(equipped) {
  return Object.values(equipped ?? {}).filter((id) => id && C.ITEMS[id]).map((id) => C.ITEMS[id]);
}

// Effective stats for the given equipment ({ slot: itemId | null }) in this level.
export function resolveStats(equipped, level) {
  const stats = baseStats(level);
  const effects = equippedItems(equipped).flatMap((item) => item.effects);
  for (const e of effects) if (e.op === 'add') stats[e.stat] += e.value;
  for (const e of effects) if (e.op === 'mult') stats[e.stat] *= e.value;
  return stats;
}

// Stats that differ from their base: [{ stat, base, value }] (debug panel, stats strip).
export function changedStats(stats, level) {
  const base = baseStats(level);
  return STAT_KEYS.filter((k) => stats[k] !== base[k]).map((k) => ({ stat: k, base: base[k], value: stats[k] }));
}

// Start-up check: every item's slot exists and every effect names a known stat and op.
export function validateItems() {
  for (const [id, item] of Object.entries(C.ITEMS)) {
    if (!C.SLOT_TYPES[item.slot]) console.error(`Item ${id}: unknown slot "${item.slot}"`);
    for (const e of item.effects) {
      if (!BASES[e.stat]) console.error(`Item ${id}: unknown stat "${e.stat}"`);
      if (e.op !== 'add' && e.op !== 'mult') console.error(`Item ${id}: unknown op "${e.op}"`);
    }
  }
}
