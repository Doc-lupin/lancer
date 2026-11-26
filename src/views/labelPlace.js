// Shared rules that keep name labels from jumping about as the view moves:
// a label tries the spot it had last frame before the others, labels already
// showing are placed before new ones, and labels fade rather than pop.

export const FADE = 'opacity 0.2s ease-out';

// Spot indices 0 … n − 1, with the one used last frame (if any) first.
export function spotOrder(prev, n) {
  const all = [...Array(n).keys()];
  return prev == null || prev >= n ? all : [prev, ...all.filter((k) => k !== prev)];
}

// 0 for a label showing last frame, 1 otherwise: a sort key.
export const wasShown = (el) => (el._shown ? 0 : 1);

// Show or hide a label, remembering its spot for next frame.
export function settle(el, box, spot) {
  el._shown = !!box;
  if (box) el._spot = spot;
  el.style.opacity = box ? '1' : '0';
}
