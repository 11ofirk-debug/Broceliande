# Broceliande — M2k Addendum: Game Speed, Snail Shell, Slow Wisp

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2J`). Everything there still applies unless this document overrides it.

> Same conventions: **MUST** / **SHOULD**, **TUNING** marks starting guesses. Balancing data lives in `data/*.csv` (edited in the Google Sheet, M2j). Ask rather than guess where this is silent.
>
> **Verification:** the designer tests by playing. Check the acceptance criteria by reading the code, not with automated or headless-browser tests (see `CLAUDE.md`).

---

## 0. Data changes and the sheet

This addendum adds rows and columns to several tabs. Claude Code edits the CSVs in `data/`, but **the Google Sheet is the source of truth**, and pulling it would overwrite those edits. So:

1. Claude Code edits the CSVs and lists **exactly which tabs changed** in its report.
2. **Claude Code MUST NOT run the pull script** until the designer confirms the sheet has been updated.
3. The designer re-imports each changed tab into the sheet (File → Import → Upload → **Replace current sheet**), then runs the usual Find and replace fix for garbled characters.
4. Only then pull and commit.

None of the changed tabs (§2.4, §3.6) have formulas or dropdowns, so re-importing them is safe.

---

## 1. Game speed for players

### 1.1 Controls

- Three small buttons in the HUD strip, top right, next to the speaker icon: **×1**, **×2**, **×4**. The active one is highlighted.
- Keys `1`, `2` and `4` do the same. They already exist as debug keys; they now become player controls (no longer debug-only).
- Available in **Combat** (countdown, waves and gaps). Hidden in Prep and on the map.

### 1.2 Behaviour

- Uses the existing simulation speed multiplier, so everything (movement, timers, spawns, summons, animations on simulation time) speeds up together. UI-time animations (e.g. footstep reveal, menus) are unaffected.
- The chosen speed **carries over** between battles and is remembered in `localStorage` (wrapped in try/catch, default ×1), like the mute setting.
- During `ENDING`, the Victory/Defeat overlay and the map, the game runs at ×1 regardless; the chosen speed resumes at the next battle's Combat.
- Debug pause (`P`) is unchanged.

---

## 2. New resource: Snail Shell

### 2.1 Resource

- ID `shells`, name **Snail Shell** (plural **Snail Shells**). Fifth resource.
- **Order everywhere:** Pits, Reeds, Feathers, Boughs, Shells. HUD gets a fifth counter; cost rows can now have up to five rows.
- **Icon:** a small spiral snail shell (cream and brown), added to the shared icon definition, so HUD, floaters, drops, sweep, tooltips and cost rows all match.
- Resource-gained chime: a soft, slightly hollow tone, distinct from the others.
- Carry-over, field sweep, debug `G` (+10) and the map screen's carried resources include it.

### 2.2 Sources

Snail Shells come only from resource spots (no enemy drops):

| Feature | New yield |
|---|---|
| Shrub | Shells 0–1 |
| Ruins | Shells 0–1 |
| Pond | Shells 1–2 |

All TUNING. Existing yields are unchanged. Tooltips list the new line. Forager's Belt's main resources are unchanged.

### 2.3 Purpose

Snail Shells pay for the Slow Wisp (§3). With a typical mix (1 Shrub, 2 Ruins, 2 Ponds), a full search gives about 4–5 Shells, so about two Wisps per battle.

### 2.4 Data changes

| Tab | Change |
|---|---|
| `resources` | New row: `shells`, `Snail Shell`, order 5 |
| `features` | New columns `shells_min`, `shells_max` (values above; blank = 0) |
| `turrets` | New column `cost_shells` (blank for now, so future costs can use it) |
| `summons` | New column `cost_shells` |
| `sounds` | New row for the Shell chime |

---

## 3. New summon: Slow Wisp

### 3.1 Concept

A drifting spark of slow magic. The player picks a spot, the Wisp floats there from the Druid, and bursts, slowing every enemy caught in the burst.

### 3.2 Summoning

- **Fourth summon** in the Druid's menu (image, name, cost rows, key badge), and shortcut key **`R`**.
- Placement works like the Vulture: click the Druid → Slow Wisp (or press `R`) → a ghost follows the cursor, showing a **circle of the burst radius** so the player sees the area → click anywhere on the battlefield (not the HUD) → cost deducted.
- Esc / right-click cancels at no cost; pressing `R` again cancels, another summon key switches (as for the other summons).
- Greyed out (with reason) when unaffordable, at `max` Wisps in flight, or the Druid isn't idle.

### 3.3 Flight and burst

- The Wisp appears at the Druid and floats in a straight line to the clicked point at `speed` (slow), ignoring terrain and enemies. It can't be attacked or blocked.
- A faint dotted line and the radius circle stay at the target point while it travels, so the player can see where it will burst.
- **On arrival it bursts:** every enemy whose centre is within `burstRadius` of the point at that moment is **slowed**.
- **Flying enemies (Stirges) are affected**, unlike Toader clouds. This makes the Wisp an answer to Stirge flocks.
- Bursting is instant (no lingering cloud). The visual fades out over about 0.8 s.

### 3.4 Slowed status

- A slowed enemy moves at `slowMult` × its speed for `slowDuration` seconds.
- Only **movement** is slowed; attack speed is unchanged.
- Being slowed again while slowed **refreshes** the duration (it doesn't stack).
- Applies to all enemy types, including the Ogre.
- The unstick rule (M2d §3.4) uses each enemy's current speed, so faster enemies can still pass slowed ones.
- Shared status system: implement slowed as a general timed status on enemies (`statuses: { slowed: { until, mult } }`) so other statuses can be added later.

### 3.5 Look and sound

- **Wisp:** a small, pale silver-blue glowing orb with a short, lazy, spiralling trail.
- **Burst:** a soft expanding ring of silver-blue mist to the full radius, with a few spiral swirls, fading over about 0.8 s. The visible edge matches the burst radius.
- **Slowed enemies:**
  - a pale silver-blue tint on the enemy,
  - a small slowly turning spiral (snail-shell-like) floating above its head,
  - its walk animation plays at the slowed rate.
  All three disappear when the status ends.
- **Sound** (event bus, M1g §3): `wispSummoned` (soft airy whistle), `wispBursts` (gentle whoosh with a low, stretched chime).

### 3.6 Stats and data

Add a `slowWisp` row to the `summons` tab (new columns `burstRadius`, `slowMult`, `slowDuration`):

| Column | Value |
|---|---|
| `id` | `slowWisp` |
| `name` | Slow Wisp |
| `key` | R |
| `cost_shells` | 2 |
| `speed` | 110 px/s |
| `max` | 2 (Wisps in flight at once) |
| `radius` | 10 px (the orb) |
| `burstRadius` | 100 px |
| `slowMult` | 0.4 |
| `slowDuration` | 7 s |

All TUNING. Also add sound rows for the two new events in `sounds`.

There's no staff charm for the Slow Wisp yet. It can join a slot's family later.

---

## 4. Keys

| Key | Action |
|---|---|
| `Q` / `W` / `E` / `R` | Vulture / Squirrel / Bough Double / **Slow Wisp** |
| `1` / `2` / `4` | Game speed ×1 / ×2 / ×4 (now a player control) |
| `Shift+R` | (Debug) restart the current encounter (was `R`) |

The old debug "new run" key (`Shift+R`) is removed: reloading the page starts a new run anyway. Update the README's key list.

---

## 5. Acceptance criteria

### Game speed
- [ ] ×1 / ×2 / ×4 buttons in the HUD during Combat, plus keys 1 / 2 / 4; active speed highlighted.
- [ ] Speed carries over between battles and is remembered; Victory/Defeat overlays and the map run at ×1.

### Snail Shell
- [ ] Fifth resource with shared icon, HUD counter and correct order everywhere, including five-row cost displays.
- [ ] Shrubs, Ruins and Ponds yield Shells as in §2.2; tooltips updated.
- [ ] Carry-over, sweep, `G` and map resources include Shells.

### Slow Wisp
- [ ] Fourth summon in the Druid's menu and on key `R`; placement shows the burst radius; cancel and switching work.
- [ ] Wisp floats slowly from the Druid to the point and bursts, slowing every enemy within 100 px, including Stirges.
- [ ] Slowed enemies move at 0.4× for 7 s; refresh, not stack; attacks unchanged.
- [ ] Slowed enemies show a tint, a spiral above the head and a slowed walk; all clear when the status ends.
- [ ] Costs 2 Shells; max 2 in flight.

### Data
- [ ] All new values are in the CSVs (§2.4, §3.6); the report lists every changed tab; the pull script was not run.

### General
- [ ] Debug restart moved to `Shift+R`; README keys updated.
- [ ] Everything else still works.
