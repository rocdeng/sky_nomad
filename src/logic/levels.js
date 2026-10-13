// 关卡配置。生成间隔（秒）随关内进度从 spawnStart 线性降到 spawnEnd。
const speedMul = (id) => 1 + 0.08 * (id - 1);

export const LEVELS = [
  { id: 1, name: '陨石带', duration: 45, obstacles: ['meteor'], spawnStart: 1.2, spawnEnd: 0.6, speedMul: speedMul(1), extra: [] },
  { id: 2, name: '流星雨', duration: 50, obstacles: ['meteor', 'shooting'], spawnStart: 1.1, spawnEnd: 0.5, speedMul: speedMul(2), extra: [] },
  { id: 3, name: '外星人来访', duration: 55, obstacles: ['alien', 'meteor'], spawnStart: 1.0, spawnEnd: 0.45, speedMul: speedMul(3), extra: [] },
  { id: 4, name: '彗星之路', duration: 60, obstacles: ['comet', 'shooting', 'alien'], spawnStart: 0.9, spawnEnd: 0.4, speedMul: speedMul(4), extra: [] },
  {
    id: 5,
    name: '银河大冒险',
    duration: 70,
    obstacles: ['meteor', 'shooting', 'comet', 'alien'],
    spawnStart: 0.8,
    spawnEnd: 0.35,
    speedMul: speedMul(5),
    // 最后 10 秒加入大飞船
    extra: [{ type: 'ship', from: 60, interval: 3.0, max: 2 }],
  },
];

export function getLevel(id) {
  const lv = LEVELS.find((l) => l.id === id);
  if (!lv) throw new Error(`unknown level ${id}`);
  return lv;
}
