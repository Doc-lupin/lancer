// Picking the quality tier (task B0.6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectTier, TIERS, TIER_NAMES } from './quality.js';

function device({ coarse, memory, cores }) {
  globalThis.matchMedia = (q) => ({ matches: q === '(pointer: coarse)' && coarse });
  Object.defineProperty(globalThis, 'navigator', { value: { deviceMemory: memory, hardwareConcurrency: cores }, configurable: true });
}

test('a computer is high, a phone medium, an old phone low', () => {
  device({ coarse: false, memory: 8, cores: 8 });
  assert.equal(detectTier(), 'high');
  device({ coarse: true, memory: 8, cores: 8 });
  assert.equal(detectTier(), 'medium');
  device({ coarse: true, memory: 2, cores: 8 });
  assert.equal(detectTier(), 'low');
  device({ coarse: true, memory: undefined, cores: 2 });
  assert.equal(detectTier(), 'low');
  // A browser that tells nothing about memory or cores: a phone, not an old one.
  device({ coarse: true, memory: undefined, cores: undefined });
  assert.equal(detectTier(), 'medium');
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
