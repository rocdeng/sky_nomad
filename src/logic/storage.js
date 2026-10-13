import { MAX_LEVEL } from '../config.js';

export const UNLOCK_KEY = 'skyNomad.unlocked';
export const MUTE_KEY = 'skyNomad.muted';

// storage 为注入的 Web Storage 接口（运行时传 localStorage）。
// 缺失/非法/越界/读取异常 → 1
export function loadUnlocked(storage) {
  try {
    const v = storage ? storage.getItem(UNLOCK_KEY) : null;
    if (v == null || !/^\d+$/.test(v)) return 1;
    const n = Number(v);
    if (n < 1 || n > MAX_LEVEL) return 1;
    return n;
  } catch {
    return 1;
  }
}

// 只增不减；写入异常静默忽略。返回保存后的解锁值。
export function saveUnlocked(storage, n) {
  const cur = loadUnlocked(storage);
  const want = Math.min(MAX_LEVEL, Math.max(1, Math.floor(Number(n) || 1)));
  const next = Math.max(cur, want);
  try {
    if (storage) storage.setItem(UNLOCK_KEY, String(next));
  } catch {
    // 隐私模式等写入失败：忽略
  }
  return next;
}

// 通关第 level 关 → 解锁 level+1（上限 MAX_LEVEL）
export function unlockAfterClear(storage, level) {
  return saveUnlocked(storage, Math.min(MAX_LEVEL, level + 1));
}

export function loadMuted(storage) {
  try {
    return storage ? storage.getItem(MUTE_KEY) === '1' : false;
  } catch {
    return false;
  }
}

export function saveMuted(storage, muted) {
  try {
    if (storage) storage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // 忽略
  }
}
