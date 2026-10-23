// Projectiles (spec §10.3, M1f §6.4): homing, bound to one target, no physical collision.
//   kind 'pebble' (Sprinkler): vanishes if its target dies first.
//   kind 'pellet' (Toader): flies on to the target's last position and bursts into a cloud.
// source: the turret type that fired it (damage statistics, debug).

export function createProjectile(id, from, targetId, damage, kind = 'pebble', source = 'sprinkler') {
  return {
    id, kind, source, x: from.x, y: from.y, targetId, damage,
    dirX: 0, dirY: 0,       // last travel direction (trail drawing)
    lastX: null, lastY: null, // pellet: target's last known ground position (where it bursts if the target dies)
  };
}
