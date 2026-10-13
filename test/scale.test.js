import test from 'node:test';
import assert from 'node:assert/strict';
import { computeScale } from '../src/logic/scale.js';

test('picks the largest integer scale that fits', () => {
  assert.equal(computeScale(390, 844).s, 2);
  assert.equal(computeScale(1080, 1920).s, 6);
  assert.equal(computeScale(360, 640).s, 2);
  assert.equal(computeScale(1920, 1080).s, 3); // 横屏桌面：受高度限制
});

test('scale is at least 1 on tiny viewports', () => {
  assert.equal(computeScale(100, 100).s, 1);
});

test('css size is an exact multiple and centered', () => {
  const r = computeScale(390, 844);
  assert.equal(r.cssW, 360);
  assert.equal(r.cssH, 640);
  assert.equal(r.left, 15);
  assert.equal(r.top, 102);
});
