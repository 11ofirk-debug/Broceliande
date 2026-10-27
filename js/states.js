// Explicit state enums shared by simulation, rendering and UI (spec §6, §7.2).

export const GameState = Object.freeze({
  START: 'START',
  MAP: 'MAP',       // M2a §2: the level map between encounters; a node click starts its Prep
  PREP: 'PREP',
  COMBAT: 'COMBAT',
  ENDING: 'ENDING', // M1e §1: END_DELAY between Combat and the result; game.pendingResult holds it
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT',
});

// Prep variants (M1b addendum §2). Combat and everything after are identical in both.
export const PrepMode = Object.freeze({
  TIMED: 'timed',
  STEPS: 'steps',
});

// Druid action state, separate from the game state.
// Step-mode Prep uses only IDLE and TRAVELLING (M1b §5.7). In Combat the Druid is only IDLE or
// SUMMON_PLACEMENT and never leaves his main position (M1i §2.2): Bough Doubles do the building
// and upgrading, and SUMMON_PLACEMENT with target 'double' is their targeting mode.
export const ActionState = Object.freeze({
  IDLE: 'IDLE',
  SEARCHING: 'SEARCHING',
  BUILDING: 'BUILDING',
  TRAVELLING: 'TRAVELLING',
  SUMMON_PLACEMENT: 'SUMMON_PLACEMENT',
});

// Which game states each action state is allowed in (§7.2).
export const ACTION_ALLOWED_IN = Object.freeze({
  [ActionState.IDLE]: [GameState.PREP, GameState.COMBAT],
  [ActionState.SEARCHING]: [GameState.PREP],
  [ActionState.BUILDING]: [GameState.PREP],
  [ActionState.TRAVELLING]: [GameState.PREP],
  [ActionState.SUMMON_PLACEMENT]: [GameState.COMBAT],
});

// Wave sub-state within COMBAT (M2i §3.1): COUNTDOWN before wave 1, then WAVE and GAP in turn.
// Clearing the last wave ends Combat (ENDING → Victory).
export const WaveState = Object.freeze({
  COUNTDOWN: 'COUNTDOWN',
  WAVE: 'WAVE',
  GAP: 'GAP',
});
