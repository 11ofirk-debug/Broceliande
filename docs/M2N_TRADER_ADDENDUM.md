# Broceliande — M2n Addendum: Wandering Trader

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2M`). Everything there still applies unless this document overrides it.
**Goal:** a new non-combat map node, the **Trader**, where the player swaps any resource for any other at prices that vary from trader to trader, from limited stock, in a full-screen scene.

> Same conventions: **MUST** / **SHOULD**, **TUNING** marks starting guesses. Balancing data lives in `data/*.csv` (edited in the Google Sheet, M2j). Ask rather than guess where this is silent.
>
> **Verification:** the designer tests by playing. Check the acceptance criteria by reading the code, not with automated or headless-browser tests (see `CLAUDE.md`).

---

## 0. Data changes and the sheet

As in M2k §0: Claude Code edits the CSVs, lists **exactly which tabs changed**, and **MUST NOT run the pull script** until the designer confirms the sheet is updated.

New tabs: `trade` and `traders`. Changed tabs: `globals` (new keys), `palettes` (new `trader` row), `sounds` (new rows). New tabs are added to the sheet with File → Import → Upload → **Insert new sheet(s)**; their gids then go into `data/sheet_sources.json`.

---

## 1. Design principle: places are full-screen scenes

- The **map** is the zoomed-out view of the world.
- Every node you travel to opens a **full-screen scene** of that place: a battle for Wilds, a shop for the Trader.
- Build the trader screen as a reusable **scene template** (background + characters + interaction area), so future non-combat nodes (rest sites, shrines, events) can reuse it.
- Entering and leaving use the same kind of transition as battles (a short fade or zoom).

---

## 2. Traders on the map

### 2.1 Placement

- `TRADERS_PER_RUN` (2) Trader nodes are **added** to the map each run, in addition to the existing nodes. No combat level is removed.
- They go into random rows (seeded), at most one per row, never in row 1 or 8. With 2 traders, place one in rows 2–4 and one in rows 5–7.
- The road generator (M2g) treats them like any other node: positions, non-crossing roads, degree limits, reachability, Fell-avoidance, variety and choice constraints all apply.
- Choosing a Trader means not fighting in that row: no battle, no hidden item, no drops. That's the trade-off.

### 2.2 Node look

- `NODE_TYPES.trader`: a warm-coloured circle (amber or gold rim instead of dark brown) with a **lantern** silhouette. Same size as Wilds nodes.
- **Completed** Trader nodes show a small gold coin mark instead of the red V.
- Node states (available, locked, bypassed) work as for every other node.

### 2.3 Tooltip with hints

```
Wandering Trader — Old Marrow
Cheap: Reeds
Pays well for: Shells
Has Boughs: 2
```

- Name, then the bargains: resources tagged cheap (§3.4) on a `Cheap:` line, and resources the trader pays well for on a `Pays well for:` line. Omit a line if nothing qualifies.
- The Bough stock line, since Boughs are the scarcest resource (omit if 0).
- Prices and stock are rolled when the map is generated (seeded), so the hints are accurate.

---

## 3. Pricing

### 3.1 Data

`trade` tab, one row per resource:

| `resource` | `baseValue` | `stockMin` | `stockMax` |
|---|---|---|---|
| `pits` | 1 | 10 | 20 |
| `feathers` | 1.5 | 6 | 12 |
| `shells` | 2 | 4 | 8 |
| `reeds` | 3 | 3 | 6 |
| `boughs` | 4 | 1 | 3 |

New `globals` keys:

| Key | Value |
|---|---|
| `TRADERS_PER_RUN` | 2 |
| `TRADE_PRICE_VARIATION` | 0.3 |
| `TRADE_MARGIN` | 0.1 |
| `TRADE_MAX_RATIO_TERM` | 5 |
| `TRADE_TAG_CHEAP` | 0.85 |
| `TRADE_TAG_PRICEY` | 1.15 |

All TUNING.

### 3.2 Each trader's prices

- For each resource, the trader rolls a price multiplier between `1 − TRADE_PRICE_VARIATION` and `1 + TRADE_PRICE_VARIATION` (0.7 to 1.3). Its value at this trader = `baseValue × multiplier`.
- **Margin:** the trader **sells** at value × (1 + `TRADE_MARGIN`) and **buys** at value × (1 − `TRADE_MARGIN`). So any round trip (A → B → A) always loses a little, and there's no exploit.

### 3.3 Trade ratios

Giving resource A to get resource B, the exact cost is:

```
A per B = (valueB × (1 + margin)) / (valueA × (1 − margin))
```

- Show and use it as a **simple whole-number ratio** `a A → b B`, with `a` and `b` between 1 and `TRADE_MAX_RATIO_TERM` (5).
- Pick the ratio closest to the exact cost **without being better for the player** (a / b ≥ exact cost).
- Trades happen in bundles of that ratio: you receive multiples of `b` and give multiples of `a`. No fractions, no leftovers.

### 3.4 Price tags

- On the trader's goods: **cheap** (green) if the resource's multiplier ≤ `TRADE_TAG_CHEAP`, **pricey** (red) if ≥ `TRADE_TAG_PRICEY`.
- On the player's pack: **sells well** (green) for multiplier ≥ `TRADE_TAG_PRICEY`, **sells poorly** (grey) for multiplier ≤ `TRADE_TAG_CHEAP`.

### 3.5 Stock

- The trader rolls a stock per resource between `stockMin` and `stockMax`.
- The player can receive at most the trader's current stock of a resource. At 0 it shows **Sold out** and can't be chosen as "get".
- Resources the player gives **join the trader's stock** (so undo always works, and it feels natural).
- The trader buys any amount.

---

## 4. The trader scene

### 4.1 State

New game state `TRADER`: `MAP → TRADER → MAP`. The HUD strip shows resources as in battle; the phase label reads `TRADER`.

### 4.2 Layout

```
┌───────────────────────────────────────────────────────────────┐
│  Old Marrow's Cart                   (forest clearing: cart,   │
│                                       lantern, campfire)       │
│        "Shells? I've a use for those."                         │
│                                                               │
│   Druid, with his satchel                   Trader, behind     │
│                                             his blanket        │
│   YOUR PACK                                 HIS GOODS          │
│   [pits 14] [reeds 2·sells well]   [pits·cheap 16] [reeds·pricey 4]
│   [feathers 5] [boughs 1]          [feathers 9] [boughs 2]     │
│   [shells 4·sells poorly]          [shells·cheap 6]            │
│                                                               │
│                ⚖   4 Pits  →  1 Reed                           │
│            [−]   get 2 Reeds   [+]  [Max]       [ TRADE ]      │
│            Pits 14 → 6         Reeds 2 → 4                     │
│                                                               │
│  [Undo last trade]                         [Back to the road]  │
└───────────────────────────────────────────────────────────────┘
```

- **Background:** a forest clearing drawn with the existing decoration system and a dedicated `trader` palette (warm evening tones), with a cart, a lantern and a small campfire. Placeholder art; keep clear zones (background, Druid, trader, goods) so sprites can replace it later.
- **Druid:** on the left, drawn with his existing draw function at a larger scale, with a satchel. The player's resources are laid out beside the satchel: icon, count and tag.
- **Trader:** on the right, a hooded pedlar with a big pack (new procedural draw function, with a colour variation per trader), behind a blanket where the goods lie: icon, stock and tag.
- **Name and dialogue:** the trader's name at the top (`Old Marrow's Cart`) and a speech line under it.
- **Centre:** a balance scale with the current ratio, the quantity controls and the Trade button.
- The level name label (bottom-left in battles) isn't shown here.

### 4.3 Trading

1. **Click a resource in your pack** (what you give) and **a resource on the blanket** (what you get). They can't be the same. The selected items are highlighted.
2. The scale shows the ratio in large type, e.g. `4 Pits → 1 Reed`.
3. **Quantity:** − / + change how many you **get**, in steps of `b`. **Max** sets the most you can get, limited by your resources and the trader's stock. The default when a pair is selected is one bundle.
4. **Preview:** both affected counts, before and after.
5. **Trade:** applies it. The scale tips briefly toward the trader, and a coin-clink sound plays. Make as many trades as you like.
6. Trade is disabled (with a short reason) if you can't afford one bundle or the trader is sold out.

### 4.4 Undo and leaving

- **Undo last trade** reverses the most recent trade (resources and stock). It can be pressed repeatedly to undo every trade made in this visit.
- **Back to the road** returns to the map. The Trader node becomes completed, and its `next` nodes become available.
- Once you leave, the visit is final.

### 4.5 Dialogue

`traders` tab, columns `kind`, `text`:

- `kind = name` rows: the pool of trader names (e.g. Old Marrow, Hettie Thistlewick, Brother Ash, Mag Fennick, Tom Nine-Toes, Sorrel the Pedlar).
- `kind = greet`, `trade`, `soldout`, `leave` rows: lines picked at random for those moments. Optional `{resource}` placeholder, filled with the resource involved (e.g. "Shells? I've a use for those.").

Claude Code writes a starter set: 6 names and 3–4 lines per kind, in a rustic, slightly wry tone. Two traders in the same run never share a name.

### 4.6 Sound

New `sounds` rows: `tradeComplete` (coin clink), `tradeUndo` (soft reverse clink), `traderGreet` (low murmur or a small bell on the cart), `soldOut` (dull thunk).

---

## 5. Run state

- Each Trader node's rolled multipliers, stock and name are stored in the run state when the map is generated.
- Trades update `run.inventory` directly.

---

## 6. Debug

| Key | Action |
|---|---|
| `Shift+T` (on the map) | Open a trader scene immediately with freshly rolled prices and stock, without needing a Trader node (doesn't change map progress) |

Panel (in the trader scene): each resource's multiplier, value, stock, and for the selected pair the exact cost vs the chosen ratio.

---

## 7. Acceptance criteria

### Map
- [ ] Two Trader nodes are added per run in random rows (one in rows 2–4, one in rows 5–7), connected by the road generator with all its constraints.
- [ ] Lantern icon in a warm circle; completed traders show a coin mark.
- [ ] Tooltip shows name, cheap resources, resources it pays well for, and Bough stock.

### Pricing
- [ ] Prices come from the `trade` tab with ±30% per resource per trader and a 10% margin, so round trips always lose.
- [ ] Ratios are whole numbers up to 5, never better for the player than the exact price; trades are in whole bundles.
- [ ] Stock is limited per resource, sold-out resources can't be bought, and given resources join the stock.
- [ ] Tags (cheap, pricey, sells well, sells poorly) follow §3.4.

### Scene
- [ ] Full-screen `TRADER` state with a fade-style transition, the clearing background, the Druid with his pack and the trader with his goods.
- [ ] Picking give and get, quantity in bundles with Max, preview, Trade, scale tip and sound all work.
- [ ] Undo reverses trades, repeatedly; Back to the road completes the node.
- [ ] Names and lines come from the `traders` tab; no duplicate names in a run.

### General
- [ ] Debug key and panel work.
- [ ] The report lists new and changed tabs; the pull script wasn't run.
- [ ] Everything else still works.
