import { clamp } from './rng.js';
import { pickPowerupType, nextPowerupDelay } from './powerups.js';

// interval(t) = spawnStart + (spawnEnd - spawnStart) * clamp(t / duration, 0, 1)
export function spawnInterval(level, elapsed) {
  const t = clamp(elapsed / level.duration, 0, 1);
  return level.spawnStart + (level.spawnEnd - level.spawnStart) * t;
}

// 返回 { update(dt, elapsed, counts) → spawnRequest[] }
// spawnRequest: { kind: 'obstacle' | 'powerup', type }
// counts: 当前在场障碍物按类型计数，用于 extra 规则的 max 限制
export function createSpawner(level, rng) {
  let mainTimer = spawnInterval(level, 0);
  let powerupTimer = nextPowerupDelay(rng);
  const extras = level.extra.map((rule) => ({ rule, started: false, timer: 0 }));

  function update(dt, elapsed, counts = {}) {
    const out = [];

    mainTimer -= dt;
    while (mainTimer <= 0) {
      const type = level.obstacles[Math.floor(rng() * level.obstacles.length)];
      out.push({ kind: 'obstacle', type });
      mainTimer += spawnInterval(level, elapsed);
    }

    for (const ex of extras) {
      if (elapsed < ex.rule.from) continue;
      if (!ex.started) {
        ex.started = true;
        ex.timer = 0; // 进入阶段立即生成第一个
      }
      ex.timer -= dt;
      while (ex.timer <= 0) {
        const alive = (counts[ex.rule.type] || 0) + out.filter((r) => r.type === ex.rule.type).length;
        if (alive < ex.rule.max) out.push({ kind: 'obstacle', type: ex.rule.type });
        ex.timer += ex.rule.interval;
      }
    }

    powerupTimer -= dt;
    while (powerupTimer <= 0) {
      out.push({ kind: 'powerup', type: pickPowerupType(rng) });
      powerupTimer += nextPowerupDelay(rng);
    }

    return out;
  }

  return { update };
}
