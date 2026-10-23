// Poison clouds (M1f §6.4): left where a Toader pellet bursts. Each cloud has its own tick timer
// from its creation: first tick at tickInterval, then every tickInterval while it lasts. On a
// tick, every enemy whose body overlaps the cloud takes tickDamage (centre distance ≤ cloud
// radius + enemy radius). Clouds stack, hurt only enemies, and freeze during ENDING (they are
// simply not updated); they are cleared when the encounter ends or restarts.

import { turretType } from '../entities/turret.js';
import { damageEnemy } from './combatSystem.js';

const TICK_EPSILON = 1e-9; // s, so 0.8 s of 1/60 s steps ticks on time

function cloudSpec(cloud) {
  return turretType(cloud.source).cloud;
}

export function createCloud(game, x, y, source) {
  game.clouds.push({ id: game.nextEntityId++, x, y, source, age: 0, ticks: 0 });
}

function overlaps(cloud, enemy) {
  return Math.hypot(enemy.x - cloud.x, enemy.y - cloud.y) <= cloudSpec(cloud).radius + enemy.radius;
}

export function isInsideCloud(game, enemy) {
  return game.clouds.some((c) => overlaps(c, enemy));
}

export function updateClouds(game, dt) {
  for (const cloud of game.clouds) {
    const spec = cloudSpec(cloud);
    cloud.age += dt;
    while (cloud.age >= (cloud.ticks + 1) * spec.tickInterval - TICK_EPSILON && (cloud.ticks + 1) * spec.tickInterval <= spec.duration) {
      cloud.ticks++;
      for (const enemy of game.enemies.filter((e) => overlaps(cloud, e))) {
        damageEnemy(game, enemy, spec.tickDamage, `${cloud.source}:cloud`);
      }
    }
  }
  game.clouds = game.clouds.filter((c) => c.age < cloudSpec(c).duration - TICK_EPSILON);
}
