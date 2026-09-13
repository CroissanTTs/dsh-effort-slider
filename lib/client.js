// dsh-reasoning-slider — 客户端 bundle（web）。
// window.__ModuleLoader__.load({id, factory}) 格式，手写 jsx。
// ChatGPT 风格推理滑动条：胶囊细条 + 圆点在条内移动（不溢出）+ 条内均匀档位点 +
// 左侧填充段为档位专属色（xhigh 渐变、max 动画流光）+ 档位名。
// 拖动期间本地态驱动 UI，松手（onPointerUp/onKeyUp）才提交 directory.select。
window.__ModuleLoader__.load({
	id: "dsh-reasoning-slider",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let jsx = require("react/jsx-runtime").jsx;
		let jsxs = require("react/jsx-runtime").jsxs;

		const { useEffect, useState, useCallback } = react;

		const LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

		const CSS_TAG = "dsh-reasoning-slider";
		const CSS = `
.dsh-rs{display:flex;align-items:center;gap:8px;height:28px;padding:0 10px;flex:none}
.dsh-rs-cap{flex:none;font-size:12px;color:var(--dsw-alias-label-caption);white-space:nowrap}
.dsh-rs-track{position:relative;width:168px;flex:none;height:14px;border-radius:999px;background:var(--dsw-alias-border-l2);overflow:hidden}
.dsh-rs-range{position:absolute;left:7px;right:7px;top:0;bottom:0}
.dsh-rs-fill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--dsw-alias-label-primary);transition:width .15s ease,background .25s ease}
.dsh-rs-fill[data-level="xhigh"]{background:linear-gradient(90deg,var(--dsw-alias-label-primary),var(--dsw-alias-state-accent,var(--dsw-alias-label-primary)))}
.dsh-rs-fill[data-level="max"]{background:linear-gradient(90deg,var(--dsw-alias-label-primary),var(--dsw-alias-state-accent,var(--dsw-alias-label-primary)),var(--dsw-alias-label-primary));background-size:200% 100%;animation:dsh-rs-shimmer 1.8s linear infinite}
@keyframes dsh-rs-shimmer{to{background-position:-200% 0}}
.dsh-rs-dots{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;pointer-events:none}
.dsh-rs-dot{width:3px;height:3px;border-radius:50%;background:var(--dsw-alias-border-l3)}
.dsh-rs-dot.active{background:var(--dsw-alias-bg-module-platform)}
.dsh-rs-thumb{position:absolute;left:0;top:50%;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-bg-module-platform);box-shadow:0 0 0 2px var(--dsw-alias-label-primary),0 1px 2px rgba(0,0,0,.25);transform:translate(-50%,-50%);transition:left .15s ease;pointer-events:none}
.dsh-rs-input{position:absolute;inset:0;width:100%;height:100%;margin:0;cursor:pointer;opacity:0}
.dsh-rs-label{flex:none;width:56px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);text-align:right}`;
		if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css="${CSS_TAG}"]`) === null) {
			const tag = document.createElement("style");
			tag.dataset.pluginCss = CSS_TAG;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		/** 取当前模型可用档位（按 LEVELS 排序，含 catalog name）。directory store 快照：{current, groups, ...}。 */
		function effortsForModel(store, provider, model) {
			const snap = typeof store?.getSnapshot === "function" ? store.getSnapshot() : undefined;
			const groups = snap?.groups;
			if (!Array.isArray(groups) || !provider || !model) return null;
			const group = groups.find((g) => g?.id === provider);
			const entry = group?.models?.find((m) => m?.id === model);
			const efforts = entry?.reasoning?.efforts;
			if (!Array.isArray(efforts) || efforts.length === 0) return null;
			const byId = new Map(efforts.map((e) => [e.id, e]));
			const ordered = LEVELS.map((l) => byId.get(l)).filter(Boolean);
			return ordered.length > 0 ? ordered : null;
		}

		function ReasoningSlider({ store, select }) {
			const [snap, setSnap] = useState(() => typeof store?.getSnapshot === "function" ? store.getSnapshot() : undefined);
			useEffect(() => {
				if (typeof store?.subscribe !== "function") return;
				let active = true;
				const stop = store.subscribe(() => {
					if (active) setSnap(typeof store.getSnapshot === "function" ? store.getSnapshot() : undefined);
				});
				return () => { active = false; stop?.(); };
			}, [store]);

			const sel = snap?.current;
			const provider = sel?.provider;
			const model = sel?.model;
			const current = sel?.reasoningEffort;
			const levels = effortsForModel(store, provider, model);
			const [dragIdx, setDragIdx] = useState(null);
			if (!levels || levels.length <= 1) return null;

			const storeIdx = Math.max(0, levels.findIndex((l) => l.id === current));
			const idx = dragIdx ?? storeIdx;
			const n = levels.length;
			const pct = n <= 1 ? 0 : (idx / (n - 1)) * 100;
			const label = levels[idx]?.name ?? current ?? "";
			const fillLevel = levels[idx]?.id ?? "";

			const onChange = useCallback((ev) => setDragIdx(Number(ev.target.value)), []);
			const commit = useCallback((ev) => {
				const level = levels[Number(ev.target.value)];
				setDragIdx(null);
				if (level && select) select({ provider, model, reasoningEffort: level.id });
			}, [levels, select, provider, model]);

			return jsxs("div", {
				className: "dsh-rs",
				"aria-label": "推理强度",
				children: [
					jsx("span", { className: "dsh-rs-cap", children: "推理" }),
					jsxs("div", { className: "dsh-rs-track", children: [
						jsxs("div", { className: "dsh-rs-range", children: [
							jsx("div", { className: "dsh-rs-fill", "data-level": fillLevel, style: { width: `${pct}%` } }),
							jsx("div", { className: "dsh-rs-dots", children: levels.map((l, i) => jsx("span", { key: l.id, className: `dsh-rs-dot${i <= idx ? " active" : ""}` })) }),
							jsx("div", { className: "dsh-rs-thumb", style: { left: `${pct}%` } })
						]}),
						jsx("input", {
							type: "range",
							className: "dsh-rs-input",
							min: 0,
							max: n - 1,
							step: 1,
							value: idx,
							onChange,
							onPointerUp: commit,
							onKeyUp: commit,
							onTouchEnd: commit,
							"aria-label": "推理强度滑动条",
							"aria-valuetext": label
						})
					]}),
					jsx("span", { className: "dsh-rs-label", children: label })
				]
			});
		}

		// directoryFor 访问 ctx.sessions / ctx.remote.session / ctx.get("conversation")，须在 inject 声明。
		const inject = ["slots", "modelDirectories", "sessions", "remote", "remote.session", "conversation"];

		function apply(ctx) {
			ctx.inject(["slots", "modelDirectories"], (scope) => {
				const { slots, modelDirectories } = scope;
				// conversation.input.left 是 list slot（session 作用域，底部左侧），与官方控件并存。
				slots.inject("conversation.input.left", () => slots.register({
					name: "conversation.input.left",
					id: "reasoning-effort-slider",
					order: 20,
					inject: (sessionId) => {
						const directory = modelDirectories.directoryFor(sessionId);
						return {
							store: directory?.store,
							select: (selection) => directory.select(selection).then(() => true, () => false)
						};
					}
				}, ReasoningSlider));
			});
		}

		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
