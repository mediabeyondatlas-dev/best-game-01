// Emberlight — keyboard and mouse, turned into game actions.
// One file, one job: the world never reads keys directly; it reads the
// direction vector and the action flags this module hands it each frame.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_FLARE = 8;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouse = { x: 0, y: 0, inside: false };
  let clicked = false;
  let clickPoint = null;

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  window.addEventListener('keydown', (event) => {
    const key = keyName(event);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(key);
    if (key === ' ' || key === 'Enter') actions |= ACTION_CONFIRM;
    if (key === 'p' || key === 'Escape') actions |= ACTION_PAUSE;
    if (key === 'Shift' || key === ' ') actions |= ACTION_DASH;
    if (key === 'f' || key === 'e') actions |= ACTION_FLARE;
  });
  window.addEventListener('keyup', (event) => keys.delete(keyName(event)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top, inside: true };
  });
  canvas.addEventListener('mouseleave', () => { mouse.inside = false; });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    clickPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    clicked = true;
    if (event.button === 2) actions |= ACTION_FLARE;
    else actions |= ACTION_DASH;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function direction() {
    let x = 0;
    let y = 0;
    if (keys.has('a') || keys.has('arrowleft')) x -= 1;
    if (keys.has('d') || keys.has('arrowright')) x += 1;
    if (keys.has('w') || keys.has('arrowup')) y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  return {
    direction,
    // Actions queued since the last read; reading clears them.
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
    // The last click point (canvas pixels), if the player clicked.
    takeClick() {
      const out = clicked ? clickPoint : null;
      clicked = false;
      clickPoint = null;
      return out;
    },
    get mouse() { return mouse; },
    isDown(key) { return keys.has(key); },
  };
}
