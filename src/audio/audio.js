import { loadMuted, saveMuted } from '../logic/storage.js';

// Web Audio：首次点击时创建 AudioContext。无 Web Audio 时所有调用为 no-op。
let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;
let storage = null;
const readyCallbacks = [];

const MASTER_VOL = 0.5;

export function setupAudio(store) {
  storage = store;
  muted = loadMuted(storage);
}

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {});
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
    return;
  }
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER_VOL;
  master.connect(ctx.destination);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  for (const cb of readyCallbacks) cb();
}

export function onAudioReady(cb) {
  readyCallbacks.push(cb);
  if (ctx) cb();
}

export const audioCtx = () => ctx;
export const masterNode = () => master;
export const now = () => (ctx ? ctx.currentTime : 0);

export function isMuted() {
  return muted;
}

export function setMuted(m) {
  muted = !!m;
  saveMuted(storage, muted);
  if (master) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime);
  }
}

export function toggleMuted() {
  setMuted(!muted);
}

export function suspendAudio() {
  if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

// 单个 8-bit 音符（square/triangle），可滑音
export function tone(freq, start, dur, { type = 'square', vol = 0.15, slide = 0, attack = 0.005, dest = null } = {}) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(vol, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  g.connect(dest || master);
  o.start(start);
  o.stop(start + dur + 0.02);
}

// 噪声（打击/爆炸/镲片）
export function noise(start, dur, { vol = 0.15, freq = 4000, filter = 'highpass', dest = null } = {}) {
  if (!ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f);
  f.connect(g);
  g.connect(dest || master);
  src.start(start);
  src.stop(start + dur + 0.02);
}
