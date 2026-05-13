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
export const VOLCANO_DURATION_MS = 10_000;
export const EARTHQUAKE_DESTROYS = 2;

export const PLAYER_HP = 70;
export const PLAYER_SPEED = 3;
export const PLAYER_START = { x: 5, z: 3 };
export const PLAYER_HIT_DAMAGE = 5;
export const PLAYER_HIT_COOLDOWN_MS = 800;
export const PLAYER_HIT_RADIUS = 0.5;
export const PLAYER_JUMP_VELOCITY = 5;
export const PLAYER_GRAVITY = 14;
