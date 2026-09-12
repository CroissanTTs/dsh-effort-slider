// dsh-reasoning-slider — 客户端 bundle（web）。
// 编译为 window.__ModuleLoader__.load({id, factory}) 格式（与官方客户端包同构）。
// 无构建工具依赖：直接用 react/jsx-runtime 的 jsx() 手写，便于静态审计。
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

		// harness 推理档位 → 显示顺序；滑动条按此顺序排列。
		const LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
		const LABEL = {
			off: "关", minimal: "极低", low: "低", medium: "中", high: "高", xhigh: "高+", max: "拉满"
		};

		/** 取当前模型可用的档位列表（来自目录中模型的 reasoning.efforts）。 */
		function effortsForModel(directory, provider, model) {
			const snap = directory?.getSnapshot?.();
			const catalog = snap?.value;
			if (!catalog || !provider || !model) return null;
			const entry = catalog.models?.[`${provider}/${model}`] ?? catalog.models?.[model];
			const efforts = entry?.reasoning?.efforts;
			if (!Array.isArray(efforts) || efforts.length === 0) return null;
			// 只保留 LEVELS 里、且可用的档位，按 LEVELS 顺序。
			const ids = efforts.map((e) => e.id);
			return LEVELS.filter((l) => ids.includes(l));
		}

		/** 滑动条组件：注入 props 含 directory（来自 modelDirectories）与 select。 */
		function ReasoningSlider({ directory, select }) {
			const [snap, setSnap] = useState(() => directory?.getSnapshot?.());
			useEffect(() => {
				if (!directory?.store?.subscribe) return;
				let active = true;
				const stop = directory.store.subscribe(() => {
					if (active) setSnap(directory.getSnapshot());
				});
				return () => { active = false; stop?.(); };
			}, [directory]);

			const sel = snap?.selection;
			const provider = sel?.provider;
			const model = sel?.model;
			const current = sel?.reasoningEffort ?? "off";
			const levels = effortsForModel(directory, provider, model);
			if (!levels || levels.length <= 1) return null; // 无档位模型不显示

			const idx = Math.max(0, levels.indexOf(current));
			const onChange = useCallback((ev) => {
				const level = levels[Number(ev.target.value)];
				if (level && select) select({ provider, model, reasoningEffort: level });
			}, [levels, select, provider, model]);

			return jsxs("div", {
				className: "dsh-reasoning-slider",
				"aria-label": "推理强度",
				style: { display: "flex", alignItems: "center", gap: "8px", padding: "0 8px", height: "28px" },
				children: [
					jsx("span", {
						style: { fontSize: "12px", color: "var(--dsw-alias-label-caption)", whiteSpace: "nowrap" },
						children: "推理"
					}),
					jsx("input", {
						type: "range",
						min: 0,
						max: levels.length - 1,
						step: 1,
						value: idx,
						onChange,
						"aria-label": "推理强度滑动条",
						style: { accentColor: "var(--dsw-alias-state-accent, var(--dsw-alias-label-primary))" }
					}),
					jsx("span", {
						style: { fontSize: "12px", color: "var(--dsw-alias-label-secondary)", whiteSpace: "nowrap", minWidth: "28px" },
						children: LABEL[levels[idx]] ?? levels[idx]
					})
				]
			});
		}

		const inject = ["slots", "modelDirectories", "sessions"];

		function apply(ctx) {
			ctx.inject(["slots", "modelDirectories"], (scope) => {
				const { slots, modelDirectories } = scope;
				slots.inject("conversation.input.dock", () => slots.register({
					name: "conversation.input.dock",
					id: "reasoning-effort",
					order: 10,
					inject: (sessionId) => {
						const directory = modelDirectories.directoryFor(sessionId);
						return {
							directory,
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
