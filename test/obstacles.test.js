import test from 'node:test';
import assert from 'node:assert/strict';
import { createObstacle, updateObstacle, isOffscreen, isCollidable, COMET_AMP } from '../src/logic/obstacles.js';
import { mulberry32 } from '../src/logic/rng.js';
import { hitRadius } from '../src/logic/collision.js';
import { W, H } from '../src/config.js';

const DT = 1 / 60;
const run = (o, seconds) => {
  for (let t = 0; t < seconds - 1e-9; t += DT) updateObstacle(o, DT);
};

test('meteor falls straight and rotates; big and small sizes', () => {
  const rng = mulberry32(1);
  const m = createObstacle('meteor', { x: 50, big: false }, rng);
  const a0 = m.angle;
  run(m, 1);
  assert.equal(m.x, 50);
  assert.ok(m.y > 0);
  assert.notEqual(m.angle, a0);
  assert.equal(m.w, 10);
  assert.equal(createObstacle('meteor', { big: true }, rng).w, 16);
  assert.equal(m.r, hitRadius(10));
});

test('shooting star warns for 0.6s, then flies diagonally', () => {
  const s = createObstacle('shooting', { side: 'left', x: 40 }, mulberry32(2));
  const x0 = s.x;
  const y0 = s.y;
  run(s, 0.5);
  assert.equal(isCollidable(s), false);
  assert.equal(s.x, x0);
  assert.equal(s.y, y0);
  assert.equal(isOffscreen(s), false);
  run(s, 0.2);
  assert.equal(isCollidable(s), true);
  assert.ok(s.x > x0 && s.y > y0, 'moves right-down');
  const r = createObstacle('shooting', { side: 'right', x: 140 }, mulberry32(3));
  run(r, 1);
  assert.ok(r.vx < 0 && r.vy > 0, 'moves left-down');
  // 穿过上边缘的位置就是预警位置
  assert.equal(s.entryY, 0);
  assert.equal(s.entryX, 40);
});

test('shooting star is removed after leaving the screen', () => {
  const s = createObstacle('shooting', { side: 'left', x: 100 }, mulberry32(4));
  run(s, 4);
  assert.equal(isOffscreen(s), true);
});

test('comet oscillates around x0 and keeps a short rainbow tail', () => {
  const c = createObstacle('comet', { x: 90 }, mulberry32(5));
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < 300; i++) {
    updateObstacle(c, DT);
    minX = Math.min(minX, c.x);
    maxX = Math.max(maxX, c.x);
  }
  assert.ok(minX >= 90 - COMET_AMP - 1e-9 && maxX <= 90 + COMET_AMP + 1e-9);
  assert.ok(maxX - minX > COMET_AMP, 'actually swings');
  assert.ok(c.y > 0);
  assert.ok(c.tail.length > 0 && c.tail.length <= 7);
});

test('alien descends while swaying left and right', () => {
  const a = createObstacle('alien', { x: 90 }, mulberry32(6));
  const xs = [];
  const y0 = a.y;
  for (let i = 0; i < 180; i++) {
    updateObstacle(a, DT);
    xs.push(a.x);
  }
  assert.ok(a.y > y0);
  assert.ok(Math.min(...xs) < 80 && Math.max(...xs) > 100);
});

test('ship moves slowly and bounces off the edges', () => {
  const s = createObstacle('ship', { x: W - 20, dir: 1 }, mulberry32(7));
  assert.equal(s.w, 32);
  run(s, 1);
  assert.ok(s.vx < 0, 'bounced off right edge');
  assert.ok(s.x + s.w / 2 <= W);
  const l = createObstacle('ship', { x: 20, dir: -1 }, mulberry32(8));
  run(l, 1);
  assert.ok(l.vx > 0, 'bounced off left edge');
  assert.ok(l.x - l.w / 2 >= 0);
  assert.ok(s.vy < 20);
});

test('obstacles below the screen are offscreen', () => {
  for (const type of ['meteor', 'comet', 'alien', 'ship']) {
    const o = createObstacle(type, {}, mulberry32(10));
    assert.equal(isOffscreen(o), false, type);
    o.y = H + o.h + 1;
    assert.equal(isOffscreen(o), true, type);
  }
});

test('speedMul scales velocity', () => {
  const a = createObstacle('alien', { x: 90 }, mulberry32(11), 1);
  const b = createObstacle('alien', { x: 90 }, mulberry32(11), 1.5);
  assert.ok(Math.abs(b.vy - a.vy * 1.5) < 1e-9);
});
