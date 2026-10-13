import test from 'node:test';
import assert from 'node:assert/strict';
import { pickPowerupType, createPowerup, updatePowerup, isPowerupOffscreen, POWERUP_WEIGHTS } from '../src/logic/powerups.js';
import { mulberry32 } from '../src/logic/rng.js';
import { W, H } from '../src/config.js';

test('powerup weights within ±3% over 10000 picks', () => {
  const rng = mulberry32(42);
  const n = 10000;
  const c = { star: 0, heart: 0, shield: 0 };
  for (let i = 0; i < n; i++) c[pickPowerupType(rng)]++;
  for (const k of Object.keys(POWERUP_WEIGHTS)) {
    assert.ok(Math.abs(c[k] / n - POWERUP_WEIGHTS[k]) < 0.03, `${k}: ${c[k] / n}`);
  }
});

test('powerups fall from the top within margins and leave the screen', () => {
  const rng = mulberry32(9);
  for (let i = 0; i < 200; i++) {
    const p = createPowerup('star', rng);
    assert.ok(p.x >= 10 && p.x <= W - 10);
    assert.ok(p.y < 0);
  }
  const p = createPowerup('heart', rng);
  const y0 = p.y;
  updatePowerup(p, 1);
  assert.ok(Math.abs(p.y - y0 - 35) < 1e-9);
  p.y = H + p.h + 1;
  assert.equal(isPowerupOffscreen(p), true);
});
