import { W } from '../config.js';

// Pointer Events（触摸/鼠标统一），监听整个 window：任意位置按下拖动。
// 回调参数为逻辑坐标；move 额外给出逻辑位移 (dx, dy)。多指时只跟踪第一个 pointerId。
export function createInput(canvas, { down, move, up }) {
  let activeId = null;
  let last = null;

  const toLogical = (e) => {
    const rect = canvas.getBoundingClientRect();
    const s = rect.width / W || 1;
    return { x: (e.clientX - rect.left) / s, y: (e.clientY - rect.top) / s };
  };

  window.addEventListener(
    'pointerdown',
    (e) => {
      e.preventDefault();
      if (activeId !== null) return;
      activeId = e.pointerId;
      last = toLogical(e);
      down(last);
    },
    { passive: false },
  );

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerId !== activeId) return;
      e.preventDefault();
      const p = toLogical(e);
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      last = p;
      move(p, dx, dy);
    },
    { passive: false },
  );

  const end = (e) => {
    if (e.pointerId !== activeId) return;
    activeId = null;
    up(toLogical(e));
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);

  // 防止页面滚动 / 长按菜单（缩放已由 CSS touch-action: none 禁止）
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
}
