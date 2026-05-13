import {
  HOUSE_MAX_HP, START_COINS, MAX_WAVES, TOWERS, WAVE_BREAK_MS, DISASTER_DURATION_MS, VOLCANO_DURATION_MS, ENEMIES,
  PLAYER_HP, PLAYER_SPEED, PLAYER_START, PLAYER_HIT_DAMAGE, PLAYER_HIT_COOLDOWN_MS, PLAYER_HIT_RADIUS,
  PLAYER_JUMP_VELOCITY, PLAYER_GRAVITY,
  GRID_SIZE,
} from './config.js';
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
    player: { pos: { ...PLAYER_START }, hp: PLAYER_HP, hitCooldown: 0, y: 0, vy: 0 },
    lostBy: null,

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

    placeTowerAtPlayer(type) {
      const x = Math.round(this.player.pos.x);
      const z = Math.round(this.player.pos.z);
      return this.placeTower(type, { x, z });
    },

    movePlayer(dx, dz, dtMs) {
      const dt = dtMs / 1000;
      this.player.pos.x = Math.max(0, Math.min(GRID_SIZE - 1, this.player.pos.x + dx * PLAYER_SPEED * dt));
      this.player.pos.z = Math.max(0, Math.min(GRID_SIZE - 1, this.player.pos.z + dz * PLAYER_SPEED * dt));
    },

    playerJump() {
      if (this.player.y <= 0.001) this.player.vy = PLAYER_JUMP_VELOCITY;
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
      if (this.houseHp <= 0) { this.state = 'lost'; this.lostBy = 'house'; return; }
      if (this.player.hp <= 0) { this.state = 'lost'; this.lostBy = 'player'; return; }

      const dts = dtMs / 1000;
      this.player.vy -= PLAYER_GRAVITY * dts;
      this.player.y += this.player.vy * dts;
      if (this.player.y <= 0) { this.player.y = 0; this.player.vy = 0; }
      this.player.airborne = this.player.y > 0.01;

      this.player.sheltered = tileType(Math.round(this.player.pos.x), Math.round(this.player.pos.z)) === 'house';
      this.player.hitCooldown = Math.max(0, this.player.hitCooldown - dtMs);
      if (this.player.hitCooldown === 0 && !this.player.sheltered && !this.player.airborne) {
        for (const e of this.activeEnemies) {
          const dx = e.pos.x - this.player.pos.x;
          const dz = e.pos.z - this.player.pos.z;
          if (dx * dx + dz * dz <= PLAYER_HIT_RADIUS * PLAYER_HIT_RADIUS) {
            this.player.hp -= PLAYER_HIT_DAMAGE;
            this.player.hitCooldown = PLAYER_HIT_COOLDOWN_MS;
            break;
          }
        }
      }

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
        if (this.breakTimer <= 0) this.startNextWave();
      }
      if (this.activeDisaster) this._tickDisaster(dtMs);
      for (const s of this.recentShots) s.ttl -= dtMs;
      this.recentShots = this.recentShots.filter(s => s.ttl > 0);
    },

    _beginDisaster() {
      const kind = pickRandomDisaster();
      this.activeDisaster = kind;
      this.disasterTimer = DISASTER_DURATION_MS;
      if (kind === 'earthquake') {
        applyEarthquake(this.towers);
        this.disasterTimer = 2000;
      } else if (kind === 'flood') {
        applyFlood(this.towers.filter(t => t.type === 'trap'));
      } else if (kind === 'volcano') {
        applyVolcano({ blockedDirs: this.blockedDirs });
        this.disasterTimer = VOLCANO_DURATION_MS;
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
