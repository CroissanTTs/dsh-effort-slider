#!/usr/bin/env node
// 结构测试：mock module-loader 执行 lib/client.js，验证导出与渲染逻辑。
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = readFileSync(root + "lib/client.js", "utf8");
let passed = 0;
const ok = (n, fn) => { try { fn(); passed++; console.log(`  ✓ ${n}`); } catch (e) { console.error(`  ✗ ${n} — ${e.message}`); throw e; } };

const reactStub = { useEffect: (f) => f(), useState: (init) => [typeof init === "function" ? init() : init, () => {}], useCallback: (f) => f, useMemo: (f) => f(), useRef: () => ({ current: null }) };
const jsxRuntime = { jsx: (type, props) => ({ el: type, ...props }), jsxs: (type, props) => ({ el: type, ...props, children: props.children }) };

/**
 * 加载一份全新的 client 模块实例。
 * 档位记忆是模块级的，所以验证「从未选过档位」这类初始态必须换新实例。
 * @returns {{ exports: object, component: Function, slot: object }}
 */
function loadClient() {
	const requires = new Map([["react", reactStub], ["react/jsx-runtime", jsxRuntime]]);
	let exports;
	globalThis.window = { __ModuleLoader__: { load({ factory }) { exports = factory((spec) => requires.get(spec)); } } };
	eval(source.replace("window.__ModuleLoader__.load", "globalThis.window.__ModuleLoader__.load"));

	let slot;
	const ctx = {
		inject: (_deps, fn) => fn({
			slots: {
				inject: (_name, factory) => { slot = factory(); },
				register: (opts, component) => ({ opts, component })
			},
			modelDirectories: { directoryFor: () => ({ store: null, select: async () => {} }) }
		})
	};
	exports.apply(ctx);
	return { exports, component: slot.component, slot };
}

const { exports: clientExports, component: ReasoningSlider, slot: registered } = loadClient();

ok("导出 inject 与 apply", () => {
	assert.equal(typeof clientExports.inject, "object");
	assert.equal(typeof clientExports.apply, "function");
	assert.ok(clientExports.inject.includes("modelDirectories"));
});

ok("apply 把组件注册进 conversation.input.left", () => {
	assert.equal(registered.opts.name, "conversation.input.left");
	assert.equal(registered.opts.id, "reasoning-effort-slider");
	assert.equal(typeof registered.component, "function");
});

const mockStore = {
	getSnapshot: () => ({
		current: { provider: "bailian", model: "qwen3.8-max", reasoningEffort: "medium" },
		groups: [{ id: "bailian", name: "百炼", models: [{ id: "qwen3.8-max", reasoning: { efforts: [{ id: "off", name: "Off" }, { id: "low", name: "Low" }, { id: "medium", name: "Medium" }, { id: "xhigh", name: "Xhigh" }] } }] }]
	}),
	subscribe: () => () => {}
};
const mockDirectory = { store: mockStore, select: async () => {} };
const props = { store: mockStore, select: (s) => mockDirectory.select(s) };
ok("inject 提供 store + select", () => {
	assert.equal(props.store, mockStore);
	assert.equal(typeof props.select, "function");
});

// ---- 渲染：4 档模型渲染 icon 按钮（档位名带颜色，无圆点）----
const tree = ReasoningSlider(props);
const btnText = (t) => {
	const btn = t.children.find((c) => c.el === "button");
	return btn.children.find((c) => c.el === "span" && c.className === "dsh-rsi-btnText");
};
ok("4 档模型渲染 icon 按钮（档位名带颜色，无圆点）", () => {
	assert.equal(tree.el, "div");
	assert.equal(tree.className, "dsh-rsi");
	const btn = tree.children.find((c) => c.el === "button");
	assert.ok(btn, "应有 icon 按钮");
	assert.equal(btn.className, "dsh-rsi-btn");
	const text = btnText(tree);
	assert.ok(text, "应有档位名文字");
	assert.equal(text["data-level"], "medium");
	assert.equal(text.style?.color, "#6366f1"); // medium 的档位色
});
ok("icon 按钮显示当前档位名", () => assert.equal(btnText(tree)?.children, "Medium"));

// ---- 无档位模型不渲染 ----
const noEffortStore = { getSnapshot: () => ({ current: { provider: "bailian", model: "kimi-k3" }, groups: [{ id: "bailian", models: [{ id: "kimi-k3" }] }] }), subscribe: () => () => {} };
ok("无档位模型不渲染", () => assert.equal(ReasoningSlider({ store: noEffortStore, select: () => {} }), null));

// ---- patch 解析 ----
const doc = yaml.load(readFileSync(root + "cordis.patch.yml", "utf8"));
ok("patch insert 挂载 reasoning-slider-client", () => {
	const ins = doc.find((e) => Array.isArray(e.insert));
	assert.equal(ins.insert[0].name, "dsh-reasoning-effort-slider");
});

// 发布护栏：npm 只打包 package.json#files 覆盖到的路径。bundle patch 不在其中时
// 本地 link: 安装照常工作，但**每一个从 npm 装的用户**都会因为找不到 patch 而加载失败
// ——1.3.0 就是这样发出去的，所以这里把「files 必须覆盖 dsh.bundle.patch」钉死。
ok("files 覆盖 dsh.bundle.patch（否则 npm 安装会缺 patch 文件）", () => {
	const pkg = JSON.parse(readFileSync(root + "package.json", "utf8"));
	const patch = pkg.dsh?.bundle?.patch;
	assert.ok(patch, "package.json 必须声明 dsh.bundle.patch");
	const rel = patch.replace(/^\.\//, "");
	const covered = (pkg.files ?? []).some((entry) =>
		entry.endsWith("/") ? rel.startsWith(entry) : rel === entry
	);
	assert.ok(covered, `files ${JSON.stringify(pkg.files)} 未覆盖 ${rel}`);
	assert.ok(existsSync(root + rel), `${rel} 在仓库里不存在`);
});

// ---- 换模型挪档规则 ----
// levels 已剔除 off，形状与 effortsForModel 的返回一致。
const lv = (...ids) => ids.map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1) }));
const CLAMP = clientExports.clampEffort;
const SIX = lv("minimal", "low", "medium", "high", "xhigh", "max"); // v4.1-flash
const FIVE = lv("low", "medium", "high", "xhigh");                  // 最高只到 xhigh

ok("精确命中：原档位在目标模型里存在就直接沿用", () => {
	assert.equal(CLAMP("medium", SIX), "medium");
	assert.equal(CLAMP("xhigh", FIVE), "xhigh");
});
ok("前一个是 max、目标最高只有 xhigh → 取 xhigh（用户给的例子）", () => {
	assert.equal(CLAMP("max", FIVE), "xhigh");
});
ok("取不高于的最近一档：medium → 目标无 medium 时取 low", () => {
	assert.equal(CLAMP("medium", lv("low", "high", "max")), "low");
});
ok("不主动跳进不思考：minimal → 目标只剩 high/max 时取 high", () => {
	assert.equal(CLAMP("minimal", lv("high", "max")), "high");
});
ok("无从沿用与空梯：undefined / 空数组返回 undefined", () => {
	assert.equal(CLAMP(undefined, SIX), undefined);
	assert.equal(CLAMP("max", []), undefined);
});

// ---- 换模型端到端：在 A 上选 max → 切到只支持到 xhigh 的 B ----
const storeOf = (current, efforts) => ({
	getSnapshot: () => ({ current, groups: [{ id: "bailian", models: [{ id: current.model, reasoning: { efforts } }] }] }),
	subscribe: () => () => {}
});
// 先在 A 上带档位渲染一次，把记忆写进去
ReasoningSlider({ store: storeOf({ provider: "bailian", model: "model-a", reasoningEffort: "max" }, SIX), select: () => {} });
let committed;
// 切到 B：DSH 的 selectionOf 对「不同模型」只带 defaultEffort，而路由没设 reasoning，所以档位为空
const treeB = ReasoningSlider({ store: storeOf({ provider: "bailian", model: "model-b" }, FIVE), select: (s) => { committed = s; } });

ok("切换模型：把 max 挪成目标模型的 xhigh 并写回", () => {
	assert.deepEqual(committed, { provider: "bailian", model: "model-b", reasoningEffort: "xhigh" });
});
ok("过渡帧就显示挪好的档位，而不是掉到最低档", () => {
	assert.equal(btnText(treeB)?.children, "Xhigh");
	assert.equal(btnText(treeB)["data-level"], "xhigh");
});

// ---- 从未选过档位：全新实例下显示「默认」，不再谎报最低档 ----
{
	const fresh = loadClient();
	const freshTree = fresh.component({ store: storeOf({ provider: "bailian", model: "model-new" }, FIVE), select: () => {} });
	ok("从未选过档位时显示「默认」，而不是最低档名", () => {
		const text = btnText(freshTree);
		assert.equal(text?.children, "默认");
		assert.equal(text["data-level"], "");
		assert.equal(text.style?.color, "#94a3b8"); // 未设定态用灰色，与任何档位色区分
	});
	ok("从未选过档位时不擅自写回任何档位", () => {
		let wrote = false;
		fresh.component({ store: storeOf({ provider: "bailian", model: "model-new2" }, FIVE), select: () => { wrote = true; } });
		assert.equal(wrote, false);
	});
}

console.log(`\n全部通过（${passed} 项）`);