# Broceliande — M2g Addendum: Varied Map Roads

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2F`). Everything there still applies unless this document overrides it. Overrides the fixed `next` links and positions in M2f §1.1–1.2.
**Goal:** replace the regular lattice of roads with a varied, irregular network, generated per run, while rows stay at clear, evenly spaced heights.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.
>
> **Verification:** the designer tests by playing. Check the acceptance criteria by reading the code, not with automated or headless-browser tests (see `CLAUDE.md`).

---

## 1. What stays fixed

- **Rows and their nodes.** Each node keeps its row (and so its difficulty): row 1 Tornville; row 2 Gallows Copse, Blackthorn Hollow; … row 8 The Heartwood.
- **Row heights.** Rows stay evenly spaced at fixed heights. Every node in a row sits on that row's height (a small vertical jitter of up to `MAP_Y_JITTER`, 8 px, is allowed for a hand-drawn feel, but rows must still read clearly as levels).
- **Roads only connect adjacent rows**, always upward.
- Node types, levels, tooltips, states and run rules are unchanged.

In config, replace each node's `next` list and `pos` with a `row` number. Links and positions are generated.

---

## 2. Generated each run

Uses the run seed (seeded RNG), so `DEBUG_SEED` reproduces the map.

### 2.1 Order and positions within a row

- **Shuffle the order** of the nodes within each row (rows with 1 node aside).
- Give each node an x position within the map area:
  - Keep at least `MAP_MIN_NODE_GAP` (about 150 px) between nodes in the same row, so labels don't collide.
  - Rows do **not** have to be centred or evenly spread. Nodes can drift left or right, so paths look like they wander rather than sitting on columns.
  - Keep nodes inside the map area with a margin for labels.
  - The single-node rows (Tornville, The Heartwood) sit near the horizontal centre (±60 px).

### 2.2 Roads between two adjacent rows

For each pair of adjacent rows, with nodes sorted left to right:

- **No crossings:** roads between the two rows must not cross. If road A→B and road C→D exist, with A left of C, then B must not be right of D.
- **Every node in the lower row has at least 1 road up**, and every node in the upper row has at least 1 road coming in.
- **Out-degree 1–3** for each node (in-degree 1–3 as well).
- **Prefer short roads:** a road's chance falls with its horizontal distance, so most roads go fairly straight up or to a near neighbour, with the occasional long diagonal.
- Build it with a simple non-crossing sweep: walk both rows left to right, connecting the current pair and randomly advancing the lower pointer, the upper pointer or both, then add a few extra non-crossing roads at random (`MAP_EXTRA_ROAD_CHANCE`).

### 2.3 Whole-map constraints

After generating all rows, check:

1. **Reachability:** every node is reachable from Tornville, and every node leads to The Heartwood.
2. **Fell Wilds are avoidable:** for each Fell Wilds node, at least one path from Tornville to The Heartwood avoids it.
3. **Variety:** at least 2 nodes have exactly one road up, and at least 1 node has three (where its row sizes allow it); not every node may have the same number of roads.
4. **Choice:** from Tornville, at least 3 distinct full paths to The Heartwood exist.

If any fails, regenerate with the same RNG stream (up to `MAP_MAX_ATTEMPTS`, 200). If none passes, use the attempt failing the fewest checks and log a warning.

### 2.4 Road drawing

- Each road is a **gently curved** line (a quadratic curve with a small random bend, seeded), so roads don't look ruler-straight.
- Same dashed style as now. Road states (highlighted, faint, greyed for bypassed) are unchanged.
- Roads MUST NOT pass through other nodes or their labels. If a curve would, reduce its bend or flip its direction.

---

## 3. Fixed map option

```js
MAP_RANDOMISE: true,       // false = use MAP_FIXED_SEED
MAP_FIXED_SEED: 2024,
```

When `false`, generate the map from `MAP_FIXED_SEED`, so it's the same irregular map every run (handy for comparing playtests).

---

## 4. Debug

| Key | Action |
|---|---|
| `L` (on the map screen) | Regenerate the map with a new seed, keeping the run's progress only if the current node still exists with the same row; otherwise start a new run |

Overlay on the map (with `D`): each node's in/out degree; attempts used; which constraint failed most.

---

## 5. Tuning values

| Constant | Value |
|---|---|
| `MAP_Y_JITTER` | 8 px |
| `MAP_MIN_NODE_GAP` | 150 px |
| `MAP_EXTRA_ROAD_CHANCE` | 0.25 (TUNING) |
| `MAP_MAX_ATTEMPTS` | 200 |
| `MAP_RANDOMISE` | `true` |
| `MAP_FIXED_SEED` | 2024 |

---

## 6. Acceptance criteria

- [ ] Rows stay at clear, evenly spaced heights; each node stays in its row.
- [ ] Node order within rows and x positions vary per run; rows aren't forced into a centred or lattice pattern.
- [ ] Roads connect only adjacent rows, never cross, and are gently curved.
- [ ] Every node has 1–3 roads up (except the boss) and at least 1 road in (except the start).
- [ ] Reachability, Fell-avoidance, variety and choice constraints hold, with reroll and fallback.
- [ ] Same seed gives the same map; `MAP_RANDOMISE: false` gives the fixed-seed map.
- [ ] Node states, tooltips, the Druid token and run flow work as before.
- [ ] Debug `L` on the map and the overlay additions work.
