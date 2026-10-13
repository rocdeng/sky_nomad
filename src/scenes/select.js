import { W } from '../config.js';
import { LEVELS } from '../logic/levels.js';
import { loadUnlocked } from '../logic/storage.js';
import { drawBackground } from '../gfx/background.js';
import { drawText, makeButton, createButtonGroup } from '../engine/ui.js';
import { PALETTE } from '../gfx/palette.js';
import { playMusic } from '../audio/music.js';
import { sfx } from '../audio/sfx.js';

const LEVEL_COLORS = [PALETTE.b, PALETTE.P, PALETTE.g, PALETTE.o, PALETTE.r];

export function createSelectScene(app) {
  let group = createButtonGroup();
  let unlocked = 1;

  return {
    enter() {
      unlocked = loadUnlocked(app.storage);
      const buttons = LEVELS.map((lv, i) =>
        makeButton(24, 62 + i * 40, 132, 30, `${lv.id}  ${lv.name}`, {
          id: lv.id,
          color: LEVEL_COLORS[i],
          enabled: lv.id <= unlocked,
        }),
      );
      buttons.push(makeButton(55, 280, 70, 22, '返回', { id: 'back', color: PALETTE.S }));
      group = createButtonGroup(buttons);
      playMusic('title');
    },
    update() {},
    draw(ctx) {
      drawBackground(ctx, app.bg, app.sprites);
      drawText(ctx, '选择关卡', W / 2, 34, { size: 14, color: '#ffd93d' });
      group.draw(ctx, (b) => (b.enabled ? null : { icon: app.sprites.lock }));
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
      if (b.id === 'back') app.go('title');
      else app.go('play', { level: b.id });
    },
    get unlocked() {
      return unlocked;
    },
  };
}
