import { GRID_SIZE, HOUSE_CENTER } from './config.js';

export function isInBounds(x, z) {
  return x >= 0 && z >= 0 && x < GRID_SIZE && z < GRID_SIZE;
}

function isHouseTile(x, z) {
  return Math.abs(x - HOUSE_CENTER.x) <= 1 && Math.abs(z - HOUSE_CENTER.z) <= 1;
}

function isPathTile(x, z) {
  if (isHouseTile(x, z)) return false;
  if (x === HOUSE_CENTER.x && (z < HOUSE_CENTER.z - 1 || z > HOUSE_CENTER.z + 1)) return true;
  if (z === HOUSE_CENTER.z && (x < HOUSE_CENTER.x - 1 || x > HOUSE_CENTER.x + 1)) return true;
  return false;
}

export function tileType(x, z) {
  if (!isInBounds(x, z)) return null;
  if (isHouseTile(x, z)) return 'house';
  if (isPathTile(x, z)) return 'path';
  return 'empty';
}

export function pathTiles() {
  const out = [];
  for (let x = 0; x < GRID_SIZE; x++)
    for (let z = 0; z < GRID_SIZE; z++)
      if (tileType(x, z) === 'path') out.push({ x, z });
  return out;
}

export const SPAWN_POINTS = [
  { x: 5, z: 0, dir: 'south' },
  { x: 5, z: 10, dir: 'north' },
  { x: 0, z: 5, dir: 'east' },
  { x: 10, z: 5, dir: 'west' },
];

export function pathFromSpawn(spawn) {
  const points = [];
  if (spawn.dir === 'south') for (let z = 0; z <= 3; z++) points.push({ x: 5, z });
  if (spawn.dir === 'north') for (let z = 10; z >= 7; z--) points.push({ x: 5, z });
  if (spawn.dir === 'east')  for (let x = 0; x <= 3; x++) points.push({ x, z: 5 });
  if (spawn.dir === 'west')  for (let x = 10; x >= 7; x--) points.push({ x, z: 5 });
  points.push({ x: HOUSE_CENTER.x, z: HOUSE_CENTER.z });
  return points;
}

export function pathTilesForDir(dir) {
  const out = [];
  if (dir === 'south') for (let z = 0; z <= 3; z++) out.push({ x: 5, z });
  if (dir === 'north') for (let z = 10; z >= 7; z--) out.push({ x: 5, z });
  if (dir === 'east')  for (let x = 0; x <= 3; x++) out.push({ x, z: 5 });
  if (dir === 'west')  for (let x = 10; x >= 7; x--) out.push({ x, z: 5 });
  return out;
}
