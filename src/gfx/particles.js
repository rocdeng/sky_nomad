import { BRIGHT } from './palette.js';

// 通用粒子系统：命中火花、拾取闪光、烟花、纸屑
export function createParticles() {
  return [];
}

export function emit(list, opts) {
  list.push({
    x: opts.x,
    y: opts.y,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0,
    life: opts.life ?? 0.6,
    max: opts.life ?? 0.6,
    color: opts.color ?? '#ffffff',
    size: opts.size ?? 1,
    w: opts.w,
    h: opts.h,
    gravity: opts.gravity ?? 0,
    drag: opts.drag ?? 0,
    sway: opts.sway ?? 0,
    t: Math.random() * 6,
  });
}

export function burst(list, x, y, { count = 12, speed = 60, colors = BRIGHT, life = 0.6, gravity = 0, size = 1 } = {}) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const s = speed * (0.5 + Math.random() * 0.5);
    emit(list, {
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: life * (0.7 + Math.random() * 0.3),
      color: colors[(Math.random() * colors.length) | 0],
      gravity,
      drag: 1.5,
      size,
    });
  }
}

// 烟花：一圈彩色火花，受重力下落
export function firework(list, x, y) {
  const colors = [BRIGHT[(Math.random() * BRIGHT.length) | 0], BRIGHT[(Math.random() * BRIGHT.length) | 0], '#ffffff'];
  burst(list, x, y, { count: 28, speed: 70, colors, life: 1.2, gravity: 40, size: 1 });
}

// 纸屑：从顶部飘落，左右摆动
export function confetti(list, W) {
  emit(list, {
    x: Math.random() * W,
    y: -4,
    vx: (Math.random() - 0.5) * 20,
    vy: 25 + Math.random() * 25,
    life: 6,
    color: BRIGHT[(Math.random() * BRIGHT.length) | 0],
    w: Math.random() < 0.5 ? 2 : 3,
    h: Math.random() < 0.5 ? 1 : 2,
    sway: 18,
  });
}

export function updateParticles(list, dt) {
  for (const p of list) {
    p.life -= dt;
    p.t += dt;
    p.vy += p.gravity * dt;
    if (p.drag) {
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k;
      p.vy *= k;
    }
    p.x += (p.vx + (p.sway ? Math.sin(p.t * 4) * p.sway : 0)) * dt;
    p.y += p.vy * dt;
  }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1);
}

export function drawParticles(ctx, list) {
  for (const p of list) {
    const a = Math.min(1, p.life / (p.max * 0.4));
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    const w = p.w ?? p.size;
    const h = p.h ?? p.size;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), w, h);
  }
  ctx.globalAlpha = 1;
}
