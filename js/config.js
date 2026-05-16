export const GRID_SIZE = 15;
export const TILE_SIZE = 1;
export const HOUSE_CENTER = { x: 7, z: 7 };
export const HOUSE_MAX_HP = 100;

export const START_COINS = 50;

export const ENEMIES = {
  zombie: { hp: 20, speed: 0.5, reward: 5, kind: 'ground' },
  alien:  { hp: 30, speed: 1.2, reward: 8, kind: 'air' },
  mothership: { hp: 500, speed: 0.3, reward: 100, kind: 'air' },
  bomber: { hp: 25, speed: 0.6, reward: 10, kind: 'ground', explodeRadius: 1.0, explodeDamage: 30 },
  archer: { hp: 25, speed: 0.4, reward: 12, kind: 'ground', range: 4, damage: 8, cooldownMs: 2000 },
};

export const TOWERS = {
  cannon: { cost: 20, range: 3, cooldownMs: 1200, damage: 12, targets: 'ground' },
  turret: { cost: 25, range: 4, cooldownMs: 400,  damage: 5,  targets: 'air'    },
  trap:   { cost: 10, range: 0, cooldownMs: 0,    damage: 25, targets: 'ground', placement: 'path' },
};

export const WAVE_BREAK_MS = 8000;
export const MAX_WAVES = 10;

export const DISASTER_DURATION_MS = 30_000;
export const VOLCANO_DURATION_MS = 10_000;
export const EARTHQUAKE_DESTROYS = 2;
export const DISASTER_WARNING_MS = 3000;

export const PLAYER_HP = 70;
export const PLAYER_SPEED = 3;
export const PLAYER_START = { x: 7, z: 3 };
export const PLAYER_HIT_DAMAGE = 5;
export const PLAYER_HIT_COOLDOWN_MS = 800;
export const PLAYER_HIT_RADIUS = 0.5;
export const PLAYER_JUMP_VELOCITY = 5;
export const PLAYER_GRAVITY = 14;

export const GUN_COST = 50;
export const GUN_RANGE = 3;
export const GUN_DAMAGE = 8;
export const GUN_COOLDOWN_MS = 500;

export const BOMB_COST = 25;
export const BOMB_FUSE_MS = 1000;
export const BOMB_RADIUS = 1.5;
export const BOMB_DAMAGE = 60;
export const EXPLOSION_TTL_MS = 1500;

export const DIFFICULTIES = {
  easy:   { hp: 0.7, speed: 0.8, label: 'Easy' },
  normal: { hp: 1.0, speed: 1.0, label: 'Normal' },
  hard:   { hp: 1.4, speed: 1.3, label: 'Hard' },
};
