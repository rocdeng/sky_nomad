import { W } from '../config.js';
import { drawBackground } from '../gfx/background.js';
import { drawPlane } from '../gfx/plane.js';
import { createParticles, firework, updateParticles, drawParticles } from '../gfx/particles.js';
import { drawText } from '../engine/ui.js';
import { playMusic } from '../audio/music.js';
import { sfx } from '../audio/sfx.js';

const TAP_DELAY = 1.5;

// 通关画面：烟花循环，点击回到标题
export function createEndingScene(app) {
  let t = 0;
  let particles = createParticles();
  let fwTimer = 0;
  let armed = false;

  return {
    enter() {
      t = 0;
      particles = createParticles();
      fwTimer = 0;
      armed = false;
      playMusic('title');
    },
    update(dt) {
      t += dt;
      fwTimer -= dt;
      if (fwTimer <= 0) {
        fwTimer = 0.35 + Math.random() * 0.3;
        firework(particles, 20 + Math.random() * (W - 40), 30 + Math.random() * 160);
        sfx.firework();
      }
      updateParticles(particles, dt);
    },
    draw(ctx) {
      drawBackground(ctx, app.bg, app.sprites);
      drawParticles(ctx, particles);
      drawText(ctx, '恭喜通关！', W / 2, 70, { size: 18, color: '#ffd93d' });
      drawText(ctx, '你飞越了整个银河', W / 2, 96, { size: 10, color: '#9be7ff' });
      // 8 字形飞行
      const a = t * 1.6;
      const x = W / 2 + Math.sin(a) * 50;
      const y = 170 + Math.sin(a * 2) * 20;
      const dx = Math.cos(a) * 50;
      const dy = Math.cos(a * 2) * 40;
      drawPlane(ctx, app.sprites, x, y, t, Math.atan2(dx, -dy));
      if (t >= TAP_DELAY && Math.floor(t * 2) % 2 === 0) drawText(ctx, '点击返回标题', W / 2, 270, { size: 10 });
    },
    onPointerDown() {
      armed = t >= TAP_DELAY;
    },
    onPointerUp() {
      if (!armed) return;
      armed = false;
      sfx.click();
      app.go('title');
    },
  };
}
