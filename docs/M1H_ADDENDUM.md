# Broceliande — M1h Addendum: Footprint Trail, Toader Levels, Squirrel Counter-Attack

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1G`). Everything there still applies unless this document overrides it.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.

---

## 1. Footprint route trail (step mode)

### 1.1 Problem

When the player commits a move, the hover footprints (M1g §2) disappear and the old solid route-trail line (M1b §5.5) is drawn instead. The trail should be footprints too.

### 1.2 Behaviour

Overrides M1b §5.5.

- When a move is committed, the footprints shown for that leg **stay on the ground** as part of the route trail. Don't redraw them; keep the exact same footprints (positions, count, left/right alternation, rotation).
- Each committed leg is stored as a list of footprints. The trail is all committed legs, from `DRUID_POS` onward.
- **Remove the solid route-trail line completely.**
- Visual distinction:
  - **Committed trail:** the normal earthy footprint colour at `TRAIL_FOOTPRINT_ALPHA` (fainter than the hover preview), never red.
  - **Hover preview:** unchanged from M1g §2, drawn on top of the trail.
- If the reveal animation was still running when the player clicked, the committed leg shows **all** its footprints immediately.
- Clicking a slot that opens the build menu (M1f §5.2) does not commit the leg. Footprints are committed only when a turret is chosen and the Druid travels. Closing the menu leaves the trail as it was.
- Debug undo (`U`) removes the last leg's footprints.
- The trail is cleared when Combat begins and on restart (as before).

### 1.3 Tuning

| Constant | Value |
|---|---|
| `TRAIL_FOOTPRINT_ALPHA` | 0.45 (TUNING) |

---

## 2. Poison Toader levels 2 and 3

### 2.1 Levels

Add two levels to `TURRET_TYPES.toader.levels`, in the same shape as the Sprinkler's (level 1 `cost`/`time` = build; levels 2–3 = upgrade).

| Stat | Level 1 (built) | Level 2 | Level 3 |
|---|---|---|---|
| Impact damage | 2 | 3 | 4 |
| Fire interval | 3.5 s | 3.0 s | 2.6 s |
| Range | 260 px | 285 px | 310 px |
| Cloud radius | 30 px | 40 px | 50 px |
| Cloud duration | 4.2 s | 5.0 s | 5.6 s |
| Cloud tick interval | 0.8 s | 0.65 s | 0.5 s |
| Cloud tick damage | 1 | 1 | 1 |
| Ticks per cloud | 5 | 7 | 11 |
| Cost | 2 Reeds | 3 Pits + 1 Reed | 5 Pits + 1 Reed + 1 Feather |
| Time | build (2.5 s timed mode) | 3.0 s | 4.0 s |

Level 1 is unchanged. Levels 2 and 3 are TUNING.

Store `range` as an absolute value or as `rangeMult` on a base range, whichever matches how the Sprinkler is stored, so the two turret types stay consistent.

### 2.2 Reasoning

- The Toader's strength is area damage over time, so upgrades mostly grow the **cloud** (radius, duration, tick rate) rather than impact damage. A level 3 cloud deals up to 11 damage to *every* enemy that stays in it, which is deadly to queued or Vulture-blocked packs.
- The bigger radius also fixes the concern that a 30 px cloud is crossed too quickly by moving wolves.
- Upgrade costs lean on Pits, the most common resource, with a single Reed each, because Reeds are the scarcest resource and the Toader is already built with them.

### 2.3 Rules

- All existing upgrade rules apply (M1e §4.3): Combat only, strictly 1 → 2 → 3, one upgrade at a time, no firing while upgrading, cost on completion, cancel free, next level's cost in the menu, `Max level` at level 3, next level's range as a dashed circle while the upgrade menu is open.
- Clouds already on the field keep the stats they were created with. Only new clouds use the new level's stats.
- The `No upgrades available` message (M1f §5.1) stays in the code for future single-level turrets, but no current turret uses it.

### 2.4 Look

- Level 2: same indicator style as a level 2 Sprinkler (single ring), in the Toader's purple-green.
- Level 3: distinct, like the level 3 Sprinkler (double ring), plus a slightly larger toad or an extra pipe.
- Larger clouds use the same visuals scaled to their radius. The visible edge MUST still match the damage radius.

---

## 3. Squirrel counter-attack

### 3.1 Rule

A Squirrel that is being attacked strikes back at one of its attackers.

| Constant | Value |
|---|---|
| `SQUIRREL_DAMAGE` | 1 |
| `SQUIRREL_ATTACK_INTERVAL` | 2.1 s |

### 3.2 Behaviour

- The Squirrel only strikes **enemies that are currently attacking it**. It never seeks out enemies, and it keeps its normal job of collecting drops.
- **Target:** the attacker with the lowest current HP. Tie-break: lowest entity ID.
- **Timer:** counts up only while at least one enemy is attacking it. The first strike lands 2.1 s after it starts being attacked. If no one is attacking it, the timer resets to zero.
- If the Squirrel moves away to collect a drop and its attackers stop, it stops striking (timer resets).
- Damage reveals HP bars, kills count normally and roll drops (which the Squirrel can then collect).
- Feedback: a quick small swipe toward the target, a brief white flash on the target and a small `-1` floating number.

### 3.3 Dependency on blocking

Wolves and Bears only attack Squirrels when `SQUIRREL_BLOCKS_WOLVES` is `true` (M1d §2.4). With it `false`, nothing attacks Squirrels and this counter-attack never triggers.

**Set `SQUIRREL_BLOCKS_WOLVES` to `true` by default** as part of this change. Say so clearly in the phase report so it can be switched back.

### 3.4 Sound

Add an event `squirrelStrikes` with a short, light scratch sound (thinner and higher than the Vulture peck), using the existing audio event system and spam limits (M1g §3).

---

## 4. Debug additions

Overlay: Squirrel → counter-attack target lines; each cloud's radius (already shown) reflects its level.
Panel: damage dealt by Squirrels this encounter; Toader damage split by level.

---

## 5. Acceptance criteria

### Footprint trail
- [ ] Committing a move keeps that leg's footprints on the ground; no solid line is drawn anywhere.
- [ ] Trail footprints match the preview's positions and count exactly, at `TRAIL_FOOTPRINT_ALPHA`, never red.
- [ ] Clicking mid-reveal commits the full leg.
- [ ] Opening and closing a build menu doesn't add footprints; choosing a turret does.
- [ ] Hover preview draws on top of the trail.
- [ ] Debug undo removes the last leg; trail clears at Combat and on restart.

### Toader levels
- [ ] Toader upgrades 1 → 2 → 3 with the costs, times and stats in §2.1.
- [ ] Existing clouds keep their creation stats; new clouds use the new level.
- [ ] Menu, range preview, dashed next-range circle and `Max level` work as for the Sprinkler.
- [ ] Level 2 and 3 visuals are distinct; cloud visuals scale with radius.

### Squirrel counter-attack
- [ ] `SQUIRREL_BLOCKS_WOLVES` defaults to `true`.
- [ ] An attacked Squirrel strikes its lowest-HP attacker for 1 every 2.1 s.
- [ ] No strikes when nothing is attacking it; timer resets.
- [ ] Squirrel kills roll drops; strike has visible and audible feedback.

### General
- [ ] Debug additions work.
- [ ] Everything else still works in both Prep modes.
