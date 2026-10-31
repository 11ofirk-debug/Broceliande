// Broceliande — code-side settings (M2j §2.2): stage and loop, UI and drawing sizes, visual-only
// timings, lane geometry and decoration, debug. Balancing data (global settings, Druid, enemies,
// turrets, summons, items, levels, waves…) lives in data/*.csv, edited in the Google Sheet, and
// is filled in at the bottom of this file by applyData() at start-up (see js/boot.js).

// ---------------------------------------------------------------------------
// Stage & loop (§3.4, §3.5)
// ---------------------------------------------------------------------------
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

export const SIM_STEP = 1 / 60;          // seconds, fixed timestep
export const MAX_FRAME_DT = 0.05;        // real seconds; larger frame gaps (tab switch) are clamped
export const MAX_STEPS_PER_FRAME = 12;   // hard cap on sim steps per animation frame (covers ×4 speed)
export const SIM_SPEEDS = [1, 2, 4];     // game speeds for the player in Combat (M2k §1: HUD buttons, keys 1 / 2 / 4)

// ---------------------------------------------------------------------------
// M1b addendum §9 — step-budget Prep (docs/M1B_STEPS_ADDENDUM.md)
// ---------------------------------------------------------------------------
export const PREP_MODE = 'steps';          // 'steps' | 'timed' — mode at page load; debug key M toggles it
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
export const DRUID_ACTION_OFFSET = { x: -58, y: 20 };    // TUNING — Druid position beside a target (just outside LOCATION_RADIUS)
// M1f §4: each strike is wind-up → swing + lunge → impact (damage lands here) → recover.
export const STRIKE_RECOVER_TIME = 0.18;                 // s, staff and Druid return to rest (visual only)
export const STRIKE_LUNGE_PX = 10;                       // px the Druid lunges toward the target (visual only)

// ---------------------------------------------------------------------------
// Enemies — visual and debug only (their stats and drops are in data/enemies.csv, drops.csv)
// ---------------------------------------------------------------------------

// Flying enemies (M2h §3, the Stirge).
export const DEBUG_STIRGE_FLOCK = 4; // debug key S: Stirges per flock (M2h §6)

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

// Grim enemies (M2l). Their stats, traits, drawScale and soundPitch are in data/enemies.csv; this is
// their look and debug only.
export const GRIM_OUTLINE_COLOR = '#ff8a2a'; // TUNING — ember outline round the whole silhouette
export const GRIM_OUTLINE_WIDTH = 1.6;      // px
export const GRIM_OUTLINE_PERIOD = 1;       // s per pulse
export const GRIM_OUTLINE_ALPHA = [0.55, 1]; // its opacity at the pulse's low and high
export const GRIM_CRACK_COLOR = '#ff9a3a';  // glowing crack lines across the body
export const GRIM_SPIKE_COLOR = '#b9b4aa';  // the Grim Ogre's club spikes (iron)
export const GRIM_SMOKE_PUFFS = 5;          // TUNING — pale ash puffs rising off each Grim at once
export const GRIM_SMOKE_RGB = '214, 208, 200'; // pale ash grey
export const GRIM_SMOKE_ALPHA = 0.62;       // a puff's peak opacity
export const GRIM_SMOKE_RATE = 0.55;        // TUNING — rises per s (each puff's cycle)
export const GRIM_SMOKE_RISE = 1.6;         // × radius a puff rises before it fades
export const GRIM_SPARKS = 3;               // tiny ember sparks rising through the smoke
export const GRIM_SPARK_RATE = 0.9;         // rises per s
export const ARMOR_SPARK_TIME = 0.18;       // s the grey spark shows where armor reduced a hit
export const HEAL_SPARKLE_TIME = 0.4;       // s the red sparkle shows on a biter that healed
export const DOGGED_SPIRAL_SPEED = 3;       // × the slow spiral's turn rate on a slow-resistant enemy
export const DOGGED_SPIRAL_ALPHA = 0.5;     // its opacity
export const DEBUG_GRIM_WOLVES = 4;         // debug Shift+G: Grim Wolves spawned at once
export const SHOWCASE_GAP = 28;             // debug Shift+C: px between the figures in the comparison row
export const SHOWCASE_PAIR_GAP = 70;        // px between one normal / Grim pair and the next


// ---------------------------------------------------------------------------
// Turrets — visual only (their stats are in data/turrets.csv)
// ---------------------------------------------------------------------------

export const CLOUD_GROW_TIME = 0.3;       // s, a cloud grows from pellet size to full radius (visual only)
export const CLOUD_FADE_TIME = 0.6;       // s, it fades out over its last moments (visual only)
export const TURRET_TURN_SPEED = 9;       // TUNING — rad/s, how fast a turret visibly turns toward its target (visual; firing does not wait for it)
export const TWIN_SHOT_SPREAD = 5;        // px either side of the muzzle the Stormspinner's two pebbles leave from (M2m §2.5, visual)

// ---------------------------------------------------------------------------
// 17.5 Vulture
// ---------------------------------------------------------------------------
export const VULTURE_FLIGHT_HEIGHT = 26;    // px a flying Vulture is drawn above its ground shadow (visual only)

// ---------------------------------------------------------------------------
// 17.6 Scene layout
// ---------------------------------------------------------------------------
export const HUD_STRIP_HEIGHT = 80;       // px
export const LANE_LENGTH_FACTOR = 2.0;    // TUNING — target lane length ÷ straight-line spawn→Druid distance
export const LANE_LENGTH_TOLERANCE = 0.15; // start-up warning if a lane's length factor is off LANE_LENGTH_FACTOR by more than this fraction
export const LANE_SAMPLES_PER_SEGMENT = 24; // polyline samples between two waypoints (§12.2)

export const TURRET_SLOT_RADIUS = 30;     // TUNING — px, slot pad size (drawing only; must fit LOCATION_RADIUS)
export const TURRET_BASE_OFFSET = 18;     // px the slot pad sits below its location centre, so pad + turret fit the footprint (M1c §2.1)

// ---------------------------------------------------------------------------
// 17.7 Searchable features
// ---------------------------------------------------------------------------

export const FEATURE_RADIUS = 32;         // TUNING — px, feature sprite scale (drawing only; sprites must fit LOCATION_RADIUS)

// ---------------------------------------------------------------------------
// M1c addendum — candidate locations and randomised layout (docs/M1C_LAYOUT_ADDENDUM.md §7)
// ---------------------------------------------------------------------------
export const DECOR_MARGIN = 15;           // TUNING — px, decoration keeps this far beyond footprint + jitter


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
export const WAVE_ICON_SIZE = 30;       // px, enemy images in the wave preview (M2i §4.2)

// ---------------------------------------------------------------------------
// Summons — UI and visual only (their stats are in data/summons.csv)
// ---------------------------------------------------------------------------

// Summon shortcuts in Combat (same as choosing the summon in the Druid's menu), shown as key badges there.
export const SUMMON_DENIED_FLASH_TIME = 0.45; // s an unavailable summon's option flashes in the open Druid menu

// Slow Wisp (M2k §3.5), visual only; its stats are in data/summons.csv.
export const WISP_COLOR = '#c8dcf0';          // pale silver-blue: the orb, its trail, the burst and the slowed tint
export const WISP_GLOW = 'rgba(190, 215, 245, 0.35)';
export const WISP_TRAIL_POINTS = 10;          // TUNING — trail length, in past positions
export const WISP_TRAIL_SPACING = 0.05;       // s of flight between trail points
export const WISP_SPIRAL_RADIUS = 6;          // TUNING — px, the lazy spiral the orb and trail wobble along
export const WISP_SPIRAL_RATE = 3;            // rad/s of that wobble
export const WISP_BURST_TIME = 0.8;           // s the burst takes to fade out
export const SLOW_TINT_FILTER = 'grayscale(0.55) sepia(0.25) hue-rotate(175deg) brightness(1.25)'; // TUNING — pale silver-blue tint on a slowed enemy (canvas filter)
export const CORRODE_TINT_FILTER = 'sepia(0.55) hue-rotate(30deg) saturate(1.6) brightness(1.08)'; // TUNING — faint yellow-green tint on a Corroded enemy (M2m §2.5)
export const SLOW_CORRODE_TINT_FILTER = 'grayscale(0.5) sepia(0.4) hue-rotate(110deg) saturate(1.3) brightness(1.2)'; // TUNING — teal mix while both slowed and Corroded
export const SLOW_SPIRAL_SIZE = 7;            // px, radius of the spiral floating above a slowed enemy's head
export const SLOW_SPIRAL_TURN_RATE = 1.2;     // rad/s it turns
export const SOUND_WISP_FREQ = 620;           // TUNING — Hz, the Wisp's airy whistle

// Bough Double (M1i §2): a summon that does one build or upgrade job at a turret slot in
// Combat, then disappears. Its full cost (the job's cost plus BOUGH_DOUBLE_COST) is paid at
// once; cancelling refunds it all. It appears beside its target at DRUID_ACTION_OFFSET.
export const DOUBLE_TINT = '#7a5530';       // monochrome brown version of the Druid's drawing
export const DOUBLE_ALPHA = 0.6;
export const DOUBLE_CRAFT_SWING_INTERVAL = 0.45; // s between staff swings (each one a craft hit)
export const DOUBLE_APPEAR_TIME = 0.2;      // s to fade and scale in (visual only)
export const DOUBLE_FADE_TIME = 0.3;        // s to fade out on completion or cancel (visual only)
export const DOUBLE_BOB_PX = 2;             // px of gentle bob while crafting (visual only)
export const DOUBLE_CHIP_TIME = 0.45;       // s a wood chip flies before vanishing (visual only)

export const RESOURCE_ICON_SIZE = 28;     // px, resource icons in the HUD panel
export const MENU_PORTRAIT_SIZE = 40;     // px, creature / turret images in menus (M1f §2)
export const MENU_COST_ICON_SIZE = 18;    // px, resource icons in cost rows (M1f §3)
export const DROP_ICON_SCALE = 0.7;       // drop icons on the ground, relative to RESOURCE_ICON_SIZE
// M1g §1: drops pop out of the death point and arc to their resting spot (simulation time).
export const DROP_SETTLE_TIME = 0.08;     // s of squash-and-settle on landing (visual only)

// ---------------------------------------------------------------------------
// Sound (M1g §3) — synthesised in js/audio.js, triggered by gameplay events. Never affects the simulation.
// ---------------------------------------------------------------------------
export const SOUND_RESOURCE_FREQ = { pits: 440, reeds: 660, feathers: 990, boughs: 300, shells: 520 }; // TUNING — Hz, chime pitch per resource (Boughs lowest and woody, M1i §1.3; Shells soft and hollow, M2k §2.1)
export const SOUND_CHIME_STAGGER = 0.07;  // s between chimes when one search finds several resources
export const SOUND_SUMMON_FREQ = { vulture: 330, squirrel: 880 }; // TUNING — Hz, shimmer base pitch per summon
export const SOUND_STATS_WINDOW = 5;      // s, debug panel: sounds played / skipped over this much real time (M1g §5)
export const SOUND_MUTE_KEY = 'broceliande.muted'; // localStorage key for the mute state

// ---------------------------------------------------------------------------
// Place scenes (M2n §1): full-screen scenes of non-combat map nodes, the Trader's first. A scene
// template: a background in the place's palette (PLACE_PALETTE) with decoration, a character on
// the left (the Druid) and one on the right (the host), and the interaction area between them.
// Stage px; feet positions. Drawing and layout only.
// ---------------------------------------------------------------------------
export const PLACE_SCENE = {
  horizonY: 430,                          // the clearing's back edge: forest above, open ground below
  clearing: { x: 960, y: 760, rx: 1000, ry: 330 }, // the open ground ellipse
  druid: { x: 400, y: 640, scale: 2.4 },  // left character (zone kept clear for a sprite later)
  host: { x: 1520, y: 600, scale: 2.4 },  // right character
  decorSeed: 4242,                        // the background trees and bushes (visual only)
  backTrees: 16,                          // trees along the clearing's back edge
  sideBushes: 10,                         // bushes along its sides
};
export const TRADER_SCENE = {
  cart: { x: 1700, y: 520 },              // behind the trader
  campfire: { x: 690, y: 470 },           // at the back of the clearing, behind and right of the Druid
  blanket: { x: 1490, y: 790, rx: 360, ry: 92 }, // the goods lie on it (DOM over it, traderScreen.js)
  scale: { x: 960, y: 560 },              // balance scale, centre
};
export const TRADER_FADE_TIME = 0.35;     // s, the fade into and out of the trader scene (M2n §1)
export const TRADER_SCALE_TIP_TIME = 0.7; // s the scale tips toward the trader after a trade (visual)
export const TRADER_LOOKS = [             // per-trader colour variation (cloak, hood lining, pack)
  { cloak: '#5b3a5e', lining: '#8a5a8e', pack: '#7a5a34' },
  { cloak: '#3d5a3a', lining: '#6d8a5a', pack: '#80613a' },
  { cloak: '#6a3a2a', lining: '#a0603e', pack: '#6c5232' },
  { cloak: '#2f4a5e', lining: '#5a7a90', pack: '#7d5c3a' },
  { cloak: '#5e5230', lining: '#8f8048', pack: '#6a4a2c' },
];

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
export const DRUID_SWIPE_TIME = 0.25;   // s a Druid strike swoosh arc stays visible (M1e §2.4, M1f §4)
export const STRIKE_SPARK_TIME = 0.2;   // s the impact spark on the target stays visible (M1f §4)
export const STRIKE_KNOCKBACK_PX = 3;   // px the target is pushed back visually on impact (simulation position unchanged)
export const STRIKE_KNOCKBACK_TIME = 0.15; // s for that visual knock-back to settle

// ---------------------------------------------------------------------------
// Level geometry (M2a §5, M2j §2.2): the code-side half of each level, tied to its lanes. The
// balancing half (name, description, step budget, feature mix, candidates, palette, waves…) is
// in data/*.csv; applyData() merges the two into LEVELS. Start-up validation runs for every
// level. Fields:
//   druidPos                where the Druid stands (off-centre)
//   lanes                   waypoints (§12.1): the first is the spawn, just off-screen; the last
//                           lies on the Druid's melee ring (druidPos + DRUID_MELEE_RADIUS in the
//                           approach direction). The debug panel reports each lane's length,
//                           length factor and unopposed travel time.
//   sectorBoundaryAngles,   zones (M1j §2): three sectors around druidPos, one per lane, each split
//   sectorNames, nearRadius into near (within nearRadius) and far. Angles in degrees from the Druid,
//                           0° = east, clockwise (screen y points down); sector i runs clockwise
//                           from sectorBoundaryAngles[i] to the next boundary.
//   zoneQuotaOverrides      per zone: turret slots and resource spots that differ from the global
//                           ZONE_* quotas (data); the rest of a zone's candidates stay vacant
//   decorSeed, decorDensity decoration: fixed per level; decorDensity multiplies DECOR's chances
//   thornBushes, gnarledTrees, optional themed decoration (M2a §5.3, M2b §3), all clear of corridors
//   decorProps, flats,      and candidates: bush / tree styles; extra prop kinds (kind → chance per
//   stoneRing, landmarks…   cell); water or mist patches; standing stones round the Druid; fixed
//                           landmarks such as the burial mound
// ---------------------------------------------------------------------------
export const LEVEL_GEOMETRY = {
  tornville: {
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
    // fSW fits only 3 candidates under the M1c spacing rules, and its corner one would sit under
    // the level-name label (M2a §6), so it has 2: both turret slots. Its resource spot goes to
    // nSW; fE holds the far zones' other extra one (totals stay 12 turret slots and 9 resource spots).
    zoneQuotaOverrides: {
      fSW: { turret: 2, feature: 0 }, // TUNING
      nSW: { turret: 2, feature: 2 }, // TUNING
      fE:  { turret: 2, feature: 3 }, // TUNING
    },
    decorSeed: 12345,
    decorDensity: 1,
  },
  // Option A: swarm (M2a §5.2). Lanes enter from the top, the left and the bottom-right; the
  // Druid stands left of centre so the two eastern lanes have room to wind.
  gallows: {
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
    zoneQuotaOverrides: {},
    decorSeed: 2024,
    decorDensity: 0.9,                    // TUNING — a little sparser: open, misty ground
  },
  // Option B: brutes (M2a §5.2). Lanes enter from the top-left, the bottom and the right; the
  // Druid stands right of centre and higher.
  blackthorn: {
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
    zoneQuotaOverrides: {},
    decorSeed: 4242,
    decorDensity: 1.35,                   // TUNING — dense undergrowth
    thornBushes: true,                    // spiky thorn bushes instead of round ones (M2a §5.3)
  },
  // Level 3 (M2b §3.2): narrow causeways between flooded ground. Lanes enter from the right, the
  // bottom and the left; the Druid stands up and left of centre. Tight bends bunch enemies up,
  // and the 90 px corridors stop wolves from passing Bears.
  drowned: {
    druidPos: { x: 760, y: 330 },
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
    // nS fits only 2 candidates (the South lane runs through it), so its resource spot moves to fS.
    zoneQuotaOverrides: {
      nS: { turret: 2, feature: 0 },      // TUNING
      fS: { turret: 2, feature: 3 },      // TUNING
    },
    decorSeed: 3131,
    decorDensity: 0.8,                    // TUNING — the water patches take much of the ground
    // Dark water patches (outside corridors and candidates), each with a sunken roof or broken
    // fence and reeds round its edge (M2b §3.2). edge: extra px kept clear round each patch.
    flats: { kind: 'water', count: 12, rx: [42, 80], ry: [24, 42], edge: 8 }, // TUNING
    decorProps: { reeds: 0.2 },           // TUNING — extra reed tufts, per cell
  },
  // Level 3 (M2b §3.3): huge wolf surges down wide corridors. Lanes enter from the top, the left
  // and the right; the Druid stands right of centre inside a ring of standing stones.
  wychwood: {
    druidPos: { x: 1120, y: 540 },
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
    // The wide corridors leave nW and nN room for 2 candidates each: both turret slots. Their
    // resource spots move to fE and fW.
    zoneQuotaOverrides: {
      nW: { turret: 2, feature: 0 },      // TUNING
      nN: { turret: 2, feature: 0 },      // TUNING
      fE: { turret: 2, feature: 3 },      // TUNING
      fW: { turret: 2, feature: 3 },      // TUNING
    },
    decorSeed: 5150,
    decorDensity: 1.1,                    // TUNING
    gnarledTrees: true,                   // twisted old trees (M2b §3.3)
    // Standing stones in a ring round the Druid (left out where a corridor or candidate is in the way).
    stoneRing: { radius: [125, 420], count: 16, size: 0.6 }, // TUNING — each stone at the first clear radius
    decorProps: { mushrooms: 0.25 },      // TUNING — small glowing mushrooms, per cell
  },
  // Level 3 (M2b §3.4), a Fell Wilds since M2c §1.4: its Ogre is the main threat. Lanes enter from the left, the top and the top of the
  // right edge; the Druid stands low, beside a great burial mound.
  barrow: {
    druidPos: { x: 880, y: 800 },
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
    // nE fits 2 candidates and fN 3; their resource spots move to fW and fE.
    zoneQuotaOverrides: {
      nE: { turret: 2, feature: 0 },      // TUNING
      fN: { turret: 2, feature: 1 },      // TUNING
      fW: { turret: 2, feature: 3 },      // TUNING
      fE: { turret: 2, feature: 3 },      // TUNING
    },
    decorSeed: 6066,
    decorDensity: 0.75,                   // TUNING — open, dry grassland
    // The burial mound beside the Druid: base centre, size = half-width (px).
    landmarks: [{ kind: 'mound', x: 630, y: 985, size: 135 }], // TUNING
    flats: { kind: 'mist', count: 9, rx: [90, 170], ry: [28, 50], edge: 0 }, // TUNING — low mist patches, a faint ground tint drawn anywhere
    decorProps: { gravestone: 0.15, slab: 0.08 }, // TUNING — per cell
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
    zoneQuotaOverrides: {
      fSE: { turret: 2, feature: 0 }, // TUNING
      nSE: { turret: 2, feature: 2 }, // TUNING
      fW: { turret: 2, feature: 3 }, // TUNING
    },
    decorSeed: 7001,
    decorDensity: 0.9,                    // TUNING
    decorProps: { kiln: 0.08 },           // TUNING — signature: charcoal kilns, per cell
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
    zoneQuotaOverrides: {
      nW: { turret: 2, feature: 0 }, // TUNING
      nS: { turret: 2, feature: 0 }, // TUNING
      fE: { turret: 2, feature: 3 }, // TUNING
      fW: { turret: 2, feature: 3 }, // TUNING
      // fS lost its corner candidate (under the level-name label): one resource spot moves to nE.
      fS: { turret: 2, feature: 1 }, // TUNING
      nE: { turret: 2, feature: 2 }, // TUNING
    },
    decorSeed: 7002,
    decorDensity: 1,                      // TUNING
    // Signature: a shallow stream across the map, crossed by the corridors as fords (drawn under them).
    stream: {                             // TUNING — threads between the candidates, crossing the lanes
      width: 46,
      points: [{ x: 1560, y: 60 }, { x: 1500, y: 170 }, { x: 1455, y: 320 }, { x: 1375, y: 470 }, { x: 1370, y: 600 }, { x: 1420, y: 740 }, { x: 1460, y: 880 }, { x: 1520, y: 1000 }, { x: 1540, y: 1100 }],
    },
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
    zoneQuotaOverrides: {},
    decorSeed: 7003,
    decorDensity: 1.1,                    // TUNING
    thornBushes: true,
    // Signature: a ruined chapel wall overgrown with briars (base centre; size = half-width).
    landmarks: [{ kind: 'chapelWall', x: 710, y: 1050, size: 110 }], // TUNING — nearest clear spot to the Druid
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
    zoneQuotaOverrides: {
      nS: { turret: 2, feature: 0 }, // TUNING
      fS: { turret: 2, feature: 3 }, // TUNING
    },
    decorSeed: 7004,
    decorDensity: 0.8,                    // TUNING
    // Signature: broken causeway stones half under water, in the water patches.
    flats: { kind: 'water', count: 12, rx: [42, 80], ry: [24, 42], edge: 8, props: ['sunkenStones'] }, // TUNING
    decorProps: { reeds: 0.15 },          // TUNING
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
    zoneQuotaOverrides: {
      nE: { turret: 2, feature: 0 }, // TUNING
      nN: { turret: 2, feature: 0 }, // TUNING
      fW: { turret: 2, feature: 3 }, // TUNING
      fE: { turret: 2, feature: 3 }, // TUNING
    },
    decorSeed: 7005,
    decorDensity: 1.15,                   // TUNING
    gnarledTrees: true,                   // signature: gnarled orchard trees
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
    zoneQuotaOverrides: {
      nW: { turret: 2, feature: 0 }, // TUNING
      fN: { turret: 2, feature: 1 }, // TUNING
      fE: { turret: 2, feature: 3 }, // TUNING
      fW: { turret: 2, feature: 3 }, // TUNING
    },
    decorSeed: 7006,
    decorDensity: 1.05,                   // TUNING
    // Signature: a large moss-covered cairn near the Druid (base centre; size = half-width).
    landmarks: [{ kind: 'cairn', x: 1180, y: 860, size: 90 }], // TUNING — the nearest clear spot to the Druid
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
    zoneQuotaOverrides: {
      nE: { turret: 2, feature: 0 }, // TUNING
      nS: { turret: 2, feature: 0 }, // TUNING
      fW: { turret: 2, feature: 3 }, // TUNING
      fE: { turret: 2, feature: 3 }, // TUNING
      // fS lost its corner candidate (under the level-name label): its second resource spot moves to nW.
      fS: { turret: 2, feature: 1 }, // TUNING
      nW: { turret: 2, feature: 2 }, // TUNING
    },
    decorSeed: 7007,
    decorDensity: 0.85,                   // TUNING
    // Signature: burnt tree stumps, and very subtle ash flecks drifting over the ground.
    decorProps: { stump: 0.12 },          // TUNING — per cell
    ashFlecks: 40,                        // TUNING — ambient ash flecks (visual only)
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
    zoneQuotaOverrides: {},
    decorSeed: 7008,
    decorDensity: 1,                      // TUNING
    bareTrees: true,                      // signature: pale, leafless trees
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
    zoneQuotaOverrides: {
      fNW: { turret: 2, feature: 0 }, // TUNING
      nNW: { turret: 2, feature: 2 }, // TUNING
      fE: { turret: 2, feature: 3 }, // TUNING
    },
    decorSeed: 7009,
    decorDensity: 0.95,                   // TUNING
    decorProps: { weepingStone: 0.07 },   // TUNING — signature: tall standing stones with dark streaks, per cell
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
    zoneQuotaOverrides: {
      nW: { turret: 2, feature: 1 }, // TUNING — 3 candidates, one added at a free spot
      nS: { turret: 2, feature: 0 }, // TUNING — 2 candidates with the wider corridors
      // The wider corridors leave fS 2 candidates: its resource spot moves to fE.
      fS: { turret: 2, feature: 0 }, // TUNING
      fE: { turret: 2, feature: 4 }, // TUNING
      fW: { turret: 2, feature: 3 }, // TUNING
    },
    decorSeed: 7010,
    decorDensity: 1,                      // TUNING
    // Signature: a cracked bronze bell half-buried near the Druid (base centre; size = half-width).
    landmarks: [{ kind: 'bell', x: 1150, y: 310, size: 60 }], // TUNING — the nearest clear spot to the Druid
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
    // nSW fits 2 candidates with the wider corridors: its resource spot moves to nN.
    zoneQuotaOverrides: {
      nSW: { turret: 2, feature: 0 }, // TUNING
      nN: { turret: 2, feature: 2 },  // TUNING
    },
    decorSeed: 7011,
    decorDensity: 1.2,                    // TUNING
    // Signature: huge ancient roots round the Druid (left out where a corridor or candidate is in the way).
    stoneRing: { kind: 'root', radius: [110, 440], count: 14, size: 0.85 }, // TUNING
    laneGlow: true,                       // a sickly purple-red glow at the lane entrances
  },
};

// ---------------------------------------------------------------------------
// Level map and run (M2a §2–§4). A run is a path through its map from MAP_START_NODE; winning a
// node with no `next` completes it. Each run's map is generated (M2g, js/mapGen.js): the nodes stay
// in their rows, at fixed row heights on the 1920×1080 stage, the start at the bottom; their order,
// x positions and roads vary. Nothing in the code is tied to these particular nodes.
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
// HUD strip; the 8 rows (M2f) fill it from the bottom. Positions within a row are generated (M2g).
export const MAP_BOTTOM_ROW_Y = 985;      // px, the start row
export const MAP_ROW_SPACING = 108;       // px between rows (≈ y of row k = MAP_BOTTOM_ROW_Y − k × this)
export const MAP_ROW_CAPACITY = 9;        // rows the map must be able to hold
export const MAP_LABEL_FONT_PX = 18;      // node names; a name wider than MAP_LABEL_MAX_WIDTH wraps onto two lines
export const MAP_LABEL_MAX_WIDTH = 170;   // px
// M2g §1: the map's nodes. Each sits in its level's row (levels tab, `row`): row 1 the start, the
// last row the boss. Their order within a row, their positions and the roads between rows are
// generated per run (js/mapGen.js), so none are listed here.
export const MAP_NODES = [
  { id: 'tornville',  levelId: 'tornville' },
  { id: 'gallows',    levelId: 'gallows' },
  { id: 'blackthorn', levelId: 'blackthorn' },
  { id: 'wychwood',   levelId: 'wychwood' },
  { id: 'barrow',     levelId: 'barrow' },
  { id: 'drowned',    levelId: 'drowned' },
  { id: 'charcoal',   levelId: 'charcoal' },
  { id: 'stags',      levelId: 'stags' },
  { id: 'briar',      levelId: 'briar' },
  { id: 'causeway',   levelId: 'causeway' },
  { id: 'widows',     levelId: 'widows' },
  { id: 'mossbound',  levelId: 'mossbound' },
  { id: 'ashen',      levelId: 'ashen' },
  { id: 'bone',       levelId: 'bone' },
  { id: 'weeping',    levelId: 'weeping' },
  { id: 'bells',      levelId: 'bells' },
  { id: 'heartwood',  levelId: 'heartwood' },
];
export const MAP_START_NODE = 'tornville';
export const MAP_NODE_RADIUS = 30;        // px (M2e §4.6, was 44)
export const MAP_BOSS_SCALE = 1.5;        // M2f §2: a large node (the Boss) is drawn and hit-tested this much bigger
export const MAP_BOSS_PULSE_HZ = 0.35;    // its slow, faint red pulse
export const MAP_HOVER_SCALE = 1.08;      // an available node under the pointer grows this much
export const MAP_PULSE_HZ = 0.8;          // gentle glow pulse of available nodes
export const MAP_DECOR_SEED = 909;        // the map's procedural tree clusters, identical every run

// Generated map (M2g §2–§5): node order and x positions within each row, the roads between
// adjacent rows (never crossing) and their curves, from the run seed. Rows stay at fixed heights.
export const MAP_RANDOMISE = true;        // false = every run uses the map from MAP_FIXED_SEED (§3)
export const MAP_FIXED_SEED = 2024;
export const MAP_Y_JITTER = 8;            // px, a node's height may differ from its row's by up to this
export const MAP_MIN_NODE_GAP = 150;      // px between nodes in one row, so their labels don't collide
export const MAP_X_MARGIN = 110;          // px kept from the map area's edges (EQUIP_PANEL_WIDTH … stage edge), for labels
export const MAP_SINGLE_NODE_SPREAD = 60; // px, a single-node row (start, boss) sits within this of the map area's centre
export const MAP_ROAD_REACH = 220;        // px; a road's weight falls as exp(−horizontal distance / this): short roads are likelier
export const MAP_EXTRA_ROAD_CHANCE = 0.25; // TUNING — chance per extra non-crossing road candidate (× its distance weight)
export const MAP_MAX_ATTEMPTS = 200;      // whole maps tried until one passes every check; else the best one, with a warning
export const MAP_ROAD_BEND = 26;          // px, the most a road's curve bows sideways (seeded per road)
export const MAP_ROAD_CLEARANCE = 12;     // px a road keeps from other nodes' circles and labels

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



// Finding items (M2e §3): one hidden in a random resource spot of each battle.
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

// ===========================================================================
// Balancing data (M2j): loaded from data/*.csv (edited in the Google Sheet) at start-up by
// js/boot.js, which calls applyData() before any other game module runs. These keep the names
// they had when they lived above, so systems still read C.NAME. Their meaning is documented in the
// CSVs' `notes` column and docs/M2J_DATA_SHEET_ADDENDUM.md.
// ===========================================================================

// Code-side lists the data must match: the resources the game draws (icons, HUD) and its summons.
export const RESOURCE_IDS = ['pits', 'reeds', 'feathers', 'boughs', 'shells'];
export const SUMMON_KINDS = ['vulture', 'squirrel', 'double', 'slowWisp'];
// Palettes of non-combat places (M2n §1): rows of the palettes tab that aren't levels.
export const PLACE_PALETTES = ['trader'];
// The traders tab's kinds (M2n §4.5): the name pool and the lines for each moment.
export const TRADER_LINE_KINDS = ['name', 'greet', 'trade', 'soldout', 'leave'];

// globals tab
export let PREP_DURATION, END_DELAY, STEP_PX, TRAVEL_TWEEN_TIME;
export let ENEMY_WANDER_SPEED, ENEMY_WANDER_INTERVAL, ENEMY_SIDESTEP_SPEED, ENEMY_SLOT_CLAIM_DISTANCE,
  DRUID_APPROACH_RADIUS, ENEMY_DIRECT_APPROACH_ANGLE, STUCK_TIME, STUCK_DECAY_RATE, SIDE_KEEP_MARGIN;
export let STIRGE_DRUID_RING, STIRGE_WANDER_SPEED, STIRGE_WANDER_INTERVAL, STIRGE_SEPARATION,
  STIRGE_SEPARATION_SPEED, CLOUDS_HIT_FLYERS;
export let BURST_STAGGER, FIRST_WAVE_DELAY, WAVE_GAP_AFTER_LAST_SPAWN;
export let CORRIDOR_WIDTH, RANDOMISE_LAYOUT, FIXED_LAYOUT_SEED, LOCATION_RADIUS, LOCATION_JITTER, LOCATION_GAP,
  LANE_MIN_TURRET_SLOTS, FEATURE_ROUTE_MIN_FACTOR, FEATURE_ROUTE_MAX_FACTOR, MAX_LAYOUT_ATTEMPTS;
export let ZONE_NEAR_TURRET, ZONE_NEAR_FEATURE, ZONE_FAR_TURRET, ZONE_FAR_FEATURE;
export let DROP_SPACING, DROP_POP_HEIGHT, DROP_POP_TIME, DROP_POP_STAGGER, DROP_SINGLE_OFFSET;
export let FLOATER_RISE_PX, FLOATER_TIME, FLOATER_STAGGER, FLOATER_STACK_PX;
export let SWEEP_FLIGHT_TIME, SWEEP_STAGGER, SWEEP_END_MARGIN, SWEEP_END_SCALE, SWEEP_PULSE_TIME;
export let CARRY_DRUID_HP, ITEMS_PER_BATTLE, WORK_SPEED, SEARCH_MAIN_BONUS, BOUGH_REFUND_CHANCE;
export let MASTER_VOLUME, SOUND_PITCH_JITTER;
export let TRADERS_PER_RUN, TRADE_PRICE_VARIATION, TRADE_MARGIN, TRADE_MAX_RATIO_TERM, TRADE_TAG_CHEAP, TRADE_TAG_PRICEY;

// druid tab
export let DRUID_HP, DRUID_RADIUS, DRUID_MELEE_RADIUS, DRUID_MELEE_SLOTS, DRUID_MELEE_DAMAGE, DRUID_MELEE_INTERVAL,
  STRIKE_WINDUP_TIME, STRIKE_SWING_TIME, DRUID_REGEN_AMOUNT, DRUID_REGEN_INTERVAL;

// resources: id → { name, singular, plural, order }; RESOURCE_ORDER: ids in display order
export let RESOURCES, RESOURCE_ORDER;
// features: id → { name, searchTime, yields: { resource: [min, max] }, mainResource }
export let FEATURE_TYPES;
// enemies + drops: id → { baseType (its own id for a base row), variant (e.g. 'grim', or null), name, plural, hp, speed, radius, damage, attackInterval, meleeSlotsUsed,
// hitHeight, drops: [{ resource, chance, min, max }], and optional collisionRadius, windupTime,
// flying, flyHeight, burstStagger, dropSpacing, keepSide, sideWander, boss, stepSoundInterval }
export let ENEMY_TYPES;
// turrets: id → { name, attack: 'projectile' | 'cloud', range (level 1), projectileSpeed,
// muzzleHeight, levels: [{ damage, fireInterval, range, cost, time, name (or null), targets (M2m §2.3:
// pebbles per volley), cloud?: { radius, duration, tickInterval, tickDamage, corrode?: { mult, linger } } }] }.
// Level 1's cost / time are the build; later levels' the upgrade to that level.
export let TURRET_TYPES;
export let TURRET_RANGE; // the Pebble Sprinkler's level-1 range: lane coverage for layouts (M1c §4.1)
// summons: id → its row; and the values systems read by name
export let SUMMON_TYPES, SUMMON_KEYS;
export let VULTURE_COST, VULTURE_HP, VULTURE_DAMAGE, VULTURE_ATTACK_INTERVAL, VULTURE_DURATION, MAX_VULTURES,
  VULTURE_SPEED, VULTURE_RADIUS, VULTURE_MELEE_RANGE, VULTURE_BLOCK_RADIUS;
export let SQUIRREL_COST, SQUIRREL_HP, SQUIRREL_DURATION, SQUIRREL_SPEED, MAX_SQUIRRELS, SQUIRREL_RADIUS,
  SQUIRREL_PICKUP_RANGE, SQUIRREL_BLOCKS_WOLVES, SQUIRREL_DAMAGE, SQUIRREL_ATTACK_INTERVAL, SQUIRREL_BLOCK_RADIUS;
export let WISP_COST, WISP_SPEED, MAX_WISPS, WISP_RADIUS, WISP_BURST_RADIUS, WISP_SLOW_MULT, WISP_SLOW_DURATION; // Slow Wisp (M2k §3)
export let BOUGH_DOUBLE_COST, MAX_BOUGH_DOUBLES, DOUBLE_WISP_TIME;
// items: id → { slot, name, description, effects: [{ stat, op, value }], colors: [main, accent], mark }
export let ITEMS;
// stats: stat → description (labels; the stats themselves are in js/stats.js)
export let STATS;
// levels: id → LEVEL_GEOMETRY[id] plus name, description, row, nodeType, stepBudget, featureMix,
// zoneQuotas, candidateLocations, palette, waves, and optional enemyHpMult, corridorWidth, stuckTime
export let LEVELS;
// sounds: id → { volume, pitch, minGap, maxVoices, enabled }
export let SOUNDS;
// trade (M2n §3.1): resource → { baseValue, stockMin, stockMax }
export let TRADE;
// traders (M2n §4.5): kind → [text, …] (TRADER_LINE_KINDS)
export let TRADER_TEXT;
// palettes of non-combat places (PLACE_PALETTES): id → palette, like a level's
export let PLACE_PALETTE;

// Builds every value above from the loaded tabs (rows as from js/data/loader.js, already checked by
// js/data/validate.js). Leaves out blank cells so the code's defaults apply, and keeps row order.
export function applyData(t) {
  const keyed = (rows) => Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const byId = (rows, f, col = 'id') => Object.fromEntries(rows.map((r) => [r[col], f(r)]));
  const opt = (obj, key, value) => { if (value !== undefined) obj[key] = value; return obj; };
  const cost = (r) => {
    const c = {};
    for (const k of Object.keys(r)) if (k.startsWith('cost_')) c[k.slice(5)] = r[k];
    return c;
  };

  ({
    PREP_DURATION, END_DELAY, STEP_PX, TRAVEL_TWEEN_TIME,
    ENEMY_WANDER_SPEED, ENEMY_WANDER_INTERVAL, ENEMY_SIDESTEP_SPEED, ENEMY_SLOT_CLAIM_DISTANCE,
    DRUID_APPROACH_RADIUS, ENEMY_DIRECT_APPROACH_ANGLE, STUCK_TIME, STUCK_DECAY_RATE, SIDE_KEEP_MARGIN,
    STIRGE_DRUID_RING, STIRGE_WANDER_SPEED, STIRGE_WANDER_INTERVAL, STIRGE_SEPARATION, STIRGE_SEPARATION_SPEED, CLOUDS_HIT_FLYERS,
    BURST_STAGGER, FIRST_WAVE_DELAY, WAVE_GAP_AFTER_LAST_SPAWN,
    CORRIDOR_WIDTH, RANDOMISE_LAYOUT, FIXED_LAYOUT_SEED, LOCATION_RADIUS, LOCATION_JITTER, LOCATION_GAP,
    LANE_MIN_TURRET_SLOTS, FEATURE_ROUTE_MIN_FACTOR, FEATURE_ROUTE_MAX_FACTOR, MAX_LAYOUT_ATTEMPTS,
    ZONE_NEAR_TURRET, ZONE_NEAR_FEATURE, ZONE_FAR_TURRET, ZONE_FAR_FEATURE,
    DROP_SPACING, DROP_POP_HEIGHT, DROP_POP_TIME, DROP_POP_STAGGER, DROP_SINGLE_OFFSET,
    FLOATER_RISE_PX, FLOATER_TIME, FLOATER_STAGGER, FLOATER_STACK_PX,
    SWEEP_FLIGHT_TIME, SWEEP_STAGGER, SWEEP_END_MARGIN, SWEEP_END_SCALE, SWEEP_PULSE_TIME,
    CARRY_DRUID_HP, ITEMS_PER_BATTLE, WORK_SPEED, SEARCH_MAIN_BONUS, BOUGH_REFUND_CHANCE,
    MASTER_VOLUME, SOUND_PITCH_JITTER,
    TRADERS_PER_RUN, TRADE_PRICE_VARIATION, TRADE_MARGIN, TRADE_MAX_RATIO_TERM, TRADE_TAG_CHEAP, TRADE_TAG_PRICEY,
  } = keyed(t.globals));

  ({
    hp: DRUID_HP, radius: DRUID_RADIUS, meleeRadius: DRUID_MELEE_RADIUS, meleeSlots: DRUID_MELEE_SLOTS,
    meleeDamage: DRUID_MELEE_DAMAGE, meleeInterval: DRUID_MELEE_INTERVAL, strikeWindupTime: STRIKE_WINDUP_TIME,
    strikeSwingTime: STRIKE_SWING_TIME, regenAmount: DRUID_REGEN_AMOUNT, regenInterval: DRUID_REGEN_INTERVAL,
  } = keyed(t.druid));

  RESOURCES = byId(t.resources, (r) => ({ name: r.name, singular: r.singular, plural: r.plural, order: r.order }));
  RESOURCE_ORDER = [...t.resources].sort((a, b) => a.order - b.order).map((r) => r.id);

  FEATURE_TYPES = byId(t.features, (r) => {
    const yields = {};
    for (const res of RESOURCE_ORDER) if (r[`${res}_min`] !== undefined) yields[res] = [r[`${res}_min`], r[`${res}_max`]];
    return { name: r.name, searchTime: r.searchTime, yields, mainResource: r.mainResource };
  });

  // Variant rows (M2l §1.1): every blank cell takes the baseType row's value.
  const enemyRows = byId(t.enemies, (r) => r);
  ENEMY_TYPES = byId(t.enemies.map((r) => (r.baseType ? { ...enemyRows[r.baseType], ...r } : r)), (r) => {
    const e = { baseType: r.baseType ?? r.id, variant: r.variant ?? null, name: r.name, plural: r.plural, hp: r.hp, speed: r.speed, radius: r.radius, damage: r.damage, attackInterval: r.attackInterval, meleeSlotsUsed: r.meleeSlots, hitHeight: r.hitHeight };
    opt(e, 'collisionRadius', r.collisionRadius);
    opt(e, 'windupTime', r.windup);
    for (const k of ['flying', 'flyHeight', 'burstStagger', 'dropSpacing', 'keepSide', 'sideWander', 'boss', 'stepSoundInterval']) opt(e, k, r[k]);
    // Traits (M2l §1.3) and look; absent = none / ×1.
    for (const k of ['slowResist', 'armor', 'splashRatio', 'splashRadius', 'lifesteal', 'drawScale', 'soundPitch']) opt(e, k, r[k]);
    e.drops = t.drops.filter((d) => d.enemy === r.id).map((d) => ({ resource: d.resource, chance: d.chance, min: d.min, max: d.max }));
    return e;
  });

  TURRET_TYPES = {};
  for (const r of t.turrets) {
    const type = (TURRET_TYPES[r.turret] ??= { name: r.name, attack: r.attack, range: r.range, projectileSpeed: r.projectileSpeed, muzzleHeight: r.muzzleHeight, levels: [] });
    const level = { damage: r.damage, fireInterval: r.fireInterval, range: r.range, cost: cost(r), time: r.time, name: r.levelName ?? null, targets: r.targets ?? 1 };
    if (r.attack === 'cloud') level.cloud = { radius: r.cloudRadius, duration: r.cloudDuration, tickInterval: r.cloudTick, tickDamage: r.cloudTickDamage };
    if (r.corrodeMult !== undefined) level.cloud.corrode = { mult: r.corrodeMult, linger: r.corrodeLinger }; // M2m §2.4: Corrosion
    type.levels.push(level);
  }
  TURRET_RANGE = TURRET_TYPES.sprinkler.range;

  SUMMON_TYPES = byId(t.summons, (r) => ({ ...r, cost: cost(r) }));
  SUMMON_KEYS = byId(t.summons, (r) => r.key);
  const v = SUMMON_TYPES.vulture;
  VULTURE_COST = v.cost; VULTURE_HP = v.hp; VULTURE_DAMAGE = v.damage; VULTURE_ATTACK_INTERVAL = v.attackInterval;
  VULTURE_DURATION = v.duration; MAX_VULTURES = v.max; VULTURE_SPEED = v.speed; VULTURE_RADIUS = v.radius;
  VULTURE_MELEE_RANGE = v.meleeRange; VULTURE_BLOCK_RADIUS = v.blockRadius;
  const s = SUMMON_TYPES.squirrel;
  SQUIRREL_COST = s.cost; SQUIRREL_HP = s.hp; SQUIRREL_DURATION = s.duration; SQUIRREL_SPEED = s.speed; MAX_SQUIRRELS = s.max;
  SQUIRREL_RADIUS = s.radius; SQUIRREL_PICKUP_RANGE = s.pickupRange; SQUIRREL_BLOCKS_WOLVES = s.blocks ?? false;
  SQUIRREL_DAMAGE = s.damage; SQUIRREL_ATTACK_INTERVAL = s.attackInterval; SQUIRREL_BLOCK_RADIUS = s.blockRadius;
  const d = SUMMON_TYPES.double;
  BOUGH_DOUBLE_COST = d.cost; MAX_BOUGH_DOUBLES = d.max; DOUBLE_WISP_TIME = d.wispTime;
  const w = SUMMON_TYPES.slowWisp;
  WISP_COST = w.cost; WISP_SPEED = w.speed; MAX_WISPS = w.max; WISP_RADIUS = w.radius;
  WISP_BURST_RADIUS = w.burstRadius; WISP_SLOW_MULT = w.slowMult; WISP_SLOW_DURATION = w.slowDuration;

  ITEMS = byId(t.items, (r) => {
    const effects = [];
    for (let n = 1; r[`effect${n}_stat`] !== undefined || r[`effect${n + 1}_stat`] !== undefined; n++) {
      if (r[`effect${n}_stat`] !== undefined) effects.push({ stat: r[`effect${n}_stat`], op: r[`effect${n}_op`], value: r[`effect${n}_value`] });
    }
    return { slot: r.slot, name: r.name, description: r.description, effects, colors: [r.iconColor, r.iconAccent], mark: r.iconMark };
  });
  STATS = byId(t.stats, (r) => r.description, 'stat');

  const featureIds = Object.keys(FEATURE_TYPES);
  LEVELS = byId(t.levels, (r) => {
    const level = { ...LEVEL_GEOMETRY[r.id], name: r.name, description: r.description, row: r.row, nodeType: r.nodeType, stepBudget: r.stepBudget };
    for (const k of ['enemyHpMult', 'corridorWidth', 'stuckTime']) opt(level, k, r[k]);
    level.featureMix = Object.fromEntries(featureIds.map((f) => [f, r[`mix_${f}`] ?? 0]));
    level.zoneQuotas = { near: { turret: ZONE_NEAR_TURRET, feature: ZONE_NEAR_FEATURE }, far: { turret: ZONE_FAR_TURRET, feature: ZONE_FAR_FEATURE } };
    level.candidateLocations = t.candidates.filter((c) => c.level === r.id).sort((a, b) => a.index - b.index).map((c) => ({ x: c.x, y: c.y, zone: c.zone }));
    level.palette = unflatten(t.palettes.find((p) => p.level === r.id) ?? {}, ['level', '_row']);
    level.waves = t.waves.filter((w) => w.level === r.id).map((w) => {
      const wave = { gapAfter: w.gapAfter, spawns: t.spawns.filter((sp) => sp.level === r.id && sp.wave === w.wave).map((sp) => ({ t: sp.t, lane: sp.lane, type: sp.type, count: sp.count })) };
      return opt(wave, 'tolls', w.tolls);
    });
    return level;
  });
  // Map nodes take their name and type from their level (and their row, M2g §1: mapGen.js reads it there).
  for (const node of MAP_NODES) {
    node.name = LEVELS[node.levelId]?.name ?? node.id;
    node.type = LEVELS[node.levelId]?.nodeType;
  }

  SOUNDS = byId(t.sounds, (r) => ({ volume: r.volume, pitch: r.pitch, minGap: r.minGap, maxVoices: r.maxVoices, enabled: r.enabled }));

  TRADE = byId(t.trade, (r) => ({ baseValue: r.baseValue, stockMin: r.stockMin, stockMax: r.stockMax }), 'resource');
  TRADER_TEXT = Object.fromEntries(TRADER_LINE_KINDS.map((kind) => [kind, t.traders.filter((r) => r.kind === kind).map((r) => r.text)]));
  PLACE_PALETTE = Object.fromEntries(PLACE_PALETTES.map((id) => [id, unflatten(t.palettes.find((p) => p.level === id) ?? {}, ['level', '_row'])]));
}

// A palette row's flattened columns ("treeDark_canopy_0") back into nested objects and arrays.
function unflatten(row, skip) {
  const out = {};
  for (const [col, value] of Object.entries(row)) {
    if (skip.includes(col)) continue;
    const path = col.split('_');
    let node = out;
    path.forEach((part, i) => {
      if (i === path.length - 1) { node[part] = value; return; }
      node[part] ??= /^\d+$/.test(path[i + 1]) ? [] : {};
      node = node[part];
    });
  }
  return out;
}
