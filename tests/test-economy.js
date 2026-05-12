import { test, assertEqual, assertTrue } from './assert.js';
import { createEconomy } from '../js/economy.js';

test('starts with start coins', () => {
  const e = createEconomy(50);
  assertEqual(e.coins, 50);
});
test('earn adds coins', () => {
  const e = createEconomy(10);
  e.earn(5);
  assertEqual(e.coins, 15);
});
test('canAfford checks cost', () => {
  const e = createEconomy(10);
  assertTrue(e.canAfford(10));
  assertTrue(!e.canAfford(11));
});
test('spend deducts on success and returns true', () => {
  const e = createEconomy(20);
  assertEqual(e.spend(15), true);
  assertEqual(e.coins, 5);
});
test('spend returns false when broke and does not deduct', () => {
  const e = createEconomy(5);
  assertEqual(e.spend(10), false);
  assertEqual(e.coins, 5);
});
