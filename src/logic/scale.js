import { W, H } from '../config.js';

// 整数倍缩放：取能放下的最大整数倍（至少 1），余下区域由背景色填充。
export function computeScale(viewW, viewH, w = W, h = H) {
  const s = Math.max(1, Math.min(Math.floor(viewW / w), Math.floor(viewH / h)));
  const cssW = w * s;
  const cssH = h * s;
  return {
    s,
    cssW,
    cssH,
    left: Math.max(0, Math.floor((viewW - cssW) / 2)),
    top: Math.max(0, Math.floor((viewH - cssH) / 2)),
  };
}
