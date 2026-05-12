# HouseHold Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3D tower defense browser game called HouseHold where the player defends a house from zombies, aliens, and natural disasters across 10 waves, ending with an Alien Mothership boss.

**Architecture:** Pure ES modules. Logic modules (config, map, waves, enemies, towers, disasters, economy, game) are framework-free and unit-tested in the browser. The renderer (`main.js`) uses Three.js loaded from a CDN and reads from the game state each frame. Tests run by opening `test.html` in Chrome.

**Tech Stack:** HTML, JavaScript ES modules, Three.js (CDN). No build tools, no npm, no server. Open `index.html` in Chrome to play. Open `test.html` to run tests.

---

## File Structure

```
index.html              Game entry page
test.html               Test runner page
js/
  config.js             Game constants (HP, cost, sizes, wave timing)
  map.js                Grid, paths, tile types
  waves.js              Wave composition generator
  economy.js            Coin tracking and purchases
  enemies.js            Enemy state and movement
  towers.js             Tower state, targeting, shooting cooldown
  disasters.js          Disaster events and effects
  game.js               Top-level game state machine
  ui.js                 HUD (DOM-based, on top of canvas)
  main.js               Three.js scene, render loop, input handling
tests/
  assert.js             Tiny test helper
  test-waves.js
  test-economy.js
  test-map.js
  test-enemies.js
  test-towers.js
  test-disasters.js
  test-game.js
```

Logic files never touch the DOM or Three.js. The renderer reads logic state. This keeps logic testable.

---

## Task 1: Project Skeleton and Test Runner

**Files:**
- Create: `index.html`
- Create: `test.html`
- Create: `tests/assert.js`

- [ ] **Step 1: Create `index.html`**

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>HouseHold</title>
  <style>
    body { margin: 0; background: #111; color: #fff; font-family: sans-serif; }
    canvas { display: block; }
  </style>
</head>
<body>
  <div id="hud"></div>
  <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
      }
    }
  </script>
  <script type="module" src="./js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `tests/assert.js`**

```js
const state = { passed: 0, failed: 0, results: [] };

export function test(name, fn) {
  try { fn(); state.passed++; state.results.push({ name, pass: true }); }
  catch (e) { state.failed++; state.results.push({ name, pass: false, error: e.message }); }
}

export function assertEqual(actual, expected, msg = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

export function assertTrue(cond, msg = '') {
  if (!cond) throw new Error(`${msg} expected true`);
}

export function assertClose(actual, expected, eps = 0.001, msg = '') {
  if (Math.abs(actual - expected) > eps) throw new Error(`${msg} expected ~${expected}, got ${actual}`);
}

export function report() {
  const el = document.getElementById('results');
  el.innerHTML = state.results.map(r =>
    `<div style="color:${r.pass ? '#5f5' : '#f55'}">${r.pass ? 'PASS' : 'FAIL'} ${r.name}${r.error ? ': ' + r.error : ''}</div>`
  ).join('') + `<hr><div><b>${state.passed} passed, ${state.failed} failed</b></div>`;
}
```

- [ ] **Step 3: Create `test.html`**

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>HouseHold Tests</title>
  <style>
    body { font-family: monospace; background: #111; color: #fff; padding: 1em; }
    div { padding: 2px 0; }
  </style>
</head>
<body>
  <h1>HouseHold Tests</h1>
  <div id="results">Running...</div>
  <script type="module">
    import { report } from './tests/assert.js';
    // Test modules will be added here as we build them.
    report();
  </script>
</body>
</html>
```

- [ ] **Step 4: Open both pages in Chrome**

Open `index.html`: black page, no errors in console.
Open `test.html`: shows "0 passed, 0 failed".

- [ ] **Step 5: Create `js/main.js` placeholder**

```js
// Three.js setup will go here in Task 11.
console.log('HouseHold loaded');
```

- [ ] **Step 6: Reload `index.html`**

Console shows `HouseHold loaded`. No errors.

- [ ] **Step 7: Commit (skip if not a git repo)**

```bash
git init && git add . && git commit -m "feat: project skeleton with test runner"
```

If the directory is not a git repo and the user has not asked to initialize one, just stop. Mention that `git init` was skipped.

---

## Task 2: Config Module

**Files:**
- Create: `js/config.js`

- [ ] **Step 1: Write `js/config.js`**

```js
export const GRID_SIZE = 11;
export const TILE_SIZE = 1;
export const HOUSE_CENTER = { x: 5, z: 5 };
export const HOUSE_MAX_HP = 100;

export const START_COINS = 50;

export const ENEMIES = {
  zombie: { hp: 20, speed: 0.5, reward: 5, kind: 'ground' },
  alien:  { hp: 30, speed: 1.2, reward: 8, kind: 'air' },
  mothership: { hp: 500, speed: 0.3, reward: 100, kind: 'air' },
};

export const TOWERS = {
  cannon: { cost: 20, range: 3, cooldownMs: 1200, damage: 12, targets: 'ground' },
  turret: { cost: 25, range: 4, cooldownMs: 400,  damage: 5,  targets: 'air'    },
  trap:   { cost: 10, range: 0, cooldownMs: 0,    damage: 25, targets: 'ground', placement: 'path' },
};

export const WAVE_BREAK_MS = 8000;
export const MAX_WAVES = 10;

export const DISASTER_DURATION_MS = 30_000;
export const EARTHQUAKE_DESTROYS = 2;
```

- [ ] **Step 2: Smoke check**

In the browser console on `test.html`: `import('./js/config.js').then(m => console.log(m.GRID_SIZE))`. Expected: `11`.

- [ ] **Step 3: Commit**

```bash
git add js/config.js && git commit -m "feat: config module"
```

---

## Task 3: Map Module (TDD)

**Files:**
- Create: `js/map.js`
- Create: `tests/test-map.js`

The map is an 11x11 grid. Four straight paths to the center: N path is column 5 rows 0..4. House occupies a 3x3 area centered at (5,5).

Tile types: `'path'`, `'house'`, `'empty'`.

- [ ] **Step 1: Write the failing tests**

`tests/test-map.js`:
```js
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
```

- [ ] **Step 2: Wire test into `test.html`**

Add this line inside the `<script type="module">` block in `test.html`, before `report()`:

```js
await import('./tests/test-map.js');
```

(Make the script async by adding `async` keyword? No — the script tag is already a module which supports top-level await. Just write `await import(...)`.)

- [ ] **Step 3: Verify tests fail**

Reload `test.html`. Expected: tests fail because `map.js` does not exist.

- [ ] **Step 4: Write `js/map.js`**

```js
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
```

- [ ] **Step 5: Verify tests pass**

Reload `test.html`. Expected: 7 passed, 0 failed.

- [ ] **Step 6: Commit**

```bash
git add js/map.js tests/test-map.js test.html
git commit -m "feat: map module with paths and tile types"
```

---

## Task 4: Wave Generator (TDD)

**Files:**
- Create: `js/waves.js`
- Create: `tests/test-waves.js`

Wave N has roughly `5 + N*2` enemies. Aliens grow with wave number. Wave 10 includes the Mothership.

- [ ] **Step 1: Write the failing tests**

`tests/test-waves.js`:
```js
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
```

- [ ] **Step 2: Wire into `test.html`**

Add: `await import('./tests/test-waves.js');`

- [ ] **Step 3: Verify tests fail**

Reload. Expected: tests fail (module missing).

- [ ] **Step 4: Write `js/waves.js`**

```js
import { MAX_WAVES } from './config.js';

export function generateWave(n) {
  if (n < 1 || n > MAX_WAVES) throw new Error(`wave out of range: ${n}`);
  if (n === MAX_WAVES) {
    return { zombies: 8, aliens: 5, mothership: 1 };
  }
  const total = 5 + n * 2;
  const aliens = Math.floor(n / 2);
  return { zombies: total - aliens, aliens, mothership: 0 };
}

export function totalEnemies(wave) {
  return wave.zombies + wave.aliens + wave.mothership;
}
```

- [ ] **Step 5: Verify tests pass**

Reload `test.html`. Expected: previous + 4 passing.

- [ ] **Step 6: Commit**

```bash
git add js/waves.js tests/test-waves.js test.html
git commit -m "feat: wave generator with boss on wave 10"
```

---

## Task 5: Economy Module (TDD)

**Files:**
- Create: `js/economy.js`
- Create: `tests/test-economy.js`

- [ ] **Step 1: Write the failing tests**

`tests/test-economy.js`:
```js
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
```

- [ ] **Step 2: Wire into `test.html`**

Add: `await import('./tests/test-economy.js');`

- [ ] **Step 3: Verify tests fail**

Reload. Expected: 5 failing.

- [ ] **Step 4: Write `js/economy.js`**

```js
export function createEconomy(start) {
  return {
    coins: start,
    earn(amount) { this.coins += amount; },
    canAfford(cost) { return this.coins >= cost; },
    spend(cost) {
      if (!this.canAfford(cost)) return false;
      this.coins -= cost;
      return true;
    },
  };
}
```

- [ ] **Step 5: Verify tests pass**

Reload. Expected: 5 more passing.

- [ ] **Step 6: Commit**

```bash
git add js/economy.js tests/test-economy.js test.html
git commit -m "feat: economy module"
```

---

## Task 6: Enemy Module (TDD)

**Files:**
- Create: `js/enemies.js`
- Create: `tests/test-enemies.js`

Enemies have position, hp, kind (ground/air), speed. Ground enemies follow a path of grid points. Air enemies fly straight from spawn to the house.

- [ ] **Step 1: Write the failing tests**

`tests/test-enemies.js`:
```js
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
```

- [ ] **Step 2: Wire into `test.html`**

Add: `await import('./tests/test-enemies.js');`

- [ ] **Step 3: Verify tests fail**

Reload. Expected: 6 failing.

- [ ] **Step 4: Write `js/enemies.js`**

```js
import { ENEMIES } from './config.js';

let nextId = 1;

export function createEnemy(type, path) {
  const cfg = ENEMIES[type];
  if (!cfg) throw new Error(`unknown enemy ${type}`);
  const start = path[0];
  return {
    id: nextId++,
    type,
    kind: cfg.kind,
    hp: cfg.hp,
    maxHp: cfg.hp,
    speed: cfg.speed,
    reward: cfg.reward,
    pos: { x: start.x, z: start.z },
    path,
    pathIdx: 0,
    reachedHouse: false,
    dead: false,
  };
}

export function stepEnemy(e, dtMs) {
  if (e.dead || e.reachedHouse) return;
  const target = e.kind === 'air'
    ? e.path[e.path.length - 1]
    : e.path[Math.min(e.pathIdx + 1, e.path.length - 1)];
  const dx = target.x - e.pos.x, dz = target.z - e.pos.z;
  const dist = Math.hypot(dx, dz);
  const step = e.speed * (dtMs / 1000);
  if (dist <= step) {
    e.pos.x = target.x; e.pos.z = target.z;
    if (e.kind === 'air' || e.pathIdx + 1 >= e.path.length - 1) {
      e.reachedHouse = true;
    } else {
      e.pathIdx++;
    }
  } else {
    e.pos.x += (dx / dist) * step;
    e.pos.z += (dz / dist) * step;
  }
}

export function damageEnemy(e, amount) {
  e.hp -= amount;
  if (e.hp <= 0) e.dead = true;
}
```

- [ ] **Step 5: Verify tests pass**

Reload. Expected: 6 more passing.

- [ ] **Step 6: Commit**

```bash
git add js/enemies.js tests/test-enemies.js test.html
git commit -m "feat: enemy module with movement and damage"
```

---

## Task 7: Tower Module (TDD)

**Files:**
- Create: `js/towers.js`
- Create: `tests/test-towers.js`

Towers have a position, type, cooldown timer. `findTarget` picks the first valid enemy in range. `tickTower` reduces cooldown and shoots when ready.

- [ ] **Step 1: Write the failing tests**

`tests/test-towers.js`:
```js
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
```

- [ ] **Step 2: Wire into `test.html`**

Add: `await import('./tests/test-towers.js');`

- [ ] **Step 3: Verify tests fail**

Reload. Expected: 6 failing.

- [ ] **Step 4: Write `js/towers.js`**

```js
import { TOWERS } from './config.js';

let nextId = 1;

export function createTower(type, pos) {
  const cfg = TOWERS[type];
  if (!cfg) throw new Error(`unknown tower ${type}`);
  return {
    id: nextId++,
    type,
    pos: { x: pos.x, z: pos.z },
    cfg,
    cooldown: 0,
    destroyed: false,
    disabled: false,
  };
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

export function findTarget(tower, enemies) {
  if (tower.destroyed || tower.disabled) return null;
  const { range, targets } = tower.cfg;
  for (const e of enemies) {
    if (e.dead || e.reachedHouse) continue;
    if (targets === 'ground' && e.kind !== 'ground') continue;
    if (targets === 'air' && e.kind !== 'air') continue;
    if (dist(e.pos, tower.pos) <= range) return e;
  }
  return null;
}

export function tickTower(tower, dtMs, enemies) {
  if (tower.type === 'trap') return [];
  if (tower.destroyed || tower.disabled) return [];
  tower.cooldown = Math.max(0, tower.cooldown - dtMs);
  if (tower.cooldown > 0) return [];
  const target = findTarget(tower, enemies);
  if (!target) return [];
  tower.cooldown = tower.cfg.cooldownMs;
  return [{ towerId: tower.id, targetId: target.id, damage: tower.cfg.damage }];
}

export function trapsHittingEnemies(traps, enemies) {
  const hits = [];
  for (const t of traps) {
    if (t.destroyed || t.disabled) continue;
    for (const e of enemies) {
      if (e.dead || e.kind !== 'ground') continue;
      if (Math.abs(e.pos.x - t.pos.x) < 0.4 && Math.abs(e.pos.z - t.pos.z) < 0.4) {
        hits.push({ trapId: t.id, targetId: e.id, damage: t.cfg.damage });
      }
    }
  }
  return hits;
}
```

- [ ] **Step 5: Verify tests pass**

Reload. Expected: 6 more passing.

- [ ] **Step 6: Commit**

```bash
git add js/towers.js tests/test-towers.js test.html
git commit -m "feat: tower module with targeting and cooldown"
```

---

## Task 8: Disaster Module (TDD)

**Files:**
- Create: `js/disasters.js`
- Create: `tests/test-disasters.js`

Disasters return effect descriptors that the game applies to towers and map state. Each disaster has a start, duration, and end side effect.

- [ ] **Step 1: Write the failing tests**

`tests/test-disasters.js`:
```js
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
```

- [ ] **Step 2: Wire into `test.html`**

Add: `await import('./tests/test-disasters.js');`

- [ ] **Step 3: Verify tests fail**

Reload. Expected: 3 failing.

- [ ] **Step 4: Write `js/disasters.js`**

```js
import { EARTHQUAKE_DESTROYS } from './config.js';

const DIRS = ['north', 'south', 'east', 'west'];

export function applyEarthquake(towers, rng = Math.random) {
  const alive = towers.filter(t => !t.destroyed);
  const count = Math.min(EARTHQUAKE_DESTROYS, alive.length);
  for (let i = 0; i < count; i++) {
    const pick = alive[Math.floor(rng() * alive.length)];
    if (pick && !pick.destroyed) pick.destroyed = true;
  }
}

export function applyFlood(traps) {
  for (const t of traps) if (t.type === 'trap') t.disabled = true;
}
export function endFlood(traps) {
  for (const t of traps) if (t.type === 'trap') t.disabled = false;
}

export function applyVolcano(state, rng = Math.random) {
  const dir = DIRS[Math.floor(rng() * DIRS.length)];
  state.blockedDirs.add(dir);
}
export function endVolcano(state) {
  state.blockedDirs.clear();
}

export function pickRandomDisaster(rng = Math.random) {
  const all = ['earthquake', 'flood', 'volcano'];
  return all[Math.floor(rng() * all.length)];
}
```

- [ ] **Step 5: Verify tests pass**

Reload. Expected: 3 more passing.

- [ ] **Step 6: Commit**

```bash
git add js/disasters.js tests/test-disasters.js test.html
git commit -m "feat: disaster effects (earthquake, flood, volcano)"
```

---

## Task 9: Game State Machine (TDD)

**Files:**
- Create: `js/game.js`
- Create: `tests/test-game.js`

The game ties everything together. States: `idle`, `wave`, `break`, `disaster`, `won`, `lost`. The game accepts a tick (dt in ms) and updates everything. It exposes methods for placing towers and reading state.

- [ ] **Step 1: Write the failing tests**

`tests/test-game.js`:
```js
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
```

- [ ] **Step 2: Wire into `test.html`**

Add: `await import('./tests/test-game.js');`

- [ ] **Step 3: Verify tests fail**

Reload. Expected: 6 failing.

- [ ] **Step 4: Write `js/game.js`**

```js
import { HOUSE_MAX_HP, START_COINS, MAX_WAVES, TOWERS, WAVE_BREAK_MS, DISASTER_DURATION_MS, ENEMIES } from './config.js';
import { tileType, SPAWN_POINTS, pathFromSpawn } from './map.js';
import { generateWave } from './waves.js';
import { createEconomy } from './economy.js';
import { createEnemy, stepEnemy, damageEnemy } from './enemies.js';
import { createTower, tickTower, trapsHittingEnemies } from './towers.js';
import { applyEarthquake, applyFlood, endFlood, applyVolcano, endVolcano, pickRandomDisaster } from './disasters.js';

export function createGame() {
  return {
    houseHp: HOUSE_MAX_HP,
    economy: createEconomy(START_COINS),
    state: 'idle',
    wave: 0,
    queuedEnemies: [],
    activeEnemies: [],
    towers: [],
    breakTimer: 0,
    disasterTimer: 0,
    activeDisaster: null,
    blockedDirs: new Set(),
    spawnTimer: 0,
    bossDefeated: false,

    placeTower(type, { x, z }) {
      const cfg = TOWERS[type];
      if (!cfg) return false;
      const tile = tileType(x, z);
      const wantPath = cfg.placement === 'path';
      if (wantPath && tile !== 'path') return false;
      if (!wantPath && tile !== 'empty') return false;
      if (this.towers.some(t => t.pos.x === x && t.pos.z === z && !t.destroyed)) return false;
      if (!this.economy.spend(cfg.cost)) return false;
      this.towers.push(createTower(type, { x, z }));
      return true;
    },

    startNextWave() {
      if (this.wave >= MAX_WAVES) return;
      this.wave++;
      this.state = 'wave';
      const w = generateWave(this.wave);
      const spawns = SPAWN_POINTS.filter(s => !this.blockedDirs.has(s.dir));
      const queue = [];
      const pushN = (type, n) => {
        for (let i = 0; i < n; i++) {
          const spawn = spawns[i % spawns.length];
          queue.push({ type, path: pathFromSpawn(spawn) });
        }
      };
      pushN('zombie', w.zombies);
      pushN('alien', w.aliens);
      pushN('mothership', w.mothership);
      this.queuedEnemies = queue;
      this.spawnTimer = 0;
      this.bossDefeated = w.mothership === 0;
    },

    tick(dtMs) {
      if (this.state === 'won' || this.state === 'lost') return;
      if (this.houseHp <= 0) { this.state = 'lost'; return; }

      if (this.state === 'wave') {
        this.spawnTimer -= dtMs;
        while (this.spawnTimer <= 0 && this.queuedEnemies.length > 0) {
          const next = this.queuedEnemies.shift();
          this.activeEnemies.push(createEnemy(next.type, next.path));
          this.spawnTimer += 800;
        }
        for (const e of this.activeEnemies) stepEnemy(e, dtMs);

        for (const t of this.towers) {
          const shots = tickTower(t, dtMs, this.activeEnemies);
          for (const s of shots) {
            const target = this.activeEnemies.find(e => e.id === s.targetId);
            if (target) damageEnemy(target, s.damage);
          }
        }
        const traps = this.towers.filter(t => t.type === 'trap');
        for (const hit of trapsHittingEnemies(traps, this.activeEnemies)) {
          const target = this.activeEnemies.find(e => e.id === hit.targetId);
          if (target) { damageEnemy(target, hit.damage); }
          const trap = traps.find(t => t.id === hit.trapId);
          if (trap) trap.destroyed = true;
        }

        for (const e of this.activeEnemies) {
          if (e.reachedHouse && !e._counted) { this.houseHp -= 10; e._counted = true; }
          if (e.dead && !e._rewarded) { this.economy.earn(e.reward); e._rewarded = true; if (e.type === 'mothership') this.bossDefeated = true; }
        }
        this.activeEnemies = this.activeEnemies.filter(e => !e.dead && !e.reachedHouse);

        if (this.queuedEnemies.length === 0 && this.activeEnemies.length === 0) {
          if (this.wave === MAX_WAVES && this.bossDefeated) { this.state = 'won'; return; }
          if (this.wave === MAX_WAVES) { this.state = 'won'; return; }
          this.state = 'break';
          this.breakTimer = WAVE_BREAK_MS;
          if (Math.random() < 0.6) this._beginDisaster();
        }
      } else if (this.state === 'break') {
        this.breakTimer -= dtMs;
        if (this.activeDisaster) this._tickDisaster(dtMs);
        if (this.breakTimer <= 0) this.startNextWave();
      }
    },

    _beginDisaster() {
      const kind = pickRandomDisaster();
      this.activeDisaster = kind;
      this.disasterTimer = DISASTER_DURATION_MS;
      if (kind === 'earthquake') {
        applyEarthquake(this.towers);
        this.activeDisaster = null;
        this.disasterTimer = 0;
      } else if (kind === 'flood') {
        applyFlood(this.towers.filter(t => t.type === 'trap'));
      } else if (kind === 'volcano') {
        applyVolcano({ blockedDirs: this.blockedDirs });
      }
    },

    _tickDisaster(dtMs) {
      this.disasterTimer -= dtMs;
      if (this.disasterTimer <= 0) {
        if (this.activeDisaster === 'flood') endFlood(this.towers.filter(t => t.type === 'trap'));
        if (this.activeDisaster === 'volcano') endVolcano({ blockedDirs: this.blockedDirs });
        this.activeDisaster = null;
      }
    },
  };
}
```

- [ ] **Step 5: Verify tests pass**

Reload. Expected: all earlier tests still pass plus 6 new ones.

- [ ] **Step 6: Commit**

```bash
git add js/game.js tests/test-game.js test.html
git commit -m "feat: game state machine"
```

---

## Task 10: Three.js Scene and Map Render (Visual)

**Files:**
- Modify: `js/main.js`

This task brings up Three.js, draws the ground, paths, and the house. No game logic yet.

- [ ] **Step 1: Replace `js/main.js` with scene setup**

```js
import * as THREE from 'three';
import { GRID_SIZE, TILE_SIZE, HOUSE_CENTER } from './config.js';
import { tileType } from './map.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(GRID_SIZE / 2, 14, GRID_SIZE + 6);
camera.lookAt(GRID_SIZE / 2, 0, GRID_SIZE / 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(5, 10, 5);
scene.add(sun);

const grassMat = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
const pathMat = new THREE.MeshLambertMaterial({ color: 0xc2b280 });
const houseMat = new THREE.MeshLambertMaterial({ color: 0x8d5a2b });
const roofMat = new THREE.MeshLambertMaterial({ color: 0xb22222 });

for (let x = 0; x < GRID_SIZE; x++) {
  for (let z = 0; z < GRID_SIZE; z++) {
    const t = tileType(x, z);
    const geo = new THREE.BoxGeometry(TILE_SIZE, 0.1, TILE_SIZE);
    const mat = t === 'path' ? pathMat : t === 'house' ? grassMat : grassMat;
    const tile = new THREE.Mesh(geo, mat);
    tile.position.set(x, 0, z);
    scene.add(tile);
  }
}

const house = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 2.5), houseMat);
house.position.set(HOUSE_CENTER.x, 0.6, HOUSE_CENTER.z);
scene.add(house);
const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.0, 4), roofMat);
roof.position.set(HOUSE_CENTER.x, 1.7, HOUSE_CENTER.z);
roof.rotation.y = Math.PI / 4;
scene.add(roof);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function loop() {
  requestAnimationFrame(loop);
  renderer.render(scene, camera);
}
loop();
```

- [ ] **Step 2: Visual verification**

Open `index.html` in Chrome. Expected: blue sky, green grass with four sandy paths leading to a brown house with a red roof.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: scene with map and house"
```

---

## Task 11: Render Enemies (Visual)

**Files:**
- Modify: `js/main.js`

Hook up the game state. Spawn enemies and draw them.

- [ ] **Step 1: Extend `js/main.js`**

Add this near the bottom of `main.js`, before the `loop` function:

```js
import { createGame } from './game.js';

const game = createGame();

const enemyMeshes = new Map();
const zombieGeo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
const zombieMat = new THREE.MeshLambertMaterial({ color: 0x2f7a2f });
const alienGeo = new THREE.ConeGeometry(0.3, 0.7, 6);
const alienMat = new THREE.MeshLambertMaterial({ color: 0x9b30ff });
const bossGeo = new THREE.SphereGeometry(0.9, 16, 16);
const bossMat = new THREE.MeshLambertMaterial({ color: 0xff00cc });

function meshFor(e) {
  if (e.type === 'zombie') return new THREE.Mesh(zombieGeo, zombieMat);
  if (e.type === 'alien')  { const m = new THREE.Mesh(alienGeo, alienMat); m.rotation.x = Math.PI; return m; }
  return new THREE.Mesh(bossGeo, bossMat);
}

function syncEnemies() {
  const seen = new Set();
  for (const e of game.activeEnemies) {
    seen.add(e.id);
    let m = enemyMeshes.get(e.id);
    if (!m) { m = meshFor(e); scene.add(m); enemyMeshes.set(e.id, m); }
    const y = e.kind === 'air' ? 2.0 : 0.4;
    m.position.set(e.pos.x, y, e.pos.z);
  }
  for (const [id, m] of enemyMeshes) {
    if (!seen.has(id)) { scene.remove(m); enemyMeshes.delete(id); }
  }
}
```

Replace `loop` with:

```js
let last = performance.now();
function loop(now = performance.now()) {
  requestAnimationFrame(loop);
  const dt = Math.min(50, now - last);
  last = now;
  game.tick(dt);
  syncEnemies();
  renderer.render(scene, camera);
}
loop();
```

- [ ] **Step 2: Temporarily auto-start wave 1**

After `const game = createGame();` add:

```js
game.startNextWave();
```

- [ ] **Step 3: Visual verification**

Reload `index.html`. Expected: green cubes (zombies) walk along paths toward the house, purple cones (aliens) fly toward the house.

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat: render enemies"
```

---

## Task 12: Place Towers via Clicks (Visual)

**Files:**
- Modify: `js/main.js`

Click an empty or path tile to place the currently selected tower. For now hard-code a keyboard switch: `1` = cannon, `2` = turret, `3` = trap.

- [ ] **Step 1: Extend `js/main.js`**

Add after `syncEnemies`:

```js
const towerMeshes = new Map();
const cannonMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
const turretMat = new THREE.MeshLambertMaterial({ color: 0x2266ff });
const trapMat   = new THREE.MeshLambertMaterial({ color: 0xff5500 });

function towerMeshFor(t) {
  if (t.type === 'cannon') {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 12), cannonMat);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.6), cannonMat);
    barrel.position.y = 0.3;
    g.add(base); g.add(barrel);
    return g;
  }
  if (t.type === 'turret') return new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 8), turretMat);
  return new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.7), trapMat);
}

function syncTowers() {
  for (const t of game.towers) {
    let m = towerMeshes.get(t.id);
    if (!m) { m = towerMeshFor(t); scene.add(m); towerMeshes.set(t.id, m); }
    m.position.set(t.pos.x, t.type === 'trap' ? 0.06 : 0.3, t.pos.z);
    m.visible = !t.destroyed;
  }
}

let selectedTower = 'cannon';
addEventListener('keydown', e => {
  if (e.key === '1') selectedTower = 'cannon';
  if (e.key === '2') selectedTower = 'turret';
  if (e.key === '3') selectedTower = 'trap';
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('click', ev => {
  mouse.x = (ev.clientX / innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, hit);
  if (!hit) return;
  const gx = Math.round(hit.x), gz = Math.round(hit.z);
  game.placeTower(selectedTower, { x: gx, z: gz });
});
```

Add `syncTowers()` inside `loop` after `syncEnemies()`:

```js
syncTowers();
```

- [ ] **Step 2: Visual verification**

Reload. Press `1`, click on grass: cylinder appears. Press `2`, click on grass: cone appears. Press `3`, click on a sandy path tile: orange pad appears. Clicks on invalid tiles do nothing.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: tower placement via click"
```

---

## Task 13: Shooting Visuals (Visual)

**Files:**
- Modify: `js/main.js`
- Modify: `js/game.js` (expose recent shots for the renderer)

Show short-lived bullet lines from tower to target.

- [ ] **Step 1: Update `js/game.js` to record shots**

Inside `createGame()`, add `recentShots: [],` to the returned object (near `bossDefeated: false,`).

Inside `tick`, where shots are computed, replace this section:

```js
for (const t of this.towers) {
  const shots = tickTower(t, dtMs, this.activeEnemies);
  for (const s of shots) {
    const target = this.activeEnemies.find(e => e.id === s.targetId);
    if (target) damageEnemy(target, s.damage);
  }
}
```

with:

```js
for (const t of this.towers) {
  const shots = tickTower(t, dtMs, this.activeEnemies);
  for (const s of shots) {
    const target = this.activeEnemies.find(e => e.id === s.targetId);
    if (target) {
      damageEnemy(target, s.damage);
      this.recentShots.push({ from: { x: t.pos.x, z: t.pos.z }, to: { x: target.pos.x, z: target.pos.z }, ttl: 80 });
    }
  }
}
```

Also add at the end of `tick`:

```js
for (const s of this.recentShots) s.ttl -= dtMs;
this.recentShots = this.recentShots.filter(s => s.ttl > 0);
```

- [ ] **Step 2: Render shots in `main.js`**

Add near the other sync functions:

```js
const shotGroup = new THREE.Group();
scene.add(shotGroup);
const shotMat = new THREE.LineBasicMaterial({ color: 0xffff00 });

function syncShots() {
  while (shotGroup.children.length) shotGroup.remove(shotGroup.children[0]);
  for (const s of game.recentShots) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(s.from.x, 0.5, s.from.z),
      new THREE.Vector3(s.to.x,   1.0, s.to.z),
    ]);
    shotGroup.add(new THREE.Line(g, shotMat));
  }
}
```

Call `syncShots()` inside `loop` after `syncTowers()`.

- [ ] **Step 3: Visual verification**

Reload, place a cannon near the north path, wait for zombies. Yellow lines flash from cannon to zombie. Zombies die before reaching the house if you have enough cannons.

- [ ] **Step 4: Commit**

```bash
git add js/game.js js/main.js
git commit -m "feat: render tower shots"
```

---

## Task 14: HUD (Visual)

**Files:**
- Modify: `index.html` (already has the `#hud` div)
- Create: `js/ui.js`
- Modify: `js/main.js`

HUD shows: coins, house HP, current wave, selected tower, plus a "Start Wave" button when in `idle` or `break`.

- [ ] **Step 1: Write `js/ui.js`**

```js
export function createUi(game) {
  const root = document.getElementById('hud');
  root.style.position = 'fixed';
  root.style.top = '8px';
  root.style.left = '8px';
  root.style.padding = '8px 12px';
  root.style.background = 'rgba(0,0,0,0.55)';
  root.style.color = '#fff';
  root.style.fontFamily = 'sans-serif';
  root.style.borderRadius = '6px';
  root.innerHTML = `
    <div>HouseHold</div>
    <div>HP: <span id="hp"></span></div>
    <div>Coins: <span id="coins"></span></div>
    <div>Wave: <span id="wave"></span> / 10</div>
    <div>State: <span id="state"></span></div>
    <div>Tower: <span id="sel"></span></div>
    <div style="margin-top:6px"><button id="startBtn">Start Wave</button></div>
    <div style="margin-top:6px;font-size:12px;opacity:.8">Keys: 1 cannon | 2 turret | 3 trap. Click to place.</div>
  `;
  const $ = id => document.getElementById(id);
  $('startBtn').addEventListener('click', () => game.startNextWave());

  function refresh(selected) {
    $('hp').textContent = Math.max(0, Math.floor(game.houseHp));
    $('coins').textContent = game.economy.coins;
    $('wave').textContent = game.wave;
    $('state').textContent = game.state + (game.activeDisaster ? ` (${game.activeDisaster})` : '');
    $('sel').textContent = selected;
    $('startBtn').disabled = !(game.state === 'idle' || game.state === 'break');
  }
  return { refresh };
}
```

- [ ] **Step 2: Wire into `main.js`**

Remove the temporary `game.startNextWave()` line.

After `const game = createGame();` add:

```js
import { createUi } from './ui.js';
const ui = createUi(game);
```

Inside `loop`, after `renderer.render(...)`, add:

```js
ui.refresh(selectedTower);
```

- [ ] **Step 3: Visual verification**

Reload. HUD appears top-left. Press "Start Wave". Zombies and aliens come. HP drops if they reach the house. Coins increase on kills.

- [ ] **Step 4: Commit**

```bash
git add js/ui.js js/main.js
git commit -m "feat: HUD with start wave button and stats"
```

---

## Task 15: Win and Lose Screens

**Files:**
- Modify: `js/ui.js`

- [ ] **Step 1: Extend `js/ui.js`**

After the `refresh` function inside `createUi`, before the `return`, add:

```js
let endShown = false;
const endLayer = document.createElement('div');
endLayer.style.cssText = `
  position: fixed; inset: 0; display: none; place-items: center;
  background: rgba(0,0,0,0.7); color: #fff; font-family: sans-serif;
  font-size: 36px; text-align: center;
`;
endLayer.innerHTML = `<div><div id="endMsg"></div>
  <div style="margin-top:12px"><button id="restartBtn" style="font-size:18px">Play again</button></div></div>`;
document.body.appendChild(endLayer);
endLayer.querySelector('#restartBtn').addEventListener('click', () => location.reload());
```

Update `refresh` to handle end states:

```js
function refresh(selected) {
  $('hp').textContent = Math.max(0, Math.floor(game.houseHp));
  $('coins').textContent = game.economy.coins;
  $('wave').textContent = game.wave;
  $('state').textContent = game.state + (game.activeDisaster ? ` (${game.activeDisaster})` : '');
  $('sel').textContent = selected;
  $('startBtn').disabled = !(game.state === 'idle' || game.state === 'break');

  if (!endShown && (game.state === 'won' || game.state === 'lost')) {
    endShown = true;
    endLayer.style.display = 'grid';
    endLayer.querySelector('#endMsg').textContent = game.state === 'won' ? 'You won!' : 'House destroyed';
  }
}
```

- [ ] **Step 2: Visual verification (manual win)**

In the browser console after starting wave 1: `game.houseHp = 0` then wait a frame. Expected: "House destroyed" screen with Play again button.

Refresh, then `game.wave = 9; game.startNextWave();` and let it play out (or `game.bossDefeated = true; game.activeEnemies = []; game.queuedEnemies = [];` then `game.tick(16)`). Expected: "You won!" screen.

- [ ] **Step 3: Commit**

```bash
git add js/ui.js
git commit -m "feat: win and lose screens"
```

---

## Final Checks

- [ ] **Run all tests one last time**

Open `test.html` in Chrome. Expected: every test passes. Count should be roughly 36 tests.

- [ ] **Full playthrough**

Open `index.html`. Click "Start Wave". Place towers with `1`, `2`, `3` and click. Survive to wave 10. Defeat the Alien Mothership. See "You won!" screen.

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: HouseHold v1 complete" || echo "nothing to commit"
```
