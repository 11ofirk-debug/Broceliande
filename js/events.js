// Event bus (M1g §3.2). Gameplay emits named events ("enemyDied", "turretFired", …); feedback
// such as sound subscribes. Listeners must never change the simulation.

const listeners = new Map(); // event name → [fn]

export const events = {
  on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, []);
    listeners.get(name).push(fn);
  },
  emit(name, data = {}) {
    for (const fn of listeners.get(name) ?? []) fn(data);
  },
};
