# Broceliande — M2i Addendum: Wave System

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2H`). Everything there still applies unless this document overrides it. Replaces each level's single continuous enemy schedule (wolf bursts, Bear times, boss times, Stirge flocks) with a list of **waves**.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.
>
> **Verification:** the designer tests by playing. Check the acceptance criteria by reading the code, not with automated or headless-browser tests (see `CLAUDE.md`).

---

## 1. Summary

- Each battle is **3–6 waves**: rows 1–3 have 3, rows 4–5 have 4, rows 6–7 have 5, and the boss has 6.
- Waves get harder within a battle.
- A wave lasts about **30–45 s** (spawning plus travel). Ogre waves may run longer.
- When a wave is **fully cleared**, a short **gap** (5–7 s) counts down, showing a **preview** of the next wave. A **Call next wave** button skips the rest of the gap (no reward).
- Clearing the last wave wins the battle.
- No wave-clear rewards and no healing. Resources still come only from Prep and drops.

---

## 2. Data format

Each level's enemy schedule becomes a `waves` list, written by hand and easy to edit:

```js
waves: [
  { // Wave 1 — 10 wolves
    gapAfter: 5,
    spawns: [
      { t: 0,   lane: 'NW',     type: 'wolf',   count: 3 },
      { t: 4,   lane: 'E',      type: 'wolf',   count: 3 },
      { t: 9,   lane: 'SW',     type: 'wolf',   count: 4 },
    ],
  },
  { // Wave 2 — 14 wolves, 1 Bear
    gapAfter: 6,
    spawns: [
      { t: 0,   lane: 'E',      type: 'wolf',   count: 4 },
      { t: 6,   lane: 'random', type: 'bear',   count: 1 },
      // ...
    ],
  },
],
```

- `t` is seconds from the start of **that wave**. A spawn entry with `count > 1` spawns with the type's stagger (`BURST_STAGGER` for wolves, `STIRGE_FLOCK_STAGGER` for Stirges).
- `lane` is a lane ID or `'random'` (seeded). Existing rules for spreading Bears across lanes (M2a §5.4) apply within each wave when several use `'random'`.
- `gapAfter` is the gap length in seconds after this wave is cleared (ignored on the last wave).
- A one-line comment on each wave summarises its contents, so the designer can scan them.
- This replaces the old per-level `wave`, `bears`, `bosses` and Stirge flock fields. Remove them once migrated.
- Start-up validation: every lane ID and enemy type exists. In debug mode, log each level's per-wave totals (e.g. `Tornville W2: 14W 1B`) so they can be compared with the comments by eye.

---

## 3. Wave flow

### 3.1 States

Within `COMBAT`, track a wave sub-state:

```
COUNTDOWN (before wave 1) → WAVE → GAP → WAVE → GAP → … → WAVE (last) → ENDING (Victory)
```

- **COUNTDOWN:** when Combat begins, a `FIRST_WAVE_DELAY` (3 s) countdown with the wave 1 preview.
- **WAVE:** spawns run on the wave's own clock. The wave is **cleared** when all its spawns have happened and no enemies are alive.
- **GAP:** starts the moment a wave is cleared, lasts `gapAfter` seconds, then the next wave begins. In the gap, everything else continues as normal: summons keep their timers, Squirrels collect drops, Bough Double jobs progress, and the player can summon and upgrade.
- **Victory:** clearing the last wave enters `ENDING` → Victory, as before.
- **Defeat** can happen at any time, as before.

### 3.2 Call next wave

- During `COUNTDOWN` and `GAP`, a **Call next wave** button appears with the preview. Clicking it starts the next wave immediately.
- Keyboard shortcut: `Space`.
- No reward. It's a convenience only.
- Not available during a wave.

---

## 4. HUD and preview

### 4.1 During a wave

- Top centre: `WAVE 2 / 4` and the elapsed battle time.
- `Enemies left: N` counts **this wave's** remaining enemies (spawned or not yet spawned).

### 4.2 Preview (COUNTDOWN and GAP)

A compact panel just below the HUD strip, centred:

```
Wave 3 of 5 — in 6
[wolf] ×18   [stirge] ×10   [bear] ×2
[ Call next wave  (Space) ]
```

- Enemy icons use each enemy's shared draw function at small size (rendered once and cached, like the summon menu images).
- Counts come from the wave data.
- If the wave has an Ogre, its entry is highlighted (e.g. red outline) and the line reads `Ogre ×1`.
- The panel MUST NOT cover any candidate location (check per level at start-up, like the name label and boss bar).

### 4.3 Elsewhere

- **Map tooltip:** add the wave count and total enemies, e.g. `3 waves · Wolves 42 · Stirges 4 · Bears 3`.
- **Victory overlay:** `Waves cleared: 4 / 4`.
- **Defeat overlay:** `Fell during wave 3 of 5`.
- **Sound:** `waveStarts` (a short horn or low drum hit) and `waveCleared` (a soft rising chime), via the event bus.

---

## 5. Wave contents per level

W = wolves, S = Stirges, B = Bears, O = Ogres. Within each wave, Claude Code writes the timings and lanes to fit the level's style (§6). All counts are TUNING; the designer will adjust them by hand.

### Rows 1–3 (3 waves)

| Level | Wave 1 | Wave 2 | Wave 3 | Total |
|---|---|---|---|---|
| Tornville Haunt | 10W | 14W 1B | 18W 4S 2B | 42W 4S 3B |
| Gallows Copse | 14W 4S | 18W 6S 1B | 22W 8S 2B | 54W 18S 3B |
| Blackthorn Hollow | 10W 1B | 12W 4S 2B | 14W 6S 3B | 36W 10S 6B |
| Wychwood Circle | 16W 6S | 20W 8S 1B | 26W 12S 2B | 62W 26S 3B |
| Forgotten Barrow (Fell) | 12W 4S 1B | 16W 6S 2B | 14W 6S 1B **1O** | 42W 16S 4B 1O |
| The Drowned Hamlet | 14W 4S | 16W 6S 1B | 20W 10S 3B | 50W 20S 4B |

### Rows 4–5 (4 waves)

| Level | Wave 1 | Wave 2 | Wave 3 | Wave 4 | Total |
|---|---|---|---|---|---|
| Charcoal Burner's Camp | 12W 4S | 14W 6S 1B | 16W 8S 2B | 18W 10S 2B | 60W 28S 5B |
| Stag's Crossing | 14W 6S | 16W 8S 1B | 18W 10S 1B | 22W 12S 2B | 70W 36S 4B |
| Briar Chapel | 12W 4S 1B | 14W 6S 2B | 16W 8S 2B | 18W 10S 3B | 60W 28S 8B |
| Sunken Causeway | 14W 8S | 16W 10S 1B | 18W 12S 2B | 20W 14S 2B | 68W 44S 5B |
| Widow's Orchard | 16W 4S | 20W 6S 1B | 24W 8S 2B | 28W 10S 2B | 88W 28S 5B |

### Rows 6–7 (5 waves)

| Level | Wave 1 | Wave 2 | Wave 3 | Wave 4 | Wave 5 | Total |
|---|---|---|---|---|---|---|
| Mossbound Cairn | 12W 6S | 14W 8S 1B | 16W 8S 2B | 18W 10S 2B | 20W 12S 3B | 80W 44S 8B |
| The Ashen Glade (Fell) | 12W 6S | 14W 8S 1B | 16W 10S 2B | 18W 12S 2B | 16W 10S 2B **1O** | 76W 46S 7B 1O |
| Bone Orchard | 14W 8S | 18W 10S 1B | 20W 12S 2B | 22W 14S 2B | 26W 16S 3B | 100W 60S 8B |
| The Weeping Stones | 10W 6S 2B | 12W 8S 2B | 14W 8S 3B | 14W 10S 3B | 16W 12S 4B | 66W 44S 14B |
| Hollow of Bells | 18W 10S | 20W 12S 1B | 22W 14S 1B | 24W 16S 2B | 28W 20S 2B | 112W 72S 6B |

### Row 8 — The Heartwood (6 waves)

| Wave 1 | Wave 2 | Wave 3 | Wave 4 | Wave 5 | Wave 6 | Total |
|---|---|---|---|---|---|---|
| 14W 8S | 16W 10S 2B | 18W 12S 2B **1O** | 18W 14S 2B | 20W 16S 3B | 22W 18S 3B **1O** | 108W 78S 12B 2O |

Per-level `enemyHpMult`, corridor widths, feature mixes, palettes and other settings are unchanged.

---

## 6. Pacing within waves

General targets:

- **Spawn window:** wave 1 spawns over about 10–12 s; later waves up to about 20 s. Ogre waves spawn the Ogre early in the wave (within the first ~5 s) so the wave doesn't drag.
- **Wave length:** about 30 s for early waves and 40–45 s for late ones (including travel). Use `gapAfter: 5` for short waves and up to 7 for long ones.
- **Later waves in a battle are harder**, mainly through larger groups arriving closer together.

Each level keeps its character, now expressed **inside every wave**:

| Level | Style within each wave |
|---|---|
| Tornville Haunt | Even small bursts across lanes |
| Gallows Copse | Frequent bursts close together |
| Blackthorn Hollow | Bears lead the wave, wolves follow behind them |
| Wychwood Circle | One big surge per wave on all lanes, Stirges with it |
| Forgotten Barrow | Balanced; the Ogre opens wave 3 |
| The Drowned Hamlet | Steady stream |
| Charcoal Burner's Camp | Two lanes busy, one quiet; the quiet lane changes each wave |
| Stag's Crossing | Fast, frequent small bursts |
| Briar Chapel | Bears spread through the wave to jam the narrow lanes |
| Sunken Causeway | Steady ground stream; Stirge flocks fly over the jams |
| Widow's Orchard | A big surge mid-wave |
| Mossbound Cairn | Balanced |
| The Ashen Glade | Balanced; the Ogre opens wave 5 |
| Bone Orchard | Two surges per wave |
| The Weeping Stones | Bears evenly through each wave |
| Hollow of Bells | A bell toll, then a synchronised surge on all lanes, once or twice per wave |
| The Heartwood | Builds within each wave; Ogres open waves 3 and 6 |

The Hollow of Bells toll plays just before each surge, as before.

---

## 7. Debug

| Key | Action |
|---|---|
| `Shift+N` | Kill all current enemies and skip the rest of this wave's spawns (goes straight to the gap) |
| `Shift+W` | Win the battle instantly (unchanged) |

Panel: wave number and sub-state; this wave's spawned / alive / left; gap countdown.

---

## 8. Acceptance criteria

- [ ] Every level's schedule is a hand-written `waves` list in the §2 format, with a summary comment per wave; old schedule fields removed.
- [ ] Wave counts per level and contents per wave match §5.
- [ ] Combat runs COUNTDOWN → WAVE → GAP → … → Victory; the gap starts only once a wave is fully cleared.
- [ ] Summons, drops, Squirrels and Bough Double jobs keep working through gaps.
- [ ] Preview panel shows the next wave's number, countdown and enemy icons with counts, and doesn't cover candidates.
- [ ] Call next wave (button and Space) skips the gap, with no reward; unavailable during waves.
- [ ] HUD shows wave X / Y and this wave's enemies left; map tooltip, Victory and Defeat overlays show wave info.
- [ ] Wave start and clear sounds play.
- [ ] Debug keys and panel additions work.
- [ ] Everything else still works.
