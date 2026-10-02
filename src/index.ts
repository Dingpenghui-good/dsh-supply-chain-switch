/**
 * DSH Supply-Chain Switch — 随时开关 DSH 的 minimumReleaseAge 供应链策略。
 *
 * 操作入口（两种，行为一致）：
 *   1. 插件详情页（推荐）：点击插件名打开，一个「宽松模式」开关 + 保存。
 *      保存后经宿主 settings 框架写回 cordis.patch.yml 的行 config，
 *      本插件的轮询 effect 感知变化并改写 pnpm-workspace.yaml。
 *   2. `/supply-chain` 斜杠命令（保留）：
 *      /supply-chain on     — 宽松：minimumReleaseAge=0，允许安装刚发布的 npm 包
 *      /supply-chain off    — 默认：minimumReleaseAge=1440（24h），恢复 DSH 默认策略
 *      /supply-chain status — 查看当前策略状态
 *
 * 实现原理：profile 的 pnpm-workspace.yaml 是 pnpm 安装时读取的唯一事实来源。
 * 本插件把 settings 行 config（minimumReleaseAge / minimumReleaseAgeStrict）
 * 作为期望值，周期性同步进 pnpm-workspace.yaml（行级替换，不引入 yaml 依赖），
 * 并把状态记录到 profile 根目录的 .dsh-supply-chain-switch.json。
 *
 * @module dsh-supply-chain-switch
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/** Cordis 插件名（用于 loader 诊断） */
export const name = 'supply-chain-switch'

/** 注入的服务（fs 为硬依赖；settings 为可选增强，未组合时降级为命令直写 yaml） */
export const inject = ['fs'] as const

/** settings 命名空间 = 本插件的 Loader 行 id（cordis.patch.yml 的 id）。 */
export const SUPPLY_CHAIN_NAMESPACE = 'supply-chain-switch'

/** DSH 默认 minimumReleaseAge（分钟）：24 小时 */
const DSH_DEFAULT_AGE_MINUTES = 1440

/** 宽松模式下的 minimumReleaseAge：0（不设下限） */
const RELAXED_AGE_MINUTES = 0

/** settings → yaml 同步轮询间隔（毫秒） */
const SYNC_INTERVAL_MS = 3000

/** 状态文件路径（profile 根目录下 .dsh-supply-chain-switch.json） */
const STATE_FILENAME = '.dsh-supply-chain-switch.json'

/** 插件行 config（详情页可编辑字段；volatile → 保存即时生效、无需重启）。 */
export interface PluginConfig {
  /** pnpm minimumReleaseAge（分钟）。0 = 宽松（允许刚发布包），1440 = 默认 24h 冷却。 */
  minimumReleaseAge: number
  /** pnpm minimumReleaseAgeStrict：true = 无豁免、强制策略。 */
  minimumReleaseAgeStrict: boolean
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
export const Config = z.object({
  minimumReleaseAge: z.natural().default(DSH_DEFAULT_AGE_MINUTES).volatile(),
  minimumReleaseAgeStrict: z.boolean().default(true).volatile(),
})

/**
 * 行 config 的默认值（与 cordis.patch.yml 的 insert 行 config 保持一致）。
 * 运行时依赖 `@deepseek-ai/schemastery` 由 DSH 运行时的共享解析表
 * （`<DSH_HOME>/profiles/node_modules`）提供，profile 安装的 bundle 可解析。
 */
export const DEFAULT_CONFIG: PluginConfig = {
  minimumReleaseAge: DSH_DEFAULT_AGE_MINUTES,
  minimumReleaseAgeStrict: true,
}

/** 状态记录 */
interface SwitchState {
  /** 当前是否处于宽松模式 */
  relaxed: boolean
  /** 最后修改时间（ISO） */
  updatedAt: string
}

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
function findProfileDir(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidate = join(here, '..', '..', '..', '..')
  if (existsSync(join(candidate, 'pnpm-workspace.yaml'))) return candidate
  return process.cwd()
}

function workspaceYamlPath(): string {
  return join(findProfileDir(), 'pnpm-workspace.yaml')
}

function stateFilePath(): string {
  return join(findProfileDir(), STATE_FILENAME)
}

/** 读取当前 pnpm-workspace.yaml 内容 */
function readWorkspaceYaml(): string {
  const p = workspaceYamlPath()
  try {
    return readFileSync(p, 'utf-8')
  } catch {
    // 文件不存在时返回最小骨架
    return 'packages:\n  - .\n'
  }
}

/** 判断期望值是否处于宽松模式 */
function isRelaxedMode(minimumReleaseAge: number, minimumReleaseAgeStrict: boolean): boolean {
  return minimumReleaseAge === RELAXED_AGE_MINUTES
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
function patchYaml(content: string, minimumReleaseAge: number, minimumReleaseAgeStrict: boolean): string {
  const lines = content.split(/\r?\n/)
  const out: string[] = []
  let hasAge = false
  let hasStrict = false

  for (const line of lines) {
    const ageMatch = /^(\s*)minimumReleaseAge\s*:\s*/.exec(line)
    const strictMatch = /^(\s*)minimumReleaseAgeStrict\s*:\s*/.exec(line)
    if (ageMatch) {
      out.push(`${ageMatch[1]}minimumReleaseAge: ${minimumReleaseAge}`)
      hasAge = true
    } else if (strictMatch) {
      out.push(`${strictMatch[1]}minimumReleaseAgeStrict: ${minimumReleaseAgeStrict}`)
      hasStrict = true
    } else {
      out.push(line)
    }
  }

  if (!hasAge) out.push(`minimumReleaseAge: ${minimumReleaseAge}`)
  if (!hasStrict) out.push(`minimumReleaseAgeStrict: ${minimumReleaseAgeStrict}`)

  return out.join('\n')
}

/** 写入 state 文件 */
function writeState(relaxed: boolean): void {
  const state: SwitchState = { relaxed, updatedAt: new Date().toISOString() }
  writeFileSync(stateFilePath(), JSON.stringify(state, null, 2) + '\n')
}

/** 读取 state 文件 */
function readState(): SwitchState | undefined {
  try {
    const raw = readFileSync(stateFilePath(), 'utf-8')
    return JSON.parse(raw) as SwitchState
  } catch {
    return undefined
  }
}

/** 判断当前是否处于宽松模式（从 yaml 内容推断） */
function isRelaxedFromYaml(yaml: string): boolean {
  const m = /^minimumReleaseAge\s*:\s*(\d+)\s*$/m.exec(yaml)
  if (m === null) return false
  return Number(m[1]) === 0
}

/** 渲染状态文本 */
function renderStatus(state: SwitchState | undefined, yaml: string): string {
  const relaxed = isRelaxedFromYaml(yaml)
  const lines = [
    '## DSH Supply-Chain Switch 状态',
    '',
    `**当前模式**：${relaxed ? '✅ 宽松（允许刚发布的 npm 包）' : '🔒 默认（24h 冷却）'}`,
    '',
    `- minimumReleaseAge: ${relaxed ? '0' : '1440 分钟（24h）'}`,
    `- minimumReleaseAgeStrict: ${relaxed ? 'false' : 'true'}`,
  ]
  if (state !== undefined) {
    lines.push(`- 最后修改：${state.updatedAt}（relaxed=${state.relaxed}）`)
  }
  lines.push('')
  lines.push('**说明**：')
  lines.push('- 宽松模式适用于安装刚发布、尚未过 24h 供应链冷却期的 npm 包；')
  lines.push('- 默认模式是 DSH 内置的 24h 冷却策略，防止安装被污染的包。')
  lines.push('- 也可在插件详情页的「宽松模式」开关中切换。')
  return lines.join('\n')
}

/** settings 服务的最小结构（可选增强；未组合时 undefined，轮询按默认值同步）。 */
type SettingsService = {
  describe(options?: unknown): Array<{ ns: string; value?: unknown; revision?: number }>
  update(ns: string, patch: object, expectedRevision?: number): Promise<void>
}

/** 从 settings 行值读取期望的 (age, strict)；缺省为默认 1440/true。
 *  每次调用都重读 describe()（settings 保存后行值即时刷新），
 *  轮询周期内感知详情页 / 命令的切换。 */
function readExpected(settings: SettingsService | undefined): { age: number; strict: boolean } {
  if (settings === undefined) return { age: DSH_DEFAULT_AGE_MINUTES, strict: true }
  try {
    const row = settings.describe().find((r) => r.ns === SUPPLY_CHAIN_NAMESPACE)
    const v = row?.value as { minimumReleaseAge?: unknown; minimumReleaseAgeStrict?: unknown } | undefined
    const age = typeof v?.minimumReleaseAge === 'number' ? v.minimumReleaseAge : DSH_DEFAULT_AGE_MINUTES
    const strict = typeof v?.minimumReleaseAgeStrict === 'boolean' ? v.minimumReleaseAgeStrict : true
    return { age, strict }
  } catch {
    return { age: DSH_DEFAULT_AGE_MINUTES, strict: true }
  }
}

/** 命令 handler 的调用参数（最小结构；完整 CommandInvocation 含 commandId/agent/signal） */
interface SupplyChainInvocation {
  /** 斜杠命令名后的原始输入（含分隔空白） */
  rawInput: string
}

/** 命令 handler 的返回结果 */
interface CommandResult {
  kind: 'success' | 'error'
  text: string
}

/**
 * 把期望值（settings 行 config）同步进 pnpm-workspace.yaml + 状态文件。
 * 仅在 yaml 实际变化时写盘，避免无谓 IO。
 */
function syncYaml(age: number, strict: boolean): boolean {
  const current = readWorkspaceYaml()
  const next = patchYaml(current, age, strict)
  if (next === current) return false
  writeFileSync(workspaceYamlPath(), next, 'utf-8')
  writeState(isRelaxedMode(age, strict))
  return true
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
export function apply(ctx: Context): void {
  const settings = ctx.get('settings') as SettingsService | undefined

  /**
   * 命令 on/off 降级直写 yaml 后的内存覆盖标记：宿主未组合 settings 时，
   * 轮询 effect 的 readExpected 会按默认 1440/true 同步、把命令写入拉回
   * 默认 —— 有标记时轮询按「yaml 当前值」同步（跳过，避免冲突）。
   */
  let commandOverrideRelaxed: boolean | undefined

  // 轮询同步：期望值（settings 行 config）持续同步进 pnpm-workspace.yaml。
  // 详情页保存 / 命令 settings.update 都会刷新 settings 行值（经 settings
  // 框架写回 cordis.patch.yml 并刷新 describe()），3s 内落到 yaml ——
  // 无需重启 DSH 即对下一次 pnpm 安装生效。
  ctx.effect(
    () => {
      const timer = setInterval(() => {
        let age: number
        let strict: boolean
        if (commandOverrideRelaxed !== undefined) {
          // 无 settings 且命令已直写 yaml：按 yaml 现状同步（实际跳过写盘）。
          const yaml = readWorkspaceYaml()
          age = isRelaxedFromYaml(yaml) ? RELAXED_AGE_MINUTES : DSH_DEFAULT_AGE_MINUTES
          strict = !isRelaxedFromYaml(yaml)
        } else {
          ;({ age, strict } = readExpected(settings))
        }
        try {
          syncYaml(age, strict)
        } catch (err) {
          ctx.logger?.warn?.(`supply-chain-switch: settings → pnpm-workspace.yaml sync failed: ${String(err)}`)
        }
      }, SYNC_INTERVAL_MS)
      return () => clearInterval(timer)
    },
    'supply-chain-switch: settings → pnpm-workspace.yaml sync',
  )

  // 启动即同步一次：期望值 → yaml（行 config 缺失时按默认 1440/true 落盘）。
  const initial = readExpected(settings)
  syncYaml(initial.age, initial.strict)

  /** 宿主 commands 服务（缺失时命令入口降级，详情页仍可切换） */
  const commands = ctx.get('commands')

  if (commands === undefined) {
    ctx.logger?.warn?.('supply-chain-switch: commands service not available; /supply-chain not registered')
    return
  }

  const register = commands.register({
    name: 'supply-chain',
    description: '切换 DSH supply-chain（minimumReleaseAge）策略：on=宽松（可装刚发布包）/ off=默认 24h 冷却 / status=查看',
    input: { hint: 'on | off | status（默认 status）' },
    handler(invocation: SupplyChainInvocation): CommandResult {
      const raw = invocation.rawInput.trim().toLowerCase()
      const mode: 'on' | 'off' | 'status' =
        raw === '' || raw === 'status' ? 'status'
        : raw === 'on' || raw === 'off' ? raw
        : 'status'

      if (mode === 'status') {
        const current = readWorkspaceYaml()
        return {
          kind: 'success',
          text: renderStatus(readState(), current),
        }
      }

      const relaxed = mode === 'on'
      const age = relaxed ? RELAXED_AGE_MINUTES : DSH_DEFAULT_AGE_MINUTES
      const strict = !relaxed
      const patch: object = {
        minimumReleaseAge: age,
        minimumReleaseAgeStrict: strict,
      }

      // 首选 settings.update：与详情页同一事实来源，轮询 effect 随即同步 yaml。
      if (settings !== undefined) {
        void settings
          .update(SUPPLY_CHAIN_NAMESPACE, patch)
          .then(() => {
            // update 成功：立即同步一次，不必等轮询周期。
            const { age, strict } = readExpected(settings)
            syncYaml(age, strict)
          })
          .catch((err: unknown) => {
            ctx.logger?.warn?.(`supply-chain-switch: settings.update failed, falling back to direct yaml write: ${String(err)}`)
            // 回退直写 yaml + 打覆盖标记，轮询不再拉回默认。
            syncYaml(age, strict)
            commandOverrideRelaxed = relaxed
          })
      } else {
        // 降级：宿主未组合 settings（如极简 preset）时直接写 yaml，并打上
        // 覆盖标记，使轮询 effect 按 yaml 现状同步、不拉回默认。
        syncYaml(age, strict)
        commandOverrideRelaxed = relaxed
      }

      return {
        kind: 'success',
        text:
          relaxed
            ? '✅ Supply-chain 策略已切换为**宽松模式**（minimumReleaseAge=0）。' +
              '现在可以安装刚发布、尚未过 24h 冷却期的 npm 包。' +
              `已写入：\`${workspaceYamlPath()}\``
            : '🔒 Supply-chain 策略已恢复**默认模式**（minimumReleaseAge=1440 分钟 / 24h 冷却）。' +
              '刚发布的 npm 包将被拒绝，直到发布满 24 小时。',
      }
    },
  })

  // 插件卸载时注销命令
  ctx.effect(() => register(), 'supply-chain-switch: /supply-chain command')
}
