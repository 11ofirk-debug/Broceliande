# Broceliande — M2h Addendum: Stirge (Flying Enemy)

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2G`). Everything there still applies unless this document overrides it.
**Goal:** add the Stirge, a fast, fragile flying enemy that follows the lanes above the ground, ignores ground blocking, and drains the Druid with quick, weak bites.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.
>
> **Verification:** the designer tests by playing. Check the acceptance criteria by reading the code, not with automated or headless-browser tests (see `CLAUDE.md`).

---

## 1. Concept

Stirges arrive in small, fast flocks. They fly over everything on the ground: queues, Bears, the Ogre, Squirrels. So jams and ground blocking don't slow them. Each one is weak and dies to a couple of pebbles, but a flock that reaches the Druid nibbles away steadily. Answers: Sprinklers near the Druid, Vultures (which can catch them), and the Druid's own strike.

---

## 2. Stats

Add `ENEMY_TYPES.stirge` (data-driven like the others), with a new property `flying: true`.

| Constant | Value | Notes |
|---|---|---|
| `STIRGE_HP` | 6 | 2 base pebbles, 2 Vulture pecks (before `enemyHpMult`) |
| `STIRGE_SPEED` | 144 px/s | 2× wolf; about 13–15 s to cross a lane |
| `STIRGE_RADIUS` | 12 px | Visual and collision |
| `STIRGE_DAMAGE` | 0.5 | |
| `STIRGE_ATTACK_INTERVAL` | 0.6 s | About 0.83 DPS each (a wolf is 2.5) |
| `STIRGE_FLY_HEIGHT` | 18 px | Drawn this far above its ground point (§5) |

All TUNING.

**Fractional damage:** HP is stored with decimals. The HUD and world HP bars show the Druid's HP rounded **up** to a whole number (so 79.5 shows as 80). The bar fill uses the exact value. Same for summons.

### 2.1 Drops

`STIRGE_DROPS`: Feathers 10%, 1. Nothing else.

---

## 3. Flying rules

These apply to every enemy with `flying: true` (only Stirges for now).

### 3.1 Movement

- Follows its lane's path like other enemies (lane distance `s` + lateral offset), at `STIRGE_SPEED`, with a slightly larger, quicker wander so flocks look fluttery.
- Stays within its corridor laterally, like ground enemies.
- **No collision with ground enemies.** Flies over wolves, Bears and the Ogre, and is never held up by them (and never triggers the unstick rule).
- **Light separation between Stirges only**, so a flock doesn't collapse into one point. They may overlap a little.

### 3.2 Blocking

- **Squirrels never block Stirges.**
- **Vultures can catch them:** Vultures may target Stirges (they're part of the Vulture's normal "nearest living enemy" targeting). A Stirge within `VULTURE_BLOCK_RADIUS` of a Vulture that is attacking (landed, or holding position to attack) stops and fights it: it bites the Vulture with its normal damage and interval. When that Vulture is gone, it flies on.
- Nothing else blocks Stirges.

### 3.3 At the Druid

- Stirges **don't use Druid melee slots**. When one reaches the end of its lane, it flies to a random point on a small ring above the Druid (`STIRGE_DRUID_RING`, about 40 px) and hovers there, attacking. Any number can attack at once.
- They count as attackers for the Druid's strike (M1e §2). Since the strike targets the weakest attacker, the Druid naturally picks Stirges off.

### 3.4 Turrets and clouds

- **Sprinkler:** targets and hits Stirges normally (least remaining lane distance, as always). Pebbles home in on them.
- **Toader:** doesn't target flying enemies, and its clouds don't damage them (they fly above). Controlled by `CLOUDS_HIT_FLYERS: false`; when `true`, both targeting and cloud damage include flyers.
- Level HP scaling (`enemyHpMult`) applies to Stirges.

---

## 4. Spawning

- Waves get flock entries with `type: 'stirge'`. A flock spawns its Stirges `STIRGE_FLOCK_STAGGER` (0.3 s) apart, so they arrive as a tight group.
- Flocks are usually 3–5 Stirges.
- **Victory** requires all Stirges dead too. HUD enemy count, map tooltip counts (`Stirges N`), validation totals and the debug panel include them.

### 4.1 Per-level counts

Stirges start appearing in row 3, introduced gently, and grow from there. All TUNING; Claude Code chooses flock timings that suit each level's pacing (e.g. in surge levels, flocks arrive with the surges).

| Row | Level | Stirges |
|---|---|---|
| 1–2 | Tornville, Gallows Copse, Blackthorn Hollow | 0 |
| 3 | Wychwood Circle | 8 |
| 3 | Forgotten Barrow (Fell) | 0 (the Ogre is the threat) |
| 3 | The Drowned Hamlet | 6 |
| 4 | Charcoal Burner's Camp | 8 |
| 4 | Stag's Crossing | 10 |
| 5 | Briar Chapel | 8 |
| 5 | Sunken Causeway | 10 (fly over the jams) |
| 5 | Widow's Orchard | 8 |
| 6 | Mossbound Cairn | 10 |
| 6 | The Ashen Glade (Fell) | 8 |
| 7 | Bone Orchard | 12 |
| 7 | The Weeping Stones | 8 |
| 7 | Hollow of Bells | 14 (with the tolls) |
| 8 | The Heartwood | 12 |

Existing wolf, Bear and Ogre counts are unchanged.

---

## 5. Look and sound

- **Look:** small bat-like body with a long, thin proboscis, leathery wings flapping fast, and **red eyes** like the other enemies. Drawn `STIRGE_FLY_HEIGHT` above its ground point, with a small soft shadow on the ground beneath it so its position on the lane is readable.
- Drawn above all ground enemies (not y-sorted with them), but below projectiles and UI.
- HP bar hidden until first damage, as for other enemies; small.
- **Sound** (existing event bus and spam limits, M1g §3):

| Event | Sound |
|---|---|
| `stirgeFlockSpawns` | Short, thin buzzing whirr (once per flock, not per Stirge) |
| `stirgeBites` | Tiny wet "tsk" (low volume, high `minGap`) |
| `stirgeDies` | Short high squeak |

---

## 6. Debug

| Key | Action |
|---|---|
| `S` | Spawn a flock of 4 Stirges at the start of a random lane (Combat only) |

Overlay: Stirges' ground points and shadows; Vulture–Stirge holds.
Panel: Stirges spawned / alive / killed.

---

## 7. Acceptance criteria

- [ ] Stirge is a data-driven enemy with `flying: true` and the stats, drops and look in §2 and §5.
- [ ] It follows its lane at twice wolf speed, ignoring ground enemies and the unstick rule; Stirges lightly separate from each other.
- [ ] Squirrels never block it; Vultures can target and hold it.
- [ ] At the Druid it hovers on a ring, without using melee slots, and bites for 0.5 every 0.6 s; the Druid's strike can target it.
- [ ] Fractional HP works; HP displays round up.
- [ ] Sprinklers hit Stirges; Toaders and clouds ignore them unless `CLOUDS_HIT_FLYERS` is on.
- [ ] Flocks spawn tightly; per-level counts match §4.1; victory, HUD, tooltips and validation include them.
- [ ] Debug key `S` and panel/overlay additions work.
