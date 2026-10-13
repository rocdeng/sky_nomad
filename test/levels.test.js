import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, getLevel } from '../src/logic/levels.js';

const SPEC = [
  { id: 1, name: '陨石带', duration: 45, obstacles: ['meteor'] },
  { id: 2, name: '流星雨', duration: 50, obstacles: ['meteor', 'shooting'] },
  { id: 3, name: '外星人来访', duration: 55, obstacles: ['alien', 'meteor'] },
  { id: 4, name: '彗星之路', duration: 60, obstacles: ['comet', 'shooting', 'alien'] },
  { id: 5, name: '银河大冒险', duration: 70, obstacles: ['meteor', 'shooting', 'comet', 'alien'] },
];

test('five levels match the spec table', () => {
  assert.equal(LEVELS.length, 5);
  for (const s of SPEC) {
    const lv = getLevel(s.id);
    assert.equal(lv.name, s.name);
    assert.equal(lv.duration, s.duration);
    assert.deepEqual([...lv.obstacles].sort(), [...s.obstacles].sort());
  }
});

test('spawn interval shrinks over the level', () => {
  for (const lv of LEVELS) {
    assert.ok(lv.spawnStart > lv.spawnEnd, `level ${lv.id}`);
    assert.ok(lv.spawnEnd > 0);
  }
});

test('only level 5 adds ships, during the last 10 seconds', () => {
  for (const lv of LEVELS.slice(0, 4)) assert.deepEqual(lv.extra, []);
  const l5 = getLevel(5);
  assert.equal(l5.extra.length, 1);
  assert.equal(l5.extra[0].type, 'ship');
  assert.equal(l5.extra[0].from, l5.duration - 10);
});

test('unknown level throws', () => {
  assert.throws(() => getLevel(6));
});
