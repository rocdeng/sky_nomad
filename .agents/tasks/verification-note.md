# Verification note（第 1 次迭代）

环境：Windows / pwsh，Node v24.18.1，Chrome（headless=new，通过 CDP 驱动）。

## 1. 逻辑测试

`node --test`（= `npm test`）：**52 tests, 52 pass, 0 fail**。覆盖：
- scale：390×844→2、1080×1920→6、1920×1080→3、100×100→1，居中偏移。
- collision：半径 = 半宽×0.7；重叠为真、相切为假。
- rating：5→3、4/3→2、2/1→1、0→0。
- storage：key `skyNomad.unlocked`；缺失/"abc"/"9"/"0"/"2.5"/抛异常 → 1；只增不减；通关 n 解锁 n+1，上限 5；静音 roundtrip；写入异常被吞掉。
- levels：5 关名称/时长/障碍与规格表一致；仅第 5 关有 ship，from = duration-10。
- spawner：spawnInterval 在 0/中点/终点/越界 clamp；固定 seed 全程模拟第 1 关只有 meteor、第 2 关只有 meteor/shooting、第 5 关 ship 只在最后 10 秒且同时 ≤2、后半段生成更密、道具间隔 4~6 秒。
- obstacles：meteor 直落+旋转、大小两种；shooting 0.6 秒预警不可碰撞、之后斜向；comet 在 x0±28 振荡、尾巴 ≤7；alien 摇摆下降；ship 碰边反弹；出屏判定；speedMul。
- player：初始位置/血量、相对位移、clamp。
- gameState：撞击扣 1 + 1.5 秒无敌、无敌期内不重复扣血、障碍物不消失、护盾 5 秒免伤且不触发无敌、重复拾取护盾重置、爱心上限 5、星星 +10、hp 0 → lost、坚持到时长 → won 且评星正确、结束后 step 不再变化、第 5 关真实生成器全程模拟。
- sprites：所有字符矩阵行等长、字符合法、尺寸与逻辑碰撞尺寸一致。

另检查 `src/logic/*.js` 不引用 window/document/canvas/AudioContext（仅 storage.js 注释里提到 localStorage 一词）。

## 2. 浏览器验收

命令：后台 `node tools/serve.mjs`，然后 `node .agents/tasks/browser-check.mjs`（结束后已停止服务器进程）。
结果：**42/42 checks passed**，截图在 `.agents/tasks/screens/`（未入 git）。

脚本用 iPhone 尺寸 390×844 @3x + 触摸模拟，实际派发 touch 事件：
- 画布 backing 180×320，CSS 360×640（2 倍），居中 left 15 / top 102，body 背景 `rgb(27,42,92)` 与游戏背景一致，`image-rendering: pixelated`。
- 首次点击前没有 AudioContext；点击后创建，标题曲目开始调度（headless 下 state 为 suspended，属于 headless 自动播放策略，真实设备上首次点击后会 resume；脚本后面暂停/继续一步确认 resume 后为 running）。
- 标题 → 选关；初始只有第 1 关可点，点锁定的第 2 关无反应。
- 第 1 关：拖动 CSS (40,-20) → 飞机逻辑位移 (20,-10)；拖到屏幕外被 clamp 到 (172,312)；场上只有 meteor。
- 注入一个停在飞机上的障碍物：hp 5→4、invuln≈1.5，无敌期内不再扣血。
- 注入三种道具：分数 +10、血量 +1（上限 5）、护盾约 5 秒。
- 把 elapsed 推到终点（hp=4）→ 过关场景，逐个显示 2 颗星；`localStorage['skyNomad.unlocked'] === "2"`。
- "下一关" → 第 2 关；流星出现 0.6 秒预警；障碍物 ⊆ {meteor, shooting}。
- hp=1 时撞击 → 失败场景；"再来一次" → 同一关满血重开；"选关" → 选关显示 2 关已解锁；刷新页面后仍为 2。
- 右上角静音按钮：切换静音、场景不受影响、`skyNomad.muted` = "1" 持久化，再点恢复。
- 设 unlocked=5 → 第 5 关：elapsed 55~58 秒没有 ship；60 秒后出现 1~2 艘 ship；过关 3 星 → "继续" → 通关画面 → 点击回到标题。
- 模拟 `visibilitychange`(hidden) → 游戏暂停 + AudioContext suspended，显示"点击继续"；点击后恢复（running）且未把这次点击传给场景。
- 1280×720 → 2 倍 360×640 居中（460,40）；1080×1920 → 6 倍。
- 全程无控制台错误/异常（加了 `<link rel="icon" href="data:,">` 消除 favicon 404）。

人工查看截图：精灵表、标题、选关（锁图标）、游戏 HUD（进度条/心形/分数/静音按钮）、护盾光环、第 5 关大飞船+彗星彩虹尾+外星人、过关星级、失败、通关画面，像素锐利、无模糊。

## 3. 未能验证的内容

- 真实声音的听感（headless 无音频输出）；只确认了 AudioContext 创建/暂停/恢复与曲目调度状态。
- 真实手机（iOS Safari / Android Chrome）上的触摸与音频解锁；仅用 Chrome 设备模拟。
- 完整 45~70 秒实时通关：用脚本推进 elapsed 来缩短时间；整关实时模拟由 node 测试覆盖。

## 过程中发现并修复的问题

- `drawButton` 对 `null` 选项解构抛错，导致选关页 rAF 循环中断（按钮不显示、游戏不更新）。已修复（`opts?.(b) ?? undefined`）。
