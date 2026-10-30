// Damage and death: turrets, pebbles and Toader pellets (spec §10, M1f §6), enemies attacking the Druid (§12.5).
// Vulture pecks and blocking live in vultureSystem.js and use damageEnemy from here.
// Every enemy type goes through the same code; per-type values come from ENEMY_TYPES.

import * as C from '../config.js';
import { EnemyState, AttackState, enemyType, remainingDistance } from '../entities/enemy.js';
import { turretType, turretRange, turretDamage, turretFireInterval, turretMuzzle } from '../entities/turret.js';
import { createProjectile } from '../entities/projectile.js';
import { dropLoot } from './dropSystem.js';
import { createCloud, isInsideCloud } from './cloudSystem.js';
import { isBeingUpgraded } from './doubleSystem.js';
import { events } from '../events.js';

const TIMER_EPSILON = 1e-9; // s, so timers built from 1/60 s steps fire on time

// ---------------------------------------------------------------------------
// Turrets (§10.2)
// ---------------------------------------------------------------------------

// The in-range enemy with the least remaining lane distance to the Druid (enemies already
// at the Druid count as 0), whatever its type (M1e §3.4). Ties go to the nearer one.
function selectTarget(game, turret) {
  const range = turretRange(turret);
  let best = null;
  let bestRemaining = Infinity;
  let bestDist = Infinity;
  for (const enemy of game.enemies) {
    const dist = Math.hypot(enemy.x - turret.x, enemy.y - turret.y);
    if (dist > range) continue;
    const remaining = remainingDistance(enemy);
    if (remaining < bestRemaining || (remaining === bestRemaining && dist < bestDist)) {
      best = enemy;
      bestRemaining = remaining;
      bestDist = dist;
    }
  }
  return best;
}

function turnToward(turret, target, dt) {
  const desired = Math.atan2(target.y - turret.y, target.x - turret.x);
  const diff = Math.atan2(Math.sin(desired - turret.angle), Math.cos(desired - turret.angle));
  const maxTurn = C.TURRET_TURN_SPEED * dt;
  turret.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
}


export function updateTurrets(game, dt) {
  for (const turret of game.turrets) {
    turret.cooldown -= dt;
    // No firing while a Bough Double upgrades it (§11.2, M1i §2.5). It stays ready, so a cancel resumes firing immediately.
    if (isBeingUpgraded(game, turret.slotIndex)) {
      turret.cooldown = Math.max(0, turret.cooldown);
      turret.targetId = null;
      continue;
    }
    const cloud = turretType(turret.type).attack === 'cloud';
    const target = cloud ? selectCloudTarget(game, turret) : selectTarget(game, turret);
    turret.targetId = target ? target.id : null;
    if (!target) {
      turret.cooldown = Math.max(0, turret.cooldown); // stays ready while there is no target
      continue;
    }

    turnToward(turret, target, dt);
    if (turret.cooldown > 0) continue;
    game.projectiles.push(createProjectile(game.nextEntityId++, turretMuzzle(turret), target.id, turretDamage(turret),
      cloud ? 'pellet' : 'pebble', turret.type, turret.level));
    events.emit('turretFired', { type: turret.type, x: turret.x, y: turret.y });
    turret.lastFireTime = game.combatTime;
    turret.cooldown += turretFireInterval(turret); // carry the remainder so the rate is exact
  }
}

// Poison Toader targeting (M1f §6.3): among enemies in range, prefer those not already inside
// an active cloud, then the least remaining lane distance (ties: nearer). If every enemy in
// range is already in a cloud, the second rule alone.
function selectCloudTarget(game, turret) {
  const range = turretRange(turret);
  let best = null;
  let bestKey = null;
  for (const enemy of game.enemies) {
    const dist = Math.hypot(enemy.x - turret.x, enemy.y - turret.y);
    if (dist > range) continue;
    if (enemy.flying && !C.CLOUDS_HIT_FLYERS) continue; // M2h §3.4: Toaders don't target flyers
    const key = [isInsideCloud(game, enemy) ? 1 : 0, remainingDistance(enemy), dist];
    if (!best || key[0] < bestKey[0] || (key[0] === bestKey[0] && (key[1] < bestKey[1] || (key[1] === bestKey[1] && key[2] < bestKey[2])))) {
      best = enemy;
      bestKey = key;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Pebbles (§10.3): homing; vanish without damage if the target died first.
// ---------------------------------------------------------------------------
export function updateProjectiles(game, dt) {
  const remaining = [];
  for (const p of game.projectiles) {
    const pellet = p.kind === 'pellet';
    const step = turretType(p.source).projectileSpeed * dt; // pebble or pellet speed, per turret type
    const target = game.enemies.find((e) => e.id === p.targetId);
    if (target) {
      // Remember where the target was: a pellet bursts there if it dies in flight (M1f §6.4).
      p.lastX = target.x;
      p.lastY = target.y;
      p.lastHitHeight = enemyType(target).hitHeight;
    } else if (!pellet || p.lastX === null) {
      continue; // pebble: target gone, it disappears
    }

    const tx = target ? target.x : p.lastX;
    const ty = (target ? target.y : p.lastY) - p.lastHitHeight;
    const dist = Math.hypot(tx - p.x, ty - p.y);
    if (dist <= step) {
      if (pellet) {
        // Impact: damage the target if it is still alive, and a cloud bursts on the ground there.
        if (target) damageEnemy(game, target, p.damage, `${p.source}:impact:${p.level}`);
        createCloud(game, p.lastX, p.lastY, p.source, p.level);
      } else {
        damageEnemy(game, target, p.damage, `${p.source}:impact:${p.level}`);
      }
      continue;
    }
    p.dirX = (tx - p.x) / dist;
    p.dirY = (ty - p.y) / dist;
    p.x += p.dirX * step;
    p.y += p.dirY * step;
    remaining.push(p);
  }
  game.projectiles = remaining;
}

// source: what dealt it, '<turretType>:impact:<level>', '<turretType>:cloud:<level>' or
// 'squirrel', for the debug panel's damage figures (M1f §7, M1h §4). Only damage actually taken
// is counted (no overkill). Every damage source goes through here, so armor (M2l §1.3, the Grim
// Bear's Thick hide) applies to all of them: each hit loses `armor`, but never below 1 (a hit of 1
// or less stays as it is). A reduced hit throws a small grey spark.
export function damageEnemy(game, enemy, damage, source = null) {
  const armor = enemyType(enemy).armor ?? 0;
  const dealt = armor > 0 ? Math.min(damage, Math.max(1, damage - armor)) : damage;
  if (dealt < damage) {
    game.traitStats.armorBlocked += damage - dealt;
    game.armorSparks.push({ x: enemy.x, y: enemy.y - enemyType(enemy).hitHeight * 0.6, age: 0 });
  }
  if (source) recordDamage(game, source, Math.min(dealt, Math.max(0, enemy.hp)));
  enemy.hp -= dealt;
  enemy.lastHitTime = game.combatTime;
  if (enemy.hp <= 0) killEnemy(game, enemy);
}

// After one of its bites or blows lands on anything (M2l §1.3, the Grim Stirge's Bloodsucker):
// heals its type's lifesteal, up to its max HP, with a tiny red sparkle.
export function lifestealOnBite(game, enemy) {
  const heal = Math.min(enemyType(enemy).lifesteal ?? 0, enemy.maxHp - enemy.hp);
  if (heal <= 0) return;
  enemy.hp += heal;
  game.traitStats.lifestealHealed += heal;
  game.healSparkles.push({ enemyId: enemy.id, age: 0 });
}

function recordDamage(game, source, amount) {
  game.damageStats[source] = (game.damageStats[source] ?? 0) + amount;
}

// ---------------------------------------------------------------------------
// Enemies attacking the Druid (§12.5), each with its type's damage and interval
// ---------------------------------------------------------------------------
export function updateMelee(game, dt) {
  for (const enemy of game.enemies) {
    if (enemy.state !== EnemyState.BITING) continue;
    if (enemy.blockedBy !== null) continue; // attacking a Vulture instead; Druid attacks pause
    const t = enemyType(enemy);
    if (t.windupTime) continue; // wind-up attackers: updateWindupAttacks
    enemy.biteTimer += dt;
    if (enemy.biteTimer >= t.attackInterval) {
      enemy.biteTimer -= t.attackInterval;
      enemy.bites++;
      enemy.lastBiteTime = game.combatTime;
      game.druidHp = Math.max(0, game.druidHp - t.damage);
      game.druidLastHitTime = game.combatTime;
      lifestealOnBite(game, enemy);
      events.emit('enemyAttacked', { type: enemy.type, target: 'druid' });
    }
  }
}

// ---------------------------------------------------------------------------
// Wind-up attacks (M2c §2.5): enemies with a windupTime (the Ogre) attack the Druid and the
// summons blocking them (Vultures, Squirrels) with one readable sequence: wind-up, then a blow
// whose damage lands at that moment. The interval is measured between blows. Its target is the
// blocker if held up, else the Druid if it stands at its melee slots. If that target dies or
// leaves during the wind-up, the blow lands on nothing; the next wind-up picks the current one.
// ---------------------------------------------------------------------------
function currentAttackTarget(enemy) {
  if (enemy.blockedBy !== null) return { kind: 'summon', id: enemy.blockedBy };
  if (enemy.state === EnemyState.BITING) return { kind: 'druid' };
  return null;
}

function summonById(game, id) {
  return game.vultures.find((v) => v.id === id) ?? game.squirrels.find((s) => s.id === id) ?? null;
}

export function updateWindupAttacks(game, dt) {
  for (const enemy of game.enemies) {
    const t = enemyType(enemy);
    if (!t.windupTime) continue;
    if (enemy.attack === AttackState.READY) {
      // Counts up to the moment it may wind up, then waits there for a target.
      enemy.sinceBlow = Math.min(enemy.sinceBlow + dt, t.attackInterval - t.windupTime);
      const target = currentAttackTarget(enemy);
      if (!target || enemy.sinceBlow < t.attackInterval - t.windupTime - TIMER_EPSILON) continue;
      enemy.attack = AttackState.WINDUP;
      enemy.windupElapsed = 0;
      enemy.windupTarget = target;
      events.emit('enemyWindup', { type: enemy.type, x: enemy.x, y: enemy.y });
      continue;
    }
    // WINDUP
    enemy.windupElapsed += dt;
    if (enemy.windupElapsed < t.windupTime - TIMER_EPSILON) continue;
    blow(game, enemy, t);
  }
}

// The blow: damage to the wind-up's target if it is still there and still this enemy's target.
// Dust ring at the target (or in front of the club if it hit nothing), flash, screen shake.
// Splash (M2l §1.3, the Grim Ogre's Crushing blow): a blow that lands also hits every other
// summon within splashRadius of its target for splashRatio × its damage (never the Druid, who is
// only hurt as the target), and its dust ring spreads to splashRadius.
function blow(game, enemy, t) {
  const aim = enemy.windupTarget;
  const now = currentAttackTarget(enemy);
  const same = now && now.kind === aim.kind && now.id === aim.id;
  let at = { x: enemy.x + enemy.facing * enemy.radius * 1.1, y: enemy.y + enemy.radius * 0.4 };
  let landed = false;
  if (same && aim.kind === 'druid') {
    game.druidHp = Math.max(0, game.druidHp - t.damage);
    game.druidLastHitTime = game.combatTime;
    at = { ...game.scene.level.druidPos };
    landed = true;
    events.emit('enemyAttacked', { type: enemy.type, target: 'druid' });
  } else if (same) {
    const unit = summonById(game, aim.id);
    if (unit && unit.hp > 0) {
      unit.hp -= t.damage;
      unit.lastHitTime = game.combatTime;
      at = { x: unit.x, y: unit.y };
      landed = true;
      events.emit('enemyAttacked', { type: enemy.type, target: 'summon' });
    }
  }
  if (!same) events.emit('enemyAttacked', { type: enemy.type, target: 'nothing' });
  if (landed) {
    lifestealOnBite(game, enemy);
    if (t.splashRatio) splash(game, at, aim.kind === 'summon' ? aim.id : null, t);
  }
  game.dustRings.push({ x: at.x, y: at.y, age: 0, radius: landed && t.splashRatio ? t.splashRadius : C.OGRE_DUST_RADIUS });
  game.shake = { age: 0 };
  enemy.attack = AttackState.READY;
  enemy.sinceBlow = 0;
  enemy.windupTarget = null;
  enemy.lastBlowTime = game.combatTime;
  enemy.lastBiteTime = game.combatTime;
  enemy.bites++;
}

// Splash damage on the Vultures and Squirrels near a blow's target, except the target itself.
// They flash like any hit.
function splash(game, at, targetId, t) {
  const damage = t.damage * t.splashRatio;
  for (const unit of [...game.vultures, ...game.squirrels]) {
    if (unit.id === targetId || unit.hp <= 0) continue;
    if (Math.hypot(unit.x - at.x, unit.y - at.y) > t.splashRadius) continue;
    game.traitStats.splashDamage += Math.min(damage, unit.hp);
    unit.hp -= damage;
    unit.lastHitTime = game.combatTime;
  }
}

// Remove an enemy immediately, release all its melee slots and roll its drops (§12.5, §13,
// M1d §1, M1e §3.3, §3.5).
export function killEnemy(game, enemy) {
  const i = game.enemies.indexOf(enemy);
  if (i === -1) return;
  game.enemies.splice(i, 1);
  for (const s of enemy.slots) game.meleeSlots[s].enemyId = null;
  game.enemyCounts[enemy.type].alive--;
  game.enemyCounts[enemy.type].killed++;
  events.emit('enemyDied', { type: enemy.type, x: enemy.x, y: enemy.y });
  dropLoot(game, enemy);
}
