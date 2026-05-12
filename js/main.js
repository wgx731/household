import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { GRID_SIZE, TILE_SIZE, HOUSE_CENTER } from './config.js';
import { tileType } from './map.js';
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

const game = createGame();
const ui = createUi(game);

const enemyMeshes = new Map();
const bossGeo = new THREE.SphereGeometry(0.9, 16, 16);
const bossMat = new THREE.MeshLambertMaterial({ color: 0xff00cc });

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
  return new THREE.Mesh(bossGeo, bossMat);
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

let last = performance.now();
function loop(now = performance.now()) {
  requestAnimationFrame(loop);
  const dt = Math.min(50, now - last);
  last = now;
  game.tick(dt);
  syncEnemies();
  syncTowers();
  syncShots();
  renderer.render(scene, camera);
  ui.refresh(selectedTower);
}
loop();
