import test from 'node:test';
import assert from 'node:assert/strict';
import { getLevel } from '../src/logic/levels.js';
import { spawnInterval, createSpawner } from '../src/logic/spawner.js';
import { mulberry32 } from '../src/logic/rng.js';

const DT = 1 / 60;

test('spawnInterval interpolates linearly and clamps', () => {
  const lv = getLevel(1);
  assert.equal(spawnInterval(lv, 0), lv.spawnStart);
  assert.ok(Math.abs(spawnInterval(lv, lv.duration) - lv.spawnEnd) < 1e-9);
  assert.ok(Math.abs(spawnInterval(lv, lv.duration / 2) - (lv.spawnStart + lv.spawnEnd) / 2) < 1e-9);
  assert.equal(spawnInterval(lv, -5), lv.spawnStart);
  assert.ok(Math.abs(spawnInterval(lv, lv.duration * 3) - lv.spawnEnd) < 1e-9);
});

// 模拟整关，返回 [{t, req}]；ships 计数不移除（飞船穿屏远长于 10 秒）
function simulate(levelId, seed) {
  const lv = getLevel(levelId);
  const sp = createSpawner(lv, mulberry32(seed));
  const counts = {};
  const log = [];
  let maxShips = 0;
  for (let t = DT; t <= lv.duration + 1e-9; t += DT) {
    for (const req of sp.update(DT, t, counts)) {
      log.push({ t, req });
      if (req.kind === 'obstacle') counts[req.type] = (counts[req.type] || 0) + 1;
    }
    maxShips = Math.max(maxShips, counts.ship || 0);
  }
  return { lv, log, maxShips };
}

test('level 1 only spawns meteors', () => {
  const { log } = simulate(1, 1);
  const types = new Set(log.filter((e) => e.req.kind === 'obstacle').map((e) => e.req.type));
  assert.deepEqual([...types], ['meteor']);
});

test('level 2 only spawns meteor and shooting', () => {
  const { log } = simulate(2, 2);
  const types = new Set(log.filter((e) => e.req.kind === 'obstacle').map((e) => e.req.type));
  assert.deepEqual([...types].sort(), ['meteor', 'shooting']);
});

test('level 5 ships appear only in the last 10s, at most 2 alive', () => {
  const { lv, log, maxShips } = simulate(5, 5);
  const ships = log.filter((e) => e.req.type === 'ship');
  assert.ok(ships.length > 0);
  for (const s of ships) assert.ok(s.t >= lv.duration - 10, `ship at ${s.t}`);
  assert.ok(ships[0].t < lv.duration - 10 + 0.05, 'first ship right when the phase starts');
  assert.ok(maxShips <= 2);
  const types = new Set(log.filter((e) => e.req.kind === 'obstacle').map((e) => e.req.type));
  assert.deepEqual([...types].sort(), ['alien', 'comet', 'meteor', 'ship', 'shooting']);
});

test('spawns get denser over the level', () => {
  const { lv, log } = simulate(1, 7);
  const obs = log.filter((e) => e.req.kind === 'obstacle');
  const firstHalf = obs.filter((e) => e.t < lv.duration / 2).length;
  const secondHalf = obs.length - firstHalf;
  assert.ok(secondHalf > firstHalf, `${firstHalf} vs ${secondHalf}`);
});

test('powerups spawn roughly every 5 seconds', () => {
  const { lv, log } = simulate(1, 3);
  const pu = log.filter((e) => e.req.kind === 'powerup');
  // 45 秒，每 4~6 秒一个 → 7~11 个
  assert.ok(pu.length >= Math.floor(lv.duration / 6) && pu.length <= Math.ceil(lv.duration / 4), `${pu.length}`);
  for (let i = 1; i < pu.length; i++) {
    const gap = pu[i].t - pu[i - 1].t;
    assert.ok(gap >= 4 - DT && gap <= 6 + DT, `gap ${gap}`);
  }
});
