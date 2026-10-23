# Broceliande — M1 prototype

Browser prototype of a survival tower-defence roguelite. Milestone 1: one playable forest encounter.
Spec: `docs/M1_SPEC.md`.

## Running

ES modules don't load from `file://`, so serve the folder locally. From the project root:

```
python -m http.server 8000
```

Then open http://localhost:8000 in Chrome.

## Debug keys

| Key | Action |
|---|---|
| `D` | Toggle debug overlay and panel |
| `P` | Pause / resume simulation |
| `1` / `2` / `4` | Simulation speed ×1 / ×2 / ×4 |
| `N` | Skip to next phase (Prep → Combat) |
| `R` | Restart encounter (keeps the current Prep mode; new layout unless `DEBUG_SEED` is set) |
| `L` | Restart with a new seed and layout, even if `DEBUG_SEED` is set — see `docs/M1C_LAYOUT_ADDENDUM.md` |
| `M` | Toggle Prep mode (steps / timed) and restart — see `docs/M1B_STEPS_ADDENDUM.md` |
| `U` | Undo the last step-mode Prep move (restores steps, position, resources, marker) |
| `K` | Kill all living enemies (extra, not in the spec; handy for checking Victory) |
| `B` | Spawn a Bear at the start of a random lane (Combat only) — see `docs/M1E_ADDENDUM.md` |
| `G` | Grant +10 of each resource |
| `X` | Toggle wolf drop chances between ×1 and ×`DEBUG_DROP_MULT` (×10) — see `docs/M1D_DROPS_SQUIRREL_ADDENDUM.md` |
| `Esc` / right-click | Close menu, otherwise cancel the current action |

All tuning values and coordinates live in `js/config.js`.
