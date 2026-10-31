# Broceliande — M2m Addendum: Speed Reset per Battle, Turret Levels 4–5

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2L`). Everything there still applies unless this document overrides it.

> Same conventions: **MUST** / **SHOULD**, **TUNING** marks starting guesses. Balancing data lives in `data/*.csv` (edited in the Google Sheet, M2j). Ask rather than guess where this is silent.
>
> **Verification:** the designer tests by playing. Check the acceptance criteria by reading the code, not with automated or headless-browser tests (see `CLAUDE.md`).

---

## 0. Data changes and the sheet

As in M2k §0: Claude Code edits the CSVs, lists **exactly which tabs changed**, and **MUST NOT run the pull script** until the designer confirms the sheet is updated. This addendum changes the `turrets` tab (new rows and columns), and possibly `sounds`.

---

## 1. Game speed starts at ×1 in every battle

Overrides M2k §1.2:

- **Every battle's Combat starts at ×1**, including the first-wave countdown, and the HUD buttons show ×1.
- Within a battle, the chosen speed stays as set through waves and gaps until the battle ends.
- Restarting an encounter (debug `Shift+R`) also starts at ×1.
- The speed is **no longer remembered** between battles or sessions: remove the `localStorage` saving and loading of game speed. (Mute stays remembered.)
- Everything outside Combat still runs at ×1, as before.

Update the README if it mentions the speed being remembered.

---

## 2. Turret levels 4 and 5

### 2.1 General

- Both turrets go up to **level 5**. Upgrades stay strictly one level at a time, and all existing upgrade rules apply (Combat only, through a Bough Double job, turret silent while upgrading, cost when the job starts, refund on cancel).
- The upgrade menu and range previews work for the new levels; `Max level` now appears at level 5.
- **Level names:** new `levelName` column in `turrets`. The upgrade menu shows it, e.g. `Upgrade to Level 4 — Hailstone`. Levels 1–3 can stay unnamed (blank).
- **Level 5 adds a special effect** (§2.3, §2.4), so maxing a turret is a goal worth planning for.

### 2.2 Current values

The tables below assume the designer's current levels 1–3 in `turrets.csv`. Known current Toader values: impact damage 3 / 4 / 5 and cloud radius 70 / 80 / 90. Other level 1–3 values are taken from the specs. If any current level 1–3 values differ from the tables, **keep levels 4–5 as written** and list the differences in the report, so the designer can adjust.

### 2.3 Pebble Sprinkler

| Level | Name | Damage | Fire every | DPS | Range | Upgrade cost | Time |
|---|---|---|---|---|---|---|---|
| 1 | | 3 | 0.75 s | 4.0 | ×1.0 | (build) | |
| 2 | | 5 | 0.6 s | 8.3 | ×1.2 | 4 Pits + 1 Feather | 3 s |
| 3 | | 7 | 0.5 s | 14.0 | ×1.35 | 6 Pits + 2 Feathers | 4 s |
| **4** | **Hailstone** | **9** | **0.45 s** | **20.0** | **×1.45** | **8 Pits + 3 Feathers** | **5 s** |
| **5** | **Stormspinner** | **11** | **0.4 s** | **27.5 per target** | **×1.55** | **10 Pits + 3 Feathers + 1 Bough** | **6 s** |

**Level 5 special, Twin shot:** each volley fires **two pebbles at the two highest-priority targets** in range (by the usual least-remaining-lane-distance rule). If only one enemy is in range, it fires a single pebble at it. New column `targets` (2 on level 5; blank = 1).

Why: the high per-hit damage stays strong against the Grim Bear's armor (11 → 10), and Twin shot lets one maxed Sprinkler handle the large late-game swarms.

### 2.4 Poison Toader

| Level | Name | Impact | Fire every | Range | Cloud radius | Cloud lasts | Tick every | Tick dmg | Upgrade cost | Time |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | 3 | 3.5 s | 260 | 70 | 4.2 s | 0.8 s | 1 | (build) | |
| 2 | | 4 | 3.0 s | 285 | 80 | 5.0 s | 0.65 s | 1 | 3 Pits + 1 Reed | 3 s |
| 3 | | 5 | 2.6 s | 310 | 90 | 5.6 s | 0.5 s | 1 | 5 Pits + 1 Reed + 1 Feather | 4 s |
| **4** | **Bog Belcher** | **6** | **2.3 s** | **330** | **100** | **6.0 s** | **0.45 s** | **1** | **6 Pits + 2 Reeds + 1 Feather** | **5 s** |
| **5** | **Rotmaw** | **7** | **2.0 s** | **350** | **110** | **6.5 s** | **0.4 s** | **1** | **8 Pits + 2 Reeds + 2 Feathers + 1 Bough** | **6 s** |

**Level 5 special, Corrosion:** enemies inside a level 5 cloud are **Corroded**: they take **+25% damage from every source** while inside and for 2 s after leaving. It uses the shared status system from the Slow Wisp (M2k §3.4).

- New columns `corrodeMult` (1.25 on level 5) and `corrodeLinger` (2 on level 5); blank = no corrosion.
- Being corroded again refreshes the linger time; it doesn't stack.
- The +25% applies **before** armor: a Grim Bear hit by a level 3 Sprinkler (7) while Corroded takes 7 × 1.25 = 8.75 − 1 = 7.75.
- Clouds still don't affect flyers (unless `CLOUDS_HIT_FLYERS` is on), so Stirges aren't Corroded.

Why: the Toader's role is to soften whole packs. Corrosion makes every other turret, summon and strike hit harder in its cloud, so a maxed Toader multiplies the rest of the defence instead of competing with it.

All level 4–5 values are TUNING.

### 2.5 Looks

- **Sprinkler level 4:** a third ring around the base in silver, and a faster-spinning head.
- **Sprinkler level 5:** a gold ring, the head spinning fastest with a faint shimmer trail, and twin pebbles visibly leaving at once.
- **Toader level 4:** larger, with an extra pipe and bubbling at the mouth.
- **Toader level 5:** glowing green eyes and slow drips from the mouth. Its clouds have a sickly yellow-green tint, so Corroded zones read differently.
- **Corroded enemies:** a faint yellow-green tint, and small drips falling from them while the status lasts. It must be distinguishable from the Slow Wisp's silver-blue tint, and both can show at once.
- Every look still fits within `LOCATION_RADIUS`.

### 2.6 Sound

- Upgrades to level 4 and 5 use the existing upgrade-complete sound; level 5 adds a short extra flourish.
- Twin shot: the Sprinkler tick plays once per volley, not twice.

---

## 3. Debug

- `G` grants enough resources (including Boughs) to test level 5 quickly (it already grants +10 of each; check that's enough, otherwise mention it).
- Panel: damage dealt by Sprinkler level 5 second shots; extra damage caused by Corrosion this battle.

---

## 4. Acceptance criteria

### Game speed
- [ ] Every battle's Combat starts at ×1 (HUD shows ×1); the chosen speed holds within a battle; nothing is saved to `localStorage` for speed.

### Turret levels
- [ ] Sprinkler and Toader upgrade to level 5 with the stats, costs, times and names in §2.3–2.4.
- [ ] Twin shot fires at two targets when two are in range, one otherwise.
- [ ] Corrosion applies +25% damage taken (before armor) inside level 5 clouds and for 2 s after; refreshes, doesn't stack; doesn't affect flyers by default.
- [ ] New levels' looks and the Corroded look are distinct; menus show level names and `Max level` at 5.
- [ ] Differences between current level 1–3 data and §2.3–2.4 are reported.
- [ ] The report lists every changed tab; the pull script wasn't run.

### General
- [ ] Debug panel additions work.
- [ ] Everything else still works.
