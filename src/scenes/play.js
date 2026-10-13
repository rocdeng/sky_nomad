import { W, H } from '../config.js';
import { createGame, step, progress } from '../logic/gameState.js';
import { movePlayer } from '../logic/player.js';
import { drawBackground } from '../gfx/background.js';
import { drawSprite, drawSpriteRotated } from '../gfx/spriteCache.js';
import { drawPlane } from '../gfx/plane.js';
import { createParticles, burst, updateParticles, drawParticles } from '../gfx/particles.js';
import { PALETTE, RAINBOW } from '../gfx/palette.js';
import { drawText } from '../engine/ui.js';
import { playMusic, stopMusic } from '../audio/music.js';
import { sfx } from '../audio/sfx.js';

const END_DELAY = 0.6;
const SHAKE_TIME = 0.15;
const INTRO_TIME = 2;

// 护盾光环的像素点（半径 12）
const RING = (() => {
  const pts = new Set();
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    pts.add(`${Math.round(Math.cos(a) * 12)},${Math.round(Math.sin(a) * 12)}`);
  }
  return [...pts].map((s) => s.split(',').map(Number));
})();

const PICKUP_COLORS = {
  star: [PALETTE.y, PALETTE.Y, '#ffffff'],
  heart: [PALETTE.r, PALETTE.p, '#ffffff'],
  shield: [PALETTE.b, PALETTE.c, '#ffffff'],
};

export function createPlayScene(app) {
  let game = null;
  let particles = createParticles();
  let shake = 0;
  let endTimer = 0;
  let dragging = false;
  let t = 0;

  function handleEvents(events) {
    for (const e of events) {
      switch (e.type) {
        case 'spawn':
          if (e.obstacle.type === 'shooting') sfx.warn();
          break;
        case 'hit':
          burst(particles, e.x, e.y, { count: 14, speed: 70, colors: [PALETTE.y, PALETTE.o, '#ffffff'] });
          shake = SHAKE_TIME;
          sfx.hit();
          break;
        case 'pickup':
          burst(particles, e.x, e.y, { count: 10, speed: 45, colors: PICKUP_COLORS[e.kind] });
          sfx[e.kind]();
          break;
        case 'won':
        case 'lost':
          stopMusic();
          endTimer = END_DELAY;
          dragging = false;
          break;
      }
    }
  }

  function drawObstacle(ctx, o) {
    const spr = app.sprites[o.sprite];
    switch (o.type) {
      case 'meteor':
        drawSpriteRotated(ctx, spr, o.x, o.y, o.angle);
        break;
      case 'shooting': {
        if (o.warn > 0) {
          // 入口边缘预警：闪烁的 "!"
          if (Math.floor(o.warn * 10) % 2 === 0) {
            const x = Math.min(W - 8, Math.max(8, o.entryX));
            ctx.fillStyle = PALETTE.r;
            ctx.fillRect(Math.round(x) - 4, 1, 9, 13);
            drawText(ctx, '!', x + 0.5, 8, { size: 10, color: PALETTE.y });
          }
          break;
        }
        const len = Math.hypot(o.vx, o.vy);
        const ux = o.vx / len;
        const uy = o.vy / len;
        for (let i = 6; i >= 1; i--) {
          ctx.globalAlpha = 1 - i / 7;
          ctx.fillStyle = i < 3 ? '#ffffff' : PALETTE.y;
          ctx.fillRect(Math.round(o.x - ux * i * 3) - 1, Math.round(o.y - uy * i * 3) - 1, 3, 3);
        }
        ctx.globalAlpha = 1;
        drawSprite(ctx, spr, o.x, o.y);
        break;
      }
      case 'comet':
        for (let i = o.tail.length - 1; i >= 0; i--) {
          const p = o.tail[i];
          const s = Math.max(2, 6 - Math.floor(i * 0.6));
          ctx.fillStyle = RAINBOW[i % RAINBOW.length];
          ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2 - 2), s, s);
        }
        drawSprite(ctx, spr, o.x, o.y);
        break;
      default:
        drawSprite(ctx, spr, o.x, o.y);
    }
  }

  function drawPlayer(ctx) {
    const p = game.player;
    const blinkHidden = p.invuln > 0 && Math.floor(p.invuln / 0.1) % 2 === 0;
    if (!blinkHidden) drawPlane(ctx, app.sprites, p.x, p.y, t);
    if (p.shield > 0 && !(p.shield < 1.5 && Math.floor(p.shield / 0.1) % 2 === 0)) {
      const px = Math.round(p.x);
      const py = Math.round(p.y);
      ctx.globalAlpha = 0.85;
      RING.forEach(([dx, dy], i) => {
        ctx.fillStyle = (i + Math.floor(t * 10)) % 4 === 0 ? '#ffffff' : PALETTE.c;
        ctx.fillRect(px + dx, py + dy, 1, 1);
      });
      ctx.globalAlpha = 1;
    }
  }

  function drawHud(ctx) {
    // 顶部进度条（让出右上角静音按钮）
    const bar = { x: 4, y: 4, w: 156, h: 6 };
    ctx.fillStyle = PALETTE.k;
    ctx.fillRect(bar.x - 1, bar.y - 1, bar.w + 2, bar.h + 2);
    ctx.fillStyle = '#3a4a8a';
    ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
    const fw = Math.floor(bar.w * progress(game));
    ctx.fillStyle = PALETTE.g;
    ctx.fillRect(bar.x, bar.y, fw, bar.h);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(bar.x, bar.y, fw, 1);
    // 血量
    for (let i = 0; i < 5; i++) {
      const spr = i < game.player.hp ? app.sprites.hudHeart : app.sprites.hudHeartEmpty;
      ctx.drawImage(spr.canvas, 4 + i * 9, 14);
    }
    // 分数
    const label = String(game.score);
    drawText(ctx, label, W - 4, 18, { size: 8, align: 'right' });
    const tw = Math.ceil(ctx.measureText(label).width);
    ctx.drawImage(app.sprites.hudStar.canvas, W - 4 - tw - 10, 14);
  }

  return {
    enter({ level = 1 } = {}) {
      game = createGame(level, Math.random);
      particles = createParticles();
      shake = 0;
      endTimer = 0;
      dragging = false;
      t = 0;
      playMusic('play');
    },
    update(dt) {
      t += dt;
      if (shake > 0) shake = Math.max(0, shake - dt);
      updateParticles(particles, dt);
      if (game.status === 'playing') {
        handleEvents(step(game, dt));
        return;
      }
      endTimer -= dt;
      if (endTimer <= 0) {
        const { level, score, stars, player } = game;
        if (game.status === 'won') app.go('win', { level: level.id, score, stars, hp: player.hp });
        else app.go('lose', { level: level.id, score });
      }
    },
    draw(ctx) {
      drawBackground(ctx, app.bg, app.sprites);
      ctx.save();
      if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 4));
      for (const pu of game.powerups) drawSprite(ctx, app.sprites[pu.type], pu.x, pu.y + Math.sin(pu.t * 5) * 1.5);
      for (const o of game.obstacles) drawObstacle(ctx, o);
      drawPlayer(ctx);
      drawParticles(ctx, particles);
      ctx.restore();
      drawHud(ctx);
      if (t < INTRO_TIME) {
        ctx.globalAlpha = Math.min(1, (INTRO_TIME - t) / 0.5);
        drawText(ctx, `第 ${game.level.id} 关`, W / 2, H / 2 - 30, { size: 12, color: '#9be7ff' });
        drawText(ctx, game.level.name, W / 2, H / 2 - 12, { size: 16, color: '#ffd93d' });
        ctx.globalAlpha = 1;
      }
    },
    onPointerDown() {
      dragging = game.status === 'playing';
    },
    onPointerMove(p, dx, dy) {
      if (dragging && game.status === 'playing') movePlayer(game.player, dx, dy);
    },
    onPointerUp() {
      dragging = false;
    },
    get game() {
      return game;
    },
  };
}
