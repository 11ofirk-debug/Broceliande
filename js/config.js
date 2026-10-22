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
export const PREP_DURATION = 28;         // s
export const BUILD_TIME = 2.3;           // s
export const UPGRADE_TIME = 2.5;         // s

// ---------------------------------------------------------------------------
// M1b addendum §9 — step-budget Prep (docs/M1B_STEPS_ADDENDUM.md)
// ---------------------------------------------------------------------------
export const PREP_MODE = 'steps';          // 'steps' | 'timed' — mode at page load; debug key M toggles it
export const STEP_PX = 25;                 // TUNING — px of straight-line travel per step
export const STEP_BUDGET = 90;             // TUNING — steps available in step-mode Prep (~2,250 px)
export const TRAVEL_TWEEN_TIME = 0.35;     // TUNING — s, Druid's travel animation to a marker
export const STEP_BAR_BLINK_HZ = 3;        // TUNING — red blink rate of the step bar on an unaffordable hover (§5.2)
export const CALIBRATION_SLOT_COUNT = 5;   // debug panel: "all features + N nearest slots" greedy figure (§8)
export const CALIBRATION_TARGET_RATIO = 1.4; // that figure should be about this × STEP_BUDGET (§9 budget intent)

// ---------------------------------------------------------------------------
// 17.2 Druid
// ---------------------------------------------------------------------------
export const DRUID_HP = 80;
export const DRUID_POS = { x: 1010, y: 600 };           // TUNING — off-centre
export const DRUID_RADIUS = 28;                          // TUNING
export const DRUID_MELEE_RADIUS = 52;                    // TUNING
export const DRUID_MELEE_SLOTS = 6;                      // TUNING — max simultaneous biters
export const DRUID_ACTION_OFFSET = { x: -58, y: 20 };    // TUNING — Druid position beside a target (just outside LOCATION_RADIUS)

// ---------------------------------------------------------------------------
// 17.3 Wolf
// ---------------------------------------------------------------------------
export const WOLF_HP = 17;                // TUNING — 6 base pebbles, 4 upgraded, 3 Vulture pecks
export const WOLF_SPEED = 72;             // TUNING — px/s, aim for 25–30 s lane traversal
export const WOLF_RADIUS = 16;            // TUNING
export const WOLF_DAMAGE = 3;
export const WOLF_ATTACK_INTERVAL = 1.2;  // s

// Wolf movement details (§12.3–12.5). Not in the spec's table; all TUNING.
export const WOLF_WANDER_SPEED = 10;          // TUNING — px/s, slow lateral drift toward a wander target
export const WOLF_WANDER_INTERVAL = [1.5, 4]; // TUNING — s between picking new wander targets [min, max]
export const WOLF_SIDESTEP_SPEED = 55;        // TUNING — px/s, lateral speed when stepping round a wolf ahead
export const WOLF_SLOT_CLAIM_DISTANCE = 70;   // TUNING — px before the lane end where a wolf claims a melee slot (waits here if none free; keep outside DRUID_APPROACH_RADIUS + 2×WOLF_RADIUS)
export const DRUID_APPROACH_RADIUS = 86;      // TUNING — px, ring wolves walk round to reach a far melee slot (clears biters at DRUID_MELEE_RADIUS)
export const WOLF_DIRECT_APPROACH_ANGLE = 0.6; // TUNING — rad; slots closer than this in angle are walked to directly

// ---------------------------------------------------------------------------
// 17.4 Turret (Pebble Sprinkler)
// ---------------------------------------------------------------------------
export const TURRET_COST = { pits: 2, reeds: 1, feathers: 0 };
export const TURRET_DAMAGE = 3;
export const TURRET_FIRE_INTERVAL = 0.75; // s
export const TURRET_RANGE = 220;          // TUNING — px
export const PROJECTILE_SPEED = 600;      // TUNING — px/s
export const UPGRADE_COST = { pits: 2, reeds: 0, feathers: 1 };
export const UPGRADED_DAMAGE = 5;
export const UPGRADED_FIRE_INTERVAL = 0.6; // s
export const UPGRADED_RANGE_MULT = 1.2;
export const TURRET_TURN_SPEED = 9;       // TUNING — rad/s, how fast a turret visibly turns toward its target (visual; firing does not wait for it)
export const TURRET_MUZZLE_HEIGHT = 40;   // px above the slot pad where pebbles leave the sprinkler
export const WOLF_HIT_HEIGHT = 10;        // px above a wolf's collision centre where pebbles strike its body

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
export const CORRIDOR_WIDTH = 110;        // TUNING — px
export const LANE_LENGTH_FACTOR = 2.0;    // TUNING — target lane length ÷ straight-line spawn→Druid distance
export const LANE_LENGTH_TOLERANCE = 0.15; // start-up warning if a lane's length factor is off LANE_LENGTH_FACTOR by more than this fraction
export const LANE_SAMPLES_PER_SEGMENT = 24; // polyline samples between two waypoints (§12.2)

// TUNING — lane waypoints (§12.1). The first point is the spawn, just off-screen; the last
// point lies on the Druid's melee ring (DRUID_POS + DRUID_MELEE_RADIUS in the approach direction).
// The debug panel reports each lane's length, length factor and unopposed travel time.
export const LANES = [
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
];

export const TURRET_SLOT_RADIUS = 30;     // TUNING — px, slot pad size (drawing only; must fit LOCATION_RADIUS)
export const TURRET_BASE_OFFSET = 18;     // px the slot pad sits below its location centre, so pad + turret fit the footprint (M1c §2.1)

// ---------------------------------------------------------------------------
// 17.7 Searchable features
// ---------------------------------------------------------------------------
// yields: resource → [min, max] inclusive integers. All ranges TUNING.
export const FEATURE_TYPES = {
  tree:      { name: 'Tree',       searchTime: 1.2, yields: { pits: [2, 4] } },
  reedPatch: { name: 'Reed Patch', searchTime: 1.4, yields: { reeds: [2, 3] } },
  shrub:     { name: 'Shrub',      searchTime: 1.7, yields: { feathers: [2, 3] } },
  ruins:     { name: 'Ruins',      searchTime: 1.8, yields: { pits: [2, 3], feathers: [1, 3] } },
  pond:      { name: 'Pond',       searchTime: 2.0, yields: { pits: [2, 3], reeds: [1, 3] } },
};

export const FEATURE_RADIUS = 32;         // TUNING — px, feature sprite scale (drawing only; sprites must fit LOCATION_RADIUS)

// ---------------------------------------------------------------------------
// M1c addendum — candidate locations and randomised layout (docs/M1C_LAYOUT_ADDENDUM.md §7)
// ---------------------------------------------------------------------------
export const RANDOMISE_LAYOUT = true;     // false = original fixed M1 layout: original types, no jitter (§3.1)
export const LOCATION_RADIUS = 45;        // TUNING — px, footprint of every candidate; all feature/turret visuals fit inside; also the click area
export const LOCATION_JITTER = 25;        // TUNING — px, max random offset of a chosen location
export const LOCATION_GAP = 20;           // TUNING — px, extra spacing between candidates
export const DECOR_MARGIN = 15;           // TUNING — px, decoration keeps this far beyond footprint + jitter
export const DECOR_SEED = 12345;          // fixed; decoration is identical in every run
export const LANE_MIN_TURRET_SLOTS = 3;   // TUNING — turret slots that must cover each lane
export const FEATURE_ROUTE_MIN_FACTOR = 0.75; // TUNING — greedy all-feature route ≥ this × STEP_BUDGET
export const FEATURE_ROUTE_MAX_FACTOR = 1.10; // TUNING — … and ≤ this × STEP_BUDGET
export const MAX_LAYOUT_ATTEMPTS = 200;

// Exactly 25 candidates (§2). The first 20 are the original M1 positions, with their role and
// feature type kept so RANDOMISE_LAYOUT: false reproduces the original layout (§3.1). Their
// order matches the original TURRET_SLOTS / FEATURES arrays, so slot and feature indices are
// unchanged. The last 5 were added for M1c and are vacant in the fixed layout.
// Start-up validation (scene.js) warns about any candidate that breaks the §2 rules.
export const CANDIDATE_LOCATIONS = [
  // Original turret slots, ~4 per lane (§9.1)
  { x: 210,  y: 400,  role: 'slot' },   // 0  mostly Upper-left
  { x: 470,  y: 330,  role: 'slot' },   // 1
  { x: 650,  y: 480,  role: 'slot' },   // 2
  { x: 1090, y: 380,  role: 'slot' },   // 3
  { x: 1530, y: 470,  role: 'slot' },   // 4  mostly Right
  { x: 1420, y: 715,  role: 'slot' },   // 5
  { x: 1235, y: 520,  role: 'slot' },   // 6
  { x: 1720, y: 610,  role: 'slot' },   // 7
  { x: 375,  y: 860,  role: 'slot' },   // 8  mostly Bottom-left
  { x: 730,  y: 845,  role: 'slot' },   // 9
  { x: 1095, y: 865,  role: 'slot' },   // 10
  { x: 470,  y: 1010, role: 'slot' },   // 11
  // Original features. Mix: 2 Trees, 1 Reed Patch, 1 Shrub, 2 Ruins, 2 Ponds.
  { x: 330,  y: 560,  role: 'feature', type: 'tree' },      // 12
  { x: 1700, y: 880,  role: 'feature', type: 'tree' },      // 13
  { x: 1070, y: 1010, role: 'feature', type: 'reedPatch' }, // 14
  { x: 1180, y: 200,  role: 'feature', type: 'shrub' },     // 15
  { x: 700,  y: 165,  role: 'feature', type: 'ruins' },     // 16
  { x: 1780, y: 300,  role: 'feature', type: 'ruins' },     // 17
  { x: 1480, y: 990,  role: 'feature', type: 'pond' },      // 18
  { x: 110,  y: 620,  role: 'feature', type: 'pond' },      // 19
  // New in M1c (TUNING): placed in open ground away from the others; vacant in the fixed layout.
  { x: 70,   y: 1010 }, // 20  bottom-left corner (Bottom-left lane)
  { x: 1490, y: 150 },  // 21  top, right of centre (Right lane)
  { x: 100,  y: 150 },  // 22  top-left corner (Upper-left lane)
  { x: 1270, y: 980 },  // 23  bottom, right of centre (Right lane)
  { x: 1820, y: 750 },  // 24  right edge (Right lane)
];

// Original fixed M1 layout, derived from the candidates above (RANDOMISE_LAYOUT: false).
export const TURRET_SLOTS = CANDIDATE_LOCATIONS.filter((c) => c.role === 'slot').map(({ x, y }) => ({ x, y }));
export const FEATURES = CANDIDATE_LOCATIONS.filter((c) => c.role === 'feature').map(({ x, y, type }) => ({ type, x, y }));

// ---------------------------------------------------------------------------
// Decorative forest (§5.3, M1c §5) — visual only, no gameplay effect.
// Scattered once at start-up on a jittered grid seeded with DECOR_SEED, so it is identical
// in every run and mode. Each object's drawn extent (a circle `lift` px above its base with
// radius `r`, both × its size) must stay clear of every corridor and of every candidate
// location's footprint + jitter + DECOR_MARGIN, including vacant ones.
// ---------------------------------------------------------------------------
export const DECOR = {
  cellSize: 64,               // px, jittered grid cell; one candidate object per cell
  treeChance: 0.42,           // per cell, away from corridors
  bushChance: 0.22,
  rockChance: 0.08,
  edgeBand: 110,              // px from the screen border where trees always grow (boundary)
  corridorGap: 2,             // px kept between any object's drawn extent and a corridor edge
  extent: {                   // drawn extent per kind, in units of the object's size (matches render/environment.js)
    tree: { lift: 40, r: 48 },
    bush: { lift: 10, r: 22 },
    rock: { lift: 7, r: 17 },
  },
  clearingRadius: 120,        // px, open dirt clearing around the Druid
  groundPatches: 70,          // subtle floor colour blobs
};

// ---------------------------------------------------------------------------
// 17.8 Wave
// ---------------------------------------------------------------------------
export const WAVE_TOTAL = 35;
export const BURST_STAGGER = 0.6;        // TUNING — s between wolves in one burst

// TUNING — bursts per lane id; time = seconds since Combat began.
export const WAVE = {
  upperLeft:  [{ time: 0, count: 3 }, { time: 12, count: 2 }, { time: 24, count: 3 }, { time: 40, count: 4 }],
  right:      [{ time: 5, count: 2 }, { time: 16, count: 3 }, { time: 30, count: 3 }, { time: 48, count: 4 }],
  bottomLeft: [{ time: 9, count: 3 }, { time: 20, count: 2 }, { time: 35, count: 3 }, { time: 52, count: 3 }],
};

// ---------------------------------------------------------------------------
// 17.9 Debug
// ---------------------------------------------------------------------------
export const DEBUG_SEED = null;          // null = new random seed each restart; integer = fixed seed
export const DEBUG_START_ENABLED = false;
export const DEBUG_GRANT_AMOUNT = 10;   // G key: +this many of each resource

// ---------------------------------------------------------------------------
// Feedback (§16.3) — visual only
// ---------------------------------------------------------------------------
export const FLOATING_TEXT_TIME = 1.4;   // s a "+2 Pits" style text stays up (simulation time)
export const FLOATING_TEXT_RISE = 40;    // px it drifts upward over that time
