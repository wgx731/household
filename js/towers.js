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
