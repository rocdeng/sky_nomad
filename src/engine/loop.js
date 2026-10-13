// requestAnimationFrame 主循环；dt 以秒计，上限 0.05s 防止切后台回来穿模
export const MAX_DT = 0.05;

export function startLoop(update, draw) {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
