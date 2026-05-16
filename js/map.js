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

const LAST = GRID_SIZE - 1;
const NEAR_LOW = HOUSE_CENTER.x - 2;
const NEAR_HIGH = HOUSE_CENTER.x + 2;

export const SPAWN_POINTS = [
  { x: HOUSE_CENTER.x, z: 0,    dir: 'south' },
  { x: HOUSE_CENTER.x, z: LAST, dir: 'north' },
  { x: 0,    z: HOUSE_CENTER.z, dir: 'east'  },
  { x: LAST, z: HOUSE_CENTER.z, dir: 'west'  },
];

export function pathFromSpawn(spawn) {
  const points = [];
  if (spawn.dir === 'south') for (let z = 0;    z <= NEAR_LOW;  z++) points.push({ x: HOUSE_CENTER.x, z });
  if (spawn.dir === 'north') for (let z = LAST; z >= NEAR_HIGH; z--) points.push({ x: HOUSE_CENTER.x, z });
  if (spawn.dir === 'east')  for (let x = 0;    x <= NEAR_LOW;  x++) points.push({ x, z: HOUSE_CENTER.z });
  if (spawn.dir === 'west')  for (let x = LAST; x >= NEAR_HIGH; x--) points.push({ x, z: HOUSE_CENTER.z });
  points.push({ x: HOUSE_CENTER.x, z: HOUSE_CENTER.z });
  return points;
}

export function pathTilesForDir(dir) {
  const out = [];
  if (dir === 'south') for (let z = 0;    z <= NEAR_LOW;  z++) out.push({ x: HOUSE_CENTER.x, z });
  if (dir === 'north') for (let z = LAST; z >= NEAR_HIGH; z--) out.push({ x: HOUSE_CENTER.x, z });
  if (dir === 'east')  for (let x = 0;    x <= NEAR_LOW;  x++) out.push({ x, z: HOUSE_CENTER.z });
  if (dir === 'west')  for (let x = LAST; x >= NEAR_HIGH; x--) out.push({ x, z: HOUSE_CENTER.z });
  return out;
}
