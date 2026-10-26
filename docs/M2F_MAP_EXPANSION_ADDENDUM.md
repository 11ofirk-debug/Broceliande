# Broceliande — M2f Addendum: Map Rows 4–8

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2E`). Everything there still applies unless this document overrides it.
**Goal:** extend the map from 3 rows to 8, with 11 new encounters of gradually rising difficulty: one more Fell Wilds (row 6) and a final boss node (row 8).

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.
>
> **Verification:** the designer tests by playing. Check the acceptance criteria by reading the code, not with automated or headless-browser tests (see `CLAUDE.md`).

---

## 1. Map

### 1.1 Rows and links

```
Row 8                         The Heartwood (BOSS)
                          /          |           \
Row 7          Bone Orchard   The Weeping Stones   Hollow of Bells
                    |      \    /         \          |
Row 6        Mossbound Cairn                 The Ashen Glade (FELL)
                 /        \                 /          \
Row 5     Briar Chapel   Sunken Causeway          Widow's Orchard
                 \        /        \                /
Row 4     Charcoal Burner's Camp          Stag's Crossing
                 /          \            /          \
Row 3   Wychwood Circle   Forgotten Barrow (FELL)   The Drowned Hamlet
```

Rows 1–3 are unchanged. New `MAP_NODES`:

| Row | Node ID | Name | Type | `next` |
|---|---|---|---|---|
| 3 | `wychwood` | Wychwood Circle | wilds | **`charcoal`** |
| 3 | `barrow` | Forgotten Barrow | fell | **`charcoal`, `stags`** |
| 3 | `drowned` | The Drowned Hamlet | wilds | **`stags`** |
| 4 | `charcoal` | Charcoal Burner's Camp | wilds | `briar`, `causeway` |
| 4 | `stags` | Stag's Crossing | wilds | `causeway`, `widows` |
| 5 | `briar` | Briar Chapel | wilds | `mossbound` |
| 5 | `causeway` | Sunken Causeway | wilds | `mossbound`, `ashen` |
| 5 | `widows` | Widow's Orchard | wilds | `ashen` |
| 6 | `mossbound` | Mossbound Cairn | wilds | `bone`, `weeping` |
| 6 | `ashen` | The Ashen Glade | **fell** | `weeping`, `bells` |
| 7 | `bone` | Bone Orchard | wilds | `heartwood` |
| 7 | `weeping` | The Weeping Stones | wilds | `heartwood` |
| 7 | `bells` | Hollow of Bells | wilds | `heartwood` |
| 8 | `heartwood` | The Heartwood | **boss** | — |

Bold `next` entries for row 3 replace their current empty lists.

Path notes:
- Every node is reachable, and every path leads to the boss.
- The Ashen Glade (Fell) can be avoided: Briar Chapel only leads to Mossbound Cairn, and Mossbound Cairn leads around it.
- Choosing a side early narrows later options, so route planning matters.

### 1.2 Positions

- 8 rows, evenly spaced, bottom to top, in the map half of the screen. Tornville stays near the bottom; The Heartwood near the top.
- 2-node rows sit left and right; 3-node rows left, centre, right. Keep positions slightly off-symmetric and nodes in the same row reasonably close together (see the last map layout change).
- Roads MUST NOT cross each other or pass through other nodes. Curve them slightly where needed.
- Labels must not overlap other labels or nodes; long names may wrap onto two lines.

### 1.3 Run completion

Unchanged rule: the run is complete when the player wins a node with no `next` nodes, which is now only The Heartwood. Victory on any other node shows **Continue**.

---

## 2. Boss node type

```js
NODE_TYPES.boss = { label: 'Boss', icon: 'wolfHead', redEyes: true, large: true },
```

- **Icon:** the red-eyed wolf's head, drawn about 1.5× the normal node size, with a dark red rim and a slow, faint red pulse. Same shared draw function with a `large` option.
- **Tooltip:** `The Heartwood — Boss`, its description, enemy counts and bosses.
- **Final Victory** shows the run-complete overlay (M2a §4.4) with the line: `The Heartwood is cleansed. Broceliande breathes again.`
- **Placeholder boss:** there's no dedicated final boss yet. For now The Heartwood uses **two Ogres** (§4.8). A real boss will be designed later; keep the boss encounter data-driven so it can be swapped in.

---

## 3. Difficulty scaling

### 3.1 Enemy HP multiplier (new)

Enemy counts alone can't scale much further without crowding the lanes, so add a per-level setting:

```js
enemyHpMult: 1.0,   // multiplies the HP of every enemy in this level
```

- Applies to wolves, Bears and Ogres, through the stats system.
- Default 1.0. All existing levels (rows 1–3) stay at 1.0.
- HP bars, boss bar and debug panel show the scaled values.
- Drops are unchanged.

### 3.2 Difficulty curve

| Row | HP mult | Wolves | Bears | Notes |
|---|---|---|---|---|
| 1 | 1.0 | 35 | 3 | Existing |
| 2 | 1.0 | 36–44 | 3–5 | Existing |
| 3 | 1.0 | 44–54 | 3–4 (+ Ogre) | Existing |
| 4 | 1.1 | 48–52 | 3–4 | |
| 5 | 1.2 | 48–56 | 4–5 | |
| 6 | 1.3 | 50–56 | 4–5 (+ Ogre) | |
| 7 | 1.4 | 54–64 | 4–7 | |
| 8 | 1.5 | 60 | 6 + 2 Ogres | Boss |

All TUNING.

---

## 4. The new levels

Every new level follows all existing scene rules (M2a §5.3, M2b §3.5): 3 lanes from different screen edges, winding, about 25–30 s wolf travel; an off-centre Druid in a new position; 3 sectors × near/far zones; 30 labelled candidates; fixed decoration; name label clear of candidates; its own `stepBudget` calibrated from the feature route cost. Levels with an Ogre need `corridorWidth` ≥ 2 × `OGRE_RADIUS` + 2.

**Decoration scope:** use the existing procedural decoration shapes recoloured by the palette, plus **at most one** new signature decoration per level (listed below). Keep new shapes simple.

Feature mixes total 9 (2 per far zone + 1 per near zone, as now).

`stuckTime` is the per-level version of `STUCK_TIME` (M2d §3.4). If it isn't per-level yet, make it so (default = the global value).

### 4.1 Row 4 — Charcoal Burner's Camp

| | |
|---|---|
| Description | "Smoke hangs low over the old kilns." |
| Enemies | 48 wolves, 4 Bears · HP ×1.1 |
| Pacing | Pressure **alternates**: two lanes are busy while the third is quiet, rotating every ~15 s |
| Corridor | 110 |
| Feature mix | 1 Tree, 1 Reed Patch, 1 Shrub, **4 Ruins**, 2 Pond |
| Palette | Soot grey ground, dull orange embers, charred trees |
| Signature decor | Charcoal kilns (low domed mounds with a faint orange glow) |

### 4.2 Row 4 — Stag's Crossing

| | |
|---|---|
| Description | "Where the old ford cuts through the forest." |
| Enemies | 52 wolves, 3 Bears · HP ×1.1 |
| Pacing | Fast, frequent small bursts on all lanes |
| Corridor | **130** (wide) |
| Feature mix | 2 Tree, **2 Reed Patch**, 1 Shrub, 1 Ruins, **3 Pond** |
| Palette | Fresh greens, blue water |
| Signature decor | A shallow stream crossing the map (decoration only; corridors cross it via fords) |

### 4.3 Row 5 — Briar Chapel

| | |
|---|---|
| Description | "Thorns have swallowed the old chapel." |
| Enemies | 48 wolves, 5 Bears · HP ×1.2 |
| Pacing | Moderate wolves; Bears spread evenly from ~15 s |
| Corridor | **95** (narrow) · `stuckTime` 1.8 s, so Bears jam lanes for a while |
| Feature mix | 2 Tree, 1 Reed Patch, **3 Shrub**, 2 Ruins, 1 Pond |
| Palette | Dark green, deep red berries, grey stone |
| Signature decor | A ruined chapel wall overgrown with briars |

### 4.4 Row 5 — Sunken Causeway

| | |
|---|---|
| Description | "An old road drowned in black water." |
| Enemies | 52 wolves, 4 Bears · HP ×1.2 |
| Pacing | Steady even stream on all lanes (like The Drowned Hamlet, but heavier) |
| Corridor | **90** (narrow) · `stuckTime` 2.5 s |
| Feature mix | 1 Tree, **2 Reed Patch**, 1 Shrub, 1 Ruins, **4 Pond** |
| Palette | Dark teal water, grey-green stone |
| Signature decor | Broken causeway stones half under water |

### 4.5 Row 5 — Widow's Orchard

| | |
|---|---|
| Description | "Gnarled fruit trees, and something hungry beneath them." |
| Enemies | 56 wolves, 4 Bears · HP ×1.2 |
| Pacing | Two big surges (~15 s and ~40 s), scattered wolves between |
| Corridor | 115 |
| Feature mix | **4 Tree**, 1 Reed Patch, 1 Shrub, 2 Ruins, 1 Pond (Bough-rich) |
| Palette | Autumn browns and muted gold, dark twisted trunks |
| Signature decor | Rows of gnarled orchard trees |

### 4.6 Row 6 — Mossbound Cairn

| | |
|---|---|
| Description | "Moss-covered stones mark an ancient grave." |
| Enemies | 56 wolves, 5 Bears · HP ×1.3 |
| Pacing | Balanced, like Tornville scaled up |
| Corridor | 110 |
| Feature mix | 3 Tree, 1 Reed Patch, 2 Shrub, 2 Ruins, 1 Pond |
| Palette | Rich moss green, pale grey stone |
| Signature decor | A large moss-covered cairn near the Druid |

### 4.7 Row 6 — The Ashen Glade (Fell Wilds)

| | |
|---|---|
| Description | "Nothing grows here since the fire." |
| Enemies | 50 wolves, 4 Bears, **1 Ogre at ~15 s** · HP ×1.3 |
| Pacing | Moderate wolves; Bears at ~25, 35, 45, 55 s |
| Corridor | 115 |
| Feature mix | 2 Tree, 1 Reed Patch, 1 Shrub, **3 Ruins**, 2 Pond |
| Palette | Ash grey, black burnt trunks, faint ember red |
| Signature decor | Burnt tree stumps and drifting ash flecks (ambient particles, very subtle) |

### 4.8 Row 7 — Bone Orchard

| | |
|---|---|
| Description | "Pale branches, and paler things among the roots." |
| Enemies | 60 wolves, 5 Bears · HP ×1.4 |
| Pacing | Three surges (~10, 30, 50 s) |
| Corridor | 120 |
| Feature mix | 2 Tree, 1 Reed Patch, 2 Shrub, 3 Ruins, 1 Pond |
| Palette | Bleached bone-white trees, grey-violet ground |
| Signature decor | Pale, leafless trees |

### 4.9 Row 7 — The Weeping Stones

| | |
|---|---|
| Description | "The standing stones are always wet, though it never rains." |
| Enemies | 54 wolves, **7 Bears** · HP ×1.4 |
| Pacing | Moderate wolves; Bears every ~7 s from ~12 s |
| Corridor | 115 |
| Feature mix | 2 Tree, 1 Reed Patch, 1 Shrub, **3 Ruins**, 2 Pond |
| Palette | Slate blue-grey, dark wet stone |
| Signature decor | Tall standing stones with dark streaks |

### 4.10 Row 7 — Hollow of Bells

| | |
|---|---|
| Description | "Somewhere below, a bell tolls. The packs answer." |
| Enemies | **64 wolves**, 4 Bears · HP ×1.4 |
| Pacing | Every ~14 s a **toll**: a big synchronised surge on all three lanes at once. Few wolves between tolls |
| Corridor | 125 |
| Feature mix | 2 Tree, 1 Reed Patch, **3 Shrub**, 2 Ruins, 1 Pond (Feathers for Vultures) |
| Palette | Deep shadowed green, bronze accents |
| Signature decor | A cracked bronze bell half-buried near the Druid |
| Sound | A deep bell toll just before each surge (`bellToll` event) |

### 4.11 Row 8 — The Heartwood (Boss)

| | |
|---|---|
| Description | "The heart of Broceliande, and the rot at its centre." |
| Enemies | 60 wolves, 6 Bears, **2 Ogres** (~15 s and ~40 s, on different lanes) · HP ×1.5 |
| Pacing | Builds steadily to a final heavy push at ~50–60 s |
| Corridor | 120 |
| Feature mix | 2 Tree, 1 Reed Patch, 2 Shrub, 2 Ruins, 2 Pond |
| Palette | Very dark green, with a sickly purple-red glow at the lane entrances |
| Signature decor | Huge ancient tree roots around the Druid |

---

## 5. Debug

- `[` / `]` cycle through all levels, including the new ones.
- Debug panel shows the level's `enemyHpMult`.
- With `D` on the map, node IDs and links are listed as before.

---

## 6. Acceptance criteria

### Map
- [ ] 8 rows, 17 nodes in total, with the links in §1.1; row 3 now links upward.
- [ ] Roads don't cross; labels don't overlap; the map fits without scrolling.
- [ ] The Ashen Glade is a Fell Wilds; The Heartwood is a large Boss node with its own tooltip.
- [ ] Node states work across all 8 rows; only The Heartwood completes the run, with its own final line.

### Levels
- [ ] Per-level `enemyHpMult` scales every enemy's HP; rows 1–3 unchanged.
- [ ] All 11 new levels exist with the enemies, pacing, corridor width, feature mix, palette and signature decoration in §4, and pass all start-up validation.
- [ ] Levels with Ogres meet the corridor-width rule; Briar Chapel and Sunken Causeway have their longer `stuckTime`.
- [ ] Hollow of Bells plays a bell toll before each surge.

### General
- [ ] Debug cycling reaches every level.
- [ ] Everything else still works.
