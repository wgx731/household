import { MAX_WAVES } from './config.js';

export function generateWave(n) {
  if (n < 1 || n > MAX_WAVES) throw new Error(`wave out of range: ${n}`);
  if (n === MAX_WAVES) {
    return { zombies: 8, aliens: 5, mothership: 1, bombers: 4, archers: 3 };
  }
  if (n === 1) {
    return { zombies: 7, aliens: 0, mothership: 0, bombers: 0, archers: 0 };
  }
  const total = 5 + n * 2;
  const aliens  = Math.floor(n / 2);
  const bombers = Math.floor(n / 2);
  const archers = n >= 3 ? Math.floor((n - 1) / 2) : 0;
  const zombies = Math.max(0, total - aliens - bombers - archers);
  return { zombies, aliens, mothership: 0, bombers, archers };
}

export function totalEnemies(wave) {
  return wave.zombies + wave.aliens + wave.mothership + (wave.bombers || 0) + (wave.archers || 0);
}
