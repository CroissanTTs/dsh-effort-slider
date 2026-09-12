/**
 * dsh-reasoning-slider — 服务端入口（无操作）。
 *
 * 真正的 UI 在客户端 bundle lib/client.js（window.__ModuleLoader__.load 格式）。
 * 这个服务端入口存在的唯一目的：让 cordis 把本包作为激活插件入口挂载，
 * dsh-client-modules 才会扫描到它的 dsh.client 声明并装载客户端 bundle。
 * apply 是无操作——UI 注册全在客户端 apply 里。
 *
 * @module dsh-reasoning-slider
 */
const name = "reasoning-slider";
const inject = [];
function apply() { /* no-op: UI registration lives in the client bundle */ }

export { apply, inject, name };
