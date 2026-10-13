import { getLevel } from './levels.js';
import { createSpawner } from './spawner.js';
import { createObstacle, updateObstacle, isOffscreen, isCollidable } from './obstacles.js';
import { createPlayer, MAX_HP } from './player.js';
import { createPowerup, updatePowerup, isPowerupOffscreen, STAR_SCORE, SHIELD_TIME } from './powerups.js';
import { circlesOverlap } from './collision.js';
import { starsForHp } from './rating.js';

export const HIT_INVULN = 1.5;

export function createGame(levelId, rng = Math.random) {
  const level = getLevel(levelId);
  return {
    level,
    rng,
    spawner: createSpawner(level, rng),
    player: createPlayer(),
    obstacles: [],
    powerups: [],
    elapsed: 0,
    score: 0,
    stars: 0,
    status: 'playing', // 'playing' | 'won' | 'lost'
  };
}

export function progress(game) {
  return Math.min(1, game.elapsed / game.level.duration);
}

function countByType(list) {
  const c = {};
  for (const o of list) c[o.type] = (c[o.type] || 0) + 1;
  return c;
}

// 推进一帧，返回事件列表：
// {type:'spawn', obstacle} | {type:'hit', x, y} | {type:'pickup', kind, x, y} | {type:'won', stars} | {type:'lost'}
export function step(game, dt) {
  const events = [];
  if (game.status !== 'playing') return events;

  const { level, rng, player: p } = game;
  game.elapsed += dt;
  p.invuln = Math.max(0, p.invuln - dt);
  p.shield = Math.max(0, p.shield - dt);

  // 生成
  for (const req of game.spawner.update(dt, game.elapsed, countByType(game.obstacles))) {
    if (req.kind === 'obstacle') {
      const o = createObstacle(req.type, {}, rng, level.speedMul);
      game.obstacles.push(o);
      events.push({ type: 'spawn', obstacle: o });
    } else {
      game.powerups.push(createPowerup(req.type, rng));
    }
  }

  // 运动与出屏移除
  for (const o of game.obstacles) updateObstacle(o, dt);
  game.obstacles = game.obstacles.filter((o) => !isOffscreen(o));
  for (const pu of game.powerups) updatePowerup(pu, dt);
  game.powerups = game.powerups.filter((pu) => !isPowerupOffscreen(pu));

  // 拾取道具
  game.powerups = game.powerups.filter((pu) => {
    if (!circlesOverlap(p, pu)) return true;
    if (pu.type === 'star') game.score += STAR_SCORE;
    else if (pu.type === 'heart') p.hp = Math.min(MAX_HP, p.hp + 1);
    else if (pu.type === 'shield') p.shield = SHIELD_TIME;
    events.push({ type: 'pickup', kind: pu.type, x: pu.x, y: pu.y });
    return false;
  });

  // 障碍物碰撞（障碍物不消失；无敌/护盾期间穿过）
  if (p.invuln <= 0 && p.shield <= 0) {
    for (const o of game.obstacles) {
      if (!isCollidable(o) || !circlesOverlap(p, o)) continue;
      p.hp -= 1;
      p.invuln = HIT_INVULN;
      events.push({ type: 'hit', x: (p.x + o.x) / 2, y: (p.y + o.y) / 2 });
      break;
    }
  }

  if (p.hp <= 0) {
    p.hp = 0;
    game.status = 'lost';
    events.push({ type: 'lost' });
  } else if (game.elapsed >= level.duration) {
    game.status = 'won';
    game.stars = starsForHp(p.hp);
    events.push({ type: 'won', stars: game.stars });
  }

  return events;
}
