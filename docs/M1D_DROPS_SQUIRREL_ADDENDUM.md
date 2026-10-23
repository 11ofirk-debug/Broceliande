# Broceliande — M1d Addendum: Wolf Drops and Squirrel Summon

**Status:** addendum to `docs/M1_SPEC.md`, `docs/M1B_STEPS_ADDENDUM.md` and `docs/M1C_LAYOUT_ADDENDUM.md`. Everything there still applies unless this document overrides it.
**Goal:** wolves sometimes drop resources where they die, and a second summon, the Squirrel, collects them.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.

---

## 1. Wolf drops

### 1.1 Drop rolls

When a wolf dies, roll **each resource independently** using the seeded RNG:

| Resource | Chance | Amount |
|---|---|---|
| Feathers | 5% | 1–2 |
| Peach Pits | 8% | 1–2 |
| Reeds | 2% | 1 |

Because rolls are independent, one wolf can drop more than one resource type (rarely). Amounts are uniform integers, inclusive.

Store as `WOLF_DROPS` in config: a list of `{ resource, chance, min, max }`.

### 1.2 Drop items

- Each **unit** is a separate drop item. A wolf dropping 2 Feathers and 1 Pit creates **3** items.
- Items appear where the wolf died. If there's more than one, spread them in a small cluster around the death point, `DROP_SPACING` apart (e.g. a short row or small ring), so each icon is clearly visible.
- Items MUST stay inside the wolf's corridor (clamp positions if needed).
- Items stay on the field until collected or the encounter ends. They don't expire and wolves don't interact with them.
- A wolf that dies while biting the Druid drops near the Druid in the same way.

### 1.3 Look

- Use the **same icon designs as the HUD resource panel**, drawn at `DROP_ICON_SCALE` (0.7) of the HUD size.
- The HUD and the canvas MUST share one icon definition so they always match: for example, a single procedural draw function per resource used for both, or the same SVG source drawn into the canvas via an `Image`. Don't maintain two separate versions.
- Drawn on the ground layer: above the floor and corridors, below wolves and other entities.
- A very subtle idle effect (slow bob or soft glow) is welcome, so drops read as collectable.

### 1.4 Collection

Drops are collected **only by Squirrels** (§2). The Druid cannot collect them by clicking.

On collection: the resource is added to the inventory **immediately**, the item is removed, and a small floating `+1 Feather`-style text appears at the item's position.

---

## 2. Squirrel summon

### 2.1 Summon menu

The Druid's Combat menu now has two options:

```
Summon Vulture        Summon Squirrel
3 Feathers            3 Feathers
```

Both follow the existing summon rules: Druid must be idle at his main position; option greyed out with a reason when unaffordable, at its cap, or Druid not idle; placement mode with a ghost of the chosen summon; Esc / right-click cancels at no cost; cost deducted on placement.

### 2.2 Stats

Start with the **same values as the Vulture**, in separate constants so they can be tuned independently:

| Constant | Value | Notes |
|---|---|---|
| `SQUIRREL_COST` | 3 Feathers | TUNING |
| `SQUIRREL_HP` | 15 | TUNING |
| `SQUIRREL_DURATION` | 12 s | TUNING |
| `SQUIRREL_SPEED` | 140 px/s | TUNING |
| `MAX_SQUIRRELS` | 3 | TUNING — separate from `MAX_VULTURES` |
| `SQUIRREL_RADIUS` | 12 | TUNING |
| `SQUIRREL_PICKUP_RANGE` | 14 px | TUNING |
| `SQUIRREL_BLOCKS_WOLVES` | `false` | See §2.4 |

### 2.3 Behaviour

Mirrors the Vulture's movement, but it targets drops instead of wolves:

- **Targeting:** the nearest **unclaimed** drop item to the Squirrel itself (straight-line). The Squirrel claims it so other Squirrels don't chase the same item.
- **Moving:** straight line toward its target at `SQUIRREL_SPEED`, ignoring corridors and terrain, like the Vulture.
- **Collecting:** within `SQUIRREL_PICKUP_RANGE`, it collects the item instantly (§1.4), then picks the next nearest unclaimed drop.
- **Nothing to collect:** waits where it is (a small idle animation is fine) and resumes as soon as a new drop appears. Its duration keeps running.
- **Expiry:** disappears after `SQUIRREL_DURATION` or at 0 HP, releasing any claimed item.
- Squirrels don't collide with each other or with Vultures.
- It does **not** attack wolves.

### 2.4 Interaction with wolves

Default (`SQUIRREL_BLOCKS_WOLVES: false`): wolves ignore Squirrels completely. Squirrels can't be hurt, so HP has no effect yet.

When `true`: a Squirrel that is collecting or waiting (not moving) blocks and is attacked exactly like a landed Vulture (main spec §15.4). This makes collecting drops in a busy lane risky. Implement both behaviours behind the flag.

### 2.5 Look

Small side-view placeholder: brown body, large bushy tail, with a small HP bar and the same duration ring as the Vulture. Its placement ghost uses the same shape.

---

## 3. Debug additions

| Key | Action |
|---|---|
| `X` | Toggle drop-rate multiplier between ×1 and `DEBUG_DROP_MULT` (default ×10), for testing |

Panel: items dropped / collected / on field this encounter; per-resource totals; active Squirrels; current drop multiplier.
Overlay: Squirrel → target lines; claimed items marked.

---

## 4. Tuning values

| Constant | Value |
|---|---|
| `WOLF_DROPS` | Feathers 5% 1–2 · Pits 8% 1–2 · Reeds 2% 1 |
| `DROP_ICON_SCALE` | 0.7 |
| `DROP_SPACING` | 16 px (TUNING) |
| `DEBUG_DROP_MULT` | 10 |
| Squirrel values | See §2.2 |

---

## 5. Acceptance criteria

- [ ] Each wolf death rolls each resource independently with the configured chances and amounts, using the seeded RNG.
- [ ] Each unit appears as its own icon at the death point; multiple items are spaced apart and stay inside the corridor.
- [ ] Drop icons match the HUD icons at 0.7 scale and share one definition.
- [ ] Drops persist until collected or the encounter ends; they are cleared on restart.
- [ ] Druid menu offers both summons, each greyed out correctly.
- [ ] Squirrel placement, ghost and cancel work like the Vulture's.
- [ ] Squirrel moves to the nearest unclaimed drop, collects on contact, and moves on.
- [ ] Two Squirrels never chase the same item.
- [ ] Collected resources appear in the inventory immediately, with floating text.
- [ ] Squirrel waits when there's nothing to collect, and expires after its duration.
- [ ] `MAX_SQUIRRELS` and `MAX_VULTURES` are enforced separately.
- [ ] `SQUIRREL_BLOCKS_WOLVES` works in both settings.
- [ ] Debug key `X`, panel figures and overlay lines work.
- [ ] Everything else (both Prep modes, layout, Combat) is unchanged.
