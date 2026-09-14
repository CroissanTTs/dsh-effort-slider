# dsh-effort-slider

English | [中文](README.zh.md)

A DeepSeek Harness client (web) bundle that injects a **reasoning-effort slider** (Codex GPT-6 style) into the conversation input dock, shown when the selected model declares reasoning effort levels.

- **Per-session**: sliding only changes the current session's effort (calls `modelDirectories.directoryFor(session).select({provider,model,reasoningEffort})`); other sessions are unaffected.
- Levels ordered along the harness seven-step off/minimal/low/medium/high/xhigh/max; only the levels the selected model supports are shown.
- Models with one or zero levels (e.g. always-thinking kimi-k3) hide the slider.
- Zero build tooling: `lib/client.js` is written directly in `window.__ModuleLoader__.load({id, factory})` form using `react/jsx-runtime` jsx, for easy static audit.

## Keeping the effort across model switches

DSH's own model picker only carries `reasoningEffort` over when you re-pick the **same** model; switching models falls back to the target model's `defaultEffort`, which is `undefined` when the route configures no `reasoning`. That `undefined` is not "the default level": under the `qwen` dialect it is equivalent to **`enable_thinking: false`**, so thinking is silently turned off (verified by capturing the real request body with a mock fetch).

This plugin therefore does two things:

1. **Remembers per model**: the last level you explicitly picked for each model (`provider/model` → level).
2. **Carries it over and writes it back** on a model switch, clamping to the target model's ladder:
   - exact match → keep it;
   - otherwise the nearest level **at or below** (previous `max`, target tops out at `xhigh` → use `xhigh`);
   - nothing lower → the target's lowest level.

   Since the slider never shows `off`, this rule cannot silently demote "thinking" to "not thinking".

If you have **never** picked a level (fresh state), the plugin writes nothing and shows a grey "默认" instead, honestly reflecting "unset".

## Install

```bash
dsh plugin --profile web add dsh-effort-slider
```

## Relation to the Bailian plugin

General-purpose (any model declaring reasoningEfforts); can also be an optional dependency of `dsh-bailian-models`.

## License

MIT
