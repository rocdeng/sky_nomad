import { tone, noise, now, audioCtx } from './audio.js';

const seq = (notes, step, opts) => {
  const t = now();
  notes.forEach((f, i) => f && tone(f, t + i * step, step * 1.6, opts));
};

export const sfx = {
  click() {
    if (!audioCtx()) return;
    seq([880, 1320], 0.05, { vol: 0.12 });
  },
  hit() {
    if (!audioCtx()) return;
    const t = now();
    noise(t, 0.25, { vol: 0.3, freq: 900, filter: 'lowpass' });
    tone(260, t, 0.25, { type: 'square', slide: 70, vol: 0.18 });
  },
  star() {
    if (!audioCtx()) return;
    seq([988, 1319], 0.06, { vol: 0.12 });
  },
  heart() {
    if (!audioCtx()) return;
    seq([523, 659, 784, 1047], 0.06, { type: 'triangle', vol: 0.25 });
  },
  shield() {
    if (!audioCtx()) return;
    const t = now();
    tone(300, t, 0.35, { type: 'square', slide: 1200, vol: 0.1 });
    tone(450, t + 0.05, 0.3, { type: 'triangle', slide: 1800, vol: 0.15 });
  },
  warn() {
    if (!audioCtx()) return;
    seq([1400, 0, 1400], 0.06, { vol: 0.06 });
  },
  starPop(i = 0) {
    if (!audioCtx()) return;
    const base = [784, 988, 1175][i] || 1175;
    seq([base, base * 1.5], 0.06, { vol: 0.12 });
  },
  win() {
    if (!audioCtx()) return;
    const t = now();
    const mel = [523, 659, 784, 1047, 0, 784, 1047];
    mel.forEach((f, i) => f && tone(f, t + i * 0.11, 0.2, { vol: 0.14 }));
    [262, 330, 392, 523].forEach((f, i) => tone(f, t + i * 0.22, 0.3, { type: 'triangle', vol: 0.25 }));
  },
  lose() {
    if (!audioCtx()) return;
    const t = now();
    [784, 659, 523, 392].forEach((f, i) => tone(f, t + i * 0.16, 0.22, { type: 'triangle', vol: 0.25 }));
    tone(196, t + 0.64, 0.5, { type: 'square', slide: 150, vol: 0.1 });
  },
  firework() {
    if (!audioCtx()) return;
    noise(now(), 0.3, { vol: 0.08, freq: 2000, filter: 'bandpass' });
  },
};
