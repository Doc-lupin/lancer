import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildIndex } from '../data/store.js';
import { buildTargets } from './mapTargets.js';
import { leaveDistance } from './camera/rig.js';
import { KM_PER_LY, KM_PER_AU } from './origin.js';

const map = JSON.parse(readFileSync(new URL('../../data/map.json', import.meta.url), 'utf8'));
const index = buildIndex(map);
const targets = buildTargets(map, index);

test('the Basin, 24 regions and all 155 systems become camera targets', () => {
  const kinds = { basin: 0, regions: 0, systems: 0 };
  for (const id of targets.keys()) kinds[id === 'basin' ? 'basin' : index.kindOf.get(id)]++;
  assert.deepEqual(kinds, { basin: 1, regions: 24, systems: 155 });
});

test('unmapped stars hang from the Basin; charted systems from their region', () => {
  for (const s of map.systems) {
    assert.equal(targets.get(s.id).parentId, s.charted ? s.region : 'basin', s.id);
  }
});

test('distances nest: each level is framed from farther out than the one below', () => {
  for (const [id, t] of targets) {
    assert.ok(t.minKm < t.viewKm, `${id}: closest ${t.minKm} is not inside the framing distance ${t.viewKm}`);
    if (t.parentId) assert.ok(leaveDistance(targets, id) > t.viewKm, `${id} would leave for its parent before it is framed`);
  }
  assert.ok(targets.get('basin').viewKm > 60 * KM_PER_LY);
  assert.ok(targets.get('tallis-system').viewKm > 5 * KM_PER_AU);
});

test('a rogue planet, wreck or structure at the center gives the system its size', () => {
  assert.equal(targets.get('gelid-system').radiusKm, 4100);
  assert.equal(targets.get('spine-system').radiusKm, 700);
  assert.equal(targets.get('orrery-system').radiusKm, 900);
});
