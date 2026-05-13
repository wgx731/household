import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { GRID_SIZE, TILE_SIZE, HOUSE_CENTER } from './config.js';
import { tileType, SPAWN_POINTS } from './map.js';
import { createGame } from './game.js';
import { createUi } from './ui.js';

const loader = new GLTFLoader();
const [zombieGltf, alienGltf] = await Promise.all([
  loader.loadAsync('./assets/zombie.glb'),
  loader.loadAsync('./assets/alien.glb'),
]);
const zombieTemplate = zombieGltf.scene;
const alienTemplate = alienGltf.scene;

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
const houseMat = new THREE.MeshLambertMaterial({ color: 0x8d5a2b, transparent: true });
const roofMat = new THREE.MeshLambertMaterial({ color: 0xb22222, transparent: true });

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

const game = createGame();
const ui = createUi(game);

const enemyMeshes = new Map();

const motherHullMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, metalness: 0.85, roughness: 0.3 });
const motherDomeMat = new THREE.MeshStandardMaterial({
  color: 0x66ffee, emissive: 0x00bbaa, emissiveIntensity: 0.9,
  transparent: true, opacity: 0.75, metalness: 0.2, roughness: 0.1,
});
const motherRimMat = new THREE.MeshStandardMaterial({ color: 0xff2266, emissive: 0xff2266, emissiveIntensity: 1.2 });
const motherLightMat = new THREE.MeshStandardMaterial({ color: 0xffee44, emissive: 0xffee44, emissiveIntensity: 1.2 });
const motherBeamMat = new THREE.MeshBasicMaterial({ color: 0x66ffee, transparent: true, opacity: 0.25, depthWrite: false });

function createMothership() {
  const g = new THREE.Group();
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.6, 0.35, 40), motherHullMat);
  g.add(upper);
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.5, 0.55, 40), motherHullMat);
  lower.position.y = -0.4;
  g.add(lower);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    motherDomeMat,
  );
  dome.position.y = 0.17;
  g.add(dome);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.07, 10, 64), motherRimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.05;
  g.add(rim);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), motherLightMat);
    light.position.set(Math.cos(a) * 1.55, -0.05, Math.sin(a) * 1.55);
    g.add(light);
  }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.8, 24, 1, true), motherBeamMat);
  beam.position.y = -1.5;
  beam.rotation.x = Math.PI;
  g.add(beam);
  g.userData.isMothership = true;
  return g;
}

function meshFor(e) {
  if (e.type === 'zombie') {
    const m = SkeletonUtils.clone(zombieTemplate);
    m.scale.setScalar(0.5);
    return m;
  }
  if (e.type === 'alien') {
    const m = SkeletonUtils.clone(alienTemplate);
    m.scale.setScalar(0.3);
    return m;
  }
  return createMothership();
}

function syncEnemies() {
  const seen = new Set();
  for (const e of game.activeEnemies) {
    seen.add(e.id);
    let m = enemyMeshes.get(e.id);
    if (!m) { m = meshFor(e); scene.add(m); enemyMeshes.set(e.id, m); }
    const y = e.kind === 'air' ? 2.0 : (e.type === 'zombie' ? 0 : 0.4);
    m.position.set(e.pos.x, y, e.pos.z);
    if (e.type === 'zombie' || e.type === 'alien') {
      const next = e.kind === 'air'
        ? e.path[e.path.length - 1]
        : e.path[Math.min(e.pathIdx + 1, e.path.length - 1)];
      if (next.x !== e.pos.x || next.z !== e.pos.z) {
        m.lookAt(next.x, y, next.z);
      }
    }
    if (m.userData.isMothership) m.rotation.y += 0.01;
  }
  for (const [id, m] of enemyMeshes) {
    if (!seen.has(id)) { scene.remove(m); enemyMeshes.delete(id); }
  }
}

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

const floodMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(GRID_SIZE + 1, GRID_SIZE + 1),
  new THREE.MeshLambertMaterial({ color: 0x2196f3, transparent: true, opacity: 0.55 }),
);
floodMesh.rotation.x = -Math.PI / 2;
floodMesh.position.set(GRID_SIZE / 2 - 0.5, 0.25, GRID_SIZE / 2 - 0.5);
floodMesh.visible = false;
scene.add(floodMesh);

const volcanoGroup = new THREE.Group();
const volcanoCone = new THREE.Mesh(
  new THREE.ConeGeometry(1.1, 2.2, 16),
  new THREE.MeshLambertMaterial({ color: 0x4d2a1e }),
);
volcanoCone.position.y = 1.1;
volcanoGroup.add(volcanoCone);
const lavaTop = new THREE.Mesh(
  new THREE.SphereGeometry(0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0xff2200, emissiveIntensity: 1.2 }),
);
lavaTop.position.y = 2.15;
volcanoGroup.add(lavaTop);
const lavaGlow = new THREE.PointLight(0xff4400, 2.0, 6);
lavaGlow.position.y = 2.2;
volcanoGroup.add(lavaGlow);
volcanoGroup.visible = false;
scene.add(volcanoGroup);

const camOrig = camera.position.clone();
let shakeT = 0;

function syncDisasters(dtMs) {
  const d = game.activeDisaster;
  floodMesh.visible = d === 'flood';

  let volcanoDir = null;
  for (const dir of game.blockedDirs) { volcanoDir = dir; break; }
  if (volcanoDir) {
    const sp = SPAWN_POINTS.find(s => s.dir === volcanoDir);
    if (sp) {
      const ox = sp.x === 0 ? -1.2 : sp.x === GRID_SIZE - 1 ? 1.2 : 0;
      const oz = sp.z === 0 ? -1.2 : sp.z === GRID_SIZE - 1 ? 1.2 : 0;
      volcanoGroup.position.set(sp.x + ox, 0, sp.z + oz);
      volcanoGroup.visible = true;
    }
  } else {
    volcanoGroup.visible = false;
  }

  if (d === 'earthquake' && shakeT <= 0) shakeT = 1.0;
  if (shakeT > 0) {
    camera.position.x = camOrig.x + (Math.random() - 0.5) * 0.4 * shakeT;
    camera.position.y = camOrig.y + (Math.random() - 0.5) * 0.3 * shakeT;
    camera.position.z = camOrig.z + (Math.random() - 0.5) * 0.4 * shakeT;
    shakeT -= dtMs / 1000;
    if (shakeT <= 0) { shakeT = 0; camera.position.copy(camOrig); }
  }
}

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

const playerGroup = new THREE.Group();
const playerBodyMat = new THREE.MeshStandardMaterial({ color: 0x2266ff, metalness: 0.2, roughness: 0.6 });
const playerHeadMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.5 });
const playerBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.6, 4, 8), playerBodyMat);
playerBody.position.y = 0.55;
const playerHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), playerHeadMat);
playerHead.position.y = 1.05;
playerGroup.add(playerBody);
playerGroup.add(playerHead);
scene.add(playerGroup);

const held = new Set();
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  held.add(k);
  if (k === '1') game.placeTowerAtPlayer('cannon');
  if (k === '2') game.placeTowerAtPlayer('turret');
  if (k === '3') game.placeTowerAtPlayer('trap');
  if (k === ' ') { e.preventDefault(); game.playerJump(); }
});
addEventListener('keyup', e => held.delete(e.key.toLowerCase()));

function readMoveInput() {
  let dx = 0, dz = 0;
  if (held.has('w') || held.has('arrowup'))    dz -= 1;
  if (held.has('s') || held.has('arrowdown'))  dz += 1;
  if (held.has('a') || held.has('arrowleft'))  dx -= 1;
  if (held.has('d') || held.has('arrowright')) dx += 1;
  const len = Math.hypot(dx, dz);
  if (len > 0) { dx /= len; dz /= len; }
  return { dx, dz };
}

function syncPlayer() {
  const p = game.player;
  playerGroup.position.set(p.pos.x, p.y, p.pos.z);
  const flash = p.hitCooldown > 0;
  playerBodyMat.color.set(flash ? 0xff3322 : 0x2266ff);
  const op = p.sheltered ? 0.3 : 1.0;
  houseMat.opacity = op;
  roofMat.opacity = op;
}

let last = performance.now();
function loop(now = performance.now()) {
  requestAnimationFrame(loop);
  const dt = Math.min(50, now - last);
  last = now;
  const { dx, dz } = readMoveInput();
  if (dx || dz) game.movePlayer(dx, dz, dt);
  game.tick(dt);
  syncEnemies();
  syncTowers();
  syncShots();
  syncDisasters(dt);
  syncPlayer();
  renderer.render(scene, camera);
  ui.refresh();
}
loop();
