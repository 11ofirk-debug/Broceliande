# Broceliande — M2a Addendum: Level Map and Multiple Wilds

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`). Everything there still applies unless this document overrides it. This is the first **Milestone 2** document: it overrides the M1 out-of-scope items "roguelite overworld/map", "multiple encounters" and "persistent resources between encounters", in the limited form described here.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.

---

## 1. Summary

- The game now starts on a **level map** in the style of Slay the Spire.
- A **run** is a path through the map. For now, the map has three **Wilds** nodes (combat-and-loot encounters):

  ```
     Gallows Copse      Blackthorn Hollow
            \               /
             \             /
            Tornville Haunt
  ```

- The player starts at **Tornville Haunt**, wins it, then chooses one of the two upper Wilds. Winning that one completes the run.
- **Resources carry over** from the first victory to the next encounter.
- Each Wilds has its own layout, enemy count and colour palette, and its name is shown in the bottom-left corner during the encounter.

---

## 2. Run and game states

### 2.1 State machine

Extend the explicit game states (main spec §6, M1e §1):

```
START → MAP → PREP → COMBAT → ENDING → VICTORY or DEFEAT
                                           │            │
                            Continue ──────┘            │
                            (back to MAP)               │
                            Start again (final win) ────┤
                                                        └── Start again → new run → MAP
```

| From | To | Trigger |
|---|---|---|
| START | MAP | Page load (new run) |
| MAP | PREP | Player clicks an available node |
| VICTORY | MAP | **Continue** (when more nodes are reachable) |
| VICTORY | MAP (new run) | **Start again** (run complete) |
| DEFEAT | MAP (new run) | **Start again** |

### 2.2 Run state

Keep run state separate from encounter state:

```js
run = {
  seed,               // run seed (seeded RNG, DEBUG_SEED rules apply)
  currentNodeId,      // last node entered
  completedNodeIds,   // won nodes
  inventory,          // resources carried between encounters
  druidHp,            // only used if CARRY_DRUID_HP is true
}
```

- Each encounter's layout seed is derived from the run seed and the node ID, so a fixed `DEBUG_SEED` reproduces the whole run.
- A new run resets everything: map progress, inventory to 0, Druid HP full.

---

## 3. Carry-over between encounters

- On **Victory**, the player's current resource counts (all four, including Boughs) are saved to `run.inventory`.
- The next encounter starts its Prep with exactly those resources, instead of zero.
- Not carried: turrets, summons, uncollected drops on the field, step budget, timers.
- **Druid HP:** `CARRY_DRUID_HP: false` (TUNING). When `false`, the Druid starts every encounter at full HP. When `true`, he starts with the HP he had when the previous battle was won.
- The Victory overlay shows what will carry over (when not the final battle): `Carried to the next Wilds:` plus resource icon rows.

---

## 4. The map screen

### 4.1 Data-driven map

```js
MAP_NODES: [
  { id: 'tornville', name: 'Tornville Haunt',   type: 'wilds', levelId: 'tornville', pos: {x, y}, next: ['gallows', 'blackthorn'] },
  { id: 'gallows',   name: 'Gallows Copse',     type: 'wilds', levelId: 'gallows',   pos: {x, y}, next: [] },
  { id: 'blackthorn',name: 'Blackthorn Hollow', type: 'wilds', levelId: 'blackthorn',pos: {x, y}, next: [] },
],
MAP_START_NODE: 'tornville',
```

- The map can later grow by adding nodes and `next` links. Code MUST NOT hard-code these three nodes.
- A run is complete when the player wins a node with no `next` nodes.
- Positions are on the 1920×1080 stage. The start node is near the bottom centre; the two upper nodes are higher up, left and right, slightly off-symmetric. Leave room above for future rows.

### 4.2 Look

- **Background:** a dark, muted forest map look, e.g. aged parchment or a deep green-brown ground with faint tree clusters drawn procedurally. Keep it calm so the nodes stand out.
- **Roads:** each `next` link is drawn as a slightly winding dotted or dashed path from one node up to the next.
- **Wilds node:** a dark brown circle (`MAP_NODE_RADIUS`, about 44 px) with a light rim, containing a **wolf's head silhouette** in a pale colour. The wolf's head is a single shared draw function (reusable elsewhere later).
- **Name label:** the place name below the node, in a clear, slightly storybook-style font.

### 4.3 Node states

| State | When | Look | Clickable |
|---|---|---|---|
| **Available** | Start node at the beginning of a run; any `next` node of the last won node | Full colour, gentle pulse or glow | Yes |
| **Completed** | Won | Full colour with a bold **red V** over the circle | No |
| **Locked** | Not reachable yet | Dimmed (about 50%) | No |
| **Bypassed** | Was available but the player chose a sibling | Dimmed further, road to it greyed | No |

- Hovering an available node: slight scale-up and a tooltip with the name and a one-line description (see §5), e.g. `Gallows Copse — A restless swarm. Wolves 44 · Bears 3`.
- Clicking an available node starts that encounter's Prep (in the current `PREP_MODE`).
- The roads from a completed node to its available children are highlighted; other roads stay faint.
- SHOULD: a small Druid token stands on the node he last completed (or below the start node at the beginning of a run).

### 4.4 Victory and Defeat overlays

- **Victory, more nodes reachable:** `VICTORY`, stats, carried resources (§3), button **Continue**, which returns to the map.
- **Victory, run complete:** `VICTORY`, stats, a short line such as `The wilds are quiet… for now.`, button **Start again**, which begins a new run on the map.
- **Defeat:** `DEFEAT`, stats, button **Start again** (new run).

---

## 5. Levels

### 5.1 Data-driven levels

Move everything that defines an encounter's scene into a `LEVELS` table:

```js
LEVELS: {
  tornville: {
    name, description,
    druidPos, lanes, sectorBoundaryAngles, nearRadius,
    candidateLocations, zoneQuotas, zoneQuotaOverrides,
    decorSeed, decorDensity,
    palette,
    wave, bears,          // enemy schedule (wave bursts + bear spawns)
    stepBudget,           // per-level step budget
  },
  gallows: { ... },
  blackthorn: { ... },
},
```

- Global values (turret stats, summon stats, enemy stats, drop tables, UI, debug) stay global.
- All existing per-scene validation (lane length, corridor clearance, candidate rules, zone counts, wave totals) runs **for every level** at start-up.

### 5.2 The three Wilds

| | Tornville Haunt | Gallows Copse | Blackthorn Hollow |
|---|---|---|---|
| Role | Start | Option A: swarm | Option B: brutes |
| Description | "The old haunt at the forest's edge." | "A restless swarm." | "Thick thorns hide heavy beasts." |
| Wolves | 35 (unchanged) | 44 | 36 |
| Bears | 3 (unchanged) | 3 | 5 |
| Pacing | Unchanged | More bursts, larger, closer together; last burst ~55 s | Wolf pacing similar to Tornville; Bears at about 18, 26, 34, 42, 50 s |
| Layout | Unchanged (current) | New | New |
| Palette | Unchanged (current) | Cold, misty grey-green | Dark, purple-brown, thorny |

All Gallows Copse and Blackthorn Hollow numbers are TUNING. Both upper Wilds should be noticeably but not drastically harder than Tornville, and they should feel **different** from each other, so the choice on the map means something.

### 5.3 New layouts

For Gallows Copse and Blackthorn Hollow, design new scenes following all existing scene rules:

- **3 lanes**, entering from different screen edges than Tornville's where sensible (e.g. top, left and bottom-right), each winding, about `LANE_LENGTH_FACTOR` × the straight-line distance, separate until the Druid, unopposed travel about 25–30 s.
- **Druid position:** off-centre, different from Tornville's.
- **Zones:** 3 sectors (one lane each) × near/far, with their own `sectorBoundaryAngles` and `nearRadius`. Sector names follow each lane's entry direction (e.g. `N`, `W`, `SE`), and zone IDs follow the M1j pattern (`nN`, `fN`, …).
- **30 candidates** with explicit zone labels (4 per near zone, 6 per far zone), same quotas as Tornville unless overridden.
- **Decoration:** fixed per level (own `decorSeed`), avoiding corridors and candidates, with `decorDensity` and palette giving each level its own feel. Blackthorn Hollow SHOULD use denser, spikier vegetation shapes (thorn bushes) drawn with the existing procedural approach.

### 5.4 Bears with more than 3 per level

Generalises M1e §3.6: with `RANDOMISE_BEAR_LANES` on, Bears are spread across lanes as evenly as possible (each lane gets at least one if there are ≥ 3 Bears; the extras go to random different lanes), using the seeded RNG.

### 5.5 Palette

```js
palette: {
  floor, floorAccent,        // forest ground
  corridor, corridorEdge,    // enemy paths
  treeDark, treeLight,
  rock, vegetation,
  mapTint,                   // optional tint for the level's node on the map (unused for now)
}
```

Only scene colours change between levels. Entities, UI, icons and HUD keep their existing colours so they stay readable everywhere.

---

## 6. Level name label

- During **Prep and Combat**, the current Wilds name is shown in the **bottom-left corner**, floating above the environment (HTML layer, not part of the HUD strip).
- Style: larger storybook-style text, light colour, soft shadow or semi-transparent dark backing so it reads on every palette; inset about 24 px from the edges.
- It MUST NOT block clicks (`pointer-events: none`) and MUST NOT cover any candidate location; check at start-up for every level and warn if a candidate falls under the label's area.
- It stays visible during `ENDING` and under the Victory/Defeat overlay.

---

## 7. Sound

New audio events, using the existing event bus and spam limits (M1g §3):

| Event | Sound |
|---|---|
| `mapNodeHover` | Very soft tick |
| `mapNodeChosen` | Low, warm drum hit + short rising tone |
| `runComplete` | Short triumphant three-note phrase |

---

## 8. Debug additions

| Key | Action |
|---|---|
| `R` | Restart the **current encounter** (same node, resources as they were when it started). Unchanged meaning for testing |
| `W` | Win the current battle instantly (Combat only): goes straight to `ENDING` → Victory |
| `[` / `]` | (Debug) Jump directly into the previous / next level in `LEVELS`, starting its Prep with the current resources |
| `Shift+R` | Start a new run (back to the map) |

Panel: run seed; current node; completed nodes; carried inventory; level ID.
Map screen: with `D` on, show node IDs and their `next` links as text.

---

## 9. Tuning values

| Constant | Value |
|---|---|
| `MAP_START_NODE` | `'tornville'` |
| `MAP_NODE_RADIUS` | 44 px |
| `CARRY_DRUID_HP` | `false` (TUNING) |
| Gallows Copse | 44 wolves, 3 Bears (TUNING) |
| Blackthorn Hollow | 36 wolves, 5 Bears (TUNING) |
| Per-level `stepBudget` | Start at Tornville's value; calibrate per level from the reported route cost |

---

## 10. Acceptance criteria

### Map and run
- [ ] Game opens on the map, with Tornville Haunt available at the bottom and two roads leading to Gallows Copse and Blackthorn Hollow.
- [ ] All three nodes are dark brown circles with a wolf's-head silhouette and their names.
- [ ] Clicking Tornville starts its Prep; clicking locked nodes does nothing.
- [ ] Winning Tornville shows Victory with carried resources and **Continue**; Continue returns to the map with a red V on Tornville and both upper nodes available.
- [ ] Choosing one upper node marks the other as bypassed.
- [ ] Winning the second battle shows Victory with **Start again**, which begins a new run.
- [ ] Defeat shows **Start again**, which begins a new run.
- [ ] Map nodes and links come from `MAP_NODES`; nothing is hard-coded to these three.

### Carry-over
- [ ] Resources left at the end of the first victory, including Boughs, are the starting resources of the second encounter.
- [ ] Turrets, summons and field drops don't carry over.
- [ ] `CARRY_DRUID_HP` works in both settings.

### Levels
- [ ] Scene data is per level in `LEVELS`; Tornville behaves exactly as before.
- [ ] Gallows Copse and Blackthorn Hollow have their own lanes, Druid position, zones, 30 labelled candidates, decoration, palette and waves, all passing start-up validation.
- [ ] Enemy counts match §5.2; Bears spread across lanes per §5.4.
- [ ] Each level's name appears bottom-left during the encounter, without blocking clicks or covering candidates.

### General
- [ ] Debug keys and panel additions work.
- [ ] Both Prep modes, zone-based layouts, drops, all summons and turrets work in every level.
