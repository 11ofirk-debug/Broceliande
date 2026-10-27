// Enemy–enemy collision (spec §12.4): ground enemies are circles of their collision radius
// (M2d §3.2) that must never overlap; flying enemies (M2h §3.1) are ignored here. Movement systems
// propose a position and ask here whether it is free.
// The check is in world space, so it also covers lanes converging near the Druid.

// Whether two enemies ignore each other: one is passing through the other (unstick rule, M2d §3.4).
export function passing(a, b) {
  return a.passThroughId === b.id || b.passThroughId === a.id;
}

// Returns the first other enemy that a circle of `radius` at (x, y) would overlap, or null.
// self: the enemy being moved (skipped, along with any enemy it is passing through), or null
// when testing a spawn point.
export function findBlocker(enemies, self, x, y, radius) {
  for (const other of enemies) {
    if (other === self || other.flying || (self && passing(self, other))) continue; // flyers pass over (M2h §3.1)
    if (Math.hypot(other.x - x, other.y - y) < radius + other.collisionRadius) return other;
  }
  return null;
}
