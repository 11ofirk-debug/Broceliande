# Broceliande — M2l Addendum: Grim Enemies

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2K`). Everything there still applies unless this document overrides it.
**Goal:** add a stronger **Grim** version of each enemy (Wolf, Bear, Ogre, Stirge), each with one trait, and mix them into the later waves.

> Same conventions: **MUST** / **SHOULD**, **TUNING** marks starting guesses. Balancing data lives in `data/*.csv` (edited in the Google Sheet, M2j). Ask rather than guess where this is silent.
>
> **Verification:** the designer tests by playing. Check the acceptance criteria by reading the code, not with automated or headless-browser tests (see `CLAUDE.md`).

---

## 0. Data changes and the sheet

As in M2k §0: Claude Code edits the CSVs, lists **exactly which tabs changed**, and **MUST NOT run the pull script** until the designer confirms the sheet is updated.

Tabs this addendum changes: `enemies` (new columns and rows), `drops` (new rows), `sounds` (if new rows are needed), and in Phase L2 `spawns` (changed and new rows).

---

## 1. Grim variants

### 1.1 Data

Each Grim is a new row in `enemies`, linked to its normal version by a new `baseType` column:

| `id` | `name` | `baseType` | `variant` |
|---|---|---|---|
| `grimWolf` | Grim Wolf | `wolf` | `grim` |
| `grimBear` | Grim Bear | `bear` | `grim` |
| `grimOgre` | Grim Ogre | `ogre` | `grim` |
| `grimStirge` | Grim Stirge | `stirge` | `grim` |

- **Inheritance:** any blank cell in a variant row takes its value from the `baseType` row. So a Grim only needs the columns that differ. Everything else (speed, radius, collision radius, melee slots, flying, fly height, wind-up) is inherited.
- **Behaviour is the base type's:** a Grim Bear takes 2 melee slots and spreads like a Bear; a Grim Stirge flies; a Grim Ogre counts as a boss (boss bar labelled `GRIM OGRE`, banner `A Grim Ogre approaches!`, corridor-width check, plugging and passing rules).
- Level HP scaling (`enemyHpMult`) applies on top, as for every enemy.

### 1.2 Stats

Speed and size are the same as the base versions. Only HP, damage and attack interval change:

| Grim | `hp` | `damage` | `attackInterval` | DPS (base → Grim) | HP × | DPS × |
|---|---|---|---|---|---|---|
| Grim Wolf | 25 | 4 | (1.2) | 2.50 → 3.33 | 1.39 | 1.33 |
| Grim Bear | 125 | 10 | (2.0) | 4.00 → 5.00 | 1.39 | 1.25 |
| Grim Ogre | 630 | 32 | (3.5) | 7.14 → 9.14 | 1.40 | 1.28 |
| Grim Stirge | 8 | (0.5) | 0.45 | 0.83 → 1.11 | 1.33 | 1.33 |

Values in brackets are inherited (left blank). All TUNING. If the designer's current base values in `enemies.csv` differ from the ones above, keep the Grim values as written and mention the difference in the report.

### 1.3 Traits

New `enemies` columns (blank = no trait):

| Column | Meaning | Used by | Value |
|---|---|---|---|
| `slowResist` | Fraction of a slow ignored. Effective slow = `1 − (1 − slowMult) × (1 − slowResist)` | Grim Wolf (**Dogged**) | 0.5 (slowed to 0.7 instead of 0.4) |
| `armor` | Damage subtracted from every hit it takes, minimum 1 damage per hit | Grim Bear (**Thick hide**) | 1 |
| `splashRatio` | Its blow also damages **summons** within `splashRadius` of its target, at this fraction of its damage | Grim Ogre (**Crushing blow**) | 0.5 |
| `splashRadius` | Radius for the above, in px | Grim Ogre | 50 |
| `lifesteal` | HP healed per bite (up to its max HP) | Grim Stirge (**Bloodsucker**) | 0.25 |

Details:

- **Armor** applies to every damage source: pebbles, pellet impacts, cloud ticks, Vulture pecks, the Druid's strike and the Squirrel's counter-attack. A hit of 1 stays 1.
- **Splash** never hits the Druid (he's only damaged when he's the target) and doesn't hit the primary target twice. It only affects Vultures and Squirrels.
- **Lifesteal** works on any bite target (the Druid, Vultures, Squirrels).
- Traits are general columns, so any enemy row could use them later.

### 1.4 Drops

Add `drops` rows for each Grim: copy the **current** rows of its base enemy from `drops.csv` (including the designer's Bough changes), with the same amounts and **chance × 1.5, capped at 1.0**.

---

## 2. Look and sound

### 2.1 Look

Grims reuse their base type's draw function with a `grim` variant option:

- Darker colours: charcoal fur or skin.
- Eyes glow ember-red with a soft halo, brighter than the normal red eyes.
- A few faint smoke wisps rising off the body (subtle, cheap particles).
- Drawn about 6% larger (`drawScale` 1.06 in `enemies`), except the Grim Ogre (1.0). **Drawing only**: collision and radius don't change.
- HP bars as usual. The Grim Ogre's boss bar has a darker frame.

Shared icons (wave preview, map tooltip) use the Grim look, so the preview reads e.g. `[grim wolf] ×6`.

### 2.2 Trait feedback

- **Thick hide:** when armor reduces a hit, a tiny grey spark at the hit point.
- **Crushing blow:** the dust ring at impact is wider (matching `splashRadius`), and splashed summons flash.
- **Bloodsucker:** a tiny red sparkle on the Stirge when it heals.
- **Dogged:** the slowed spiral above a Grim Wolf spins faster and is fainter, showing it's only partly slowed.

### 2.3 Sound

Grims reuse their base type's sounds, played about 15% lower in pitch, with no new sound synthesis. If a per-sound pitch setting is needed for this, add it as a column in `sounds`.

---

## 3. Grims in the waves (Phase L2)

### 3.1 Rule

Grims **replace** some of the normal enemies of the same type in a wave, rather than being added on top. Wave sizes stay the same, but the waves get tougher. Spread the converted enemies across lanes, favouring the later spawns in each wave.

Update each wave's summary comment and the `waves` helper columns (add `_grims` totals; see §5).

### 3.2 Conversions

GW = Grim Wolves, GS = Grim Stirges, GB = Grim Bears. Numbers are how many of that wave's normal enemies become Grims.

| Rows | Wave | Conversions |
|---|---|---|
| **Row 4** (Charcoal Burner's Camp, Stag's Crossing) | Last wave (4) | 4 GW |
| **Row 5** (Briar Chapel, Sunken Causeway, Widow's Orchard) | 3 | 3 GW |
| | 4 | 6 GW, 4 GS |
| **Row 6** (Mossbound Cairn, The Ashen Glade) | 3 | 4 GW, 2 GS |
| | 4 | 6 GW, 4 GS, 1 GB |
| | 5 | 8 GW, 6 GS, 1 GB |
| **Row 7** (Bone Orchard, The Weeping Stones, Hollow of Bells) | 2 | 4 GW, 2 GS |
| | 3 | 6 GW, 4 GS, 1 GB |
| | 4 | 8 GW, 6 GS, 1 GB |
| | 5 | 10 GW, 8 GS, 2 GB |
| **Row 8** (The Heartwood) | 2 | 4 GW, 2 GS |
| | 3 | 6 GW, 4 GS, 1 GB |
| | 4 | 8 GW, 6 GS, 1 GB |
| | 5 | 10 GW, 8 GS, 2 GB |
| | 6 | 12 GW, 10 GS, 2 GB, and the second Ogre becomes a **Grim Ogre** |

Exceptions:

- **The Weeping Stones** (Bear-heavy): convert one extra Bear to a Grim Bear in each of waves 3–5.
- **The Ashen Glade's Ogre** stays a normal Ogre. The only Grim Ogre is The Heartwood's finale.
- Rows 1–3 get no Grims.

All TUNING.

---

## 4. Debug

| Key | Action |
|---|---|
| `Shift+S` / `Shift+B` / `Shift+O` | Spawn the **Grim** version (flock of 4 Grim Stirges / a Grim Bear / a Grim Ogre), alongside the existing `S` / `B` / `O` |
| `Shift+G` | Spawn 4 Grim Wolves at a random lane (Combat only) |

Panel: Grims spawned / alive / killed per type; armor-blocked damage, splash damage and lifesteal healing this battle.

---

## 5. Sheet notes for the designer

- After re-importing `spawns`, re-add its dropdowns (e.g. `type` from `enemies!A:A`); importing replaces them.
- In `waves`, add a `_grims` helper column, e.g. `=SUMIFS(spawns!F:F, spawns!A:A, A2, spawns!B:B, B2, spawns!E:E, "grim*")` (the `*` matches every Grim type). The existing `_wolves` and similar columns only count exact type names, so Grims aren't double-counted.

---

## 6. Acceptance criteria

### Grims
- [ ] Four Grim rows in `enemies` with `baseType` and `variant`; blank cells inherit from the base row.
- [ ] Stats match §1.2; speed and size match the base versions.
- [ ] Grims behave like their base type (melee slots, flying, boss rules, passing).
- [ ] Traits work as in §1.3: slow resist, armor (minimum 1 per hit, all sources), splash on summons only, lifesteal.
- [ ] Grim drop rows exist with chance × 1.5 (capped at 1.0), based on the current base drops.
- [ ] Grim look (darker, glowing eyes, smoke, 6% larger drawing except the Ogre) and trait feedback are visible; preview and tooltip icons use it.
- [ ] Grim sounds are lower-pitched versions of the base sounds.

### Waves
- [ ] Waves in rows 4–8 contain the conversions in §3.2, with the exceptions; wave sizes unchanged.
- [ ] Wave summary comments and helper columns updated.

### General
- [ ] Debug keys and panel additions work.
- [ ] The report lists every changed tab; the pull script wasn't run.
- [ ] Everything else still works.
