import { W, H } from '../config.js';
import { hitRadius } from './collision.js';
import { clamp } from './rng.js';

export const PLAYER_W = 16;
export const PLAYER_H = 16;
export const MAX_HP = 5;

export function createPlayer() {
  return {
    x: 90,
    y: 270,
    w: PLAYER_W,
    h: PLAYER_H,
    r: hitRadius(PLAYER_W),
    hp: MAX_HP,
    invuln: 0, // 受伤后的无敌剩余时间
    shield: 0, // 护盾剩余时间
  };
}

// 相对位移移动，限制在屏幕内
export function movePlayer(p, dx, dy) {
  p.x = clamp(p.x + dx, p.w / 2, W - p.w / 2);
  p.y = clamp(p.y + dy, p.h / 2, H - p.h / 2);
}
