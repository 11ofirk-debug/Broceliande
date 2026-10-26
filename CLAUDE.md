# Broceliande — Project Instructions

Browser prototype of a survival tower-defence roguelite. Current goal: **Milestone 2**, a run made of several encounters on a level map.

## Source of truth
- The full specification is `docs/M1_SPEC.md`. Read the sections relevant to the current task before writing code.
- The addenda in `docs/` extend and override it. Read them in order: M1, then M1B–M1J, then M2A. A later document overrides an earlier one where they differ.
- If the spec and a prompt conflict, ask before proceeding.
- If the spec is silent and no reasonable judgement call is possible, ask rather than guess. If you do make a judgement call, mention it in your summary.

## Hard rules
- HTML, CSS and vanilla JavaScript ES modules only. No frameworks, libraries, bundlers or build step.
- No external assets. All visuals are drawn programmatically.
- **Every gameplay number and scene coordinate lives in `js/config.js`.** Never hard-code tuning values in systems. Label starting guesses with a `// TUNING` comment.
- Keep simulation, rendering and UI separate: config → simulation → rendering → UI.
- Simulation uses a fixed timestep and simulation time only (never wall-clock).
- All randomness goes through the seeded RNG in `js/rng.js`.
- Game state and Druid action state are explicit state machines.
- Do not implement anything listed as out of scope in the spec, and do not add systems the spec doesn't require.
- Prefer readable, simple code over clever or production-scale architecture. Don't optimise prematurely.

## Running
ES modules need a server. From the project root:
```
python -m http.server 8000
```
Open http://localhost:8000 in Chrome.

## Working style
- Work in the phases given in the prompts. At the end of each phase, stop and give me:
  1. a short summary of what was built,
  2. any judgement calls you made,
  3. exact steps to test it in the browser.
- Don't start the next phase until I say so.
- Check the browser console for errors before reporting a phase complete.
