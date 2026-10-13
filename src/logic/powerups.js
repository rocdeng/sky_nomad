import { W, H } from '../config.js';
import { hitRadius } from './collision.js';

export const POWERUP_WEIGHTS = { star: 0.6, heart: 0.25, shield: 0.15 };
export const POWERUP_SIZE = 9;
export const POWERUP_SPEED = 35;
export const STAR_SCORE = 10;
export const SHIELD_TIME = 5;

export function pickPowerupType(rng) {
  const r = rng();
  if (r < POWERUP_WEIGHTS.star) return 'star';
  if (r < POWERUP_WEIGHTS.star + POWERUP_WEIGHTS.heart) return 'heart';
  return 'shield';
}

// 下一个道具出现的间隔：5±1 秒
export function nextPowerupDelay(rng) {
  return 4 + rng() * 2;
}

export function createPowerup(type, rng) {
  const s = POWERUP_SIZE;
  return {
    type,
    x: 10 + rng() * (W - 20),
    y: -s / 2,
    w: s,
    h: s,
    r: hitRadius(s),
    t: 0,
  };
}

export function updatePowerup(p, dt) {
  p.y += POWERUP_SPEED * dt;
  p.t += dt;
}

export function isPowerupOffscreen(p) {
  return p.y > H + p.h;
}
