import { W, H } from '../config.js';
import { hitRadius } from './collision.js';
import { randRange } from './rng.js';

// 尺寸与 src/gfx/sprites.js 中的像素画一致
export const OBSTACLE_SIZES = {
  meteorSmall: [10, 10],
  meteorLarge: [16, 16],
  shooting: [8, 8],
  comet: [10, 10],
  alien: [14, 12],
  ship: [32, 20],
};

export const SHOOTING_WARN = 0.6;
export const SHOOTING_SPEED = 170;
export const SHOOTING_ANGLE = Math.PI / 6; // 偏离竖直约 30°
export const COMET_AMP = 28;
export const COMET_FREQ = 2.2;
export const COMET_TAIL = 7;
export const COMET_TAIL_STEP = 0.06;
export const ALIEN_AMP = 22;
export const ALIEN_FREQ = 3;

function base(type, sprite, x, y, rng) {
  const [w, h] = OBSTACLE_SIZES[sprite];
  return { type, sprite, x, y, w, h, r: hitRadius(w), t: 0 };
}

// opts 可覆盖随机参数（测试用），如 { x, big, side }
export function createObstacle(type, opts = {}, rng = Math.random, speedMul = 1) {
  switch (type) {
    case 'meteor': {
      const big = opts.big ?? rng() < 0.4;
      const sprite = big ? 'meteorLarge' : 'meteorSmall';
      const [w, h] = OBSTACLE_SIZES[sprite];
      const o = base('meteor', sprite, opts.x ?? randRange(rng, w / 2, W - w / 2), -h / 2, rng);
      o.big = big;
      o.vy = (big ? randRange(rng, 50, 70) : randRange(rng, 70, 95)) * speedMul;
      o.spin = randRange(rng, 1.5, 3) * (rng() < 0.5 ? -1 : 1);
      o.angle = 0;
      return o;
    }
    case 'shooting': {
      const side = opts.side ?? (rng() < 0.5 ? 'left' : 'right');
      const dir = side === 'left' ? 1 : -1; // left = 从左上进入、向右下飞
      const entryX = opts.x ?? (side === 'left' ? randRange(rng, 8, 100) : randRange(rng, 80, W - 8));
      const [w, h] = OBSTACLE_SIZES.shooting;
      const speed = SHOOTING_SPEED * speedMul;
      const vx = dir * Math.sin(SHOOTING_ANGLE) * speed;
      const vy = Math.cos(SHOOTING_ANGLE) * speed;
      // 从屏幕外出发，恰好在 entryX 处穿过上边缘
      const startY = -h;
      const startX = entryX - (vx / vy) * (0 - startY);
      const o = base('shooting', 'shooting', startX, startY, rng);
      o.side = side;
      o.entryX = entryX;
      o.entryY = 0;
      o.vx = vx;
      o.vy = vy;
      o.warn = SHOOTING_WARN;
      return o;
    }
    case 'comet': {
      const [, h] = OBSTACLE_SIZES.comet;
      const margin = COMET_AMP + 5;
      const o = base('comet', 'comet', 0, -h / 2, rng);
      o.x0 = opts.x ?? randRange(rng, margin, W - margin);
      o.x = o.x0;
      o.vy = 45 * speedMul;
      o.tail = [];
      o.tailTimer = 0;
      return o;
    }
    case 'alien': {
      const [, h] = OBSTACLE_SIZES.alien;
      const margin = ALIEN_AMP + 7;
      const o = base('alien', 'alien', 0, -h / 2, rng);
      o.x0 = opts.x ?? randRange(rng, margin, W - margin);
      o.x = o.x0;
      o.vy = 35 * speedMul;
      return o;
    }
    case 'ship': {
      const [w, h] = OBSTACLE_SIZES.ship;
      const o = base('ship', 'ship', opts.x ?? randRange(rng, w / 2, W - w / 2), -h / 2, rng);
      o.vy = 14 * speedMul;
      o.vx = 28 * speedMul * (opts.dir ?? (rng() < 0.5 ? -1 : 1));
      return o;
    }
    default:
      throw new Error(`unknown obstacle ${type}`);
  }
}

export function updateObstacle(o, dt) {
  switch (o.type) {
    case 'meteor':
      o.t += dt;
      o.y += o.vy * dt;
      o.angle += o.spin * dt;
      break;
    case 'shooting':
      if (o.warn > 0) {
        o.warn -= dt;
        if (o.warn > 0) return;
        dt = -o.warn; // 预警结束后剩余的时间用于移动
        o.warn = 0;
      }
      o.t += dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      break;
    case 'comet':
      o.t += dt;
      o.tailTimer += dt;
      if (o.tailTimer >= COMET_TAIL_STEP) {
        o.tailTimer -= COMET_TAIL_STEP;
        o.tail.unshift({ x: o.x, y: o.y });
        if (o.tail.length > COMET_TAIL) o.tail.length = COMET_TAIL;
      }
      o.y += o.vy * dt;
      o.x = o.x0 + COMET_AMP * Math.sin(COMET_FREQ * o.t);
      break;
    case 'alien':
      o.t += dt;
      o.y += o.vy * dt;
      o.x = o.x0 + ALIEN_AMP * Math.sin(ALIEN_FREQ * o.t);
      break;
    case 'ship':
      o.t += dt;
      o.y += o.vy * dt;
      o.x += o.vx * dt;
      if (o.x - o.w / 2 < 0) {
        o.x = o.w / 2;
        o.vx = Math.abs(o.vx);
      } else if (o.x + o.w / 2 > W) {
        o.x = W - o.w / 2;
        o.vx = -Math.abs(o.vx);
      }
      break;
  }
}

export function isCollidable(o) {
  return !(o.type === 'shooting' && o.warn > 0);
}

export function isOffscreen(o) {
  if (o.type === 'shooting') {
    if (o.warn > 0) return false;
    return o.y > H + o.h * 2 || o.x < -o.w * 2 || o.x > W + o.w * 2;
  }
  return o.y > H + o.h;
}
