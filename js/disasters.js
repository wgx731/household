import { EARTHQUAKE_DESTROYS } from './config.js';

const DIRS = ['north', 'south', 'east', 'west'];

export function applyEarthquake(towers, rng = Math.random) {
  const alive = towers.filter(t => !t.destroyed);
  const count = Math.min(EARTHQUAKE_DESTROYS, alive.length);
  for (let i = 0; i < count; i++) {
    const pick = alive[Math.floor(rng() * alive.length)];
    if (pick && !pick.destroyed) pick.destroyed = true;
  }
}

export function applyFlood(traps) {
  for (const t of traps) if (t.type === 'trap') t.disabled = true;
}
export function endFlood(traps) {
  for (const t of traps) if (t.type === 'trap') t.disabled = false;
}

export function applyVolcano(state, rng = Math.random) {
  const dir = DIRS[Math.floor(rng() * DIRS.length)];
  state.blockedDirs.add(dir);
}
export function endVolcano(state) {
  state.blockedDirs.clear();
}

export function pickRandomDisaster(rng = Math.random) {
  const all = ['earthquake', 'flood', 'volcano'];
  return all[Math.floor(rng() * all.length)];
}
