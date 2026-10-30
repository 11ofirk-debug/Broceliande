// The data tabs (M2j §3): their columns and how each cell is converted. Code-side, so it lives here
// rather than in the CSVs. Column types:
//   id      lower camelCase identifier (text)       text   any text
//   number  a plain number (decimal point '.')      int    a whole number
//   bool    TRUE / FALSE                            list   numbers separated by commas, e.g. "1.5, 4"
//   value   (globals / druid) converted by the key's type in GLOBAL_TYPES / DRUID_KEYS
// required: the column must exist and every row needs a value. Columns not listed (and not
// matched by a tab's `pattern`) give an "unknown column" warning. `notes` and columns starting
// with '_' are always ignored.

// Global settings: key → type. Every key must have a row.
export const GLOBAL_TYPES = {
  PREP_DURATION: 'number', END_DELAY: 'number',
  STEP_PX: 'number', TRAVEL_TWEEN_TIME: 'number',
  ENEMY_WANDER_SPEED: 'number', ENEMY_WANDER_INTERVAL: 'list', ENEMY_SIDESTEP_SPEED: 'number',
  ENEMY_SLOT_CLAIM_DISTANCE: 'number', DRUID_APPROACH_RADIUS: 'number', ENEMY_DIRECT_APPROACH_ANGLE: 'number',
  STUCK_TIME: 'number', STUCK_DECAY_RATE: 'number', SIDE_KEEP_MARGIN: 'number',
  STIRGE_DRUID_RING: 'number', STIRGE_WANDER_SPEED: 'number', STIRGE_WANDER_INTERVAL: 'list',
  STIRGE_SEPARATION: 'number', STIRGE_SEPARATION_SPEED: 'number', CLOUDS_HIT_FLYERS: 'bool',
  BURST_STAGGER: 'number', FIRST_WAVE_DELAY: 'number', WAVE_GAP_AFTER_LAST_SPAWN: 'number',
  CORRIDOR_WIDTH: 'number', RANDOMISE_LAYOUT: 'bool', FIXED_LAYOUT_SEED: 'int',
  LOCATION_RADIUS: 'number', LOCATION_JITTER: 'number', LOCATION_GAP: 'number', LANE_MIN_TURRET_SLOTS: 'int',
  FEATURE_ROUTE_MIN_FACTOR: 'number', FEATURE_ROUTE_MAX_FACTOR: 'number', MAX_LAYOUT_ATTEMPTS: 'int',
  ZONE_NEAR_TURRET: 'int', ZONE_NEAR_FEATURE: 'int', ZONE_FAR_TURRET: 'int', ZONE_FAR_FEATURE: 'int',
  DROP_SPACING: 'number', DROP_POP_HEIGHT: 'number', DROP_POP_TIME: 'number', DROP_POP_STAGGER: 'number', DROP_SINGLE_OFFSET: 'list',
  FLOATER_RISE_PX: 'number', FLOATER_TIME: 'number', FLOATER_STAGGER: 'number', FLOATER_STACK_PX: 'number',
  SWEEP_FLIGHT_TIME: 'number', SWEEP_STAGGER: 'number', SWEEP_END_MARGIN: 'number', SWEEP_END_SCALE: 'number', SWEEP_PULSE_TIME: 'number',
  CARRY_DRUID_HP: 'bool', ITEMS_PER_BATTLE: 'int', WORK_SPEED: 'number', SEARCH_MAIN_BONUS: 'number', BOUGH_REFUND_CHANCE: 'number',
  MASTER_VOLUME: 'number', SOUND_PITCH_JITTER: 'number',
};

// Druid stats: key → type. Every key must have a row.
export const DRUID_KEYS = {
  hp: 'number', radius: 'number', meleeRadius: 'number', meleeSlots: 'int', meleeDamage: 'number',
  meleeInterval: 'number', strikeWindupTime: 'number', strikeSwingTime: 'number',
  regenAmount: 'number', regenInterval: 'number',
};

const COST = { type: 'int' }; // cost_<resource> columns

// tab → { columns: { name: { type, required } }, pattern?: [regex, column spec] }
export const TABS = {
  globals: { columns: { key: { type: 'text', required: true }, value: { type: 'value' } } },
  druid: { columns: { key: { type: 'id', required: true }, value: { type: 'value' } } },
  resources: { columns: { id: { type: 'id', required: true }, name: { type: 'text', required: true }, singular: { type: 'text', required: true }, plural: { type: 'text', required: true }, order: { type: 'number', required: true } } },
  features: {
    columns: { id: { type: 'id', required: true }, name: { type: 'text', required: true }, mainResource: { type: 'id', required: true }, searchTime: { type: 'number', required: true } },
    pattern: [/^[a-z][a-zA-Z0-9]*_(min|max)$/, { type: 'int' }],
  },
  enemies: {
    columns: {
      id: { type: 'id', required: true }, name: { type: 'text', required: true }, plural: { type: 'text', required: true },
      hp: { type: 'number', required: true }, speed: { type: 'number', required: true }, radius: { type: 'number', required: true },
      collisionRadius: { type: 'number' }, damage: { type: 'number', required: true }, attackInterval: { type: 'number', required: true },
      windup: { type: 'number' }, meleeSlots: { type: 'int', required: true }, flying: { type: 'bool' }, flyHeight: { type: 'number' },
      hitHeight: { type: 'number', required: true }, burstStagger: { type: 'number' }, dropSpacing: { type: 'number' },
      keepSide: { type: 'bool' }, sideWander: { type: 'number' }, boss: { type: 'bool' }, stepSoundInterval: { type: 'number' },
    },
  },
  drops: { columns: { enemy: { type: 'id', required: true }, resource: { type: 'id', required: true }, chance: { type: 'number', required: true }, min: { type: 'int', required: true }, max: { type: 'int', required: true } } },
  turrets: {
    columns: {
      turret: { type: 'id', required: true }, name: { type: 'text', required: true }, level: { type: 'int', required: true },
      attack: { type: 'id', required: true }, damage: { type: 'number', required: true }, fireInterval: { type: 'number', required: true },
      range: { type: 'number', required: true }, time: { type: 'number', required: true }, projectileSpeed: { type: 'number', required: true },
      muzzleHeight: { type: 'number', required: true }, cloudRadius: { type: 'number' }, cloudDuration: { type: 'number' },
      cloudTick: { type: 'number' }, cloudTickDamage: { type: 'number' },
    },
    pattern: [/^cost_[a-z][a-zA-Z0-9]*$/, COST],
  },
  summons: {
    columns: {
      id: { type: 'id', required: true }, name: { type: 'text', required: true }, plural: { type: 'text', required: true }, key: { type: 'text', required: true },
      hp: { type: 'number' }, damage: { type: 'number' }, attackInterval: { type: 'number' }, duration: { type: 'number' },
      speed: { type: 'number' }, max: { type: 'int' }, radius: { type: 'number' }, meleeRange: { type: 'number' },
      blockRadius: { type: 'number' }, pickupRange: { type: 'number' }, blocks: { type: 'bool' }, wispTime: { type: 'number' },
      burstRadius: { type: 'number' }, slowMult: { type: 'number' }, slowDuration: { type: 'number' }, // Slow Wisp (M2k §3.6)
    },
    pattern: [/^cost_[a-z][a-zA-Z0-9]*$/, COST],
  },
  items: {
    columns: {
      id: { type: 'id', required: true }, slot: { type: 'id', required: true }, name: { type: 'text', required: true }, description: { type: 'text', required: true },
      iconColor: { type: 'text', required: true }, iconAccent: { type: 'text', required: true }, iconMark: { type: 'id', required: true },
    },
    pattern: [/^effect\d+_(stat|op|value)$/, { type: 'effect' }],
  },
  stats: { columns: { stat: { type: 'text', required: true }, description: { type: 'text', required: true } } },
  levels: {
    columns: {
      id: { type: 'id', required: true }, name: { type: 'text', required: true }, description: { type: 'text', required: true },
      row: { type: 'int' }, nodeType: { type: 'id', required: true }, enemyHpMult: { type: 'number' }, corridorWidth: { type: 'number' },
      stepBudget: { type: 'number', required: true }, stuckTime: { type: 'number' },
    },
    pattern: [/^mix_[a-z][a-zA-Z0-9]*$/, { type: 'int' }],
  },
  waves: { columns: { level: { type: 'id', required: true }, wave: { type: 'int', required: true }, gapAfter: { type: 'number' }, tolls: { type: 'list' } } },
  spawns: { columns: { level: { type: 'id', required: true }, wave: { type: 'int', required: true }, t: { type: 'number', required: true }, lane: { type: 'id', required: true }, type: { type: 'id', required: true }, count: { type: 'int', required: true } } },
  candidates: { columns: { level: { type: 'id', required: true }, index: { type: 'int', required: true }, x: { type: 'number', required: true }, y: { type: 'number', required: true }, zone: { type: 'id', required: true } } },
  // Any other column is a palette colour; nested colours are flattened with '_' (treeDark_canopy_0).
  palettes: { columns: { level: { type: 'id', required: true } }, pattern: [/^[a-z][a-zA-Z0-9]*(_[a-zA-Z0-9]+)*$/, { type: 'text' }] },
  sounds: { columns: { id: { type: 'id', required: true }, volume: { type: 'number', required: true }, pitch: { type: 'number', required: true }, minGap: { type: 'number', required: true }, maxVoices: { type: 'int', required: true }, enabled: { type: 'bool', required: true } } },
};

// Exported from code for the sheet's lane dropdown (M2j §3.2); never loaded by the game.
export const REFERENCE_TABS = ['lanes'];
