# dsh-effort-slider

[English](README.md) | 中文

DeepSeek Harness 客户端（web）bundle：在会话输入区（dock）注入一个 **推理强度滑动条**（Codex GPT-6 风格），当当前选中的模型声明了 reasoningEfforts 时显示。

- **per-session**：滑动只改当前会话的推理强度（调 `modelDirectories.directoryFor(session).select({provider,model,reasoningEffort})`），不影响别的会话。
- 档位按 harness 七级 off/minimal/low/medium/high/xhigh/max 排列，只显示该模型实际支持的档位。
- 仅一档或无档位的模型（如仅思考型 kimi-k3）不显示滑动条。
- 零构建工具：`lib/client.js` 直接写成 `window.__ModuleLoader__.load({id, factory})` 格式，用 `react/jsx-runtime` 的 jsx 手写，便于静态审计。

## 安装

```bash
dsh plugin --profile web add dsh-effort-slider
```

## 与百炼插件的关系

通用插件（任何声明 reasoningEfforts 的模型都生效），也可作为 `dsh-bailian-models` 的可选依赖一并安装。

## License

MIT
