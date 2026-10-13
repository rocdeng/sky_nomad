import { W, H, MAX_LEVEL } from '../config.js';
import { getLevel } from '../logic/levels.js';
import { unlockAfterClear } from '../logic/storage.js';
import { drawBackground } from '../gfx/background.js';
import { drawSprite } from '../gfx/spriteCache.js';
import { drawPlane } from '../gfx/plane.js';
import { createParticles, firework, confetti, updateParticles, drawParticles } from '../gfx/particles.js';
import { PALETTE } from '../gfx/palette.js';
import { drawText, makeButton, createButtonGroup } from '../engine/ui.js';
import { stopMusic } from '../audio/music.js';
import { sfx } from '../audio/sfx.js';

const STAR_START = 0.8;
const STAR_STEP = 0.4;
const STAR_X = [60, 90, 120];
const STAR_Y = 206;

export function createWinScene(app) {
  let t = 0;
  let level = 1;
  let stars = 0;
  let score = 0;
  let shown = 0;
  let particles = createParticles();
  let fwTimer = 0;
  let confettiTimer = 0;
  let group = createButtonGroup();
  let buttonsAt = 0;

  return {
    enter(params) {
      ({ level, stars, score } = params);
      t = 0;
      shown = 0;
      particles = createParticles();
      fwTimer = 0;
      confettiTimer = 0;
      unlockAfterClear(app.storage, level);
      stopMusic();
      sfx.win();
      const buttons =
        level < MAX_LEVEL
          ? [
              makeButton(14, 270, 72, 24, '下一关', { id: 'next', color: PALETTE.g }),
              makeButton(94, 270, 72, 24, '选关', { id: 'select', color: PALETTE.b }),
            ]
          : [makeButton(50, 270, 80, 24, '继续', { id: 'continue', color: PALETTE.g })];
      group = createButtonGroup(buttons);
      buttonsAt = STAR_START + STAR_STEP * 3;
    },
    update(dt) {
      t += dt;
      fwTimer -= dt;
      if (fwTimer <= 0) {
        fwTimer = 0.45 + Math.random() * 0.3;
        firework(particles, 20 + Math.random() * (W - 40), 40 + Math.random() * 100);
        sfx.firework();
      }
      confettiTimer -= dt;
      while (confettiTimer <= 0) {
        confettiTimer += 0.05;
        confetti(particles, W);
      }
      updateParticles(particles, dt);
      // 星级逐个出现
      while (shown < stars && t >= STAR_START + shown * STAR_STEP) {
        sfx.starPop(shown);
        shown++;
      }
    },
    draw(ctx) {
      drawBackground(ctx, app.bg, app.sprites);
      drawParticles(ctx, particles);
      drawText(ctx, '过关啦！', W / 2, 40, { size: 18, color: '#ffd93d' });
      drawText(ctx, `第 ${level} 关 ${getLevel(level).name}`, W / 2, 64, { size: 10, color: '#9be7ff' });
      // 飞机转圈
      const a = t * 3;
      drawPlane(ctx, app.sprites, W / 2 + Math.cos(a) * 28, 136 + Math.sin(a) * 28, t, a + Math.PI);
      // 星级
      STAR_X.forEach((x, i) => {
        const on = i < shown;
        const pop = on ? Math.max(0, 1 - (t - STAR_START - i * STAR_STEP) * 5) : 0;
        ctx.globalAlpha = on ? 1 : 0.25;
        drawSprite(ctx, app.sprites.star, x, STAR_Y - Math.round(pop * 4), 2);
        ctx.globalAlpha = 1;
      });
      drawText(ctx, `得分 ${score}`, W / 2, 238, { size: 10 });
      if (t >= buttonsAt) group.draw(ctx);
    },
    onPointerDown(p) {
      if (t >= buttonsAt) group.down(p);
    },
    onPointerMove(p) {
      group.move(p);
    },
    onPointerUp(p) {
      const b = group.up(p);
      if (!b) return;
      sfx.click();
      if (b.id === 'next') app.go('play', { level: level + 1 });
      else if (b.id === 'select') app.go('select');
      else app.go('ending');
    },
    get state() {
      return { level, stars, score, shown };
    },
  };
}
