import z from "@deepseek-ai/schemastery";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
//#region src/index.ts
/** Cordis 插件名（用于 loader 诊断） */
const name = "supply-chain-switch";
/** 注入的服务（fs 为硬依赖；settings 为可选增强，未组合时降级为命令直写 yaml） */
const inject = ["fs"];
/** settings 命名空间 = 本插件的 Loader 行 id（cordis.patch.yml 的 id）。 */
const SUPPLY_CHAIN_NAMESPACE = "supply-chain-switch";
/** DSH 默认 minimumReleaseAge（分钟）：24 小时 */
const DSH_DEFAULT_AGE_MINUTES = 1440;
/** 宽松模式下的 minimumReleaseAge：0（不设下限） */
const RELAXED_AGE_MINUTES = 0;
/** settings → yaml 同步轮询间隔（毫秒） */
const SYNC_INTERVAL_MS = 3e3;
/** 状态文件路径（profile 根目录下 .dsh-supply-chain-switch.json） */
const STATE_FILENAME = ".dsh-supply-chain-switch.json";
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
const Config = z.object({
	minimumReleaseAge: z.natural().default(DSH_DEFAULT_AGE_MINUTES).volatile(),
	minimumReleaseAgeStrict: z.boolean().default(true).volatile()
});
/**
* 行 config 的默认值（与 cordis.patch.yml 的 insert 行 config 保持一致）。
* 运行时依赖 `@deepseek-ai/schemastery` 由 DSH 运行时的共享解析表
* （`<DSH_HOME>/profiles/node_modules`）提供，profile 安装的 bundle 可解析。
*/
const DEFAULT_CONFIG = {
	minimumReleaseAge: DSH_DEFAULT_AGE_MINUTES,
	minimumReleaseAgeStrict: true
};
/** 查找 DSH profile 根目录。
*
* 插件被 pnpm link 安装到 <profile>/node_modules/@local/dsh-supply-chain-switch，
* 宿主进程加载时 __dirname（即本文件位置）= <profile>/node_modules/@local/
* dsh-supply-chain-switch/lib。向上 4 级到 profile 根目录：
*   lib → 包根 → @local → node_modules → profile
*
* 兜底：若解析结果里没有 pnpm-workspace.yaml（如开发目录直跑），
* 回退到 process.cwd()（DSH 宿主进程 cwd 通常是 profile 根）。
*/
function findProfileDir() {
	const here = dirname(fileURLToPath(import.meta.url));
	const candidate = join(here, "..", "..", "..", "..");
	if (existsSync(join(candidate, "pnpm-workspace.yaml"))) return candidate;
	return process.cwd();
}
function workspaceYamlPath() {
	return join(findProfileDir(), "pnpm-workspace.yaml");
}
function stateFilePath() {
	return join(findProfileDir(), STATE_FILENAME);
}
/** 读取当前 pnpm-workspace.yaml 内容 */
function readWorkspaceYaml() {
	const p = workspaceYamlPath();
	try {
		return readFileSync(p, "utf-8");
	} catch {
		return "packages:\n  - .\n";
	}
}
/** 判断期望值是否处于宽松模式 */
function isRelaxedMode(minimumReleaseAge, minimumReleaseAgeStrict) {
	return minimumReleaseAge === RELAXED_AGE_MINUTES;
}
/**
* 改写 pnpm-workspace.yaml 里的 minimumReleaseAge 相关字段。
* 使用简单的行级替换（不引入 yaml 解析依赖），保留其余内容不变。
*
* 匹配策略：
*   - `minimumReleaseAge: <number>` 整行替换
*   - `minimumReleaseAgeStrict: <bool>` 整行替换
*   - 若缺失则在文件末尾追加
*/
function patchYaml(content, minimumReleaseAge, minimumReleaseAgeStrict) {
	const lines = content.split(/\r?\n/);
	const out = [];
	let hasAge = false;
	let hasStrict = false;
	for (const line of lines) {
		const ageMatch = /^(\s*)minimumReleaseAge\s*:\s*/.exec(line);
		const strictMatch = /^(\s*)minimumReleaseAgeStrict\s*:\s*/.exec(line);
		if (ageMatch) {
			out.push(`${ageMatch[1]}minimumReleaseAge: ${minimumReleaseAge}`);
			hasAge = true;
		} else if (strictMatch) {
			out.push(`${strictMatch[1]}minimumReleaseAgeStrict: ${minimumReleaseAgeStrict}`);
			hasStrict = true;
		} else out.push(line);
	}
	if (!hasAge) out.push(`minimumReleaseAge: ${minimumReleaseAge}`);
	if (!hasStrict) out.push(`minimumReleaseAgeStrict: ${minimumReleaseAgeStrict}`);
	return out.join("\n");
}
/** 写入 state 文件 */
function writeState(relaxed) {
	const state = {
		relaxed,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	writeFileSync(stateFilePath(), JSON.stringify(state, null, 2) + "\n");
}
/** 读取 state 文件 */
function readState() {
	try {
		const raw = readFileSync(stateFilePath(), "utf-8");
		return JSON.parse(raw);
	} catch {
		return;
	}
}
/** 判断当前是否处于宽松模式（从 yaml 内容推断） */
function isRelaxedFromYaml(yaml) {
	const m = /^minimumReleaseAge\s*:\s*(\d+)\s*$/m.exec(yaml);
	if (m === null) return false;
	return Number(m[1]) === 0;
}
/** 渲染状态文本 */
function renderStatus(state, yaml) {
	const relaxed = isRelaxedFromYaml(yaml);
	const lines = [
		"## DSH Supply-Chain Switch 状态",
		"",
		`**当前模式**：${relaxed ? "✅ 宽松（允许刚发布的 npm 包）" : "🔒 默认（24h 冷却）"}`,
		"",
		`- minimumReleaseAge: ${relaxed ? "0" : "1440 分钟（24h）"}`,
		`- minimumReleaseAgeStrict: ${relaxed ? "false" : "true"}`
	];
	if (state !== void 0) lines.push(`- 最后修改：${state.updatedAt}（relaxed=${state.relaxed}）`);
	lines.push("");
	lines.push("**说明**：");
	lines.push("- 宽松模式适用于安装刚发布、尚未过 24h 供应链冷却期的 npm 包；");
	lines.push("- 默认模式是 DSH 内置的 24h 冷却策略，防止安装被污染的包。");
	lines.push("- 也可在插件详情页的「宽松模式」开关中切换。");
	return lines.join("\n");
}
/** 从 settings 行值读取期望的 (age, strict)；缺省为默认 1440/true。
*  每次调用都重读 describe()（settings 保存后行值即时刷新），
*  轮询周期内感知详情页 / 命令的切换。 */
function readExpected(settings) {
	if (settings === void 0) return {
		age: DSH_DEFAULT_AGE_MINUTES,
		strict: true
	};
	try {
		const v = settings.describe().find((r) => r.ns === SUPPLY_CHAIN_NAMESPACE)?.value;
		return {
			age: typeof v?.minimumReleaseAge === "number" ? v.minimumReleaseAge : DSH_DEFAULT_AGE_MINUTES,
			strict: typeof v?.minimumReleaseAgeStrict === "boolean" ? v.minimumReleaseAgeStrict : true
		};
	} catch {
		return {
			age: DSH_DEFAULT_AGE_MINUTES,
			strict: true
		};
	}
}
/**
* 把期望值（settings 行 config）同步进 pnpm-workspace.yaml + 状态文件。
* 仅在 yaml 实际变化时写盘，避免无谓 IO。
*/
function syncYaml(age, strict) {
	const current = readWorkspaceYaml();
	const next = patchYaml(current, age, strict);
	if (next === current) return false;
	writeFileSync(workspaceYamlPath(), next, "utf-8");
	writeState(isRelaxedMode(age, strict));
	return true;
}
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
function apply(ctx) {
	const settings = ctx.get("settings");
	/**
	* 命令 on/off 降级直写 yaml 后的内存覆盖标记：宿主未组合 settings 时，
	* 轮询 effect 的 readExpected 会按默认 1440/true 同步、把命令写入拉回
	* 默认 —— 有标记时轮询按「yaml 当前值」同步（跳过，避免冲突）。
	*/
	let commandOverrideRelaxed;
	ctx.effect(() => {
		const timer = setInterval(() => {
			let age;
			let strict;
			if (commandOverrideRelaxed !== void 0) {
				const yaml = readWorkspaceYaml();
				age = isRelaxedFromYaml(yaml) ? RELAXED_AGE_MINUTES : DSH_DEFAULT_AGE_MINUTES;
				strict = !isRelaxedFromYaml(yaml);
			} else ({age, strict} = readExpected(settings));
			try {
				syncYaml(age, strict);
			} catch (err) {
				ctx.logger?.warn?.(`supply-chain-switch: settings → pnpm-workspace.yaml sync failed: ${String(err)}`);
			}
		}, SYNC_INTERVAL_MS);
		return () => clearInterval(timer);
	}, "supply-chain-switch: settings → pnpm-workspace.yaml sync");
	const initial = readExpected(settings);
	syncYaml(initial.age, initial.strict);
	/** 宿主 commands 服务（缺失时命令入口降级，详情页仍可切换） */
	const commands = ctx.get("commands");
	if (commands === void 0) {
		ctx.logger?.warn?.("supply-chain-switch: commands service not available; /supply-chain not registered");
		return;
	}
	const register = commands.register({
		name: "supply-chain",
		description: "切换 DSH supply-chain（minimumReleaseAge）策略：on=宽松（可装刚发布包）/ off=默认 24h 冷却 / status=查看",
		input: { hint: "on | off | status（默认 status）" },
		handler(invocation) {
			const raw = invocation.rawInput.trim().toLowerCase();
			const mode = raw === "" || raw === "status" ? "status" : raw === "on" || raw === "off" ? raw : "status";
			if (mode === "status") {
				const current = readWorkspaceYaml();
				return {
					kind: "success",
					text: renderStatus(readState(), current)
				};
			}
			const relaxed = mode === "on";
			const age = relaxed ? RELAXED_AGE_MINUTES : DSH_DEFAULT_AGE_MINUTES;
			const strict = !relaxed;
			const patch = {
				minimumReleaseAge: age,
				minimumReleaseAgeStrict: strict
			};
			if (settings !== void 0) settings.update(SUPPLY_CHAIN_NAMESPACE, patch).then(() => {
				const { age, strict } = readExpected(settings);
				syncYaml(age, strict);
			}).catch((err) => {
				ctx.logger?.warn?.(`supply-chain-switch: settings.update failed, falling back to direct yaml write: ${String(err)}`);
				syncYaml(age, strict);
				commandOverrideRelaxed = relaxed;
			});
			else {
				syncYaml(age, strict);
				commandOverrideRelaxed = relaxed;
			}
			return {
				kind: "success",
				text: relaxed ? `✅ Supply-chain 策略已切换为**宽松模式**（minimumReleaseAge=0）。现在可以安装刚发布、尚未过 24h 冷却期的 npm 包。已写入：\`${workspaceYamlPath()}\`` : "🔒 Supply-chain 策略已恢复**默认模式**（minimumReleaseAge=1440 分钟 / 24h 冷却）。刚发布的 npm 包将被拒绝，直到发布满 24 小时。"
			};
		}
	});
	ctx.effect(() => register(), "supply-chain-switch: /supply-chain command");
}
//#endregion
export { Config, DEFAULT_CONFIG, SUPPLY_CHAIN_NAMESPACE, apply, inject, name };

//# sourceMappingURL=index.js.map