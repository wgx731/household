import { test, assertEqual, assertTrue } from './assert.js';
import { createGame } from '../js/game.js';

test('new game has full HP and start coins', () => {
  const g = createGame();
  assertEqual(g.houseHp, 100);
  assertTrue(g.economy.coins > 0);
  assertEqual(g.state, 'idle');
  assertEqual(g.wave, 0);
});

test('startNextWave advances wave', () => {
  const g = createGame();
  g.startNextWave();
  assertEqual(g.wave, 1);
  assertEqual(g.state, 'wave');
  assertTrue(g.queuedEnemies.length > 0);
});

test('cannot place tower on path; can on empty', () => {
  const g = createGame();
  assertEqual(g.placeTower('cannon', { x: 5, z: 0 }), false);
  assertEqual(g.placeTower('cannon', { x: 0, z: 0 }), true);
});

test('cannot place trap on empty; can on path', () => {
  const g = createGame();
  assertEqual(g.placeTower('trap', { x: 0, z: 0 }), false);
  assertEqual(g.placeTower('trap', { x: 5, z: 0 }), true);
});

test('losing all hp ends game', () => {
  const g = createGame();
  g.houseHp = 0;
  g.tick(16);
  assertEqual(g.state, 'lost');
});

test('finishing wave 10 with mothership defeated wins', () => {
  const g = createGame();
  g.wave = 10;
  g.state = 'wave';
  g.queuedEnemies = [];
  g.activeEnemies = [];
  g.bossDefeated = true;
  g.tick(16);
  assertEqual(g.state, 'won');
});
