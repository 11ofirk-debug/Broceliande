# Broceliande — M2c Addendum: Fell Wilds and the Ogre

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`, `M2B`). Everything there still applies unless this document overrides it.
**Goal:** add a new map node type, **Fell Wilds**, whose encounters contain a mini-boss, and the first mini-boss, the **Ogre**.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.

---

## 1. Fell Wilds node type

### 1.1 Node types

Make node types data-driven:

```js
NODE_TYPES: {
  wilds: { label: 'Wilds',      icon: 'wolfHead', redEyes: false },
  fell:  { label: 'Fell Wilds', icon: 'wolfHead', redEyes: true  },
},
```

- A Fell Wilds node plays exactly like a Wilds node: it starts an encounter from its `levelId`, and carry-over, node states and Victory/Defeat work the same.
- The only differences for now: its icon, its tooltip, and the level it points to includes a mini-boss.

### 1.2 Icon

- Same dark brown circle and wolf's-head silhouette as Wilds (shared draw function, with a `redEyes` option).
- **Eyes are bright red**, clearly visible at map size. A very faint red glow around the eyes is allowed, but nothing else changes.

### 1.3 Tooltip

Fell Wilds tooltips add a line naming the mini-boss:

```
Forgotten Barrow — Fell Wilds
Something stirs beneath the mound.
Wolves 44 · Bears 3
Mini-boss: Ogre
```

### 1.4 First Fell Wilds

Change **Forgotten Barrow** (`barrow`) to `type: 'fell'`.

Adjust its encounter so the Ogre is the main threat (overrides M2b §3.1 and §3.4):

| | Before | Now |
|---|---|---|
| Wolves | 48 | 44 |
| Bears | 6 | 3, at about 15, 30, 45 s |
| Mini-boss | — | 1 Ogre at about 20 s |

Its layout, corridor width (110), feature mix, palette and decoration are unchanged.

---

## 2. The Ogre

### 2.1 Concept

A huge, very slow brute that plods down one lane, plugging it completely. Its blows are slow but devastating: it kills summons in one hit and the Druid in a few. It's the finale of the fight: spawning around 20 s, it arrives near the end unless the player has built enough firepower along its lane.

### 2.2 Stats

Add `ENEMY_TYPES.ogre` (data-driven like the wolf and Bear):

| Constant | Value | Reasoning |
|---|---|---|
| `OGRE_HP` | 450 | 5× Bear. Roughly what 3–4 decently upgraded turrets deal while it walks through their range |
| `OGRE_SPEED` | 30 px/s | Under two-thirds of a Bear; about 60–65 s to cross a lane unopposed |
| `OGRE_RADIUS` | 52 px | Twice the Bear's radius |
| `OGRE_DAMAGE` | 25 | Kills a Vulture or Squirrel in one hit; the Druid (80 HP) in 4 hits |
| `OGRE_ATTACK_INTERVAL` | 3.5 s | Slow; about 7 DPS, but in big chunks |
| `OGRE_WINDUP_TIME` | 0.8 s | Visible wind-up before each blow (§2.5) |
| `OGRE_MELEE_SLOTS_USED` | 3 | Takes 3 adjacent Druid melee slots |

All TUNING.

### 2.3 Drops

`OGRE_DROPS` (independent rolls, M1d §1):

| Resource | Chance | Amount |
|---|---|---|
| Peach Pits | 100% | 3–5 |
| Feathers | 100% | 2–3 |
| Reeds | 60% | 1–2 |
| **Mossy Boughs** | 100% | 1–2 |

The Ogre is the first enemy to drop Boughs. Drops pop out as usual (M1g §1), spread a little wider to suit its size.

### 2.4 Behaviour

Uses the shared enemy systems unless stated here:

- **Lane following:** the Ogre's body nearly fills a 110 px corridor (104 px wide). Its lateral offset is clamped to the space left (it may be close to 0), so it walks down the middle.
- **Plugging the lane:** wolves and Bears behind the Ogre can't pass it and queue behind it. Wolves already ahead of it are unaffected.
- **Corridor check:** at start-up, any level that schedules an Ogre MUST have `corridorWidth ≥ 2 × OGRE_RADIUS + 2`. Log an error naming the level if not.
- **Turret targeting:** unchanged (least remaining lane distance). The Ogre is targeted like any enemy; Toader clouds affect it normally.
- **Blocking:** landed Vultures and blocking Squirrels stop the Ogre as they would a wolf. It attacks them with its normal blow, usually killing them in one hit.
- **Reaching the Druid:** it needs 3 adjacent free melee slots. It stands at the midpoint of those slots, pushed outward so its body doesn't overlap the Druid (about `DRUID_RADIUS + OGRE_RADIUS + 4` from `DRUID_POS`). If 3 adjacent slots aren't free, it waits at the end of its lane.
- **Druid melee:** the Druid strikes the Ogre like any attacker (counts as one attacker for targeting).
- **Victory** requires the Ogre to be dead, along with all other enemies.

### 2.5 Attack: wind-up and blow

Each attack is a readable sequence:

1. **Wind-up** (`OGRE_WINDUP_TIME`): the Ogre raises its club overhead.
2. **Blow:** the club slams down; damage is applied at this moment.
3. **Impact feedback:** a small dust ring on the ground at the target, the target flashes, and a short **screen shake** (`OGRE_SHAKE_PX` 6 px, `OGRE_SHAKE_TIME` 0.2 s), applied to the canvas drawing only (no effect on simulation or UI positions). Add a setting `SCREEN_SHAKE_ENABLED: true`.

The attack interval is measured between blows. If its target dies or leaves during the wind-up, the blow lands on nothing; the next wind-up starts on the next valid target.

### 2.6 Arrival announcement

When the Ogre spawns:

- A short centred banner: **"An Ogre approaches!"**, fading out after about 2 s (HTML layer, doesn't block input).
- Its lane's entrance briefly pulses red.
- A deep roar sound (§2.9).

### 2.7 Boss HP bar

- While the Ogre is alive, a **boss HP bar** sits just below the HUD strip, centred: `OGRE` label, wide bar, `current / max`.
- It appears when the Ogre spawns, not on first damage. It drains as the Ogre takes damage and disappears when it dies.
- The Ogre also keeps its normal world-space HP bar, always visible.
- The boss bar MUST NOT cover any candidate location (check at start-up per level, like the name label).

### 2.8 Look

- Side-view, hulking humanoid, twice the Bear's size: grey-green skin, hunched back, small head, **red eyes** like the other enemies, a huge wooden club.
- Slow heavy walk: body sways from side to side with each step.
- Draw function supports: walk, wind-up (club raised), blow (club down).
- Fits the shared draw-function approach, so it can be replaced by a sprite later.

### 2.9 Sound

New audio events (M1g §3 event bus and spam limits):

| Event | Sound |
|---|---|
| `ogreSpawns` | Deep, long roar |
| `ogreStep` | Very low thud each step (quiet, every ~0.8 s while walking) |
| `ogreWindup` | Short low creak/groan |
| `ogreBlow` | Heavy thump + crunch, louder than the Bear's |
| `ogreDies` | Long falling groan + heavy ground thud |

---

## 3. Spawning mini-bosses

Levels get a `bosses` list alongside `wave` and `bears`:

```js
bosses: [ { type: 'ogre', time: 20, lane: 'random' } ],
```

- `lane: 'random'` picks a lane with the seeded RNG; a lane name fixes it.
- Start-up validation counts bosses in the level's enemy totals.
- HUD's enemy counter includes bosses (e.g. `Enemies: 31 / 48`).
- Map tooltip counts (§1.3) come from the level data, not hard-coded text.

---

## 4. Debug

| Key | Action |
|---|---|
| `O` | Spawn an Ogre at the start of a random lane (Combat only; logs an error and does nothing if the level's corridors are too narrow) |

Overlay: Ogre radius and its 3 claimed melee slots; wind-up timer.
Panel: bosses spawned / alive / killed; Ogre HP.

---

## 5. Acceptance criteria

### Fell Wilds
- [ ] `NODE_TYPES` includes `wilds` and `fell`; Forgotten Barrow is a Fell Wilds.
- [ ] Fell Wilds icon is the wolf's head with bright red eyes; otherwise identical to Wilds.
- [ ] Tooltip says Fell Wilds and names the mini-boss; counts come from level data.
- [ ] Fell Wilds behaves like a Wilds node on the map and in the run.

### Ogre
- [ ] Stats, drops and size match §2.2–2.3; it's visibly twice the Bear's size, with red eyes and a club.
- [ ] Walks down the middle of its corridor; enemies behind it can't pass.
- [ ] Wind-up, blow, dust ring, target flash and screen shake on each attack; damage at the blow.
- [ ] Kills Vultures and Squirrels in one hit; takes 3 adjacent Druid melee slots.
- [ ] Banner, lane pulse and roar on spawn; boss HP bar while alive.
- [ ] Drops include Boughs.
- [ ] Forgotten Barrow: 44 wolves, 3 Bears, 1 Ogre at about 20 s; victory requires all dead.
- [ ] Corridor-width check for Ogre levels works.

### General
- [ ] `SCREEN_SHAKE_ENABLED` switches the shake off.
- [ ] Debug key `O` and panel/overlay additions work.
- [ ] Everything else still works in all levels and both Prep modes.
