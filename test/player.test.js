import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, movePlayer } from '../src/logic/player.js';
import { W, H } from '../src/config.js';

test('player starts near the bottom center with 5 hp', () => {
  const p = createPlayer();
  assert.equal(p.x, 90);
  assert.equal(p.y, 270);
  assert.equal(p.hp, 5);
});

test('movePlayer applies relative movement', () => {
  const p = createPlayer();
  movePlayer(p, -10, -20);
  assert.equal(p.x, 80);
  assert.equal(p.y, 250);
});

test('movePlayer clamps to the screen', () => {
  const p = createPlayer();
  movePlayer(p, -1000, -1000);
  assert.equal(p.x, p.w / 2);
  assert.equal(p.y, p.h / 2);
  movePlayer(p, 5000, 5000);
  assert.equal(p.x, W - p.w / 2);
  assert.equal(p.y, H - p.h / 2);
});
