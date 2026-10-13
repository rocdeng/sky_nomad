import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UNLOCK_KEY,
  MUTE_KEY,
  loadUnlocked,
  saveUnlocked,
  unlockAfterClear,
  loadMuted,
  saveMuted,
} from '../src/logic/storage.js';

function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    map: m,
  };
}

const throwing = {
  getItem() {
    throw new Error('denied');
  },
  setItem() {
    throw new Error('denied');
  },
};

test('key is skyNomad.unlocked', () => {
  assert.equal(UNLOCK_KEY, 'skyNomad.unlocked');
});

test('missing / invalid / out-of-range / throwing storage → 1', () => {
  assert.equal(loadUnlocked(memStorage()), 1);
  assert.equal(loadUnlocked(memStorage({ [UNLOCK_KEY]: 'abc' })), 1);
  assert.equal(loadUnlocked(memStorage({ [UNLOCK_KEY]: '9' })), 1);
  assert.equal(loadUnlocked(memStorage({ [UNLOCK_KEY]: '0' })), 1);
  assert.equal(loadUnlocked(memStorage({ [UNLOCK_KEY]: '2.5' })), 1);
  assert.equal(loadUnlocked(throwing), 1);
  assert.equal(loadUnlocked(null), 1);
});

test('valid stored value is read', () => {
  assert.equal(loadUnlocked(memStorage({ [UNLOCK_KEY]: '3' })), 3);
});

test('save only increases', () => {
  const s = memStorage();
  assert.equal(saveUnlocked(s, 3), 3);
  assert.equal(s.map.get(UNLOCK_KEY), '3');
  assert.equal(saveUnlocked(s, 2), 3);
  assert.equal(loadUnlocked(s), 3);
});

test('clearing level n unlocks n+1, capped at 5', () => {
  const s = memStorage();
  assert.equal(unlockAfterClear(s, 1), 2);
  assert.equal(loadUnlocked(s), 2);
  assert.equal(unlockAfterClear(s, 4), 5);
  assert.equal(unlockAfterClear(s, 5), 5);
  assert.equal(loadUnlocked(s), 5);
});

test('write errors are swallowed', () => {
  assert.doesNotThrow(() => saveUnlocked(throwing, 3));
  assert.doesNotThrow(() => saveMuted(throwing, true));
  assert.equal(loadMuted(throwing), false);
});

test('mute flag roundtrip', () => {
  const s = memStorage();
  assert.equal(loadMuted(s), false);
  saveMuted(s, true);
  assert.equal(s.map.get(MUTE_KEY), '1');
  assert.equal(loadMuted(s), true);
  saveMuted(s, false);
  assert.equal(loadMuted(s), false);
});
