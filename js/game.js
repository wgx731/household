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
    recentShots: [],

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
            if (target) {
              damageEnemy(target, s.damage);
              this.recentShots.push({ from: { x: t.pos.x, z: t.pos.z }, to: { x: target.pos.x, z: target.pos.z }, ttl: 80 });
            }
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
      for (const s of this.recentShots) s.ttl -= dtMs;
      this.recentShots = this.recentShots.filter(s => s.ttl > 0);
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
