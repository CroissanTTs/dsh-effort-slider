// dsh-reasoning-slider — 客户端 bundle（web）。
// window.__ModuleLoader__.load({id, factory}) 格式（与官方客户端包同构），手写 jsx。
// GPT/Codex 风格推理强度滑动条：定制 track + 拇指 + 填充段 + 离散刻度吸附 +
// 当前档位名（取自 catalog 的 effort.name，与官方选择器同语言）。
window.__ModuleLoader__.load({
	id: "dsh-reasoning-slider",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let jsx = require("react/jsx-runtime").jsx;
		let jsxs = require("react/jsx-runtime").jsxs;

		const { useEffect, useState, useCallback, useMemo } = react;

		// harness 推理档位显示顺序。
		const LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

		// 幂等注入样式（DSH 设计令牌，自动适配明暗主题）。
		const CSS_TAG = "dsh-reasoning-slider";
		const CSS = `
.dsh-rs{display:flex;align-items:center;gap:10px;height:28px;padding:0 8px;min-width:0}
.dsh-rs-track{position:relative;flex:1 1 auto;min-width:120px;max-width:220px;height:18px;display:flex;align-items:center}
.dsh-rs-rail{position:absolute;left:0;right:0;top:50%;height:4px;border-radius:999px;background:var(--dsw-alias-border-l1);transform:translateY(-50%)}
.dsh-rs-fill{position:absolute;left:0;top:50%;height:4px;border-radius:999px;background:var(--dsw-alias-label-primary);transform:translateY(-50%);transition:width .12s ease}
.dsh-rs-ticks{position:absolute;left:0;right:0;top:50%;display:flex;justify-content:space-between;transform:translateY(-50%);pointer-events:none}
.dsh-rs-tick{width:3px;height:3px;border-radius:50%;background:var(--dsw-alias-border-l3)}
.dsh-rs-tickActive{background:var(--dsw-alias-label-primary)}
.dsh-rs-input{position:absolute;inset:0;width:100%;height:18px;margin:0;cursor:pointer;opacity:0}
.dsh-rs-thumb{position:absolute;top:50%;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-label-primary);box-shadow:0 0 0 3px var(--dsw-alias-bg-module-platform),0 1px 3px rgba(0,0,0,.25);transform:translate(-50%,-50%);transition:left .12s ease;pointer-events:none}
.dsh-rs-label{flex:none;font-size:12px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-secondary);white-space:nowrap;min-width:32px;text-align:right}
.dsh-rs-cap{flex:none;font-size:12px;color:var(--dsw-alias-label-caption);white-space:nowrap}`;
		if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css="${CSS_TAG}"]`) === null) {
			const tag = document.createElement("style");
			tag.dataset.pluginCss = CSS_TAG;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		/**
		 * 取当前模型可用的档位（按 LEVELS 排序，含 catalog 的 name）。
		 * directory store 快照：{current, routable, groups, failures, status, error}。
		 */
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
			if (!levels || levels.length <= 1) return null; // 无档位或仅一档不显示

			const idx = Math.max(0, levels.findIndex((l) => l.id === current));
			const n = levels.length;
			const fillPct = n <= 1 ? 0 : (idx / (n - 1)) * 100;
			const thumbLeft = `${fillPct}%`;
			const label = levels[idx]?.name ?? current ?? "";

			const onChange = useCallback((ev) => {
				const level = levels[Number(ev.target.value)];
				if (level && select) select({ provider, model, reasoningEffort: level.id });
			}, [levels, select, provider, model]);

			const ticks = useMemo(() => levels.map((l, i) => ({ id: l.id, active: i <= idx })), [levels, idx]);

			return jsxs("div", {
				className: "dsh-rs",
				"aria-label": "推理强度",
				children: [
					jsx("span", { className: "dsh-rs-cap", children: "推理" }),
					jsxs("div", { className: "dsh-rs-track", children: [
						jsx("div", { className: "dsh-rs-rail" }),
						jsx("div", { className: "dsh-rs-fill", style: { width: thumbLeft } }),
						jsx("div", { className: "dsh-rs-ticks", children: ticks.map((t) => jsx("span", { key: t.id, className: `dsh-rs-tick${t.active ? " dsh-rs-tickActive" : ""}` })) }),
						jsx("div", { className: "dsh-rs-thumb", style: { left: thumbLeft } }),
						jsx("input", {
							type: "range",
							className: "dsh-rs-input",
							min: 0,
							max: n - 1,
							step: 1,
							value: idx,
							onChange,
							"aria-label": "推理强度滑动条",
							"aria-valuetext": label
						})
					]}),
					jsx("span", { className: "dsh-rs-label", children: label })
				]
			});
		}

		// directoryFor 内部访问 ctx.sessions / ctx.remote.session / ctx.get("conversation")，
		// 这些 cordis 服务必须在 inject 里声明，否则抛 "cannot get property remote.session without inject"。
		const inject = ["slots", "modelDirectories", "sessions", "remote", "remote.session", "conversation"];

		function apply(ctx) {
			ctx.inject(["slots", "modelDirectories"], (scope) => {
				const { slots, modelDirectories } = scope;
				// conversation.input.right 是 list slot（session 作用域，与官方 .model 行并存、不冲突）。
				slots.inject("conversation.input.right", () => slots.register({
					name: "conversation.input.right",
					id: "reasoning-effort-slider",
					order: 20,
					inject: (sessionId) => {
						const directory = modelDirectories.directoryFor(sessionId);
						// 与官方 model-selection 同构：传 store（getSnapshot/subscribe），select 走实例方法。
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
