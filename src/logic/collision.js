import { HITBOX_RATIO } from '../config.js';

// 碰撞半径 = 图像半宽 × 70%
export function hitRadius(width) {
  return (width / 2) * HITBOX_RATIO;
}

// a、b 为 {x, y, r}；相切不算重叠
export function circlesOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.r + b.r;
  return dx * dx + dy * dy < r * r;
}
