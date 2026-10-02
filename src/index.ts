/**
 * DSH Supply-Chain Switch — 随时开关 DSH 的 minimumReleaseAge 供应链策略。
 *
 * 注册一个 `/supply-chain` 斜杠命令，支持三个子命令：
 *   /supply-chain on     — 开启宽松模式：minimumReleaseAge=0，允许安装刚发布的 npm 包
 *   /supply-chain off    — 关闭宽松模式：minimumReleaseAge=1440（默认 24h），恢复 DSH 默认策略
 *   /supply-chain status — 查看当前策略状态
 *
 * 实现原理：改写当前 profile 的 pnpm-workspace.yaml，pnpm 安装时读取此配置。
 * 同时把状态记录到插件自身的 profile config 行（通过 settings 服务），方便插件详情页显示。
 *
 * @module dsh-supply-chain-switch
 */

import type { Context } from '@deepseek-ai/cordis'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/** Cordis 插件名（用于 loader 诊断） */
export const name = 'supply-chain-switch'

/** 注入的服务 */
export const inject = ['fs'] as const

/** DSH 默认 minimumReleaseAge（分钟）：24 小时 */
const DSH_DEFAULT_AGE_MINUTES = 1440

/** 宽松模式下的 minimumReleaseAge：0（不设下限） */
const RELAXED_AGE_MINUTES = 0

/** 状态文件路径（profile 根目录下 .dsh-supply-chain-switch.json） */
const STATE_FILENAME = '.dsh-supply-chain-switch.json'

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

/**
 * 改写 pnpm-workspace.yaml 里的 minimumReleaseAge 相关字段。
 * 使用简单的行级替换（不引入 yaml 解析依赖），保留其余内容不变。
 *
 * 匹配策略：
 *   - `minimumReleaseAge: <number>` 整行替换
 *   - `minimumReleaseAgeStrict: <bool>` 整行替换
 *   - 若缺失则在文件末尾追加
 */
function patchYaml(content: string, relaxed: boolean): string {
  const targetAge = relaxed ? RELAXED_AGE_MINUTES : DSH_DEFAULT_AGE_MINUTES
  const targetStrict = relaxed ? false : true

  // 行级替换：minimumReleaseAge
  const lines = content.split(/\r?\n/)
  const out: string[] = []
  let hasAge = false
  let hasStrict = false

  for (const line of lines) {
    const ageMatch = /^(\s*)minimumReleaseAge\s*:\s*/.exec(line)
    const strictMatch = /^(\s*)minimumReleaseAgeStrict\s*:\s*/.exec(line)
    if (ageMatch) {
      out.push(`${ageMatch[1]}minimumReleaseAge: ${targetAge}`)
      hasAge = true
    } else if (strictMatch) {
      out.push(`${strictMatch[1]}minimumReleaseAgeStrict: ${targetStrict}`)
      hasStrict = true
    } else {
      out.push(line)
    }
  }

  if (!hasAge) out.push(`minimumReleaseAge: ${targetAge}`)
  if (!hasStrict) out.push(`minimumReleaseAgeStrict: ${targetStrict}`)

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
  return lines.join('\n')
}

/**
 * 应用插件到宿主 Context。
 *
 * 注册 `/supply-chain` 命令，handler 在宿主进程内直接改写
 * pnpm-workspace.yaml，无需重启 DSH 即可对下一次 pnpm 安装生效。
 */
export function apply(ctx: Context): void {
  /** 宿主 commands 服务 */
  const commands = ctx.get('commands')

  if (commands === undefined) {
    // 宿主未组合 commands 服务时降级：不注册命令，仅记录日志
    ctx.logger?.warn?.('supply-chain-switch: commands service not available; /supply-chain not registered')
    return
  }

  const register = commands.register({
    name: 'supply-chain',
    description: '切换 DSH supply-chain（minimumReleaseAge）策略：on=宽松（可装刚发布包）/ off=默认 24h 冷却 / status=查看',
    input: { hint: 'on | off | status（默认 status）' },
    handler(invocation) {
      const raw = invocation.rawInput.trim().toLowerCase()
      const mode: 'on' | 'off' | 'status' =
        raw === '' || raw === 'status' ? 'status'
        : raw === 'on' || raw === 'off' ? raw
        : 'status'

      const yamlPath = workspaceYamlPath()

      if (mode === 'on' || mode === 'off') {
        const relaxed = mode === 'on'
        const current = readWorkspaceYaml()
        const next = patchYaml(current, relaxed)
        writeFileSync(yamlPath, next, 'utf-8')
        writeState(relaxed)

        return {
          kind: 'success' as const,
          text:
            relaxed
              ? '✅ Supply-chain 策略已切换为**宽松模式**（minimumReleaseAge=0）。' +
                '现在可以安装刚发布、尚未过 24h 冷却期的 npm 包。' +
                `已写入：\`${yamlPath}\``
              : '🔒 Supply-chain 策略已恢复**默认模式**（minimumReleaseAge=1440 分钟 / 24h 冷却）。' +
                '刚发布的 npm 包将被拒绝，直到发布满 24 小时。',
        }
      }

      // mode === 'status'
      const current = readWorkspaceYaml()
      const state = readState()
      return {
        kind: 'success' as const,
        text: renderStatus(state, current),
      }
    },
  })

  // 插件卸载时注销命令
  ctx.effect(() => register(), 'supply-chain-switch: /supply-chain command')
}
