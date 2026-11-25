import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildIndex } from './store.js';
import { lanternTide, tideState, laneEnds, laneEndPlaces, laneLabel, laneDaysShort, daysBetween } from './lanes.js';
import { KM_PER_AU } from './orbits.js';

const map = JSON.parse(readFileSync(new URL('../../data/map.json', import.meta.url), 'utf8'));
const index = buildIndex(map);
const { clock } = map;
const lane = (id) => map.lanes.find((l) => l.id === id);
const on = (year, day) => ({ year, day });

test('on the starting date the Lantern tide is open for 9 more days (D7)', () => {
  assert.deepEqual(lanternTide(clock), { open: true, cycleDay: 5, daysLeft: 9 });
});

test('the tide closes after cycle day 14 and reopens 73 days after it opened', () => {
  assert.deepEqual(lanternTide(clock, on(5029, 309)), { open: true, cycleDay: 14, daysLeft: 0 });
  assert.deepEqual(lanternTide(clock, on(5029, 310)), { open: false, cycleDay: 15, opensIn: 59 });
  // Across the new year: 5029 day 300 + 68 days = 5030 day 3, the cycle's last day.
  assert.equal(daysBetween(on(5029, 300), on(5030, 3)), 68);
  assert.deepEqual(lanternTide(clock, on(5030, 3)), { open: false, cycleDay: 73, opensIn: 1 });
  assert.deepEqual(lanternTide(clock, on(5030, 4)), { open: true, cycleDay: 1, daysLeft: 13 });
  // And before the anchor date.
  assert.deepEqual(lanternTide(clock, on(5029, 296)), { open: true, cycleDay: 1, daysLeft: 13 });
  assert.deepEqual(lanternTide(clock, on(5029, 295)), { open: false, cycleDay: 73, opensIn: 1 });
});

test('five lanes follow the Lantern tide; the Silent Mouths have an unknown one', () => {
  const tidal = map.lanes.filter((l) => tideState(l, clock));
  assert.equal(tidal.filter((l) => !tideState(l, clock).unknown).length, 5);
  assert.deepEqual(tidal.filter((l) => tideState(l, clock).unknown).map((l) => l.id), ['silent-mouth-1', 'silent-mouth-2', 'silent-mouth-3']);
});

test('every lane has two ends with positions', () => {
  for (const l of map.lanes) {
    const [a, b] = laneEnds(l, index);
    assert.ok(a.length === 3 && b.length === 3 && a.join() !== b.join(), l.id);
  }
});

test('labels give the name if it is a proper one, the days, and the tide', () => {
  assert.deepEqual(laneLabel(lane('orison-gloam'), clock), ['The Orison tide', '5 days', 'tide open, 9 more days']);
  assert.deepEqual(laneLabel(lane('ostrom-tallis'), clock), ['1 day']);
  assert.deepEqual(laneLabel(lane('sable-tarn'), clock), ['The Sable Run', '10–15 days · drifting']);
  assert.deepEqual(laneLabel(lane('silent-mouth-1'), clock), ['Silent Mouth 1', 'days unknown · one-way · silent', 'tide unknown']);
  assert.deepEqual(laneLabel(lane('pale-furnace'), clock, on(5029, 320)), ['5 days', 'tide closed, opens in 49 days']);
});

test('the short form is just the days', () => {
  assert.equal(laneDaysShort(lane('ostrom-tallis')), '1 d');
  assert.equal(laneDaysShort(lane('sable-tarn')), '10–15 d');
  assert.equal(laneDaysShort(lane('silent-mouth-2')), '? d');
});

test('lane ends sit on their lane-mouth bodies', () => {
  const [a, b] = laneEndPlaces(lane('ostrom-tallis'), index, clock);
  assert.deepEqual(a.anchor, index.byId.get('ostrom-system').pos);
  assert.ok(Math.abs(Math.hypot(...a.offset) - 2.6 * KM_PER_AU) < 1); // the Tallis mouth at Ostrom, 2.6 AU out
  assert.ok(Math.abs(Math.hypot(...b.offset) - 2.2 * KM_PER_AU) < 1); // the Ostrom mouth at Tallis, 2.2 AU out
  // The Silent Mouths start in the Quiet (no system) and end near Ostrom's gate.
  const [q, o] = laneEndPlaces(lane('silent-mouth-1'), index, clock);
  assert.deepEqual(q, { anchor: index.byId.get('quiet').pos, offset: [0, 0, 0] });
  assert.ok(Math.abs(Math.hypot(...o.offset) - 19 * KM_PER_AU) < 0.03 * KM_PER_AU);
});
