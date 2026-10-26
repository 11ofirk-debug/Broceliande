# Broceliande — M2b Addendum: Third Row of Wilds

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`). Everything there still applies unless this document overrides it.
**Goal:** add three level 3 Wilds (The Drowned Hamlet, Wychwood Circle, Forgotten Barrow), extending a run to three battles, with per-level corridor width and resource mix.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.

---

## 1. Map

### 1.1 Layout

```
Wychwood Circle    Forgotten Barrow    The Drowned Hamlet
        \            /        \            /
       Gallows Copse            Blackthorn Hollow
                \                  /
                 Tornville Haunt
```

Update `MAP_NODES`:

| Node ID | Name | `next` |
|---|---|---|
| `tornville` | Tornville Haunt | `gallows`, `blackthorn` |
| `gallows` | Gallows Copse | `wychwood`, `barrow` |
| `blackthorn` | Blackthorn Hollow | `barrow`, `drowned` |
| `wychwood` | Wychwood Circle | — |
| `barrow` | Forgotten Barrow | — |
| `drowned` | The Drowned Hamlet | — |

- **Positions:** the third row sits above the second. Wychwood Circle is above and left of Gallows Copse, The Drowned Hamlet above and right of Blackthorn Hollow, and Forgotten Barrow **centred between** the two level 2 nodes, so both roads into it are similar in length. Keep positions slightly off-symmetric, as before.
- If the existing map positions leave too little room, adjust all node positions so the three rows fit comfortably on the 1920×1080 stage, with the Tornville node still near the bottom.
- All three new nodes are `type: 'wilds'` and use the wolf's-head icon.
- Roads are drawn for every `next` link. The two roads into Forgotten Barrow SHOULD curve in from either side rather than overlapping.

### 1.2 Node states (generalised)

Replaces the state rules in M2a §4.3, so they work for any map shape:

| State | Rule |
|---|---|
| **Completed** | Won this run |
| **Available** | A `next` node of the most recently won node (or the start node at run start) |
| **Locked** | Not completed or available, but still **reachable** from the current node by following `next` links |
| **Bypassed** | Not completed and **no longer reachable** from the current node |

Looks are unchanged from M2a (red V, pulse, dimmed, dimmed further with greyed roads).

Example: after Tornville → Gallows Copse, Wychwood Circle and Forgotten Barrow are available, while Blackthorn Hollow and The Drowned Hamlet are bypassed.

### 1.3 Run length

The run is complete when the player wins a node with no `next` nodes, which is now any third-row node. Victory after Tornville or a second-row node shows **Continue**; victory after a third-row node shows **Start again** (M2a §4.4).

---

## 2. Per-level settings (new)

Move these into `LEVELS` (each level may override; otherwise the global default applies):

| Setting | Global default | Notes |
|---|---|---|
| `corridorWidth` | `CORRIDOR_WIDTH` (110) | Used for drawing, wolf/Bear lateral limits, collision, candidate clearance validation, drop clamping |
| `featureMix` | 3 Tree, 1 Reed Patch, 1 Shrub, 2 Ruins, 2 Pond | Must total the level's feature quota (9 with current zone quotas); validate at start-up |

Existing levels keep their current behaviour (Tornville, Gallows Copse, Blackthorn Hollow use the defaults unless already set).

Everything that previously read `CORRIDOR_WIDTH` or the global feature mix MUST now read the current level's value.

---

## 3. The three new Wilds

All values TUNING. Each should be harder than the level 2 Wilds, and each should play differently.

### 3.1 Overview

| | The Drowned Hamlet | Wychwood Circle | Forgotten Barrow |
|---|---|---|---|
| Reached from | Blackthorn Hollow | Gallows Copse | Both |
| Character | Narrow causeways; enemies jam up | Huge wolf surges | The heaviest beasts |
| Description (map tooltip) | "Half-sunk cottages and narrow causeways." | "The old stones hum. The packs come in great surges." | "Something stirs beneath the mound." |
| Wolves | 46 | 54 | 48 |
| Bears | 4 | 3 | 6 |
| Corridor width | **90** (narrow) | **130** (wide) | 110 (default) |
| Feature mix (9) | 1 Tree, 2 Reed Patch, 1 Shrub, 1 Ruins, **4 Pond** | 2 Tree, 1 Reed Patch, **3 Shrub**, 2 Ruins, 1 Pond | 2 Tree, 1 Reed Patch, 1 Shrub, **4 Ruins**, 1 Pond |
| Palette | Cold blue-grey, wet stone, dark water | Deep green with violet, faint glow | Pale ochre, dry grass, grey stone |

### 3.2 The Drowned Hamlet

- **Waves:** a steady, fairly even stream across all three lanes rather than big bursts. Bursts of 2–3 wolves every 4–6 s per lane, last burst about 55 s. Bears at about 16, 28, 40, 52 s.
- **Layout:** lanes follow narrow causeways between flooded areas. Lanes SHOULD include a few tight bends where enemies bunch up (good spots for Toader clouds). The narrow corridors mean wolves often can't pass Bears.
- **Resources:** water-rich. Plenty of Reeds (Toaders), but few Boughs (one Tree, one Shrub), so players arriving here want Boughs carried from earlier.
- **Decoration:** sunken cottage roofs and broken fences poking out of dark water patches, reeds along the edges. Water patches are decoration only, outside corridors and candidates.

### 3.3 Wychwood Circle

- **Waves:** three big surges. Each surge sends 5–7 wolves into each lane within a few seconds, at about 8, 28 and 48 s, with only scattered single wolves between them. Bears at about 20, 38, 56 s.
- **Layout:** wide corridors (130) let wolves spread out and overtake, so they arrive fast and in numbers. The Druid sits inside or beside a ring of standing stones (decoration).
- **Resources:** Shrub-rich, so Feathers are plentiful (Vultures to blunt the surges) and Boughs are reasonable (2 Trees, 3 Shrubs).
- **Decoration:** standing stones in a ring around the Druid's area, gnarled trees, small glowing mushrooms.

### 3.4 Forgotten Barrow

- **Waves:** balanced wolf pressure, similar in pacing to Tornville but larger. Bears every 8 s from 15 s (15, 23, 31, 39, 47, 55), spread across lanes per M2a §5.4 (two per lane).
- **Layout:** the Druid stands near a large grassy burial mound (decoration). Lanes are fairly long, giving turrets time to wear Bears down.
- **Resources:** Ruins-rich, so Pits and Feathers for upgrades (level 3 turrets for the Bears).
- **Decoration:** the burial mound, scattered grave-stones and stone slabs, low mist patches.

### 3.5 Common rules

Each new level follows all existing scene rules (M2a §5.3):

- 3 lanes from different screen edges, winding, about `LANE_LENGTH_FACTOR` × straight-line distance, separate until the Druid, about 25–30 s unopposed travel for a wolf.
- Druid off-centre, in a different position from the other levels.
- 3 sectors × near/far zones with their own angles and radius, sector names from lane entry directions.
- 30 candidates with explicit zone labels (4 per near zone, 6 per far zone), passing all validation with the level's own corridor width.
- Fixed decoration per level (own `decorSeed`), avoiding corridors and all candidates.
- Level name label bottom-left must not cover any candidate.
- Own `stepBudget`, calibrated from the reported feature route cost.

---

## 4. Debug

- `[` / `]` cycle through all six levels.
- Map debug text (with `D`) shows each node's computed state.
- Panel shows the current level's corridor width and feature mix.

---

## 5. Acceptance criteria

### Map
- [ ] Six nodes in three rows; Forgotten Barrow centred between the level 2 nodes; roads match §1.1.
- [ ] Node states follow §1.2, including bypassed nodes reached only through a skipped node.
- [ ] Victory after rows 1 and 2 shows Continue; after row 3 shows Start again.
- [ ] Resources carry from battle 1 to 2 and from 2 to 3.

### Per-level settings
- [ ] `corridorWidth` and `featureMix` work per level, everywhere they're used; existing levels unchanged.
- [ ] Feature mix totals validated against the quota for every level.

### New levels
- [ ] The Drowned Hamlet, Wychwood Circle and Forgotten Barrow each have their own lanes, Druid position, zones, candidates, decoration, palette, corridor width, feature mix and waves, all passing validation.
- [ ] Enemy counts and Bear timings match §3.
- [ ] Each level's character is noticeable in play: jams on narrow causeways, big surges, many Bears.

### General
- [ ] Debug additions work.
- [ ] Everything else still works in all levels and both Prep modes.
