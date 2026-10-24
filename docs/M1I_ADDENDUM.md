# Broceliande — M1i Addendum: Mossy Bough and Bough Double

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1H`). Everything there still applies unless this document overrides it.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.

---

## 1. Fourth resource: Mossy Bough

### 1.1 Resource

- Name: **Mossy Bough**. Short name in UI: **Bough** / **Boughs**.
- Starts at 0, like the others.
- Icon: a short, slightly crooked branch with green moss patches. Added to the **shared icon definition** (M1d §1.3, M1f §1), so HUD, drops, tooltips and cost rows all use the same drawing.
- **HUD:** a fourth counter in the resource panel, after Feathers.
- **Resource order everywhere** (HUD, tooltips, cost rows): Pits, Reeds, Feathers, Boughs. Cost displays can now have up to four rows.

### 1.2 Sources

Add Boughs to these feature types (rolled independently, like other mixed yields):

| Feature | New yield |
|---|---|
| Tree | Boughs 1–2 |
| Shrub | Boughs 0–1 |

All existing yields are unchanged. Tooltips list the new line. Wolf and Bear drops are unchanged (no Boughs).

**Expected supply (for reference):** with 2 Trees and 1 Shrub per layout, searching all three gives about 3.5 Boughs on average. Boughs are therefore the scarcest resource, and each one is roughly one Combat action (§2).

### 1.3 Other updates

- Floating gain text, resource-gained sound (pitch: lowest of the four, woody) and debug panel expected-yield figures include Boughs.
- Debug key `G` also grants +10 Boughs.

---

## 2. Bough Double

### 2.1 Concept

A temporary double of the Druid, made from a Mossy Bough. It exists only long enough to perform **one** job at a turret slot, then disappears. During Combat, it is now the **only** way to build or upgrade turrets.

### 2.2 Rule changes in Combat

These override earlier specs:

- **The Druid never leaves his main position during Combat.** He no longer relocates to turrets.
- **The Druid cannot upgrade turrets himself.** The `UPGRADING` action state is removed from the Druid's Combat states. His Combat states are now `IDLE` and `SUMMON_PLACEMENT` only.
- **Turrets can now be built during Combat** — via a Bough Double only.
- Because the Druid stays idle while Doubles work, he keeps striking (M1e §2) and can summon Vultures and Squirrels during a Double's job.

Prep is **unchanged** in both modes: the Druid builds himself, and building in Prep needs no Bough.

### 2.3 Jobs

| Job | Where | Duration | Cost |
|---|---|---|---|
| **Build** | Empty turret slot | The turret type's build time (2.5 s) | Turret's build cost + `BOUGH_DOUBLE_COST` |
| **Upgrade** | Built turret below max level | The next level's upgrade time | Upgrade cost + `BOUGH_DOUBLE_COST` |

`BOUGH_DOUBLE_COST` = 1 Bough (TUNING).

### 2.4 Starting a job

The Bough Double is a **summon** and is cast **from the Druid**, like the Vulture and Squirrel. The player always summons through the Druid, then points the summon at its target. This keeps the fantasy of a summoner shaping the battlefield through his creatures.

**Step 1 — Druid menu.** Clicking the idle Druid in Combat shows three summons, each with image and cost rows: Vulture, Squirrel, **Bough Double** (cost row shows 1 Bough). Bough Double is greyed out (with a reason) if: no Bough, `MAX_BOUGH_DOUBLES` already working, or no valid target exists.

**Step 2 — Targeting mode.** Choosing Bough Double enters `SUMMON_PLACEMENT` (same state as the other summons), in a targeting variant:
- A Double ghost follows the cursor.
- All **valid targets** are highlighted: empty slots and built turrets below max level that have no Double working on them. Everything else is dimmed.
- Hovering a valid target snaps the ghost beside it and shows a tooltip with the job and its full cost rows (resources + Bough), red rows where short:
  - Turret: `Upgrade to Level N` + upgrade cost + Bough + time.
  - Empty slot: `Build` + "choose turret on click".
- Esc / right-click cancels targeting at no cost (as for other summons).

**Step 3 — Confirm.**
- **Turret:** clicking it starts the upgrade job directly (if affordable).
- **Empty slot:** clicking it opens a small turret-choice menu beside the slot (each turret type with image and cost rows including the Bough). Choosing one starts the build job. Closing it returns to targeting mode.
- Unaffordable targets can be hovered (to see what's missing) but not confirmed.

**Starting the job:**
1. **Deducts the full cost immediately** (resources + Bough).
2. A short green-brown **wisp** travels from the Druid to the target (`DOUBLE_WISP_TIME`, 0.25 s), showing the summon leaving him.
3. On arrival, the Double appears beside the target (offset `DRUID_ACTION_OFFSET`) and the progress bar starts. The job time starts when the Double appears.
4. The Druid returns to `IDLE` (his melee timer resets, as after any summon).

**Clicking slots and turrets directly in Combat** no longer starts jobs:
- An empty slot shows a short hint tooltip: "Summon a Bough Double from the Druid to build here."
- A turret's menu shows its type, level and stats (and **Cancel job** if a Double is working on it, §2.6), but no build or upgrade button.

### 2.5 During a job

- The Double stays beside the target and plays the crafting animation (§2.7).
- **Upgrades:** the turret does not fire during the job (as before). In-flight projectiles still land; existing clouds stay.
- **Builds:** the slot shows the progress bar and a faint outline of the turret being built.
- Doubles are **not** targetable or blockable by enemies (they stand outside the corridors), and they don't block anything.
- Different Doubles may work on different targets at the same time, up to `MAX_BOUGH_DOUBLES`.

### 2.6 Completing and cancelling

- **Completion:** the turret is built or upgraded; the Double plays a short disappear effect (fades out with a few leaf/moss particles).
- **Cancel:** open the target's menu while a Double is working — it shows **Cancel job**. Choosing it removes the Double and **refunds the full cost**, including the Bough. Esc/right-click do **not** cancel jobs (they only close menus or placement mode, per the main spec).
- **Combat ends** (entering `ENDING`): jobs freeze; on restart everything clears. No refunds needed.

This overrides "cost on completion" for Combat builds and upgrades. Paying up front prevents two simultaneous jobs from both counting the same resources.

### 2.7 Look and crafting animation

- **Sprite:** the Druid's draw function, rendered monochrome brown (e.g. `#7a5530`) at about 60% opacity. Reuse the Druid's shared draw function with a tint/alpha option; don't make separate art.
- **Crafting loop** (simple placeholder, final animation later):
  - Gentle bob (about 2 px).
  - The staff swings down toward the target every `DOUBLE_CRAFT_SWING_INTERVAL` (0.45 s), reusing the staff rotation from the Druid strike (M1f §4).
  - On each swing's impact: 2–3 small wood-chip particles pop from the target.
- Appear: fades and scales in over 0.2 s with a small green-brown puff. Disappear: fades out over 0.3 s.

### 2.8 Sound

New audio events, using the existing event bus and spam limits (M1g §3):

| Event | Sound |
|---|---|
| `doubleAppears` | Soft woody creak + low shimmer |
| `doubleCraftHit` | Tiny wooden tap per swing (quiet; low `maxVoices`) |
| Completion | Existing build / upgrade completion sounds |
| `doubleCancelled` | Short descending creak |

The old ratchet-ticks-while-upgrading sound is replaced by `doubleCraftHit`.

---

## 3. Tuning values

| Constant | Value |
|---|---|
| Tree yield | + Boughs 1–2 |
| Shrub yield | + Boughs 0–1 |
| `BOUGH_DOUBLE_COST` | 1 Bough (TUNING) |
| `MAX_BOUGH_DOUBLES` | 2 (TUNING) |
| `DOUBLE_TINT` | `#7a5530` |
| `DOUBLE_ALPHA` | 0.6 |
| `DOUBLE_CRAFT_SWING_INTERVAL` | 0.45 s |
| `DOUBLE_WISP_TIME` | 0.25 s |

---

## 4. Debug additions

Overlay: each Double's target line and remaining job time.
Panel: Boughs gained / spent this encounter; active Doubles; jobs completed / cancelled.

---

## 5. Acceptance criteria

### Mossy Bough
- [ ] Fourth resource with shared icon; HUD counter after Feathers.
- [ ] Trees yield 1–2 Boughs and Shrubs 0–1, in addition to existing yields; tooltips updated.
- [ ] Cost rows support four resources in the order Pits, Reeds, Feathers, Boughs.
- [ ] `G` grants Boughs; debug expected yields include them.

### Bough Double
- [ ] In Combat, the Druid never leaves his main position and has no `UPGRADING` state.
- [ ] Bough Double is summoned from the Druid's menu alongside Vulture and Squirrel; greyed out with reasons when unavailable.
- [ ] Targeting mode: ghost follows cursor, valid targets highlighted, others dimmed, hover tooltip shows job and full cost; Esc/right-click cancels at no cost.
- [ ] Clicking a turret starts its upgrade; clicking an empty slot opens a turret choice, then starts the build.
- [ ] Clicking slots or turrets directly in Combat doesn't start jobs (hint tooltip / info menu only).
- [ ] Confirming deducts the full cost immediately; a wisp travels from the Druid to the target; a brown, translucent Druid double appears beside it.
- [ ] Double plays the crafting loop with wood chips; progress bar shows; turret doesn't fire while being upgraded.
- [ ] Completion builds/upgrades and the Double fades out.
- [ ] Cancel job from the target's menu refunds everything.
- [ ] Up to 2 Doubles can work at once on different targets.
- [ ] The Druid keeps striking and can summon while Doubles work.
- [ ] Prep (both modes) unchanged: Druid builds himself, no Bough needed.
- [ ] Sounds play via events.

### General
- [ ] Debug additions work.
- [ ] Everything else still works in both Prep modes.
