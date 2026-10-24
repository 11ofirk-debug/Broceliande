// Poison clouds (M1f §6.4): left where a Toader pellet bursts. Each cloud has its own tick timer
// from its creation: first tick at tickInterval, then every tickInterval while it lasts. On a
// tick, every enemy whose body overlaps the cloud takes tickDamage (centre distance ≤ cloud
// radius + enemy radius). Clouds stack, hurt only enemies, and freeze during ENDING (they are
// simply not updated); they are cleared when the encounter ends or restarts.
// A cloud copies the stats of the level its pellet was fired at (M1h §2.3), so upgrading the
// Toader changes only the clouds created after it.

import { cloudStats } from '../entities/turret.js';
import { damageEnemy } from './combatSystem.js';
import { events } from '../events.js';

const TICK_EPSILON = 1e-9; // s, so 0.8 s of 1/60 s steps ticks on time

export function createCloud(game, x, y, source, level) {
  const spec = { ...cloudStats(source, level) }; // { radius, duration, tickInterval, tickDamage }
  game.clouds.push({ id: game.nextEntityId++, x, y, source, level, spec, age: 0, ticks: 0 });
  events.emit('cloudBurst', { x, y });
}

function overlaps(cloud, enemy) {
  return Math.hypot(enemy.x - cloud.x, enemy.y - cloud.y) <= cloud.spec.radius + enemy.radius;
}

export function isInsideCloud(game, enemy) {
  return game.clouds.some((c) => overlaps(c, enemy));
}

export function updateClouds(game, dt) {
  for (const cloud of game.clouds) {
    const spec = cloud.spec;
    cloud.age += dt;
    while (cloud.age >= (cloud.ticks + 1) * spec.tickInterval - TICK_EPSILON && (cloud.ticks + 1) * spec.tickInterval <= spec.duration) {
      cloud.ticks++;
      for (const enemy of game.enemies.filter((e) => overlaps(cloud, e))) {
        damageEnemy(game, enemy, spec.tickDamage, `${cloud.source}:cloud:${cloud.level}`);
      }
    }
  }
  game.clouds = game.clouds.filter((c) => c.age < c.spec.duration - TICK_EPSILON);
}
