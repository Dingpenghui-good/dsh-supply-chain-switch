import { Context } from "@deepseek-ai/cordis";
//#region src/index.d.ts
/** Cordis 插件名（用于 loader 诊断） */
declare const name = "supply-chain-switch";
/** 注入的服务 */
declare const inject: readonly ["fs"];
/**
 * 应用插件到宿主 Context。
 *
 * 注册 `/supply-chain` 命令，handler 在宿主进程内直接改写
 * pnpm-workspace.yaml，无需重启 DSH 即可对下一次 pnpm 安装生效。
 */
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, name };