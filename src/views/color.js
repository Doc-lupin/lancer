// Colors for our own shaders (glows, lanes, icons, effects, bodies). They
// write straight to the screen with no color conversion, so they need the hex
// as it should look (sRGB), not three.js's linear working values. Without
// this, every color came out darker than written (task 2.9): a planet's
// #4d7a5c showed at about 40% brightness.

import * as THREE from 'three';

export function displayColor(hex, out = new THREE.Color()) {
  return out.set(hex).convertLinearToSRGB();
}
