# Broceliande — M1b Addendum: Step-Budget Prep

**Status:** addendum to `docs/M1_SPEC.md`. Everything in the main spec still applies unless this document overrides it.
**Goal:** test an alternative Prep phase where a **distance budget** replaces the time limit, inspired by route-planning exploration in games like Gordian Quest.

> Same conventions as the main spec: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.

---

## 1. Purpose

The original Prep tests decisions under **time pressure**. M1b tests decisions under **route pressure**: the Druid has a limited travel budget, and every marker he visits moves him somewhere new, so the order of visits matters.

Both modes MUST remain playable so they can be compared back to back.

---

## 2. Mode switch

Add to `config.js`:

```js
PREP_MODE: 'steps',   // 'steps' | 'timed'
```

- `'timed'`: the existing M1 Prep, unchanged.
- `'steps'`: the Prep described in this addendum.
- Add debug key `M`: toggle `PREP_MODE` and restart the encounter. Show the current mode in the debug panel.

Combat, Victory, Defeat, upgrading and summoning are **identical in both modes**.

---

## 3. Overview of step-mode Prep

- Prep has **no time limit**. The Prep countdown is not shown.
- The Druid has a **step budget** shown as a bar, full at the start.
- The player clicks a marker (searchable feature or empty turret slot). The Druid travels there, the step cost is deducted, and the action happens.
- The Druid's position is now wherever he last stopped. The next cost is measured from there.
- Actions (searching, building) cost **no** steps. Only travel costs steps.
- Wolf corridors can be crossed freely; travel is straight-line.
- The player clicks **Start Battle** when finished. There is no need to walk back.

---

## 4. Step cost

```
cost = ceil( distance(currentDruidPos, markerPos) / STEP_PX )
```

- `currentDruidPos` starts at `DRUID_POS` and becomes the marker's position after each visit.
- `markerPos` is the marker's centre (searchable feature or turret slot).
- Costs are whole steps.
- Corridors, terrain and decorations have no effect on cost.

A marker is **affordable** if `cost ≤ stepsRemaining`.

---

## 5. Interaction

### 5.1 Valid targets

| Marker | Clickable when |
|---|---|
| Searchable feature | Not exhausted, and affordable |
| Empty turret slot | Affordable, **and** the player has the resources for a Pebble Sprinkler |
| Exhausted feature / built turret | Never (in Prep) |

### 5.2 Hover feedback

Hovering a marker MUST show:

1. **Tooltip** (HTML), replacing search time with step cost:
   ```
   Ruins
   Peach Pits: 0–3
   Feathers: 0–2
   Travel: 14 steps
   ```
   For a turret slot:
   ```
   Pebble Sprinkler
   2 Pits · 1 Reed
   Travel: 9 steps
   ```
   If the slot is unaffordable for resources, add a line: `Not enough resources`.
2. **Route preview** (canvas): a dashed line from the Druid's current position to the marker, with the step cost labelled near its midpoint.
3. **Step bar preview** (HUD): the segment of the bar that would be spent is highlighted in a distinct colour.
4. **Red blink**: if the cost exceeds `stepsRemaining`, the step bar blinks red (about 3 Hz) for as long as the hover lasts, and the dashed line is drawn red.
5. For turret slots, the base range circle is shown (as in the main spec).

Hovering an exhausted feature shows its tooltip ("Searched") but no route preview.

### 5.3 Clicking a marker

Clicking an affordable, valid marker:

1. Deducts the step cost immediately.
2. Moves the Druid to the marker with a short travel tween (`TRAVEL_TWEEN_TIME`). Input is ignored during the tween.
3. On arrival, performs the action **instantly**:
   - **Feature:** roll yield, add resources, show floating gain text, mark exhausted.
   - **Turret slot:** deduct turret resources, build the turret.
4. The Druid stays at that marker. His new position is the origin for the next cost.

There is **no build menu** in step mode. Clicking the slot is the build action, since the hover tooltip has already shown the cost and resources.

Clicking an unaffordable or invalid marker does nothing apart from the existing red-blink feedback.

### 5.4 No undo

Moves are committed one at a time and cannot be undone. (A debug undo is fine; see §8.)

### 5.5 Route trail

Draw the Druid's route so far as a faint solid line through every visited marker, starting at `DRUID_POS`. It stays visible through Prep and is removed when Combat begins.

### 5.6 Ending Prep

- The **Start Battle** button (replacing Start Combat in this mode) is always visible in Prep.
- Prep ends **only** when the player clicks it. Running out of steps does not end Prep automatically.
- When no valid, affordable marker remains, the button SHOULD gently pulse to prompt the player.
- On entering Combat, the Druid snaps back to `DRUID_POS` and the route trail is cleared.

### 5.7 Action states

In step mode, Prep uses only `IDLE` and a new short `TRAVELLING` state (during the tween). `SEARCHING` and `BUILDING` are not used in step mode, since actions are instant.

---

## 6. HUD changes (step mode only)

- **Top centre:** `PREP` label with the **step bar** below or beside it, replacing the countdown.
  - Bar shows `stepsRemaining / STEP_BUDGET` numerically as well (e.g. `62 / 90`).
  - Bar colours: normal fill; highlighted preview segment (§5.2.3); red blink (§5.2.4).
- **Start Battle** button replaces Start Combat.
- Resource panel and Druid HP are unchanged.

---

## 7. Layout variation

With routing as the main decision, a fixed layout gets solved quickly. Add:

```js
SHUFFLE_FEATURE_TYPES: true,   // TUNING
```

- When `true`, on each restart the **types** of the 8 features are shuffled across the 8 fixed feature positions, keeping the same type mix (2 Trees, 1 Reed Patch, 1 Shrub, 2 Ruins, 2 Ponds).
- Marker positions, lanes and turret slots never move.
- Shuffling uses the seeded RNG, so a fixed `DEBUG_SEED` reproduces the same layout.
- Applies in both modes.

---

## 8. Debug additions

| Key | Action |
|---|---|
| `M` | Toggle `PREP_MODE` and restart |
| `U` | Undo last move in step-mode Prep (debug only: restores steps, position, resources and the marker's state) |

Debug panel additions (step mode):
- `stepsRemaining / STEP_BUDGET`, current mode.
- **Calibration figures** (for tuning the budget):
  - Steps to visit **all 8 features** from `DRUID_POS` using a greedy nearest-neighbour route.
  - Steps to visit all 8 features **plus the 5 nearest slots**, greedy.

These numbers help set `STEP_BUDGET` so that the player can't do everything.

---

## 9. Tuning values

| Constant | Value | Notes |
|---|---|---|
| `PREP_MODE` | `'steps'` | `'timed'` restores original Prep |
| `STEP_PX` | 25 px per step | TUNING |
| `STEP_BUDGET` | 90 steps | TUNING (~2,250 px of travel) |
| `TRAVEL_TWEEN_TIME` | 0.35 s | TUNING |
| `SHUFFLE_FEATURE_TYPES` | `true` | TUNING |
| `STEP_BAR_BLINK_HZ` | 3 | TUNING |

**Budget intent:** the player should be able to make roughly 8–10 visits, out of the 13 or so they would need to search everything and build five turrets. If the greedy "all features + 5 slots" calibration figure is far below or above about 1.4 × `STEP_BUDGET`, adjust the budget.

All other values (yields, turret costs, Combat values) are unchanged from the main spec.

---

## 10. Acceptance criteria (step mode)

- [ ] `PREP_MODE` switch works; `'timed'` behaves exactly as before; `M` toggles and restarts.
- [ ] Prep has no countdown; the step bar starts full.
- [ ] Hovering a marker shows tooltip with travel cost, dashed route line with cost label, and preview segment on the bar.
- [ ] Hovering an unaffordable marker makes the bar blink red and the line red.
- [ ] Cost is measured from the Druid's **current** position, not home.
- [ ] Clicking a feature: steps deducted, Druid travels, search resolves instantly, feature exhausted.
- [ ] Clicking a slot with enough resources: steps deducted, Druid travels, turret built instantly, resources deducted.
- [ ] Slots can't be clicked without turret resources; tooltip says why.
- [ ] Route trail shows all visits so far.
- [ ] Running out of steps does not end Prep; Start Battle pulses when nothing valid remains.
- [ ] Start Battle begins Combat; Druid snaps home; trail cleared.
- [ ] Feature types shuffle on restart when enabled; same seed gives same layout.
- [ ] Debug undo and calibration figures work.
- [ ] Combat, upgrades, Vultures, Victory/Defeat and Restart are unchanged.

---

## 11. Evaluation questions (context only)

- Does route planning create more interesting Prep decisions than the timer did?
- Do players feel the trade-off between distant valuable features and nearby turret slots?
- Does the Druid's moving start point make visit order meaningful?
- Does random yield, seen after each visit, cause players to change their plan?
- With shuffled feature types, does each run feel like a fresh puzzle?
- Which mode makes players more eager to replay?
