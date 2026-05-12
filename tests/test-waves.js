import { test, assertEqual, assertTrue } from './assert.js';
import { generateWave } from '../js/waves.js';

test('wave 1 is small', () => {
  const w = generateWave(1);
  assertEqual(w.zombies + w.aliens + w.mothership, 7);
  assertEqual(w.mothership, 0);
});
test('later waves are bigger', () => {
  const a = generateWave(1), b = generateWave(5);
  assertTrue(b.zombies + b.aliens > a.zombies + a.aliens);
});
test('wave 10 has a mothership', () => {
  const w = generateWave(10);
  assertEqual(w.mothership, 1);
});
test('out of range throws', () => {
  let threw = false;
  try { generateWave(0); } catch { threw = true; }
  assertTrue(threw);
});
