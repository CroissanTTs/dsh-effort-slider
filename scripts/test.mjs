#!/usr/bin/env node
// 结构测试：用 mock module-loader 执行 lib/client.js，验证导出与渲染逻辑。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = fileURLToPath(new URL("..", import.meta.url));
let passed = 0;
const ok = (n, fn) => { try { fn(); passed++; console.log(`  ✓ ${n}`); } catch (e) { console.error(`  ✗ ${n} — ${e.message}`); throw e; } };

// ---- mock module loader：执行 lib/client.js 取得 exports ----
const reactStub = { useEffect: (f) => f(), useState: (init) => [typeof init === "function" ? init() : init, () => {}], useCallback: (f) => f, useMemo: (f) => f() };
const jsxRuntime = { jsx: (type, props) => ({ el: type, ...props }), jsxs: (type, props) => ({ el: type, ...props, children: props.children }) };
const requires = new Map([
	["react", reactStub],
	["react/jsx-runtime", jsxRuntime],
]);
globalThis.window = { __ModuleLoader__: { load({ id, factory }) { this._exports = factory((spec) => requires.get(spec)); } } };
const src = readFileSync(root + "lib/client.js", "utf8");
eval(src.replace("window.__ModuleLoader__.load", "globalThis.window.__ModuleLoader__.load"));
const clientExports = globalThis.window.__ModuleLoader__._exports;

ok("导出 inject 与 apply", () => {
	assert.equal(typeof clientExports.inject, "object");
	assert.equal(typeof clientExports.apply, "function");
	assert.ok(clientExports.inject.includes("modelDirectories"));
});

// ---- mock ctx + apply：验证 dock 注册拿到 ReasoningSlider 组件 ----
let registered;
const ctx = {
	inject: (deps, fn) => {
		const scope = {
			slots: {
				inject: (slotName, factory) => { registered = factory(); },
				register: (opts, component) => ({ opts, component })
			},
			modelDirectories: { directoryFor: () => mockDirectory }
		};
		fn(scope);
	}
};
// 真实结构：getSnapshot/subscribe 在 directory.store 上；select 在实例上。
// store 快照形状：{current, routable, groups, failures, status, error}。
const mockStore = {
	getSnapshot: () => ({
		current: { provider: "bailian", model: "qwen3.8-max", reasoningEffort: "medium" },
		groups: [{ id: "bailian", name: "百炼", models: [{ id: "qwen3.8-max", reasoning: { efforts: [{ id: "off", name: "Off" }, { id: "low", name: "Low" }, { id: "medium", name: "Medium" }, { id: "xhigh", name: "Xhigh" }] } }] }]
	}),
	subscribe: () => () => {}
};
const mockDirectory = { store: mockStore, select: async () => {} };
clientExports.apply(ctx);
ok("apply 把组件注册进 conversation.input.left", () => {
	assert.equal(registered.opts.name, "conversation.input.left");
	assert.equal(registered.opts.id, "reasoning-effort-slider");
	assert.equal(typeof registered.component, "function");
});

const props = registered.opts.inject("session-1");
ok("inject 提供 store（= directory.store）+ select", () => {
	assert.equal(props.store, mockStore);
	assert.equal(typeof props.select, "function");
});

// ---- 渲染：4 档模型显示滑动条；current=medium 命中索引 2 ----
const tree = registered.component(props);
ok("4 档模型渲染滑动条（胶囊 track + 填充 + 档位点 + 拇指 + 隐藏 input）", () => {
	assert.equal(tree.el, "div");
	assert.equal(tree.className, "dsh-rs");
	const track = tree.children.find((c) => c.el === "div" && c.className === "dsh-rs-track");
	assert.ok(track, "应有 track");
	const range = track.children.find((c) => c.el === "div" && c.className === "dsh-rs-range");
	assert.ok(range, "应有 range（内缩区）");
	const fill = range.children.find((c) => c.el === "div" && c.className === "dsh-rs-fill");
	assert.ok(fill, "应有 fill");
	assert.equal(fill["data-level"], "medium"); // 当前档位驱动填充色
	assert.equal(fill.style.width, "66.66666666666666%"); // idx 2 / (4-1)
	const dots = range.children.find((c) => c.el === "div" && c.className === "dsh-rs-dots");
	assert.equal(dots.children.length, 4, "应有 4 个档位点");
	const thumb = range.children.find((c) => c.el === "div" && c.className === "dsh-rs-thumb");
	assert.ok(thumb, "应有拇指");
	assert.equal(thumb.style.left, "66.66666666666666%");
	const input = track.children.find((c) => c.el === "input");
	assert.ok(input, "应有隐藏 range input");
	assert.equal(input.value, 2); // medium 索引 2
});
ok("label 显示当前档位名（取自 catalog effort.name）", () => {
	const labelSpan = tree.children.find((c) => c.el === "span" && c.className === "dsh-rs-label");
	assert.equal(labelSpan?.children, "Medium");
});

// ---- 无档位模型不渲染 ----
const noEffortStore = { getSnapshot: () => ({ current: { provider: "bailian", model: "kimi-k3" }, groups: [{ id: "bailian", models: [{ id: "kimi-k3" }] }] }), subscribe: () => () => {} };
const noTree = registered.component({ store: noEffortStore, select: () => {} });
ok("无档位模型不渲染滑动条", () => assert.equal(noTree, null));

// ---- patch 解析 ----
const doc = yaml.load(readFileSync(root + "cordis.patch.yml", "utf8"));
ok("patch insert 挂载 reasoning-slider-client", () => {
	const ins = doc.find((e) => Array.isArray(e.insert));
	assert.equal(ins.insert[0].name, "dsh-reasoning-slider");
});

console.log(`\n全部通过（${passed} 项）`);
