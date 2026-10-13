import { audioCtx, masterNode, onAudioReady, tone, noise } from './audio.js';

// 8 分音符步进的循环曲目；'.' 为休止
const TRACKS = {
  title: {
    bpm: 108,
    melody: 'E5 G5 C6 G5 A5 . G5 . A5 C6 E6 C6 B5 . A5 . F5 A5 C6 A5 G5 . F5 . D5 G5 B5 G5 C6 . . .',
    bass: 'C3 . G3 . C3 . G3 . A2 . E3 . A2 . E3 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . B2 .',
    drums: '',
  },
  play: {
    bpm: 150,
    melody:
      'G5 . B5 D6 . B5 G5 . A5 . C6 E6 . C6 A5 . B5 . D6 G6 . D6 B5 A5 G5 A5 B5 . D6 . . . ' +
      'E6 . D6 B5 . G5 A5 . C6 . B5 A5 . F#5 G5 . B5 . A5 G5 . E5 F#5 . G5 . . . D5 . . .',
    bass:
      'G2 G3 G2 G3 G2 G3 G2 G3 A2 A3 A2 A3 A2 A3 A2 A3 E2 E3 E2 E3 E2 E3 E2 E3 D2 D3 D2 D3 D2 D3 D2 D3 ' +
      'C3 C4 C3 C4 C3 C4 C3 C4 D3 D4 D3 D4 D3 D4 D3 D4 G2 G3 G2 G3 E2 E3 E2 E3 D2 D3 D2 D3 D2 D3 F#2 F#3',
    drums: 'k h s h k h s h',
  },
};

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteToFreq(name) {
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  if (!m) return 0;
  const midi = 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1]] + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const parse = (s) => (s ? s.trim().split(/\s+/) : []);
const compiled = {};
for (const [name, t] of Object.entries(TRACKS)) {
  const melody = parse(t.melody).map(noteToFreq);
  const bass = parse(t.bass).map(noteToFreq);
  const drums = parse(t.drums);
  compiled[name] = { step: 60 / t.bpm / 2, melody, bass, drums, len: Math.max(melody.length, bass.length) };
}

const LOOKAHEAD = 0.1;
const TICK_MS = 25;

let desired = null;
let current = null;
let timer = null;
let gain = null;
let stepIndex = 0;
let nextTime = 0;

function schedule() {
  const ctx = audioCtx();
  const tr = compiled[current];
  if (!ctx || !tr) return;
  if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.02;
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    const i = stepIndex;
    const m = tr.melody[i % tr.melody.length];
    if (m) tone(m, nextTime, tr.step * 0.9, { type: 'square', vol: 0.07, dest: gain });
    const b = tr.bass[i % tr.bass.length];
    if (b) tone(b, nextTime, tr.step * 0.8, { type: 'triangle', vol: 0.2, dest: gain });
    if (tr.drums.length) {
      const d = tr.drums[i % tr.drums.length];
      if (d === 'h') noise(nextTime, 0.03, { vol: 0.03, freq: 7000, dest: gain });
      else if (d === 's') noise(nextTime, 0.08, { vol: 0.06, freq: 2500, filter: 'bandpass', dest: gain });
      else if (d === 'k') tone(150, nextTime, 0.1, { type: 'triangle', slide: 50, vol: 0.3, dest: gain });
    }
    nextTime += tr.step;
    stepIndex = (stepIndex + 1) % tr.len;
  }
}

function startTrack(name) {
  const ctx = audioCtx();
  if (!ctx || !compiled[name]) return;
  current = name;
  stepIndex = 0;
  nextTime = ctx.currentTime + 0.05;
  gain = ctx.createGain();
  gain.gain.value = 1;
  gain.connect(masterNode());
  schedule();
  timer = setInterval(schedule, TICK_MS);
}

function stopTrack() {
  clearInterval(timer);
  timer = null;
  const ctx = audioCtx();
  if (gain && ctx) {
    const g = gain;
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
    setTimeout(() => g.disconnect(), 300);
  }
  gain = null;
  current = null;
}

// 切换曲目（同名不重启）。AudioContext 尚未创建时记下，初始化后自动开始。
export function playMusic(name) {
  desired = name;
  if (!audioCtx() || current === name) return;
  stopTrack();
  startTrack(name);
}

export function stopMusic() {
  desired = null;
  stopTrack();
}

export function currentTrack() {
  return current;
}

onAudioReady(() => {
  if (desired && current !== desired) {
    stopTrack();
    startTrack(desired);
  }
});
