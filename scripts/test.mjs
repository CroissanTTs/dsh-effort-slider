#!/usr/bin/env node
// 结构测试：mock module-loader 执行 lib/client.js，验证导出与渲染逻辑。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = fileURLToPath(new URL("..", import.meta.url));
let passed = 0;
const ok = (n, fn) => { try { fn(); passed++; console.log(`  ✓ ${n}`); } catch (e) { console.error(`  ✗ ${n} — ${e.message}`); throw e; } };

const reactStub = { useEffect: (f) => f(), useState: (init) => [typeof init === "function" ? init() : init, () => {}], useCallback: (f) => f, useMemo: (f) => f(), useRef: () => ({ current: null }) };
const jsxRuntime = { jsx: (type, props) => ({ el: type, ...props }), jsxs: (type, props) => ({ el: type, ...props, children: props.children }) };
const requires = new Map([["react", reactStub], ["react/jsx-runtime", jsxRuntime]]);
globalThis.window = { __ModuleLoader__: { load({ id, factory }) { this._exports = factory((spec) => requires.get(spec)); } } };
const src = readFileSync(root + "lib/client.js", "utf8");
eval(src.replace("window.__ModuleLoader__.load", "globalThis.window.__ModuleLoader__.load"));
const clientExports = globalThis.window.__ModuleLoader__._exports;

ok("导出 inject 与 apply", () => {
	assert.equal(typeof clientExports.inject, "object");
	assert.equal(typeof clientExports.apply, "function");
	assert.ok(clientExports.inject.includes("modelDirectories"));
});

let registered;
const ctx = {
	inject: (deps, fn) => {
		const scope = {
			slots: { inject: (slotName, factory) => { registered = factory(); }, register: (opts, component) => ({ opts, component }) },
			modelDirectories: { directoryFor: () => mockDirectory }
		};
		fn(scope);
	}
};
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
ok("inject 提供 store + select", () => {
	assert.equal(props.store, mockStore);
	assert.equal(typeof props.select, "function");
});

// ---- 渲染：4 档模型渲染 icon 按钮（档位名带颜色，无圆点）----
const tree = registered.component(props);
ok("4 档模型渲染 icon 按钮（档位名带颜色，无圆点）", () => {
	assert.equal(tree.el, "div");
	assert.equal(tree.className, "dsh-rsi");
	const btn = tree.children.find((c) => c.el === "button");
	assert.ok(btn, "应有 icon 按钮");
	assert.equal(btn.className, "dsh-rsi-btn");
	const text = btn.children.find((c) => c.el === "span" && c.className === "dsh-rsi-btnText");
	assert.ok(text, "应有档位名文字");
	assert.equal(text["data-level"], "medium");
	assert.equal(text.style?.color, "#6366f1"); // medium 的档位色
});
ok("icon 按钮显示当前档位名", () => {
	const btn = tree.children.find((c) => c.el === "button");
	const text = btn.children.find((c) => c.el === "span" && c.className === "dsh-rsi-btnText");
	assert.equal(text?.children, "Medium");
});

// ---- 无档位模型不渲染 ----
const noEffortStore = { getSnapshot: () => ({ current: { provider: "bailian", model: "kimi-k3" }, groups: [{ id: "bailian", models: [{ id: "kimi-k3" }] }] }), subscribe: () => () => {} };
const noTree = registered.component({ store: noEffortStore, select: () => {} });
ok("无档位模型不渲染", () => assert.equal(noTree, null));

// ---- patch 解析 ----
const doc = yaml.load(readFileSync(root + "cordis.patch.yml", "utf8"));
ok("patch insert 挂载 reasoning-slider-client", () => {
	const ins = doc.find((e) => Array.isArray(e.insert));
	assert.equal(ins.insert[0].name, "dsh-effort-slider");
});

console.log(`\n全部通过（${passed} 项）`);
