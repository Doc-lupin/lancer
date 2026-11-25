// Lane facts for the views: where each end is, the tide on a given date, and
// the text for lanes mode. Plain functions on map data.

import { displayName } from './names.js';
import { daysBetween, daysSinceEpoch, bodyOffsetKm } from './orbits.js';

export { daysBetween };

// The Lantern tide on `date` (default: the clock's current date).
// Cycle days run 1..cycleDays; the tide is open on days 1..openDays (D7).
export function lanternTide(clock, date = clock.current) {
  const { cycleDays, openDays, anchor } = clock.lanternTide;
  const n = daysBetween(anchor.date, date, clock.daysPerYear);
  const cycleDay = ((((anchor.cycleDay - 1 + n) % cycleDays) + cycleDays) % cycleDays) + 1;
  return cycleDay <= openDays
    ? { open: true, cycleDay, daysLeft: openDays - cycleDay }
    : { open: false, cycleDay, opensIn: cycleDays - cycleDay + 1 };
}

// null for a lane that isn't tidal; otherwise its tide, or { unknown: true }.
export function tideState(lane, clock, date) {
  if (!lane.tidal) return null;
  if (lane.tidal.cycle === 'lantern') return lanternTide(clock, date);
  return { unknown: true };
}

// Rough positions of a lane's two ends in light-years: the system at each
// end, or the region where an end has no system (the Silent Mouths in the Quiet).
export function laneEnds(lane, index) {
  const at = (end) => (end.system ? index.byId.get(end.system).pos : index.byId.get(end.region).pos);
  return [at(lane.from), at(lane.to)];
}

// Exact ends on a given date, as places (anchor in ly, offset in km): the
// lane-mouth body where there is one (task 2.9), else the system's center,
// else the region's center.
export function laneEndPlaces(lane, index, clock, date) {
  const days = daysSinceEpoch(clock, date);
  const at = (end) => {
    if (end.mouth) {
      const mouth = index.byId.get(end.mouth);
      return { anchor: [...index.byId.get(mouth.system).pos], offset: bodyOffsetKm(mouth, index, days) };
    }
    const pos = end.system ? index.byId.get(end.system).pos : index.byId.get(end.region).pos;
    return { anchor: [...pos], offset: [0, 0, 0] };
  };
  return [at(lane.from), at(lane.to)];
}

export function laneDays(lane) {
  if (lane.daysRange) return `${lane.daysRange[0]}–${lane.daysRange[1]} days`;
  if (lane.days == null) return 'days unknown';
  return lane.days === 1 ? '1 day' : `${lane.days} days`;
}

// The short form for a crowded screen: "5 d", "10–15 d", "? d".
export function laneDaysShort(lane) {
  if (lane.daysRange) return `${lane.daysRange[0]}–${lane.daysRange[1]} d`;
  return lane.days == null ? '? d' : `${lane.days} d`;
}

// Lines of text for lanes mode: a proper name if the lane has one, the days,
// and what is unusual about it.
export function laneLabel(lane, clock, date) {
  const lines = [];
  const name = displayName(lane.name);
  if (!name.includes(' – ')) lines.push(name);
  const facts = [laneDays(lane)];
  if (lane.oneWay) facts.push('one-way');
  if (lane.drifting) facts.push('drifting');
  if (lane.silent) facts.push('silent');
  lines.push(facts.join(' · '));
  const tide = tideState(lane, clock, date);
  if (tide?.unknown) lines.push('tide unknown');
  else if (tide?.open) lines.push(tide.daysLeft === 0 ? 'tide open, last day' : `tide open, ${tide.daysLeft} more day${tide.daysLeft === 1 ? '' : 's'}`);
  else if (tide) lines.push(`tide closed, opens in ${tide.opensIn} day${tide.opensIn === 1 ? '' : 's'}`);
  return lines;
}
