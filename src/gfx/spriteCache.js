import { SPRITES } from './sprites.js';
import { PALETTE } from './palette.js';

// 启动时把字符矩阵逐像素画到离屏 canvas 并缓存
export function buildSpriteCache(sprites = SPRITES, palette = PALETTE) {
  const cache = {};
  for (const [name, rows] of Object.entries(sprites)) {
    const w = rows[0].length;
    const h = rows.length;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.') continue;
        ctx.fillStyle = palette[ch];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    cache[name] = { canvas, w, h };
  }
  return cache;
}

// 以 (cx, cy) 为中心绘制，取整到像素
export function drawSprite(ctx, spr, cx, cy, scale = 1) {
  const w = spr.w * scale;
  const h = spr.h * scale;
  ctx.drawImage(spr.canvas, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
}

// 以中心旋转绘制
export function drawSpriteRotated(ctx, spr, cx, cy, angle) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(angle);
  ctx.drawImage(spr.canvas, -spr.w / 2, -spr.h / 2);
  ctx.restore();
}
