import { W, H, BG_COLOR, MAX_LEVEL } from './config.js';
import { computeScale } from './logic/scale.js';
import { buildSpriteCache } from './gfx/spriteCache.js';
import { createBackground, updateBackground } from './gfx/background.js';
import { startLoop } from './engine/loop.js';
import { createInput } from './engine/input.js';
import * as scenes from './engine/scenes.js';
import { drawText, drawMuteButton, hitMute } from './engine/ui.js';
import { setupAudio, initAudio, isMuted, toggleMuted, suspendAudio, resumeAudio } from './audio/audio.js';
import { createTitleScene } from './scenes/title.js';
import { createSelectScene } from './scenes/select.js';
import { createPlayScene } from './scenes/play.js';
import { createWinScene } from './scenes/win.js';
import { createLoseScene } from './scenes/lose.js';
import { createEndingScene } from './scenes/ending.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);

// 整数倍缩放，余下区域由 body 背景色（与游戏背景相同）填充
let scale = 1;
function layout() {
  const r = computeScale(window.innerWidth, window.innerHeight);
  scale = r.s;
  canvas.style.width = `${r.cssW}px`;
  canvas.style.height = `${r.cssH}px`;
  canvas.style.left = `${r.left}px`;
  canvas.style.top = `${r.top}px`;
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', layout);
layout();
ctx.imageSmoothingEnabled = false;

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const sprites = buildSpriteCache();

// 调试：?debug=sprites 查看全部缓存精灵
function drawSpriteSheet() {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);
  let x = 4;
  let y = 4;
  let rowH = 0;
  for (const [name, spr] of Object.entries(sprites)) {
    if (x + spr.w > W - 4) {
      x = 4;
      y += rowH + 12;
      rowH = 0;
    }
    ctx.drawImage(spr.canvas, x, y);
    drawText(ctx, name, x, y + spr.h + 5, { size: 6, align: 'left', outline: null, color: '#9be7ff' });
    x += Math.max(spr.w, name.length * 4) + 6;
    rowH = Math.max(rowH, spr.h);
  }
}

function startGame() {
  const storage = safeStorage();
  setupAudio(storage);

  const app = {
    sprites,
    storage,
    bg: createBackground(),
    paused: false,
    go: (name, p) => scenes.go(name, p),
  };

  scenes.register('title', createTitleScene(app));
  scenes.register('select', createSelectScene(app));
  scenes.register('play', createPlayScene(app));
  scenes.register('win', createWinScene(app));
  scenes.register('lose', createLoseScene(app));
  scenes.register('ending', createEndingScene(app));

  // 输入：静音按钮与"点击继续"会吞掉这次按下，不传给场景
  let swallow = false;
  createInput(canvas, {
    down(p) {
      initAudio();
      if (app.paused) {
        app.paused = false;
        resumeAudio();
        swallow = true;
        return;
      }
      if (hitMute(p)) {
        toggleMuted();
        swallow = true;
        return;
      }
      swallow = false;
      scenes.currentScene().onPointerDown?.(p);
    },
    move(p, dx, dy) {
      if (swallow || app.paused) return;
      scenes.currentScene().onPointerMove?.(p, dx, dy);
    },
    up(p) {
      // 触摸时浏览器在 pointerup 才算用户激活，这里再尝试一次 resume
      initAudio();
      if (swallow) {
        swallow = false;
        return;
      }
      if (app.paused) return;
      scenes.currentScene().onPointerUp?.(p);
    },
  });

  // 切到后台：暂停游戏与声音；回到前台显示"点击继续"
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      app.paused = true;
      suspendAudio();
    }
  });

  // 调试：?debug&level=N 直接进入第 N 关
  const startLevel = params.has('debug') ? Number(params.get('level')) : NaN;
  if (Number.isInteger(startLevel) && startLevel >= 1 && startLevel <= MAX_LEVEL) scenes.go('play', { level: startLevel });
  else scenes.go('title');

  if (params.has('debug')) window.skyNomad = { app, scenes, isMuted, get scale() { return scale; } };

  startLoop(
    (dt) => {
      if (app.paused) return;
      updateBackground(app.bg, dt);
      scenes.currentScene().update(dt);
    },
    () => {
      ctx.imageSmoothingEnabled = false;
      scenes.currentScene().draw(ctx);
      drawMuteButton(ctx, sprites, isMuted());
      if (app.paused) {
        ctx.fillStyle = 'rgba(27,42,92,0.7)';
        ctx.fillRect(0, 0, W, H);
        drawText(ctx, '暂停中', W / 2, H / 2 - 12, { size: 14, color: '#ffd93d' });
        drawText(ctx, '点击继续', W / 2, H / 2 + 10, { size: 10 });
        drawMuteButton(ctx, sprites, isMuted());
      }
    },
  );
}

if (params.get('debug') === 'sprites') drawSpriteSheet();
else startGame();
