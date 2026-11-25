import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { useMap, buildIndex, parentChain, isHidden } from './store.js';
import { displayName, isWip } from './names.js';

const map = JSON.parse(readFileSync(new URL('../../data/map.json', import.meta.url), 'utf8'));

test('the store loads map.json', () => {
  useMap.getState().setMap(map);
  const { status, map: m, index } = useMap.getState();
  assert.equal(status, 'ready');
  assert.equal(m.regions.length, 24);
  assert.equal(m.systems.length, 155);
  assert.equal(m.bodies.length, 329);
  assert.equal(index.byId.get('tallis').name, 'Tallis');
});

// Unmapped stars belong to no region (region: null in the schema), so their
// chains stop at the system.
test('every system, body, place and area chains up to a region or an unmapped star', () => {
  const { map: m, index } = useMap.getState();
  let unmapped = 0;
  for (const kind of ['systems', 'bodies', 'places', 'areas']) {
    for (const obj of m[kind]) {
      const top = parentChain(index, obj.id).at(-1);
      const topKind = index.kindOf.get(top);
      if (topKind === 'systems') {
        assert.equal(index.byId.get(top).region, null, `${obj.id} ends at ${top}`);
        if (kind === 'systems') unmapped++;
      } else {
        assert.equal(topKind, 'regions', `${obj.id} ends at ${top}`);
      }
    }
  }
  assert.equal(unmapped, 40);
});

test('a moon chains through its planet', () => {
  const { index } = useMap.getState();
  assert.deepEqual(parentChain(index, 'hob'), ['hob', 'cairn-iii', 'cairn-system', 'cairn']);
  assert.ok(index.childrenOf.get('cairn-iii').includes('hob'));
});

test('display names drop a trailing (WIP)', () => {
  assert.equal(displayName('Cinder II (WIP)'), 'Cinder II');
  assert.equal(displayName('The Marrow'), 'The Marrow');
  assert.equal(displayName('Ostrom – Tallis'), 'Ostrom – Tallis');
  assert.ok(isWip('Tew II (WIP)'));
  assert.ok(!isWip('Tallis'));
});

const tiny = {
  regions: [{ id: 'r', visibility: 'all' }],
  systems: [{ id: 's', region: 'r', visibility: 'all' }],
  bodies: [
    { id: 'p', system: 's', visibility: 'gm' },
    { id: 'm', system: 's', parent: 'p', visibility: 'all' },
  ],
  places: [{ id: 'town', body: 'm', visibility: 'all' }],
};

test('player mode hides everything under a GM-only object', () => {
  const index = buildIndex(tiny);
  assert.ok(isHidden(index, 'town', true));
  assert.ok(isHidden(index, 'p', true));
  assert.ok(!isHidden(index, 's', true));
  assert.ok(!isHidden(index, 'town', false));
});

test('bad maps are refused', () => {
  assert.throws(() => buildIndex({ ...tiny, places: [{ id: 'r', body: 'm' }] }), /Duplicate id "r"/);
  assert.throws(() => buildIndex({ ...tiny, places: [{ id: 'x', body: 'nowhere' }] }), /parent "nowhere"/);
});
