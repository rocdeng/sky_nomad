import { W, H, BG_COLOR } from '../config.js';

const STAR_COLORS = ['#ffffff', '#ffffff', '#ffd93d', '#ff8fd8', '#9be7ff'];
const LAYERS = [
  { count: 26, speed: 6, size: 1, alpha: 0.5 },
  { count: 16, speed: 14, size: 1, alpha: 0.85 },
  { count: 8, speed: 28, size: 2, alpha: 1 },
];

// 多层视差星空 + 偶尔飘过的小云朵
export function createBackground() {
  const layers = LAYERS.map((l) => ({
    ...l,
    stars: Array.from({ length: l.count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      c: STAR_COLORS[(Math.random() * STAR_COLORS.length) | 0],
      tw: Math.random() * 6,
    })),
  }));
  return { layers, clouds: [], cloudTimer: 2 + Math.random() * 4, t: 0 };
}

export function updateBackground(bg, dt, speedMul = 1) {
  bg.t += dt;
  for (const l of bg.layers) {
    for (const s of l.stars) {
      s.y += l.speed * speedMul * dt;
      if (s.y >= H) {
        s.y -= H;
        s.x = Math.random() * W;
      }
    }
  }
  bg.cloudTimer -= dt;
  if (bg.cloudTimer <= 0) {
    bg.cloudTimer = 6 + Math.random() * 8;
    bg.clouds.push({ x: Math.random() * (W - 12), y: -6, v: 10 + Math.random() * 6 });
  }
  for (const c of bg.clouds) c.y += c.v * speedMul * dt;
  bg.clouds = bg.clouds.filter((c) => c.y < H + 6);
}

export function drawBackground(ctx, bg, sprites) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  if (sprites?.cloud) {
    ctx.globalAlpha = 0.18;
    for (const c of bg.clouds) ctx.drawImage(sprites.cloud.canvas, Math.round(c.x), Math.round(c.y));
    ctx.globalAlpha = 1;
  }
  for (const l of bg.layers) {
    for (const s of l.stars) {
      const tw = 0.6 + 0.4 * Math.sin(bg.t * 3 + s.tw);
      ctx.globalAlpha = l.alpha * tw;
      ctx.fillStyle = s.c;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), l.size, l.size);
    }
  }
  ctx.globalAlpha = 1;
}
