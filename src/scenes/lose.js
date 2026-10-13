import { W } from '../config.js';
import { getLevel } from '../logic/levels.js';
import { drawBackground } from '../gfx/background.js';
import { drawSprite } from '../gfx/spriteCache.js';
import { drawPlane } from '../gfx/plane.js';
import { PALETTE } from '../gfx/palette.js';
import { drawText, makeButton, createButtonGroup } from '../engine/ui.js';
import { stopMusic } from '../audio/music.js';
import { sfx } from '../audio/sfx.js';

export function createLoseScene(app) {
  let t = 0;
  let level = 1;
  let group = createButtonGroup();

  return {
    enter(params) {
      level = params.level;
      t = 0;
      stopMusic();
      sfx.lose();
      group = createButtonGroup([
        makeButton(14, 250, 72, 24, '再来一次', { id: 'retry', color: PALETTE.g }),
        makeButton(94, 250, 72, 24, '选关', { id: 'select', color: PALETTE.b }),
      ]);
    },
    update(dt) {
      t += dt;
    },
    draw(ctx) {
      drawBackground(ctx, app.bg, app.sprites);
      drawText(ctx, '哎呀！', W / 2, 60, { size: 18, color: '#ff8fd8' });
      drawText(ctx, `第 ${level} 关 ${getLevel(level).name}`, W / 2, 84, { size: 10, color: '#9be7ff' });
      // 晕乎乎的小飞机 + 绕头转的小星星
      const cx = W / 2;
      const cy = 156;
      drawPlane(ctx, app.sprites, cx, cy + Math.sin(t * 3) * 2, t, Math.sin(t * 4) * 0.35);
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i * Math.PI * 2) / 3;
        drawSprite(ctx, app.sprites.hudStar, cx + Math.cos(a) * 14, cy - 14 + Math.sin(a) * 4);
      }
      drawText(ctx, '别灰心，再试一次吧', W / 2, 210, { size: 10 });
      group.draw(ctx);
    },
    onPointerDown(p) {
      group.down(p);
    },
    onPointerMove(p) {
      group.move(p);
    },
    onPointerUp(p) {
      const b = group.up(p);
      if (!b) return;
      sfx.click();
      if (b.id === 'retry') app.go('play', { level });
      else app.go('select');
    },
  };
}
