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
const reactStub = { useEffect: (f) => f(), useState: (init) => [typeof init === "function" ? init() : init, () => {}], useCallback: (f) => f };
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
const mockStore = {
	getSnapshot: () => ({
		selection: { provider: "bailian", model: "qwen3.8-max", reasoningEffort: "medium" },
		value: { models: { "bailian/qwen3.8-max": { reasoning: { efforts: [{ id: "off" }, { id: "low" }, { id: "medium" }, { id: "xhigh" }] } } } }
	}),
	subscribe: () => () => {}
};
const mockDirectory = { store: mockStore, select: async () => {} };
clientExports.apply(ctx);
ok("apply 把组件注册进 conversation.input.right", () => {
	assert.equal(registered.opts.name, "conversation.input.right");
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
ok("3 档模型渲染滑动条（range input）", () => {
	assert.equal(tree.el, "div");
	const range = tree.children.find((c) => c.el === "input");
	assert.ok(range, "应有 range input");
	assert.equal(range.el, "input");
	assert.equal(range.value, 2); // medium 在 [off,low,medium,xhigh] 中索引 2
});
ok("label 显示当前档位中文", () => {
	const labelSpans = tree.children.filter((c) => c.el === "span" && c.children && typeof c.children === "string");
	const valueLabel = labelSpans[1]; // 第一个是静态"推理"标签，第二个是当前值
	assert.ok(["关","极低","低","中","高","高+","拉满"].includes(valueLabel?.children), `got ${valueLabel?.children}`);
});

// ---- 无档位模型不渲染 ----
const noEffortStore = { getSnapshot: () => ({ selection: { provider: "bailian", model: "kimi-k3" }, value: { models: { "bailian/kimi-k3": {} } } }), subscribe: () => () => {} };
const noTree = registered.component({ store: noEffortStore, select: () => {} });
ok("无档位模型不渲染滑动条", () => assert.equal(noTree, null));

// ---- patch 解析 ----
const doc = yaml.load(readFileSync(root + "cordis.patch.yml", "utf8"));
ok("patch insert 挂载 reasoning-slider-client", () => {
	const ins = doc.find((e) => Array.isArray(e.insert));
	assert.equal(ins.insert[0].name, "dsh-reasoning-slider");
});

console.log(`\n全部通过（${passed} 项）`);
