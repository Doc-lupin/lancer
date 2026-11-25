// Display names. Invented objects end their name with " (WIP)" in the data;
// the interface shows the name without it, as tools/describe_world.py does.

const WIP = /\s*\(WIP\)$/;

export function isWip(name) {
  return WIP.test(name);
}

export function displayName(name) {
  return name.replace(WIP, '').trim();
}
