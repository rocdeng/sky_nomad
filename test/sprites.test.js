import test from 'node:test';
import assert from 'node:assert/strict';
import { SPRITES, SPRITE_SIZES, validateSprite } from '../src/gfx/sprites.js';
import { OBSTACLE_SIZES } from '../src/logic/obstacles.js';
import { PLAYER_W, PLAYER_H } from '../src/logic/player.js';
import { POWERUP_SIZE } from '../src/logic/powerups.js';

test('every sprite is valid and has the expected size', () => {
  for (const [name, [w, h]] of Object.entries(SPRITE_SIZES)) {
    const r = validateSprite(SPRITES[name]);
    assert.deepEqual(r.errors, [], name);
    assert.equal(r.w, w, `${name} width`);
    assert.equal(r.h, h, `${name} height`);
  }
  assert.deepEqual(Object.keys(SPRITES).sort(), Object.keys(SPRITE_SIZES).sort());
});

test('sprite sizes match the logic hitboxes', () => {
  for (const [name, size] of Object.entries(OBSTACLE_SIZES)) {
    assert.deepEqual(SPRITE_SIZES[name], size, name);
  }
  assert.deepEqual(SPRITE_SIZES.player, [PLAYER_W, PLAYER_H]);
  for (const name of ['star', 'heart', 'shield']) {
    assert.deepEqual(SPRITE_SIZES[name], [POWERUP_SIZE, POWERUP_SIZE]);
  }
});

test('validateSprite rejects ragged rows and unknown chars', () => {
  assert.equal(validateSprite(['ab', 'a']).ok, false);
  assert.equal(validateSprite(['k?']).ok, false);
  assert.equal(validateSprite(['k.', '.k']).ok, true);
});
