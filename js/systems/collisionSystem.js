// Enemy–enemy collision (spec §12.4): enemies are circles of their own radius that must
// never overlap. Movement systems propose a position and ask here whether it is free.
// The check is in world space, so it also covers lanes converging near the Druid.

// Returns the first other enemy that a circle of `radius` at (x, y) would overlap, or null.
// self: the enemy being moved (skipped), or null when testing a spawn point.
export function findBlocker(enemies, self, x, y, radius) {
  for (const other of enemies) {
    if (other === self) continue;
    if (Math.hypot(other.x - x, other.y - y) < radius + other.radius) return other;
  }
  return null;
}
