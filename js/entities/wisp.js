// Slow Wisp (M2k §3): a drifting spark of slow magic. It appears at the Druid, floats in a straight
// line to the point the player chose at WISP_SPEED (ignoring terrain and enemies; nothing can
// attack or block it), and bursts there. Behaviour lives in wispSystem.js.

// from: where it appeared (above the Druid); to: the chosen point, where it bursts.
export function createWisp(id, from, to) {
  return {
    id,
    x: from.x,
    y: from.y,
    from,
    to,
    age: 0, // s in flight (the trail and the spiral wobble)
  };
}
