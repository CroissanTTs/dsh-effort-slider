// dsh-reasoning-slider — 客户端 bundle（web）。
// window.__ModuleLoader__.load({id, factory}) 格式，手写 jsx。
// icon + 弹出方框设计：底栏只显示一个紧凑 icon（当前档位名），点击后上方弹出
// 小方框，方框内是 ChatGPT 风格胶囊滑动条（档位点 + 档位色 + xhigh 渐变 + max 流光）。
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

		const CSS_TAG = "dsh-reasoning-slider";
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
.dsh-rs-fill{position:absolute;left:-11px;top:0;bottom:0;border-radius:999px;background:var(--dsw-static-deepseek-100,#e4edfd)}
.dsh-rs-fill-back{width:calc(100% + 22px)}
.dsh-rs-fill-front{z-index:1;transition:width .3s ease}
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
			const storeIdx = levels ? Math.max(0, levels.findIndex((l) => l.id === current)) : 0;
			const idx = dragIdx ?? storeIdx;
			const n = levels ? levels.length : 0;
			const fillLevel = levels?.[idx]?.id ?? "";

			const prevLevelRef = useRef(fillLevel);
			useEffect(() => { prevLevelRef.current = fillLevel; }, [fillLevel]);

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

			if (!levels || n <= 1) return null;

			const pct = n <= 1 ? 0 : (idx / (n - 1)) * 100;
			const label = levels[idx]?.name ?? current ?? "";

			const onChange = useCallback((ev) => setDragIdx(Number(ev.target.value)), []);
			const commit = useCallback((ev) => {
				const level = levels[Number(ev.target.value)];
				setDragIdx(null);
				if (level && select) select({ provider, model, reasoningEffort: level.id });
			}, [levels, select, provider, model]);

			return jsxs("div", { className: "dsh-rsi", ref, children: [
				jsx("button", {
					type: "button",
					className: "dsh-rsi-btn",
					onClick: () => setOpen((o) => !o),
					"aria-label": `推理强度：${label}，点击调节`,
					children: [
						jsx("span", { className: "dsh-rsi-btnText", "data-level": fillLevel, style: fillLevel === "max" ? {} : { color: LEVEL_COLORS[fillLevel] || LEVEL_COLORS.low }, children: label })
					]
				}),
				open && jsxs("div", { className: "dsh-rsi-pop", children: [
					jsxs("div", { className: "dsh-rsi-popHeader", children: [
						jsx("span", { className: "dsh-rsi-popLabel", children: "推理强度" }),
						jsx("span", { className: "dsh-rsi-popValue", style: { color: LEVEL_COLORS[fillLevel] || LEVEL_COLORS.low }, children: label })
					]}),
					jsxs("div", { className: "dsh-rs-track", children: [
						jsxs("div", { className: "dsh-rs-range", children: [
							jsx("div", { className: "dsh-rs-fill dsh-rs-fill-back", "data-level": prevLevelRef.current }),
							jsx("div", { className: "dsh-rs-fill dsh-rs-fill-front", "data-level": fillLevel, style: { width: `calc(${pct}% + 22px)` } }),
							jsx("div", { className: "dsh-rs-dots", children: levels.map((l, i) => {
								const pos = n <= 1 ? 0 : (i / (n - 1)) * 100;
								return jsx("span", { key: l.id, className: `dsh-rs-dot${i <= idx ? " active" : ""}`, style: { left: `${pos}%` } });
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
		return module.exports;
	}
});
