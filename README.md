# dsh-effort-slider

English | [中文](README.zh.md)

A DeepSeek Harness client (web) bundle that injects a **reasoning-effort slider** (Codex GPT-6 style) into the conversation input dock, shown when the selected model declares reasoning effort levels.

- **Per-session**: sliding only changes the current session's effort (calls `modelDirectories.directoryFor(session).select({provider,model,reasoningEffort})`); other sessions are unaffected.
- Levels ordered along the harness seven-step off/minimal/low/medium/high/xhigh/max; only the levels the selected model supports are shown.
- Models with one or zero levels (e.g. always-thinking kimi-k3) hide the slider.
- Zero build tooling: `lib/client.js` is written directly in `window.__ModuleLoader__.load({id, factory})` form using `react/jsx-runtime` jsx, for easy static audit.

## Install

```bash
dsh plugin --profile web add dsh-effort-slider
```

## Relation to the Bailian plugin

General-purpose (any model declaring reasoningEfforts); can also be an optional dependency of `dsh-bailian-models`.

## License

MIT
