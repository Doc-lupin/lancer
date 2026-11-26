// Exposure (task B0.4): one linear multiplier on light from the world —
// lit globes, air, clouds, rings, nebulae and dust, the sky. Chart marks
// (lanes, orbit lines, icons, place markers, star dots, body discs) don't
// take it, so it never changes their contrast. Shaders share this uniform
// object; the store's `exposure` sets it (Output.jsx redraws on a change).

import { useMap } from '../data/store.js';

export const EXPOSURE = { value: useMap.getState().exposure };
useMap.subscribe((s) => { EXPOSURE.value = s.exposure; });
