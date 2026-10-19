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
| `R` | Restart encounter |
| `K` | Kill all living wolves (temporary, for testing Victory) |
| `G` | Grant +10 of each resource |
| `Esc` / right-click | Close menu, otherwise cancel the current action |

All tuning values and coordinates live in `js/config.js`.
