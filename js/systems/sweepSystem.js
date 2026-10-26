// Field sweep on Victory (M2d §2): every drop still on the field (landed or mid-air) flies to its
// HUD resource counter during the ENDING delay and is added to the inventory as it lands, before
// the carry-over is saved. Timing is simulation time (endElapsed); the renderer draws the flights.
// Nothing is swept on Defeat.

import * as C from '../config.js';
import { emptyResources } from '../resources.js';
import { events } from '../events.js';

const EPSILON = 1e-9;

// Where a drop is drawn now (matches drawDrop): its resting spot once landed, else along its pop arc.
function dropPosition(drop) {
  const flight = drop.age - drop.delay;
  if (flight >= C.DROP_POP_TIME) return { x: drop.x, y: drop.y };
  const p = Math.max(0, flight) / C.DROP_POP_TIME;
  return {
    x: drop.fromX + (drop.x - drop.fromX) * p,
    y: drop.fromY + (drop.y - drop.fromY) * p - 4 * C.DROP_POP_HEIGHT * p * (1 - p),
  };
}

// Victory begins: the drops become sweep items, nearest the HUD (smallest y) first, launched
// SWEEP_STAGGER apart; with many items the stagger shrinks so the last lands SWEEP_END_MARGIN
// before END_DELAY runs out.
export function startSweep(game) {
  const items = game.drops
    .map((d) => ({ resource: d.resource, ...dropPosition(d) }))
    .sort((a, b) => a.y - b.y);
  const room = Math.max(0, C.END_DELAY - C.SWEEP_END_MARGIN - C.SWEEP_FLIGHT_TIME);
  const stagger = items.length > 1 ? Math.min(C.SWEEP_STAGGER, room / (items.length - 1)) : 0;
  items.forEach((item, i) => {
    item.launchAt = i * stagger;
    item.arriveAt = item.launchAt + C.SWEEP_FLIGHT_TIME;
    item.arrived = false;
  });
  game.drops = [];
  game.sweep = { items, gathered: emptyResources() };
}

function arrive(game, item) {
  item.arrived = true;
  game.resources[item.resource]++;
  game.sweep.gathered[item.resource]++;
  game.hudPulses[item.resource] = game.endElapsed;
  events.emit('resourcesGained', { resources: [item.resource] }); // the chime, under its spam limits
}

// During ENDING: items whose flight is over land on their counters.
export function updateSweep(game) {
  if (!game.sweep) return;
  for (const item of game.sweep.items) {
    if (!item.arrived && game.endElapsed >= item.arriveAt - EPSILON) arrive(game, item);
  }
}

// Before the Victory overlay and the carry-over: anything still in flight is counted now, so the
// inventory is always final (M2d §2.2).
export function finishSweep(game) {
  if (!game.sweep) return;
  for (const item of game.sweep.items) if (!item.arrived) arrive(game, item);
  game.lastSweep = { items: game.sweep.items.length, gathered: { ...game.sweep.gathered } };
}
