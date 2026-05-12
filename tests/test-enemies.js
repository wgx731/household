import { test, assertEqual, assertTrue, assertClose } from './assert.js';
import { createEnemy, stepEnemy, damageEnemy } from '../js/enemies.js';

test('zombie starts at first path point', () => {
  const path = [{x:5,z:0},{x:5,z:1},{x:5,z:5}];
  const e = createEnemy('zombie', path);
  assertEqual(e.kind, 'ground');
  assertClose(e.pos.x, 5); assertClose(e.pos.z, 0);
});

test('zombie moves toward next path point', () => {
  const path = [{x:0,z:0},{x:0,z:5}];
  const e = createEnemy('zombie', path);
  stepEnemy(e, 1000);
  assertTrue(e.pos.z > 0);
});

test('zombie reaches house and marks reachedHouse', () => {
  const path = [{x:5,z:4},{x:5,z:5}];
  const e = createEnemy('zombie', path);
  stepEnemy(e, 10_000);
  assertTrue(e.reachedHouse);
});

test('alien flies straight to house', () => {
  const e = createEnemy('alien', [{x:0,z:0},{x:5,z:5}]);
  assertEqual(e.kind, 'air');
  stepEnemy(e, 500);
  assertTrue(e.pos.x > 0); assertTrue(e.pos.z > 0);
});

test('damage reduces hp; dead when <=0', () => {
  const e = createEnemy('zombie', [{x:0,z:0}]);
  damageEnemy(e, 5);
  assertTrue(!e.dead);
  damageEnemy(e, 100);
  assertTrue(e.dead);
});

test('mothership has high hp', () => {
  const e = createEnemy('mothership', [{x:0,z:0},{x:5,z:5}]);
  assertTrue(e.hp >= 200);
});
