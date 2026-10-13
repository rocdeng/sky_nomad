# Sky Nomad

手机浏览器竖版像素风躲避游戏。原生 HTML5 Canvas + ES modules，无依赖、无构建。设计文档：`docs/superpowers/specs/2026-10-13-sky-nomad-design.md`。

## 运行

ES modules 不能在 `file://` 下加载，需要本地静态服务器：

```sh
node tools/serve.mjs      # 或 npm run serve
```

打开 http://localhost:5173/ 。

手机局域网访问：`HOST=0.0.0.0 node tools/serve.mjs`（PowerShell：`$env:HOST='0.0.0.0'; node tools/serve.mjs`），同一 Wi-Fi 下访问 `http://<电脑IP>:5173/`。
注意：`serve.mjs` 是无鉴权的开发用静态服务器，默认只监听 `127.0.0.1`，仅在可信网络中对局域网开放。

## 测试

```sh
npm test                  # 等价 node --test
```

覆盖纯逻辑：缩放、碰撞、评星、存档、关卡配置、生成器、障碍物、玩家、游戏状态、道具、像素画数据。

调试参数：`?debug=sprites` 查看所有缓存精灵；`?debug&level=N` 直接进入第 N 关并在 `window.skyNomad` 暴露场景对象。

## 目录

```
index.html  style.css      页面与整数倍缩放样式
tools/serve.mjs            零依赖静态服务器
src/main.js                启动：缩放、精灵缓存、输入、音频、场景
src/config.js              常量
src/logic/                 纯逻辑（不引用浏览器全局，可被 node --test 直接测试）
src/engine/                主循环、输入、场景管理、UI
src/gfx/                   调色板、字符矩阵像素画、离屏缓存、粒子、背景
src/audio/                 Web Audio 实时合成音效与音乐
src/scenes/                标题 / 选关 / 游戏 / 过关 / 失败 / 通关
test/                      node --test 测试
```
