// Pebble (spec §10.3): homing, bound to one target wolf, no physical collision.

export function createProjectile(id, from, targetId, damage) {
  return { id, x: from.x, y: from.y, targetId, damage, dirX: 0, dirY: 0 }; // dir: last travel direction (trail drawing)
}
