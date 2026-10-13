# Sky Nomad 实现计划

权威规格：`docs/superpowers/specs/2026-10-13-sky-nomad-design.md`。本计划与规格冲突时以规格为准。

## 环境与约定（探索结论）

- 项目为空（仅 docs），不是 git 仓库。Node v24.18.1 可用，`node --test` 可直接用。
- Windows / pwsh：命令用 `;` 串联，不用 `&&`。dev server 一律后台运行（`run_in_background`），不要阻塞。
- 不 push，不改 git config。若 `git commit` 因未配置 user.name/email 失败，不要去配置，记录下来并继续（只 `git add`）。
- 无依赖、无构建：不引入任何 npm 包。`package.json` 只用于 `"type": "module"` 和 `npm test` 脚本，`dependencies` 为空。

## 技术与结构决策

| # | 决策 | 理由 |
|---|---|---|
| D1 | 根目录 `index.html` + `style.css` + `src/**/*.js`（ES modules），无打包 | 规格要求原生、无构建。 |
| D2 | 纯逻辑放 `src/logic/`，不得引用 `window/document/canvas/AudioContext`；浏览器相关放 `src/engine/`、`src/gfx/`、`src/audio/`、`src/scenes/` | 让 `node --test` 能直接 import 纯逻辑。 |
| D3 | `package.json`：`{"name":"sky-nomad","private":true,"type":"module","scripts":{"test":"node --test","serve":"node tools/serve.mjs"}}`，测试放 `test/*.test.js` | `type: module` 让 Node 以 ESM 加载 `src/logic/*.js`；Node 24 的 `node --test` 默认会发现 `test/**/*.js` 与 `*.test.js`。 |
| D4 | 本地预览用 `tools/serve.mjs`：只用 `node:http`/`node:fs` 的零依赖静态服务器，端口 5173，带正确的 `.js` → `text/javascript` MIME | ES modules 不能在 `file://` 下加载；不引入依赖。 |
| D5 | 画布 backing 尺寸固定 180×320；CSS 尺寸 = `180*s × 320*s`，`s = max(1, min(floor(innerW/180), floor(innerH/320)))`（CSS 像素）；居中，`body` 背景色与游戏背景色相同（`#1b2a5c` 深蓝夜空，偏明亮的 Q 版配色）；`image-rendering: pixelated`（加 `crisp-edges` 兜底） | 照搬规格的整数倍缩放；余下区域由 body 背景色填充。屏幕小于 180×320 时取 1（溢出可接受，现实手机不会出现）。 |
| D6 | 主循环 `requestAnimationFrame`，`dt` 以秒计，上限 0.05s；场景接口 `{enter(params), update(dt), draw(ctx), onPointerDown(p), onPointerMove(p, dx, dy), onPointerUp(p)}`，由 `src/engine/scenes.js` 管理切换 | 简单、可预测；切后台回来不会出现巨大 dt 穿模。 |
| D7 | 输入用 Pointer Events 监听 canvas 所在的 `window`，`touch-action: none`，`preventDefault`；坐标换算为逻辑坐标 `(clientX - rect.left)/s`；拖动位移 `dx/s` 直接加到飞机位置（1:1 相对移动）后 clamp 到屏幕内（按飞机半宽/半高） | 照搬规格"任意位置按下拖动，相对位移"。 |
| D8 | 像素画：`src/gfx/sprites.js` 用字符串数组定义（每个字符对应调色板颜色，`.` 透明），`src/gfx/spriteCache.js` 启动时逐像素 `fillRect` 到离屏 canvas 并缓存；旋转帧运行时用 `ctx.rotate` 绘制缓存图（逻辑分辨率下最终被整数放大，仍是像素风） | 照搬规格；旋转用 rotate 避免手画多帧。 |
| D9 | 文字：用 `ctx.fillText`，字体 `"bold 10px 'PingFang SC','Microsoft YaHei',sans-serif"`（标题 16px），在逻辑画布上绘制、加 1px 深色描边 | 关卡名是中文，自制中文像素字库成本过高；在 180×320 上绘制后整数放大本身就是像素风效果。 |
| D10 | 音频：`src/audio/audio.js` 在首个 `pointerdown` 时创建 `AudioContext`（并 `resume()`），master GainNode 控制静音；音效与音乐全部用 `OscillatorNode`(square/triangle) + 噪声 `AudioBuffer` 实时合成；音乐用 lookahead 调度器（每 25ms 调度未来 100ms 的音符）循环播放短旋律 | 照搬规格；lookahead 是 Web Audio 标准做法，节拍稳定。 |
| D11 | 静音按钮：逻辑坐标 `x=166,y=2,w=12,h=12`（右上角），所有场景都绘制；按下若命中按钮则只切换静音、不传给场景（不触发拖动/点击）。静音状态存 `localStorage` key `skyNomad.muted`（`"1"`/`"0"`） | 规格只说"右上角静音按钮"，持久化是常见预期且成本低；与 `skyNomad.unlocked` 同前缀。 |
| D12 | 随机数可注入：`src/logic/rng.js` 提供 `mulberry32(seed)`，生成器/道具逻辑接收 `rng` 参数，运行时用 `Math.random` | 让生成逻辑在测试中可确定。 |

## 规格歧义与开放问题（推荐决策，实现时照此执行）

1. **spawnStart / spawnEnd 具体值未给出** → 采用（秒）：L1 1.2→0.6，L2 1.1→0.5，L3 1.0→0.45，L4 0.9→0.4，L5 0.8→0.35。`interval(t) = spawnStart + (spawnEnd - spawnStart) * clamp(t/duration, 0, 1)`。
2. **多种障碍如何选择** → 从关卡 `obstacles` 列表均匀随机选择；meteor 内部 60% 小 / 40% 大。
3. **第 5 关"最后 10s 加 ship"** → 不进入主池，独立定时器：`elapsed >= duration - 10` 后每 3.0s 生成一艘 ship，进入该阶段时立即生成第一艘；屏幕上最多 2 艘。配置写为 `extra: [{ type: 'ship', from: 60, interval: 3.0, max: 2 }]`。
4. **道具出现频率/概率未给出** → 每 5±1s（`4 + rng()*2`）生成一个道具，类型权重 star 60% / heart 25% / shield 15%，从顶部以 35px/s 下落，x 随机（边距 10）。拾取判定同样用圆形。
5. **分数** → 规格只定义星星 +10。分数仅来自星星，HUD 显示、结算显示，不持久化。
6. **满血吃爱心** → 血量保持 5，仍播放拾取音效、不加分。
7. **护盾与受伤无敌叠加** → 护盾期间碰撞不扣血也不触发 1.5s 无敌；再次拾取护盾重置为 5s（不累加）。受伤无敌期间拾取护盾正常生效。两种无敌期间障碍物都穿过飞机（障碍物不被移除）。
8. **碰撞后障碍物是否消失** → 不消失（无敌期内不会重复扣血），命中时在接触点放一小簇粒子 + 屏幕轻微震动 0.15s。
9. **碰撞半径** → `r = (sprite.width / 2) * 0.7`，玩家与障碍物统一；规格写"~70%"，取 0.7 常量 `HITBOX_RATIO`。
10. **流星预警** → 生成时先进入 `warning` 状态 0.6s：在其将进入的屏幕边缘（左上或右上边缘，在入口点）画闪烁的红黄 "!" 标记；预警期间不参与碰撞、不绘制本体；之后从屏幕外沿对角线以 ~170px/s 飞入。
11. **评星边界** → `stars(hp)`: hp≥5→3，3~4→2，1~2→1，≤0→0（失败不评星）。hp 不会超过 5。
12. **存档格式** → `skyNomad.unlocked` 存字符串整数 = 已解锁的最高关卡号（1~5），缺失/非法/越界/读取抛异常（隐私模式）→ 1；写入只增不减；写入异常静默忽略。通关第 n 关解锁 n+1（上限 5）。不存评星（规格只要求存解锁）。
13. **通关画面流程** → 第 1~4 关过关庆祝界面按钮："下一关" / "选关"；第 5 关过关庆祝界面按钮为 "继续" → 通关画面（ending），ending 点按回到标题。
14. **失败界面** → 按钮 "再来一次"（重开同关）/ "选关"。
15. **各障碍物参数（逻辑像素，秒）**：
    - meteor：小 10×10、大 16×16；vy 小 70~95、大 50~70；旋转 ±(1.5~3) rad/s；x 随机。
    - shooting：8×8 头 + 短拖尾；速度 170；从左上或右上入场斜向穿屏（方向角约 30° 偏离竖直）。
    - comet：10×10 头 + 彩虹尾（7 色，按历史位置画方块）；vy 45；`x = x0 + 28*sin(2.2*t)`。
    - alien：14×12；vy 35；`x = x0 + 22*sin(3*t)`。
    - ship：32×20；vy 14；vx ±28，碰到边界（按半宽）反弹。
    - 关卡速度系数 `speedMul = 1 + 0.08*(level-1)`，作用于所有障碍物速度。
    - 出屏（y > 320 + 高度，或 shooting 离开任一侧）即移除。
16. **玩家** → 16×16 小飞机，初始位置 (90, 270)；受伤无敌期间每 0.1s 闪烁（隐/显交替）；护盾时外圈画像素光环，剩余 <1.5s 时光环闪烁。
17. **HUD 布局** → 顶部进度条 `x=4,y=4,w=156,h=6`（让出右上角静音按钮）；进度条下方左侧 5 个心形（满/空），右侧分数 "★ 120"。
18. **切到后台** → `visibilitychange` hidden 时 `audioCtx.suspend()`，游戏场景进入暂停（不 update）；回到前台显示"点击继续"后恢复。
19. **背景** → 多层视差星点（2~3 层不同速度），亮色 Q 版：深蓝底 + 白/黄/粉星点，偶尔的小云朵像素块。

## 目录结构

```
index.html
style.css
package.json
.gitignore
README.md
tools/serve.mjs
src/
  main.js                 # 启动：canvas、缩放、sprite 缓存、输入、音频、场景
  config.js               # 常量：W=180,H=320,HITBOX_RATIO,颜色
  logic/                  # 纯逻辑（node 可测）
    rng.js  scale.js  collision.js  rating.js  storage.js
    levels.js  spawner.js  obstacles.js  player.js  gameState.js  powerups.js
  engine/  loop.js  input.js  scenes.js  ui.js(按钮/文字/静音按钮)
  gfx/     palette.js  sprites.js  spriteCache.js  particles.js  background.js
  audio/   audio.js  sfx.js  music.js
  scenes/  title.js  select.js  play.js  win.js  lose.js  ending.js
test/
  scale.test.js collision.test.js rating.test.js storage.test.js
  levels.test.js spawner.test.js obstacles.test.js player.test.js
  gameState.test.js powerups.test.js sprites.test.js
```

## 验证方式

- 自动：在仓库根目录运行 `npm test`（等价 `node --test`），全部通过。
- 浏览器：后台运行 `node tools/serve.mjs`，打开 `http://localhost:5173/`；手机验证用 Chrome DevTools 设备模拟（如 iPhone 12 Pro 390×844 → 缩放 2 倍）并检查控制台无报错。验证后停止服务器进程。

---

# Implementation Plan

- [ ] 1. 初始化仓库与项目骨架。
      `git init`；创建 `.gitignore`（`node_modules/`、`.DS_Store`、`*.log`）；`package.json`（D3，无依赖）；`tools/serve.mjs`（D4，监听 5173，处理 `/` → `index.html`，防路径穿越：解析后的路径必须在仓库根内，否则 403）；`index.html`（`<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">`、`<canvas id="game" width="180" height="320">`、`<script type="module" src="src/main.js">`）；`style.css`（全屏、无滚动、居中、背景色、`image-rendering: pixelated`、`touch-action: none`、`user-select: none`）；`src/config.js`；`src/main.js` 暂时只填背景色并画 "Sky Nomad" 文字；`test/smoke.test.js` 断言 `config.js` 导出 `W===180 && H===320`。
      Files: .gitignore, package.json, tools/serve.mjs, index.html, style.css, src/config.js, src/main.js, test/smoke.test.js
      Verify: `npm test` 通过；后台启动 `node tools/serve.mjs`，浏览器打开 http://localhost:5173/ 看到背景色和文字、控制台无报错。

- [ ] 2. 纯逻辑基础模块 + 测试：缩放、碰撞、评星、存档、RNG。
      `rng.js`：`mulberry32(seed)` 返回 `() => [0,1)`。`scale.js`：`computeScale(viewW, viewH)` 按 D5 返回整数 s（≥1）及 CSS 宽高/偏移。`collision.js`：`hitRadius(width)`=width/2*0.7，`circlesOverlap(a, b)`（`{x,y,r}`，距离平方 < (ra+rb)²）。`rating.js`：`starsForHp(hp)`（歧义 11）。`storage.js`：`loadUnlocked(storage)`、`saveUnlocked(storage, n)`、`unlockAfterClear(storage, level)`、`loadMuted/saveMuted`，`storage` 参数注入（运行时传 `localStorage`），KEY 常量 `skyNomad.unlocked`、`skyNomad.muted`，异常处理按歧义 12。
      测试覆盖：s 取最大整数倍（390×844→2，1080×1920→6，100×100→1）；碰撞相切不算重叠、重叠算；评星 5→3、4→2、3→2、2→1、1→1、0→0；存档缺失/`"abc"`/`"9"`/抛异常的 storage → 1，保存只增不减，第 5 关通关后仍为 5。
      Files: src/logic/{rng,scale,collision,rating,storage}.js, test/{scale,collision,rating,storage}.test.js
      Verify: `npm test` 全部通过。

- [ ] 3. 关卡配置与生成器（纯逻辑）+ 测试。
      `levels.js`：导出 `LEVELS` 数组，5 项 `{id, name, duration, obstacles, spawnStart, spawnEnd, speedMul, extra}`，名称/时长/障碍照搬规格表，数值按歧义 1/3/15。`spawner.js`：`spawnInterval(level, elapsed)`（线性插值并 clamp）；`createSpawner(level, rng)` 返回 `{update(dt, elapsed, counts) → spawnRequest[]}`，主池按间隔均匀选类型，`extra` 规则处理 ship（from、interval、max），以及道具定时器（歧义 4，`powerups.js` 提供 `pickPowerupType(rng)` 与权重）。
      测试：每关 duration/障碍集合与规格一致；`spawnInterval` 在 t=0 为 spawnStart、t=duration 为 spawnEnd、t=duration/2 为中点、超出 clamp；用固定 seed 模拟第 1 关全程，只产生 meteor；第 5 关前 60s 不产生 ship、最后 10s 产生 ship 且同时存在不超过 2；第 2 关只产生 meteor/shooting；道具权重统计（10000 次）在 ±3% 内。
      Files: src/logic/{levels,spawner,powerups}.js, test/{levels,spawner,powerups}.test.js
      Verify: `npm test` 全部通过。

- [ ] 4. 障碍物与玩家运动逻辑（纯逻辑）+ 测试。
      `obstacles.js`：`createObstacle(type, opts, rng, speedMul)` 与 `updateObstacle(o, dt)`、`isOffscreen(o)`、`isCollidable(o)`，实现五种行为（歧义 10/15；shooting 含 0.6s `warning` 状态和入口边缘坐标；comet 维护尾巴历史位置数组，最多 7 个点）。`player.js`：`createPlayer()`、`movePlayer(p, dx, dy)`（相对位移 + clamp 到 `[w/2, W-w/2]×[h/2, H-h/2]`）。
      测试：meteor 只改变 y 且角度随时间变化；shooting 前 0.6s `isCollidable` 为 false、之后为 true 并斜向运动；comet x 在 x0±28 内振荡；alien 下降且左右摇摆；ship 碰边反弹；出屏判定；玩家拖到屏幕外被 clamp。
      Files: src/logic/{obstacles,player}.js, test/{obstacles,player}.test.js
      Verify: `npm test` 全部通过。

- [ ] 5. 游戏状态机（纯逻辑）+ 测试。
      `gameState.js`：`createGame(levelId, rng)` 组合 player、spawner、obstacles、powerups；`step(game, dt)` 推进 elapsed、生成、运动、移除出屏、碰撞（护盾/受伤无敌规则按歧义 7/8）、拾取（star +10、heart +1 上限 5、shield 5s 重置）、判定 `status: 'playing'|'won'|'lost'`；返回本帧事件列表（`hit`、`pickup:star|heart|shield`、`won`、`lost`）供渲染/音效使用。`progress = elapsed/duration`。
      测试：直接注入障碍物与玩家重叠 → hp-1、invuln=1.5，1.5s 内再次重叠不扣血，1.5s 后再扣；护盾期间不扣血不触发无敌；5 血吃爱心仍为 5；星星 +10；hp 到 0 → lost；elapsed ≥ duration 且 hp>0 → won 且 `starsForHp` 正确；won/lost 后 step 不再变化。
      Files: src/logic/gameState.js, test/gameState.test.js
      Verify: `npm test` 全部通过。

- [ ] 6. 像素画与离屏缓存。
      `palette.js`：字符→颜色映射（明亮 Q 版配色）。`sprites.js`：字符矩阵定义 player(16×16)、meteorSmall(10×10)、meteorLarge(16×16)、shooting(8×8)、comet(10×10)、alien(14×12)、ship(32×20)、star/heart/shield 道具(9×9)、HUD 心形满/空(7×6)、HUD 星(7×7)、静音按钮开/关(12×12)；所有形象圆润可爱（外星人带笑脸）。`spriteCache.js`：`buildSpriteCache()` 在浏览器创建离屏 canvas（`document.createElement('canvas')`），返回 `{name: {canvas, w, h}}`；纯数据校验函数 `validateSprite(rows, palette)` 放在 `sprites.js` 中供测试。在 `main.js` 支持 `?debug=sprites` 查看所有缓存精灵排列。
      测试 `test/sprites.test.js`：每个精灵行等长、尺寸与上面一致、只用调色板中的字符或 `.`。
      Files: src/gfx/{palette,sprites,spriteCache}.js, src/main.js, test/sprites.test.js
      Verify: `npm test` 通过；浏览器打开 http://localhost:5173/?debug=sprites 看到全部精灵清晰、像素锐利（无模糊）。

- [ ] 7. 引擎：画布缩放、主循环、输入、场景管理、UI 工具。
      `engine/loop.js`（D6）；`engine/input.js`（D7，导出订阅接口，按下/移动/抬起回调提供逻辑坐标与逻辑位移，支持多指时只跟踪第一个 pointerId）；`engine/scenes.js`（`register/go(name, params)`）；`engine/ui.js`（`drawText`（D9 描边）、`button`（矩形像素按钮 + 命中测试）、静音按钮绘制/命中，D11）。`main.js` 用 `computeScale` 在 `resize`/`orientationchange` 时更新 canvas CSS 尺寸与位置，`ctx.imageSmoothingEnabled = false`；visibilitychange 处理（歧义 18）。
      Files: src/engine/{loop,input,scenes,ui}.js, src/main.js, style.css
      Verify: `npm test` 仍通过；浏览器中改变窗口大小时画布始终为 180×320 的整数倍并居中、余下区域为背景色；DevTools 设备模拟中拖动无页面滚动/缩放。

- [ ] 8. 游戏场景（play）+ 背景 + 粒子。
      `gfx/background.js`（视差星点，歧义 19）；`gfx/particles.js`（通用粒子：命中火花、拾取闪光，后续复用为烟花/纸屑）；`scenes/play.js`：`enter({level})` 创建 `gameState`，拖动调用 `movePlayer`，每帧 `step`，按事件触发粒子/震屏，绘制障碍物（meteor 旋转、shooting 预警标记与拖尾、comet 彩虹尾、alien、ship）、道具、玩家（闪烁/护盾光环，歧义 16）、HUD（歧义 17）。`won`/`lost` 后延迟 0.6s 切到 win/lose 场景（此步可先临时切回 play 重开或显示文字）。临时让 `main.js` 直接进入第 1 关（`?level=N` 指定关卡）以便验证。
      Files: src/gfx/{background,particles}.js, src/scenes/play.js, src/main.js
      Verify: `npm test` 通过；浏览器 `?level=1`~`?level=5` 逐关试玩：障碍物种类与关卡表一致、生成越来越密、进度条推进、被撞扣血并闪烁 1.5s、道具效果正确、第 5 关最后 10s 出现大飞船、流星出现前有 0.6s 边缘预警。

- [ ] 9. 其余场景与完整流程：标题、选关、过关庆祝、失败、通关。
      `title.js`（标题 "Sky Nomad"、飞机待机动画、"点击开始"）；`select.js`（5 个关卡按钮显示序号与中文名，未解锁显示锁图标且不可点，数据来自 `loadUnlocked(localStorage)`；"返回"）；`win.js`（烟花 + 彩色纸屑粒子、飞机转圈动画、星级逐个出现（`starsForHp`）、分数、按钮按歧义 13；进入时调用 `unlockAfterClear`）；`lose.js`（"再来一次"/"选关"，歧义 14）；`ending.js`（通关祝贺画面、烟花循环，点击回标题）。移除第 8 步的临时直入（保留 `?level=N` 调试参数可选）。
      Files: src/scenes/{title,select,win,lose,ending}.js, src/scenes/play.js, src/main.js
      Verify: `npm test` 通过；浏览器完整走通：标题 → 选关（初始仅第 1 关可选）→ 过第 1 关 → 庆祝界面星级与剩余血一致 → 刷新页面后第 2 关已解锁（DevTools Application 中 `skyNomad.unlocked` = "2"）→ 故意失败 → "再来一次"重开同关、"选关"返回 → 用 DevTools 把 `skyNomad.unlocked` 设为 "5" 通过第 5 关 → "继续" 进入通关画面 → 点击回到标题。

- [ ] 10. 音频：AudioContext 初始化、音效、背景音乐、静音按钮。
      `audio/audio.js`（D10：首次 pointerdown 创建并 resume；master gain；`setMuted` 结合 `saveMuted`；无 Web Audio 时所有调用静默为 no-op）；`audio/sfx.js`（hit、pickup star/heart/shield、button click、shooting 预警提示音、win 胜利旋律、lose 下行音）；`audio/music.js`（lookahead 调度；标题/选关一首、游戏一首轻快 8-bit 循环；切场景时切换曲目，win/lose 时停止游戏音乐）。在各场景/play 事件中接入；所有场景右上角绘制静音按钮并按 D11 拦截点击。
      Files: src/audio/{audio,sfx,music}.js, src/engine/ui.js, src/main.js, src/scenes/*.js
      Verify: `npm test` 通过；浏览器中：首次点击前控制台无 AudioContext autoplay 警告导致的报错，点击后标题音乐响起；游戏中各音效触发；过关播放胜利音效；点击静音按钮立即静音且不会触发场景点击/拖动，刷新后静音状态保持；切到其他标签页声音暂停、回来可继续。

- [ ] 11. 收尾：README 与全量手动验收。
      `README.md`：项目简介、`npm test`、`node tools/serve.mjs` 本地运行、目录说明、手机局域网访问方式（同一 Wi-Fi 访问 `http://<电脑IP>:5173/`，serve.mjs 默认监听 `127.0.0.1`，设置环境变量 `HOST=0.0.0.0` 时才对局域网开放；README 注明这是无鉴权的开发用静态服务器，仅在可信网络使用）。对照规格逐条自查（技术/操作/规则/障碍物/关卡/场景/测试），修复发现的问题；检查所有 `src/logic/*` 不引用浏览器全局。
      Files: README.md，以及自查中需修复的文件
      Verify: `npm test` 全部通过；浏览器（桌面 + 设备模拟竖屏手机）完整通关 1~5 关一次，控制台无报错，画面为整数倍缩放且像素锐利。
