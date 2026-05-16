import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { GRID_SIZE, TILE_SIZE, HOUSE_CENTER, EXPLOSION_TTL_MS } from './config.js';
import { tileType, SPAWN_POINTS, pathTilesForDir } from './map.js';
import { createGame } from './game.js';
import { createUi } from './ui.js';
import { sfxCannon, sfxTurret, sfxTrap, sfxGun, sfxBomb, sfxArrow, sfxEarthquake, sfxFlood, sfxVolcano } from './audio.js';

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
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

function applyViewport() {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerHeight > innerWidth ? 62 : 45;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
applyViewport();
addEventListener('resize', applyViewport);
addEventListener('orientationchange', applyViewport);

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

const bomberBodyMat = new THREE.MeshStandardMaterial({ color: 0x556b3a, metalness: 0.2, roughness: 0.7 });
const bomberLegMat  = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.85 });
const bomberEyeMat  = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff4400, emissiveIntensity: 0.7 });

function makeBomber() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), bomberBodyMat);
  body.position.y = 0.35;
  g.add(body);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8), bomberLegMat);
    leg.position.set(Math.cos(a) * 0.18, 0.11, Math.sin(a) * 0.18);
    g.add(leg);
  }
  const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), bomberEyeMat);
  eye1.position.set(-0.1, 0.4, 0.25);
  const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), bomberEyeMat);
  eye2.position.set( 0.1, 0.4, 0.25);
  g.add(eye1, eye2);
  return g;
}

const archerBodyMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.7 });
const archerHeadMat = new THREE.MeshStandardMaterial({ color: 0xc99566, roughness: 0.6 });
const archerHoodMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });
const bowMat        = new THREE.MeshStandardMaterial({ color: 0x4a2d10, roughness: 0.7 });

function makeArcher() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 8), archerBodyMat);
  body.position.y = 0.45;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), archerHeadMat);
  head.position.y = 0.95;
  g.add(head);
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 12), archerHoodMat);
  hood.position.y = 1.1;
  g.add(hood);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 16, Math.PI), bowMat);
  bow.position.set(0.22, 0.55, 0.18);
  bow.rotation.z = Math.PI / 2;
  bow.rotation.y = Math.PI / 2;
  g.add(bow);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.44, 4), archerHoodMat);
  string.position.set(0.22, 0.55, 0.18);
  g.add(string);
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
  if (e.type === 'bomber') return makeBomber();
  if (e.type === 'archer') return makeArcher();
  return createMothership();
}

function syncEnemies() {
  const seen = new Set();
  for (const e of game.activeEnemies) {
    seen.add(e.id);
    let m = enemyMeshes.get(e.id);
    if (!m) { m = meshFor(e); scene.add(m); enemyMeshes.set(e.id, m); }
    const y = e.kind === 'air' ? 2.0 : 0;
    m.position.set(e.pos.x, y, e.pos.z);
    if (e.type === 'zombie' || e.type === 'alien' || e.type === 'bomber' || e.type === 'archer') {
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

const cannonBodyMat = new THREE.MeshStandardMaterial({ color: 0x2d2d2d, metalness: 0.75, roughness: 0.4 });
const cannonWoodMat = new THREE.MeshStandardMaterial({ color: 0x7a4a25, metalness: 0.1, roughness: 0.85 });
const cannonRimMat  = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.5 });

const turretBodyMat   = new THREE.MeshStandardMaterial({ color: 0x2a4f7a, metalness: 0.6, roughness: 0.4 });
const turretBarrelMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0.85, roughness: 0.3 });
const turretLightMat  = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff0000, emissiveIntensity: 0.6 });

const trapPlateMat = new THREE.MeshStandardMaterial({ color: 0x6a3a1c, metalness: 0.3, roughness: 0.8 });
const trapSpikeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
const trapWarnMat  = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff0000, emissiveIntensity: 0.5 });

function makeCannon() {
  const g = new THREE.Group();
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 18);
  const lw = new THREE.Mesh(wheelGeo, cannonBodyMat);
  lw.rotation.z = Math.PI / 2; lw.position.set(-0.2, -0.05, 0);
  const rw = new THREE.Mesh(wheelGeo, cannonBodyMat);
  rw.rotation.z = Math.PI / 2; rw.position.set( 0.2, -0.05, 0);
  g.add(lw, rw);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), cannonRimMat);
  axle.rotation.z = Math.PI / 2; axle.position.y = -0.05;
  g.add(axle);
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.38), cannonWoodMat);
  carriage.position.y = 0.08;
  g.add(carriage);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.6, 18), cannonBodyMat);
  barrel.position.set(0, 0.22, 0.08);
  barrel.rotation.x = Math.PI / 2 - 0.18;
  g.add(barrel);
  const band1 = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.02, 8, 18), cannonRimMat);
  band1.position.set(0, 0.17, -0.1); band1.rotation.x = Math.PI / 2 - 0.18;
  const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.02, 8, 18), cannonRimMat);
  band2.position.set(0, 0.30, 0.25); band2.rotation.x = Math.PI / 2 - 0.18;
  g.add(band1, band2);
  const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.028, 8, 18), cannonRimMat);
  muzzle.position.set(0, 0.38, 0.41); muzzle.rotation.x = Math.PI / 2 - 0.18;
  g.add(muzzle);
  return g;
}

function makeTurret() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.16, 20), turretBodyMat);
  base.position.y = -0.22;
  g.add(base);
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), turretBodyMat);
  pivot.position.y = 0.0;
  g.add(pivot);
  const bGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 14);
  const b1 = new THREE.Mesh(bGeo, turretBarrelMat);
  b1.position.set(-0.08, 0.28, 0.05); b1.rotation.x = -0.35;
  const b2 = new THREE.Mesh(bGeo, turretBarrelMat);
  b2.position.set( 0.08, 0.28, 0.05); b2.rotation.x = -0.35;
  g.add(b1, b2);
  const m1 = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.018, 8, 14), cannonRimMat);
  m1.position.set(-0.08, 0.55, 0.14); m1.rotation.x = Math.PI / 2 - 0.35;
  const m2 = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.018, 8, 14), cannonRimMat);
  m2.position.set( 0.08, 0.55, 0.14); m2.rotation.x = Math.PI / 2 - 0.35;
  g.add(m1, m2);
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), turretLightMat);
  light.position.set(0, 0.1, 0.2);
  g.add(light);
  return g;
}

function makeTrap() {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 24), trapPlateMat);
  g.add(plate);
  const spikeGeo = new THREE.ConeGeometry(0.055, 0.18, 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = new THREE.Mesh(spikeGeo, trapSpikeMat);
    s.position.set(Math.cos(a) * 0.28, 0.11, Math.sin(a) * 0.28);
    g.add(s);
  }
  const centerSpike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 10), trapSpikeMat);
  centerSpike.position.y = 0.13;
  g.add(centerSpike);
  const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16), trapWarnMat);
  dot.position.y = 0.04;
  g.add(dot);
  return g;
}

function towerMeshFor(t) {
  if (t.type === 'cannon') return makeCannon();
  if (t.type === 'turret') return makeTurret();
  return makeTrap();
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

const lavaGroup = new THREE.Group();
scene.add(lavaGroup);
const lavaMat = new THREE.MeshStandardMaterial({
  color: 0xff5500, emissive: 0xff3300, emissiveIntensity: 1.0,
});
const lavaTilesByDir = {};
for (const dir of ['north', 'south', 'east', 'west']) {
  const group = new THREE.Group();
  for (const t of pathTilesForDir(dir)) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.95), lavaMat);
    tile.position.set(t.x, 0.12, t.z);
    group.add(tile);
  }
  group.visible = false;
  lavaGroup.add(group);
  lavaTilesByDir[dir] = group;
}

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
let lastDisaster = null;

function syncDisasters(dtMs) {
  const d = game.activeDisaster;
  if (d !== lastDisaster) {
    if (d === 'earthquake') sfxEarthquake();
    else if (d === 'flood') sfxFlood();
    else if (d === 'volcano') sfxVolcano();
    lastDisaster = d;
  }
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
  for (const dir of Object.keys(lavaTilesByDir)) {
    lavaTilesByDir[dir].visible = game.blockedDirs.has(dir);
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

const playedShots = new WeakSet();
function syncShots() {
  while (shotGroup.children.length) shotGroup.remove(shotGroup.children[0]);
  for (const s of game.recentShots) {
    if (!playedShots.has(s)) {
      playedShots.add(s);
      if (s.type === 'cannon') sfxCannon();
      else if (s.type === 'turret') sfxTurret();
      else if (s.type === 'trap') sfxTrap();
      else if (s.type === 'gun') sfxGun();
      else if (s.type === 'arrow') sfxArrow();
    }
    if (s.from.x === s.to.x && s.from.z === s.to.z) continue;
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

const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.85, roughness: 0.3 });
const gunGrip = new THREE.MeshStandardMaterial({ color: 0x553311, metalness: 0.2, roughness: 0.8 });
const gunGroup = new THREE.Group();
const gunBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.34), gunMat);
gunBarrel.position.set(0.28, 0.65, 0.14);
const gunHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.07), gunGrip);
gunHandle.position.set(0.28, 0.55, 0.0);
gunGroup.add(gunBarrel, gunHandle);
gunGroup.visible = false;
playerGroup.add(gunGroup);
scene.add(playerGroup);

const bombMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.4 });
const fuseMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 1.0 });
const bombMeshes = new Map();
function syncBombs() {
  const seen = new Set();
  for (const b of game.bombs) {
    seen.add(b);
    let m = bombMeshes.get(b);
    if (!m) {
      m = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), bombMat);
      ball.position.y = 0.22;
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), fuseMat);
      spark.position.y = 0.48;
      m.add(ball, spark);
      scene.add(m);
      bombMeshes.set(b, m);
    }
    m.position.set(b.pos.x, 0, b.pos.z);
    const blink = Math.floor(performance.now() / 80) % 2;
    m.children[1].visible = !!blink;
  }
  for (const [b, m] of bombMeshes) {
    if (!seen.has(b)) { scene.remove(m); bombMeshes.delete(b); }
  }
}

const explosionMeshes = new Map();
const playedExplosions = new WeakSet();
function syncExplosions() {
  const seen = new Set();
  for (const x of game.explosions) {
    seen.add(x);
    if (!playedExplosions.has(x)) { playedExplosions.add(x); sfxBomb(); }
    let m = explosionMeshes.get(x);
    if (!m) {
      const color = x.source === 'bomb' ? 0xcc2222 : 0x777777;
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false });
      m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 14), mat);
      scene.add(m);
      explosionMeshes.set(x, m);
    }
    const ratio = Math.max(0, x.ttl / EXPLOSION_TTL_MS);
    const grown = 1 - ratio;
    m.position.set(x.pos.x, 0.6 + grown * 1.2, x.pos.z);
    m.scale.setScalar(1 + grown * 3);
    m.material.opacity = Math.min(0.85, ratio * 1.2);
  }
  for (const [x, m] of explosionMeshes) {
    if (!seen.has(x)) { scene.remove(m); explosionMeshes.delete(x); }
  }
}

const held = new Set();
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  held.add(k);
  if (k === '1') game.placeTowerAtPlayer('cannon');
  if (k === '2') game.placeTowerAtPlayer('turret');
  if (k === '3') game.placeTowerAtPlayer('trap');
  if (k === '4') game.buyGun();
  if (k === '5') game.throwBomb();
  if (k === ' ') { e.preventDefault(); game.playerJump(); }
});
addEventListener('keyup', e => held.delete(e.key.toLowerCase()));

let walkTarget = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const targetRing = new THREE.Mesh(
  new THREE.RingGeometry(0.3, 0.45, 24),
  new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
);
targetRing.rotation.x = -Math.PI / 2;
targetRing.position.y = 0.07;
targetRing.visible = false;
scene.add(targetRing);

function setWalkTargetFromClient(cx, cy) {
  pointer.x = (cx / innerWidth) * 2 - 1;
  pointer.y = -(cy / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(groundPlane, hit)) return;
  walkTarget = {
    x: Math.max(0, Math.min(GRID_SIZE - 1, hit.x)),
    z: Math.max(0, Math.min(GRID_SIZE - 1, hit.z)),
  };
}

renderer.domElement.addEventListener('pointerdown', ev => {
  ev.preventDefault();
  setWalkTargetFromClient(ev.clientX, ev.clientY);
});
renderer.domElement.addEventListener('touchstart', ev => {
  if (!ev.touches.length) return;
  ev.preventDefault();
  const t = ev.touches[0];
  setWalkTargetFromClient(t.clientX, t.clientY);
}, { passive: false });
renderer.domElement.addEventListener('mousedown', ev => {
  setWalkTargetFromClient(ev.clientX, ev.clientY);
});

function readMoveInput() {
  let dx = 0, dz = 0;
  if (held.has('w') || held.has('arrowup'))    dz -= 1;
  if (held.has('s') || held.has('arrowdown'))  dz += 1;
  if (held.has('a') || held.has('arrowleft'))  dx -= 1;
  if (held.has('d') || held.has('arrowright')) dx += 1;
  if (dx || dz) walkTarget = null;
  if (walkTarget) {
    const ddx = walkTarget.x - game.player.pos.x;
    const ddz = walkTarget.z - game.player.pos.z;
    const d = Math.hypot(ddx, ddz);
    if (d < 0.1) walkTarget = null;
    else return { dx: ddx / d, dz: ddz / d };
  }
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
  gunGroup.visible = p.hasGun;
  if (walkTarget) {
    targetRing.position.x = walkTarget.x;
    targetRing.position.z = walkTarget.z;
    targetRing.visible = true;
  } else {
    targetRing.visible = false;
  }
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
  syncBombs();
  syncExplosions();
  renderer.render(scene, camera);
  ui.refresh();
}
loop();
