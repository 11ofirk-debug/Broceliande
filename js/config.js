// Broceliande M1 — ALL tuning values and scene coordinates.
// Single source of truth (spec §17). Systems must import from here, never hard-code.
// Values marked // TUNING are starting guesses expected to change after playtesting.

// ---------------------------------------------------------------------------
// Stage & loop (§3.4, §3.5)
// ---------------------------------------------------------------------------
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

export const SIM_STEP = 1 / 60;          // seconds, fixed timestep
export const MAX_FRAME_DT = 0.05;        // real seconds; larger frame gaps (tab switch) are clamped
export const MAX_STEPS_PER_FRAME = 12;   // hard cap on sim steps per animation frame (covers ×4 speed)
export const SIM_SPEEDS = [1, 2, 4];     // debug speed multipliers (keys 1 / 2 / 4)

// ---------------------------------------------------------------------------
// 17.1 Timing and phases
// ---------------------------------------------------------------------------
export const PREP_DURATION = 28;         // s  (build and upgrade times: TURRET_TYPES levels)
export const END_DELAY = 1.5;            // s of ENDING between the last kill / Druid death and the result overlay (M1e §1)

// ---------------------------------------------------------------------------
// M1b addendum §9 — step-budget Prep (docs/M1B_STEPS_ADDENDUM.md)
// ---------------------------------------------------------------------------
export const PREP_MODE = 'steps';          // 'steps' | 'timed' — mode at page load; debug key M toggles it
export const STEP_PX = 25;                 // TUNING — px of straight-line travel per step
export const TRAVEL_TWEEN_TIME = 0.35;     // TUNING — s, Druid's travel animation to a marker
export const STEP_BAR_BLINK_HZ = 3;        // TUNING — red blink rate of the step bar on an unaffordable hover (§5.2)
// M1g §2: footstep route preview (UI time, visual only).
export const FOOTPRINT_SIDE_OFFSET = 5;    // TUNING — px each footprint sits left / right of the route line
export const FOOTPRINT_REVEAL_TIME = 0.5;  // TUNING — s for the trail to appear from the Druid to the target, whatever the distance
export const TRAIL_FOOTPRINT_ALPHA = 0.45; // TUNING — committed route-trail footprints (M1h §1), fainter than the preview
export const FOOTPRINT_FADE_TIME = 0.06;   // s each footprint takes to fade in
export const CALIBRATION_SLOT_COUNT = 5;   // debug panel: "all features + N nearest slots" greedy figure (§8)
export const CALIBRATION_TARGET_RATIO = 1.4; // that figure should be about this × the level's stepBudget (§9 budget intent)

// ---------------------------------------------------------------------------
// 17.2 Druid
// ---------------------------------------------------------------------------
export const DRUID_HP = 86;
export const DRUID_RADIUS = 28;                          // TUNING
export const DRUID_MELEE_RADIUS = 52;                    // TUNING
export const DRUID_MELEE_SLOTS = 6;                      // TUNING — max simultaneous biters
export const DRUID_ACTION_OFFSET = { x: -58, y: 20 };    // TUNING — Druid position beside a target (just outside LOCATION_RADIUS)
export const DRUID_MELEE_DAMAGE = 1;                    // M1e §2: Druid strikes the weakest attacker in his melee slots
export const DRUID_MELEE_INTERVAL = 1.6;                 // s between strike impacts, counted only while he is idle in Combat
// M1f §4: each strike is wind-up → swing + lunge → impact (damage lands here) → recover.
export const STRIKE_WINDUP_TIME = 0.12;                  // s, staff rotates back away from the target
export const STRIKE_SWING_TIME = 0.10;                   // s, staff swings through while the Druid lunges
export const STRIKE_RECOVER_TIME = 0.18;                 // s, staff and Druid return to rest (visual only)
export const STRIKE_LUNGE_PX = 10;                       // px the Druid lunges toward the target (visual only)

// ---------------------------------------------------------------------------
// 17.3 Enemies (wolf §12–13; Bear M1e §3). Data-driven: one entry per type, one shared
// entity and set of systems. Drop tables (M1d §1.1, M1e §3.3): each resource is rolled
// independently on death; amounts are uniform inclusive integers.
// ---------------------------------------------------------------------------
export const WOLF_DROPS = [
  { resource: 'feathers', chance: 0.06, min: 1, max: 2 },
  { resource: 'pits',     chance: 0.08, min: 1, max: 2 },
  { resource: 'reeds',    chance: 0.04, min: 1, max: 1 },
  { resource: 'boughs',    chance: 0.07, min: 1, max: 1 },
];
export const BEAR_DROPS = [               // TUNING
  { resource: 'feathers', chance: 0.35, min: 1, max: 2 },
  { resource: 'pits',     chance: 0.50, min: 2, max: 3 },
  { resource: 'reeds',    chance: 0.20, min: 1, max: 1 },
  { resource: 'boughs',    chance: 0.25, min: 1, max: 1 },
];
export const OGRE_DROPS = [               // M2c §2.3 — the first enemy to always drop Boughs
  { resource: 'pits',     chance: 1.0, min: 3, max: 5 },
  { resource: 'feathers', chance: 1.0, min: 2, max: 3 },
  { resource: 'reeds',    chance: 0.6, min: 1, max: 2 },
  { resource: 'boughs',   chance: 1.0, min: 1, max: 2 },
];
// hitHeight: px above the collision centre where pebbles strike the body (visual aim point).
// meleeSlotsUsed: adjacent Druid melee slots the enemy occupies while attacking him.
// Optional (M2c §2): windupTime — each attack is a wind-up then a blow, damage at the blow, the
// interval measured between blows; collisionRadius (M2d §3.2) — the radius it collides and is
// clamped to its corridor with (default: radius, which stays its drawn size); keepSide (M2d §3.3)
// — picks a side of its corridor at spawn (seeded) and keeps near it, wandering ±sideWander px;
// boss — a mini-boss (boss HP bar, arrival banner, always-visible HP bar); dropSpacing — px between
// its drops (default DROP_SPACING); stepSoundInterval — s between footstep thuds while walking.
export const ENEMY_TYPES = {
  wolf: {
    name: 'Wolf', plural: 'Wolves',
    hp: 17,              // TUNING — 6 base pebbles, 4 upgraded, 3 Vulture pecks
    speed: 82,           // TUNING — px/s, aim for 25–30 s lane traversal
    radius: 16,          // TUNING
    damage: 2,
    attackInterval: 1.4, // s
    meleeSlotsUsed: 1,
    hitHeight: 10,
    drops: WOLF_DROPS,
  },
  bear: {
    name: 'Bear', plural: 'Bears',
    hp: 90,              // TUNING — 5× wolf
    speed: 48,           // TUNING — px/s, about two-thirds wolf speed
    radius: 26,          // TUNING — bulky, but a wolf can still pass it in the corridor
    damage: 8,           // TUNING
    attackInterval: 2.0, // TUNING — s
    meleeSlotsUsed: 2,   // TUNING — two adjacent Druid melee slots (M1e §3.5)
    hitHeight: 20,
    drops: BEAR_DROPS,
  },
  // Mini-boss (M2c §2.2). All TUNING.
  ogre: {
    name: 'Ogre', plural: 'Ogres',
    hp: 450,             // TUNING — OGRE_HP: 5× Bear
    speed: 30,           // TUNING — OGRE_SPEED, px/s: about 60–65 s to cross a lane unopposed
    radius: 52,          // TUNING — OGRE_RADIUS: twice the Bear's; drawing, HP bar, hover, Druid melee positioning
    collisionRadius: 30, // TUNING — OGRE_COLLISION_RADIUS (M2d §3.2): other enemies, corridor clamping
    damage: 25,          // TUNING — OGRE_DAMAGE: one hit kills a Vulture or Squirrel
    attackInterval: 3.5, // TUNING — OGRE_ATTACK_INTERVAL, s between blows
    windupTime: 0.8,     // TUNING — OGRE_WINDUP_TIME, s of club raised before each blow
    meleeSlotsUsed: 3,   // TUNING — OGRE_MELEE_SLOTS_USED
    hitHeight: 46,
    drops: OGRE_DROPS,
    dropSpacing: 24,     // TUNING — px, a little wider than DROP_SPACING to suit its size
    keepSide: true,      // M2d §3.3: walks near one side, leaving a gap a wolf can pass through
    sideWander: 4,       // TUNING — px of wander round its side offset
    boss: true,
    stepSoundInterval: 0.8, // s between ogreStep thuds while walking (M2c §2.9)
  },
};

// Mini-boss feedback (M2c §2.5–2.7). Visual only.
export const SCREEN_SHAKE_ENABLED = true; // false: no screen shake
export const OGRE_SHAKE_PX = 6;           // TUNING — px, canvas drawing only
export const OGRE_SHAKE_TIME = 0.2;       // TUNING — s
export const OGRE_DUST_TIME = 0.45;       // s a dust ring spreads and fades at the blow's target
export const OGRE_DUST_RADIUS = 46;       // px, its final radius
export const OGRE_BLOW_POSE_TIME = 0.3;   // s the club stays down after a blow (drawing)
export const BOSS_BANNER_TIME = 2;        // s the "An Ogre approaches!" banner shows, fading out
export const BOSS_LANE_PULSE_TIME = 2;    // s the boss's lane entrance pulses red
export const BOSS_LANE_PULSE_RADIUS = 90; // px

// Enemy movement details (§12.3–12.5), shared by all types. Not in the spec's table; all TUNING.
export const ENEMY_WANDER_SPEED = 10;          // TUNING — px/s, slow lateral drift toward a wander target
export const ENEMY_WANDER_INTERVAL = [1.5, 4]; // TUNING — s between picking new wander targets [min, max]
export const ENEMY_SIDESTEP_SPEED = 55;        // TUNING — px/s, lateral speed when stepping round an enemy ahead
export const ENEMY_SLOT_CLAIM_DISTANCE = 70;   // TUNING — px before the lane end where an enemy claims melee slots (waits here if none free; keep outside DRUID_APPROACH_RADIUS + 2×wolf radius)
export const DRUID_APPROACH_RADIUS = 86;       // TUNING — px, ring wolves walk round to reach a far melee slot (clears biters at DRUID_MELEE_RADIUS); larger enemies use it + their extra radius
export const ENEMY_DIRECT_APPROACH_ANGLE = 0.6; // TUNING — rad; slots closer than this in angle are walked to directly
export const STUCK_TIME = 0.6;                 // TUNING — s an enemy held up by a slower walking enemy waits before passing through it (M2d §3.4)
export const STUCK_DECAY_RATE = 0.25;          // TUNING — a free step runs the stuck timer down at this × real time, so creeping behind a blocker still adds up
export const SIDE_KEEP_MARGIN = 4;            // px a keepSide enemy stays from its corridor edge (M2d §3.3)

// ---------------------------------------------------------------------------
// 17.4 Turret (Pebble Sprinkler)
// ---------------------------------------------------------------------------
export const TURRET_RANGE = 220;          // TUNING — px, the Pebble Sprinkler's base range (also used for lane coverage, M1c §4.1)
export const PROJECTILE_SPEED = 600;      // TUNING — px/s, pebbles
export const TURRET_MUZZLE_HEIGHT = 40;   // px above the slot pad where pebbles leave the sprinkler

// Turret types (M1f §5.1), data-driven like enemies. Per type: base `range` and its `levels`.
// Level 1's cost / time are the build cost and time; later levels' are the upgrade (to that
// level) cost and time; upgrades go one level at a time. `rangeMult` multiplies the base range.
// attack: 'projectile' (homing pebble, damage on hit) or 'cloud' (pellet that bursts into a
// lingering poison cloud, M1f §6).
export const TURRET_TYPES = {
  sprinkler: {
    name: 'Pebble Sprinkler',
    attack: 'projectile',
    range: TURRET_RANGE,
    muzzleHeight: TURRET_MUZZLE_HEIGHT,  // px above the slot pad where pebbles leave (the cup)
    // M1e §4. Levels 1 and 2 keep the values the game already used (build 2.3 s, upgrade
    // 2 Pits + 1 Feather in 2.5 s), which differ from the M1e addendum's §4.2 table.
    levels: [
      { damage: 3, fireInterval: 0.75, rangeMult: 1.0,  cost: { pits: 2, reeds: 1, feathers: 0 }, time: 2.3 }, // 1 (built)
      { damage: 5, fireInterval: 0.6,  rangeMult: 1.2,  cost: { pits: 2, reeds: 0, feathers: 1 }, time: 2.5 }, // 2 (upgrade)
      { damage: 7, fireInterval: 0.5,  rangeMult: 1.35, cost: { pits: 6, reeds: 0, feathers: 2 }, time: 4.0 }, // 3 (upgrade) — TUNING
    ],
  },
  toader: {
    name: 'Poison Toader',
    attack: 'cloud',
    range: 260,                          // px, level 1; later levels via rangeMult (285, 310 px)
    muzzleHeight: 20,                    // px above the slot pad where pellets leave (the mouth)
    // M1h §2.1. damage: impact damage to the direct target. cloud: the cloud a pellet fired at
    // this level leaves — radius (px; hits enemies whose body overlaps it), duration (s),
    // tickInterval (s; first tick one interval after the burst) and tickDamage (to every enemy
    // inside, per tick). Ticks per cloud: 5 / 7 / 11. A cloud keeps the stats it was created with.
    levels: [
      { damage: 3, fireInterval: 3.5, rangeMult: 1.0,       cost: { pits: 0, reeds: 2, feathers: 0 }, time: 2.5, // 1 (built)
        cloud: { radius: 70, duration: 4.2, tickInterval: 0.8,  tickDamage: 1 } },
      { damage: 4, fireInterval: 3.0, rangeMult: 285 / 260, cost: { pits: 3, reeds: 1, feathers: 0 }, time: 3.0, // 2 (upgrade) — TUNING
        cloud: { radius: 80, duration: 5.0, tickInterval: 0.65, tickDamage: 1 } },
      { damage: 5, fireInterval: 2.6, rangeMult: 310 / 260, cost: { pits: 5, reeds: 1, feathers: 1 }, time: 4.0, // 3 (upgrade) — TUNING
        cloud: { radius: 90, duration: 5.6, tickInterval: 0.5,  tickDamage: 1 } },
    ],
    pelletSpeed: 450,                    // TUNING — px/s
  },
};
export const CLOUD_GROW_TIME = 0.3;       // s, a cloud grows from pellet size to full radius (visual only)
export const CLOUD_FADE_TIME = 0.6;       // s, it fades out over its last moments (visual only)
export const TURRET_TURN_SPEED = 9;       // TUNING — rad/s, how fast a turret visibly turns toward its target (visual; firing does not wait for it)

// ---------------------------------------------------------------------------
// 17.5 Vulture
// ---------------------------------------------------------------------------
export const VULTURE_COST = { pits: 0, reeds: 0, feathers: 1 };
export const VULTURE_HP = 16;
export const VULTURE_DAMAGE = 6;
export const VULTURE_ATTACK_INTERVAL = 0.7; // s
export const VULTURE_DURATION = 12;         // s
export const MAX_VULTURES = 2;
export const VULTURE_SPEED = 160;           // TUNING — px/s, deliberately slowish so placement matters
export const VULTURE_RADIUS = 14;           // TUNING
export const VULTURE_MELEE_RANGE = 34;      // TUNING — px
export const VULTURE_BLOCK_RADIUS = 36;     // TUNING — px
export const VULTURE_FLIGHT_HEIGHT = 26;    // px a flying Vulture is drawn above its ground shadow (visual only)

// ---------------------------------------------------------------------------
// 17.6 Scene layout
// ---------------------------------------------------------------------------
export const HUD_STRIP_HEIGHT = 80;       // px
export const CORRIDOR_WIDTH = 110;        // TUNING — px; the default for levels without their own corridorWidth (M2b §2)
export const LANE_LENGTH_FACTOR = 2.0;    // TUNING — target lane length ÷ straight-line spawn→Druid distance
export const LANE_LENGTH_TOLERANCE = 0.15; // start-up warning if a lane's length factor is off LANE_LENGTH_FACTOR by more than this fraction
export const LANE_SAMPLES_PER_SEGMENT = 24; // polyline samples between two waypoints (§12.2)

export const TURRET_SLOT_RADIUS = 30;     // TUNING — px, slot pad size (drawing only; must fit LOCATION_RADIUS)
export const TURRET_BASE_OFFSET = 18;     // px the slot pad sits below its location centre, so pad + turret fit the footprint (M1c §2.1)

// ---------------------------------------------------------------------------
// 17.7 Searchable features
// ---------------------------------------------------------------------------
// yields: resource → [min, max] inclusive integers. All ranges TUNING. mainResource: the one
// Forager's Belt adds to (M2e §2.3).
export const FEATURE_TYPES = {
  tree:      { name: 'Tree',       searchTime: 1.2, yields: { pits: [2, 4], boughs: [1, 3] }, mainResource: 'pits' },   // boughs: M1i §1.2
  reedPatch: { name: 'Reed Patch', searchTime: 1.4, yields: { reeds: [2, 3] }, mainResource: 'reeds' },
  shrub:     { name: 'Shrub',      searchTime: 1.7, yields: { feathers: [2, 3], boughs: [1, 2] }, mainResource: 'feathers' }, // boughs: M1i §1.2
  ruins:     { name: 'Ruins',      searchTime: 1.8, yields: { pits: [2, 3], feathers: [1, 3] }, mainResource: 'pits' },
  pond:      { name: 'Pond',       searchTime: 2.0, yields: { pits: [2, 3], reeds: [1, 3] }, mainResource: 'reeds' },
};

export const FEATURE_RADIUS = 32;         // TUNING — px, feature sprite scale (drawing only; sprites must fit LOCATION_RADIUS)

// ---------------------------------------------------------------------------
// M1c addendum — candidate locations and randomised layout (docs/M1C_LAYOUT_ADDENDUM.md §7)
// ---------------------------------------------------------------------------
export const RANDOMISE_LAYOUT = true;     // false = the same zone-based layout every run, from FIXED_LAYOUT_SEED (M1j §4.2)
export const LOCATION_RADIUS = 45;        // TUNING — px, footprint of every candidate; all feature/turret visuals fit inside; also the click area
export const LOCATION_JITTER = 25;        // TUNING — px, max random offset of a chosen location
export const LOCATION_GAP = 20;           // TUNING — px, extra spacing between candidates
export const DECOR_MARGIN = 15;           // TUNING — px, decoration keeps this far beyond footprint + jitter
export const LANE_MIN_TURRET_SLOTS = 3;   // TUNING — turret slots that must cover each lane
export const FEATURE_ROUTE_MIN_FACTOR = 0.75; // TUNING — greedy all-feature route ≥ this × the level's stepBudget
export const FEATURE_ROUTE_MAX_FACTOR = 1.10; // TUNING — … and ≤ this × the level's stepBudget
export const MAX_LAYOUT_ATTEMPTS = 200;

// Feature type mix (M1j §5): one type per resource spot, shuffled across them each run. Its
// total must equal the resource spots from the zone quotas (9; checked at start-up).
export const FEATURE_MIX = { tree: 3, reedPatch: 1, shrub: 1, ruins: 2, pond: 2 }; // TUNING — the default for levels without their own featureMix (M2b §2)
// RANDOMISE_LAYOUT false (M1j §4.2): the layout is generated with this seed instead of the run's,
// so it is the same every run but still follows the zone rules.
export const FIXED_LAYOUT_SEED = 1001;

// ---------------------------------------------------------------------------
// Decorative forest (§5.3, M1c §5) — visual only, no gameplay effect.
// Scattered once per level on a jittered grid seeded with its decorSeed, so it is identical
// in every run and mode. Each object's drawn extent (a circle `lift` px above its base with
// radius `r`, both × its size) must stay clear of every corridor and of every candidate
// location's footprint + jitter + DECOR_MARGIN, including vacant ones.
// ---------------------------------------------------------------------------
export const DECOR = {
  cellSize: 64,               // px, jittered grid cell; one candidate object per cell
  treeChance: 0.42,           // per cell, away from corridors; these three chances × the level's decorDensity
  bushChance: 0.22,
  rockChance: 0.08,
  edgeBand: 110,              // px from the screen border where trees always grow (boundary)
  corridorGap: 2,             // px kept between any object's drawn extent and a corridor edge
  extent: {                   // drawn extent per kind, in units of the object's size (matches render/environment.js)
    tree: { lift: 40, r: 48 },
    bush: { lift: 10, r: 22 },
    rock: { lift: 7, r: 17 },
    // Themed kinds (M2b §3); gnarled trees use `tree`.
    reeds: { lift: 12, r: 16 },
    sunkenRoof: { lift: 15, r: 40 },
    brokenFence: { lift: 12, r: 30 },
    mushrooms: { lift: 5, r: 16 },
    standingStone: { lift: 30, r: 34 },
    gravestone: { lift: 14, r: 17 },
    slab: { lift: 4, r: 22 },
    kiln: { lift: 8, r: 26 },          // M2f §4.1
    sunkenStones: { lift: 8, r: 36 },  // M2f §4.4
    stump: { lift: 6, r: 18 },         // M2f §4.7
    weepingStone: { lift: 30, r: 28 }, // M2f §4.9
    root: { lift: 6, r: 44 },          // M2f §4.11 (ring round the Druid)
  },
  clearingRadius: 120,        // px, open dirt clearing around the Druid
  groundPatches: 70,          // subtle floor colour blobs
};

// ---------------------------------------------------------------------------
// 17.8 Wave
// ---------------------------------------------------------------------------
export const BURST_STAGGER = 0.6;        // TUNING — s between enemies in one burst
export const RANDOMISE_BEAR_LANES = true; // M1e §3.6: shuffle the Bears across lanes each run (one per lane); false = lanes as in the level's wave

// ---------------------------------------------------------------------------
// M1d addendum — drops and Squirrel (docs/M1D_DROPS_SQUIRREL_ADDENDUM.md). Drop tables are
// with the enemy types (17.3).
// ---------------------------------------------------------------------------
// M1d §2.2 — Squirrel summon: collects drops. Values from the addendum's table, tuned
// independently of the Vulture.
export const SQUIRREL_COST = { pits: 1, reeds: 0, feathers: 0 }; // TUNING
export const SQUIRREL_HP = 15;              // TUNING
export const SQUIRREL_DURATION = 12;        // TUNING — s
export const SQUIRREL_SPEED = 110;          // TUNING — px/s, straight line, ignores terrain
export const MAX_SQUIRRELS = 3;             // TUNING — separate from MAX_VULTURES

// Summon shortcuts in Combat (same as choosing the summon in the Druid's menu), shown as key badges there.
export const SUMMON_KEYS = { vulture: 'q', squirrel: 'w', double: 'e' };
export const SUMMON_DENIED_FLASH_TIME = 0.45; // s an unavailable summon's option flashes in the open Druid menu
export const SQUIRREL_RADIUS = 12;          // TUNING
export const SQUIRREL_PICKUP_RANGE = 14;    // TUNING — px, collects a drop within this distance
export const SQUIRREL_BLOCKS_WOLVES = true; // M1d §2.4: true = a waiting Squirrel blocks and is bitten like a landed Vulture. M1h §3.3: true by default (needed for the counter-attack)
export const SQUIRREL_DAMAGE = 1;           // M1h §3: counter-attack on one of the enemies attacking it
export const SQUIRREL_ATTACK_INTERVAL = 2.1; // s, counted only while it is being attacked
export const SQUIRREL_BLOCK_RADIUS = 36;   // TUNING — px, used only when SQUIRREL_BLOCKS_WOLVES (same as VULTURE_BLOCK_RADIUS)

// Bough Double (M1i §2): a summon that does one build or upgrade job at a turret slot in
// Combat, then disappears. Its full cost (the job's cost plus BOUGH_DOUBLE_COST) is paid at
// once; cancelling refunds it all. It appears beside its target at DRUID_ACTION_OFFSET.
export const BOUGH_DOUBLE_COST = { boughs: 1 }; // TUNING
export const MAX_BOUGH_DOUBLES = 2;         // TUNING — working at the same time
export const DOUBLE_TINT = '#7a5530';       // monochrome brown version of the Druid's drawing
export const DOUBLE_ALPHA = 0.6;
export const DOUBLE_WISP_TIME = 0.25;       // s, the wisp's flight from the Druid to the target; the job starts on arrival
export const DOUBLE_CRAFT_SWING_INTERVAL = 0.45; // s between staff swings (each one a craft hit)
export const DOUBLE_APPEAR_TIME = 0.2;      // s to fade and scale in (visual only)
export const DOUBLE_FADE_TIME = 0.3;        // s to fade out on completion or cancel (visual only)
export const DOUBLE_BOB_PX = 2;             // px of gentle bob while crafting (visual only)
export const DOUBLE_CHIP_TIME = 0.45;       // s a wood chip flies before vanishing (visual only)

export const RESOURCE_ICON_SIZE = 28;     // px, resource icons in the HUD panel
export const MENU_PORTRAIT_SIZE = 40;     // px, creature / turret images in menus (M1f §2)
export const MENU_COST_ICON_SIZE = 18;    // px, resource icons in cost rows (M1f §3)
export const DROP_ICON_SCALE = 0.7;       // drop icons on the ground, relative to RESOURCE_ICON_SIZE
export const DROP_SPACING = 16;           // TUNING — px between items dropped by one wolf
// M1g §1: drops pop out of the death point and arc to their resting spot (simulation time).
export const DROP_POP_HEIGHT = 70;        // TUNING — px the arc rises above the straight line from death point to resting spot
export const DROP_POP_TIME = 0.35;        // TUNING — s in the air; Squirrels can only target an item once it has landed
export const DROP_POP_STAGGER = 0.2;      // TUNING — s between the launches of one enemy's items
export const DROP_SETTLE_TIME = 0.08;     // s of squash-and-settle on landing (visual only)
export const DROP_SINGLE_OFFSET = [6, 12]; // px along the lane a lone item lands from the death point, so it still arcs

// ---------------------------------------------------------------------------
// Sound (M1g §3) — synthesised in js/audio.js, triggered by gameplay events. Never affects the simulation.
// ---------------------------------------------------------------------------
export const MASTER_VOLUME = 0.5;         // TUNING — 0..1
export const SOUND_PITCH_JITTER = 0.05;   // TUNING — each play is pitched up or down by up to this fraction
// Per sound: volume (0..1, times MASTER_VOLUME), pitch (multiplier on the sound's base pitch),
// minGap (s; a play within this of the previous one is skipped), maxVoices (skip if this many
// are still sounding), enabled.
export const SOUNDS = {
  sprinklerFire: { volume: 0.25, pitch: 1, minGap: 0.06, maxVoices: 3, enabled: true }, // TUNING — plays often, keep subtle
  toaderFire:    { volume: 0.6,  pitch: 1, minGap: 0.1,  maxVoices: 2, enabled: true }, // TUNING
  cloudBurst:    { volume: 0.4,  pitch: 1, minGap: 0.1,  maxVoices: 3, enabled: true }, // TUNING
  wolfBite:      { volume: 0.5,  pitch: 1, minGap: 0.08, maxVoices: 3, enabled: true }, // TUNING — on the Druid or a summon
  bearAttack:    { volume: 0.8,  pitch: 1, minGap: 0.12, maxVoices: 2, enabled: true }, // TUNING
  druidWhoosh:   { volume: 0.4,  pitch: 1, minGap: 0.1,  maxVoices: 2, enabled: true }, // TUNING — Druid strike swing
  druidThud:     { volume: 0.6,  pitch: 1, minGap: 0.1,  maxVoices: 2, enabled: true }, // TUNING — Druid strike impact
  vulturePeck:   { volume: 0.4,  pitch: 1, minGap: 0.06, maxVoices: 3, enabled: true }, // TUNING
  squirrelScratch: { volume: 0.4, pitch: 1, minGap: 0.06, maxVoices: 3, enabled: true }, // TUNING — Squirrel counter-attack (M1h §3.4)
  wolfDie:       { volume: 0.5,  pitch: 1, minGap: 0.08, maxVoices: 3, enabled: true }, // TUNING
  bearDie:       { volume: 0.8,  pitch: 1, minGap: 0.2,  maxVoices: 2, enabled: true }, // TUNING
  resourceChime: { volume: 0.45, pitch: 1, minGap: 0.05, maxVoices: 4, enabled: true }, // TUNING — one per collection event
  searchRustle:  { volume: 0.5,  pitch: 1, minGap: 0.1,  maxVoices: 1, enabled: true }, // TUNING
  build:         { volume: 0.6,  pitch: 1, minGap: 0.1,  maxVoices: 2, enabled: true }, // TUNING — two wooden knocks
  doubleAppears: { volume: 0.5,  pitch: 1, minGap: 0.1,  maxVoices: 2, enabled: true }, // TUNING — Bough Double arrives (M1i §2.8)
  doubleCraftHit: { volume: 0.25, pitch: 1, minGap: 0.08, maxVoices: 1, enabled: true }, // TUNING — one per crafting swing; replaces the upgrade ratchet
  doubleCancelled: { volume: 0.5, pitch: 1, minGap: 0.1,  maxVoices: 2, enabled: true }, // TUNING
  upgradeDone:   { volume: 0.55, pitch: 1, minGap: 0.1,  maxVoices: 2, enabled: true }, // TUNING
  summon:        { volume: 0.5,  pitch: 1, minGap: 0.1,  maxVoices: 2, enabled: true }, // TUNING
  mapNodeHover:  { volume: 0.2,  pitch: 1, minGap: 0.08, maxVoices: 1, enabled: true }, // TUNING — very soft tick (M2a §7)
  mapNodeChosen: { volume: 0.6,  pitch: 1, minGap: 0.2,  maxVoices: 1, enabled: true }, // TUNING — warm drum hit + rising tone
  runComplete:   { volume: 0.6,  pitch: 1, minGap: 1,    maxVoices: 1, enabled: true }, // TUNING — short triumphant phrase
  magicFound:    { volume: 0.6,  pitch: 1, minGap: 0.5,  maxVoices: 1, enabled: true }, // TUNING — bright shimmer on finding a hidden item (M2e §3.2)
  summonDenied:  { volume: 0.35, pitch: 1, minGap: 0.15, maxVoices: 1, enabled: true }, // TUNING — soft low blip when a summon shortcut can't be used
  bellToll:      { volume: 0.8,  pitch: 1, minGap: 2,    maxVoices: 1, enabled: true }, // TUNING — deep bell before each Hollow of Bells surge (M2f §4.10)
  // The Ogre (M2c §2.9)
  ogreSpawns:    { volume: 0.9,  pitch: 1, minGap: 1,    maxVoices: 1, enabled: true }, // TUNING — deep, long roar
  ogreStep:      { volume: 0.3,  pitch: 1, minGap: 0.3,  maxVoices: 2, enabled: true }, // TUNING — very low thud, quiet
  ogreWindup:    { volume: 0.55, pitch: 1, minGap: 0.3,  maxVoices: 1, enabled: true }, // TUNING — short low creak/groan
  ogreBlow:      { volume: 1.0,  pitch: 1, minGap: 0.3,  maxVoices: 2, enabled: true }, // TUNING — heavy thump + crunch, louder than the Bear's
  ogreDies:      { volume: 0.9,  pitch: 1, minGap: 1,    maxVoices: 1, enabled: true }, // TUNING — long falling groan + ground thud
};
export const SOUND_RESOURCE_FREQ = { pits: 440, reeds: 660, feathers: 990, boughs: 300 }; // TUNING — Hz, chime pitch per resource (Boughs lowest and woody, M1i §1.3)
export const SOUND_CHIME_STAGGER = 0.07;  // s between chimes when one search finds several resources
export const SOUND_SUMMON_FREQ = { vulture: 330, squirrel: 880 }; // TUNING — Hz, shimmer base pitch per summon
export const SOUND_STATS_WINDOW = 5;      // s, debug panel: sounds played / skipped over this much real time (M1g §5)
export const SOUND_MUTE_KEY = 'broceliande.muted'; // localStorage key for the mute state

// ---------------------------------------------------------------------------
// 17.9 Debug
// ---------------------------------------------------------------------------
export const DEBUG_SEED = null;          // null = new random seed each restart; integer = fixed seed
export const DEBUG_START_ENABLED = false;
export const DEBUG_GRANT_AMOUNT = 10;   // G key: +this many of each resource
export const DEBUG_DROP_MULT = 10;      // X key toggles wolf drop chances between ×1 and ×this (M1d §3)

// ---------------------------------------------------------------------------
// Feedback (§16.3) — visual only
// ---------------------------------------------------------------------------
export const FLOATING_TEXT_TIME = 1.4;   // s a "+2 Pits" style text stays up (simulation time)
export const FLOATING_TEXT_RISE = 40;    // px it drifts upward over that time
// Resource floaters (M2d §1): every resource gain (searches, Squirrel pickups, debug G) shows one
// rising icon + "×N" per resource, instead of floating text. Damage numbers stay as text.
export const FLOATER_ICON_SIZE = 28;     // TUNING — px
export const FLOATER_RISE_PX = 45;       // TUNING — px risen over FLOATER_TIME, easing out
export const FLOATER_TIME = 1.0;         // TUNING — s; fades during the last 40%
export const FLOATER_STAGGER = 0.12;     // TUNING — s between floaters of one gain, in resource order
export const FLOATER_STACK_PX = 30;      // TUNING — px each further floater of one gain starts higher (no overlap)
// Field sweep on Victory (M2d §2): drops left on the field fly to their HUD counters during ENDING.
export const SWEEP_FLIGHT_TIME = 0.5;    // TUNING — s per item
export const SWEEP_STAGGER = 0.04;       // TUNING — s between launches, nearest the HUD first; shortened if needed
export const SWEEP_END_MARGIN = 0.1;     // s before the Victory overlay by which the last item must land
export const SWEEP_END_SCALE = 0.65;     // item size on arrival, relative to its size on the ground
export const SWEEP_PULSE_TIME = 0.3;     // s a HUD counter pulses after an item lands on it
export const DRUID_SWIPE_TIME = 0.25;   // s a Druid strike swoosh arc stays visible (M1e §2.4, M1f §4)
export const STRIKE_SPARK_TIME = 0.2;   // s the impact spark on the target stays visible (M1f §4)
export const STRIKE_KNOCKBACK_PX = 3;   // px the target is pushed back visually on impact (simulation position unchanged)
export const STRIKE_KNOCKBACK_TIME = 0.15; // s for that visual knock-back to settle

// ---------------------------------------------------------------------------
// Levels (M2a §5): everything that defines one encounter's scene. Everything else above is
// global (turret, summon and enemy stats, drop tables, UI, debug). Start-up validation runs for
// every level. Fields:
//   name, description       shown on the map and in the bottom-left label (M2a §6)
//   druidPos                where the Druid stands (TUNING — off-centre)
//   lanes                   TUNING — waypoints (§12.1): the first is the spawn, just off-screen;
//                           the last lies on the Druid's melee ring (druidPos + DRUID_MELEE_RADIUS
//                           in the approach direction). The debug panel reports each lane's
//                           length, length factor and unopposed travel time.
//   sectorBoundaryAngles,   zones (M1j §2): three sectors around druidPos, one per lane, each split
//   sectorNames, nearRadius into near (within nearRadius) and far. Angles in degrees from the Druid,
//                           0° = east, clockwise (screen y points down); sector i runs clockwise
//                           from sectorBoundaryAngles[i] to the next boundary.
//   zoneQuotas,             per zone: turret slots and resource spots each run; the rest of its
//   zoneQuotaOverrides      candidates stay vacant. Overrides change single zones.
//   candidateLocations      M1c §2, M1j §3: each with an explicit `zone` label, which decides its
//                           zone (a label that differs from the geometry is logged as info)
//   corridorWidth           optional (M2b §2): the level's corridor width; default CORRIDOR_WIDTH
//   featureMix              optional (M2b §2): the level's feature mix, totalling its feature
//                           quota; default FEATURE_MIX
//   decorSeed, decorDensity decoration: fixed per level; decorDensity multiplies DECOR's chances
//   thornBushes, gnarledTrees, optional themed decoration (M2a §5.3, M2b §3), all clear of corridors
//   decorProps, flats,      and candidates: bush / tree styles; extra prop kinds (kind → chance per
//   stoneRing, landmarks    cell); water or mist patches; standing stones round the Druid; fixed
//                           landmarks such as the burial mound
//   palette                 scene colours only (M2a §5.5); entities, UI and HUD keep theirs
//   wave, enemyCounts       TUNING — bursts per lane id; time = seconds since Combat began; type:
//                           an ENEMY_TYPES key, default 'wolf'. enemyCounts: the expected totals
//                           per type (bosses included), validated at start-up against the bursts.
//   bosses                  mini-bosses (M2c §3): { type, time, lane: a lane id or 'random' (seeded) }
//   stepBudget              TUNING — steps available in step-mode Prep
//   enemyHpMult             optional (M2f §3.1): every enemy's HP × this in the level; default 1
//   stuckTime               optional (M2f §4): the level's STUCK_TIME (unstick rule); default STUCK_TIME
// ---------------------------------------------------------------------------
export const LEVELS = {
  tornville: {
    name: 'Tornville Haunt',
    description: "The old haunt at the forest's edge.",
    druidPos: { x: 1010, y: 600 },
    lanes: [
      {
        id: 'upperLeft',
        name: 'Upper-left',
        waypoints: [
          { x: -40, y: 250 }, { x: 180, y: 280 }, { x: 360, y: 205 }, { x: 540, y: 210 },
          { x: 625, y: 290 }, { x: 600, y: 385 }, { x: 500, y: 425 }, { x: 455, y: 490 },
          { x: 490, y: 570 }, { x: 600, y: 615 }, { x: 720, y: 580 }, { x: 775, y: 470 },
          { x: 770, y: 340 }, { x: 805, y: 255 }, { x: 875, y: 215 }, { x: 948, y: 258 },
          { x: 980, y: 345 }, { x: 990, y: 450 }, { x: 1001, y: 549 },
        ],
      },
      {
        id: 'right',
        name: 'Right',
        waypoints: [
          { x: 1980, y: 430 }, { x: 1760, y: 460 }, { x: 1620, y: 340 }, { x: 1440, y: 330 },
          { x: 1350, y: 375 }, { x: 1340, y: 470 }, { x: 1420, y: 560 }, { x: 1545, y: 605 },
          { x: 1605, y: 700 }, { x: 1560, y: 800 }, { x: 1380, y: 860 }, { x: 1220, y: 760 },
          { x: 1150, y: 650 }, { x: 1059, y: 618 },
        ],
      },
      {
        id: 'bottomLeft',
        name: 'Bottom-left',
        waypoints: [
          { x: 250, y: 1140 }, { x: 270, y: 975 }, { x: 140, y: 880 }, { x: 125, y: 755 },
          { x: 285, y: 660 }, { x: 490, y: 740 }, { x: 595, y: 955 }, { x: 740, y: 1000 },
          { x: 890, y: 980 }, { x: 975, y: 895 }, { x: 990, y: 790 }, { x: 1001, y: 651 },
        ],
      },
    ],
    // Each boundary sits in a gap between lanes: 176° between Bottom-left (ends 175°) and
    // Upper-left (starts 178°); 320° between Upper-left (ends 264°) and Right (starts 326°), late
    // in that gap so the crowded NW sector gets the open ground north-east of the Druid; 65°
    // between Right (ends 38°) and Bottom-left (starts 95°).
    sectorBoundaryAngles: [176, 320, 65], // TUNING
    sectorNames: ['NW', 'E', 'SW'],       // sector starting at each boundary
    nearRadius: 460,                      // TUNING — px; corridors leave little room close to the Druid, so near reaches this far
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    // fSW fits only 3 candidates under the M1c spacing rules, and its corner one would sit under
    // the level-name label (M2a §6), so it has 2: both turret slots. Its resource spot goes to
    // nSW; fE holds the far zones' other extra one (totals stay 12 turret slots and 9 resource spots).
    zoneQuotaOverrides: {
      fSW: { turret: 2, feature: 0 }, // TUNING
      nSW: { turret: 2, feature: 2 }, // TUNING
      fE:  { turret: 2, feature: 3 }, // TUNING
    },
    // 25 candidates, grouped by zone; the near zones and fSW have no room for more under the
    // spacing rules. Comments: the M1c candidate each one was (index, and how far it moved to
    // meet the rules). M1c candidates 2 (650, 480; no valid spot nearby), 21 (1490, 150; fE was
    // full) and 20 (70, 1010; under the level-name label) were dropped.
    candidateLocations: [
      // nNW — 4
      { x: 1110, y: 370,  zone: 'nNW' }, // was 3, moved 22 px
      { x: 875,  y: 570,  zone: 'nNW' }, // new (replaces 2, which had no valid spot)
      { x: 1170, y: 210,  zone: 'nNW' }, // was 15, moved 14 px
      { x: 1020, y: 150,  zone: 'nNW' }, // new
      // fNW — 6
      { x: 210,  y: 405,  zone: 'fNW' }, // was 0, moved 5 px
      { x: 420,  y: 325,  zone: 'fNW' }, // was 1, moved 50 px
      { x: 330,  y: 535,  zone: 'fNW' }, // was 12, moved 25 px
      { x: 700,  y: 165,  zone: 'fNW' }, // was 16
      { x: 100,  y: 605,  zone: 'fNW' }, // was 19, moved 18 px
      { x: 100,  y: 150,  zone: 'fNW' }, // was 22
      // nE — 3
      { x: 1225, y: 520,  zone: 'nE' },  // was 6, moved 10 px
      { x: 1420, y: 715,  zone: 'nE' },  // was 5
      { x: 1280, y: 970,  zone: 'nE' },  // was 23, moved 14 px
      // fE — 6
      { x: 1535, y: 465,  zone: 'fE' },  // was 4, moved 7 px
      { x: 1720, y: 610,  zone: 'fE' },  // was 7
      { x: 1700, y: 880,  zone: 'fE' },  // was 13
      { x: 1780, y: 300,  zone: 'fE' },  // was 17
      { x: 1480, y: 990,  zone: 'fE' },  // was 18
      { x: 1820, y: 750,  zone: 'fE' },  // was 24
      // nSW — 4
      { x: 730,  y: 845,  zone: 'nSW' }, // was 9
      { x: 1115, y: 855,  zone: 'nSW' }, // was 10, moved 22 px
      { x: 1070, y: 1010, zone: 'nSW' }, // was 14
      { x: 865,  y: 740,  zone: 'nSW' }, // new
      // fSW — 2
      { x: 375,  y: 870,  zone: 'fSW' }, // was 8, moved 10 px
      { x: 465,  y: 1005, zone: 'fSW' }, // was 11, moved 7 px
    ],
    decorSeed: 12345,
    decorDensity: 1,
    palette: {
      floor: '#2f4a26',
      floorAccent: { dark: 'rgba(20, 36, 16, 0.35)', light: 'rgba(80, 110, 50, 0.22)' },
      corridor: { base: '#6e5a3c', worn: 'rgba(150, 128, 90, 0.35)' },
      corridorEdge: '#3b3222',
      treeDark: { trunk: '#4a3524', canopy: ['#1f3d1c', '#28481f', '#21422a'] },
      treeLight: ['#2f5a27', '#3a6328', '#2e5a39'],
      rock: { base: '#6d6f68', light: '#8d8f86', dark: '#4d4f49' },
      vegetation: { base: '#2c5a2a', light: '#3f7334' },
      mapTint: null,
    },
    // Bears are single-unit bursts at 22 / 32 / 42 s (M1e §3.6).
    wave: {
      upperLeft:  [{ time: 0, count: 3 }, { time: 12, count: 2 }, { time: 22, count: 1, type: 'bear' }, { time: 24, count: 3 }, { time: 40, count: 4 }],
      right:      [{ time: 5, count: 2 }, { time: 16, count: 3 }, { time: 30, count: 3 }, { time: 32, count: 1, type: 'bear' }, { time: 48, count: 4 }],
      bottomLeft: [{ time: 9, count: 3 }, { time: 20, count: 2 }, { time: 35, count: 3 }, { time: 42, count: 1, type: 'bear' }, { time: 52, count: 3 }],
    },
    bosses: [],                           // M2c §3: none yet
    enemyCounts: { wolf: 35, bear: 3 },
    stepBudget: 102,                      // TUNING (~2,250 px)
  },
  // Option A: swarm (M2a §5.2). Lanes enter from the top, the left and the bottom-right; the
  // Druid stands left of centre so the two eastern lanes have room to wind.
  gallows: {
    name: 'Gallows Copse',
    description: 'A restless swarm.',
    druidPos: { x: 820, y: 600 },
    lanes: [
      {
        id: 'north',
        name: 'North',
        waypoints: [
          { x: 1700, y: -40 }, { x: 1690, y: 150 }, { x: 1560, y: 240 }, { x: 1380, y: 200 }, { x: 1220, y: 140 },
          { x: 1060, y: 170 }, { x: 940, y: 140 }, { x: 800, y: 150 }, { x: 660, y: 190 }, { x: 590, y: 300 },
          { x: 640, y: 420 }, { x: 760, y: 450 }, { x: 900, y: 380 }, { x: 1000, y: 440 }, { x: 960, y: 530 },
          { x: 846, y: 555 },
        ],
      },
      {
        id: 'west',
        name: 'West',
        waypoints: [
          { x: -40, y: 300 }, { x: 150, y: 320 }, { x: 280, y: 420 }, { x: 250, y: 560 }, { x: 130, y: 660 },
          { x: 120, y: 800 }, { x: 230, y: 920 }, { x: 400, y: 980 }, { x: 560, y: 930 }, { x: 580, y: 800 },
          { x: 480, y: 690 }, { x: 600, y: 610 }, { x: 768, y: 605 },
        ],
      },
      {
        id: 'southEast',
        name: 'South-east',
        waypoints: [
          { x: 1960, y: 1000 }, { x: 1780, y: 990 }, { x: 1660, y: 880 }, { x: 1700, y: 740 }, { x: 1800, y: 620 },
          { x: 1760, y: 480 }, { x: 1600, y: 430 }, { x: 1460, y: 500 }, { x: 1400, y: 640 }, { x: 1440, y: 780 },
          { x: 1380, y: 900 }, { x: 1230, y: 960 }, { x: 1080, y: 920 }, { x: 1020, y: 800 }, { x: 940, y: 700 },
          { x: 853, y: 640 },
        ],
      },
    ],
    // Boundaries mid-gap between the lanes' angles from the Druid: West 128°–203°, North
    // 225°–335°, South-east 348°–51°.
    sectorBoundaryAngles: [90, 214, 341], // TUNING
    sectorNames: ['W', 'N', 'SE'],
    nearRadius: 440,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    zoneQuotaOverrides: {},
    // Candidates meeting every M1c rule, placed by solver; the zones with fewer than the M1j
    // target of 4 near / 6 far have no room for more under the spacing rules.
    candidateLocations: [
      // nW
      { x: 465,  y: 460,  zone: 'nW' },
      { x: 385,  y: 600,  zone: 'nW' },
      { x: 715,  y: 760,  zone: 'nW' },
      { x: 745,  y: 1005, zone: 'nW' },
      // fW
      { x: 135,  y: 185,  zone: 'fW' },
      { x: 375,  y: 320,  zone: 'fW' },
      { x: 75,   y: 455,  zone: 'fW' },
      { x: 265,  y: 730,  zone: 'fW' },
      { x: 390,  y: 845,  zone: 'fW' },
      // nN
      { x: 730,  y: 295,  zone: 'nN' },
      { x: 1060, y: 315,  zone: 'nN' },
      { x: 1200, y: 405,  zone: 'nN' },
      // fN
      { x: 305,  y: 170,  zone: 'fN' },
      { x: 475,  y: 175,  zone: 'fN' },
      { x: 1850, y: 195,  zone: 'fN' },
      { x: 1395, y: 360,  zone: 'fN' },
      // nSE
      { x: 1090, y: 570,  zone: 'nSE' },
      { x: 1175, y: 740,  zone: 'nSE' },
      { x: 880,  y: 825,  zone: 'nSE' },
      { x: 950,  y: 1010, zone: 'nSE' },
      // fSE
      { x: 1850, y: 360,  zone: 'fSE' },
      { x: 1295, y: 535,  zone: 'fSE' },
      { x: 1660, y: 565,  zone: 'fSE' },
      { x: 1560, y: 705,  zone: 'fSE' },
      { x: 1840, y: 830,  zone: 'fSE' },
      { x: 1490, y: 1000, zone: 'fSE' },
    ],
    decorSeed: 2024,
    decorDensity: 0.9,                    // TUNING — a little sparser: open, misty ground
    palette: {                            // cold, misty grey-green
      floor: '#38483f',
      floorAccent: { dark: 'rgba(18, 28, 26, 0.35)', light: 'rgba(170, 190, 182, 0.16)' },
      corridor: { base: '#6a665a', worn: 'rgba(175, 170, 155, 0.3)' },
      corridorEdge: '#35342c',
      treeDark: { trunk: '#3e3a34', canopy: ['#2c3b36', '#33443c', '#293934'] },
      treeLight: ['#44564e', '#4b5e54', '#3f534c'],
      rock: { base: '#7a807c', light: '#9ba19d', dark: '#565b58' },
      vegetation: { base: '#3d5348', light: '#566d60' },
      mapTint: '#8aa69a',
    },
    // TUNING — 44 wolves in 14 bursts (Tornville: 35 in 12), slightly larger and closer
    // together, the last at 55 s; Bears at 22 / 32 / 42 s.
    wave: {
      north:     [{ time: 0, count: 3 }, { time: 9, count: 3 }, { time: 18, count: 4 }, { time: 22, count: 1, type: 'bear' }, { time: 29, count: 3 }, { time: 41, count: 3 }],
      west:      [{ time: 3, count: 3 }, { time: 12, count: 3 }, { time: 22, count: 3 }, { time: 32, count: 1, type: 'bear' }, { time: 34, count: 4 }, { time: 48, count: 3 }],
      southEast: [{ time: 6, count: 3 }, { time: 16, count: 3 }, { time: 38, count: 3 }, { time: 42, count: 1, type: 'bear' }, { time: 55, count: 3 }],
    },
    bosses: [],                           // M2c §3: none yet
    enemyCounts: { wolf: 44, bear: 3 },
    stepBudget: 102,                      // TUNING — Tornville's; calibrate from the reported route cost
  },
  // Option B: brutes (M2a §5.2). Lanes enter from the top-left, the bottom and the right; the
  // Druid stands right of centre and higher.
  blackthorn: {
    name: 'Blackthorn Hollow',
    description: 'Thick thorns hide heavy beasts.',
    druidPos: { x: 1120, y: 480 },
    lanes: [
      {
        id: 'northWest',
        name: 'North-west',
        waypoints: [
          { x: 300, y: -40 }, { x: 290, y: 160 }, { x: 170, y: 270 }, { x: 190, y: 420 }, { x: 340, y: 490 },
          { x: 480, y: 420 }, { x: 560, y: 290 }, { x: 700, y: 220 }, { x: 850, y: 190 }, { x: 990, y: 150 },
          { x: 1080, y: 210 }, { x: 1110, y: 320 }, { x: 1115, y: 428 },
        ],
      },
      {
        id: 'south',
        name: 'South',
        waypoints: [
          { x: 520, y: 1120 }, { x: 540, y: 970 }, { x: 400, y: 900 }, { x: 330, y: 760 }, { x: 440, y: 650 },
          { x: 590, y: 660 }, { x: 660, y: 780 }, { x: 780, y: 880 }, { x: 930, y: 930 }, { x: 1070, y: 880 },
          { x: 1120, y: 760 }, { x: 1060, y: 650 }, { x: 1100, y: 570 }, { x: 1111, y: 531 },
        ],
      },
      {
        id: 'east',
        name: 'East',
        waypoints: [
          { x: 1960, y: 820 }, { x: 1800, y: 860 }, { x: 1660, y: 800 }, { x: 1620, y: 660 }, { x: 1720, y: 560 },
          { x: 1840, y: 460 }, { x: 1800, y: 320 }, { x: 1660, y: 250 }, { x: 1500, y: 290 }, { x: 1440, y: 410 },
          { x: 1480, y: 530 }, { x: 1380, y: 600 }, { x: 1260, y: 540 }, { x: 1170, y: 493 },
        ],
      },
    ],
    // Boundaries mid-gap between the lanes' angles from the Druid: South 90°–166°, North-west
    // 179°–267°, East 333°–31°.
    sectorBoundaryAngles: [60, 172, 300], // TUNING
    sectorNames: ['S', 'NW', 'E'],
    nearRadius: 400,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    zoneQuotaOverrides: {},
    // Candidates meeting every M1c rule, placed by solver; the zones with fewer than the M1j
    // target of 4 near / 6 far have no room for more under the spacing rules.
    candidateLocations: [
      // nS
      { x: 920,  y: 590,  zone: 'nS' },
      { x: 760,  y: 610,  zone: 'nS' },
      { x: 870,  y: 745,  zone: 'nS' },
      { x: 1295, y: 830,  zone: 'nS' },
      // fS
      { x: 275,  y: 610,  zone: 'fS' },
      { x: 140,  y: 710,  zone: 'fS' },
      { x: 475,  y: 785,  zone: 'fS' },
      { x: 200,  y: 870,  zone: 'fS' },
      { x: 1215, y: 970,  zone: 'fS' },
      { x: 685,  y: 985,  zone: 'fS' },
      // nNW
      { x: 1235, y: 250,  zone: 'nNW' },
      { x: 965,  y: 285,  zone: 'nNW' },
      { x: 840,  y: 385,  zone: 'nNW' },
      { x: 990,  y: 445,  zone: 'nNW' },
      // fNW
      { x: 95,   y: 155,  zone: 'fNW' },
      { x: 475,  y: 195,  zone: 'fNW' },
      { x: 360,  y: 350,  zone: 'fNW' },
      { x: 620,  y: 490,  zone: 'fNW' },
      { x: 80,   y: 540,  zone: 'fNW' },
      // nE
      { x: 1405, y: 205,  zone: 'nE' },
      { x: 1295, y: 415,  zone: 'nE' },
      { x: 1235, y: 675,  zone: 'nE' },
      { x: 1430, y: 730,  zone: 'nE' },
      // fE
      { x: 1800, y: 155,  zone: 'fE' },
      { x: 1630, y: 420,  zone: 'fE' },
      { x: 1780, y: 725,  zone: 'fE' },
      { x: 1495, y: 920,  zone: 'fE' },
      { x: 1795, y: 1000, zone: 'fE' },
      { x: 1635, y: 1005, zone: 'fE' },
    ],
    decorSeed: 4242,
    decorDensity: 1.35,                   // TUNING — dense undergrowth
    thornBushes: true,                    // spiky thorn bushes instead of round ones (M2a §5.3)
    palette: {                            // dark, purple-brown, thorny
      floor: '#2c2330',
      floorAccent: { dark: 'rgba(14, 8, 14, 0.4)', light: 'rgba(95, 62, 84, 0.2)' },
      corridor: { base: '#5a4637', worn: 'rgba(135, 104, 82, 0.3)' },
      corridorEdge: '#281c17',
      treeDark: { trunk: '#38241f', canopy: ['#2c1e2a', '#382332', '#29212f'] },
      treeLight: ['#482f42', '#53354a', '#41303e'],
      rock: { base: '#5e5560', light: '#7a6f7c', dark: '#3e3740' },
      vegetation: { base: '#3f2836', light: '#7a4a62' },
      mapTint: '#6e4c66',
    },
    // TUNING — 36 wolves, pacing like Tornville; Bears at 18 / 26 / 34 / 42 / 50 s (spread
    // across lanes at random each run, M2a §5.4).
    wave: {
      northWest: [{ time: 0, count: 3 }, { time: 12, count: 3 }, { time: 18, count: 1, type: 'bear' }, { time: 24, count: 3 }, { time: 40, count: 4 }, { time: 42, count: 1, type: 'bear' }],
      south:     [{ time: 5, count: 3 }, { time: 16, count: 3 }, { time: 26, count: 1, type: 'bear' }, { time: 30, count: 3 }, { time: 48, count: 3 }, { time: 50, count: 1, type: 'bear' }],
      east:      [{ time: 9, count: 3 }, { time: 20, count: 2 }, { time: 34, count: 1, type: 'bear' }, { time: 35, count: 3 }, { time: 52, count: 3 }],
    },
    bosses: [],                           // M2c §3: none yet
    enemyCounts: { wolf: 36, bear: 5 },
    stepBudget: 102,                      // TUNING — Tornville's; calibrate from the reported route cost
  },
  // Level 3 (M2b §3.2): narrow causeways between flooded ground. Lanes enter from the right, the
  // bottom and the left; the Druid stands up and left of centre. Tight bends bunch enemies up,
  // and the 90 px corridors stop wolves from passing Bears.
  drowned: {
    name: 'The Drowned Hamlet',
    description: 'Half-sunk cottages and narrow causeways.',
    druidPos: { x: 760, y: 330 },
    corridorWidth: 90,                    // TUNING — narrow (M2b §3.1)
    featureMix: { tree: 1, reedPatch: 2, shrub: 1, ruins: 1, pond: 4 }, // TUNING — water-rich, few Boughs
    lanes: [
      {
        id: 'east',
        name: 'East',
        waypoints: [
          { x: 1960, y: 780 }, { x: 1810, y: 800 }, { x: 1700, y: 700 }, { x: 1750, y: 580 }, { x: 1680, y: 460 },
          { x: 1760, y: 350 }, { x: 1700, y: 220 }, { x: 1560, y: 200 }, { x: 1470, y: 300 }, { x: 1500, y: 430 },
          { x: 1430, y: 560 }, { x: 1300, y: 600 }, { x: 1180, y: 520 }, { x: 1150, y: 400 }, { x: 1040, y: 330 },
          { x: 920, y: 360 }, { x: 812, y: 330 },
        ],
      },
      {
        id: 'south',
        name: 'South',
        waypoints: [
          { x: 1620, y: 1120 }, { x: 1640, y: 980 }, { x: 1560, y: 870 }, { x: 1420, y: 850 }, { x: 1340, y: 960 },
          { x: 1210, y: 1000 }, { x: 1100, y: 920 }, { x: 960, y: 980 }, { x: 820, y: 970 }, { x: 720, y: 860 },
          { x: 800, y: 740 }, { x: 960, y: 700 }, { x: 1020, y: 590 }, { x: 940, y: 500 }, { x: 820, y: 480 },
          { x: 751, y: 381 },
        ],
      },
      {
        id: 'southWest',
        name: 'South-west',
        waypoints: [
          { x: -40, y: 900 }, { x: 120, y: 910 }, { x: 240, y: 850 }, { x: 380, y: 920 }, { x: 510, y: 850 },
          { x: 480, y: 720 }, { x: 340, y: 660 }, { x: 260, y: 560 }, { x: 330, y: 450 }, { x: 290, y: 330 },
          { x: 160, y: 300 }, { x: 140, y: 190 }, { x: 260, y: 130 }, { x: 420, y: 170 }, { x: 560, y: 190 },
          { x: 680, y: 250 }, { x: 715, y: 304 },
        ],
      },
    ],
    // Boundaries in the gaps between the lanes' angles from the Druid: East 351°–27°, South
    // 34°–94°, South-west 116°–226°; 300° sits late in the open gap above the Druid.
    sectorBoundaryAngles: [30, 105, 300], // TUNING
    sectorNames: ['S', 'SW', 'E'],
    nearRadius: 460,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    // nS fits only 2 candidates (the South lane runs through it), so its resource spot moves to fS.
    zoneQuotaOverrides: {
      nS: { turret: 2, feature: 0 },      // TUNING
      fS: { turret: 2, feature: 3 },      // TUNING
    },
    // Candidates meeting every M1c rule with the 90 px corridors, placed by solver; zones short of
    // 4 near / 6 far have no room for more.
    candidateLocations: [
      // nS
      { x: 830,  y: 605,  zone: 'nS' },
      { x: 685,  y: 675,  zone: 'nS' },
      // fS
      { x: 1090, y: 750,  zone: 'fS' },
      { x: 1340, y: 745,  zone: 'fS' },
      { x: 885,  y: 835,  zone: 'fS' },
      { x: 1240, y: 875,  zone: 'fS' },
      { x: 1770, y: 915,  zone: 'fS' },
      { x: 590,  y: 985,  zone: 'fS' },
      // nSW
      { x: 795,  y: 155,  zone: 'nSW' },
      { x: 425,  y: 290,  zone: 'nSW' },
      { x: 565,  y: 395,  zone: 'nSW' },
      { x: 430,  y: 565,  zone: 'nSW' },
      // fSW
      { x: 150,  y: 430,  zone: 'fSW' },
      { x: 95,   y: 605,  zone: 'fSW' },
      { x: 245,  y: 735,  zone: 'fSW' },
      { x: 90,   y: 785,  zone: 'fSW' },
      // nE
      { x: 1130, y: 150,  zone: 'nE' },
      { x: 975,  y: 205,  zone: 'nE' },
      { x: 1210, y: 290,  zone: 'nE' },
      // fE
      { x: 1400, y: 150,  zone: 'fE' },
      { x: 1845, y: 165,  zone: 'fE' },
      { x: 1615, y: 345,  zone: 'fE' },
      { x: 1365, y: 385,  zone: 'fE' },
      { x: 1850, y: 490,  zone: 'fE' },
      { x: 1510, y: 670,  zone: 'fE' },
    ],
    decorSeed: 3131,
    decorDensity: 0.8,                    // TUNING — the water patches take much of the ground
    // Dark water patches (outside corridors and candidates), each with a sunken roof or broken
    // fence and reeds round its edge (M2b §3.2). edge: extra px kept clear round each patch.
    flats: { kind: 'water', count: 12, rx: [42, 80], ry: [24, 42], edge: 8 }, // TUNING
    decorProps: { reeds: 0.2 },           // TUNING — extra reed tufts, per cell
    palette: {                            // cold blue-grey, wet stone, dark water
      floor: '#2c3a3f',
      floorAccent: { dark: 'rgba(8, 16, 22, 0.4)', light: 'rgba(120, 150, 165, 0.16)' },
      corridor: { base: '#5d605a', worn: 'rgba(150, 160, 160, 0.3)' },
      corridorEdge: '#24292b',
      treeDark: { trunk: '#33302c', canopy: ['#22343a', '#283c40', '#203135'] },
      treeLight: ['#3a5258', '#405a5e', '#36504f'],
      rock: { base: '#6b747a', light: '#8d979c', dark: '#474e53' },
      vegetation: { base: '#3c5550', light: '#7c9470' },
      water: { deep: '#121d26', rim: '#283840', ripple: 'rgba(170, 200, 215, 0.35)' },
      roof: { dark: '#3a2c22', light: '#5e4a36' },
      mapTint: '#7f97a8',
    },
    // TUNING — 46 wolves in a steady stream of 2–3 wolf bursts, each lane every 9 s, the lanes
    // 3 s apart (a burst somewhere every 3 s), the last at 55 s; Bears at 16 / 28 / 40 / 52 s.
    wave: {
      east:      [{ time: 0, count: 3 }, { time: 9, count: 2 }, { time: 18, count: 3 }, { time: 27, count: 2 }, { time: 28, count: 1, type: 'bear' }, { time: 36, count: 3 }, { time: 45, count: 3 }],
      south:     [{ time: 3, count: 2 }, { time: 12, count: 3 }, { time: 16, count: 1, type: 'bear' }, { time: 21, count: 2 }, { time: 30, count: 3 }, { time: 39, count: 2 }, { time: 48, count: 3 }, { time: 52, count: 1, type: 'bear' }],
      southWest: [{ time: 6, count: 3 }, { time: 15, count: 2 }, { time: 24, count: 3 }, { time: 33, count: 2 }, { time: 40, count: 1, type: 'bear' }, { time: 42, count: 3 }, { time: 55, count: 2 }],
    },
    bosses: [],                           // M2c §3: none yet
    enemyCounts: { wolf: 46, bear: 4 },
    stepBudget: 110,                      // TUNING — feature route median 114, 90% ≤ 119 (≤ 1.10 × budget)
  },
  // Level 3 (M2b §3.3): huge wolf surges down wide corridors. Lanes enter from the top, the left
  // and the right; the Druid stands right of centre inside a ring of standing stones.
  wychwood: {
    name: 'Wychwood Circle',
    description: 'The old stones hum. The packs come in great surges.',
    druidPos: { x: 1120, y: 540 },
    corridorWidth: 130,                   // TUNING — wide (M2b §3.1)
    featureMix: { tree: 2, reedPatch: 1, shrub: 3, ruins: 2, pond: 1 }, // TUNING — Shrub-rich
    lanes: [
      {
        id: 'north',
        name: 'North',
        waypoints: [
          { x: 380, y: -40 }, { x: 400, y: 130 }, { x: 560, y: 210 }, { x: 740, y: 160 }, { x: 920, y: 220 },
          { x: 1100, y: 160 }, { x: 1300, y: 140 }, { x: 1480, y: 190 }, { x: 1580, y: 320 }, { x: 1460, y: 410 },
          { x: 1300, y: 360 }, { x: 1170, y: 380 }, { x: 1129, y: 489 },
        ],
      },
      {
        id: 'west',
        name: 'West',
        waypoints: [
          { x: -40, y: 380 }, { x: 140, y: 380 }, { x: 260, y: 480 }, { x: 230, y: 620 }, { x: 140, y: 750 },
          { x: 220, y: 870 }, { x: 380, y: 860 }, { x: 480, y: 750 }, { x: 560, y: 620 }, { x: 520, y: 480 },
          { x: 640, y: 380 }, { x: 800, y: 400 }, { x: 880, y: 520 }, { x: 990, y: 570 }, { x: 1068, y: 540 },
        ],
      },
      {
        id: 'east',
        name: 'East',
        waypoints: [
          { x: 1960, y: 860 }, { x: 1820, y: 850 }, { x: 1710, y: 740 }, { x: 1560, y: 740 }, { x: 1490, y: 870 },
          { x: 1530, y: 1000 }, { x: 1390, y: 1010 }, { x: 1250, y: 960 }, { x: 1090, y: 1000 }, { x: 940, y: 1010 },
          { x: 840, y: 920 }, { x: 880, y: 790 }, { x: 1010, y: 760 }, { x: 1100, y: 680 }, { x: 1133, y: 590 },
        ],
      },
    ],
    // Boundaries in the gaps between the lanes' angles from the Druid: East 19°–134°, West
    // 157°–204°, North 209°–340°.
    sectorBoundaryAngles: [5, 148, 200],  // TUNING
    sectorNames: ['E', 'W', 'N'],
    nearRadius: 480,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    // The wide corridors leave nW and nN room for 2 candidates each: both turret slots. Their
    // resource spots move to fE and fW.
    zoneQuotaOverrides: {
      nW: { turret: 2, feature: 0 },      // TUNING
      nN: { turret: 2, feature: 0 },      // TUNING
      fE: { turret: 2, feature: 3 },      // TUNING
      fW: { turret: 2, feature: 3 },      // TUNING
    },
    // Candidates meeting every M1c rule with the 130 px corridors, placed by solver; zones short
    // of 4 near / 6 far have no room for more.
    candidateLocations: [
      // nE
      { x: 1470, y: 580,  zone: 'nE' },
      { x: 1275, y: 655,  zone: 'nE' },
      { x: 720,  y: 790,  zone: 'nE' },
      { x: 1315, y: 820,  zone: 'nE' },
      // fE
      { x: 1660, y: 590,  zone: 'fE' },
      { x: 1825, y: 650,  zone: 'fE' },
      { x: 1635, y: 870,  zone: 'fE' },
      { x: 570,  y: 955,  zone: 'fE' },
      { x: 725,  y: 1010, zone: 'fE' },
      { x: 1730, y: 1010, zone: 'fE' },
      // nW
      { x: 690,  y: 555,  zone: 'nW' },
      { x: 815,  y: 660,  zone: 'nW' },
      // fW
      { x: 75,   y: 195,  zone: 'fW' },
      { x: 355,  y: 275,  zone: 'fW' },
      { x: 390,  y: 440,  zone: 'fW' },
      { x: 90,   y: 525,  zone: 'fW' },
      { x: 335,  y: 720,  zone: 'fW' },
      { x: 80,   y: 930,  zone: 'fW' },
      // nN
      { x: 1005, y: 360,  zone: 'nN' },
      { x: 1270, y: 495,  zone: 'nN' },
      // fN
      { x: 230,  y: 150,  zone: 'fN' },
      { x: 1640, y: 150,  zone: 'fN' },
      { x: 1745, y: 290,  zone: 'fN' },
      { x: 1750, y: 455,  zone: 'fN' },
    ],
    decorSeed: 5150,
    decorDensity: 1.1,                    // TUNING
    gnarledTrees: true,                   // twisted old trees (M2b §3.3)
    // Standing stones in a ring round the Druid (left out where a corridor or candidate is in the way).
    stoneRing: { radius: [125, 420], count: 16, size: 0.6 }, // TUNING — each stone at the first clear radius
    decorProps: { mushrooms: 0.25 },      // TUNING — small glowing mushrooms, per cell
    palette: {                            // deep green with violet, a faint glow
      floor: '#1e3224',
      floorAccent: { dark: 'rgba(8, 14, 18, 0.4)', light: 'rgba(120, 90, 170, 0.16)' },
      corridor: { base: '#574b52', worn: 'rgba(150, 130, 165, 0.3)' },
      corridorEdge: '#28202e',
      treeDark: { trunk: '#2f2530', canopy: ['#1d3524', '#24402c', '#2a2f45'] },
      treeLight: ['#2f5838', '#3a6040', '#4a3f6e'],
      rock: { base: '#6a6878', light: '#8d8aa0', dark: '#46445a' },
      vegetation: { base: '#2a4a34', light: '#6a4f8e' },
      glow: 'rgba(170, 255, 205, 0.55)',
      mushroom: { cap: '#b48ce0', stem: '#d8d0c0' },
      mapTint: '#7a6aa8',
    },
    // TUNING — 54 wolves: three surges (5, 5, 6 wolves into each lane, the lanes 1 s apart) at
    // about 8, 28 and 48 s, with single wolves between; Bears at 20 / 38 / 56 s.
    wave: {
      north: [{ time: 8, count: 5 }, { time: 22, count: 1 }, { time: 28, count: 5 }, { time: 38, count: 1, type: 'bear' }, { time: 40, count: 1 }, { time: 48, count: 6 }],
      west:  [{ time: 9, count: 5 }, { time: 17, count: 1 }, { time: 20, count: 1, type: 'bear' }, { time: 29, count: 5 }, { time: 42, count: 1 }, { time: 49, count: 6 }],
      east:  [{ time: 10, count: 5 }, { time: 19, count: 1 }, { time: 30, count: 5 }, { time: 37, count: 1 }, { time: 50, count: 6 }, { time: 56, count: 1, type: 'bear' }],
    },
    bosses: [],                           // M2c §3: none yet
    enemyCounts: { wolf: 54, bear: 3 },
    stepBudget: 126,                      // TUNING — feature route median 134, 90% ≤ 138 (≤ 1.10 × budget)
  },
  // Level 3 (M2b §3.4), a Fell Wilds since M2c §1.4: its Ogre is the main threat. Lanes enter from the left, the top and the top of the
  // right edge; the Druid stands low, beside a great burial mound.
  barrow: {
    name: 'Forgotten Barrow',
    description: 'Something stirs beneath the mound.',
    druidPos: { x: 880, y: 800 },
    featureMix: { tree: 2, reedPatch: 1, shrub: 1, ruins: 4, pond: 1 }, // TUNING — Ruins-rich
    lanes: [
      {
        id: 'west',
        name: 'West',
        waypoints: [
          { x: -40, y: 250 }, { x: 140, y: 260 }, { x: 240, y: 380 }, { x: 170, y: 520 }, { x: 200, y: 680 },
          { x: 320, y: 770 }, { x: 460, y: 740 }, { x: 520, y: 620 }, { x: 460, y: 490 }, { x: 540, y: 370 },
          { x: 680, y: 330 }, { x: 780, y: 420 }, { x: 740, y: 560 }, { x: 790, y: 690 }, { x: 837, y: 770 },
        ],
      },
      {
        id: 'north',
        name: 'North',
        waypoints: [
          { x: 1340, y: -40 }, { x: 1380, y: 120 }, { x: 1530, y: 170 }, { x: 1630, y: 290 }, { x: 1580, y: 410 },
          { x: 1460, y: 420 }, { x: 1380, y: 370 }, { x: 1260, y: 280 }, { x: 1110, y: 240 }, { x: 960, y: 290 },
          { x: 920, y: 420 }, { x: 1020, y: 510 }, { x: 1090, y: 620 }, { x: 1010, y: 710 }, { x: 906, y: 755 },
        ],
      },
      {
        id: 'east',
        name: 'East',
        waypoints: [
          { x: 1960, y: 150 }, { x: 1820, y: 200 }, { x: 1780, y: 330 }, { x: 1830, y: 450 }, { x: 1810, y: 560 },
          { x: 1690, y: 610 }, { x: 1640, y: 740 }, { x: 1740, y: 860 }, { x: 1620, y: 990 }, { x: 1460, y: 990 },
          { x: 1360, y: 900 }, { x: 1300, y: 790 }, { x: 1180, y: 800 }, { x: 1120, y: 920 }, { x: 980, y: 980 },
          { x: 930, y: 900 }, { x: 898, y: 849 },
        ],
      },
    ],
    // Boundaries in the gaps between the lanes' angles from the Druid: West 183°–255°, North
    // 275°–331°, East 327°–68° (North and East meet at the Druid); 130° is in the open ground
    // round the mound.
    sectorBoundaryAngles: [130, 263, 329], // TUNING
    sectorNames: ['W', 'N', 'E'],
    nearRadius: 480,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    // nE fits 2 candidates and fN 3; their resource spots move to fW and fE.
    zoneQuotaOverrides: {
      nE: { turret: 2, feature: 0 },      // TUNING
      fN: { turret: 2, feature: 1 },      // TUNING
      fW: { turret: 2, feature: 3 },      // TUNING
      fE: { turret: 2, feature: 3 },      // TUNING
    },
    // Candidates meeting every M1c rule and clear of the mound, placed by solver; zones short of
    // 4 near / 6 far have no room for more.
    candidateLocations: [
      // nW
      { x: 615,  y: 495,  zone: 'nW' },
      { x: 635,  y: 710,  zone: 'nW' },
      { x: 410,  y: 895,  zone: 'nW' },
      // fW
      { x: 730,  y: 150,  zone: 'fW' },
      { x: 485,  y: 185,  zone: 'fW' },
      { x: 285,  y: 195,  zone: 'fW' },
      { x: 70,   y: 415,  zone: 'fW' },
      { x: 340,  y: 535,  zone: 'fW' },
      { x: 220,  y: 880,  zone: 'fW' },
      // nN
      { x: 1065, y: 380,  zone: 'nN' },
      { x: 1195, y: 495,  zone: 'nN' },
      { x: 915,  y: 595,  zone: 'nN' },
      // fN
      { x: 890,  y: 165,  zone: 'fN' },
      { x: 1700, y: 150,  zone: 'fN' },
      { x: 1355, y: 510,  zone: 'fN' },
      // nE
      { x: 1240, y: 655,  zone: 'nE' },
      { x: 1255, y: 970,  zone: 'nE' },
      // fE
      { x: 1700, y: 465,  zone: 'fE' },
      { x: 1535, y: 590,  zone: 'fE' },
      { x: 1410, y: 690,  zone: 'fE' },
      { x: 1820, y: 740,  zone: 'fE' },
      { x: 1510, y: 850,  zone: 'fE' },
      { x: 1845, y: 945,  zone: 'fE' },
    ],
    decorSeed: 6066,
    decorDensity: 0.75,                   // TUNING — open, dry grassland
    // The burial mound beside the Druid: base centre, size = half-width (px).
    landmarks: [{ kind: 'mound', x: 630, y: 985, size: 135 }], // TUNING
    flats: { kind: 'mist', count: 9, rx: [90, 170], ry: [28, 50], edge: 0 }, // TUNING — low mist patches, a faint ground tint drawn anywhere
    decorProps: { gravestone: 0.15, slab: 0.08 }, // TUNING — per cell
    palette: {                            // pale ochre, dry grass, grey stone
      floor: '#66603e',
      floorAccent: { dark: 'rgba(40, 34, 16, 0.28)', light: 'rgba(215, 195, 135, 0.2)' },
      corridor: { base: '#8a7a5a', worn: 'rgba(205, 185, 145, 0.3)' },
      corridorEdge: '#4a4030',
      treeDark: { trunk: '#4a3a28', canopy: ['#4f5a2e', '#5a6234', '#46502a'] },
      treeLight: ['#6e7a40', '#7a8448', '#646e3a'],
      rock: { base: '#8a8a84', light: '#aaaaa2', dark: '#5e5e58' },
      vegetation: { base: '#6e6a38', light: '#9a9050' },
      mound: { dark: '#5b6833', light: '#7a8846' },
      mist: 'rgba(235, 235, 225, 0.22)',
      mapTint: '#c2a865',
    },
    // TUNING — a Fell Wilds (M2c §1.4): the Ogre is the main threat. 44 wolves, pacing like
    // Tornville but larger; Bears at 15 / 30 / 45 s (spread across the lanes at random each run,
    // M2a §5.4); the Ogre at 20 s on a random lane, arriving near the end.
    wave: {
      west:  [{ time: 0, count: 3 }, { time: 11, count: 3 }, { time: 15, count: 1, type: 'bear' }, { time: 22, count: 3 }, { time: 34, count: 3 }, { time: 47, count: 3 }],
      north: [{ time: 4, count: 3 }, { time: 15, count: 3 }, { time: 27, count: 3 }, { time: 30, count: 1, type: 'bear' }, { time: 40, count: 3 }, { time: 52, count: 3 }],
      east:  [{ time: 8, count: 3 }, { time: 19, count: 3 }, { time: 30, count: 3 }, { time: 43, count: 3 }, { time: 45, count: 1, type: 'bear' }, { time: 56, count: 2 }],
    },
    bosses: [{ type: 'ogre', time: 20, lane: 'random' }], // TUNING
    enemyCounts: { wolf: 44, bear: 3, ogre: 1 },
    stepBudget: 106,                      // TUNING — feature route median 112, 90% ≤ 116 (≤ 1.10 × budget)
  },
  // Rows 4–5 (M2f §4.1–4.5). Geometry (lanes, Druid, sectors, candidates) mirrored from earlier
  // levels for speed; everything else is their own.
  // charcoal: geometry mirrored from tornville (horizontally).
  charcoal: {
    druidPos: { x: 910, y: 600 },
    lanes: [
      {
        id: 'upperRight',
        name: 'Upper-right',
        waypoints: [
          { x: 1960, y: 250 }, { x: 1740, y: 280 }, { x: 1560, y: 205 }, { x: 1380, y: 210 }, { x: 1295, y: 290 },
          { x: 1320, y: 385 }, { x: 1420, y: 425 }, { x: 1465, y: 490 }, { x: 1430, y: 570 }, { x: 1320, y: 615 },
          { x: 1200, y: 580 }, { x: 1145, y: 470 }, { x: 1150, y: 340 }, { x: 1115, y: 255 }, { x: 1045, y: 215 },
          { x: 972, y: 258 }, { x: 940, y: 345 }, { x: 930, y: 450 }, { x: 919, y: 549 },
        ],
      },
      {
        id: 'left',
        name: 'Left',
        waypoints: [
          { x: -60, y: 430 }, { x: 160, y: 460 }, { x: 300, y: 340 }, { x: 480, y: 330 }, { x: 570, y: 375 },
          { x: 580, y: 470 }, { x: 500, y: 560 }, { x: 375, y: 605 }, { x: 315, y: 700 }, { x: 360, y: 800 },
          { x: 540, y: 860 }, { x: 700, y: 760 }, { x: 770, y: 650 }, { x: 861, y: 618 },
        ],
      },
      {
        id: 'bottomRight',
        name: 'Bottom-right',
        waypoints: [
          { x: 1670, y: 1140 }, { x: 1650, y: 975 }, { x: 1780, y: 880 }, { x: 1795, y: 755 }, { x: 1635, y: 660 },
          { x: 1430, y: 740 }, { x: 1325, y: 955 }, { x: 1180, y: 1000 }, { x: 1030, y: 980 }, { x: 945, y: 895 },
          { x: 930, y: 790 }, { x: 919, y: 651 },
        ],
      },
    ],
    sectorBoundaryAngles: [4, 115, 220], // TUNING
    sectorNames: ['SE', 'W', 'NE'],
    nearRadius: 460,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    zoneQuotaOverrides: {
      fSE: { turret: 2, feature: 0 }, // TUNING
      nSE: { turret: 2, feature: 2 }, // TUNING
      fW: { turret: 2, feature: 3 }, // TUNING
    },
    candidateLocations: [
      { x: 810 , y: 370 , zone: 'nNE' },
      { x: 1045, y: 570 , zone: 'nNE' },
      { x: 750 , y: 210 , zone: 'nNE' },
      { x: 900 , y: 150 , zone: 'nNE' },
      { x: 1710, y: 405 , zone: 'fNE' },
      { x: 1500, y: 325 , zone: 'fNE' },
      { x: 1590, y: 535 , zone: 'fNE' },
      { x: 1220, y: 165 , zone: 'fNE' },
      { x: 1820, y: 605 , zone: 'fNE' },
      { x: 1820, y: 150 , zone: 'fNE' },
      { x: 695 , y: 520 , zone: 'nW' },
      { x: 500 , y: 715 , zone: 'nW' },
      { x: 640 , y: 970 , zone: 'nW' },
      { x: 385 , y: 465 , zone: 'fW' },
      { x: 200 , y: 610 , zone: 'fW' },
      { x: 220 , y: 880 , zone: 'fW' },
      { x: 140 , y: 300 , zone: 'fW' },
      { x: 100 , y: 750 , zone: 'fW' },
      { x: 1190, y: 845 , zone: 'nSE' },
      { x: 805 , y: 855 , zone: 'nSE' },
      { x: 850 , y: 1010, zone: 'nSE' },
      { x: 1055, y: 740 , zone: 'nSE' },
      { x: 1545, y: 870 , zone: 'fSE' },
      { x: 1455, y: 1005, zone: 'fSE' },
    ],
    name: "Charcoal Burner's Camp",
    description: 'Smoke hangs low over the old kilns.',
    featureMix: { tree: 1, reedPatch: 1, shrub: 1, ruins: 4, pond: 2 }, // TUNING
    enemyHpMult: 1.1,                     // TUNING — row 4 (M2f §3.2)
    decorSeed: 7001,
    decorDensity: 0.9,                    // TUNING
    decorProps: { kiln: 0.08 },           // TUNING — signature: charcoal kilns, per cell
    palette: {                            // soot grey ground, dull orange embers, charred trees
      floor: '#38372f',
      floorAccent: { dark: 'rgba(12, 10, 8, 0.4)', light: 'rgba(150, 110, 70, 0.14)' },
      corridor: { base: '#5c5248', worn: 'rgba(150, 135, 115, 0.3)' },
      corridorEdge: '#28241f',
      treeDark: { trunk: '#221c18', canopy: ['#2e2b26', '#363129', '#2a2722'] },
      treeLight: ['#45403a', '#4c4640', '#403b35'],
      rock: { base: '#6b6862', light: '#8a8680', dark: '#4a4743' },
      vegetation: { base: '#4a4636', light: '#8a5a2a' },
      kiln: { dark: '#3d342c', light: '#5a4c3e' },
      ember: 'rgba(255, 140, 40, 0.75)',
      mapTint: '#8a6a4a',
    },
    // TUNING — 48 wolves; pressure alternates: two lanes busy while the third is quiet, rotating
    // every 15 s (upperRight + left, left + bottomRight, bottomRight + upperRight, then again).
    // Each Bear comes in a quiet spell (lanes shuffled at random each run, M2a §5.4).
    wave: {
      upperRight:  [{ time: 0, count: 3 }, { time: 7, count: 3 }, { time: 27, count: 1, type: 'bear' }, { time: 32, count: 3 }, { time: 39, count: 3 }, { time: 45, count: 3 }, { time: 52, count: 3 }],
      left:        [{ time: 2, count: 3 }, { time: 9, count: 3 }, { time: 15, count: 3 }, { time: 22, count: 3 }, { time: 42, count: 1, type: 'bear' }, { time: 47, count: 3 }, { time: 54, count: 3 }],
      bottomRight: [{ time: 12, count: 1, type: 'bear' }, { time: 17, count: 3 }, { time: 24, count: 3 }, { time: 30, count: 3 }, { time: 37, count: 3 }, { time: 57, count: 1, type: 'bear' }],
    },
    bosses: [],
    enemyCounts: { wolf: 48, bear: 4 },
    stepBudget: 114,                      // TUNING — feature route 90% ≤ 125 (≤ 1.10 × budget)
  },
  // stags: geometry mirrored from wychwood (vertically).
  stags: {
    druidPos: { x: 1120, y: 620 },
    lanes: [
      {
        id: 'south',
        name: 'South',
        waypoints: [
          { x: 380, y: 1200 }, { x: 400, y: 1030 }, { x: 560, y: 950 }, { x: 740, y: 1000 }, { x: 920, y: 940 },
          { x: 1100, y: 1000 }, { x: 1300, y: 1020 }, { x: 1480, y: 970 }, { x: 1580, y: 840 }, { x: 1460, y: 750 },
          { x: 1300, y: 800 }, { x: 1170, y: 780 }, { x: 1129, y: 671 },
        ],
      },
      {
        id: 'west',
        name: 'West',
        waypoints: [
          { x: -40, y: 780 }, { x: 140, y: 780 }, { x: 260, y: 680 }, { x: 230, y: 540 }, { x: 140, y: 410 },
          { x: 220, y: 290 }, { x: 380, y: 300 }, { x: 480, y: 410 }, { x: 560, y: 540 }, { x: 520, y: 680 },
          { x: 640, y: 780 }, { x: 800, y: 760 }, { x: 880, y: 640 }, { x: 990, y: 590 }, { x: 1068, y: 620 },
        ],
      },
      {
        id: 'east',
        name: 'East',
        waypoints: [
          { x: 1960, y: 300 }, { x: 1820, y: 310 }, { x: 1710, y: 420 }, { x: 1560, y: 420 }, { x: 1490, y: 290 },
          { x: 1530, y: 160 }, { x: 1390, y: 150 }, { x: 1250, y: 200 }, { x: 1090, y: 160 }, { x: 940, y: 150 },
          { x: 840, y: 240 }, { x: 880, y: 370 }, { x: 1010, y: 400 }, { x: 1100, y: 480 }, { x: 1133, y: 570 },
        ],
      },
    ],
    sectorBoundaryAngles: [355, 160, 212], // TUNING
    sectorNames: ['S', 'W', 'E'],
    nearRadius: 480,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    zoneQuotaOverrides: {
      nW: { turret: 2, feature: 0 }, // TUNING
      nS: { turret: 2, feature: 0 }, // TUNING
      fE: { turret: 2, feature: 3 }, // TUNING
      fW: { turret: 2, feature: 3 }, // TUNING
      // fS lost its corner candidate (under the level-name label): one resource spot moves to nE.
      fS: { turret: 2, feature: 1 }, // TUNING
      nE: { turret: 2, feature: 2 }, // TUNING
    },
    candidateLocations: [
      { x: 1470, y: 580 , zone: 'nE' },
      { x: 1275, y: 505 , zone: 'nE' },
      { x: 720 , y: 370 , zone: 'nE' },
      { x: 1315, y: 340 , zone: 'nE' },
      { x: 1660, y: 570 , zone: 'fE' },
      { x: 1825, y: 510 , zone: 'fE' },
      { x: 1635, y: 290 , zone: 'fE' },
      { x: 570 , y: 205 , zone: 'fE' },
      { x: 725 , y: 150 , zone: 'fE' },
      { x: 1730, y: 150 , zone: 'fE' },
      { x: 690 , y: 605 , zone: 'nW' },
      { x: 815 , y: 500 , zone: 'nW' },
      { x: 355 , y: 885 , zone: 'fW' },
      { x: 390 , y: 720 , zone: 'fW' },
      { x: 90  , y: 635 , zone: 'fW' },
      { x: 335 , y: 440 , zone: 'fW' },
      { x: 80  , y: 230 , zone: 'fW' },
      { x: 1005, y: 800 , zone: 'nS' },
      { x: 1270, y: 665 , zone: 'nS' },
      { x: 1640, y: 1010, zone: 'fS' },
      { x: 1745, y: 870 , zone: 'fS' },
      { x: 1750, y: 705 , zone: 'fS' },
    ],
    name: "Stag's Crossing",
    description: 'Where the old ford cuts through the forest.',
    corridorWidth: 130,                   // TUNING — wide
    featureMix: { tree: 2, reedPatch: 2, shrub: 1, ruins: 1, pond: 3 }, // TUNING
    enemyHpMult: 1.1,                     // TUNING — row 4
    decorSeed: 7002,
    decorDensity: 1,                      // TUNING
    // Signature: a shallow stream across the map, crossed by the corridors as fords (drawn under them).
    stream: {                             // TUNING — threads between the candidates, crossing the lanes
      width: 46,
      points: [{ x: 1560, y: 60 }, { x: 1500, y: 170 }, { x: 1455, y: 320 }, { x: 1375, y: 470 }, { x: 1370, y: 600 }, { x: 1420, y: 740 }, { x: 1460, y: 880 }, { x: 1520, y: 1000 }, { x: 1540, y: 1100 }],
    },
    palette: {                            // fresh greens, blue water
      floor: '#3a6630',
      floorAccent: { dark: 'rgba(18, 40, 14, 0.3)', light: 'rgba(150, 200, 90, 0.18)' },
      corridor: { base: '#7a6646', worn: 'rgba(170, 150, 110, 0.32)' },
      corridorEdge: '#423624',
      treeDark: { trunk: '#4a3524', canopy: ['#2a5a24', '#336a28', '#2a6030'] },
      treeLight: ['#4a8a34', '#56963a', '#4a8a44'],
      rock: { base: '#787a70', light: '#989a90', dark: '#55574f' },
      vegetation: { base: '#3a7030', light: '#6aa040' },
      water: { deep: '#2e6a8c', rim: '#3a5e3a', ripple: 'rgba(205, 232, 245, 0.45)' },
      mapTint: '#7aaa6a',
    },
    // TUNING — 52 wolves: fast, frequent small bursts (2 wolves every 6 s per lane, lanes 2 s apart);
    // Bears at 20 / 35 / 50 s.
    wave: {
      south: [{ time: 0, count: 2 }, { time: 6, count: 2 }, { time: 12, count: 2 }, { time: 18, count: 2 }, { time: 20, count: 1, type: 'bear' }, { time: 24, count: 2 }, { time: 30, count: 2 }, { time: 36, count: 2 }, { time: 42, count: 2 }, { time: 48, count: 2 }],
      west:  [{ time: 2, count: 2 }, { time: 8, count: 2 }, { time: 14, count: 2 }, { time: 20, count: 2 }, { time: 26, count: 2 }, { time: 32, count: 2 }, { time: 35, count: 1, type: 'bear' }, { time: 38, count: 2 }, { time: 44, count: 2 }, { time: 50, count: 2 }],
      east:  [{ time: 4, count: 2 }, { time: 10, count: 2 }, { time: 16, count: 2 }, { time: 22, count: 2 }, { time: 28, count: 2 }, { time: 34, count: 2 }, { time: 40, count: 2 }, { time: 46, count: 2 }, { time: 50, count: 1, type: 'bear' }],
    },
    bosses: [],
    enemyCounts: { wolf: 52, bear: 3 },
    stepBudget: 127,                      // TUNING — feature route 90% ≤ 139 (≤ 1.10 × budget)
  },
  // briar: geometry mirrored from blackthorn (both axes).
  briar: {
    druidPos: { x: 800, y: 680 },
    lanes: [
      {
        id: 'southEast',
        name: 'South-east',
        waypoints: [
          { x: 1620, y: 1200 }, { x: 1630, y: 1000 }, { x: 1750, y: 890 }, { x: 1730, y: 740 }, { x: 1580, y: 670 },
          { x: 1440, y: 740 }, { x: 1360, y: 870 }, { x: 1220, y: 940 }, { x: 1070, y: 970 }, { x: 930, y: 1010 },
          { x: 840, y: 950 }, { x: 810, y: 840 }, { x: 805, y: 732 },
        ],
      },
      {
        id: 'north',
        name: 'North',
        waypoints: [
          { x: 1400, y: 40 }, { x: 1380, y: 190 }, { x: 1520, y: 260 }, { x: 1590, y: 400 }, { x: 1480, y: 510 },
          { x: 1330, y: 500 }, { x: 1260, y: 380 }, { x: 1140, y: 280 }, { x: 990, y: 230 }, { x: 850, y: 280 },
          { x: 800, y: 400 }, { x: 860, y: 510 }, { x: 820, y: 590 }, { x: 809, y: 629 },
        ],
      },
      {
        id: 'west',
        name: 'West',
        waypoints: [
          { x: -40, y: 340 }, { x: 120, y: 300 }, { x: 260, y: 360 }, { x: 300, y: 500 }, { x: 200, y: 600 },
          { x: 80, y: 700 }, { x: 120, y: 840 }, { x: 260, y: 910 }, { x: 420, y: 870 }, { x: 480, y: 750 },
          { x: 440, y: 630 }, { x: 540, y: 560 }, { x: 660, y: 620 }, { x: 750, y: 667 },
        ],
      },
    ],
    sectorBoundaryAngles: [240, 352, 120], // TUNING
    sectorNames: ['N', 'SE', 'W'],
    nearRadius: 400,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    zoneQuotaOverrides: {},
    candidateLocations: [
      { x: 1000, y: 570 , zone: 'nN' },
      { x: 1160, y: 550 , zone: 'nN' },
      { x: 1050, y: 415 , zone: 'nN' },
      { x: 625 , y: 330 , zone: 'nN' },
      { x: 1645, y: 550 , zone: 'fN' },
      { x: 1780, y: 450 , zone: 'fN' },
      { x: 1445, y: 375 , zone: 'fN' },
      { x: 1720, y: 290 , zone: 'fN' },
      { x: 705 , y: 190 , zone: 'fN' },
      { x: 1235, y: 175 , zone: 'fN' },
      { x: 685 , y: 910 , zone: 'nSE' },
      { x: 955 , y: 875 , zone: 'nSE' },
      { x: 1080, y: 775 , zone: 'nSE' },
      { x: 930 , y: 715 , zone: 'nSE' },
      { x: 1825, y: 1005, zone: 'fSE' },
      { x: 1445, y: 965 , zone: 'fSE' },
      { x: 1560, y: 810 , zone: 'fSE' },
      { x: 1300, y: 670 , zone: 'fSE' },
      { x: 1840, y: 620 , zone: 'fSE' },
      { x: 515 , y: 955 , zone: 'nW' },
      { x: 625 , y: 745 , zone: 'nW' },
      { x: 685 , y: 485 , zone: 'nW' },
      { x: 490 , y: 430 , zone: 'nW' },
      { x: 290 , y: 740 , zone: 'fW' },
      { x: 140 , y: 435 , zone: 'fW' },
      { x: 425 , y: 240 , zone: 'fW' },
      { x: 125 , y: 160 , zone: 'fW' },
      { x: 285 , y: 155 , zone: 'fW' },
    ],
    name: 'Briar Chapel',
    description: 'Thorns have swallowed the old chapel.',
    corridorWidth: 95,                    // TUNING — narrow
    stuckTime: 1.8,                       // TUNING — s: Bears jam the narrow lanes for a while (M2f §4.3)
    featureMix: { tree: 2, reedPatch: 1, shrub: 3, ruins: 2, pond: 1 }, // TUNING
    enemyHpMult: 1.2,                     // TUNING — row 5
    decorSeed: 7003,
    decorDensity: 1.1,                    // TUNING
    thornBushes: true,
    // Signature: a ruined chapel wall overgrown with briars (base centre; size = half-width).
    landmarks: [{ kind: 'chapelWall', x: 710, y: 1050, size: 110 }], // TUNING — nearest clear spot to the Druid
    palette: {                            // dark green, deep red berries, grey stone
      floor: '#22361f',
      floorAccent: { dark: 'rgba(8, 16, 8, 0.4)', light: 'rgba(110, 140, 90, 0.14)' },
      corridor: { base: '#5a5246', worn: 'rgba(140, 130, 115, 0.3)' },
      corridorEdge: '#262620',
      treeDark: { trunk: '#3a2a20', canopy: ['#1c3a1c', '#22441f', '#1e3a26'] },
      treeLight: ['#2e5a2a', '#36622e', '#2e5a36'],
      rock: { base: '#7a7a76', light: '#9a9a94', dark: '#555552' },
      vegetation: { base: '#2c4a26', light: '#8a2030' },
      berry: '#b0202e',
      mapTint: '#6a3a3a',
    },
    // TUNING — 48 wolves, moderate; Bears spread evenly from 15 s (15 / 24 / 33 / 42 / 51 s).
    wave: {
      southEast: [{ time: 0, count: 3 }, { time: 11, count: 3 }, { time: 15, count: 1, type: 'bear' }, { time: 22, count: 4 }, { time: 33, count: 3 }, { time: 42, count: 1, type: 'bear' }, { time: 44, count: 3 }],
      north:     [{ time: 4, count: 3 }, { time: 15, count: 3 }, { time: 24, count: 1, type: 'bear' }, { time: 26, count: 3 }, { time: 37, count: 4 }, { time: 48, count: 3 }, { time: 51, count: 1, type: 'bear' }],
      west:      [{ time: 8, count: 3 }, { time: 19, count: 3 }, { time: 30, count: 3 }, { time: 33, count: 1, type: 'bear' }, { time: 41, count: 3 }, { time: 52, count: 4 }],
    },
    bosses: [],
    enemyCounts: { wolf: 48, bear: 5 },
    stepBudget: 117,                      // TUNING — feature route 90% ≤ 128 (≤ 1.10 × budget)
  },
  // causeway: geometry mirrored from drowned (horizontally).
  causeway: {
    druidPos: { x: 1160, y: 330 },
    lanes: [
      {
        id: 'west',
        name: 'West',
        waypoints: [
          { x: -40, y: 780 }, { x: 110, y: 800 }, { x: 220, y: 700 }, { x: 170, y: 580 }, { x: 240, y: 460 },
          { x: 160, y: 350 }, { x: 220, y: 220 }, { x: 360, y: 200 }, { x: 450, y: 300 }, { x: 420, y: 430 },
          { x: 490, y: 560 }, { x: 620, y: 600 }, { x: 740, y: 520 }, { x: 770, y: 400 }, { x: 880, y: 330 },
          { x: 1000, y: 360 }, { x: 1108, y: 330 },
        ],
      },
      {
        id: 'south',
        name: 'South',
        waypoints: [
          { x: 300, y: 1120 }, { x: 280, y: 980 }, { x: 360, y: 870 }, { x: 500, y: 850 }, { x: 580, y: 960 },
          { x: 710, y: 1000 }, { x: 820, y: 920 }, { x: 960, y: 980 }, { x: 1100, y: 970 }, { x: 1200, y: 860 },
          { x: 1120, y: 740 }, { x: 960, y: 700 }, { x: 900, y: 590 }, { x: 980, y: 500 }, { x: 1100, y: 480 },
          { x: 1169, y: 381 },
        ],
      },
      {
        id: 'southEast',
        name: 'South-east',
        waypoints: [
          { x: 1960, y: 900 }, { x: 1800, y: 910 }, { x: 1680, y: 850 }, { x: 1540, y: 920 }, { x: 1410, y: 850 },
          { x: 1440, y: 720 }, { x: 1580, y: 660 }, { x: 1660, y: 560 }, { x: 1590, y: 450 }, { x: 1630, y: 330 },
          { x: 1760, y: 300 }, { x: 1780, y: 190 }, { x: 1660, y: 130 }, { x: 1500, y: 170 }, { x: 1360, y: 190 },
          { x: 1240, y: 250 }, { x: 1205, y: 304 },
        ],
      },
    ],
    sectorBoundaryAngles: [150, 240, 75], // TUNING
    sectorNames: ['W', 'SE', 'S'],
    nearRadius: 460,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    zoneQuotaOverrides: {
      nS: { turret: 2, feature: 0 }, // TUNING
      fS: { turret: 2, feature: 3 }, // TUNING
    },
    candidateLocations: [
      { x: 1090, y: 605 , zone: 'nS' },
      { x: 1235, y: 675 , zone: 'nS' },
      { x: 830 , y: 750 , zone: 'fS' },
      { x: 580 , y: 745 , zone: 'fS' },
      { x: 1035, y: 835 , zone: 'fS' },
      { x: 680 , y: 875 , zone: 'fS' },
      { x: 150 , y: 915 , zone: 'fS' },
      { x: 1330, y: 985 , zone: 'fS' },
      { x: 1125, y: 155 , zone: 'nSE' },
      { x: 1495, y: 290 , zone: 'nSE' },
      { x: 1355, y: 395 , zone: 'nSE' },
      { x: 1490, y: 565 , zone: 'nSE' },
      { x: 1770, y: 430 , zone: 'fSE' },
      { x: 1825, y: 605 , zone: 'fSE' },
      { x: 1675, y: 735 , zone: 'fSE' },
      { x: 1830, y: 785 , zone: 'fSE' },
      { x: 790 , y: 150 , zone: 'nW' },
      { x: 945 , y: 205 , zone: 'nW' },
      { x: 710 , y: 290 , zone: 'nW' },
      { x: 520 , y: 150 , zone: 'fW' },
      { x: 75  , y: 165 , zone: 'fW' },
      { x: 305 , y: 345 , zone: 'fW' },
      { x: 555 , y: 385 , zone: 'fW' },
      { x: 70  , y: 490 , zone: 'fW' },
      { x: 410 , y: 670 , zone: 'fW' },
    ],
    name: 'Sunken Causeway',
    description: 'An old road drowned in black water.',
    corridorWidth: 90,                    // TUNING — narrow
    stuckTime: 2.5,                       // TUNING — s (M2f §4.4)
    featureMix: { tree: 1, reedPatch: 2, shrub: 1, ruins: 1, pond: 4 }, // TUNING
    enemyHpMult: 1.2,                     // TUNING — row 5
    decorSeed: 7004,
    decorDensity: 0.8,                    // TUNING
    // Signature: broken causeway stones half under water, in the water patches.
    flats: { kind: 'water', count: 12, rx: [42, 80], ry: [24, 42], edge: 8, props: ['sunkenStones'] }, // TUNING
    decorProps: { reeds: 0.15 },          // TUNING
    palette: {                            // dark teal water, grey-green stone
      floor: '#20383a',
      floorAccent: { dark: 'rgba(6, 18, 20, 0.45)', light: 'rgba(100, 150, 140, 0.14)' },
      corridor: { base: '#5a645c', worn: 'rgba(140, 160, 150, 0.3)' },
      corridorEdge: '#1e2a28',
      treeDark: { trunk: '#2e2c26', canopy: ['#1e3634', '#24403c', '#1c3230'] },
      treeLight: ['#335450', '#3a5c56', '#30504c'],
      rock: { base: '#6a786e', light: '#8a988e', dark: '#48544c' },
      vegetation: { base: '#2e4e44', light: '#6a8a5e' },
      water: { deep: '#0e2a2e', rim: '#22403c', ripple: 'rgba(150, 210, 200, 0.35)' },
      roof: { dark: '#3a2c22', light: '#5e4a36' },
      mapTint: '#4a8a86',
    },
    // TUNING — 52 wolves in a steady even stream (2–3 wolves every 9 s per lane, lanes 3 s apart);
    // Bears at 16 / 28 / 40 / 52 s.
    wave: {
      west:      [{ time: 0, count: 3 }, { time: 9, count: 3 }, { time: 16, count: 1, type: 'bear' }, { time: 18, count: 3 }, { time: 27, count: 3 }, { time: 36, count: 3 }, { time: 45, count: 3 }],
      south:     [{ time: 3, count: 3 }, { time: 12, count: 3 }, { time: 21, count: 3 }, { time: 28, count: 1, type: 'bear' }, { time: 30, count: 3 }, { time: 39, count: 2 }, { time: 48, count: 3 }],
      southEast: [{ time: 6, count: 3 }, { time: 15, count: 2 }, { time: 24, count: 3 }, { time: 33, count: 3 }, { time: 40, count: 1, type: 'bear' }, { time: 42, count: 3 }, { time: 51, count: 3 }, { time: 52, count: 1, type: 'bear' }],
    },
    bosses: [],
    enemyCounts: { wolf: 52, bear: 4 },
    stepBudget: 110,                      // TUNING — feature route 90% ≤ 121 (≤ 1.10 × budget)
  },
  // widows: geometry mirrored from wychwood (horizontally).
  widows: {
    druidPos: { x: 800, y: 540 },
    lanes: [
      {
        id: 'north',
        name: 'North',
        waypoints: [
          { x: 1540, y: -40 }, { x: 1520, y: 130 }, { x: 1360, y: 210 }, { x: 1180, y: 160 }, { x: 1000, y: 220 },
          { x: 820, y: 160 }, { x: 620, y: 140 }, { x: 440, y: 190 }, { x: 340, y: 320 }, { x: 460, y: 410 },
          { x: 620, y: 360 }, { x: 750, y: 380 }, { x: 791, y: 489 },
        ],
      },
      {
        id: 'east',
        name: 'East',
        waypoints: [
          { x: 1960, y: 380 }, { x: 1780, y: 380 }, { x: 1660, y: 480 }, { x: 1690, y: 620 }, { x: 1780, y: 750 },
          { x: 1700, y: 870 }, { x: 1540, y: 860 }, { x: 1440, y: 750 }, { x: 1360, y: 620 }, { x: 1400, y: 480 },
          { x: 1280, y: 380 }, { x: 1120, y: 400 }, { x: 1040, y: 520 }, { x: 930, y: 570 }, { x: 852, y: 540 },
        ],
      },
      {
        id: 'west',
        name: 'West',
        waypoints: [
          { x: -40, y: 860 }, { x: 100, y: 850 }, { x: 210, y: 740 }, { x: 360, y: 740 }, { x: 430, y: 870 },
          { x: 390, y: 1000 }, { x: 530, y: 1010 }, { x: 670, y: 960 }, { x: 830, y: 1000 }, { x: 980, y: 1010 },
          { x: 1080, y: 920 }, { x: 1040, y: 790 }, { x: 910, y: 760 }, { x: 820, y: 680 }, { x: 787, y: 590 },
        ],
      },
    ],
    sectorBoundaryAngles: [175, 340, 32], // TUNING
    sectorNames: ['N', 'E', 'W'],
    nearRadius: 480,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    zoneQuotaOverrides: {
      nE: { turret: 2, feature: 0 }, // TUNING
      nN: { turret: 2, feature: 0 }, // TUNING
      fW: { turret: 2, feature: 3 }, // TUNING
      fE: { turret: 2, feature: 3 }, // TUNING
    },
    candidateLocations: [
      { x: 450 , y: 580 , zone: 'nW' },
      { x: 645 , y: 655 , zone: 'nW' },
      { x: 1200, y: 790 , zone: 'nW' },
      { x: 605 , y: 820 , zone: 'nW' },
      { x: 260 , y: 590 , zone: 'fW' },
      { x: 95  , y: 650 , zone: 'fW' },
      { x: 285 , y: 870 , zone: 'fW' },
      { x: 1350, y: 955 , zone: 'fW' },
      { x: 1195, y: 1010, zone: 'fW' },
      { x: 1230, y: 555 , zone: 'nE' },
      { x: 1105, y: 660 , zone: 'nE' },
      { x: 1845, y: 195 , zone: 'fE' },
      { x: 1565, y: 275 , zone: 'fE' },
      { x: 1530, y: 440 , zone: 'fE' },
      { x: 1830, y: 525 , zone: 'fE' },
      { x: 1585, y: 720 , zone: 'fE' },
      { x: 1840, y: 930 , zone: 'fE' },
      { x: 915 , y: 360 , zone: 'nN' },
      { x: 650 , y: 495 , zone: 'nN' },
      { x: 1690, y: 150 , zone: 'fN' },
      { x: 280 , y: 150 , zone: 'fN' },
      { x: 175 , y: 290 , zone: 'fN' },
      { x: 170 , y: 455 , zone: 'fN' },
    ],
    name: "Widow's Orchard",
    description: 'Gnarled fruit trees, and something hungry beneath them.',
    corridorWidth: 115,                   // TUNING
    featureMix: { tree: 4, reedPatch: 1, shrub: 1, ruins: 2, pond: 1 }, // TUNING — Bough-rich
    enemyHpMult: 1.2,                     // TUNING — row 5
    decorSeed: 7005,
    decorDensity: 1.15,                   // TUNING
    gnarledTrees: true,                   // signature: gnarled orchard trees
    palette: {                            // autumn browns and muted gold, dark twisted trunks
      floor: '#4a4026',
      floorAccent: { dark: 'rgba(30, 20, 8, 0.35)', light: 'rgba(200, 160, 80, 0.16)' },
      corridor: { base: '#7a6440', worn: 'rgba(190, 160, 110, 0.3)' },
      corridorEdge: '#3a2c1a',
      treeDark: { trunk: '#2a1e16', canopy: ['#6a5226', '#7a5a28', '#5a4a24'] },
      treeLight: ['#a07a34', '#b08a3a', '#8a6a2e'],
      rock: { base: '#7a7262', light: '#9a927e', dark: '#565044' },
      vegetation: { base: '#6a5a2a', light: '#b08a3a' },
      mapTint: '#b08a4a',
    },
    // TUNING — 56 wolves: two big surges (7 into each lane at about 15 and 40 s) with scattered
    // single wolves between; Bears at 20 / 30 / 45 / 55 s.
    wave: {
      north: [{ time: 2, count: 1 }, { time: 8, count: 1 }, { time: 15, count: 7 }, { time: 20, count: 1, type: 'bear' }, { time: 26, count: 1 }, { time: 32, count: 1 }, { time: 40, count: 7 }, { time: 52, count: 1 }],
      east:  [{ time: 4, count: 1 }, { time: 10, count: 1 }, { time: 16, count: 7 }, { time: 24, count: 1 }, { time: 30, count: 1 }, { time: 30, count: 1, type: 'bear' }, { time: 41, count: 7 }, { time: 50, count: 1 }],
      west:  [{ time: 6, count: 1 }, { time: 17, count: 7 }, { time: 22, count: 1 }, { time: 34, count: 1 }, { time: 42, count: 7 }, { time: 45, count: 1, type: 'bear' }, { time: 48, count: 1 }, { time: 55, count: 1, type: 'bear' }],
    },
    bosses: [],
    enemyCounts: { wolf: 56, bear: 4 },
    stepBudget: 126,                      // TUNING — feature route 90% ≤ 138 (≤ 1.10 × budget)
  },
  // Rows 6–8 (M2f §4.6–4.11). Geometry mirrored from earlier levels for speed, as rows 4–5.
  // mossbound: geometry mirrored from barrow (horizontally).
  mossbound: {
    druidPos: { x: 1040, y: 800 },
    lanes: [
      {
        id: 'east',
        name: 'East',
        waypoints: [
          { x: 1960, y: 250 }, { x: 1780, y: 260 }, { x: 1680, y: 380 }, { x: 1750, y: 520 }, { x: 1720, y: 680 },
          { x: 1600, y: 770 }, { x: 1460, y: 740 }, { x: 1400, y: 620 }, { x: 1460, y: 490 }, { x: 1380, y: 370 },
          { x: 1240, y: 330 }, { x: 1140, y: 420 }, { x: 1180, y: 560 }, { x: 1130, y: 690 }, { x: 1083, y: 770 },
        ],
      },
      {
        id: 'north',
        name: 'North',
        waypoints: [
          { x: 580, y: -40 }, { x: 540, y: 120 }, { x: 390, y: 170 }, { x: 290, y: 290 }, { x: 340, y: 410 },
          { x: 460, y: 420 }, { x: 540, y: 370 }, { x: 660, y: 280 }, { x: 810, y: 240 }, { x: 960, y: 290 },
          { x: 1000, y: 420 }, { x: 900, y: 510 }, { x: 830, y: 620 }, { x: 910, y: 710 }, { x: 1014, y: 755 },
        ],
      },
      {
        id: 'west',
        name: 'West',
        waypoints: [
          { x: -40, y: 150 }, { x: 100, y: 200 }, { x: 140, y: 330 }, { x: 90, y: 450 }, { x: 110, y: 560 },
          { x: 230, y: 610 }, { x: 280, y: 740 }, { x: 180, y: 860 }, { x: 300, y: 990 }, { x: 460, y: 990 },
          { x: 560, y: 900 }, { x: 620, y: 790 }, { x: 740, y: 800 }, { x: 800, y: 920 }, { x: 940, y: 980 },
          { x: 990, y: 900 }, { x: 1022, y: 849 },
        ],
      },
    ],
    sectorBoundaryAngles: [50, 211, 277], // TUNING
    sectorNames: ['W', 'N', 'E'],
    nearRadius: 480,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    zoneQuotaOverrides: {
      nW: { turret: 2, feature: 0 }, // TUNING
      fN: { turret: 2, feature: 1 }, // TUNING
      fE: { turret: 2, feature: 3 }, // TUNING
      fW: { turret: 2, feature: 3 }, // TUNING
    },
    candidateLocations: [
      { x: 1305, y: 495 , zone: 'nE' },
      { x: 1285, y: 710 , zone: 'nE' },
      { x: 1510, y: 895 , zone: 'nE' },
      { x: 1190, y: 150 , zone: 'fE' },
      { x: 1435, y: 185 , zone: 'fE' },
      { x: 1635, y: 195 , zone: 'fE' },
      { x: 1850, y: 415 , zone: 'fE' },
      { x: 1580, y: 535 , zone: 'fE' },
      { x: 1700, y: 880 , zone: 'fE' },
      { x: 855 , y: 380 , zone: 'nN' },
      { x: 725 , y: 495 , zone: 'nN' },
      { x: 1005, y: 595 , zone: 'nN' },
      { x: 1030, y: 165 , zone: 'fN' },
      { x: 220 , y: 150 , zone: 'fN' },
      { x: 565 , y: 510 , zone: 'fN' },
      { x: 680 , y: 655 , zone: 'nW' },
      { x: 665 , y: 970 , zone: 'nW' },
      { x: 220 , y: 465 , zone: 'fW' },
      { x: 385 , y: 590 , zone: 'fW' },
      { x: 510 , y: 690 , zone: 'fW' },
      { x: 100 , y: 740 , zone: 'fW' },
      { x: 410 , y: 850 , zone: 'fW' },
    ],
    name: 'Mossbound Cairn',
    description: 'Moss-covered stones mark an ancient grave.',
    featureMix: { tree: 3, reedPatch: 1, shrub: 2, ruins: 2, pond: 1 }, // TUNING
    enemyHpMult: 1.3,                     // TUNING — row 6 (M2f §3.2)
    decorSeed: 7006,
    decorDensity: 1.05,                   // TUNING
    // Signature: a large moss-covered cairn near the Druid (base centre; size = half-width).
    landmarks: [{ kind: 'cairn', x: 1180, y: 860, size: 90 }], // TUNING — the nearest clear spot to the Druid
    palette: {                            // rich moss green, pale grey stone
      floor: '#2f5228',
      floorAccent: { dark: 'rgba(12, 30, 10, 0.35)', light: 'rgba(140, 190, 90, 0.16)' },
      corridor: { base: '#6a6050', worn: 'rgba(160, 150, 125, 0.3)' },
      corridorEdge: '#33301f',
      treeDark: { trunk: '#3e3324', canopy: ['#2a4f22', '#315a26', '#29502e'] },
      treeLight: ['#4a7a34', '#548438', '#4a7a40'],
      rock: { base: '#a2a49a', light: '#c2c4ba', dark: '#76786e' },
      vegetation: { base: '#3a6a2c', light: '#78a848' },
      moss: '#5a8a34',
      mapTint: '#7aa85a',
    },
    // TUNING — 56 wolves, balanced like Tornville scaled up; Bears at 18 / 26 / 34 / 42 / 50 s.
    wave: {
      east:  [{ time: 0, count: 4 }, { time: 11, count: 4 }, { time: 18, count: 1, type: 'bear' }, { time: 22, count: 4 }, { time: 33, count: 4 }, { time: 42, count: 1, type: 'bear' }, { time: 44, count: 3 }],
      north: [{ time: 4, count: 4 }, { time: 15, count: 4 }, { time: 26, count: 4 }, { time: 26, count: 1, type: 'bear' }, { time: 37, count: 3 }, { time: 48, count: 4 }, { time: 50, count: 1, type: 'bear' }],
      west:  [{ time: 8, count: 3 }, { time: 19, count: 4 }, { time: 30, count: 4 }, { time: 34, count: 1, type: 'bear' }, { time: 41, count: 4 }, { time: 52, count: 3 }],
    },
    bosses: [],
    enemyCounts: { wolf: 56, bear: 5 },
    stepBudget: 110,                      // TUNING — feature route 90% ≤ 121 (≤ 1.10 × budget)
  },
  // ashen: geometry mirrored from wychwood (both axes).
  ashen: {
    druidPos: { x: 800, y: 620 },
    lanes: [
      {
        id: 'south',
        name: 'South',
        waypoints: [
          { x: 1540, y: 1200 }, { x: 1520, y: 1030 }, { x: 1360, y: 950 }, { x: 1180, y: 1000 }, { x: 1000, y: 940 },
          { x: 820, y: 1000 }, { x: 620, y: 1020 }, { x: 440, y: 970 }, { x: 340, y: 840 }, { x: 460, y: 750 },
          { x: 620, y: 800 }, { x: 750, y: 780 }, { x: 791, y: 671 },
        ],
      },
      {
        id: 'east',
        name: 'East',
        waypoints: [
          { x: 1960, y: 780 }, { x: 1780, y: 780 }, { x: 1660, y: 680 }, { x: 1690, y: 540 }, { x: 1780, y: 410 },
          { x: 1700, y: 290 }, { x: 1540, y: 300 }, { x: 1440, y: 410 }, { x: 1360, y: 540 }, { x: 1400, y: 680 },
          { x: 1280, y: 780 }, { x: 1120, y: 760 }, { x: 1040, y: 640 }, { x: 930, y: 590 }, { x: 852, y: 620 },
        ],
      },
      {
        id: 'west',
        name: 'West',
        waypoints: [
          { x: -40, y: 300 }, { x: 100, y: 310 }, { x: 210, y: 420 }, { x: 360, y: 420 }, { x: 430, y: 290 },
          { x: 390, y: 160 }, { x: 530, y: 150 }, { x: 670, y: 200 }, { x: 830, y: 160 }, { x: 980, y: 150 },
          { x: 1080, y: 240 }, { x: 1040, y: 370 }, { x: 910, y: 400 }, { x: 820, y: 480 }, { x: 787, y: 570 },
        ],
      },
    ],
    sectorBoundaryAngles: [185, 328, 20], // TUNING
    sectorNames: ['W', 'E', 'S'],
    nearRadius: 480,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    zoneQuotaOverrides: {
      nE: { turret: 2, feature: 0 }, // TUNING
      nS: { turret: 2, feature: 0 }, // TUNING
      fW: { turret: 2, feature: 3 }, // TUNING
      fE: { turret: 2, feature: 3 }, // TUNING
      // fS lost its corner candidate (under the level-name label): its second resource spot moves to nW.
      fS: { turret: 2, feature: 1 }, // TUNING
      nW: { turret: 2, feature: 2 }, // TUNING
    },
    candidateLocations: [
      { x: 450 , y: 580 , zone: 'nW' },
      { x: 645 , y: 505 , zone: 'nW' },
      { x: 1200, y: 370 , zone: 'nW' },
      { x: 605 , y: 340 , zone: 'nW' },
      { x: 260 , y: 570 , zone: 'fW' },
      { x: 95  , y: 510 , zone: 'fW' },
      { x: 285 , y: 290 , zone: 'fW' },
      { x: 1350, y: 205 , zone: 'fW' },
      { x: 1195, y: 150 , zone: 'fW' },
      { x: 190 , y: 150 , zone: 'fW' },
      { x: 1230, y: 605 , zone: 'nE' },
      { x: 1105, y: 500 , zone: 'nE' },
      { x: 1845, y: 965 , zone: 'fE' },
      { x: 1565, y: 885 , zone: 'fE' },
      { x: 1530, y: 720 , zone: 'fE' },
      { x: 1830, y: 635 , zone: 'fE' },
      { x: 1585, y: 440 , zone: 'fE' },
      { x: 1840, y: 230 , zone: 'fE' },
      { x: 915 , y: 800 , zone: 'nS' },
      { x: 650 , y: 665 , zone: 'nS' },
      { x: 1690, y: 1010, zone: 'fS' },
      { x: 175 , y: 870 , zone: 'fS' },
      { x: 170 , y: 705 , zone: 'fS' },
    ],
    name: 'The Ashen Glade',
    description: 'Nothing grows here since the fire.',
    corridorWidth: 115,                   // TUNING — ≥ 2 × OGRE_RADIUS + 2 for its Ogre
    featureMix: { tree: 2, reedPatch: 1, shrub: 1, ruins: 3, pond: 2 }, // TUNING
    enemyHpMult: 1.3,                     // TUNING — row 6
    decorSeed: 7007,
    decorDensity: 0.85,                   // TUNING
    // Signature: burnt tree stumps, and very subtle ash flecks drifting over the ground.
    decorProps: { stump: 0.12 },          // TUNING — per cell
    ashFlecks: 40,                        // TUNING — ambient ash flecks (visual only)
    palette: {                            // ash grey, black burnt trunks, faint ember red
      floor: '#3e3c3a',
      floorAccent: { dark: 'rgba(14, 12, 12, 0.4)', light: 'rgba(160, 150, 140, 0.14)' },
      corridor: { base: '#5e5650', worn: 'rgba(150, 140, 130, 0.3)' },
      corridorEdge: '#262220',
      treeDark: { trunk: '#161212', canopy: ['#2a2626', '#302a28', '#262222'] },
      treeLight: ['#3e3836', '#443c3a', '#3a3432'],
      rock: { base: '#6e6a66', light: '#8c8884', dark: '#4a4744' },
      vegetation: { base: '#3a3634', light: '#8a3a2a' },
      ember: 'rgba(230, 80, 40, 0.6)',
      ash: 'rgba(210, 205, 200, 0.5)',
      mapTint: '#7a6a66',
    },
    // TUNING — 50 wolves, moderate; Bears at 25 / 35 / 45 / 55 s; the Ogre at 15 s on a random lane.
    wave: {
      south: [{ time: 0, count: 3 }, { time: 10, count: 3 }, { time: 20, count: 3 }, { time: 25, count: 1, type: 'bear' }, { time: 30, count: 4 }, { time: 42, count: 4 }],
      east:  [{ time: 3, count: 3 }, { time: 13, count: 3 }, { time: 23, count: 4 }, { time: 34, count: 3 }, { time: 35, count: 1, type: 'bear' }, { time: 46, count: 4 }, { time: 55, count: 1, type: 'bear' }],
      west:  [{ time: 6, count: 3 }, { time: 16, count: 3 }, { time: 27, count: 3 }, { time: 38, count: 4 }, { time: 45, count: 1, type: 'bear' }, { time: 50, count: 3 }],
    },
    bosses: [{ type: 'ogre', time: 15, lane: 'random' }], // TUNING
    enemyCounts: { wolf: 50, bear: 4, ogre: 1 },
    stepBudget: 115,                      // TUNING — feature route 90% ≤ 126 (≤ 1.10 × budget)
  },
  // bone: geometry mirrored from gallows (horizontally).
  bone: {
    druidPos: { x: 1100, y: 600 },
    lanes: [
      {
        id: 'north',
        name: 'North',
        waypoints: [
          { x: 220, y: -40 }, { x: 230, y: 150 }, { x: 360, y: 240 }, { x: 540, y: 200 }, { x: 700, y: 140 },
          { x: 860, y: 170 }, { x: 980, y: 140 }, { x: 1120, y: 150 }, { x: 1260, y: 190 }, { x: 1330, y: 300 },
          { x: 1280, y: 420 }, { x: 1160, y: 450 }, { x: 1020, y: 380 }, { x: 920, y: 440 }, { x: 960, y: 530 },
          { x: 1074, y: 555 },
        ],
      },
      {
        id: 'east',
        name: 'East',
        waypoints: [
          { x: 1960, y: 300 }, { x: 1770, y: 320 }, { x: 1640, y: 420 }, { x: 1670, y: 560 }, { x: 1790, y: 660 },
          { x: 1800, y: 800 }, { x: 1690, y: 920 }, { x: 1520, y: 980 }, { x: 1360, y: 930 }, { x: 1340, y: 800 },
          { x: 1440, y: 690 }, { x: 1320, y: 610 }, { x: 1152, y: 605 },
        ],
      },
      {
        id: 'southWest',
        name: 'South-west',
        waypoints: [
          { x: -40, y: 1000 }, { x: 140, y: 990 }, { x: 260, y: 880 }, { x: 220, y: 740 }, { x: 120, y: 620 },
          { x: 160, y: 480 }, { x: 320, y: 430 }, { x: 460, y: 500 }, { x: 520, y: 640 }, { x: 480, y: 780 },
          { x: 540, y: 900 }, { x: 690, y: 960 }, { x: 840, y: 920 }, { x: 900, y: 800 }, { x: 980, y: 700 },
          { x: 1067, y: 640 },
        ],
      },
    ],
    sectorBoundaryAngles: [90, 199, 326], // TUNING
    sectorNames: ['SW', 'N', 'E'],
    nearRadius: 440,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    zoneQuotaOverrides: {},
    candidateLocations: [
      { x: 1455, y: 460 , zone: 'nE' },
      { x: 1540, y: 597 , zone: 'nE' }, // nudged clear of the wider corridor
      { x: 1205, y: 760 , zone: 'nE' },
      { x: 1175, y: 1005, zone: 'nE' },
      { x: 1784, y: 181 , zone: 'fE' }, // nudged clear of the wider corridor
      { x: 1545, y: 320 , zone: 'fE' },
      { x: 1845, y: 455 , zone: 'fE' },
      { x: 1655, y: 730 , zone: 'fE' },
      { x: 1530, y: 845 , zone: 'fE' },
      { x: 1186, y: 299 , zone: 'nN' }, // nudged clear of the wider corridor
      { x: 857 , y: 312 , zone: 'nN' }, // nudged clear of the wider corridor
      { x: 720 , y: 405 , zone: 'nN' },
      { x: 1615, y: 170 , zone: 'fN' },
      { x: 1445, y: 175 , zone: 'fN' },
      { x: 70  , y: 195 , zone: 'fN' },
      { x: 525 , y: 360 , zone: 'fN' },
      { x: 825 , y: 573 , zone: 'nSW' }, // nudged clear of the wider corridor
      { x: 745 , y: 740 , zone: 'nSW' },
      { x: 1042, y: 827 , zone: 'nSW' }, // nudged clear of the wider corridor
      { x: 970 , y: 1010, zone: 'nSW' },
      { x: 70  , y: 360 , zone: 'fSW' },
      { x: 262 , y: 571 , zone: 'fSW' }, // nudged clear of the wider corridor
      { x: 360 , y: 705 , zone: 'fSW' },
      { x: 80  , y: 830 , zone: 'fSW' },
      { x: 430 , y: 1000, zone: 'fSW' },
    ],
    name: 'Bone Orchard',
    description: 'Pale branches, and paler things among the roots.',
    corridorWidth: 120,                   // TUNING
    featureMix: { tree: 2, reedPatch: 1, shrub: 2, ruins: 3, pond: 1 }, // TUNING
    enemyHpMult: 1.4,                     // TUNING — row 7
    decorSeed: 7008,
    decorDensity: 1,                      // TUNING
    bareTrees: true,                      // signature: pale, leafless trees
    palette: {                            // bleached bone-white trees, grey-violet ground
      floor: '#4a4552',
      floorAccent: { dark: 'rgba(20, 16, 26, 0.35)', light: 'rgba(200, 190, 210, 0.14)' },
      corridor: { base: '#6e6670', worn: 'rgba(180, 170, 185, 0.3)' },
      corridorEdge: '#2e2a33',
      treeDark: { trunk: '#d8d2c4', canopy: ['#cfc8ba', '#d8d2c4', '#c4bdae'] },
      treeLight: ['#ece6da', '#f2ece0', '#e2dccf'],
      rock: { base: '#8a8490', light: '#aaa4b0', dark: '#625c68' },
      vegetation: { base: '#5a5262', light: '#9a90a8' },
      mapTint: '#a8a0b8',
    },
    // TUNING — 60 wolves: three surges (5 into each lane at about 10, 30 and 50 s) with single
    // wolves between; Bears at 15 / 22 / 36 / 42 / 55 s.
    wave: {
      north:     [{ time: 3, count: 1 }, { time: 10, count: 5 }, { time: 15, count: 1, type: 'bear' }, { time: 18, count: 1 }, { time: 25, count: 1 }, { time: 30, count: 5 }, { time: 40, count: 1 }, { time: 50, count: 5 }, { time: 56, count: 1 }],
      east:      [{ time: 5, count: 1 }, { time: 11, count: 5 }, { time: 20, count: 1 }, { time: 22, count: 1, type: 'bear' }, { time: 31, count: 5 }, { time: 38, count: 1 }, { time: 42, count: 1, type: 'bear' }, { time: 44, count: 1 }, { time: 51, count: 5 }, { time: 57, count: 1 }],
      southWest: [{ time: 7, count: 1 }, { time: 12, count: 5 }, { time: 22, count: 1 }, { time: 32, count: 5 }, { time: 36, count: 1 }, { time: 36, count: 1, type: 'bear' }, { time: 46, count: 1 }, { time: 52, count: 5 }, { time: 55, count: 1, type: 'bear' }, { time: 58, count: 1 }],
    },
    bosses: [],
    enemyCounts: { wolf: 60, bear: 5 },
    stepBudget: 117,                      // TUNING — feature route 90% ≤ 128 (≤ 1.10 × budget)
  },
  // weeping: geometry mirrored from tornville (vertically).
  weeping: {
    druidPos: { x: 1010, y: 560 },
    lanes: [
      {
        id: 'lowerLeft',
        name: 'Lower-left',
        waypoints: [
          { x: -40, y: 910 }, { x: 180, y: 880 }, { x: 360, y: 955 }, { x: 540, y: 950 }, { x: 625, y: 870 },
          { x: 600, y: 775 }, { x: 500, y: 735 }, { x: 455, y: 670 }, { x: 490, y: 590 }, { x: 600, y: 545 },
          { x: 720, y: 580 }, { x: 775, y: 690 }, { x: 770, y: 820 }, { x: 805, y: 905 }, { x: 875, y: 945 },
          { x: 948, y: 902 }, { x: 980, y: 815 }, { x: 990, y: 710 }, { x: 1001, y: 611 },
        ],
      },
      {
        id: 'right',
        name: 'Right',
        waypoints: [
          { x: 1980, y: 730 }, { x: 1760, y: 700 }, { x: 1620, y: 820 }, { x: 1440, y: 830 }, { x: 1350, y: 785 },
          { x: 1340, y: 690 }, { x: 1420, y: 600 }, { x: 1545, y: 555 }, { x: 1605, y: 460 }, { x: 1560, y: 360 },
          { x: 1380, y: 300 }, { x: 1220, y: 400 }, { x: 1150, y: 510 }, { x: 1059, y: 542 },
        ],
      },
      {
        id: 'topLeft',
        name: 'Top-left',
        waypoints: [
          { x: 250, y: 20 }, { x: 270, y: 185 }, { x: 140, y: 280 }, { x: 125, y: 405 }, { x: 285, y: 500 },
          { x: 490, y: 420 }, { x: 595, y: 205 }, { x: 740, y: 160 }, { x: 890, y: 180 }, { x: 975, y: 265 },
          { x: 990, y: 370 }, { x: 1001, y: 509 },
        ],
      },
    ],
    sectorBoundaryAngles: [184, 295, 40], // TUNING
    sectorNames: ['NW', 'E', 'SW'],
    nearRadius: 460,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    zoneQuotaOverrides: {
      fNW: { turret: 2, feature: 0 }, // TUNING
      nNW: { turret: 2, feature: 2 }, // TUNING
      fE: { turret: 2, feature: 3 }, // TUNING
    },
    candidateLocations: [
      { x: 1114, y: 790 , zone: 'nSW' }, // nudged clear of the wider corridor
      { x: 876 , y: 583 , zone: 'nSW' }, // nudged clear of the wider corridor
      { x: 1170, y: 950 , zone: 'nSW' },
      { x: 210 , y: 755 , zone: 'fSW' },
      { x: 417 , y: 833 , zone: 'fSW' }, // nudged clear of the wider corridor
      { x: 330 , y: 627 , zone: 'fSW' }, // nudged clear of the wider corridor
      { x: 700 , y: 995 , zone: 'fSW' },
      { x: 98  , y: 558 , zone: 'fSW' }, // nudged clear of the wider corridor
      { x: 1222, y: 639 , zone: 'nE' }, // nudged clear of the wider corridor
      { x: 1420, y: 445 , zone: 'nE' },
      { x: 1280, y: 190 , zone: 'nE' },
      { x: 1536, y: 698 , zone: 'fE' }, // nudged clear of the wider corridor
      { x: 1720, y: 550 , zone: 'fE' },
      { x: 1700, y: 280 , zone: 'fE' },
      { x: 1780, y: 860 , zone: 'fE' },
      { x: 1480, y: 170 , zone: 'fE' },
      { x: 1820, y: 410 , zone: 'fE' },
      { x: 730 , y: 315 , zone: 'nNW' },
      { x: 1115, y: 305 , zone: 'nNW' },
      { x: 1070, y: 150 , zone: 'nNW' },
      { x: 865 , y: 420 , zone: 'nNW' },
      { x: 375 , y: 290 , zone: 'fNW' },
      { x: 465 , y: 155 , zone: 'fNW' },
    ],
    name: 'The Weeping Stones',
    description: 'The standing stones are always wet, though it never rains.',
    corridorWidth: 115,                   // TUNING
    featureMix: { tree: 2, reedPatch: 1, shrub: 1, ruins: 3, pond: 2 }, // TUNING
    enemyHpMult: 1.4,                     // TUNING — row 7
    decorSeed: 7009,
    decorDensity: 0.95,                   // TUNING
    decorProps: { weepingStone: 0.07 },   // TUNING — signature: tall standing stones with dark streaks, per cell
    palette: {                            // slate blue-grey, dark wet stone
      floor: '#2e3a44',
      floorAccent: { dark: 'rgba(8, 14, 20, 0.4)', light: 'rgba(130, 150, 170, 0.14)' },
      corridor: { base: '#565c62', worn: 'rgba(140, 150, 160, 0.3)' },
      corridorEdge: '#1e2328',
      treeDark: { trunk: '#2a2a2c', canopy: ['#24343c', '#2a3c44', '#22303a'] },
      treeLight: ['#36505c', '#3c5864', '#344c58'],
      rock: { base: '#5c646c', light: '#7c848c', dark: '#3a4048' },
      vegetation: { base: '#2e4450', light: '#5a7a8a' },
      streak: 'rgba(14, 20, 26, 0.75)',
      glow: 'rgba(160, 200, 230, 0.35)',
      mapTint: '#6a8aa0',
    },
    // TUNING — 54 wolves, moderate (3 every 9 s per lane, lanes 3 s apart); 7 Bears, every 7 s
    // from 12 s (12 / 19 / 26 / 33 / 40 / 47 / 54 s).
    wave: {
      lowerLeft: [{ time: 0, count: 3 }, { time: 9, count: 3 }, { time: 12, count: 1, type: 'bear' }, { time: 18, count: 3 }, { time: 27, count: 3 }, { time: 33, count: 1, type: 'bear' }, { time: 36, count: 3 }, { time: 45, count: 3 }, { time: 54, count: 1, type: 'bear' }],
      right:     [{ time: 3, count: 3 }, { time: 12, count: 3 }, { time: 19, count: 1, type: 'bear' }, { time: 21, count: 3 }, { time: 30, count: 3 }, { time: 39, count: 3 }, { time: 40, count: 1, type: 'bear' }, { time: 48, count: 3 }],
      topLeft:   [{ time: 6, count: 3 }, { time: 15, count: 3 }, { time: 24, count: 3 }, { time: 26, count: 1, type: 'bear' }, { time: 33, count: 3 }, { time: 42, count: 3 }, { time: 47, count: 1, type: 'bear' }, { time: 51, count: 3 }],
    },
    bosses: [],
    enemyCounts: { wolf: 54, bear: 7 },
    stepBudget: 112,                      // TUNING — feature route 90% ≤ 123 (≤ 1.10 × budget)
  },
  // bells: geometry mirrored from barrow (both axes).
  bells: {
    druidPos: { x: 1040, y: 360 },
    lanes: [
      {
        id: 'east',
        name: 'East',
        waypoints: [
          { x: 1960, y: 910 }, { x: 1780, y: 900 }, { x: 1680, y: 780 }, { x: 1750, y: 640 }, { x: 1720, y: 480 },
          { x: 1600, y: 390 }, { x: 1460, y: 420 }, { x: 1400, y: 540 }, { x: 1460, y: 670 }, { x: 1380, y: 790 },
          { x: 1240, y: 830 }, { x: 1140, y: 740 }, { x: 1180, y: 600 }, { x: 1130, y: 470 }, { x: 1083, y: 390 },
        ],
      },
      {
        id: 'south',
        name: 'South',
        waypoints: [
          { x: 580, y: 1200 }, { x: 540, y: 1040 }, { x: 390, y: 990 }, { x: 290, y: 870 }, { x: 340, y: 750 },
          { x: 460, y: 740 }, { x: 540, y: 790 }, { x: 660, y: 880 }, { x: 810, y: 920 }, { x: 960, y: 870 },
          { x: 1000, y: 740 }, { x: 900, y: 650 }, { x: 830, y: 540 }, { x: 910, y: 450 }, { x: 1014, y: 405 },
        ],
      },
      {
        id: 'west',
        name: 'West',
        waypoints: [
          { x: -40, y: 1010 }, { x: 100, y: 960 }, { x: 140, y: 830 }, { x: 90, y: 710 }, { x: 110, y: 600 },
          { x: 230, y: 550 }, { x: 280, y: 420 }, { x: 180, y: 300 }, { x: 300, y: 170 }, { x: 460, y: 170 },
          { x: 560, y: 260 }, { x: 620, y: 370 }, { x: 740, y: 360 }, { x: 800, y: 240 }, { x: 940, y: 180 },
          { x: 990, y: 260 }, { x: 1022, y: 311 },
        ],
      },
    ],
    sectorBoundaryAngles: [310, 83, 149], // TUNING
    sectorNames: ['E', 'S', 'W'],
    nearRadius: 480,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    zoneQuotaOverrides: {
      nW: { turret: 2, feature: 1 }, // TUNING — 3 candidates, one added at a free spot
      nS: { turret: 2, feature: 0 }, // TUNING — 2 candidates with the wider corridors
      // The wider corridors leave fS 2 candidates: its resource spot moves to fE.
      fS: { turret: 2, feature: 0 }, // TUNING
      fE: { turret: 2, feature: 4 }, // TUNING
      fW: { turret: 2, feature: 3 }, // TUNING
    },
    candidateLocations: [
      { x: 1140, y: 190 , zone: 'nW' }, // added (free spot) to make up for those the wider corridors removed
      { x: 1305, y: 665 , zone: 'nE' },
      { x: 1283, y: 449 , zone: 'nE' }, // nudged clear of the wider corridor
      { x: 1509, y: 259 , zone: 'nE' }, // nudged clear of the wider corridor
      { x: 1190, y: 1010, zone: 'fE' },
      { x: 1435, y: 975 , zone: 'fE' },
      { x: 1635, y: 965 , zone: 'fE' },
      { x: 1850, y: 745 , zone: 'fE' },
      { x: 1589, y: 623 , zone: 'fE' }, // nudged clear of the wider corridor
      { x: 1700, y: 280 , zone: 'fE' },
      { x: 846 , y: 780 , zone: 'nS' }, // nudged clear of the wider corridor
      { x: 1005, y: 565 , zone: 'nS' },
      { x: 1030, y: 995 , zone: 'fS' },
      { x: 569 , y: 644 , zone: 'fS' }, // nudged clear of the wider corridor
      { x: 680 , y: 514 , zone: 'nW' }, // nudged clear of the wider corridor
      { x: 671 , y: 185 , zone: 'nW' }, // nudged clear of the wider corridor
      { x: 385 , y: 570 , zone: 'fW' },
      { x: 510 , y: 470 , zone: 'fW' },
      { x: 96  , y: 423 , zone: 'fW' }, // nudged clear of the wider corridor
      { x: 410 , y: 310 , zone: 'fW' },
      { x: 70  , y: 212 , zone: 'fW' }, // nudged clear of the wider corridor
    ],
    name: 'Hollow of Bells',
    description: 'Somewhere below, a bell tolls. The packs answer.',
    corridorWidth: 125,                   // TUNING
    featureMix: { tree: 2, reedPatch: 1, shrub: 3, ruins: 2, pond: 1 }, // TUNING — Feathers for Vultures
    enemyHpMult: 1.4,                     // TUNING — row 7
    decorSeed: 7010,
    decorDensity: 1,                      // TUNING
    // Signature: a cracked bronze bell half-buried near the Druid (base centre; size = half-width).
    landmarks: [{ kind: 'bell', x: 1150, y: 310, size: 60 }], // TUNING — the nearest clear spot to the Druid
    // A deep bell toll (bellToll event) at each of these times, just before each surge (M2f §4.10).
    tolls: [8.5, 22.5, 36.5, 50.5],       // TUNING — s
    palette: {                            // deep shadowed green, bronze accents
      floor: '#1c2e1e',
      floorAccent: { dark: 'rgba(6, 12, 6, 0.45)', light: 'rgba(160, 120, 60, 0.12)' },
      corridor: { base: '#55503e', worn: 'rgba(150, 135, 100, 0.3)' },
      corridorEdge: '#211f16',
      treeDark: { trunk: '#2e2418', canopy: ['#18301a', '#1e3820', '#1a2e22'] },
      treeLight: ['#2a4a2c', '#305230', '#2a4a34'],
      rock: { base: '#6a6658', light: '#8a8676', dark: '#46443a' },
      vegetation: { base: '#284426', light: '#a07a38' },
      bronze: { base: '#8a6a34', light: '#c09a4a', dark: '#4a381a' },
      mapTint: '#a0844a',
    },
    // TUNING — 64 wolves: every 14 s a toll and a big synchronised surge (5 into each lane at
    // about 10, 24, 38 and 52 s); few wolves between. Bears at 18 / 30 / 44 / 56 s.
    wave: {
      east:  [{ time: 10, count: 5 }, { time: 17, count: 1 }, { time: 18, count: 1, type: 'bear' }, { time: 24, count: 5 }, { time: 38, count: 5 }, { time: 52, count: 5 }],
      south: [{ time: 10, count: 5 }, { time: 24, count: 5 }, { time: 30, count: 1, type: 'bear' }, { time: 31, count: 1 }, { time: 38, count: 5 }, { time: 52, count: 5 }],
      west:  [{ time: 10, count: 5 }, { time: 24, count: 5 }, { time: 38, count: 5 }, { time: 44, count: 1, type: 'bear' }, { time: 45, count: 1 }, { time: 52, count: 5 }, { time: 56, count: 1, type: 'bear' }, { time: 58, count: 1 }],
    },
    bosses: [],
    enemyCounts: { wolf: 64, bear: 4 },
    stepBudget: 113,                      // TUNING — feature route 90% ≤ 124 (≤ 1.10 × budget)
  },
  // heartwood: geometry mirrored from blackthorn (vertically).
  heartwood: {
    druidPos: { x: 1120, y: 680 },
    lanes: [
      {
        id: 'southWest',
        name: 'South-west',
        waypoints: [
          { x: 300, y: 1200 }, { x: 290, y: 1000 }, { x: 170, y: 890 }, { x: 190, y: 740 }, { x: 340, y: 670 },
          { x: 480, y: 740 }, { x: 560, y: 870 }, { x: 700, y: 940 }, { x: 850, y: 970 }, { x: 990, y: 1010 },
          { x: 1080, y: 950 }, { x: 1110, y: 840 }, { x: 1115, y: 732 },
        ],
      },
      {
        id: 'north',
        name: 'North',
        waypoints: [
          { x: 520, y: 40 }, { x: 540, y: 190 }, { x: 400, y: 260 }, { x: 330, y: 400 }, { x: 440, y: 510 },
          { x: 590, y: 500 }, { x: 660, y: 380 }, { x: 780, y: 280 }, { x: 930, y: 230 }, { x: 1070, y: 280 },
          { x: 1120, y: 400 }, { x: 1060, y: 510 }, { x: 1100, y: 590 }, { x: 1111, y: 629 },
        ],
      },
      {
        id: 'east',
        name: 'East',
        waypoints: [
          { x: 1960, y: 340 }, { x: 1800, y: 300 }, { x: 1660, y: 360 }, { x: 1620, y: 500 }, { x: 1720, y: 600 },
          { x: 1840, y: 700 }, { x: 1800, y: 840 }, { x: 1660, y: 910 }, { x: 1500, y: 870 }, { x: 1440, y: 750 },
          { x: 1480, y: 630 }, { x: 1380, y: 560 }, { x: 1260, y: 620 }, { x: 1170, y: 667 },
        ],
      },
    ],
    sectorBoundaryAngles: [300, 60, 188], // TUNING
    sectorNames: ['E', 'SW', 'N'],
    nearRadius: 400,                      // TUNING
    zoneQuotas: {
      near: { turret: 2, feature: 1 },
      far:  { turret: 2, feature: 2 },
    },
    // nSW fits 2 candidates with the wider corridors: its resource spot moves to nN.
    zoneQuotaOverrides: {
      nSW: { turret: 2, feature: 0 }, // TUNING
      nN: { turret: 2, feature: 2 },  // TUNING
    },
    candidateLocations: [
      { x: 920 , y: 570 , zone: 'nN' },
      { x: 760 , y: 550 , zone: 'nN' },
      { x: 870 , y: 415 , zone: 'nN' },
      { x: 1295, y: 330 , zone: 'nN' },
      { x: 270 , y: 548 , zone: 'fN' }, // nudged clear of the wider corridor
      { x: 140 , y: 450 , zone: 'fN' },
      { x: 475 , y: 375 , zone: 'fN' },
      { x: 200 , y: 290 , zone: 'fN' },
      { x: 1215, y: 190 , zone: 'fN' },
      { x: 685 , y: 175 , zone: 'fN' },
      { x: 1235, y: 910 , zone: 'nSW' },
      { x: 840 , y: 775 , zone: 'nSW' },
      { x: 472 , y: 968 , zone: 'fSW' }, // nudged clear of the wider corridor
      { x: 359 , y: 812 , zone: 'fSW' }, // nudged clear of the wider corridor
      { x: 620 , y: 670 , zone: 'fSW' },
      { x: 80  , y: 620 , zone: 'fSW' },
      { x: 1401, y: 959 , zone: 'nE' }, // nudged clear of the wider corridor
      { x: 1297, y: 749 , zone: 'nE' }, // nudged clear of the wider corridor
      { x: 1233, y: 482 , zone: 'nE' }, // nudged clear of the wider corridor
      { x: 1430, y: 430 , zone: 'nE' },
      { x: 1800, y: 1005, zone: 'fE' },
      { x: 1630, y: 740 , zone: 'fE' },
      { x: 1781, y: 437 , zone: 'fE' }, // nudged clear of the wider corridor
      { x: 1495, y: 240 , zone: 'fE' },
      { x: 1795, y: 160 , zone: 'fE' },
      { x: 1635, y: 155 , zone: 'fE' },
    ],
    name: 'The Heartwood',
    description: 'The heart of Broceliande, and the rot at its centre.',
    corridorWidth: 120,                   // TUNING — ≥ 2 × OGRE_RADIUS + 2 for its Ogres
    featureMix: { tree: 2, reedPatch: 1, shrub: 2, ruins: 2, pond: 2 }, // TUNING
    enemyHpMult: 1.5,                     // TUNING — row 8, the Boss
    decorSeed: 7011,
    decorDensity: 1.2,                    // TUNING
    // Signature: huge ancient roots round the Druid (left out where a corridor or candidate is in the way).
    stoneRing: { kind: 'root', radius: [110, 440], count: 14, size: 0.85 }, // TUNING
    laneGlow: true,                       // a sickly purple-red glow at the lane entrances
    palette: {                            // very dark green, sickly purple-red glow
      floor: '#142218',
      floorAccent: { dark: 'rgba(4, 8, 4, 0.5)', light: 'rgba(120, 50, 90, 0.12)' },
      corridor: { base: '#4a3e3a', worn: 'rgba(130, 100, 110, 0.3)' },
      corridorEdge: '#1a1414',
      treeDark: { trunk: '#2a1e1a', canopy: ['#122a16', '#16301a', '#14261c'] },
      treeLight: ['#22402a', '#264630', '#203c2e'],
      rock: { base: '#4e4a4e', light: '#6e6a6e', dark: '#2e2a2e' },
      vegetation: { base: '#1e3420', light: '#6a2a4a' },
      root: { base: '#3a2a20', light: '#5a4232', dark: '#20160e' },
      laneGlow: '160, 40, 90',
      mapTint: '#8a3a5a',
    },
    // TUNING — 60 wolves building steadily to a final heavy push at 50–60 s; Bears at 20 / 28 / 36 /
    // 44 / 50 / 56 s; two Ogres, at 15 s (south-west lane) and 40 s (east lane).
    wave: {
      southWest: [{ time: 0, count: 2 }, { time: 9, count: 2 }, { time: 18, count: 3 }, { time: 20, count: 1, type: 'bear' }, { time: 27, count: 3 }, { time: 36, count: 3 }, { time: 44, count: 1, type: 'bear' }, { time: 45, count: 3 }, { time: 52, count: 4 }],
      north:     [{ time: 3, count: 2 }, { time: 12, count: 2 }, { time: 21, count: 3 }, { time: 28, count: 1, type: 'bear' }, { time: 30, count: 3 }, { time: 39, count: 3 }, { time: 48, count: 3 }, { time: 50, count: 1, type: 'bear' }, { time: 55, count: 4 }],
      east:      [{ time: 6, count: 2 }, { time: 15, count: 2 }, { time: 24, count: 3 }, { time: 33, count: 3 }, { time: 36, count: 1, type: 'bear' }, { time: 42, count: 3 }, { time: 50, count: 3 }, { time: 56, count: 1, type: 'bear' }, { time: 57, count: 4 }],
    },
    bosses: [{ type: 'ogre', time: 15, lane: 'southWest' }, { type: 'ogre', time: 40, lane: 'east' }], // TUNING
    enemyCounts: { wolf: 60, bear: 6, ogre: 2 },
    stepBudget: 111,                      // TUNING — feature route 90% ≤ 122 (≤ 1.10 × budget)
  },
};

// ---------------------------------------------------------------------------
// Level map and run (M2a §2–§4). A run is a path through MAP_NODES from MAP_START_NODE; winning a
// node with no `next` completes it. Node positions are on the 1920×1080 stage: the start near the
// bottom centre, each next row higher up, slightly off-symmetric (M2b §1.1: Forgotten Barrow
// centred between the two row-2 nodes). Nothing in the code is tied to these particular nodes.
// ---------------------------------------------------------------------------
// Node types (M2c §1.1): every type plays the same (an encounter from its levelId); they differ in
// label (tooltip), icon (a draw function in render/map.js) and whether that icon has red eyes. A
// Fell Wilds' level includes a mini-boss.
export const NODE_TYPES = {
  wilds: { label: 'Wilds',      icon: 'wolfHead', redEyes: false },
  fell:  { label: 'Fell Wilds', icon: 'wolfHead', redEyes: true  },
  // M2f §2: the final node, drawn MAP_BOSS_SCALE × as large with a dark red rim and a slow red
  // pulse; winning it completes the run with finalLine.
  boss:  { label: 'Boss', icon: 'wolfHead', redEyes: true, large: true, finalLine: 'The Heartwood is cleansed. Broceliande breathes again.' },
};

// M2e §4.6 (as revised): the map's ground runs across the whole screen; its nodes use the right
// half (x ≥ EQUIP_PANEL_WIDTH), and it doesn't scroll.
// Rows are MAP_ROW_SPACING apart from MAP_BOTTOM_ROW_Y up, so MAP_ROW_CAPACITY rows fit below the
// HUD strip; the 8 rows (M2f) fill it from the bottom, slightly off-symmetric; 2-node rows sit left
// and right of centre, 3-node rows left, centre and right, so roads never cross.
export const MAP_BOTTOM_ROW_Y = 985;      // px, the start row
export const MAP_ROW_SPACING = 108;       // px between rows (≈ y of row k = MAP_BOTTOM_ROW_Y − k × this)
export const MAP_ROW_CAPACITY = 9;        // rows the map must be able to hold
export const MAP_LABEL_FONT_PX = 18;      // node names; a name wider than MAP_LABEL_MAX_WIDTH wraps onto two lines
export const MAP_LABEL_MAX_WIDTH = 170;   // px
export const MAP_NODES = [
  // Row 1
  { id: 'tornville',  name: 'Tornville Haunt',    type: 'wilds', levelId: 'tornville',  pos: { x: 1440, y: 985 }, next: ['gallows', 'blackthorn'] },
  // Row 2
  { id: 'gallows',    name: 'Gallows Copse',      type: 'wilds', levelId: 'gallows',    pos: { x: 1278, y: 879 }, next: ['wychwood', 'barrow'] },
  { id: 'blackthorn', name: 'Blackthorn Hollow',  type: 'wilds', levelId: 'blackthorn', pos: { x: 1598, y: 873 }, next: ['barrow', 'drowned'] },
  // Row 3 (M2b §1, §3)
  { id: 'wychwood',   name: 'Wychwood Circle',    type: 'wilds', levelId: 'wychwood',   pos: { x: 1142, y: 771 }, next: ['charcoal'] },
  { id: 'barrow',     name: 'Forgotten Barrow',   type: 'fell',  levelId: 'barrow',     pos: { x: 1440, y: 765 }, next: ['charcoal', 'stags'] },
  { id: 'drowned',    name: 'The Drowned Hamlet', type: 'wilds', levelId: 'drowned',    pos: { x: 1742, y: 769 }, next: ['stags'] },
  // Rows 4–8 (M2f §1). levelId: placeholders (existing levels) until their own levels exist.
  // Row 4
  { id: 'charcoal',   name: "Charcoal Burner's Camp", type: 'wilds', levelId: 'charcoal', pos: { x: 1288, y: 663 }, next: ['briar', 'causeway'] },
  { id: 'stags',      name: "Stag's Crossing",    type: 'wilds', levelId: 'stags',  pos: { x: 1594, y: 657 }, next: ['causeway', 'widows'] },
  // Row 5
  { id: 'briar',      name: 'Briar Chapel',       type: 'wilds', levelId: 'briar',  pos: { x: 1134, y: 555 }, next: ['mossbound'] },
  { id: 'causeway',   name: 'Sunken Causeway',    type: 'wilds', levelId: 'causeway',  pos: { x: 1444, y: 549 }, next: ['mossbound', 'ashen'] },
  { id: 'widows',     name: "Widow's Orchard",    type: 'wilds', levelId: 'widows',  pos: { x: 1748, y: 553 }, next: ['ashen'] },
  // Row 6
  { id: 'mossbound',  name: 'Mossbound Cairn',    type: 'wilds', levelId: 'mossbound',  pos: { x: 1284, y: 447 }, next: ['bone', 'weeping'] },
  { id: 'ashen',      name: 'The Ashen Glade',    type: 'fell',  levelId: 'ashen',     pos: { x: 1600, y: 441 }, next: ['weeping', 'bells'] },
  // Row 7
  { id: 'bone',       name: 'Bone Orchard',       type: 'wilds', levelId: 'bone',  pos: { x: 1138, y: 339 }, next: ['heartwood'] },
  { id: 'weeping',    name: 'The Weeping Stones', type: 'wilds', levelId: 'weeping',  pos: { x: 1442, y: 335 }, next: ['heartwood'] },
  { id: 'bells',      name: 'Hollow of Bells',    type: 'wilds', levelId: 'bells',  pos: { x: 1746, y: 339 }, next: ['heartwood'] },
  // Row 8: the final boss
  { id: 'heartwood',  name: 'The Heartwood',      type: 'boss',  levelId: 'heartwood',     pos: { x: 1440, y: 229 }, next: [] },
];
export const MAP_START_NODE = 'tornville';
export const MAP_NODE_RADIUS = 30;        // px (M2e §4.6, was 44)
export const MAP_BOSS_SCALE = 1.5;        // M2f §2: a large node (the Boss) is drawn and hit-tested this much bigger
export const MAP_BOSS_PULSE_HZ = 0.35;    // its slow, faint red pulse
export const MAP_HOVER_SCALE = 1.08;      // an available node under the pointer grows this much
export const MAP_PULSE_HZ = 0.8;          // gentle glow pulse of available nodes
export const MAP_ROAD_WIGGLE = 14;        // px, sideways sway of a road between two nodes (smaller with the smaller map, M2e)
export const MAP_DECOR_SEED = 909;        // the map's procedural tree clusters, identical every run
export const CARRY_DRUID_HP = false;      // TUNING — true: the Druid starts the next encounter with the HP he won with (M2a §3)

// ---------------------------------------------------------------------------
// Druid equipment (M2e §1–§2). Six slots: three staff charms, each strengthening one summon,
// and three pieces of personal equipment with passive effects. Items are data: effects are
// { stat, op: 'add' | 'mult', value } on the stats in js/stats.js (adds first, then mults),
// applied by the stats resolver when a battle starts. Item IDs are stable keys.
// ---------------------------------------------------------------------------
export const SLOT_TYPES = {
  crown:    { label: 'Crown Charm',   group: 'staff' },    // Vulture
  grip:     { label: 'Grip Charm',    group: 'staff' },    // Squirrel
  ferrule:  { label: 'Ferrule Charm', group: 'staff' },    // Bough Double
  necklace: { label: 'Necklace',      group: 'personal' }, // HP and survival
  belt:     { label: 'Belt',          group: 'personal' }, // work and gathering
  shoes:    { label: 'Shoes',         group: 'personal' }, // movement
};

// Base values of the stats only equipment changes (the rest come from their usual config).
export const DRUID_REGEN_AMOUNT = 0;      // HP regained every DRUID_REGEN_INTERVAL in Combat (Sap Pendant)
export const DRUID_REGEN_INTERVAL = 4;    // TUNING — s
export const BOUGH_REFUND_CHANCE = 0;     // chance a Bough Double's Bough is refunded when its job starts (Mossheart Ferrule)
export const WORK_SPEED = 1;              // build / upgrade speed multiplier: job time ÷ this (Wright's Belt)
export const SEARCH_MAIN_BONUS = 0;       // extra units of a spot's mainResource per search (Forager's Belt)

// The 12 starter items (M2e §2.3), two per slot. All values TUNING.
// colors: [main, accent] for the item's icon; mark: its distinguishing mark (render/items.js).
export const ITEMS = {
  hawkfeatherCrown: {
    slot: 'crown', name: 'Hawkfeather Crown', description: 'Vultures stay 4 s longer.',
    effects: [{ stat: 'vulture.duration', op: 'add', value: 4 }],
    colors: ['#c9a25a', '#f4ecd8'], mark: 'feather',
  },
  talonCrown: {
    slot: 'crown', name: 'Talon Crown', description: 'Vultures deal 3 more damage.',
    effects: [{ stat: 'vulture.damage', op: 'add', value: 3 }],
    colors: ['#8e3b2c', '#efe0c4'], mark: 'talon',
  },
  nutwoodGrip: {
    slot: 'grip', name: 'Nutwood Grip', description: 'Squirrels stay 6 s longer.',
    effects: [{ stat: 'squirrel.duration', op: 'add', value: 6 }],
    colors: ['#7a4e2a', '#e3b46a'], mark: 'nut',
  },
  quickpawGrip: {
    slot: 'grip', name: 'Quickpaw Grip', description: 'Squirrels run 40% faster and grab drops from 10 px further.',
    effects: [{ stat: 'squirrel.speed', op: 'mult', value: 1.4 }, { stat: 'squirrel.pickupRange', op: 'add', value: 10 }],
    colors: ['#b5652e', '#f6d9a8'], mark: 'paw',
  },
  mossheartFerrule: {
    slot: 'ferrule', name: 'Mossheart Ferrule', description: '35% chance a Bough Double gives its Bough back when its job starts.',
    effects: [{ stat: 'double.boughRefundChance', op: 'add', value: 0.35 }],
    colors: ['#4f7a3a', '#b8e08a'], mark: 'moss',
  },
  twinrootFerrule: {
    slot: 'ferrule', name: 'Twin-root Ferrule', description: 'One more Bough Double can work at a time.',
    effects: [{ stat: 'double.max', op: 'add', value: 1 }],
    colors: ['#6b4a2e', '#d8b88a'], mark: 'roots',
  },
  oakheartAmulet: {
    slot: 'necklace', name: 'Oakheart Amulet', description: '+20 max HP.',
    effects: [{ stat: 'druid.maxHp', op: 'add', value: 20 }],
    colors: ['#8a5a2b', '#7fc46a'], mark: 'acorn',
  },
  sapPendant: {
    slot: 'necklace', name: 'Sap Pendant', description: 'Regain 1 HP every 4 s in Combat.',
    effects: [{ stat: 'druid.regenAmount', op: 'add', value: 1 }],
    colors: ['#c98a1e', '#ffd36a'], mark: 'drop',
  },
  wrightsBelt: {
    slot: 'belt', name: "Wright's Belt", description: 'Building and upgrading 25% faster.',
    effects: [{ stat: 'work.speed', op: 'mult', value: 1.25 }],
    colors: ['#5a4632', '#c0c4c8'], mark: 'hammer',
  },
  foragersBelt: {
    slot: 'belt', name: "Forager's Belt", description: "Every search yields 1 more of the spot's main resource.",
    effects: [{ stat: 'search.mainBonus', op: 'add', value: 1 }],
    colors: ['#6e7a3a', '#e8d27a'], mark: 'pouch',
  },
  fernstepBoots: {
    slot: 'shoes', name: 'Fernstep Boots', description: '+15 steps.',
    effects: [{ stat: 'steps.budget', op: 'add', value: 15 }],
    colors: ['#3f6a3a', '#9fdc7a'], mark: 'fern',
  },
  haresShoes: {
    slot: 'shoes', name: "Hare's Shoes", description: 'Travel costs 15% fewer steps.',
    effects: [{ stat: 'steps.length', op: 'mult', value: 1.15 }],
    colors: ['#a08a6e', '#f2ece0'], mark: 'ears',
  },
};

// Finding items (M2e §3): one hidden in a random resource spot of each battle.
export const ITEMS_PER_BATTLE = 1;        // 0 turns hidden items off
export const ITEM_FOUND_TIME = 2.5;       // s the "You found a …!" message stays, fading over its last third
export const ITEM_FLOATER_SIZE = 40;      // px, the slot-type silhouette floater rising from the spot

// Equipment area on the map (M2e §4, as revised): about the left half of the screen, below the HUD
// strip, drawn straight over the map's ground (no panel background). Panel px: x from the stage's
// left edge, y from the HUD strip's bottom. The portrait's centre is at about mid-screen height.
export const EQUIP_PANEL_WIDTH = 960;     // px of the 1920 px stage: the equipment half; the map nodes use the rest
export const EQUIP_SLOT_SIZE = 88;        // px, slot circle diameter
export const EQUIP_PORTRAIT = { x: 350, y: 260, w: 260, h: 400 }; // px in the panel: the Druid portrait's box
// Slot centres in the panel (px). Staff slots on the viewer's left, level with their part of the
// staff (held in the Druid's right hand, on the viewer's left); personal slots on the right, level
// with neck, waist and feet.
export const EQUIP_SLOT_POS = {
  crown:    { x: 256, y: 296 },
  grip:     { x: 256, y: 470 },
  ferrule:  { x: 256, y: 644 },
  necklace: { x: 704, y: 376 },
  belt:     { x: 704, y: 502 },
  shoes:    { x: 704, y: 638 },
};
// The staff and body points each slot is level with (panel px): the staff's x, and the slot rows.
export const EQUIP_SLOT_ANCHOR = {
  crown:    { x: 378, y: 282 },
  grip:     { x: 378, y: 470 },
  ferrule:  { x: 378, y: 652 },
  necklace: { x: 496, y: 376 },
  belt:     { x: 518, y: 502 },
  shoes:    { x: 516, y: 638 },
};
// Where the map's tree clusters thin out to a natural clearing round the equipment (stage px): an
// ellipse; clusters stop at a ragged edge (±EQUIP_CLEARING_RAGGED of its size) rather than a line.
export const EQUIP_CLEARING = { x: 480, y: 640, rx: 380, ry: 470 };
export const EQUIP_CLEARING_RAGGED = 0.2;
