# Broceliande — M1e Addendum: End Delay, Druid Melee, Bear, Turret Level 3

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`, `M1C`, `M1D`). Everything there still applies unless this document overrides it.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.

---

## 1. End-of-battle delay

### 1.1 New game state

Add an explicit `ENDING` state between Combat and the result:

```
COMBAT → ENDING (END_DELAY) → VICTORY or DEFEAT
```

`ENDING` stores which result is pending.

### 1.2 Behaviour during ENDING

- Lasts `END_DELAY` (1.5 s) of simulation time; respects debug pause and speed.
- **Gameplay stops:** no spawns, no movement, no attacks, no damage, no deaths, no pickups. In-flight projectiles are removed. Summon and action timers freeze.
- **Visual effects continue:** death fades, floating texts and idle animations finish playing, so the screen doesn't look frozen.
- **Input is disabled** apart from debug keys. Any open menu closes; placement mode is cancelled.
- On Defeat, the Druid SHOULD show a simple defeated look (e.g. greyed out and tipped over).
- After `END_DELAY`, the Victory or Defeat overlay appears as before.

This overrides the main spec's rule that the result overlay appears immediately.

---

## 2. Druid melee

### 2.1 Rule

During **Combat**, while the Druid is `IDLE`, he strikes one enemy that is attacking him.

| Constant | Value |
|---|---|
| `DRUID_MELEE_DAMAGE` | 1 |
| `DRUID_MELEE_INTERVAL` | 1.8 s |

### 2.2 Timer

- The Druid has a melee timer that counts up only while he is `IDLE` in Combat.
- It **resets to zero** whenever an action **ends**: an upgrade completes or is cancelled, or summon placement completes or is cancelled. It also starts from zero when Combat begins.
- While the Druid is `UPGRADING` or in `SUMMON_PLACEMENT`, he does not strike and the timer doesn't count.
- Opening a menu does **not** count as an action; the timer keeps running.
- When the timer reaches `DRUID_MELEE_INTERVAL`:
  - If at least one enemy is **in a Druid melee slot** (actively attacking him), strike and reset the timer.
  - If not, the strike stays ready and fires as soon as an enemy takes a melee slot.

### 2.3 Target

- **The weakest attacker:** the enemy in a Druid melee slot with the lowest current HP.
- Tie-break: the one that has been attacking longest, then lowest entity ID.
- Enemies queuing for a slot, or blocked elsewhere, are not valid targets.

### 2.4 Effects

- Damage reveals the target's HP bar, like any damage.
- Kills by the Druid count normally and roll drops.
- Feedback: a quick swipe or flash from the Druid toward the target, plus a small `-1` floating number.

---

## 3. Bear (second enemy type)

### 3.1 Concept

A Demonic Bear: much tougher and slower than a wolf, hits harder, and only a few appear per run. It soaks turret fire and pressures whichever lane it walks down.

### 3.2 Stats

| Constant | Value | Reasoning |
|---|---|---|
| `BEAR_HP` | 90 | 5× wolf. About 22 s of fire from one base turret, ~11 s from a level 2, ~6.5 s from a level 3 |
| `BEAR_SPEED` | 48 px/s | Two-thirds wolf speed; about 40 s to cross a lane unopposed |
| `BEAR_RADIUS` | 26 px | Visibly bulky; leaves room in the corridor for wolves to pass |
| `BEAR_DAMAGE` | 8 | |
| `BEAR_ATTACK_INTERVAL` | 2.0 s | 4 DPS vs wolf 2.5 DPS. Kills the Druid alone in 20 s; kills a Vulture in 4 s |
| `BEAR_MELEE_SLOTS_USED` | 2 | Occupies two adjacent Druid melee slots (§3.5) |
| `BEAR_COUNT` | 3 | TUNING |

All values TUNING.

### 3.3 Drops

Bears use their own drop table, `BEAR_DROPS`, with the same independent-roll rules as wolves (M1d §1):

| Resource | Chance | Amount |
|---|---|---|
| Feathers | 35% | 1–2 |
| Peach Pits | 50% | 2–3 |
| Reeds | 20% | 1 |

### 3.4 Behaviour

Bears use exactly the same systems as wolves unless stated here:

- Lane following, corridor clamping, lateral wander.
- Collision with all ground enemies using their own radius. Wolves can side-step around a Bear where the corridor allows.
- Turret targeting (least remaining lane distance) treats Bears and wolves the same.
- Blocked by landed Vultures (and Squirrels, if `SQUIRREL_BLOCKS_WOLVES` is on), which they attack with `BEAR_DAMAGE` / `BEAR_ATTACK_INTERVAL`.
- HP bar hidden until first damage; HP bar scaled to the Bear's size.

To avoid duplicating code, enemy types SHOULD be data-driven: one `ENEMY_TYPES` table in config (wolf, bear) with stats, radius, drop table and draw function, and one shared enemy entity/system.

### 3.5 Druid melee slots

- A Bear needs `BEAR_MELEE_SLOTS_USED` (2) **adjacent free** slots. It claims both and stands at the midpoint between them, slightly further out to fit its radius.
- If two adjacent slots aren't free, it waits at the end of its lane like a queuing wolf.
- Both slots are released when it dies.
- For the Druid's melee targeting, a Bear counts as one attacker.

### 3.6 Spawning

- Waves now contain typed entries. Add a `type` field to each burst (default `'wolf'`).
- Bears spawn as single-unit bursts at:

  | Bear | Time (s since Combat began) |
  |---|---|
  | 1 | 22 |
  | 2 | 32 |
  | 3 | 42 |

- `RANDOMISE_BEAR_LANES: true` — on each run, assign the 3 Bears to lanes with the seeded RNG, with **one Bear per lane** (a shuffled assignment). When `false`, use the lanes written in config.
- Wolf waves are unchanged: still 35 wolves.
- **Victory** now requires **all enemies of all types** to have spawned and died. Start-up validation checks the wolf total (35) and the Bear total (`BEAR_COUNT`) separately.
- HUD shows enemies remaining as a combined count (e.g. `Enemies: 24 / 38`). The debug panel shows wolves and Bears separately.

### 3.7 Look

Bulky side-view placeholder: dark brown body, hunched shoulders, **red eyes** like the wolf, clearly larger than a wolf at a glance.

---

## 4. Turret level 3

### 4.1 Data-driven levels

Replace the separate turret and upgrade constants with a single table:

```js
TURRET_LEVELS: [
  { /* level 1 (built)   */ damage, fireInterval, rangeMult, cost, time },
  { /* level 2 (upgrade) */ ... },
  { /* level 3 (upgrade) */ ... },
]
```

- Level 1's `cost` and `time` are the **build** cost and time.
- Levels 2 and 3's `cost` and `time` are the **upgrade** cost and time.
- `rangeMult` multiplies `TURRET_RANGE`.

### 4.2 Values

| Level | Damage | Fire interval | DPS | Range | Cost | Time |
|---|---|---|---|---|---|---|
| 1 (built) | 3 | 0.75 s | 4.0 | ×1.0 (220) | 2 Pits + 1 Reed | 2.5 s |
| 2 | 5 | 0.6 s | 8.3 | ×1.2 (264) | 4 Pits + 1 Feather | 3.0 s |
| 3 | 7 | 0.5 s | 14.0 | ×1.35 (297) | 6 Pits + 2 Feathers | 4.0 s |

Level 1 and 2 values are unchanged from the current game. Level 3 values are TUNING.

**Reasoning:** level 3 is the strongest single investment in the game. It nearly doubles a level 2 turret's damage again and handles Bears well. It costs more, and the 4-second upgrade means a turret goes silent for a long time, so *when* you do it matters. A level 3 turret kills a wolf in 3 shots instead of 4.

### 4.3 Rules

- Upgrades go strictly 1 → 2 → 3, one level per upgrade action.
- All existing upgrade rules apply to both upgrades: Combat only, one upgrade at a time, turret stops firing while upgrading, cost on completion, cancel is free.
- The turret menu shows the **next** level's cost (greyed out if unaffordable). At level 3 it shows `Max level`.
- Range preview on hover shows the current level's range. While the upgrade menu is open, also show the next level's range as a faint dashed circle.

### 4.4 Look

- Level 2: the existing indicator (single ring or outline).
- Level 3: clearly distinct, e.g. a double ring in a different colour, plus a slightly larger or faster-rotating sprinkler.

---

## 5. Tuning values (summary)

| Constant | Value |
|---|---|
| `END_DELAY` | 1.5 s |
| `DRUID_MELEE_DAMAGE` | 1 |
| `DRUID_MELEE_INTERVAL` | 1.8 s |
| `ENEMY_TYPES.bear` | See §3.2 |
| `BEAR_DROPS` | See §3.3 |
| `BEAR_COUNT` | 3 |
| Bear spawn times | 22 s, 32 s, 42 s |
| `RANDOMISE_BEAR_LANES` | `true` |
| `TURRET_LEVELS` | See §4.2 |

---

## 6. Debug additions

| Key | Action |
|---|---|
| `B` | Spawn one Bear at the start of a random lane (Combat only, debug) |

Panel: Druid melee timer; wolves and Bears spawned / alive / killed separately.
Overlay: Druid melee target line; Bear radius; which melee slots each enemy holds.

---

## 7. Acceptance criteria

### End delay
- [ ] Victory and Defeat both wait `END_DELAY` before the overlay appears.
- [ ] During the delay: no movement, damage, spawns or pickups; input disabled; effects finish playing.
- [ ] Defeated Druid has a visible defeated look.

### Druid melee
- [ ] In Combat, the idle Druid strikes for 1 every 1.8 s, only at enemies in his melee slots.
- [ ] Target is the lowest-HP attacker, with the stated tie-break.
- [ ] No strikes during upgrading or summon placement; timer resets when either ends.
- [ ] Opening a menu doesn't reset or pause the timer.
- [ ] A ready strike fires as soon as an enemy reaches a melee slot.
- [ ] Druid kills roll drops.

### Bear
- [ ] 3 Bears spawn at the configured times, one per lane, lanes shuffled per run when enabled.
- [ ] Bears are visibly larger, slower and red-eyed; stats match config.
- [ ] Wolves can pass Bears where the corridor allows; nothing overlaps.
- [ ] Bears take two adjacent Druid melee slots, or queue if unavailable.
- [ ] Bears are blocked by and attack Vultures.
- [ ] Bear drop table works.
- [ ] Victory requires all wolves and all Bears dead; HUD shows combined enemies remaining.
- [ ] Enemy types are data-driven in config.

### Turret level 3
- [ ] `TURRET_LEVELS` table replaces the old turret/upgrade constants; levels 1 and 2 behave exactly as before.
- [ ] Turrets upgrade 1 → 2 → 3 with the configured costs, times and stats.
- [ ] Menu shows next level's cost, or `Max level`.
- [ ] Next level's range shown as a dashed circle while the upgrade menu is open.
- [ ] Level 3 has a distinct visual.

### General
- [ ] Both Prep modes, randomised layout, drops and Squirrels all still work.
- [ ] Debug key `B` and panel/overlay additions work.
