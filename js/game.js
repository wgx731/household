import {
  HOUSE_MAX_HP, START_COINS, MAX_WAVES, TOWERS, WAVE_BREAK_MS, DISASTER_DURATION_MS, VOLCANO_DURATION_MS, DISASTER_WARNING_MS, ENEMIES, DIFFICULTIES,
  PLAYER_HP, PLAYER_SPEED, PLAYER_START, PLAYER_HIT_DAMAGE, PLAYER_HIT_COOLDOWN_MS, PLAYER_HIT_RADIUS,
  PLAYER_JUMP_VELOCITY, PLAYER_GRAVITY,
  GUN_COST, GUN_RANGE, GUN_DAMAGE, GUN_COOLDOWN_MS,
  BOMB_COST, BOMB_FUSE_MS, BOMB_RADIUS, BOMB_DAMAGE, EXPLOSION_TTL_MS,
  GRID_SIZE,
} from './config.js';
import { tileType, SPAWN_POINTS, pathFromSpawn, pathTilesForDir } from './map.js';
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
    player: { pos: { ...PLAYER_START }, hp: PLAYER_HP, hitCooldown: 0, y: 0, vy: 0, hasGun: false, gunCooldown: 0, gunWavesLeft: 0 },
    bombs: [],
    explosions: [],
    pendingDisaster: null,
    pendingDisasterTimer: 0,
    difficulty: 'normal',
    lostBy: null,

    setDifficulty(name) {
      if (DIFFICULTIES[name]) this.difficulty = name;
    },

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

    buyGun() {
      if (this.player.hasGun) return false;
      if (!this.economy.spend(GUN_COST)) return false;
      this.player.hasGun = true;
      this.player.gunWavesLeft = 3;
      return true;
    },

    throwBomb() {
      if (!this.economy.spend(BOMB_COST)) return false;
      this.bombs.push({ pos: { x: this.player.pos.x, z: this.player.pos.z }, fuse: BOMB_FUSE_MS });
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
      pushN('bomber', w.bombers || 0);
      pushN('archer', w.archers || 0);
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
      if (this.activeDisaster === 'flood' && this.player.hitCooldown === 0 && !this.player.sheltered) {
        this.player.hp -= PLAYER_HIT_DAMAGE;
        this.player.hitCooldown = PLAYER_HIT_COOLDOWN_MS;
      }
      if (this.activeDisaster === 'volcano' && this.player.hitCooldown === 0 && !this.player.airborne) {
        const px = Math.round(this.player.pos.x), pz = Math.round(this.player.pos.z);
        let onLava = false;
        for (const dir of this.blockedDirs) {
          for (const tile of pathTilesForDir(dir)) {
            if (tile.x === px && tile.z === pz) { onLava = true; break; }
          }
          if (onLava) break;
        }
        if (onLava) {
          this.player.hp -= 30;
          this.player.hitCooldown = PLAYER_HIT_COOLDOWN_MS;
        }
      }

      if (this.state === 'wave') {
        this.spawnTimer -= dtMs;
        while (this.spawnTimer <= 0 && this.queuedEnemies.length > 0) {
          const next = this.queuedEnemies.shift();
          this.activeEnemies.push(createEnemy(next.type, next.path, DIFFICULTIES[this.difficulty]));
          this.spawnTimer += 800;
        }
        for (const e of this.activeEnemies) stepEnemy(e, dtMs);

        for (const t of this.towers) {
          const shots = tickTower(t, dtMs, this.activeEnemies);
          for (const s of shots) {
            const target = this.activeEnemies.find(e => e.id === s.targetId);
            if (target) {
              damageEnemy(target, s.damage);
              this.recentShots.push({ from: { x: t.pos.x, z: t.pos.z }, to: { x: target.pos.x, z: target.pos.z }, ttl: 80, type: t.type });
            }
          }
        }
        const traps = this.towers.filter(t => t.type === 'trap');
        for (const hit of trapsHittingEnemies(traps, this.activeEnemies)) {
          const target = this.activeEnemies.find(e => e.id === hit.targetId);
          if (target) { damageEnemy(target, hit.damage); }
          const trap = traps.find(t => t.id === hit.trapId);
          if (trap) {
            trap.destroyed = true;
            this.recentShots.push({ from: { x: trap.pos.x, z: trap.pos.z }, to: { x: trap.pos.x, z: trap.pos.z }, ttl: 80, type: 'trap' });
          }
        }

        for (const e of this.activeEnemies) {
          if (e.type !== 'bomber' || e.dead) continue;
          const cfg = ENEMIES.bomber;
          const R = cfg.explodeRadius;
          const R2 = R * R;
          let trig = false;
          const dpx = this.player.pos.x - e.pos.x, dpz = this.player.pos.z - e.pos.z;
          if (dpx * dpx + dpz * dpz <= R2) trig = true;
          if (!trig) {
            for (const e2 of this.activeEnemies) {
              if (e2 === e || e2.dead) continue;
              const dx = e2.pos.x - e.pos.x, dz = e2.pos.z - e.pos.z;
              if (dx * dx + dz * dz <= R2) { trig = true; break; }
            }
          }
          if (!trig) {
            for (const t of this.towers) {
              if (t.destroyed) continue;
              const dx = t.pos.x - e.pos.x, dz = t.pos.z - e.pos.z;
              if (dx * dx + dz * dz <= R2) { trig = true; break; }
            }
          }
          if (!trig) {
            const dxh = 5 - e.pos.x, dzh = 5 - e.pos.z;
            if (dxh * dxh + dzh * dzh <= 2 * 2) trig = true;
          }
          if (trig) {
            for (const e2 of this.activeEnemies) {
              const dx = e2.pos.x - e.pos.x, dz = e2.pos.z - e.pos.z;
              if (dx * dx + dz * dz <= R2) damageEnemy(e2, cfg.explodeDamage);
            }
            if (dpx * dpx + dpz * dpz <= R2 && this.player.hitCooldown === 0 && !this.player.sheltered) {
              this.player.hp -= cfg.explodeDamage;
              this.player.hitCooldown = PLAYER_HIT_COOLDOWN_MS;
            }
            for (const t of this.towers) {
              if (t.destroyed) continue;
              const dx = t.pos.x - e.pos.x, dz = t.pos.z - e.pos.z;
              if (dx * dx + dz * dz <= R2) t.destroyed = true;
            }
            const dxh2 = 5 - e.pos.x, dzh2 = 5 - e.pos.z;
            if (dxh2 * dxh2 + dzh2 * dzh2 <= 2 * 2) this.houseHp -= cfg.explodeDamage;
            this.explosions.push({ pos: { x: e.pos.x, z: e.pos.z }, ttl: EXPLOSION_TTL_MS, source: 'bomber' });
            e.dead = true;
          }
        }

        for (const e of this.activeEnemies) {
          if (e.type !== 'archer' || e.dead) continue;
          const cfg = ENEMIES.archer;
          e.shootCooldown = Math.max(0, e.shootCooldown - dtMs);
          if (e.shootCooldown === 0) {
            const dx = this.player.pos.x - e.pos.x, dz = this.player.pos.z - e.pos.z;
            if (dx * dx + dz * dz <= cfg.range * cfg.range) {
              if (this.player.hitCooldown === 0 && !this.player.sheltered && !this.player.airborne) {
                this.player.hp -= cfg.damage;
                this.player.hitCooldown = PLAYER_HIT_COOLDOWN_MS;
              }
              e.shootCooldown = cfg.cooldownMs;
              this.recentShots.push({
                from: { x: e.pos.x, z: e.pos.z },
                to:   { x: this.player.pos.x, z: this.player.pos.z },
                ttl: 80, type: 'arrow',
              });
            }
          }
        }

        if (this.player.hasGun) {
          this.player.gunCooldown = Math.max(0, this.player.gunCooldown - dtMs);
          if (this.player.gunCooldown === 0) {
            let near = null, bestD = GUN_RANGE * GUN_RANGE;
            for (const e of this.activeEnemies) {
              const dx = e.pos.x - this.player.pos.x;
              const dz = e.pos.z - this.player.pos.z;
              const d2 = dx * dx + dz * dz;
              if (d2 <= bestD) { near = e; bestD = d2; }
            }
            if (near) {
              damageEnemy(near, GUN_DAMAGE);
              this.player.gunCooldown = GUN_COOLDOWN_MS;
              this.recentShots.push({
                from: { x: this.player.pos.x, z: this.player.pos.z },
                to:   { x: near.pos.x, z: near.pos.z },
                ttl: 80, type: 'gun',
              });
            }
          }
        }

        for (const e of this.activeEnemies) {
          if (e.reachedHouse && !e._counted) { this.houseHp -= 10; e._counted = true; }
          if (e.dead && !e._rewarded) { this.economy.earn(e.reward); e._rewarded = true; if (e.type === 'mothership') this.bossDefeated = true; }
        }
        this.activeEnemies = this.activeEnemies.filter(e => !e.dead && !e.reachedHouse);

        if (this.queuedEnemies.length === 0 && this.activeEnemies.length === 0) {
          if (this.player.hasGun) {
            this.player.gunWavesLeft--;
            if (this.player.gunWavesLeft <= 0) {
              this.player.hasGun = false;
              this.player.gunWavesLeft = 0;
            }
          }
          if (this.wave === MAX_WAVES && this.bossDefeated) { this.state = 'won'; return; }
          if (this.wave === MAX_WAVES) { this.state = 'won'; return; }
          this.state = 'break';
          this.breakTimer = WAVE_BREAK_MS;
          if (Math.random() < 0.6 && !this.pendingDisaster && !this.activeDisaster) {
            this.pendingDisaster = pickRandomDisaster();
            this.pendingDisasterTimer = DISASTER_WARNING_MS;
          }
        }
      } else if (this.state === 'break') {
        this.breakTimer -= dtMs;
        if (this.breakTimer <= 0) this.startNextWave();
      }
      if (this.pendingDisaster) {
        this.pendingDisasterTimer -= dtMs;
        if (this.pendingDisasterTimer <= 0) {
          const kind = this.pendingDisaster;
          this.pendingDisaster = null;
          this.pendingDisasterTimer = 0;
          this._beginDisaster(kind);
        }
      }
      if (this.activeDisaster) this._tickDisaster(dtMs);

      for (const b of this.bombs) {
        b.fuse -= dtMs;
        if (b.fuse <= 0) {
          for (const e of this.activeEnemies) {
            const dx = e.pos.x - b.pos.x;
            const dz = e.pos.z - b.pos.z;
            if (dx * dx + dz * dz <= BOMB_RADIUS * BOMB_RADIUS) damageEnemy(e, BOMB_DAMAGE);
          }
          this.explosions.push({ pos: { x: b.pos.x, z: b.pos.z }, ttl: EXPLOSION_TTL_MS, source: 'bomb' });
        }
      }
      this.bombs = this.bombs.filter(b => b.fuse > 0);
      for (const x of this.explosions) x.ttl -= dtMs;
      this.explosions = this.explosions.filter(x => x.ttl > 0);

      for (const s of this.recentShots) s.ttl -= dtMs;
      this.recentShots = this.recentShots.filter(s => s.ttl > 0);
    },

    _beginDisaster(kind = pickRandomDisaster()) {
      this.activeDisaster = kind;
      this.disasterTimer = DISASTER_DURATION_MS;
      if (kind === 'earthquake') {
        applyEarthquake(this.towers);
        this.disasterTimer = 2000;
      } else if (kind === 'flood') {
        applyFlood(this.towers.filter(t => t.type === 'trap'));
        if (!this.player.sheltered) {
          this.player.hp -= 10;
          this.player.hitCooldown = PLAYER_HIT_COOLDOWN_MS;
        }
      } else if (kind === 'volcano') {
        applyVolcano({ blockedDirs: this.blockedDirs });
        for (const dir of this.blockedDirs) {
          const lava = pathTilesForDir(dir);
          for (const t of this.towers) {
            if (!t.destroyed && lava.some(lt => lt.x === t.pos.x && lt.z === t.pos.z)) {
              t.destroyed = true;
            }
          }
        }
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
