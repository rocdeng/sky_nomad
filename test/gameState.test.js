import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, progress, HIT_INVULN } from '../src/logic/gameState.js';
import { createObstacle } from '../src/logic/obstacles.js';
import { createPowerup } from '../src/logic/powerups.js';
import { mulberry32 } from '../src/logic/rng.js';
import { starsForHp } from '../src/logic/rating.js';

const DT = 1 / 60;

// 不让生成器干扰测试
function quietGame(levelId = 1) {
  const g = createGame(levelId, mulberry32(1));
  g.spawner = { update: () => [] };
  return g;
}

// 一个停在玩家身上的障碍物
function stuckOn(g) {
  const o = createObstacle('meteor', { x: g.player.x, big: true }, g.rng);
  o.y = g.player.y;
  o.vy = 0;
  g.obstacles.push(o);
  return o;
}

function addPowerup(g, type) {
  const p = createPowerup(type, g.rng);
  p.x = g.player.x;
  p.y = g.player.y;
  g.powerups.push(p);
}

test('hit costs 1 hp then 1.5s invulnerability', () => {
  const g = quietGame();
  stuckOn(g);
  const ev = step(g, DT);
  assert.equal(g.player.hp, 4);
  assert.equal(g.player.invuln, HIT_INVULN);
  assert.ok(ev.some((e) => e.type === 'hit'));
  // 1.5 秒内持续重叠不再扣血
  for (let t = 0; t < 1.4; t += DT) step(g, DT);
  assert.equal(g.player.hp, 4);
  for (let t = 0; t < 0.2; t += DT) step(g, DT);
  assert.equal(g.player.hp, 3);
});

test('obstacle stays after a hit', () => {
  const g = quietGame();
  stuckOn(g);
  step(g, DT);
  assert.equal(g.obstacles.length, 1);
});

test('shield blocks damage and does not trigger invulnerability', () => {
  const g = quietGame();
  addPowerup(g, 'shield');
  step(g, DT);
  assert.equal(g.player.shield, 5);
  stuckOn(g);
  for (let t = 0; t < 4.5; t += DT) step(g, DT);
  assert.equal(g.player.hp, 5);
  assert.equal(g.player.invuln, 0);
  for (let t = 0; t < 1; t += DT) step(g, DT);
  assert.equal(g.player.hp, 4, 'shield expired after 5s');
});

test('picking a shield again resets it to 5s', () => {
  const g = quietGame();
  addPowerup(g, 'shield');
  step(g, DT);
  for (let t = 0; t < 2; t += DT) step(g, DT);
  addPowerup(g, 'shield');
  step(g, DT);
  assert.equal(g.player.shield, 5);
});

test('heart adds hp up to 5', () => {
  const g = quietGame();
  addPowerup(g, 'heart');
  step(g, DT);
  assert.equal(g.player.hp, 5);
  g.player.hp = 3;
  addPowerup(g, 'heart');
  const ev = step(g, DT);
  assert.equal(g.player.hp, 4);
  assert.ok(ev.some((e) => e.type === 'pickup' && e.kind === 'heart'));
});

test('star adds 10 points', () => {
  const g = quietGame();
  addPowerup(g, 'star');
  step(g, DT);
  assert.equal(g.score, 10);
  assert.equal(g.powerups.length, 0);
});

test('hp 0 → lost', () => {
  const g = quietGame();
  g.player.hp = 1;
  stuckOn(g);
  const ev = step(g, DT);
  assert.equal(g.status, 'lost');
  assert.ok(ev.some((e) => e.type === 'lost'));
});

test('surviving the full duration → won with rating', () => {
  for (const hp of [5, 4, 3, 2, 1]) {
    const g = quietGame(1);
    g.player.hp = hp;
    let won = null;
    for (let t = 0; t < g.level.duration + 1 && !won; t += DT) {
      won = step(g, DT).find((e) => e.type === 'won') || null;
    }
    assert.equal(g.status, 'won');
    assert.equal(g.stars, starsForHp(hp));
    assert.equal(won.stars, starsForHp(hp));
    assert.equal(progress(g), 1);
  }
});

test('nothing changes after the game ends', () => {
  const g = quietGame();
  g.elapsed = g.level.duration;
  step(g, DT);
  assert.equal(g.status, 'won');
  const snapshot = JSON.stringify({ e: g.elapsed, p: g.player, s: g.score });
  assert.deepEqual(step(g, 1), []);
  assert.equal(JSON.stringify({ e: g.elapsed, p: g.player, s: g.score }), snapshot);
});

test('full level 5 simulation with a real spawner stays consistent', () => {
  const g = createGame(5, mulberry32(123));
  g.player.shield = 1e9; // 不会死
  let ships = 0;
  while (g.status === 'playing') {
    step(g, DT);
    const alive = g.obstacles.filter((o) => o.type === 'ship').length;
    ships = Math.max(ships, alive);
    if (g.elapsed < g.level.duration - 10) assert.equal(alive, 0);
  }
  assert.equal(g.status, 'won');
  assert.ok(ships >= 1 && ships <= 2);
});
