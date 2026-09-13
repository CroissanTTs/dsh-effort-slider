// dsh-reasoning-slider — 客户端 bundle（web）。
// window.__ModuleLoader__.load({id, factory}) 格式，手写 jsx。
// GPT/Codex 风格推理强度滑动条：极简 track + 拇指 + 填充段 + 当前档位名。
// 拖动期间用本地态驱动 UI（不逐像素写 store，避免连带官方选择器重排抖动），
// 松手（onChange）才提交 directory.select。
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
.dsh-rs{display:flex;align-items:center;gap:10px;height:28px;padding:0 10px;min-width:0}
.dsh-rs-track{position:relative;flex:1 1 auto;min-width:120px;max-width:200px;height:20px;display:flex;align-items:center;touch-action:none}
.dsh-rs-rail{position:absolute;left:0;right:0;top:50%;height:3px;border-radius:999px;background:var(--dsw-alias-border-l2);transform:translateY(-50%)}
.dsh-rs-fill{position:absolute;left:0;top:50%;height:3px;border-radius:999px;background:var(--dsw-alias-label-primary);transform:translateY(-50%);transition:width .1s ease}
.dsh-rs-thumb{position:absolute;top:50%;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-label-primary);box-shadow:0 0 0 4px var(--dsw-alias-bg-module-platform),0 1px 3px rgba(0,0,0,.22);transform:translate(-50%,-50%);transition:left .1s ease;pointer-events:none}
.dsh-rs-input{position:absolute;inset:0;width:100%;height:20px;margin:0;cursor:pointer;opacity:0}
.dsh-rs-input:focus-visible+.dsh-rs-thumb{box-shadow:0 0 0 4px var(--dsw-alias-bg-module-platform),0 0 0 6px var(--dsw-alias-border-l3),0 1px 3px rgba(0,0,0,.22)}
.dsh-rs-label{flex:none;font-size:12px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-secondary);white-space:nowrap;min-width:34px;text-align:right}
.dsh-rs-cap{flex:none;font-size:12px;color:var(--dsw-alias-label-caption);white-space:nowrap}`;
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

			// 拖动期间本地态：onInput 实时驱动 UI，onChange（松手）才提交 store。
			const [dragIdx, setDragIdx] = useState(null);
			if (!levels || levels.length <= 1) return null;

			const storeIdx = Math.max(0, levels.findIndex((l) => l.id === current));
			const idx = dragIdx ?? storeIdx;
			const n = levels.length;
			const pct = n <= 1 ? 0 : (idx / (n - 1)) * 100;
			const label = levels[idx]?.name ?? current ?? "";

			const onInput = useCallback((ev) => setDragIdx(Number(ev.target.value)), []);
			const onChange = useCallback((ev) => {
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
						jsx("div", { className: "dsh-rs-rail" }),
						jsx("div", { className: "dsh-rs-fill", style: { width: `${pct}%` } }),
						jsx("div", { className: "dsh-rs-thumb", style: { left: `${pct}%` } }),
						jsx("input", {
							type: "range",
							className: "dsh-rs-input",
							min: 0,
							max: n - 1,
							step: 1,
							value: idx,
							onInput,
							onChange,
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
				slots.inject("conversation.input.right", () => slots.register({
					name: "conversation.input.right",
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
