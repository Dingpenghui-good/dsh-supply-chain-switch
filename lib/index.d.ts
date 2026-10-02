import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
//#region src/index.d.ts
/** Cordis 插件名（用于 loader 诊断） */
declare const name = "supply-chain-switch";
/** 注入的服务（fs 为硬依赖；settings 为可选增强，未组合时降级为命令直写 yaml） */
declare const inject: readonly ["fs"];
/** settings 命名空间 = 本插件的 Loader 行 id（cordis.patch.yml 的 id）。 */
declare const SUPPLY_CHAIN_NAMESPACE = "supply-chain-switch";
/** 插件行 config（详情页可编辑字段；volatile → 保存即时生效、无需重启）。 */
interface PluginConfig {
  /** pnpm minimumReleaseAge（分钟）。0 = 宽松（允许刚发布包），1440 = 默认 24h 冷却。 */
  minimumReleaseAge: number;
  /** pnpm minimumReleaseAgeStrict：true = 无豁免、强制策略。 */
  minimumReleaseAgeStrict: boolean;
}
/**
 * 行 config 的 schema —— settings 框架据此把本行投影成详情页可编辑表单。
 *
 * 两个约束缺一不可：
 *   1. 导出名必须是 `Config`（宿主 Loader 识别 schema 的约定名）；缺失时
 *      该行在 `Config.listConfigs` 中为 `absent`。
 *   2. 可编辑字段必须标 `.volatile()` —— settings 框架只把 volatile 字段
 *      投影进表单（`volatileForm` / `isVolatilePath`），未标记的字段写入
 *      会被拒绝，详情页的控件也会是不可写的。
 * 字段用 `.default()` 声明出厂值（与 cordis.patch.yml 的 insert 行一致）。
 */
declare const Config: z<Schemastery.ObjectS<NoInfer<{
  minimumReleaseAge: z<number, number, "volatile-defined">;
  minimumReleaseAgeStrict: z<boolean, boolean, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
  minimumReleaseAge: z<number, number, "volatile-defined">;
  minimumReleaseAgeStrict: z<boolean, boolean, "volatile-defined">;
}>>, "plain">;
/**
 * 行 config 的默认值（与 cordis.patch.yml 的 insert 行 config 保持一致）。
 * 运行时依赖 `@deepseek-ai/schemastery` 由 DSH 运行时的共享解析表
 * （`<DSH_HOME>/profiles/node_modules`）提供，profile 安装的 bundle 可解析。
 */
declare const DEFAULT_CONFIG: PluginConfig;
/**
 * 应用插件到宿主 Context。
 *
 * - 启动即把 settings 行 config（期望值）同步一次进 pnpm-workspace.yaml；
 * - 轮询 effect（3s）持续感知 settings 变化（详情页保存 / 命令 update 都会
 *   经 settings 框架写回 cordis.patch.yml 并刷新 describe() 行值），
 *   把新值同步进 pnpm-workspace.yaml —— 无需重启 DSH 即对下一次 pnpm 安装生效；
 * - 保留 `/supply-chain` 命令：on/off 走 settings.update（与详情页同一事实
 *   来源），settings 缺失时降级为直接写 yaml；status 读 yaml 渲染。
 */
declare function apply(ctx: Context): void;
//#endregion
export { Config, DEFAULT_CONFIG, PluginConfig, SUPPLY_CHAIN_NAMESPACE, apply, inject, name };
//# sourceMappingURL=index.d.ts.map