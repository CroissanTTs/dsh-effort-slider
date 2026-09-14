// dsh-effort-slider — 客户端 bundle（web）。
// window.__ModuleLoader__.load({id, factory}) 格式，手写 jsx。
// icon + 弹出方框设计：底栏只显示一个紧凑 icon（当前档位名），点击后上方弹出
// 小方框，方框内是 ChatGPT 风格胶囊滑动条（档位点 + 档位色 + xhigh 渐变 + max 流光）。
// 拖动期间本地态驱动 UI，松手（onPointerUp/onKeyUp）才提交 directory.select。
window.__ModuleLoader__.load({
	id: "dsh-effort-slider",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let jsx = require("react/jsx-runtime").jsx;
		let jsxs = require("react/jsx-runtime").jsxs;

		const { useEffect, useState, useCallback, useRef } = react;

		const LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

		// 每个档位的专属颜色（蓝→紫→品红渐进），用于档位名 + icon 状态点；小球始终蓝色。
		const LEVEL_COLORS = {
			off: "#94a3b8",
			minimal: "#60a5fa",
			low: "#4176e6",
			medium: "#6366f1",
			high: "#8b5cf6",
			xhigh: "#a855f7",
			max: "#d946ef",
		};

		const CSS_TAG = "dsh-effort-slider";
		const CSS = `
.dsh-rsi{position:relative;flex:none;display:flex;align-items:center;height:28px}
.dsh-rsi-btn{display:flex;align-items:center;gap:5px;height:26px;padding:0 10px;border:none;border-radius:13px;background:var(--dsw-alias-interactive-bg-hover);cursor:pointer;font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary);white-space:nowrap;transition:background .12s}
.dsh-rsi-btn:hover{background:var(--dsw-alias-border-l2)}
.dsh-rsi-btnText{font-weight:600;white-space:nowrap}
.dsh-rsi-btnText[data-level="max"]{background:linear-gradient(90deg,#a855f7,#d946ef);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
.dsh-rsi-pop{position:absolute;bottom:calc(100% + 8px);left:0;z-index:1100;background:var(--dsw-specific-menu,var(--dsw-alias-bg-module-platform));border:1px solid var(--dsw-alias-border-l1);border-radius:14px;box-shadow:0 4px 16px rgba(0,0,0,.18);padding:12px 14px;display:flex;flex-direction:column;gap:10px;min-width:220px}
.dsh-rsi-popHeader{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.dsh-rsi-popLabel{font-size:11px;color:var(--dsw-alias-label-caption);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
.dsh-rsi-popValue{font-size:12px;font-weight:600;color:var(--dsw-alias-state-business-primary);white-space:nowrap}
.dsh-rs-track{position:relative;width:100%;flex:none;height:22px;border-radius:999px;background:var(--dsw-alias-border-l2);touch-action:none}
.dsh-rs-range{position:absolute;left:11px;right:11px;top:0;bottom:0}
.dsh-rs-fill{position:absolute;left:-11px;top:0;bottom:0;border-radius:999px;background:var(--dsw-static-deepseek-100,#e4edfd);transition:width .2s ease,background-color .3s ease}
.dsh-rs-fill[data-level="xhigh"]{background:#a855f7}
.dsh-rs-fill[data-level="max"]{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='10'%3E%3Cpath d='M14 0L15 4L19 5L15 6L14 10L13 6L9 5L13 4Z' fill='white'/%3E%3C/svg%3E") 0 0/28px 10px repeat-x,url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='10'%3E%3Cpath d='M14 0L15 4L19 5L15 6L14 10L13 6L9 5L13 4Z' fill='white'/%3E%3C/svg%3E") 14px 12px/28px 10px repeat-x,linear-gradient(90deg,#a855f7,#d946ef,#a855f7);background-size:28px 10px,28px 10px,200% 100%;animation:dsh-rs-stars 2s linear infinite}
@keyframes dsh-rs-stars{to{background-position:-28px 0,-14px 12px,-200% 0}}
.dsh-rs-dots{position:absolute;inset:0;pointer-events:none}
.dsh-rs-dot{position:absolute;top:50%;transform:translate(-50%,-50%);width:4px;height:4px;border-radius:50%;background:var(--dsw-alias-border-l3)}
.dsh-rs-dot.active{background:var(--dsw-alias-state-business-primary)}
.dsh-rs-thumb{position:absolute;left:0;top:50%;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle at 32% 30%,var(--dsw-static-deepseek-400,#679efe),var(--dsw-alias-state-business-primary,#4176e6));box-shadow:0 0 0 2px var(--dsw-alias-state-business-primary,#4176e6),0 1px 4px rgba(0,0,0,.28);transform:translate(-50%,-50%);transition:left .15s ease;pointer-events:none}
.dsh-rs-input{position:absolute;inset:0;width:100%;height:100%;margin:0;cursor:pointer;opacity:0}
/* 隐藏官方模型选择器里的推理强度控件——滑动条是唯一的调节入口。
   triggerEffort 用属性选择器（跨版本稳定）；cell 用当前构建哈希（版本特定，升级 DSH 后可能需更新）。 */
[class*="triggerEffort"]{display:none}
.Ns6z9q_cell{display:none}`;
		if (typeof document !== "undefined") {
			let tag = document.querySelector(`style[data-plugin-css="${CSS_TAG}"]`);
			if (tag === null) {
				tag = document.createElement("style");
				tag.dataset.pluginCss = CSS_TAG;
				document.head.appendChild(tag);
			}
			tag.textContent = CSS;
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
			const ordered = LEVELS.map((l) => byId.get(l)).filter(Boolean).filter((e) => e.id !== "off");
			return ordered.length > 0 ? ordered : null;
		}

		/** 每个模型最后一次明确选过的档位（"provider/model" → levelId），以及最近一次的全局选择。 */
		const effortMemory = new Map();
		let lastEffort;

		/**
		 * 把前一个模型的档位挪到目标模型的档位梯上：精确命中就用它，否则取**不高于**
		 * 它的最近一档（前一个是 max、目标最高只有 xhigh 时就得 xhigh），连更低的都
		 * 没有才退回最低档。
		 *
		 * `levels` 已剔除 off，所以「不主动跳进不思考」是天然成立的：前一个是 off 时
		 * 循环找不到更低的思考档，直接落到目标的最低思考档。
		 */
		function clampEffort(previous, levels) {
			if (previous === undefined || !Array.isArray(levels) || levels.length === 0) return undefined;
			const ids = levels.map((l) => l.id);
			if (ids.includes(previous)) return previous;
			for (let i = LEVELS.indexOf(previous); i >= 0; i -= 1) {
				if (ids.includes(LEVELS[i])) return LEVELS[i];
			}
			return ids[0];
		}

		function ReasoningSlider({ store, select }) {
			const [snap, setSnap] = useState(() => typeof store?.getSnapshot === "function" ? store.getSnapshot() : undefined);
			const [open, setOpen] = useState(false);
			const [dragIdx, setDragIdx] = useState(null);
			const ref = useRef(null);

			const sel = snap?.current;
			const provider = sel?.provider;
			const model = sel?.model;
			const current = sel?.reasoningEffort;
			const levels = effortsForModel(store, provider, model);
			const modelKey = provider && model ? `${provider}/${model}` : undefined;
			/** 档位 id 串：effect 的稳定依赖，避免 levels 每次渲染换新数组导致空跑。 */
			const levelIds = levels ? levels.map((l) => l.id).join(",") : "";
			/** 本次「档位为空」的窗口里是否已经尝试过补写，防止 select 失败时反复重试。 */
			const carriedRef = useRef(undefined);

			// 切换模型时 DSH 会清空 reasoningEffort（`selectionOf` 只在同一个模型上沿用），
			// 而「档位未设」在 qwen 方言下等价于 enable_thinking:false —— 思考被静默关掉。
			// 所以按模型记住上次的选择，换模型时把它挪到目标模型的梯上再写回去。
			useEffect(() => {
				if (!modelKey || !levels || !select) return;
				if (current !== undefined) {
					effortMemory.set(modelKey, current);
					lastEffort = current;
					carriedRef.current = undefined;
					return;
				}
				if (carriedRef.current === modelKey) return;
				carriedRef.current = modelKey;
				const want = clampEffort(effortMemory.get(modelKey) ?? lastEffort, levels);
				if (want === undefined) return;
				select({ provider, model, reasoningEffort: want });
			}, [modelKey, current, levelIds, select, provider, model]);

			useEffect(() => {
				if (typeof store?.subscribe !== "function") return;
				let active = true;
				const stop = store.subscribe(() => {
					if (active) setSnap(typeof store.getSnapshot === "function" ? store.getSnapshot() : undefined);
				});
				return () => { active = false; stop?.(); };
			}, [store]);

			// 点击外部关闭弹出方框。
			useEffect(() => {
				if (!open) return;
				const handler = (ev) => {
					if (ref.current && !ref.current.contains(ev.target)) setOpen(false);
				};
				document.addEventListener("pointerdown", handler);
				return () => document.removeEventListener("pointerdown", handler);
			}, [open]);

			if (!levels || levels.length <= 1) return null;

			// 待补写的过渡帧里也要显示正确档位：store 还没带上 reasoningEffort 时，
			// 先用记忆里挪过来的档位，而不是掉到 index 0（那正是「换模型显示成
			// Minimal、实际却关掉思考」的来源）。真的无从沿用才显示「默认」。
			const effective = current ?? clampEffort(effortMemory.get(modelKey) ?? lastEffort, levels);
			const unset = effective === undefined;
			const storeIdx = unset ? 0 : Math.max(0, levels.findIndex((l) => l.id === effective));
			const idx = dragIdx ?? storeIdx;
			const n = levels.length;
			const pct = n <= 1 ? 0 : (idx / (n - 1)) * 100;
			const label = unset ? "默认" : levels[idx]?.name ?? effective ?? "";
			const fillLevel = unset ? "" : levels[idx]?.id ?? "";
			const labelColor = unset ? LEVEL_COLORS.off : LEVEL_COLORS[fillLevel] || LEVEL_COLORS.low;

			const onChange = useCallback((ev) => setDragIdx(Number(ev.target.value)), []);
			const commit = useCallback((ev) => {
				const level = levels[Number(ev.target.value)];
				setDragIdx(null);
				if (!level || !select) return;
				if (modelKey) {
					effortMemory.set(modelKey, level.id);
					lastEffort = level.id;
				}
				select({ provider, model, reasoningEffort: level.id });
			}, [levels, select, provider, model, modelKey]);

			return jsxs("div", { className: "dsh-rsi", ref, children: [
				jsx("button", {
					type: "button",
					className: "dsh-rsi-btn",
					onClick: () => setOpen((o) => !o),
					"aria-label": `推理强度：${label}，点击调节`,
					children: [
						jsx("span", { className: "dsh-rsi-btnText", "data-level": fillLevel, style: fillLevel === "max" ? {} : { color: labelColor }, children: label })
					]
				}),
				open && jsxs("div", { className: "dsh-rsi-pop", children: [
					jsxs("div", { className: "dsh-rsi-popHeader", children: [
						jsx("span", { className: "dsh-rsi-popLabel", children: "推理强度" }),
						jsx("span", { className: "dsh-rsi-popValue", style: { color: labelColor }, children: label })
					]}),
					jsxs("div", { className: "dsh-rs-track", children: [
						jsxs("div", { className: "dsh-rs-range", children: [
							jsx("div", { className: "dsh-rs-fill", "data-level": fillLevel, style: { width: `calc(${pct}% + 22px)` } }),
							jsx("div", { className: "dsh-rs-dots", children: levels.map((l, i) => {
								const pos = n <= 1 ? 0 : (i / (n - 1)) * 100;
								return jsx("span", { key: l.id, className: `dsh-rs-dot${!unset && i <= idx ? " active" : ""}`, style: { left: `${pos}%` } });
							}) }),
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
					]})
				]})
			] });
		}

		const inject = ["slots", "modelDirectories", "sessions", "remote", "remote.session", "conversation"];

		function apply(ctx) {
			ctx.inject(["slots", "modelDirectories"], (scope) => {
				const { slots, modelDirectories } = scope;
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
		/** 暴露给 scripts/test.mjs 直接验证挪档规则（对宿主无副作用）。 */
		exports.clampEffort = clampEffort;
		return module.exports;
	}
});
