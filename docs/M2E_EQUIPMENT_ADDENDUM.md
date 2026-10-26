# Broceliande — M2e Addendum: Druid Equipment

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2D`). Everything there still applies unless this document overrides it.
**Goal:** the Druid can equip magic items in six slots: three **staff charms** that strengthen his summons, and three pieces of **personal equipment** with passive effects. Items are found hidden in resource spots, one per battle, and equipped on the map screen, which gains an equipment panel.

> Same conventions: **MUST** / **SHOULD**, all values in `config.js`, **TUNING** marks starting guesses. Ask rather than guess where this is silent.
>
> **Verification:** the designer tests by playing. Check the acceptance criteria by reading the code, not with automated or headless-browser tests (see `CLAUDE.md`).

---

## 1. Slots

| Group | Slot | Affects |
|---|---|---|
| Staff charms (active abilities) | **Crown** (top of staff) | Vulture |
| | **Grip** (middle of staff) | Squirrel |
| | **Ferrule** (foot of staff) | Bough Double |
| Personal equipment (passive) | **Necklace** | HP and survival (later: resistances) |
| | **Belt** | Work and gathering: build and upgrade times, search yields |
| | **Shoes** | Movement: step budget and step costs |

- Each slot holds **at most one** item, and an item fits **only** its own slot type.
- **Staff charms only modify summons** (the Druid's active abilities). Each staff slot is tied to one summon, as above, so players learn where to look: the Crown is the sky (Vulture), the Grip is the hand (Squirrel), and the Ferrule touches the ground (Bough Double). Future summons can be added to a slot's family.
- **Personal equipment only modifies passive properties.**

---

## 2. Items

### 2.1 Data

```js
ITEMS: {
  hawkfeatherCrown: {
    slot: 'crown',
    name: 'Hawkfeather Crown',
    description: 'Vultures stay 4 s longer.',
    effects: [ { stat: 'vulture.duration', op: 'add', value: 4 } ],
  },
  // ...
},
SLOT_TYPES: {
  crown:    { label: 'Crown Charm',   group: 'staff' },
  grip:     { label: 'Grip Charm',    group: 'staff' },
  ferrule:  { label: 'Ferrule Charm', group: 'staff' },
  necklace: { label: 'Necklace',      group: 'personal' },
  belt:     { label: 'Belt',          group: 'personal' },
  shoes:    { label: 'Shoes',         group: 'personal' },
},
```

- Effects are a list of `{ stat, op, value }` with `op` = `add` or `mult`. Several effects can apply to the same stat; apply all `add`s first, then all `mult`s.
- Item IDs are stable keys, so owned items can later be saved between runs.

### 2.2 Stats resolver

- Add a single module (e.g. `js/stats.js`) that computes **effective** values from `config.js` plus the equipped items' effects.
- Every system that reads a stat an item can change MUST read it through the resolver, not straight from config.
- Effective stats are computed when a battle starts and stay fixed for that battle (equipment can't change mid-battle).

### 2.3 Starter items (12)

All values TUNING. Two per slot:

| Slot | Item | Effect |
|---|---|---|
| Crown | **Hawkfeather Crown** | Vultures last +4 s |
| Crown | **Talon Crown** | Vulture damage +3 |
| Grip | **Nutwood Grip** | Squirrels last +6 s |
| Grip | **Quickpaw Grip** | Squirrel speed ×1.4 and pickup range +10 px |
| Ferrule | **Mossheart Ferrule** | 35% chance a Bough Double doesn't use up its Bough (refunded when the job starts) |
| Ferrule | **Twin-root Ferrule** | +1 Bough Double at a time |
| Necklace | **Oakheart Amulet** | +20 max HP |
| Necklace | **Sap Pendant** | Regenerate 1 HP every 4 s during Combat (not above max) |
| Belt | **Wright's Belt** | Building and upgrading 25% faster (Bough Double jobs and timed-mode Prep builds) |
| Belt | **Forager's Belt** | Every search yields +1 of the spot's main resource (see below) |
| Shoes | **Fernstep Boots** | +15 steps |
| Shoes | **Hare's Shoes** | Travel costs 15% fewer steps (cost = `ceil(distance / (STEP_PX × 1.15))`) |

**Main resource** (for Forager's Belt): add a `mainResource` field to each feature type in config: Tree → Pits, Reed Patch → Reeds, Shrub → Feathers, Ruins → Pits, Pond → Reeds. The bonus is added to the rolled yield, so it also applies when the roll for that resource was 0, and shows in the floaters.

**Step mode is the main Prep mode.** Timed mode stays available for comparison, but items are designed for step mode first. Wright's Belt still matters in step mode through Bough Double jobs in Combat.

### 2.4 Looks

- Each **slot type** has a generic silhouette icon (crown charm, grip charm, ferrule charm, necklace, belt, shoes), used for empty slots and the "found" message.
- Each **item** has its own small procedural icon: its slot silhouette in its own colours, plus a simple distinguishing mark. Shared draw functions, as for other icons.

---

## 3. Finding items

### 3.1 Hidden item per battle

- When an encounter's layout is generated, pick **one** of its resource spots at random (seeded RNG) to hide a magic item, and pick which item.
- **Which item:** a random item from `ITEMS` that the player doesn't already own this run. If they own everything, no item is hidden.
- The item is **hidden**: nothing in the spot's look or tooltip reveals it.
- Applies to every Wilds and Fell Wilds encounter.

### 3.2 When found

Searching the spot works as usual (resources, floaters), and also:

- A centred message pops up: **"You found a Crown Charm!"**, using the slot type's label, **not** the item's name. It shows the slot-type silhouette, stays about 2.5 s, then fades. It doesn't pause the game or block input.
- A floater with the slot-type silhouette rises from the spot, after the resource floaters.
- A distinct "magic find" sound (a bright shimmer, distinct from the resource chime).
- A small slot-type icon appears in the HUD (e.g. beside the resource panel) as a reminder that an item was found this battle.

If the player never searches that spot, the item is lost for this battle.

### 3.3 Revealing the item

- The item is added to the run only on **Victory**. The Victory overlay shows `Found: Crown Charm`, with the line `Check your equipment on the map.`
- On **Defeat**, it's lost with the run.
- On the map, the new item appears in its slot's list marked **New**, and that slot shows a badge (§4.4).
- The item's name and effect are only shown once it's in the inventory on the map.

---

## 4. Map screen with equipment panel

### 4.1 Layout

```
┌────────────────────┬────────────────────────────────────────┐
│ EQUIPMENT PANEL    │ MAP                                    │
│                    │                                        │
│  Crown   ◯   ┌───┐   ◯ Necklace                            │
│  Grip    ◯   │ D │   ◯ Belt                                │
│  Ferrule ◯   └───┘   ◯ Shoes                               │
│                    │                                        │
│  Stats strip       │                                        │
│  Carried resources │                                        │
└────────────────────┴────────────────────────────────────────┘
```

- **Left panel:** `EQUIP_PANEL_WIDTH` (about 560 px) of the 1920 px stage, full height.
- **Map:** the remaining width. It does **not** scroll, so the whole map must fit (§4.5).

### 4.2 Druid portrait

- A large static Druid in the centre of the panel (about 260 × 400 px), facing the viewer, holding his staff in his right hand (on the viewer's left). Placeholder: a scaled-up, more detailed version of the Druid's draw function. It never changes with equipment.
- **Staff slots** in a column on the viewer's left, each level with its part of the staff: **Crown** at the top, **Grip** in the middle, **Ferrule** at the bottom. Thin connector lines join each slot to its spot on the staff.
- **Personal slots** in a column on the viewer's right, each level with its part of the body: **Necklace** at the neck, **Belt** at the waist, **Shoes** at the feet.
- Slots are circles of `EQUIP_SLOT_SIZE` (about 88 px) with a frame. An empty slot shows its faded slot-type silhouette; an equipped slot shows the item's icon.

### 4.3 Equipping

- **Click a slot** to open a popover beside it listing the run's items **for that slot**: icon, name, effect text. The equipped one is highlighted; new ones are marked **New**.
- **Click an item** to equip it, swapping out whatever was there.
- A **Remove** option empties the slot.
- If the player owns nothing for that slot, the popover says `No items yet` and a one-line hint: `Search resource spots in battle to find them.`
- Hovering an equipped slot shows its item's name and effect.
- Equipping is only possible on the map, between battles. It's free and can be changed any time there.

### 4.4 Badges

- A slot shows a small badge when the run owns an item for it that the player hasn't looked at yet. Opening that slot's popover clears its badge and the **New** marks.

### 4.5 Stats strip and resources

Below the portrait:

- **Stats strip:** the effective values of the stats equipment can change, e.g. `HP 80`, `Steps 90`, `Step length 25`, `Build speed 100%`, `Search bonus —`, `Regen —`. Values changed by equipment are highlighted (e.g. green) and show the base value on hover. Summon changes are shown in the item tooltips and the Druid's summon menu in battle (effective values).
- **Carried resources:** the four resource icons with the run's current counts.

### 4.6 Map fits without scrolling

- Shrink map nodes to `MAP_NODE_RADIUS` about 30 px (was 44) and use a smaller label font; long names may wrap onto two lines.
- Reposition all `MAP_NODES` within the map area. Row spacing MUST allow at least **9 rows** in the available height, even though there are only 3 now (so future rows fit). Put the current 3 rows at the bottom of the map area, leaving space above.
- Node tooltips, states, roads and the Druid token are unchanged apart from scale.

---

## 5. Run state

Extend the run state (M2a §2.2):

```js
run.items     = [ 'hawkfeatherCrown', ... ]   // owned this run
run.equipped  = { crown: 'hawkfeatherCrown', grip: null, ... }
run.seenItems = [ ... ]                       // for badges / New marks
```

- **Start again** (new run) clears all of these.
- `CARRY_DRUID_HP` interaction: max HP comes from the resolver. If HP carries over and max HP drops after unequipping an amulet, clamp current HP to the new max.

---

## 6. Debug

| Key | Action |
|---|---|
| `I` | On the map: add a random unowned item to the run. In battle: reveal which spot holds the item (shown in the debug overlay) |

Overlay (in battle, with `D`): mark the spot holding the hidden item.
Panel: owned items, equipped items, and every stat the resolver has changed (base → effective).

---

## 7. Tuning values

| Constant | Value |
|---|---|
| `ITEMS` | 12 starter items, §2.3 |
| `EQUIP_PANEL_WIDTH` | 560 px |
| `EQUIP_SLOT_SIZE` | 88 px |
| `MAP_NODE_RADIUS` | 30 px (was 44) |
| `ITEMS_PER_BATTLE` | 1 |
| Found message duration | 2.5 s |

---

## 8. Acceptance criteria

### Items and effects
- [ ] Six slot types and 12 starter items defined in config; effects use `add`/`mult` and are applied by one stats resolver.
- [ ] Every system affected by an item reads through the resolver; each starter item's effect is wired to the right system.
- [ ] Staff charms affect only their summon; personal equipment only passive stats.

### Finding
- [ ] Each battle hides one unowned item in one random resource spot, invisible until searched.
- [ ] Searching it shows "You found a [slot type]!", a floater, a sound and a HUD reminder, without naming the item.
- [ ] The item joins the run only on Victory; the overlay shows what type was found. Lost on Defeat or if never searched.

### Map and equipment panel
- [ ] Map screen has the equipment panel on the left and the map on the right, with no scrolling.
- [ ] Druid portrait with staff slots on the viewer's left (Crown, Grip, Ferrule, top to bottom) and personal slots on the right (Necklace, Belt, Shoes).
- [ ] Clicking a slot lists the run's items for that slot; clicking equips; Remove empties; swapping is free between battles.
- [ ] Badges and New marks work and clear when viewed.
- [ ] Stats strip shows effective values with changes highlighted; carried resources shown.
- [ ] Map nodes and rows are sized so 9 rows would fit; current nodes still work.

### Run
- [ ] Items and equipment last for the run and reset on Start again.
- [ ] Debug key `I`, overlay marker and panel figures work.
- [ ] Everything else still works in all levels and both Prep modes.
