# Broceliande — M1f Addendum: Menu Icons, Druid Strike Animation, Poison Toader

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1E`). Everything there still applies unless this document overrides it.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.

---

## 1. Shared icon and sprite definitions

Menus will now show the same images used on the battlefield. As with resource icons (M1d §1.3), there MUST be **one definition per image**, used everywhere:

- One draw function per entity (Vulture, Squirrel, Pebble Sprinkler, Poison Toader) that can draw into any canvas context at any scale.
- HTML menus show these via small `<canvas>` elements drawn with that same function (render once and cache; don't redraw every frame).
- Resource icons in menus use the existing shared resource-icon definition.

Don't create separate menu-only artwork.

---

## 2. Summon menu with images

- Each summon option in the Druid's menu shows its creature image (`MENU_PORTRAIT_SIZE`, about 40 px) to the left of its name and cost.
- **The whole option row or card is the click target**, not just the text or a button.
- Greyed-out options grey out the image too, and keep the reason visible.
- Placement ghosts already use the entity's draw function; no change needed there.

---

## 3. Cost rows with resource icons

### 3.1 Format

Every cost display in the game uses **one row per resource**, up to three rows:

```
[Pit icon]     × 4
[Feather icon] × 1
```

- Rows appear in a fixed order: Pits, Reeds, Feathers. Only resources the cost actually uses are shown.
- Icon size `MENU_COST_ICON_SIZE`, about 18 px.

### 3.2 Affordability

- If the player has enough of a resource, its row is shown normally.
- If not, that **row** is shown in red, with what they have: `× 4 (have 2)`.
- The option as a whole is greyed out if any row is short (existing behaviour).

### 3.3 Where it applies

All cost displays: turret build menu (both Prep modes), step-mode slot tooltip, upgrade menu, summon menu. One shared cost-row component MUST be used for all of them.

---

## 4. Druid strike animation

The current swoosh is easy to miss. Make each Druid melee strike (M1e §2) clearly visible with a short sequence:

| Part | Detail | Duration |
|---|---|---|
| **Wind-up** | Staff rotates back, away from the target | `STRIKE_WINDUP_TIME` 0.12 s |
| **Swing + lunge** | Staff swings through toward the target; Druid lunges `STRIKE_LUNGE_PX` (10 px) toward it | `STRIKE_SWING_TIME` 0.10 s |
| **Impact** | Larger, brighter swoosh arc in the target's direction; small impact spark on the target; target flashes white briefly and is knocked back 2–3 px visually | — |
| **Recover** | Staff and Druid return to rest | `STRIKE_RECOVER_TIME` 0.18 s |

Rules:
- Damage is applied at the **impact moment**, not at the start of the wind-up. The 1.8 s interval is measured between impacts.
- The animation is purely visual: knock-back MUST NOT change the target's actual simulation position.
- The Druid's placeholder MUST have a clearly drawn staff that can rotate around his hand.
- If the target dies or leaves its slot during the wind-up, the strike retargets to the current weakest attacker at impact, or is wasted if none remains.

---

## 5. Turret types

### 5.1 Data-driven turrets

Generalise turrets the same way enemies were generalised:

```js
TURRET_TYPES: {
  sprinkler: { name, levels: [ ... ], attack: 'projectile', ... },
  toader:    { name, levels: [ ... ], attack: 'cloud',      ... },
}
```

- The existing Pebble Sprinkler moves into `TURRET_TYPES.sprinkler` (its `TURRET_LEVELS` become its `levels`). It MUST behave exactly as before.
- A built turret stores its type and current level.
- A turret type with only one level shows `No upgrades available` in its Combat menu.

### 5.2 Building with more than one type

**Timed mode:** the build menu lists both turrets, each as a row/card with its image, name and cost rows. Unaffordable ones are greyed out.

**Step mode** (overrides M1b §5.1 and §5.3):
- Clicking an affordable slot now **opens the build menu** (with the travel cost shown at the top) instead of building straight away.
- Choosing a turret deducts the steps, makes the Druid travel, and builds instantly on arrival.
- Closing the menu costs nothing.
- A slot is clickable if the steps are affordable and **at least one** turret type is affordable.
- The hover tooltip shows `Travel: N steps` and a short list of which turrets can be built there with current resources.

---

## 6. Poison Toader

### 6.1 Concept

A toad-like contraption that lobs a poison pellet at one enemy. On impact the pellet bursts into a lingering cloud that damages every enemy passing through it. Slow-firing area denial that rewards placing it where enemies bunch up.

### 6.2 Stats

| Constant | Value | Notes |
|---|---|---|
| Cost | 2 Reeds | Build time as other turrets (2.5 s in timed mode) |
| Range | 260 px | |
| Fire interval | 3.5 s | |
| Impact damage | 2 | Direct target only |
| Cloud radius | 30 px | TUNING |
| Cloud duration | 4.2 s | |
| Cloud tick interval | 0.8 s | |
| Cloud tick damage | 1 | Every enemy in the cloud |
| Pellet speed | 450 px/s | TUNING |
| Levels | 1 only | Upgrades to be added later |

### 6.3 Targeting

Among enemies in range:
1. Prefer enemies **not already inside an active cloud**, to avoid wasting clouds on top of each other.
2. Then the one with the least remaining lane distance (same as the Sprinkler).

If every enemy in range is already inside a cloud, use rule 2 alone.

### 6.4 Pellet and cloud

- The pellet homes on its target like a pebble.
- **If the target dies in flight**, the pellet continues to the target's last position and bursts there (unlike pebbles, which vanish). The cloud is still useful.
- **On impact:** the target (if still alive) takes impact damage, and a cloud is created at the impact point.
- **Cloud damage:** each cloud has its own tick timer starting at creation. First tick at 0.8 s, then every 0.8 s while it lasts (5 ticks in 4.2 s). On each tick, every enemy whose body overlaps the cloud (distance between centres ≤ cloud radius + enemy radius) takes tick damage.
- Overlapping clouds each tick independently (damage stacks).
- Clouds affect enemies only: never the Druid, Vultures or Squirrels.
- Damage from clouds reveals HP bars, counts as normal kills and rolls drops.
- Clouds are cleared when Combat ends (they freeze during `ENDING`, like everything else).

### 6.5 Look

- **Turret:** a squat toad-like contraption, green and purple, with a wide mouth and a pipe or two. The mouth opens briefly when it fires. Must fit inside `LOCATION_RADIUS`.
- **Pellet:** small purple ball.
- **Cloud:** on impact, grows from pellet size to full radius over `CLOUD_GROW_TIME` (0.3 s); translucent purple-green with a slow swirl or pulse; fades out over the last `CLOUD_FADE_TIME` (0.6 s). The visible edge should match the damage radius.
- **Range preview:** like the Sprinkler, shown on hover/select.

---

## 7. Debug additions

Overlay: cloud damage radii and remaining time; Toader target lines; pellet in-flight targets.
Panel: active clouds; damage dealt this encounter by turret type (Sprinkler vs Toader) and by clouds vs impacts. Useful for balancing.

---

## 8. Tuning values (summary)

| Constant | Value |
|---|---|
| `MENU_PORTRAIT_SIZE` | 40 px |
| `MENU_COST_ICON_SIZE` | 18 px |
| `STRIKE_WINDUP_TIME` | 0.12 s |
| `STRIKE_SWING_TIME` | 0.10 s |
| `STRIKE_RECOVER_TIME` | 0.18 s |
| `STRIKE_LUNGE_PX` | 10 px |
| `TURRET_TYPES.toader` | See §6.2 |
| `CLOUD_GROW_TIME` | 0.3 s |
| `CLOUD_FADE_TIME` | 0.6 s |

---

## 9. Acceptance criteria

### Menus
- [ ] Summon options show Vulture and Squirrel images from the shared draw functions; whole row is clickable.
- [ ] Every cost display uses icon rows (Pits, Reeds, Feathers order), one row per resource used.
- [ ] Short resources are red with "have N"; option greyed out if any row is short.
- [ ] One shared cost-row component is used everywhere.

### Druid strike
- [ ] Wind-up, swing with lunge, impact (arc, spark, target flash), recover are clearly visible.
- [ ] Damage lands at impact; 1.8 s interval measured between impacts.
- [ ] Knock-back is visual only.

### Turret types
- [ ] Sprinkler migrated to `TURRET_TYPES` and behaves exactly as before.
- [ ] Timed mode build menu lists both turrets with images and cost rows.
- [ ] Step mode: clicking a slot opens the build menu with travel cost; choosing deducts steps, travels and builds; closing costs nothing.
- [ ] Toader shows "No upgrades available" in Combat.

### Poison Toader
- [ ] Costs 2 Reeds; range 260; fires every 3.5 s.
- [ ] Targets per §6.3.
- [ ] Pellet bursts at the last position if the target dies.
- [ ] Impact deals 2 to the target; cloud of radius 30 lasts 4.2 s and ticks 1 damage every 0.8 s to all overlapping enemies.
- [ ] Clouds stack, hurt only enemies, and clear at Combat end.
- [ ] Pellet and cloud visuals match §6.5; visible cloud edge matches damage radius.

### General
- [ ] Debug overlay and panel additions work.
- [ ] Everything else still works in both Prep modes.
