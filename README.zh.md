# dsh-reasoning-effort-slider

[English](README.md) | 中文

DeepSeek Harness 客户端（web）bundle：在会话输入区（dock）注入一个 **推理强度滑动条**（Codex GPT-6 风格），当当前选中的模型声明了 reasoningEfforts 时显示。

- **per-session**：滑动只改当前会话的推理强度（调 `modelDirectories.directoryFor(session).select({provider,model,reasoningEffort})`），不影响别的会话。
- 档位按 harness 七级 off/minimal/low/medium/high/xhigh/max 排列，只显示该模型实际支持的档位。
- 仅一档或无档位的模型（如仅思考型 kimi-k3）不显示滑动条。
- 零构建工具：`lib/client.js` 直接写成 `window.__ModuleLoader__.load({id, factory})` 格式，用 `react/jsx-runtime` 的 jsx 手写，便于静态审计。

## 切换模型时保持推理强度

DSH 自身的模型选择器只在**同一个模型**上沿用 `reasoningEffort`；换模型时它改用目标模型的 `defaultEffort`，而路由没配 `reasoning` 时那就是 `undefined`。这个 `undefined` 不是「默认档」——在 qwen 方言下它等价于 **`enable_thinking: false`**，思考会被静默关掉（已用 mock fetch 抓到真实请求体确认）。

本插件为此做两件事：

1. **按模型记住**：每个模型最后一次明确选过的档位都记下来（`provider/model` → 档位）。
2. **换模型时挪档并写回**：把记下的档位挪到目标模型的档位梯上再提交，规则是
   - 精确命中 → 直接用；
   - 否则取**不高于**它的最近一档（前一个是 `max`、目标最高只有 `xhigh` → 就用 `xhigh`）；
   - 连更低的都没有 → 用目标模型的最低档。

   由于滑动条本就不显示 `off`，这条规则不会把「正在思考」静默降级成「不思考」。

若**从未**选过任何档位（全新状态），插件不擅自写回，而是显示灰色的「默认」，如实反映「未设定」。

## 安装

```bash
dsh plugin --profile web add dsh-reasoning-effort-slider
```

## 与百炼插件的关系

通用插件（任何声明 reasoningEfforts 的模型都生效），也可作为 `dsh-bailian-models` 的可选依赖一并安装。

## License

MIT
