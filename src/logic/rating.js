// 过关评星：剩余血量 5 → 3 星，3~4 → 2 星，1~2 → 1 星，0 → 0（失败）
export function starsForHp(hp) {
  if (hp >= 5) return 3;
  if (hp >= 3) return 2;
  if (hp >= 1) return 1;
  return 0;
}
