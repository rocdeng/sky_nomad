import test from 'node:test';
import assert from 'node:assert/strict';
import { W, H } from '../src/config.js';

test('logical resolution is 180x320', () => {
  assert.equal(W, 180);
  assert.equal(H, 320);
});
