// Mouse / keyboard input and screen → world conversion (spec §3.4).

export function screenToWorld(clientX, clientY, stageEl, scale) {
  const rect = stageEl.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  };
}

// handlers: { onPointerDown(world, button), onPointerMove(world), onKeyDown(key) }
export function createInput(stageEl, canvasEl, getScale, handlers) {
  const mouse = { x: 0, y: 0, inside: false };

  canvasEl.addEventListener('mousedown', (e) => {
    const world = screenToWorld(e.clientX, e.clientY, stageEl, getScale());
    handlers.onPointerDown?.(world, e.button);
  });

  canvasEl.addEventListener('mousemove', (e) => {
    const world = screenToWorld(e.clientX, e.clientY, stageEl, getScale());
    mouse.x = world.x;
    mouse.y = world.y;
    mouse.inside = true;
    handlers.onPointerMove?.(world);
  });

  canvasEl.addEventListener('mouseleave', () => {
    mouse.inside = false;
  });

  // Right-click is used for cancelling, never the browser menu.
  stageEl.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    handlers.onKeyDown?.(e.key.length === 1 ? e.key.toLowerCase() : e.key, e); // e: e.g. shiftKey (Shift+R, M2a §8)
  });

  return { mouse };
}
