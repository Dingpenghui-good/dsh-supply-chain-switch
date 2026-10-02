/**
 * dsh-supply-chain-switch 行配置页。
 *
 * 表单来源有两条，按优先级取用：
 *   1. 页面宿主通过 `form` prop 传入的 `ConfigPageForm`（`form.state` +
 *      `form.mutate(ops, revision)`）；
 *   2. 宿主未传时，回退到客户端 `ctx.configForms.get(entryId)` —— 这是
 *      ui-settings 提供的共享表单服务，`entryId` 必须是 **Host 条目 id**
 *      （`include:<行 id>`），而不是行 id 或包名。
 *
 * 页面自己持有草稿，点「保存」时把两个字段作为一组原子变更提交
 * （宽松 0/false；默认 1440/true）。
 */
import * as React from 'react'
import type { PluginConfigViewProps } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type { PropsRuntime, PropsLocale, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './PluginDetailPage.module.css'

/** 页面宿主可能传入的表单；`configForms.get` 也返回同形对象。 */
export interface SupplyChainForm {
  readonly state: {
    readonly status: 'loading' | 'ready' | 'unavailable'
    readonly value: Record<string, unknown> | undefined
    readonly revision: number | undefined
    readonly writable: boolean
  }
  mutate(ops: readonly { op: 'set'; path: readonly string[]; value: unknown }[], expectedRevision?: number): Promise<boolean>
}

/** 渲染器为行配置页绑定的 props。 */
export type SupplyChainDetailPageProps =
  & PropsRuntime<'plugins.row.config'>
  & PropsLocale<'settings.dsh-supply-chain-switch'>
  & PluginConfigViewProps

/** 行 config 的字段名（与宿主 Config schema 一致）。 */
const FIELD_AGE = 'minimumReleaseAge'
const FIELD_STRICT = 'minimumReleaseAgeStrict'

const DEFAULT_AGE = 1440
const RELAXED_AGE = 0

/** 从宿主快照里读布尔字段；缺失时回落到 schema 默认值。 */
function readBoolean(value: Record<string, unknown> | undefined, field: string, fallback: boolean): boolean {
  const raw = value?.[field]
  return typeof raw === 'boolean' ? raw : fallback
}

/** 从宿主快照里读数值字段；缺失时回落到 schema 默认值。 */
function readNumber(value: Record<string, unknown> | undefined, field: string, fallback: number): number {
  const raw = value?.[field]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback
}

/**
 * 渲染带保存控件的开关表单（`view: 'page'`），或官方卡片的摘要
 * （`view: 'summary'`）。
 *
 * 开关开启 = 宽松模式（minimumReleaseAge=0 + strict=false），
 * 关闭 = DSH 默认 24h 冷却（minimumReleaseAge=1440 + strict=true）。
 *
 * @param props - 视图、locale 文案、宿主表单快照与写入动作。
 * @returns 摘要文字，或带保存控件的策略开关表单。
 */
export function SupplyChainDetailPage(props: SupplyChainDetailPageProps) {
  const { t, view, form } = props

  const snapshot = form?.state
  const writable = form !== undefined && snapshot?.writable === true
  const committedAge = readNumber(snapshot?.value, FIELD_AGE, DEFAULT_AGE)
  const committedStrict = readBoolean(snapshot?.value, FIELD_STRICT, true)
  const committedRelaxed = committedAge === RELAXED_AGE && !committedStrict

  // 草稿：未编辑时为 undefined，渲染回落到宿主当前值。
  const [draftRelaxed, setDraftRelaxed] = React.useState<boolean | undefined>(undefined)
  const [busy, setBusy] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  // 宿主值变化（保存被接受 / 外部修改）后丢弃过期草稿。
  React.useEffect(() => {
    setDraftRelaxed(undefined)
    setFailed(false)
  }, [snapshot?.revision])

  if (view === 'summary') return t('description')

  const relaxed = draftRelaxed ?? committedRelaxed
  const dirty = draftRelaxed !== undefined && draftRelaxed !== committedRelaxed
  const disabled = !writable || busy

  /** 保存：两个字段一次 mutate 提交，共享同一 revision 栅栏。 */
  const save = () => {
    if (form === undefined || draftRelaxed === undefined) return
    const next = draftRelaxed
    setBusy(true)
    setFailed(false)
    void form
      .mutate(
        [
          { op: 'set', path: [FIELD_AGE], value: next ? RELAXED_AGE : DEFAULT_AGE },
          { op: 'set', path: [FIELD_STRICT], value: !next },
        ],
        snapshot?.revision,
      )
      .then((accepted) => {
        if (accepted) setDraftRelaxed(undefined)
        else setFailed(true)
      })
      .catch(() => {
        setFailed(true)
      })
      .finally(() => {
        setBusy(false)
      })
  }

  return (
    <div className={css.page}>
      <div className={css.field}>
        <div className={css.fieldText}>
          <div className={css.title}>{t('page.relaxed.label')}</div>
          <div className={css.subHint}>{t('page.relaxed.hint')}</div>
        </div>
        <Switch
          checked={relaxed}
          onChange={(next: boolean) => {
            setDraftRelaxed(next)
          }}
          label={t('page.relaxed.label')}
          disabled={disabled}
        />
      </div>

      <div className={css.warning}>{t('page.warning')}</div>

      {failed ? <div className={css.error}>{t('form.saveFailed')}</div> : null}
      {!writable && !busy ? <div className={css.subHint}>{t('form.unavailable')}</div> : null}

      <div className={css.actions}>
        <button
          type="button"
          className={css.secondary}
          onClick={() => setDraftRelaxed(undefined)}
          disabled={!dirty || busy}
        >
          {t('form.discard')}
        </button>
        <button type="button" className={css.primary} onClick={save} disabled={!dirty || disabled}>
          {busy ? t('form.saving') : t('form.save')}
        </button>
      </div>
    </div>
  )
}
