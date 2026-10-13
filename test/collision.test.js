import test from 'node:test';
import assert from 'node:assert/strict';
import { hitRadius, circlesOverlap } from '../src/logic/collision.js';

test('hit radius is 70% of half width', () => {
  assert.equal(hitRadius(16), 5.6);
  assert.equal(hitRadius(10), 3.5);
});

test('overlapping circles collide', () => {
  assert.equal(circlesOverlap({ x: 0, y: 0, r: 5 }, { x: 6, y: 0, r: 2 }), true);
  assert.equal(circlesOverlap({ x: 0, y: 0, r: 5 }, { x: 3, y: 4, r: 0.5 }), true);
});

test('touching circles do not collide', () => {
  assert.equal(circlesOverlap({ x: 0, y: 0, r: 5 }, { x: 7, y: 0, r: 2 }), false);
  assert.equal(circlesOverlap({ x: 0, y: 0, r: 3 }, { x: 3, y: 4, r: 2 }), false);
});

test('separated circles do not collide', () => {
  assert.equal(circlesOverlap({ x: 0, y: 0, r: 2 }, { x: 50, y: 50, r: 2 }), false);
});
