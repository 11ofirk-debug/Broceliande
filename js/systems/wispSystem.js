// Slow Wisp flight and burst (M2k §3.3). On arrival every enemy whose centre is within
// WISP_BURST_RADIUS of the point is slowed, flyers (Stirges) included; the burst is instant and
// leaves only a fading visual (game.wispBursts, aged by updateEffects).

import * as C from '../config.js';
import { applySlow } from './statusSystem.js';
import { events } from '../events.js';

export function updateWisps(game, dt) {
  const arrived = [];
  for (const w of game.wisps) {
    w.age += dt;
    const dx = w.to.x - w.x;
    const dy = w.to.y - w.y;
    const dist = Math.hypot(dx, dy);
    const step = C.WISP_SPEED * dt;
    if (step >= dist) {
      w.x = w.to.x;
      w.y = w.to.y;
      arrived.push(w);
    } else {
      w.x += (dx / dist) * step;
      w.y += (dy / dist) * step;
    }
  }
  for (const w of arrived) burst(game, w);
  if (arrived.length) game.wisps = game.wisps.filter((w) => !arrived.includes(w));
}

function burst(game, w) {
  let slowed = 0;
  for (const e of game.enemies) {
    if (e.hp <= 0) continue;
    if (Math.hypot(e.x - w.x, e.y - w.y) > C.WISP_BURST_RADIUS) continue;
    applySlow(game, e, C.WISP_SLOW_MULT, C.WISP_SLOW_DURATION);
    slowed++;
  }
  game.wispBursts.push({ x: w.x, y: w.y, age: 0, seed: w.id });
  events.emit('wispBursts', { x: w.x, y: w.y, slowed });
}
