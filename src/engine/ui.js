import { W } from '../config.js';
import { PALETTE } from '../gfx/palette.js';

export const FONT = "'PingFang SC','Microsoft YaHei','Noto Sans CJK SC','Hiragino Sans GB',sans-serif";
const OUTLINE = PALETTE.k;

// 在逻辑画布上画字，带 1px 深色描边
export function drawText(ctx, text, x, y, { size = 10, color = '#ffffff', align = 'center', outline = OUTLINE, baseline = 'middle' } = {}) {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  x = Math.round(x);
  y = Math.round(y);
  if (outline) {
    ctx.fillStyle = outline;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) ctx.fillText(text, x + dx, y + dy);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// ---- 按钮 ----
export function makeButton(x, y, w, h, label, { color = PALETTE.b, enabled = true, id = label } = {}) {
  return { x, y, w, h, label, color, enabled, id, pressed: false };
}

export function hitRect(r, p) {
  return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
}

export function drawButton(ctx, b, { icon = null } = {}) {
  const off = b.pressed ? 1 : 0;
  const x = b.x;
  const y = b.y + off;
  const fill = b.enabled ? b.color : PALETTE.S;
  // 阴影
  if (!b.pressed) {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x + 1, y + b.h, b.w - 1, 1);
  }
  // 描边 + 圆角（去掉四角像素）
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x + 1, y, b.w - 2, b.h);
  ctx.fillRect(x, y + 1, b.w, b.h - 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, b.w - 2, b.h - 2);
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + 2, y + 2, b.w - 4, 1);
  if (icon) ctx.drawImage(icon.canvas, Math.round(x + 7), Math.round(y + (b.h - icon.h) / 2));
  drawText(ctx, b.label, x + b.w / 2, y + b.h / 2 + 1, { size: 10, color: b.enabled ? '#ffffff' : '#d5dbe8' });
}

// 一组按钮：按下高亮，抬起时仍在同一按钮上才触发（避免跨场景误触）
export function createButtonGroup(buttons = []) {
  return {
    buttons,
    down(p) {
      for (const b of this.buttons) b.pressed = b.enabled && hitRect(b, p);
      return this.buttons.some((b) => b.pressed);
    },
    move(p) {
      for (const b of this.buttons) if (b.pressed && !hitRect(b, p)) b.pressed = false;
    },
    up(p) {
      let fired = null;
      for (const b of this.buttons) {
        if (b.pressed && hitRect(b, p)) fired = b;
        b.pressed = false;
      }
      return fired;
    },
    draw(ctx, opts) {
      for (const b of this.buttons) drawButton(ctx, b, opts?.(b) ?? undefined);
    },
  };
}

// ---- 静音按钮（右上角） ----
export const MUTE_RECT = { x: W - 14, y: 2, w: 12, h: 12 };

export function drawMuteButton(ctx, sprites, muted) {
  const s = muted ? sprites.soundOff : sprites.soundOn;
  ctx.drawImage(s.canvas, MUTE_RECT.x, MUTE_RECT.y);
}

export function hitMute(p) {
  // 命中区域略放大，方便手指点
  return p.x >= MUTE_RECT.x - 4 && p.x <= MUTE_RECT.x + MUTE_RECT.w + 2 && p.y >= 0 && p.y <= MUTE_RECT.y + MUTE_RECT.h + 4;
}
