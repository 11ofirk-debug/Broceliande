// Bough Double data (M1i §2). Behaviour lives in the double system.

// Explicit per-Double state machine:
//   WISP    → a wisp is flying from the Druid to the target (DOUBLE_WISP_TIME); no job time yet
//   WORKING → standing beside the target, crafting; the job completes after `duration`
// A Double is removed when its job completes or is cancelled.
export const DoubleState = Object.freeze({
  WISP: 'WISP',
  WORKING: 'WORKING',
});

// job: 'build' (turretType says what) or 'upgrade' (to toLevel). paid: the full cost taken at
// the start, refunded on cancel.
export function createDouble(id, { slotIndex, job, turretType, toLevel, duration, paid }) {
  return {
    id,
    slotIndex,
    job,
    turretType,
    toLevel,
    paid,
    state: DoubleState.WISP,
    wispElapsed: 0,   // s of the wisp's flight
    elapsed: 0,       // s of job time, counted while WORKING
    duration,         // s, the build time or the next level's upgrade time
    swings: 0,        // crafting swings so far (one craft hit each)
  };
}
