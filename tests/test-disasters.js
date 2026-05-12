import { test, assertEqual, assertTrue } from './assert.js';
import { applyEarthquake, applyFlood, endFlood, applyVolcano, endVolcano } from '../js/disasters.js';
import { createTower } from '../js/towers.js';

test('earthquake destroys up to N towers', () => {
  const towers = [createTower('cannon',{x:1,z:1}), createTower('turret',{x:2,z:2}), createTower('cannon',{x:3,z:3})];
  applyEarthquake(towers, () => 0);
  const destroyed = towers.filter(t => t.destroyed).length;
  assertTrue(destroyed >= 1 && destroyed <= 2);
});

test('flood disables traps; endFlood re-enables them', () => {
  const traps = [createTower('trap',{x:5,z:0}), createTower('trap',{x:5,z:10})];
  applyFlood(traps);
  assertTrue(traps.every(t => t.disabled));
  endFlood(traps);
  assertTrue(traps.every(t => !t.disabled));
});

test('volcano blocks one direction; endVolcano clears it', () => {
  const state = { blockedDirs: new Set() };
  applyVolcano(state, () => 0);
  assertEqual(state.blockedDirs.size, 1);
  endVolcano(state);
  assertEqual(state.blockedDirs.size, 0);
});
