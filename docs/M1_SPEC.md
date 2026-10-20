# Broceliande — Milestone 1 Specification

**Working title:** Broceliande
**Milestone:** M1 — Single Encounter Prototype
**Platform:** Desktop PC, current Chrome
**Technology:** HTML5 Canvas, HTML, CSS, vanilla JavaScript (ES modules)
**Reference resolution:** 1920×1080, 16:9
**Input:** Mouse; Esc / right-click for cancellation

> **How to read this document**
> - **MUST** = required behaviour. **SHOULD** = strong preference; deviate only with a stated reason.
> - All numbers live in **Section 17 (Tuning Table)**. That table is the single source of truth. Prose sections describe behaviour and refer to values by their config name (e.g. `TURRET_DAMAGE`) rather than repeating numbers.
> - Values marked **TUNING** are starting guesses, expected to change after playtesting.
> - Section 20 (Evaluation Questions) is design context, not implementation work. Use it to make sensible judgement calls where this spec is silent.
> - Where this spec is silent and no reasonable judgement call is possible, **ask rather than guess**.

---

## 1. Milestone Purpose

M1 creates one complete, playable encounter to test the core loop:

```
PREP → COMBAT → VICTORY / DEFEAT
```

It exists to evaluate whether time-limited searching and building create interesting pressure, whether Prep decisions meaningfully shape Combat, and whether upgrading and summoning give enough active decisions during Combat.

M1 does **not** need to prove the roguelite layer, long-term progression or content variety.

---

## 2. Scope

### 2.1 In scope

- One forest encounter on a single, fixed screen
- One Druid (player character, does not attack)
- Three enemy lanes
- 12 predefined turret slots
- 8 searchable environmental features, drawn from 5 feature types
- 3 resources: Peach Pits, Reeds, Feathers
- 1 turret type (Pebble Sprinkler) with 1 upgrade
- 1 enemy type (Demonic Wolf)
- 1 summonable ally (Vulture)
- 1 wave of 35 wolves
- Prep phase, Combat phase, Victory and Defeat states
- Restart
- Debug overlay and debug controls
- Programmatic placeholder visuals only (no external assets)

### 2.2 Out of scope — do NOT implement

Roguelite map; multiple encounters; persistence between encounters; save/load; additional turret, enemy or summon types; sound or music; final VFX or animation; narrative; meta-progression; character progression; mobile or gamepad controls; cross-browser optimisation; general-purpose terrain pathfinding; procedural level generation.

Do not add systems beyond what this document requires.

---

## 3. Technical Approach

### 3.1 Technology

- HTML, CSS, vanilla JavaScript ES modules only.
- No frameworks, bundlers or external libraries.
- No build step.

### 3.2 Running the game

ES modules do not load from `file://` in Chrome. The game MUST be run from a local static server, for example:

```
python -m http.server 8000
```

then open `http://localhost:8000`. Include these instructions in a short `README.md`.

### 3.3 Rendering split

**Canvas** draws: battlefield, environment, lanes, Druid, turrets, wolves, Vultures, projectiles, world-space HP bars, progress bars, range circles, placement ghost, debug overlay.

**HTML/CSS** draws: HUD, resource panel, phase/timer, tooltips, contextual menus, Start Combat button, Victory/Defeat overlay, debug text panel.

Simulation, rendering and UI MUST remain logically separate.

### 3.4 Scaling and coordinates

Use a single stage element of fixed size 1920×1080 containing both the canvas and the HTML UI layer. Scale the whole stage with a CSS `transform: scale(s)` to fit the window, letterboxed, preserving 16:9. Recalculate on window resize.

This means:
- All game and UI positions use the 1920×1080 **world coordinate** system.
- HTML menus and tooltips are positioned using world coordinates directly.
- Mouse input MUST be converted from screen to world coordinates:
  `worldX = (clientX - stageRect.left) / s`, `worldY = (clientY - stageRect.top) / s`.

Slight canvas blur at large scales is acceptable for M1.

### 3.5 Simulation loop

- Fixed simulation timestep: `SIM_STEP = 1/60` seconds, driven by an accumulator inside `requestAnimationFrame`.
- Rendering happens once per animation frame.
- Clamp large frame gaps (e.g. tab switching) so the simulation never runs more than a few steps per frame.
- Debug speed multiplier and pause (Section 16) act on the simulation clock only.
- All timers (Prep, actions, cooldowns, spawns, Vulture duration) use simulation time, never wall-clock time.

### 3.6 Randomness

- Use a small seeded PRNG (e.g. mulberry32) in `rng.js` for all gameplay randomness.
- `DEBUG_SEED` in config: `null` means a new random seed on each restart; a number means a fixed seed.
- Show the current seed in the debug panel.

---

## 4. Project Structure

Recommended, not rigid. Maintain the flow **config → simulation → rendering → UI**. Avoid a monolithic file.

```
broceliande/
├── index.html
├── styles.css
├── README.md
└── js/
    ├── main.js              // bootstrap, loop, scaling
    ├── config.js            // ALL tuning values and coordinates
    ├── rng.js               // seeded PRNG
    ├── game.js              // game state, phase transitions, restart
    ├── input.js             // mouse/keyboard, screen→world conversion
    ├── renderer.js          // canvas drawing
    ├── ui.js                // HUD, menus, tooltips, overlays
    ├── lanePath.js          // spline sampling, arc length, path queries
    ├── systems/
    │   ├── actionSystem.js  // Druid action state machine
    │   ├── searchSystem.js
    │   ├── buildSystem.js
    │   ├── combatSystem.js  // turrets, projectiles, melee, damage
    │   ├── spawnSystem.js
    │   ├── movementSystem.js
    │   └── collisionSystem.js
    ├── entities/
    │   ├── druid.js
    │   ├── wolf.js
    │   ├── turret.js
    │   ├── vulture.js
    │   ├── projectile.js
    │   └── searchableFeature.js
    └── debug/
        └── debugOverlay.js
```

---

## 5. Screen, Perspective and Environment

### 5.1 Screen

- Entire encounter on one screen. No camera movement, scrolling or zooming.
- Reserve a top HUD strip of height `HUD_STRIP_HEIGHT`. The battlefield occupies the rest of the stage. Lanes, slots and features MUST NOT sit under the HUD strip.

### 5.2 Perspective

- Ground, paths and spatial relationships are top-down.
- Characters and objects are drawn upright / side-view, as in classic top-down RPGs.
- Draw entities in y-sorted order so lower objects appear in front.
- Placeholder shapes are fine. Keep each entity's drawing in a single draw function so it can later be swapped for sprites without touching gameplay code.

### 5.3 Environment

Simple placeholder forest: floor, winding paths, trees, rocks, vegetation, boundary objects. The composition MUST make the enemy corridors visually obvious. Decorative objects have no gameplay effect.

Avoid visual symmetry throughout: Druid position, lanes, slots and features.

---

## 6. Game State Model

Game states MUST be explicit (not inferred from UI):

```
START → PREP → COMBAT → VICTORY or DEFEAT → (Restart) → PREP
```

| From | To | Trigger |
|---|---|---|
| START | PREP | Page load |
| PREP | COMBAT | Prep timer reaches 0, **or** player clicks Start Combat |
| COMBAT | VICTORY | All `WAVE_TOTAL` wolves have spawned **and** none are alive |
| COMBAT | DEFEAT | Druid HP ≤ 0 (checked immediately) |
| VICTORY / DEFEAT | PREP | Restart |

On entering VICTORY or DEFEAT, the simulation stops: no movement, attacks, projectiles, spawns or timers.

**Restart** fully resets the encounter: resources to zero, all features un-exhausted, all turrets removed, all entities cleared, Druid HP full, new seed (unless `DEBUG_SEED` is set), Prep timer restarted. Layout (lanes, slots, feature positions and types) stays the same so playtests are comparable. Only yields are re-rolled.

---

## 7. Druid and Player Action Model

### 7.1 The Druid

- HP: `DRUID_HP`. Does not attack.
- Main position: `DRUID_POS`, near the centre of the battlefield but deliberately off-centre.
- Has a world-space HP bar and a HUD HP display (e.g. `63 / 80`).

### 7.2 Action states

The Druid's action state is separate from the game state:

| Action state | Allowed in |
|---|---|
| `IDLE` | PREP, COMBAT |
| `SEARCHING` | PREP |
| `BUILDING` | PREP |
| `UPGRADING` | COMBAT |
| `SUMMON_PLACEMENT` | COMBAT |

Only one action at a time. Invalid actions for the current phase MUST be impossible, not merely hidden.

### 7.3 Druid visual position

- `IDLE` / `SUMMON_PLACEMENT`: Druid at main position.
- `SEARCHING`, `BUILDING`, `UPGRADING`: Druid instantly appears beside the target object (offset `DRUID_ACTION_OFFSET`).
- On completion or cancel: Druid instantly returns to main position.
- No travel animation or pathfinding.

**Important:** the Druid's *gameplay* position (where wolves attack him) is always `DRUID_POS`. Relocation during actions is visual only.

### 7.4 Starting, switching and cancelling actions

- **Opening a menu does not cancel the current action.** Only *confirming* a new action cancels it.
  - Example: while searching, click an empty slot → build menu opens, search continues. Click **Build** → search is cancelled and building starts.
- Clicking a different searchable feature while searching starts a new search immediately (cancelling the current one). Clicking the feature currently being searched does nothing.
- Cancelled actions cost nothing and give nothing. Partial progress is lost.
- **Esc or right-click**, in priority order:
  1. Close an open menu, if any.
  2. Otherwise, exit summon placement mode, if active.
  3. Otherwise, cancel the current timed action, if any.
- Clicking empty ground closes any open menu and does not cancel the current action.

### 7.5 Costs

Resources for building and upgrading are deducted **on completion**. If the player somehow no longer has the resources at completion time (should not happen in M1, but guard against it), the action fails with no effect and the Druid returns to idle.

Vulture cost is deducted at the moment of placement.

---

## 8. Resources and Searchable Features

### 8.1 Resources

Peach Pits, Reeds, Feathers. All start at 0. Shown in the HUD with simple placeholder icons and counts.

### 8.2 Feature types

Five types, with search times and yield ranges defined in `FEATURE_TYPES` (Section 17). Yields are integers rolled uniformly within each range, inclusive. Mixed features roll each resource independently, so one can be zero.

### 8.3 Placement

`FEATURES` in config lists 8 features, each with a type and explicit coordinates. Distribute them across the battlefield, outside all corridors, avoiding regular patterns.

### 8.4 Search interaction (PREP only)

- **Hover**: tooltip showing name, each possible resource with its range, and search time. Example:
  ```
  Ruins
  Peach Pits: 0–3
  Feathers: 0–2
  Search: 1.8 sec
  ```
- **Click**: start searching (see 7.4 for cancel rules).
- **During search**: Druid beside feature; progress bar above feature.
- **On completion**: roll yield, add to inventory, show a brief floating "+2 Pits" style text, mark feature exhausted, Druid returns to idle.
- **Exhausted** features are visibly dimmed. Their tooltip says "Searched" and they cannot be clicked.
- During COMBAT, features show no tooltip and cannot be interacted with.

---

## 9. Turret Slots and Building

### 9.1 Slots

- `TURRET_SLOTS` in config: 12 slots with explicit coordinates, roughly four per lane but irregular.
- Slots sit outside corridors. Ranges may overlap multiple lanes. This is desirable, since it makes some slots more valuable than others.
- During PREP, empty slots are clearly visible. During COMBAT, empty slots may be drawn faintly.

### 9.2 Build menu (PREP only)

Clicking an empty slot opens a contextual menu beside it:

```
Pebble Sprinkler
2 Pits · 1 Reed
[Build]
```

- If unaffordable: option visible but greyed out, showing the required resources.
- Hovering the slot, or having its menu open, shows the turret's base range circle.

### 9.3 Construction

- Duration `BUILD_TIME`. Druid beside slot; progress bar above slot.
- Cancel rules per 7.4.
- On completion: turret appears, resources deducted, Druid returns to idle.
- If the Prep phase ends mid-build, the build is cancelled with no cost and no turret.

---

## 10. Pebble Sprinkler (Turret)

### 10.1 Look

A rotating sprinkler made of sticks. Placeholder: a small stick-like structure that visibly rotates toward its target.

### 10.2 Behaviour

- Circular range `TURRET_RANGE` (centred on slot).
- Every `TURRET_FIRE_INTERVAL`, if at least one living wolf is in range, fires a pebble at the current target.
- **Target selection:** the in-range wolf with the **smallest remaining distance along its lane** to the Druid (see 12.3). Wolves already at the Druid count as remaining distance 0. Re-evaluate before every shot. Switching target is allowed.
- A turret with no target keeps its cooldown ready and fires immediately when a target appears.

### 10.3 Projectiles

- Homing, speed `PROJECTILE_SPEED`, travel visibly from turret to target.
- No physical collision. A projectile is bound to its target and hits when it reaches it.
- If the target dies before impact, the projectile **disappears** (no retarget, no damage).
- Damage `TURRET_DAMAGE` (or upgraded value) is applied on impact.

### 10.4 Range feedback

Range circles are hidden by default. Show a turret's range when hovering it or when its menu is open. In debug mode, show all ranges.

---

## 11. Turret Upgrade (COMBAT only)

### 11.1 Menu

Clicking a built turret during COMBAT opens:

```
Upgrade
4 Pits · 1 Feather
[Upgrade]
```

- Greyed out with costs shown if unaffordable.
- Already-upgraded turrets show "Upgraded" with no option.
- While another turret is upgrading, the Upgrade button is disabled (only one upgrade at a time). Confirming an upgrade on a different turret *does* cancel the current one, per 7.4.

### 11.2 Upgrading

- Duration `UPGRADE_TIME`. Druid beside turret; progress bar above turret.
- **The turret does not fire while upgrading.** In-flight projectiles still land.
- Player cannot summon during an upgrade (Druid is not idle).
- On cancel: no cost; turret resumes normal firing immediately.
- On completion: resources deducted; turret gets `UPGRADED_DAMAGE`, `UPGRADED_FIRE_INTERVAL`, range × `UPGRADED_RANGE_MULT`; Druid returns to idle.
- Upgraded turrets have a simple visible indicator (coloured ring or outline).

---

## 12. Lanes and Wolf Movement

### 12.1 Lane layout

- Three lanes entering from different screen edges, conceptually: **upper-left**, **right**, **bottom-left**.
- Each lane MUST:
  - wind through the forest (not a straight radial line);
  - have a travel length of roughly `LANE_LENGTH_FACTOR` × the straight-line distance from spawn to Druid;
  - stay visually distinct and separate from the other lanes until it reaches the Druid;
  - be drawn as a visible broad corridor of width `CORRIDOR_WIDTH`.
- Lane waypoints are defined in `LANES` in config. Propose initial waypoints that satisfy these constraints; the debug panel reports each lane's actual length and unopposed travel time so they can be tuned.

### 12.2 Path representation

- Convert each lane's waypoints into a smooth curve (e.g. Catmull-Rom), then sample into a dense polyline with cumulative arc length.
- `lanePath.js` provides: position at distance `s`, tangent/normal at `s`, total length.
- The final point of every lane is at the edge of the Druid's melee ring (12.5).

### 12.3 Wolf movement model

Each wolf stores:
- `lane` — its assigned lane (never changes);
- `s` — distance travelled along the lane;
- `offset` — lateral offset from the centreline, along the normal.

World position = `pathPoint(s) + normal(s) × offset`.

- Spawn at `s = 0` with a random `offset` within the corridor.
- Advance `s` by `WOLF_SPEED × dt` unless blocked.
- `|offset|` MUST stay within `CORRIDOR_WIDTH/2 − WOLF_RADIUS`, so wolves never leave their corridor.
- Let `offset` drift slowly (small random wander) for a natural look.
- **Remaining distance** (used for turret targeting) = `laneLength − s`.

### 12.4 Wolf–wolf collision

Lightweight separation, not crowd simulation:
- Wolves are circles of radius `WOLF_RADIUS` and MUST NOT overlap.
- Resolve mainly in lane space: if a wolf would move into another wolf ahead, it first tries to shift `offset` sideways to pass (if the corridor has room), otherwise it slows or stops.
- Wolves may walk side by side and overtake where space allows. Do not force single file.
- Near the Druid, where lanes converge, resolve collision in world space.

### 12.5 Reaching the Druid

- The Druid has `DRUID_MELEE_SLOTS` evenly spaced attack positions on a ring of radius `DRUID_MELEE_RADIUS` around `DRUID_POS`.
- A wolf reaching the end of its lane claims the nearest free slot and moves to it. If none are free, it waits at the end of its lane (queuing via collision) until one frees up.
- A wolf in a slot stops and bites the Druid for `WOLF_DAMAGE` every `WOLF_ATTACK_INTERVAL` until it or the Druid dies.
- Slots are released when their wolf dies.

---

## 13. Demonic Wolf

- Side-view placeholder (simple quadruped silhouette) with clearly **red eyes**.
- HP `WOLF_HP`, speed `WOLF_SPEED`, radius `WOLF_RADIUS`.
- **HP bar hidden until first damage**, then visible until death.
- On death: remove immediately (a brief fade is fine).

---

## 14. Wave

- `WAVE` in config defines bursts **per lane**: each burst has a start time (seconds since COMBAT began) and a wolf count.
- Wolves in a burst spawn `BURST_STAGGER` seconds apart, not all at once.
- Spawning MUST NOT be uniform. It should feel irregular, with pressure shifting between lanes.
- The total across all lanes MUST equal `WAVE_TOTAL` (35). Validate this at start-up and log an error if not.
- If a spawn point is blocked by a wolf, delay that spawn until clear.

**Targets (TUNING):** an unopposed wolf takes 25–30 s to reach the Druid; final bursts start 45–60 s into Combat; a successful encounter lasts roughly 60–90 s of Combat.

---

## 15. Summoning and the Vulture

### 15.1 Summon flow (COMBAT only)

1. Druid must be `IDLE` at his main position.
2. Click the Druid → contextual menu:
   ```
   Summon Vulture
   3 Feathers
   [Summon]
   ```
3. Click **Summon** → enter `SUMMON_PLACEMENT`. A translucent Vulture ghost follows the cursor, and the cursor/HUD clearly indicates placement mode.
4. Left-click anywhere on the battlefield (not the HUD strip) → Vulture appears instantly; cost deducted.
5. Esc / right-click cancels placement; no cost.

Summon option is greyed out (with reason) if: not enough Feathers, `MAX_VULTURES` already active, or Druid not idle.

### 15.2 Vulture stats and look

HP `VULTURE_HP`, duration `VULTURE_DURATION`, damage `VULTURE_DAMAGE`, attack interval `VULTURE_ATTACK_INTERVAL`, flight speed `VULTURE_SPEED`, radius `VULTURE_RADIUS`. Simple bird placeholder, with a small HP bar and a duration indicator (e.g. shrinking ring).

### 15.3 Vulture behaviour

- **Targeting:** the living wolf **nearest to the Vulture itself** (straight-line distance). Because targeting is local and flight is fairly slow, *where* the player places the Vulture matters.
- **Flying:** moves in a straight line toward its target at `VULTURE_SPEED`, ignoring corridors and terrain. While flying it does **not** collide with or block anything.
- **Landed:** when within `VULTURE_MELEE_RANGE` of its target, it stops, "lands", and attacks every `VULTURE_ATTACK_INTERVAL`.
- **Retargeting:** if its target dies, it immediately picks the new nearest living wolf and flies again. If no wolves are alive, it hovers in place.
- Expires after `VULTURE_DURATION` or at 0 HP. Vultures do not collide with each other.

### 15.4 Blocking

- A **landed** Vulture blocks wolves: any wolf whose centre is within `VULTURE_BLOCK_RADIUS` of a landed Vulture stops advancing and bites it (`WOLF_DAMAGE` every `WOLF_ATTACK_INTERVAL`).
- A wolf blocked by more than one Vulture attacks the nearest one.
- When no landed Vulture blocks it any more, the wolf resumes advancing.
- Wolves blocked behind a blocked wolf queue normally via wolf–wolf collision.

---

## 16. HUD, Menus and Feedback

### 16.1 HUD (top strip, HTML)

- **Top centre:** phase name and timer. PREP: countdown `PREP  00:19`. COMBAT: elapsed time `COMBAT  00:42` plus wolves remaining (e.g. `Wolves: 21 / 35`).
- **Resource panel:** Pits, Reeds, Feathers with icons and counts.
- **Druid HP:** bar plus `current / max`.
- **Start Combat button:** visible during PREP only. Ends Prep immediately (cancelling any current action).

### 16.2 Contextual menus

- Appear beside the clicked world object; only one open at a time.
- Unaffordable or unavailable options stay visible, greyed out, with costs or a short reason.
- Close on: clicking empty ground, Esc/right-click, confirming an option, or phase change.

### 16.3 Progress and feedback

- Timed actions: small progress bar above the target plus Druid sprite beside it.
- Floating text for resource gains and damage is optional but welcome.
- Summon placement: ghost under cursor and a clear mode indicator.

### 16.4 Victory / Defeat overlay

Central overlay with `VICTORY` or `DEFEAT`, combat time, wolves killed, and a **Restart** button.

---

## 17. Tuning Table (single source of truth)

Every value below MUST be defined in `config.js`, grouped and commented. Values marked **TUNING** are starting guesses. Name constants as shown or equivalent.

### 17.1 Timing and phases

| Constant | Value | Notes |
|---|---|---|
| `SIM_STEP` | 1/60 s | Fixed timestep |
| `PREP_DURATION` | 28 s | Changed from 25 s (see 21.1) |
| `BUILD_TIME` | 2.3 s | Changed from 2.5 s (see 21.1) |
| `UPGRADE_TIME` | 2.5 s | Changed from 1.2 s, then 3.0 s (see Section 21) |

### 17.2 Druid

| Constant | Value | Notes |
|---|---|---|
| `DRUID_HP` | 80 | |
| `DRUID_POS` | (1010, 600) | TUNING — off-centre |
| `DRUID_RADIUS` | 28 | TUNING |
| `DRUID_MELEE_RADIUS` | 52 | TUNING |
| `DRUID_MELEE_SLOTS` | 6 | TUNING — max simultaneous biters |
| `DRUID_ACTION_OFFSET` | (−40, 10) | TUNING — where Druid appears beside a target |

### 17.3 Wolf

| Constant | Value | Notes |
|---|---|---|
| `WOLF_HP` | 17 | TUNING — 6 base pebbles, 4 upgraded, 3 Vulture pecks. Changed from 18 (see 21.1) |
| `WOLF_SPEED` | 72 px/s | TUNING — aim for 25–30 s lane traversal |
| `WOLF_RADIUS` | 16 | TUNING |
| `WOLF_DAMAGE` | 3 | |
| `WOLF_ATTACK_INTERVAL` | 1.2 s | |

### 17.4 Turret

| Constant | Value | Notes |
|---|---|---|
| `TURRET_COST` | 2 Pits + 1 Reed | |
| `TURRET_DAMAGE` | 3 | |
| `TURRET_FIRE_INTERVAL` | 0.75 s | |
| `TURRET_RANGE` | 220 px | TUNING |
| `PROJECTILE_SPEED` | 600 px/s | TUNING |
| `UPGRADE_COST` | 2 Pits + 1 Feather | Changed (see Section 21) |
| `UPGRADED_DAMAGE` | 5 | |
| `UPGRADED_FIRE_INTERVAL` | 0.6 s | |
| `UPGRADED_RANGE_MULT` | 1.2 | |

### 17.5 Vulture

| Constant | Value | Notes |
|---|---|---|
| `VULTURE_COST` | 1 Feather | Changed from 2, then 3 (see Section 21) |
| `VULTURE_HP` | 16 | Changed from 15 (see 21.1) |
| `VULTURE_DAMAGE` | 6 | |
| `VULTURE_ATTACK_INTERVAL` | 0.7 s | |
| `VULTURE_DURATION` | 12 s | |
| `MAX_VULTURES` | 2 | Changed from 3 (see 21.1) |
| `VULTURE_SPEED` | 160 px/s | TUNING — deliberately slowish so placement matters. Changed from 140 (see 21.1) |
| `VULTURE_RADIUS` | 14 | TUNING |
| `VULTURE_MELEE_RANGE` | 34 px | TUNING |
| `VULTURE_BLOCK_RADIUS` | 36 px | TUNING |

### 17.6 Scene layout

| Constant | Value | Notes |
|---|---|---|
| `HUD_STRIP_HEIGHT` | 80 px | |
| `CORRIDOR_WIDTH` | 110 px | TUNING |
| `LANE_LENGTH_FACTOR` | ~2.0 | Target lane length ÷ straight-line distance |
| `LANES` | 3 waypoint lists | Upper-left, right, bottom-left spawns. Initial waypoints proposed by implementer to satisfy 12.1 |
| `TURRET_SLOTS` | 12 coordinates | Irregular, ~4 per lane, outside corridors |
| `FEATURES` | 8 entries | See 17.7 for the type mix |

### 17.7 Searchable features

**`FEATURE_TYPES`** (all yield ranges TUNING):

| Type | Resources (min–max) | Search time |
|---|---|---|
| Tree | Pits 2–4 | 1.2 s |
| Reed Patch | Reeds 2–3 | 1.4 s |
| Shrub | Feathers 2–3 | 1.7 s |
| Ruins | Pits 2–3, Feathers 1–3 | 1.8 s |
| Pond | Pits 2–3, Reeds 1–3 | 2.0 s |

**`FEATURES` mix (8 total):** 2 Trees, 1 Reed Patch, 1 Shrub, 2 Ruins, 2 Ponds.

**Economy intent (for reference):** searching everything takes about 13 s and yields on average ~16 Pits, ~6.5 Reeds, ~6.5 Feathers (after the 21.1 tuning; originally ~11 / ~5 / ~5). Building five turrets would take another 11.5 s. With the original 25 s Prep, a player **could not** search everything *and* build everything they can afford. After the 21.1 tuning (28 s Prep, 2.3 s builds) the total is about 24.6 s, so this pressure is now weaker — see 21.1. They must choose between more searching, more building, and holding resources back for Combat (upgrades and Vultures). The debug panel SHOULD show expected-average totals so this can be checked after tuning.

### 17.8 Wave

| Constant | Value |
|---|---|
| `WAVE_TOTAL` | 35 |
| `BURST_STAGGER` | 0.6 s (TUNING) |

**`WAVE`** (TUNING; times = seconds since Combat began):

| Lane | Bursts (time → count) | Total |
|---|---|---|
| Upper-left | 0 → 3, 12 → 2, 24 → 3, 40 → 4 | 12 |
| Right | 5 → 2, 16 → 3, 30 → 3, 48 → 4 | 12 |
| Bottom-left | 9 → 3, 20 → 2, 35 → 3, 52 → 3 | 11 |

### 17.9 Debug

| Constant | Value |
|---|---|
| `DEBUG_SEED` | `null` (random) or an integer |
| `DEBUG_START_ENABLED` | `false` |

---

## 18. Debug Tools

### 18.1 Keys

| Key | Action |
|---|---|
| `D` | Toggle debug overlay and debug panel |
| `P` | Pause / resume simulation |
| `1` / `2` / `4` | Simulation speed ×1 / ×2 / ×4 |
| `N` | Skip to next phase (Prep → Combat) |
| `R` | Restart encounter |
| `G` | Grant +10 of each resource |

Debug keys work regardless of whether the overlay is visible.

### 18.2 Overlay (canvas)

Lane waypoints and sampled centrelines; corridor boundaries; spawn points; wolf collision radii; all turret ranges; turret → target lines; Vulture → target lines; entity IDs; Druid main position and melee slots; turret-slot and feature coordinates (as labels).

### 18.3 Panel (HTML)

Current seed; game state and action state; sim speed / paused; each lane's length and unopposed travel time; wolves spawned / alive / killed; expected average resource totals from `FEATURES`; FPS.

Debug visuals MUST NOT affect gameplay.

---

## 19. Acceptance Criteria (Definition of Done)

M1 is complete when all of the following can be shown in a normal desktop Chrome session, served locally.

### Encounter
- [ ] Loads directly into the forest encounter; whole battlefield visible without scrolling.
- [ ] Three distinct, winding, visibly separate corridors.
- [ ] Druid slightly off-centre.
- [ ] 12 turret slots and 8 searchable features visible, none inside corridors.
- [ ] Stage stays 16:9 and correctly letterboxed when the window resizes; clicks still land accurately.

### Prep
- [ ] 25-second Prep timer starts automatically; Start Combat button ends Prep early.
- [ ] Hovering a feature shows the correct tooltip.
- [ ] Clicking starts a correctly timed search; Druid appears beside the feature; progress bar shows.
- [ ] Opening a menu does not cancel a search; confirming a new action does.
- [ ] Completed search yields resources within configured ranges; inventory updates; feature becomes exhausted.
- [ ] Clicking a slot opens the build menu; unaffordable options are greyed out with costs.
- [ ] Construction takes `BUILD_TIME`; Druid appears beside the slot.
- [ ] Cancelled construction costs nothing; completed construction deducts resources.
- [ ] Prep ending mid-action cancels it with no cost; Combat begins.

### Combat
- [ ] 35 wolves spawn across three lanes in configured bursts.
- [ ] Wolves follow their corridors, never leave them, never overlap, and can walk side by side.
- [ ] Turrets target the in-range wolf with the least remaining lane distance.
- [ ] Pebbles visibly travel to targets; pebbles vanish if their target dies.
- [ ] Base turret deals 3 damage every 0.75 s.
- [ ] Wolf HP bars appear only after first damage.
- [ ] Clicking a turret opens Upgrade; upgrade takes `UPGRADE_TIME`; turret stops firing during it.
- [ ] Upgrade deducts resources only on completion; upgraded turret gets new damage, fire rate and range, plus a visible indicator.
- [ ] Druid cannot summon while upgrading.

### Summoning
- [ ] Clicking the idle Druid opens the summon menu; selecting it enters placement mode with ghost.
- [ ] Esc / right-click cancels placement at no cost.
- [ ] Clicking places a Vulture and deducts its cost.
- [ ] Vulture flies to the nearest wolf *to itself*, lands, and attacks for 6 every 0.7 s.
- [ ] Vulture retargets when its target dies.
- [ ] Wolves near a landed Vulture stop and attack it; resume when it's gone.
- [ ] Vulture disappears after 12 s or at 0 HP; max 3 active.

### End state
- [ ] Wolves reaching the Druid take melee slots and bite (3 HP per 1.2 s each); extras queue.
- [ ] Druid death → Defeat; all wolves spawned and dead → Victory.
- [ ] Simulation stops on either result.
- [ ] Restart produces a fully fresh encounter.

### Technical
- [ ] All values from Section 17 live in `config.js`.
- [ ] Game states and action states are explicit.
- [ ] Wave total validated at start-up.
- [ ] Debug keys and overlay work as in Section 18.
- [ ] No external assets or libraries; README explains how to run.

---

## 20. Evaluation Questions (context only — not implementation work)

M1 is judged primarily on one question:

> **Does a short period of pressured searching and construction create decisions that make the following tower-defence battle more engaging?**

Secondary questions:
- Does 25 seconds create useful pressure or just frustration?
- Is searching interesting when it competes with construction time?
- Does resource randomness create adaptation rather than arbitrary failure?
- Are turret positions meaningfully different?
- Does upgrading feel like a worthwhile risk, since the turret stops firing?
- Does the Vulture create interesting timing and placement decisions?
- Is Combat active enough despite automated turrets?
- Does the encounter make the player want to prepare differently and try again?

When making judgement calls, favour whatever makes these questions easier to answer in playtesting: readable feedback, visible cause and effect, and easy tuning.

---

## 21. Changes from the Original HLD

For the designer's reference. These were deliberate changes made while preparing this spec:

| Change | Original | Now | Reason |
|---|---|---|---|
| Upgrade time | 1.2 s | 3.0 s | 1.2 s is under two shots offline, too little to test upgrade risk |
| Upgrade cost | 5 Pits + 2 Feathers | 4 Pits + 1 Feather | Upgrade was far less cost-efficient than a Vulture |
| Vulture cost | 2 Feathers | 3 Feathers | Same reason; also leaves Feathers as the Vulture's key resource |
| Vulture targeting | "Nearest wolf" (unspecified) | Nearest to the Vulture | Makes placement a real decision |
| Vulture speed | Unspecified | 140 px/s (slowish) | Makes placement a real decision |
| Feature count | 6–8 | 8, fixed mix | Economy designed so time, not resources, is the Prep constraint |
| Start Combat button | — | Added | Speeds up testing; possible later reward lever |
| Turret targeting | "Closest to Druid" | Least remaining lane distance | Straight-line distance misleads on winding lanes |
| Druid melee | Unspecified | 6 slots on a ring | Defines how many wolves can bite at once |
| Cancel rules | Partly ambiguous | Menus don't cancel; confirming does | Prevents accidental cancels |
| Restart | "Fresh encounter" | Same layout, new yields | Keeps playtests comparable |
| Debug | Overlay only | Plus pause, speed, skip, resources | Faster iteration |

### 21.1 Playtest tuning (after M1 implementation)

Changes made after the first playtests of the M1 build. Section 17 shows the current values.

| Change | Was | Now |
|---|---|---|
| Prep duration | 25 s | 28 s |
| Build time | 2.5 s | 2.3 s |
| Upgrade time | 3.0 s | 2.5 s |
| Wolf HP | 18 | 17 (still 6 base pebbles, 4 upgraded, 3 Vulture pecks) |
| Upgrade cost | 4 Pits + 1 Feather | 2 Pits + 1 Feather |
| Vulture cost | 3 Feathers | 1 Feather |
| Vulture HP | 15 | 16 |
| Max Vultures | 3 | 2 |
| Vulture speed | 140 px/s | 160 px/s |
| Reed Patch yield | Reeds 1–3 | Reeds 2–3 |
| Shrub yield | Feathers 2–4 | Feathers 2–3 |
| Ruins yield | Pits 0–3, Feathers 0–2 | Pits 2–3, Feathers 1–3 |
| Pond yield | Pits 0–2, Reeds 1–2 | Pits 2–3, Reeds 1–3 |

**Reason:** balance pass after first playtests. Simulations showed the original values made the encounter very hard to win: an average Prep killed about 14 of 35 wolves, and a strong Prep about 34.

**Side effect to watch:** searching everything (~13.1 s) plus five builds (~11.5 s) now fits inside the 28 s Prep, which weakens the "search vs build" pressure described in 17.7.
