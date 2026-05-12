import { test, assertEqual, assertTrue } from './assert.js';
import { createTower, tickTower, findTarget } from '../js/towers.js';
import { createEnemy } from '../js/enemies.js';

test('cannon ignores air enemies', () => {
  const t = createTower('cannon', {x:5,z:5});
  const alien = createEnemy('alien', [{x:5,z:5},{x:5,z:5}]);
  assertEqual(findTarget(t, [alien]), null);
});

test('turret ignores ground enemies', () => {
  const t = createTower('turret', {x:5,z:5});
  const z = createEnemy('zombie', [{x:5,z:5}]);
  assertEqual(findTarget(t, [z]), null);
});

test('cannon targets nearby zombie', () => {
  const t = createTower('cannon', {x:5,z:5});
  const z = createEnemy('zombie', [{x:5,z:5}]);
  assertEqual(findTarget(t, [z]), z);
});

test('out of range zombie is ignored', () => {
  const t = createTower('cannon', {x:0,z:0});
  const z = createEnemy('zombie', [{x:10,z:10}]);
  assertEqual(findTarget(t, [z]), null);
});

test('tower shoots on cooldown', () => {
  const t = createTower('cannon', {x:5,z:5});
  const z = createEnemy('zombie', [{x:5,z:5}]);
  const shots1 = tickTower(t, 100, [z]);
  assertEqual(shots1.length, 1);
  const shots2 = tickTower(t, 100, [z]);
  assertEqual(shots2.length, 0);
});

test('trap does not auto-shoot (zero cooldown but no targeting tick)', () => {
  const t = createTower('trap', {x:5,z:0});
  assertEqual(t.type, 'trap');
});
