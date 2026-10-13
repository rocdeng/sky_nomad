import test from 'node:test';
import assert from 'node:assert/strict';
import { starsForHp } from '../src/logic/rating.js';

test('stars by remaining hp', () => {
  assert.equal(starsForHp(5), 3);
  assert.equal(starsForHp(4), 2);
  assert.equal(starsForHp(3), 2);
  assert.equal(starsForHp(2), 1);
  assert.equal(starsForHp(1), 1);
  assert.equal(starsForHp(0), 0);
});
