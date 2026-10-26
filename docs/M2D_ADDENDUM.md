# Broceliande — M2d Addendum: Resource Floaters, Field Sweep, Ogre Passing

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2C`). Everything there still applies unless this document overrides it.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.

---

## 1. Floating resource icons

Replaces the floating `+2 Pits`-style text for resource gains (main spec §8.4, M1d §1.4).

### 1.1 Look

For each resource gained, a **floater** appears: the resource's shared icon (M1d §1.3) at `FLOATER_ICON_SIZE` (about 28 px) with `×N` next to it.

- It rises `FLOATER_RISE_PX` (about 45 px) over `FLOATER_TIME` (1.0 s), easing out, and fades during the last 40%.
- Soft dark outline or shadow behind the `×N` text so it reads on every palette.
- Drawn above all entities.

### 1.2 Multiple resources

When one event yields several resource types (e.g. a Ruins search giving Pits and Feathers), show one floater per type, launched `FLOATER_STAGGER` (0.12 s) apart in resource order (Pits, Reeds, Feathers, Boughs), stacked so they don't overlap (each starts slightly higher than the last).

Resources rolled as 0 are not shown. If a search yields nothing at all, show a small grey `Nothing found` text instead.

### 1.3 Where it applies

One shared floater component for every resource gain:

- Searching a resource spot (both Prep modes).
- Squirrel pickups (at the item's position).
- Debug grant `G` (above the Druid).

Damage numbers (`-1` etc.) are unchanged.

---

## 2. Field sweep on Victory

### 2.1 Rule

When a battle is **won**, every drop item still on the field (landed or mid-air) is added to the player's inventory. This happens before the carry-over is saved (M2a §3), so the swept resources carry to the next battle.

On **Defeat**, nothing is swept (the run ends anyway).

### 2.2 Animation

Runs during the `ENDING` delay (M1e §1), which otherwise freezes gameplay:

- Each item flies from its position to its resource counter in the HUD along a gentle curve, over `SWEEP_FLIGHT_TIME` (0.5 s), shrinking slightly as it goes.
- Items launch one after another, `SWEEP_STAGGER` (0.04 s) apart, nearest-to-the-HUD first.
- If there are so many items that the sweep would run past `END_DELAY`, shorten the stagger so the last item lands no later than 0.1 s before the Victory overlay appears.
- When an item arrives, its counter ticks up by one and pulses briefly.
- Sound: the existing resource chime per arrival, limited by its spam controls (M1g §3.5).

The inventory value MUST be final (all items counted) by the time the Victory overlay appears, even if animations are skipped (e.g. debug speed or a frame hitch).

### 2.3 Victory overlay

Add a line to the Victory overlay: `Gathered from the field:` with resource icon rows for what the sweep collected. Omit the line if nothing was swept.

### 2.4 Design note

Because all drops are now collected at the end of a won battle anyway, the Squirrel's value is getting resources **during** the battle, in time to spend them on summons and Bough Double jobs. Its cost (currently 1 Pit, set by the designer in `config.js`) is not part of this addendum; don't change it.

---

## 3. Ogre passing

### 3.1 Problem

The Ogre (M2c) nearly fills its corridor, so wolves and Bears behind it get stuck for most of the fight.

### 3.2 Smaller collision circle

Separate the Ogre's visual size from its collision size:

| Constant | Value | Used for |
|---|---|---|
| `OGRE_RADIUS` | 52 px (unchanged) | Drawing, HP bar placement, hit-testing for hover, Druid melee positioning |
| `OGRE_COLLISION_RADIUS` | 30 px (TUNING) | Collision with other enemies, corridor clamping, Vulture/Squirrel blocking distance |

- Generalise: every enemy type gets an optional `collisionRadius` (defaults to its visual radius). Wolves and Bears are unchanged.
- The corridor-width check for Ogre levels (M2c §2.4) still uses the **visual** radius, so the Ogre never visibly overhangs a corridor.

### 3.3 Ogre keeps to one side

- When it spawns, the Ogre picks a side of the corridor (seeded RNG) and walks with its lateral offset near that side: `offset = ±(corridorWidth/2 − OGRE_COLLISION_RADIUS − 4)`, with only a little wander.
- In a 110 px corridor this leaves a gap of about 42 px on the other side, enough for a wolf (32 px) to pass.

### 3.4 Unstick rule (all enemies)

So nothing stays jammed behind a slower, larger enemy (including Bears behind the Ogre, and wolves behind Bears in narrow corridors):

- If an enemy's forward movement has been blocked by **another enemy** for more than `STUCK_TIME` (0.6 s), and the blocker is **slower** than it, it may ignore collision with that specific blocker until the two no longer overlap.
- It still collides with everything else (other enemies, Vultures, Squirrels) as normal.
- Visually it walks past the blocker; y-sorted drawing keeps the overlap readable.
- Enemies queuing for Druid melee slots, or blocked by Vultures/Squirrels, are **not** affected by this rule (they're meant to wait).

| Constant | Value |
|---|---|
| `STUCK_TIME` | 0.6 s (TUNING) |

---

## 4. Debug

Overlay: Ogre's collision circle drawn inside its visual circle; enemies currently using the unstick rule marked (e.g. small yellow outline).
Panel: items swept on the last Victory.

---

## 5. Tuning values

| Constant | Value |
|---|---|
| `FLOATER_ICON_SIZE` | 28 px |
| `FLOATER_RISE_PX` | 45 px |
| `FLOATER_TIME` | 1.0 s |
| `FLOATER_STAGGER` | 0.12 s |
| `SWEEP_FLIGHT_TIME` | 0.5 s |
| `SWEEP_STAGGER` | 0.04 s |
| `OGRE_COLLISION_RADIUS` | 30 px |
| `STUCK_TIME` | 0.6 s |

---

## 6. Acceptance criteria

### Floaters
- [ ] Searching shows one rising icon + `×N` per resource gained, staggered and stacked; zero yields hidden; `Nothing found` when empty.
- [ ] Squirrel pickups and `G` use the same floaters.
- [ ] Floaters read clearly on every level's palette.

### Field sweep
- [ ] On Victory, every drop on the field flies to its HUD counter during the end delay, and the counters tick up.
- [ ] Swept resources are included in the carry-over.
- [ ] Inventory is final when the overlay appears, even with many items.
- [ ] Victory overlay lists what was gathered; nothing is swept on Defeat.

### Ogre passing
- [ ] Ogre is drawn at full size but collides with a 30 px radius and walks near one side of the corridor.
- [ ] Wolves pass the Ogre through the gap.
- [ ] Bears behind the Ogre, and wolves behind Bears in narrow corridors, get past via the unstick rule instead of staying stuck.
- [ ] Enemies waiting for melee slots or blocked by summons still wait.

### General
- [ ] Debug additions work.
- [ ] Everything else still works in all levels and both Prep modes.
