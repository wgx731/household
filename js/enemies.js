import { ENEMIES } from './config.js';

let nextId = 1;

export function createEnemy(type, path, mod = { hp: 1, speed: 1 }) {
  const cfg = ENEMIES[type];
  if (!cfg) throw new Error(`unknown enemy ${type}`);
  const start = path[0];
  const hp = Math.round(cfg.hp * mod.hp);
  return {
    id: nextId++,
    type,
    kind: cfg.kind,
    hp,
    maxHp: hp,
    speed: cfg.speed * mod.speed,
    reward: cfg.reward,
    pos: { x: start.x, z: start.z },
    path,
    pathIdx: 0,
    reachedHouse: false,
    dead: false,
    shootCooldown: 0,
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
