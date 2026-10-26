# Broceliande — M1j Addendum: Zone-Based Layout

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1I`). Everything there still applies unless this document overrides it. This mainly overrides parts of **M1c** (randomised layout).
**Goal:** spread turret slots and resource spots evenly around the Druid by dividing the battlefield into 6 zones, each with its own quota, and make every candidate's zone easy to edit by hand.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.

---

## 1. Summary

- The battlefield is divided into **3 sectors** around the Druid, one per lane, and each sector into **near** and **far**: **6 zones**.
- **30 candidate locations**, each with an explicit `zone` label in config.
- Each run, every zone fills its own quota:

  | Zone kind | Candidates | Turret slots | Resource spots | Vacant |
  |---|---|---|---|---|
  | Near (×3) | 4 | 2 | 1 | 1 |
  | Far (×3) | 6 | 2 | 2 | 2 |
  | **Total** | **30** | **12** | **9** | **9** |

- Resource spots go up from 8 to **9**.

---

## 2. Zones

### 2.1 Geometry

All zones are measured from `DRUID_POS`, not the screen centre.

- **Sectors:** three angular sectors around the Druid, split by `SECTOR_BOUNDARY_ANGLES` (three angles in degrees, 0° = east, clockwise, since screen y points down). Choose the boundaries so that **each sector contains mainly one lane**, and boundaries fall between lanes, not across them.
- **Sector names** follow the lane each one contains:

  | Sector | Lane |
  |---|---|
  | `NW` | Upper-left |
  | `E` | Right |
  | `SW` | Bottom-left |

- **Near / far:** a candidate is near if its distance to `DRUID_POS` is ≤ `NEAR_RADIUS`, otherwise far. `NEAR_RADIUS` is TUNING (start around 380 px, adjust so the near zones can hold 4 candidates each).
- **Zone IDs:** `nNW`, `fNW`, `nE`, `fE`, `nSW`, `fSW`.

### 2.2 Zone labels are the source of truth

- Each entry in `CANDIDATE_LOCATIONS` has an explicit `zone` field:
  ```js
  { x: 640, y: 310, zone: 'fNW' },
  ```
- Claude Code fills in the initial labels from the geometry above. After that, **the label in config decides the zone**, not the geometry. The designer can move a candidate to another zone by editing one word.
- At start-up, if a candidate's label doesn't match its geometric zone, log an **info** message (not a warning), e.g. `Candidate 14 labelled nSW, geometrically fSW (manual override)`. This is expected when the designer has overridden it.

### 2.3 Quotas

```js
ZONE_QUOTAS: {
  near: { turret: 2, feature: 1 },
  far:  { turret: 2, feature: 2 },
},
ZONE_QUOTA_OVERRIDES: {},   // e.g. { fE: { turret: 3, feature: 1 } }
```

- Vacant = the zone's candidate count minus its turret and feature quotas.
- `ZONE_QUOTA_OVERRIDES` lets a single zone use different numbers without changing the rest.
- Start-up validation: every zone MUST have at least `turret + feature` candidates. Log an error naming the zone if not.
- Totals are derived from the quotas, not stored separately. The debug panel shows them (should be 12 turret slots, 9 resource spots).

---

## 3. Candidate locations

- **30 candidates**: 4 in each near zone, 6 in each far zone.
- Keep as many of the existing 25 positions as possible. Label them, then add or move candidates until each zone has its target count.
- All M1c §2 rules still apply to every candidate: within turret reach of a lane, clear of corridors (footprint + jitter), below the HUD strip, and spacing from every other candidate.
- If 30 candidates can't all meet the spacing rule, report which zones are crowded and propose options (e.g. small moves, or one fewer vacant candidate in a far zone) rather than silently changing `LOCATION_RADIUS`, `LOCATION_JITTER` or `LOCATION_GAP`.
- Decoration must still avoid all candidates (M1c §5). Regenerate it once to fit the new set, then keep it fixed across runs.

---

## 4. Layout generation

Replaces steps 1–3 of M1c §3. Steps 4–7 (jitter, constraints, reroll, fallback) are unchanged.

1. For **each zone**: shuffle its candidates with the run's seeded RNG, take the first `turret` as turret slots, the next `feature` as resource spots, the rest as vacant.
2. Shuffle the **feature type mix** (§5) and assign it across all 9 resource spots.
3. Jitter, check constraints, reroll or fall back as in M1c.

### 4.1 Constraints

- **Lane coverage** (M1c §4.1): kept as a safety check. Zoning should make it pass almost always; if it often fails, report it.
- **Feature route cost** (M1c §4.2): kept. With 9 features, the greedy route is longer, so check the band against `STEP_BUDGET` and report the typical route cost so the budget can be recalibrated. Don't change `STEP_BUDGET` yourself.

### 4.2 Fixed layout option

The old fixed layout (12 + 8 in original positions) no longer fits the zones. Replace it:

```js
RANDOMISE_LAYOUT: true,
FIXED_LAYOUT_SEED: 1001,   // used when RANDOMISE_LAYOUT is false
```

When `false`, generate the layout with `FIXED_LAYOUT_SEED`, so it's always the same layout but still follows the zone rules. Remove the stored original roles and types from the candidates.

---

## 5. Feature type mix (9 spots)

| Type | Count |
|---|---|
| Tree | **3** (was 2) |
| Reed Patch | 1 |
| Shrub | 1 |
| Ruins | 2 |
| Pond | 2 |

The extra Tree adds about 1.5 Boughs and 3 Pits to a full search, helping the scarce Bough supply for Bough Doubles. Update the debug panel's expected-yield figures.

---

## 6. Debug additions

Overlay (with `D`):
- Sector boundary lines from the Druid and the `NEAR_RADIUS` ring.
- Each zone faintly tinted, with its ID written in it.
- Each candidate labelled with its zone and this run's role, e.g. `fSW·T`, `nE·F:Pond`, `fNW·V`. Candidates whose label overrides their geometry get a small marker (e.g. `*`).

Panel:
- Per-zone table: candidates, turret slots, resource spots, vacant.
- Derived totals.
- Typical feature route cost vs `STEP_BUDGET`.

---

## 7. Tuning values

| Constant | Value |
|---|---|
| `SECTOR_BOUNDARY_ANGLES` | 3 angles, chosen to separate the lanes (TUNING) |
| `NEAR_RADIUS` | ~380 px (TUNING) |
| `ZONE_QUOTAS` | near: 2 turret + 1 feature; far: 2 turret + 2 features |
| `ZONE_QUOTA_OVERRIDES` | `{}` |
| `FIXED_LAYOUT_SEED` | 1001 |
| Feature mix | 3 Tree, 1 Reed Patch, 1 Shrub, 2 Ruins, 2 Pond |

---

## 8. Acceptance criteria

- [ ] 6 zones measured from the Druid: 3 sectors (one lane each) × near/far.
- [ ] 30 candidates, each with an explicit `zone` label: 4 per near zone, 6 per far zone.
- [ ] Editing a candidate's `zone` label in config moves it to that zone; mismatches with geometry are logged as info.
- [ ] Each run fills every zone's quota exactly: near 2 turret + 1 feature, far 2 turret + 2 features; totals 12 turret slots and 9 resource spots.
- [ ] `ZONE_QUOTA_OVERRIDES` works for a single zone.
- [ ] Start-up validation catches zones with too few candidates, and all M1c candidate rules.
- [ ] Feature mix is 3 Tree, 1 Reed Patch, 1 Shrub, 2 Ruins, 2 Pond.
- [ ] Lane-coverage and route-cost constraints still run; typical route cost reported.
- [ ] `RANDOMISE_LAYOUT: false` gives the same zone-based layout every time via `FIXED_LAYOUT_SEED`.
- [ ] Decoration stays fixed across runs and avoids all 30 candidates.
- [ ] Debug overlay shows zones, boundaries, near ring and candidate labels; panel shows per-zone counts.
- [ ] Everything else still works in both Prep modes.
