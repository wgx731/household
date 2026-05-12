import { test, assertEqual, assertTrue } from './assert.js';
import { tileType, pathTiles, isInBounds } from '../js/map.js';

test('center is house', () => assertEqual(tileType(5, 5), 'house'));
test('house is 3x3', () => {
  for (let x = 4; x <= 6; x++) for (let z = 4; z <= 6; z++)
    assertEqual(tileType(x, z), 'house', `${x},${z}`);
});
test('north path tiles are path', () => {
  for (let z = 0; z <= 3; z++) assertEqual(tileType(5, z), 'path', `5,${z}`);
});
test('south, east, west paths exist', () => {
  assertEqual(tileType(5, 10), 'path');
  assertEqual(tileType(10, 5), 'path');
  assertEqual(tileType(0, 5), 'path');
});
test('corner is empty', () => assertEqual(tileType(0, 0), 'empty'));
test('out of bounds returns null', () => assertEqual(tileType(-1, 0), null));
test('isInBounds works', () => {
  assertTrue(isInBounds(0, 0));
  assertTrue(!isInBounds(11, 0));
});
test('pathTiles returns 16 tiles', () => assertEqual(pathTiles().length, 16));
