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
export const PREP_DURATION = 25;         // s
export const BUILD_TIME = 2.5;           // s
export const UPGRADE_TIME = 3.0;         // s

// ---------------------------------------------------------------------------
// 17.2 Druid
// ---------------------------------------------------------------------------
export const DRUID_HP = 80;
export const DRUID_POS = { x: 1010, y: 600 };           // TUNING — off-centre
export const DRUID_RADIUS = 28;                          // TUNING
export const DRUID_MELEE_RADIUS = 52;                    // TUNING
export const DRUID_MELEE_SLOTS = 6;                      // TUNING — max simultaneous biters
export const DRUID_ACTION_OFFSET = { x: -40, y: 10 };    // TUNING — Druid position beside a target

// ---------------------------------------------------------------------------
// 17.3 Wolf
// ---------------------------------------------------------------------------
export const WOLF_HP = 18;                // TUNING — 6 base pebbles, 4 upgraded, 3 Vulture pecks
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
export const UPGRADE_COST = { pits: 4, reeds: 0, feathers: 1 };
export const UPGRADED_DAMAGE = 5;
export const UPGRADED_FIRE_INTERVAL = 0.6; // s
export const UPGRADED_RANGE_MULT = 1.2;
export const TURRET_TURN_SPEED = 9;       // TUNING — rad/s, how fast a turret visibly turns toward its target (visual; firing does not wait for it)
export const TURRET_MUZZLE_HEIGHT = 40;   // px above the slot where pebbles leave the sprinkler
export const WOLF_HIT_HEIGHT = 10;        // px above a wolf's collision centre where pebbles strike its body

// ---------------------------------------------------------------------------
// 17.5 Vulture
// ---------------------------------------------------------------------------
export const VULTURE_COST = { pits: 0, reeds: 0, feathers: 3 };
export const VULTURE_HP = 15;
export const VULTURE_DAMAGE = 6;
export const VULTURE_ATTACK_INTERVAL = 0.7; // s
export const VULTURE_DURATION = 12;         // s
export const MAX_VULTURES = 3;
export const VULTURE_SPEED = 140;           // TUNING — px/s, deliberately slowish so placement matters
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

// TUNING — 12 slots, ~4 per lane, irregular, outside corridors (§9.1).
export const TURRET_SLOT_RADIUS = 30;     // TUNING — px, slot pad size (drawing and later clicking)
export const TURRET_SLOTS = [
  { x: 210, y: 400 }, { x: 470, y: 330 }, { x: 650, y: 480 }, { x: 1090, y: 380 },   // mostly Upper-left
  { x: 1530, y: 470 }, { x: 1420, y: 715 }, { x: 1235, y: 520 }, { x: 1720, y: 610 },  // mostly Right
  { x: 375, y: 860 }, { x: 730, y: 845 }, { x: 1095, y: 865 }, { x: 470, y: 1010 },   // mostly Bottom-left
];

// ---------------------------------------------------------------------------
// 17.7 Searchable features
// ---------------------------------------------------------------------------
// yields: resource → [min, max] inclusive integers. All ranges TUNING.
export const FEATURE_TYPES = {
  tree:      { name: 'Tree',       searchTime: 1.2, yields: { pits: [2, 4] } },
  reedPatch: { name: 'Reed Patch', searchTime: 1.4, yields: { reeds: [1, 3] } },
  shrub:     { name: 'Shrub',      searchTime: 1.7, yields: { feathers: [2, 4] } },
  ruins:     { name: 'Ruins',      searchTime: 1.8, yields: { pits: [0, 3], feathers: [0, 2] } },
  pond:      { name: 'Pond',       searchTime: 2.0, yields: { pits: [0, 2], reeds: [1, 2] } },
};

export const FEATURE_RADIUS = 36;         // TUNING — px, feature footprint (drawing, overlap checks, later clicking)

// TUNING — positions. Mix is fixed: 2 Trees, 1 Reed Patch, 1 Shrub, 2 Ruins, 2 Ponds.
export const FEATURES = [
  { type: 'tree',      x: 330,  y: 560 },
  { type: 'tree',      x: 1700, y: 880 },
  { type: 'reedPatch', x: 1070, y: 1010 },
  { type: 'shrub',     x: 1180, y: 200 },
  { type: 'ruins',     x: 700,  y: 165 },
  { type: 'ruins',     x: 1780, y: 300 },
  { type: 'pond',      x: 1480, y: 990 },
  { type: 'pond',      x: 110,  y: 620 },
];

// ---------------------------------------------------------------------------
// Decorative forest (§5.3) — visual only, no gameplay effect.
// Scattered once at start-up on a jittered grid with its own fixed seed, so the
// layout is identical every run and automatically keeps clear of corridors,
// slots and features when those are moved.
// ---------------------------------------------------------------------------
export const DECOR = {
  seed: 1337,                 // fixed; independent of the gameplay seed
  cellSize: 64,               // px, jittered grid cell; one candidate object per cell
  treeChance: 0.42,           // per cell, away from corridors
  bushChance: 0.22,
  rockChance: 0.08,
  edgeBand: 110,              // px from the screen border where trees always grow (boundary)
  treeCorridorGap: 26,        // px beyond the corridor edge kept free of trees
  smallCorridorGap: 4,        // px beyond the corridor edge kept free of bushes and rocks
  objectGap: 46,              // px of clear ground around slots and features
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
