// 玩家小飞机：带尾焰闪烁，可旋转（角度 0 = 机头朝上）
const FLAME = ['#ffd93d', '#ff9f1c', '#ff4d6d'];

export function drawPlane(ctx, sprites, x, y, t, angle = 0) {
  const spr = sprites.player;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (angle) ctx.rotate(angle);
  const f = Math.floor(t * 12) % 2;
  ctx.fillStyle = FLAME[1];
  ctx.fillRect(-1, 8, 2, 2 + f);
  ctx.fillStyle = FLAME[f ? 0 : 2];
  ctx.fillRect(-1, 10 + f, 2, 1);
  ctx.drawImage(spr.canvas, -spr.w / 2, -spr.h / 2);
  ctx.restore();
}
