import { test, assertEqual, assertTrue } from './assert.js';
import { tileType, pathTiles, isInBounds } from '../js/map.js';

test('center is house', () => assertEqual(tileType(7, 7), 'house'));
test('house is 3x3', () => {
  for (let x = 6; x <= 8; x++) for (let z = 6; z <= 8; z++)
    assertEqual(tileType(x, z), 'house', `${x},${z}`);
});
test('north path tiles are path', () => {
  for (let z = 0; z <= 5; z++) assertEqual(tileType(7, z), 'path', `7,${z}`);
});
test('south, east, west paths exist', () => {
  assertEqual(tileType(7, 14), 'path');
  assertEqual(tileType(14, 7), 'path');
  assertEqual(tileType(0, 7), 'path');
});
test('corner is empty', () => assertEqual(tileType(0, 0), 'empty'));
test('out of bounds returns null', () => assertEqual(tileType(-1, 0), null));
test('isInBounds works', () => {
  assertTrue(isInBounds(0, 0));
  assertTrue(!isInBounds(15, 0));
});
test('pathTiles returns 24 tiles', () => assertEqual(pathTiles().length, 24));
