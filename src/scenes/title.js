import { W, H } from '../config.js';
import { drawBackground } from '../gfx/background.js';
import { drawPlane } from '../gfx/plane.js';
import { drawSprite } from '../gfx/spriteCache.js';
import { drawText } from '../engine/ui.js';
import { playMusic } from '../audio/music.js';
import { sfx } from '../audio/sfx.js';

export function createTitleScene(app) {
  let t = 0;
  let armed = false;

  return {
    enter() {
      t = 0;
      armed = false;
      playMusic('title');
    },
    update(dt) {
      t += dt;
    },
    draw(ctx) {
      drawBackground(ctx, app.bg, app.sprites);
      // 装饰：几颗绕着标题闪的星星
      for (let i = 0; i < 4; i++) {
        const a = t * 0.8 + (i * Math.PI) / 2;
        drawSprite(ctx, app.sprites.hudStar, W / 2 + Math.cos(a) * 70, 92 + Math.sin(a) * 22);
      }
      drawText(ctx, 'Sky Nomad', W / 2, 88, { size: 22, color: '#ffd93d' });
      drawPlane(ctx, app.sprites, W / 2, 190 + Math.sin(t * 2.5) * 4, t, Math.sin(t * 1.3) * 0.12);
      if (Math.floor(t * 2) % 2 === 0) drawText(ctx, '点击开始', W / 2, 258, { size: 12 });
      drawText(ctx, '按住拖动 躲开障碍', W / 2, 290, { size: 8, color: '#9be7ff' });
    },
    onPointerDown() {
      armed = true;
    },
    onPointerUp() {
      if (!armed) return;
      armed = false;
      sfx.click();
      app.go('select');
    },
  };
}
