# Broceliande — M2o Addendum: Cinderjaw (Flame Turret)

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2N`). Everything there still applies unless this document overrides it.
**Goal:** a third turret, **Cinderjaw**: a Komodo-dragon head that breathes a short cone of fire, setting every enemy in it (including flyers) **burning** for a while.

> Same conventions: **MUST** / **SHOULD**, **TUNING** marks starting guesses. Balancing data lives in `data/*.csv` (edited in the Google Sheet, M2j). CSV text uses plain ASCII only (see `CLAUDE.md`). Ask rather than guess where this is silent.
>
> **Verification:** the designer tests by playing. Check the acceptance criteria by reading the code, not with automated or headless-browser tests (see `CLAUDE.md`).

---

## 0. Data changes and the sheet

As in M2k §0: Claude Code edits the CSVs, lists **exactly which tabs changed**, and **MUST NOT run the pull script** until the designer confirms the sheet is updated. This addendum changes `turrets` (new rows and columns) and `sounds` (new rows).

---

## 1. Role

| Turret | Range | Targets | Damage | Flyers |
|---|---|---|---|---|
| Sprinkler | Long | One (two at level 5) | Instant pebbles | Yes |
| Toader | Long | Ground zone | Poison cloud that stays put | No |
| **Cinderjaw** | **Short** | **Everyone in a cone** | **A hit, then a burn the enemy carries** | **Yes** |

- Cinderjaw's burn **travels with the enemy**, so it suits fast enemies that would rush through a Toader cloud.
- It's a second answer to Stirge flocks, alongside the Slow Wisp and Vultures.
- Burn ticks deal 1 damage, and armor never reduces a hit below 1 (M2l §1.3), so **burning ignores Grim Bear armor**. That's intended.

---

## 2. Behaviour

### 2.1 Attack

- Every `fireInterval`, if any enemy (ground or flying) is in range, Cinderjaw turns to the usual priority target (least remaining lane distance) and breathes fire.
- **Cone:** from the turret's centre, length `range`, total angle `coneAngle`, pointed at that target.
- Every enemy whose centre is inside the cone at that moment is **hit** for `damage` and set **burning** (§2.2).
- The cone itself lasts only a moment (visual, about 0.4 s); damage happens once, when it fires.
- It doesn't fire while being upgraded, as with other turrets.

### 2.2 Burning status

Uses the shared status system from the Slow Wisp (M2k §3.4):

```
statuses.burning = { until, nextTick, tickDamage, tickInterval, sourceTurretId }
```

- A burning enemy takes `burnTickDamage` every `burnTick` seconds until `burnDuration` runs out. The first tick comes one `burnTick` after it catches fire.
- **Burned again while burning:** the duration **resets** (no stacking). If the new burn is stronger (from a higher-level Cinderjaw), the burning takes the stronger tick damage and tick rate.
- Burn damage counts as normal damage: it reveals HP bars, triggers kills and drops, is reduced by armor (minimum 1 per hit, M2l), and is increased by Corrosion (M2m §2.4).
- Burning, slowed and corroded can all be on an enemy at once.

### 2.3 Level 5: Wildfire

- When a **burning enemy dies**, every enemy within `spreadRadius` of it catches fire with that burn (full duration, same strength).
- Spreading can chain: an enemy that caught fire this way and then dies spreads too.
- Small visual and sound on each spread (§4).

### 2.4 Placement note

Cinderjaw has a short range, so some slots may not reach any lane. In the build menu, if no point on any lane centreline is within Cinderjaw's level 1 range of that slot, show its option with a small warning, `Reaches no lane`, but still allow building it.

---

## 3. Stats

### 3.1 Levels

New `turrets` rows for `cinderjaw` levels 1–5. New columns: `coneAngle`, `burnDuration`, `burnTick`, `burnTickDamage`, `spreadRadius` (blank where not used). Existing columns cover `damage` (the hit), `fireInterval`, `range`, costs, `time` and `levelName`.

| Level | Name | Hit | Fire every | Range | Cone | Burn tick | Burn DPS per enemy | Cost | Time |
|---|---|---|---|---|---|---|---|---|---|
| 1 | | 2 | 4.0 s | 160 | 50° | 1 per 1.2 s | 0.83 | **2 Pits + 1 Bough + 1 Feather** (build) | 2.5 s |
| 2 | | 3 | 3.7 s | 170 | 55° | 1 per 1.0 s | 1.00 | 4 Pits + 1 Feather | 3 s |
| 3 | | 4 | 3.4 s | 180 | 60° | 1 per 0.85 s | 1.18 | 6 Pits + 2 Feathers | 4 s |
| 4 | **Searing Maw** | 5 | 3.1 s | 190 | 65° | 1 per 0.75 s | 1.33 | 8 Pits + 2 Feathers + 1 Bough | 5 s |
| 5 | **Inferno Jaw** | 6 | 2.8 s | 200 | 70° | 1 per 0.65 s | 1.54 | 10 Pits + 2 Feathers + 1 Bough | 6 s |

- `burnDuration` is 8.5 s at every level.
- `burnTickDamage` stays 1 at every level (so the burn always ignores armor); levels make it tick faster.
- `spreadRadius`: 60 px on level 5 only (Wildfire).
- No Reeds anywhere in its costs.

All TUNING.

### 3.2 Rough output (for reference)

| Level | Against a pack of 6 (hits + burns) | For comparison |
|---|---|---|
| 1 | about 8 DPS in total | Sprinkler L1: 4 DPS on one enemy |
| 3 | about 14 DPS in total | Sprinkler L3: 14 DPS on one enemy |
| 5 | about 22 DPS in total, plus Wildfire | Sprinkler L5: 27.5 DPS on each of two enemies |

It's weaker than the Sprinkler against single tough targets, stronger against packs and flocks, and best of all against armored ones.

### 3.3 Bough cost

Building it costs a Bough even in Prep, and levels 4 and 5 cost one each, on top of the Bough Double's Bough for every Combat upgrade. A level 5 Cinderjaw takes about 7 Boughs in total, which makes it a premium, planned investment.

---

## 4. Look and sound

### 4.1 Turret

- **Level 1:** a squat stone-and-wood base with a carved Komodo dragon head on top. Its forked tongue flicks now and then while idle. The jaw opens when it breathes fire.
- **Level 2:** eyes glow ember-orange.
- **Level 3:** heavier scale plates on the head.
- **Level 4:** smoke curls from its nostrils between bursts.
- **Level 5:** glowing molten cracks across the head and a faint heat shimmer.
- The head turns to face its target. Everything fits within `LOCATION_RADIUS`.
- Range preview on hover shows the **cone's reach as a circle** (it can face any direction), plus a faint cone outline toward the current target while firing (debug overlay shows the cone always).

### 4.2 Fire and burning

- **Fire cone:** a short burst of orange-yellow flame particles filling the cone, about 0.4 s, edges matching the real cone.
- **Burning enemies:** small flickering orange flames on the body and a few rising sparks, with a subtle warm tint. It MUST be distinguishable from the slow (silver-blue) and Corrosion (yellow-green), and they can show together.
- **Wildfire spread:** a small burst of embers jumping from the dying enemy to each newly lit one.

### 4.3 Sound

New `sounds` rows (event bus and spam limits, M1g §3):

| Event | Sound |
|---|---|
| `cinderjawFires` | Short roaring whoosh |
| `burnTick` | Very quiet crackle (high `minGap`, low `maxVoices`) |
| `wildfireSpread` | Soft whump of catching fire |

---

## 5. Debug

- Overlay: each Cinderjaw's cone at its current aim; burning enemies' remaining burn time.
- Panel: Cinderjaw hit damage, burn damage and Wildfire spreads this battle.

---

## 6. Acceptance criteria

- [ ] Cinderjaw appears in the build menu (Prep and Bough Double), with image, cost rows and the `Reaches no lane` warning where relevant.
- [ ] It breathes a cone at the priority target every `fireInterval`, hitting every enemy in the cone, ground and flying.
- [ ] Hit enemies burn: 1 damage per tick for 8.5 s; re-burning resets the duration and keeps the stronger burn; no stacking.
- [ ] Burn works with armor (minimum 1), Corrosion, kills and drops; can coexist with slow and Corrosion.
- [ ] Five levels with the stats, costs, times and names in §3.1; no Reeds.
- [ ] Level 5 Wildfire spreads burns from dying burning enemies within 60 px, and can chain.
- [ ] Turret, fire, burning and Wildfire looks and sounds as in §4; burning is distinct from slow and Corrosion.
- [ ] Debug overlay and panel work.
- [ ] The report lists every changed tab; the pull script wasn't run.
- [ ] Everything else still works.
