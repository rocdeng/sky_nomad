// 浏览器验收脚本：用 headless Chrome + CDP 走一遍完整流程并截图。
// 用法：先后台运行 `node tools/serve.mjs`，再运行 `node .agents/tasks/browser-check.mjs`
// 截图输出到 .agents/tasks/screens/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://127.0.0.1:5173/';
const PORT = 9333;
const OUT = path.resolve('.agents/tasks/screens');
fs.mkdirSync(OUT, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'skynomad-'));

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=390,844',
  'about:blank',
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
let id = 0;
const pending = new Map();
const errors = [];
const results = [];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}

async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`eval failed: ${expr}\n${JSON.stringify(r.exceptionDetails)}`);
  return r.result.value;
}

function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(r.data, 'base64'));
}

// 逻辑坐标 → CSS 坐标
async function toCss(x, y) {
  return evaluate(`(() => { const r = document.getElementById('game').getBoundingClientRect(); const s = r.width / 180; return { x: r.left + ${x} * s, y: r.top + ${y} * s }; })()`);
}

async function tap(x, y) {
  const p = await toCss(x, y);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
  await sleep(60);
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(150);
}

async function drag(x, y, dxCss, dyCss, steps = 8) {
  const p = await toCss(x, y);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
  for (let i = 1; i <= steps; i++) {
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + (dxCss * i) / steps, y: p.y + (dyCss * i) / steps }] });
    await sleep(16);
  }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(100);
}

const scene = () => evaluate('window.skyNomad.scenes.currentSceneName()');
const game = (expr) => evaluate(`(() => { const g = window.skyNomad.scenes.currentScene().game; return ${expr}; })()`);

async function waitScene(name, timeout = 5000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if ((await scene()) === name) return true;
    await sleep(100);
  }
  return false;
}

async function main() {
  let targets;
  for (let i = 0; i < 50; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      if (targets.some((t) => t.type === 'page')) break;
    } catch {}
    await sleep(200);
  }
  const page = targets.find((t) => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    } else if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) {
      errors.push(`console.${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      errors.push(`log: ${msg.params.entry.text} ${msg.params.entry.url || ''}`);
    }
  };
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  // ---- 精灵表 ----
  await send('Page.navigate', { url: BASE + '?debug=sprites' });
  await sleep(1200);
  await shot('00-sprites');

  // ---- 标题 ----
  await send('Page.navigate', { url: BASE + '?debug' });
  await sleep(1500);
  const css = await evaluate(`(() => { const c = document.getElementById('game'); const cs = getComputedStyle(c); return { w: c.style.width, h: c.style.height, left: c.style.left, top: c.style.top, bw: c.width, bh: c.height, ir: cs.imageRendering, bodyBg: getComputedStyle(document.body).backgroundColor }; })()`);
  check('390x844: canvas css 360x640 (2x), backing 180x320', css.w === '360px' && css.h === '640px' && css.bw === 180 && css.bh === 320, JSON.stringify(css));
  check('centered with remainder filled by body bg', css.left === '15px' && css.top === '102px' && css.bodyBg === 'rgb(27, 42, 92)', `${css.left},${css.top} ${css.bodyBg}`);
  check('image-rendering pixelated', css.ir === 'pixelated', css.ir);
  check('starts at title', (await scene()) === 'title');
  const audioBefore = await evaluate(`import('/src/audio/audio.js').then(m => m.audioCtx() ? m.audioCtx().state : null)`);
  check('no AudioContext before first tap', audioBefore === null, String(audioBefore));
  await shot('01-title');

  // ---- 选关 ----
  await tap(90, 200);
  check('tap title → select', await waitScene('select'));
  const audioAfter = await evaluate(`import('/src/audio/audio.js').then(m => m.audioCtx() && m.audioCtx().state)`);
  const track = await evaluate(`import('/src/audio/music.js').then(m => m.currentTrack())`);
  check('AudioContext created on first tap, title music playing', !!audioAfter && track === 'title', `${audioAfter} / ${track}`);
  check('initially only level 1 unlocked', (await evaluate('window.skyNomad.scenes.currentScene().unlocked')) === 1);
  await shot('02-select');
  await tap(90, 62 + 1 * 40 + 15); // 第 2 关（锁定）
  check('locked level 2 not playable', (await scene()) === 'select');

  // ---- 第 1 关 ----
  await tap(90, 62 + 15);
  check('select level 1 → play', await waitScene('play'));
  check('play music', (await evaluate(`import('/src/audio/music.js').then(m => m.currentTrack())`)) === 'play');
  const x0 = await game('g.player.x');
  const y0 = await game('g.player.y');
  await drag(90, 150, 40, -20); // CSS 位移 40,-20 → 逻辑 20,-10
  const x1 = await game('g.player.x');
  const y1 = await game('g.player.y');
  check('drag moves plane by relative logical delta', Math.abs(x1 - x0 - 20) < 0.6 && Math.abs(y1 - y0 + 10) < 0.6, `(${x0},${y0}) → (${x1},${y1})`);
  await drag(90, 150, 2000, 2000, 4);
  const clamped = await game('[g.player.x, g.player.y]');
  check('plane clamped inside screen', clamped[0] === 172 && clamped[1] === 312, JSON.stringify(clamped));
  await drag(90, 150, -164, -84, 4); // 回到中间附近
  await sleep(4000);
  const l1 = await game('({ types: [...new Set(g.obstacles.map(o => o.type))], n: g.obstacles.length, elapsed: g.elapsed, progress: g.elapsed / g.level.duration })');
  check('level 1 has only meteors', l1.types.every((t) => t === 'meteor') && l1.n > 0, JSON.stringify(l1));
  await shot('03-play-level1');

  // 被撞：扣 1 血 + 1.5 秒无敌
  await evaluate(`(async () => { const m = await import('/src/logic/obstacles.js'); const g = window.skyNomad.scenes.currentScene().game; g.player.shield = 0; g.player.invuln = 0; const o = m.createObstacle('meteor', { x: g.player.x, big: true }); o.y = g.player.y; o.vy = 0; g.obstacles.push(o); })()`);
  await sleep(300);
  const hit = await game('({ hp: g.player.hp, inv: g.player.invuln })');
  check('hit → hp-1, invulnerable', hit.hp === 4 && hit.inv > 1 && hit.inv <= 1.5, JSON.stringify(hit));
  await shot('04-play-hit');
  await sleep(600);
  const during = await game('({ hp: g.player.hp, inv: g.player.invuln })');
  check('no extra damage during invulnerability', during.hp === 4 && during.inv > 0, JSON.stringify(during));
  await evaluate(`(() => { const g = window.skyNomad.scenes.currentScene().game; g.obstacles = g.obstacles.filter(o => o.vy !== 0); g.player.hp = 4; g.player.invuln = 1.5; })()`);

  // 道具
  await evaluate(`(async () => { const m = await import('/src/logic/powerups.js'); const g = window.skyNomad.scenes.currentScene().game; for (const t of ['star','heart','shield']) { const p = m.createPowerup(t, Math.random); p.x = g.player.x; p.y = g.player.y; g.powerups.push(p); } })()`);
  await sleep(200);
  const pu = await game('({ score: g.score, hp: g.player.hp, shield: g.player.shield })');
  check('powerups: star +10, heart +1, shield 5s', pu.score >= 10 && pu.hp === 5 && pu.shield > 4.5, JSON.stringify(pu));
  await shot('05-play-shield');

  // 过关（2 星）
  await evaluate(`(() => { const g = window.skyNomad.scenes.currentScene().game; g.player.hp = 4; g.player.shield = 1e9; g.elapsed = g.level.duration - 0.2; })()`);
  check('surviving → win scene', await waitScene('win', 3000));
  await sleep(2200);
  const win1 = await evaluate('window.skyNomad.scenes.currentScene().state');
  check('win: hp 4 → 2 stars shown', win1.stars === 2 && win1.shown === 2, JSON.stringify(win1));
  check('localStorage skyNomad.unlocked = "2"', (await evaluate(`localStorage.getItem('skyNomad.unlocked')`)) === '2');
  await shot('06-win-level1');

  // 下一关 → 第 2 关
  await tap(14 + 36, 270 + 12);
  check('next → play level 2', (await waitScene('play')) && (await game('g.level.id')) === 2);
  await evaluate(`(() => { const g = window.skyNomad.scenes.currentScene().game; g.elapsed = 20; })()`);
  // 等待流星预警出现
  let warned = false;
  for (let i = 0; i < 60 && !warned; i++) {
    warned = await game(`g.obstacles.some(o => o.type === 'shooting' && o.warn > 0.2)`);
    if (!warned) await sleep(100);
  }
  check('level 2 shooting star warning appears', warned);
  if (warned) await shot('07-play-level2-warning');
  const l2 = await game(`[...new Set(g.obstacles.map(o => o.type))]`);
  check('level 2 obstacles ⊆ {meteor, shooting}', l2.every((t) => t === 'meteor' || t === 'shooting'), JSON.stringify(l2));

  // 失败 → 再来一次
  const kill = `(async () => { const m = await import('/src/logic/obstacles.js'); const g = window.skyNomad.scenes.currentScene().game; g.player.hp = 1; g.player.shield = 0; g.player.invuln = 0; const o = m.createObstacle('meteor', { x: g.player.x, big: true }); o.y = g.player.y; o.vy = 0; g.obstacles.push(o); })()`;
  await evaluate(kill);
  check('hp 0 → lose scene', await waitScene('lose', 3000));
  await sleep(300);
  await shot('08-lose');
  await tap(14 + 36, 250 + 12);
  check('retry → same level', (await waitScene('play')) && (await game('g.level.id')) === 2 && (await game('g.player.hp')) === 5);
  await evaluate(kill);
  await waitScene('lose', 3000);
  await tap(94 + 36, 250 + 12);
  check('lose → select', await waitScene('select'));
  check('select shows 2 unlocked', (await evaluate('window.skyNomad.scenes.currentScene().unlocked')) === 2);

  // 刷新后仍解锁
  await send('Page.navigate', { url: BASE + '?debug' });
  await sleep(1200);
  await tap(90, 200);
  await waitScene('select');
  check('after reload level 2 still unlocked', (await evaluate('window.skyNomad.scenes.currentScene().unlocked')) === 2);

  // 静音按钮：切换且不触发场景点击
  await tap(172, 8);
  check('mute toggles, scene unchanged', (await evaluate('window.skyNomad.isMuted()')) === true && (await scene()) === 'select');
  check('mute persisted', (await evaluate(`localStorage.getItem('skyNomad.muted')`)) === '1');
  await shot('09-select-muted');
  await tap(172, 8);
  check('unmute', (await evaluate('window.skyNomad.isMuted()')) === false);

  // 第 5 关
  await evaluate(`localStorage.setItem('skyNomad.unlocked', '5')`);
  await tap(90, 280 + 11); // 返回
  await waitScene('title');
  await tap(90, 200);
  await waitScene('select');
  await tap(90, 62 + 4 * 40 + 15);
  check('level 5 playable after unlock=5', (await waitScene('play')) && (await game('g.level.id')) === 5);
  await evaluate(`(() => { const g = window.skyNomad.scenes.currentScene().game; g.player.shield = 1e9; g.elapsed = 55; })()`);
  await sleep(3000);
  check('no ship before last 10s', (await game(`g.obstacles.filter(o => o.type === 'ship').length`)) === 0);
  await evaluate(`(() => { const g = window.skyNomad.scenes.currentScene().game; g.elapsed = 60; })()`);
  await sleep(4500);
  const ships = await game(`g.obstacles.filter(o => o.type === 'ship').length`);
  check('ships in last 10s (1..2)', ships >= 1 && ships <= 2, String(ships));
  await shot('10-play-level5-ship');
  await evaluate(`(() => { const g = window.skyNomad.scenes.currentScene().game; g.elapsed = g.level.duration - 0.1; })()`);
  await waitScene('win', 3000);
  await sleep(2000);
  const win5 = await evaluate('window.skyNomad.scenes.currentScene().state');
  check('level 5 win, 3 stars', win5.level === 5 && win5.stars === 3, JSON.stringify(win5));
  await shot('11-win-level5');
  await tap(90, 270 + 12);
  check('continue → ending', await waitScene('ending'));
  await sleep(1800);
  await shot('12-ending');
  await tap(90, 160);
  check('ending tap → title', await waitScene('title'));

  // 后台暂停
  await evaluate(`(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); })()`);
  await sleep(100);
  const paused = await evaluate('window.skyNomad.app.paused');
  const st = await evaluate(`import('/src/audio/audio.js').then(m => m.audioCtx() && m.audioCtx().state)`);
  check('hidden → paused + audio suspended', paused === true && st === 'suspended', `${paused} ${st}`);
  await shot('13-paused');
  await evaluate(`(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); })()`);
  await tap(90, 200);
  await sleep(300);
  const resumed = await evaluate(`import('/src/audio/audio.js').then(m => m.audioCtx().state)`);
  check('tap to continue → resumed, scene unchanged', (await evaluate('window.skyNomad.app.paused')) === false && (await scene()) === 'title' && resumed === 'running', resumed);

  // 桌面横屏缩放
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  const d = await evaluate(`(() => { const c = document.getElementById('game'); return [c.style.width, c.style.height, c.style.left, c.style.top]; })()`);
  check('1280x720 → 2x (360x640) centered', d.join() === '360px,640px,460px,40px', d.join());
  await shot('14-desktop');
  await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: true });
  await sleep(400);
  const big = await evaluate(`document.getElementById('game').style.width`);
  check('1080x1920 → 6x', big === '1080px', big);

  check('no console errors / exceptions', errors.length === 0, errors.join(' | '));
}

main()
  .catch((e) => {
    console.error(e);
    if (errors.length) console.error('page errors:', errors.join(' | '));
    results.push({ name: 'script', ok: false });
  })
  .finally(async () => {
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    try {
      ws?.close();
    } catch {}
    chrome.kill();
    await sleep(500);
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch {}
    process.exit(failed ? 1 : 0);
  });
