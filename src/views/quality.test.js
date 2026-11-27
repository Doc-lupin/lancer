// Picking the quality tier (task B0.6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectTier, TIERS, TIER_NAMES } from './quality.js';

test('without a choice the tier is high, on any device (BD13, BD15)', () => {
  globalThis.matchMedia = () => ({ matches: true });
  Object.defineProperty(globalThis, 'navigator', { value: { deviceMemory: 2, hardwareConcurrency: 2 }, configurable: true });
  assert.equal(detectTier(), 'high');
});

test('every tier has every setting, and cost grows with the tier', () => {
  const keys = Object.keys(TIERS.high).sort();
  for (const t of TIER_NAMES) assert.deepEqual(Object.keys(TIERS[t]).sort(), keys, t);
  assert.deepEqual(TIER_NAMES, ['low', 'medium', 'high', 'ultra']);
  for (let i = 1; i < TIER_NAMES.length; i++) {
    const a = TIERS[TIER_NAMES[i - 1]], b = TIERS[TIER_NAMES[i]];
    assert.ok(b.skyStars >= a.skyStars && b.surfaceSize[0] >= a.surfaceSize[0] && b.multisampling >= a.multisampling, TIER_NAMES[i]);
  }
  assert.equal(TIERS.low.bloom, false);
});
