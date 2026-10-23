// Druid melee (M1e §2, animated strike M1f §4): while idle in Combat, the Druid strikes the
// weakest enemy attacking him, one impact every DRUID_MELEE_INTERVAL.
//
// A strike is wind-up → swing + lunge → impact → recover. Damage lands at the impact, so a
// strike starts STRIKE_LEAD before the interval is up and impacts land DRUID_MELEE_INTERVAL
// apart. game.druidStrike holds the strike in progress (read by the renderer; visual timing).

import * as C from '../config.js';
import { ActionState } from '../states.js';
import { EnemyState } from '../entities/enemy.js';
import { damageEnemy } from './combatSystem.js';
import { addFloatingText } from '../effects.js';

const TIMER_EPSILON = 1e-9; // s
export const STRIKE_LEAD = C.STRIKE_WINDUP_TIME + C.STRIKE_SWING_TIME; // s from strike start to impact

// Valid targets (§2.3): enemies in a Druid melee slot actually biting him. Enemies still
// walking to their slot, queuing, or held up attacking a summon are not.
function isAttacker(e) {
  return e.state === EnemyState.BITING && e.blockedBy === null;
}

// The weakest attacker: lowest HP, then attacking longest, then lowest entity ID.
export function druidMeleeTarget(game) {
  let best = null;
  for (const w of game.enemies) {
    if (!isAttacker(w)) continue;
    if (!best
      || w.hp < best.hp
      || (w.hp === best.hp && (w.bitingSince < best.bitingSince
        || (w.bitingSince === best.bitingSince && w.id < best.id)))) {
      best = w;
    }
  }
  return best;
}

// fromReady: the strike was waiting for an attacker with the timer already full, so its
// impact comes a full STRIKE_LEAD after it starts; otherwise it lands when the timer is up.
function startStrike(game, target, fromReady) {
  const dx = target.x - C.DRUID_POS.x;
  const dy = target.y - C.DRUID_POS.y;
  const len = Math.hypot(dx, dy) || 1;
  game.druidStrike = { elapsed: 0, targetId: target.id, dirX: dx / len, dirY: dy / len, fromReady, impactAt: null };
}

function impactDue(game, strike) {
  return strike.fromReady
    ? strike.elapsed >= STRIKE_LEAD - TIMER_EPSILON
    : game.druidMeleeTimer >= C.DRUID_MELEE_INTERVAL - TIMER_EPSILON;
}

// Impact: the original target if it is still attacking, otherwise the current weakest
// attacker; wasted if none (M1f §4). Damage reveals its HP bar; a kill counts normally and
// rolls drops (damageEnemy → killEnemy). Effects: swoosh arc, spark, white flash, knock-back.
function impact(game) {
  const strike = game.druidStrike;
  strike.impactAt = strike.elapsed; // the renderer plays the recovery from here
  game.druidMeleeTimer = 0; // the interval is measured between impacts
  let target = game.enemies.find((e) => e.id === strike.targetId);
  if (!target || !isAttacker(target)) target = druidMeleeTarget(game);
  if (!target) return; // wasted
  const dx = target.x - C.DRUID_POS.x;
  const dy = target.y - C.DRUID_POS.y;
  const len = Math.hypot(dx, dy) || 1;
  strike.dirX = dx / len;
  strike.dirY = dy / len;
  strike.targetId = target.id;
  game.swipes.push({ x1: C.DRUID_POS.x, y1: C.DRUID_POS.y, x2: target.x, y2: target.y, age: 0 });
  game.sparks.push({ x: target.x, y: target.y - target.radius * 0.8, age: 0 });
  target.knockDir = { x: strike.dirX, y: strike.dirY };
  target.lastKnockTime = game.combatTime; // visual knock-back only; position is not touched
  addFloatingText(game, `-${C.DRUID_MELEE_DAMAGE}`, target.x, target.y - target.radius * 2, true);
  damageEnemy(game, target, C.DRUID_MELEE_DAMAGE);
}

// §2.2: the timer counts only while the Druid is IDLE. Whenever an upgrade or summon placement
// ends (completed or cancelled) it restarts from zero, and a strike in progress is dropped.
// Once the timer is ready the strike waits for an attacker, then plays out to its impact.
export function updateDruidMelee(game, dt) {
  if (game.action.state !== ActionState.IDLE) {
    game.druidWasBusy = true;
    game.druidMeleeTargetId = null;
    game.druidStrike = null;
    return;
  }
  if (game.druidWasBusy) {
    game.druidWasBusy = false;
    game.druidMeleeTimer = 0;
  }
  game.druidMeleeTimer = Math.min(game.druidMeleeTimer + dt, C.DRUID_MELEE_INTERVAL);

  const strike = game.druidStrike;
  if (strike) {
    strike.elapsed += dt;
    if (strike.impactAt === null && impactDue(game, strike)) impact(game);
    if (strike.impactAt !== null && strike.elapsed >= strike.impactAt + C.STRIKE_RECOVER_TIME - TIMER_EPSILON) game.druidStrike = null;
  }

  const target = druidMeleeTarget(game);
  const pending = game.druidStrike && game.druidStrike.impactAt === null;
  game.druidMeleeTargetId = pending ? game.druidStrike.targetId : (target ? target.id : null);
  // Start the next strike so that its impact lands when the interval is up (or a full
  // wind-up and swing after an attacker arrives, if the strike has been waiting).
  if (!game.druidStrike && target && game.druidMeleeTimer >= C.DRUID_MELEE_INTERVAL - STRIKE_LEAD - TIMER_EPSILON) {
    startStrike(game, target, game.druidMeleeTimer >= C.DRUID_MELEE_INTERVAL - TIMER_EPSILON);
  }
}
