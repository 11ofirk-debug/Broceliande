# Broceliande — M2j Addendum: Game Data in CSV / Google Sheet

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2I`). Everything there still applies unless this document overrides it. Overrides the rule that "every gameplay number lives in `js/config.js`": from now on, **balancing data lives in CSV files** (edited in a Google Sheet), and `config.js` keeps only code-side settings.

> Same conventions: **MUST** / **SHOULD**, **TUNING** marks starting guesses. Ask rather than guess where this is silent.
>
> **Verification:** the designer tests by playing. Check the acceptance criteria by reading the code, not with automated or headless-browser tests (see `CLAUDE.md`).

---

## 1. Overview

```
Google Sheet (one tab per data type)
      │  tools/pull_sheet.py  (downloads every tab)
      ▼
data/*.csv  (committed to Git)  ──►  game loads at start-up
      ▲
      └── ?live in the URL: the game reads the published sheet directly instead
```

- **Source of truth:** the Google Sheet. `data/*.csv` is a downloaded copy, committed so every version is kept and the game works offline.
- **First step:** export the game's **current** values (from `config.js`, including all the designer's tweaks) into the CSVs, so the sheet starts from what's actually in the game.
- **No duplicates:** once a value is in the CSVs, remove it from `config.js`. A value must live in exactly one place.

---

## 2. What goes where

### 2.1 In the CSVs / sheet

Everything listed in §3: global balance settings, Druid stats, resources, resource spots, enemies, drops, turrets, summons, items, levels, waves and spawns, candidate spots, palettes, sound tuning.

### 2.2 Stays in code (`config.js` or modules)

- Lane waypoints and lane IDs, Druid positions, sector boundary angles and near radius per level (they're tied to the lane geometry).
- Decoration (seeds, density, signature shapes).
- All draw functions and sound synthesis (how a sound is made).
- UI layout sizes, fonts, debug settings, `DEBUG_SEED`.

---

## 3. Tabs

### 3.1 Conventions (every tab)

- **Row 1 = headers**, spelled exactly as listed below.
- **One row per thing.**
- **Ignored by the game:** the `notes` column, any column whose header starts with `_` (helper or formula columns), blank rows, and rows whose first cell starts with `#` (commented out).
- **Empty cell** = use the default (the code's built-in default, or "not applicable").
- **Values:** numbers as plain numbers (decimal point `.`), booleans as `TRUE`/`FALSE`, IDs in lower camelCase (e.g. `bough`, `hawkfeatherCrown`).
- Unknown columns produce a **warning**, not an error.

### 3.2 Tab list

| Tab | One row per | Columns |
|---|---|---|
| `globals` | Setting | `key`, `value`, `notes` — e.g. `STEP_PX`, `END_DELAY`, `FIRST_WAVE_DELAY`, `BURST_STAGGER`, `STIRGE_FLOCK_STAGGER`, `CARRY_DRUID_HP`, `CLOUDS_HIT_FLYERS`, `ITEMS_PER_BATTLE`, zone quotas (`ZONE_NEAR_TURRET`, `ZONE_NEAR_FEATURE`, `ZONE_FAR_TURRET`, `ZONE_FAR_FEATURE`), drop pop, floater, sweep and map generation values… |
| `druid` | Stat | `key`, `value`, `notes` — `hp`, `meleeDamage`, `meleeInterval`, `meleeSlots`, `meleeRadius`, `radius`, `stepBudgetDefault`… |
| `resources` | Resource | `id`, `name`, `order` |
| `features` | Resource spot type | `id`, `name`, `mainResource`, `pits_min`, `pits_max`, `reeds_min`, `reeds_max`, `feathers_min`, `feathers_max`, `boughs_min`, `boughs_max` |
| `enemies` | Enemy type | `id`, `name`, `hp`, `speed`, `radius`, `collisionRadius`, `damage`, `attackInterval`, `windup`, `meleeSlots`, `flying`, `flyHeight` |
| `drops` | Drop chance | `enemy`, `resource`, `chance`, `min`, `max` (several rows per enemy) |
| `turrets` | Turret level | `turret`, `name`, `level`, `damage`, `fireInterval`, `range`, `cost_pits`, `cost_reeds`, `cost_feathers`, `cost_boughs`, `time`, `projectileSpeed`, `cloudRadius`, `cloudDuration`, `cloudTick`, `cloudTickDamage` |
| `summons` | Summon | `id`, `name`, `key`, `cost_pits`, `cost_reeds`, `cost_feathers`, `cost_boughs`, `hp`, `damage`, `attackInterval`, `duration`, `speed`, `max`, `radius`, `meleeRange`, `blockRadius`, `pickupRange`, `blocks` |
| `items` | Item | `id`, `slot`, `name`, `description`, `effect1_stat`, `effect1_op`, `effect1_value`, `effect2_stat`, `effect2_op`, `effect2_value` |
| `stats` | Stat items can change | `stat`, `description` (also feeds the sheet's dropdown in `items`) |
| `levels` | Level | `id`, `name`, `description`, `row`, `nodeType`, `enemyHpMult`, `corridorWidth`, `stepBudget`, `stuckTime`, `mix_tree`, `mix_reed`, `mix_shrub`, `mix_ruins`, `mix_pond` |
| `waves` | Wave | `level`, `wave`, `gapAfter` (+ helper columns, see §3.3) |
| `spawns` | Spawn entry | `level`, `wave`, `t`, `lane`, `type`, `count` |
| `candidates` | Candidate spot | `level`, `index`, `x`, `y`, `zone` |
| `palettes` | Level | `level`, `floor`, `floorAccent`, `corridor`, `corridorEdge`, `treeDark`, `treeLight`, `rock`, `vegetation`, `water` (hex, e.g. `#3a4a2c`; blank = not used) |
| `sounds` | Sound | `id`, `volume`, `minGap`, `maxVoices`, `enabled` |
| `lanes` | Lane (reference only) | `level`, `laneId`, `entry` — **exported from code, not loaded by the game**; it exists so the sheet can offer lane IDs as a dropdown in `spawns` |

Column names above are the target. If the code needs a field not listed (e.g. a summon-specific value), add a column with a clear name and list it in the phase report.

### 3.3 Helper columns in `waves`

The export adds helper columns `_wolves`, `_stirges`, `_bears`, `_ogres` with static totals. In the sheet, the designer will replace them with formulas (e.g. `=SUMIFS(spawns!F:F, spawns!A:A, A2, spawns!B:B, B2, spawns!E:E, "wolf")`), so the wave summary always matches the spawn rows. The game ignores them (leading `_`).

---

## 4. Loading

### 4.1 Start-up

- Before the game starts, load every tab's CSV from `data/<tab>.csv` (e.g. `data/enemies.csv`).
- Show a simple "Loading…" screen until done.
- Parse with a small built-in CSV parser (no libraries) that handles quoted fields with commas, quotes and line breaks (descriptions may contain commas).
- Convert types per column: numbers, booleans, IDs and text. Build the same in-memory structures the game uses now (`ENEMY_TYPES`, `TURRET_TYPES`, `LEVELS`, `ITEMS`, waves…), so gameplay code changes as little as possible.

### 4.2 Validation and errors

After loading, check references and required values, for example:

- `spawns.type` is an enemy ID; `spawns.level` and `waves.level` are level IDs; every `spawns` (level, wave) has a `waves` row.
- `spawns.lane` is a lane ID of that level (from code) or `random`.
- `drops.enemy`, `drops.resource`, `items.slot`, `items.effectN_stat` (against `stats`) and `effectN_op` (`add` / `mult`) are valid.
- `levels` mix totals match the feature quota; each level has its candidates, palette and at least one wave.
- All the existing start-up validation (candidates, corridors, zones, Ogre corridor width…) runs on the loaded data.

**Errors MUST be visible in the game**, not just the console: a panel listing each problem as `tab · row · column: message` (e.g. `spawns · row 42 · type: unknown enemy "stirg"`).

- **Errors** (game can't run correctly): show the panel and don't start.
- **Warnings** (unknown column, odd value): show a small dismissable warning list and start anyway.

### 4.3 Live mode

- Opening the game with `?live` in the URL loads every tab directly from the **published** Google Sheet instead of `data/`.
- Source settings live in `data/sheet_sources.json`:
  ```json
  {
    "publishedId": "2PACX-...",
    "tabs": { "globals": 0, "druid": 123456, "enemies": 234567, "...": 0 }
  }
  ```
  Each tab's live URL: `https://docs.google.com/spreadsheets/d/e/<publishedId>/pub?gid=<gid>&single=true&output=csv`.
- A small **LIVE DATA** badge shows in a corner of the screen in live mode.
- If a live tab fails to load, show it in the error panel, naming the tab and suggesting checking that the sheet is published.
- Note for the designer: Google can take a few minutes to refresh published data after an edit.

---

## 5. Pull script

`tools/pull_sheet.py` (Python 3, standard library only):

- Reads `data/sheet_sources.json`, downloads every tab's published CSV, and writes it to `data/<tab>.csv`.
- Prints one line per tab (`enemies.csv  ✓  14 rows`) and a clear error if a tab fails.
- Doesn't touch any other files.
- Also add `tools/pull_sheet.bat` so the designer can run it by double-clicking on Windows.

After pulling, the designer (or Claude Code) commits the updated CSVs.

---

## 6. Initial export

One-off, done by Claude Code in Phase J1:

- Write every tab's CSV into `data/` from the **current** values in the code.
- Include the `lanes` reference tab and the `waves` helper columns.
- Leave `data/sheet_sources.json` with placeholder values for the designer to fill in.

---

## 7. Acceptance criteria

- [ ] `data/` contains one CSV per tab in §3.2, exported from the current game values.
- [ ] The game loads all data from the CSVs at start-up, with a loading screen; the values removed from `config.js` exist only in the CSVs.
- [ ] Code-only settings (§2.2) remain in code.
- [ ] Conventions work: `notes` and `_` columns ignored, `#` rows skipped, blanks use defaults.
- [ ] Validation catches broken references and shows errors and warnings in-game with tab, row and column.
- [ ] With unchanged data, the game plays as before.
- [ ] `?live` loads from the published sheet using `sheet_sources.json`, with a LIVE DATA badge and clear errors.
- [ ] `tools/pull_sheet.py` and `.bat` download every tab into `data/`.
