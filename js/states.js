// Explicit state enums shared by simulation, rendering and UI (spec §6, §7.2).

export const GameState = Object.freeze({
  START: 'START',
  PREP: 'PREP',
  COMBAT: 'COMBAT',
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT',
});

// Druid action state, separate from the game state.
export const ActionState = Object.freeze({
  IDLE: 'IDLE',
  SEARCHING: 'SEARCHING',
  BUILDING: 'BUILDING',
  UPGRADING: 'UPGRADING',
  SUMMON_PLACEMENT: 'SUMMON_PLACEMENT',
});

// Which game states each action state is allowed in (§7.2).
export const ACTION_ALLOWED_IN = Object.freeze({
  [ActionState.IDLE]: [GameState.PREP, GameState.COMBAT],
  [ActionState.SEARCHING]: [GameState.PREP],
  [ActionState.BUILDING]: [GameState.PREP],
  [ActionState.UPGRADING]: [GameState.COMBAT],
  [ActionState.SUMMON_PLACEMENT]: [GameState.COMBAT],
});
