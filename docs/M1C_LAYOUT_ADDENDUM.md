# Broceliande — M1c Addendum: Randomised Layout

**Status:** addendum to `docs/M1_SPEC.md` and `docs/M1B_STEPS_ADDENDUM.md`. Everything there still applies unless this document overrides it.
**Goal:** each run uses a different arrangement of turret slots, searchable features and empty spots, drawn from one fixed pool of candidate locations, while the forest itself looks the same every run.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.

---

## 1. Summary

- There are **25 candidate locations**, fixed in config.
- Each run, the seeded RNG assigns them: **12 turret slots**, **8 searchable features**, **5 vacant**.
- Feature types are assigned to the 8 feature locations using the existing mix (2 Trees, 1 Reed Patch, 1 Shrub, 2 Ruins, 2 Ponds).
- Each chosen location gets a small random **jitter**.
- The draw must pass **fairness constraints**; if not, it rerolls.
- **Decoration is fixed** and never touches any candidate location, including vacant ones.
- Applies in **both** Prep modes (`'timed'` and `'steps'`).

This replaces `SHUFFLE_FEATURE_TYPES` from M1b §7, which should be removed.

---

## 2. Candidate locations

```js
CANDIDATE_LOCATIONS: [ { x, y }, ... ]   // exactly 25
```

- Keep the **existing 20 positions** (12 current slots + 8 current features) and add **5 new ones**, spread so they don't cluster.
- Every candidate MUST satisfy, at start-up (validate and log a warning for any that fail):
  - **Within turret reach:** some point on at least one lane centreline is within `TURRET_RANGE` of the candidate. (Any candidate may become a turret slot, so none may be dead.)
  - **Outside corridors:** the candidate's footprint plus maximum jitter does not overlap any corridor:
    distance to every corridor edge ≥ `LOCATION_RADIUS + LOCATION_JITTER`.
  - **Below the HUD strip** and fully on screen, including jitter.
  - **Spacing:** distance to every other candidate ≥ `2 × (LOCATION_RADIUS + LOCATION_JITTER) + LOCATION_GAP`.

### 2.1 Footprint

- Every candidate has a circular footprint of radius `LOCATION_RADIUS`, large enough to contain the largest object (Pond or Ruins) and a turret.
- All feature and turret visuals MUST be drawn within the footprint. They can look different, but none may exceed it.
- Hit-testing for hover and click uses the drawn object, or the footprint if simpler; be consistent.

---

## 3. Layout generation (each run)

Runs on every encounter start and restart, using the run's seed.

1. **Shuffle** the 25 candidates.
2. Take the first 12 as **turret slots**, the next 8 as **features**, the last 5 as **vacant**.
3. **Assign feature types** to the 8 features by shuffling the type mix.
4. **Jitter** each turret slot and feature: offset by a random vector with length ≤ `LOCATION_JITTER`. Vacant locations are not drawn, so jitter doesn't matter for them.
5. **Check constraints** (§4) using the jittered positions.
6. If any constraint fails, go back to step 1 using the same RNG stream (so a fixed seed still always produces the same final layout).
7. After `MAX_LAYOUT_ATTEMPTS` failures, use the attempt that failed **fewest** constraints, and log a warning with the details.

### 3.1 Fixed layout option

```js
RANDOMISE_LAYOUT: true,   // false = original fixed M1 layout
```

When `false`, use the original 12 slot and 8 feature positions with their original types, and no jitter. Store the original role and type alongside each of the first 20 candidates so this can be reproduced. Useful for comparing against earlier playtests.

---

## 4. Fairness constraints

### 4.1 Lane coverage

For each of the three lanes, at least `LANE_MIN_TURRET_SLOTS` turret slots must **cover** that lane.

A slot covers a lane if some point on that lane's centreline is within the slot's base `TURRET_RANGE`. A slot near two lanes counts for both. That's fine and intended.

### 4.2 Feature route cost

Compute the greedy nearest-neighbour route from `DRUID_POS` through all 8 features, in steps (using the M1b step-cost formula, including `ceil` per leg).

It must fall within:

```
FEATURE_ROUTE_MIN_FACTOR × STEP_BUDGET  ≤  routeCost  ≤  FEATURE_ROUTE_MAX_FACTOR × STEP_BUDGET
```

This keeps the step budget roughly equally tight across runs. It's checked in both modes (in timed mode it just keeps layouts comparable).

---

## 5. Decoration

- Decoration (trees, rocks, bushes, other boundary objects) MUST be **identical in every run**, regardless of seed or mode.
- Generate it once from a fixed `DECOR_SEED` (separate from the run seed), or hand-place it in config. Either way, it MUST NOT change between runs.
- No decoration may overlap:
  - any **corridor**, or
  - any **candidate location's** footprint plus jitter plus margin:
    distance ≥ `LOCATION_RADIUS + LOCATION_JITTER + DECOR_MARGIN` from every one of the 25 candidates.
- Vacant locations are drawn as plain forest floor: no objects, no markers.

This means each part of the forest looks the same across runs, and only what sits in the clearings changes.

---

## 6. Debug additions

### 6.1 Keys

| Key | Action |
|---|---|
| `L` | Restart with a new seed (new layout). Same as `R` but always forces a new seed, even if `DEBUG_SEED` is set |

### 6.2 Overlay

- All 25 candidates: footprint circle and jitter circle, labelled with index and this run's role (`T`, `F:Tree`, `V`, etc.).
- For each turret slot, which lanes it covers.

### 6.3 Panel

- Layout attempts used this run, and how many attempts failed each constraint.
- Lane coverage counts (e.g. `Upper-left 4 · Right 3 · Bottom-left 5`).
- Feature route cost and its allowed band.
- Warning line if the fallback (best failed attempt) was used.

---

## 7. Tuning values

| Constant | Value | Notes |
|---|---|---|
| `RANDOMISE_LAYOUT` | `true` | |
| `LOCATION_RADIUS` | 45 px | TUNING — must contain the largest object |
| `LOCATION_JITTER` | 25 px | TUNING |
| `LOCATION_GAP` | 20 px | TUNING — extra spacing between candidates |
| `DECOR_MARGIN` | 15 px | TUNING |
| `DECOR_SEED` | 12345 | Fixed; any integer |
| `LANE_MIN_TURRET_SLOTS` | 3 | TUNING |
| `FEATURE_ROUTE_MIN_FACTOR` | 0.75 | TUNING |
| `FEATURE_ROUTE_MAX_FACTOR` | 1.10 | TUNING |
| `MAX_LAYOUT_ATTEMPTS` | 200 | |

If the existing 20 positions plus `LOCATION_RADIUS` and `LOCATION_JITTER` violate the spacing or corridor rules, report which ones and propose small position adjustments rather than silently changing values.

---

## 8. Acceptance criteria

- [ ] 25 candidates in config; start-up validation passes or reports specific failures.
- [ ] Each run has 12 turret slots, 8 features (correct type mix) and 5 vacant spots.
- [ ] Chosen positions are visibly jittered; nothing overlaps corridors, the HUD strip, or each other.
- [ ] Every lane is covered by at least `LANE_MIN_TURRET_SLOTS` turret slots, every run.
- [ ] Feature route cost stays within the configured band, every run.
- [ ] Same seed → identical layout. `L` gives a new layout.
- [ ] Decoration is identical across runs and never touches any candidate location, including vacant ones.
- [ ] All objects and turrets are drawn within their footprint.
- [ ] `RANDOMISE_LAYOUT: false` restores the original fixed layout.
- [ ] Works in both Prep modes; Combat unchanged.
- [ ] `SHUFFLE_FEATURE_TYPES` removed.
- [ ] Debug overlay and panel show the information in §6.
