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

		const CSS_TAG = "dsh-reasoning-slider";
		const CSS = `
.dsh-rsi{position:relative;flex:none;display:flex;align-items:center;height:28px}
.dsh-rsi-btn{display:flex;align-items:center;gap:5px;height:26px;padding:0 10px;border:none;border-radius:13px;background:var(--dsw-alias-interactive-bg-hover);cursor:pointer;font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary);white-space:nowrap;transition:background .12s}
.dsh-rsi-btn:hover{background:var(--dsw-alias-border-l2)}
.dsh-rsi-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-business-primary);flex:none;transition:background .25s}
.dsh-rsi-dot[data-level="xhigh"]{background:linear-gradient(135deg,var(--dsw-alias-label-primary),var(--dsw-alias-state-accent,var(--dsw-alias-label-primary)))}
.dsh-rsi-dot[data-level="max"]{background:linear-gradient(135deg,var(--dsw-alias-label-primary),var(--dsw-alias-state-accent,var(--dsw-alias-label-primary)),var(--dsw-alias-label-primary));background-size:200% 200%;animation:dsh-rs-shimmer 1.8s linear infinite}
.dsh-rsi-pop{position:absolute;bottom:calc(100% + 8px);left:0;z-index:1100;background:var(--dsw-specific-menu,var(--dsw-alias-bg-module-platform));border:1px solid var(--dsw-alias-border-l1);border-radius:14px;box-shadow:0 4px 16px rgba(0,0,0,.18);padding:14px 16px;display:flex;flex-direction:column;gap:10px;min-width:200px}
.dsh-rsi-popLabel{font-size:11px;color:var(--dsw-alias-label-caption);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
.dsh-rs-track{position:relative;width:100%;flex:none;height:14px;border-radius:999px;background:var(--dsw-alias-border-l2);overflow:hidden;touch-action:none}
.dsh-rs-range{position:absolute;left:7px;right:7px;top:0;bottom:0}
.dsh-rs-fill{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:var(--dsw-alias-state-business-primary);transition:width .15s ease,background .25s ease}
.dsh-rs-fill[data-level="xhigh"]{background:linear-gradient(90deg,var(--dsw-alias-state-business-primary),var(--dsw-alias-state-accent,var(--dsw-alias-state-business-primary)))}
.dsh-rs-fill[data-level="max"]{background:linear-gradient(90deg,var(--dsw-alias-state-business-primary),var(--dsw-alias-state-accent,var(--dsw-alias-state-business-primary)),var(--dsw-alias-state-business-primary));background-size:200% 100%;animation:dsh-rs-shimmer 1.8s linear infinite}
@keyframes dsh-rs-shimmer{to{background-position:-200% 0}}
.dsh-rs-dots{position:absolute;inset:0;pointer-events:none}
.dsh-rs-dot{position:absolute;top:50%;transform:translate(-50%,-50%);width:3px;height:3px;border-radius:50%;background:var(--dsw-alias-border-l3)}
.dsh-rs-dot.active{background:var(--dsw-alias-state-business-primary-invert,var(--dsw-alias-bg-module-platform))}
.dsh-rs-thumb{position:absolute;left:0;top:50%;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-state-business-primary);box-shadow:0 1px 3px rgba(0,0,0,.3);transform:translate(-50%,-50%);transition:left .15s ease;pointer-events:none}
.dsh-rs-input{position:absolute;inset:0;width:100%;height:100%;margin:0;cursor:pointer;opacity:0}
.dsh-rsi-current{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);text-align:center}`;
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

			const sel = snap?.current;
			const provider = sel?.provider;
			const model = sel?.model;
			const current = sel?.reasoningEffort;
			const levels = effortsForModel(store, provider, model);
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

			return jsxs("div", { className: "dsh-rsi", ref, children: [
				jsx("button", {
					type: "button",
					className: "dsh-rsi-btn",
					onClick: () => setOpen((o) => !o),
					"aria-label": `推理强度：${label}，点击调节`,
					children: [
						jsx("span", { className: "dsh-rsi-dot", "data-level": fillLevel }),
						jsx("span", { children: label })
					]
				}),
				open && jsxs("div", { className: "dsh-rsi-pop", children: [
					jsx("span", { className: "dsh-rsi-popLabel", children: "推理强度" }),
					jsxs("div", { className: "dsh-rs-track", children: [
						jsxs("div", { className: "dsh-rs-range", children: [
							jsx("div", { className: "dsh-rs-fill", "data-level": fillLevel, style: { width: `calc(${pct}% + 7px)` } }),
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
					]}),
					jsx("span", { className: "dsh-rsi-current", children: label })
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
