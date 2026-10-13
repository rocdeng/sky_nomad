// 场景管理。场景接口：
// { enter(params), update(dt), draw(ctx), onPointerDown(p), onPointerMove(p, dx, dy), onPointerUp(p) }
const registry = {};
let current = null;
let currentName = null;

export function register(name, scene) {
  registry[name] = scene;
}

export function go(name, params = {}) {
  const scene = registry[name];
  if (!scene) throw new Error(`unknown scene ${name}`);
  current = scene;
  currentName = name;
  scene.enter?.(params);
}

export function currentScene() {
  return current;
}

export function currentSceneName() {
  return currentName;
}
