import { MAX_WAVES } from './config.js';

export function generateWave(n) {
  if (n < 1 || n > MAX_WAVES) throw new Error(`wave out of range: ${n}`);
  if (n === MAX_WAVES) {
    return { zombies: 8, aliens: 5, mothership: 1 };
  }
  const total = 5 + n * 2;
  const aliens = Math.floor(n / 2);
  return { zombies: total - aliens, aliens, mothership: 0 };
}

export function totalEnemies(wave) {
  return wave.zombies + wave.aliens + wave.mothership;
}
