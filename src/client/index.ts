/**
 * Client-side entry for the dsh-supply-chain-switch plugin.
 *
 * Registers the switch on the page the Plugins page opens for this bundle's
 * row, through the `plugins.row.config` slot keyed `<package>#<row id>`. The
 * page owner supplies the editable form as the `form` prop
 * (`form.state` + `form.mutate(operations, expectedRevision)`); there is no
 * client `configForms` service to look up.
 *
 * Only `plugins.row.config` is registered: the configuration lives on the row,
 * and a bundle-wide page has no single form.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: the Plugins page slot contract (plugins.row.config) and the
// `form` prop the page owner supplies; never a runtime import.
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
// Type-only: pulls the ctx.locale merge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ctx.configForms Context merge.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

import { SupplyChainDetailPage } from './plugin-detail-page.tsx'
import type { SupplyChainForm } from './plugin-detail-page.tsx'
import { zh as zhDict, en as enDict } from '../locales/index.ts'
import { PLUGIN_ROW_CONFIG_KEY, SUPPLY_CHAIN_ENTRY_ID } from '../shared.ts'

const DICT_NS = 'settings.dsh-supply-chain-switch'

export const inject = ['slots', 'locale'] as const

export function apply(ctx: ClientContext): void {
  const slots = ctx.get('slots')
  const locale = ctx.get('locale')

  if (slots === undefined || locale === undefined) return

  ctx.effect(() => locale.register(DICT_NS, { zh: zhDict, en: enDict }), 'supply-chain-switch: dictionaries')

  // 页面宿主在条目暴露可编辑 Config 时会把表单作为 `form` prop 传入；这里再
  // 备一条回退：ui-settings 的共享表单服务，键为 **Host 条目 id**
  // （`include:<行 id>`）。宿主传了 `form` 就以宿主的为准。
  const form = (ctx.get('configForms') as { get<T>(entryId: string): T } | undefined)?.get<SupplyChainForm>(
    SUPPLY_CHAIN_ENTRY_ID,
  )

  ctx.effect(
    () =>
      slots.inject('plugins.row.config', () =>
        slots.register(
          {
            name: 'plugins.row.config',
            key: PLUGIN_ROW_CONFIG_KEY,
            locale: DICT_NS,
            inject: () => (form === undefined ? {} : { form }),
          },
          SupplyChainDetailPage,
        ),
      ),
    'supply-chain-switch: row config page',
  )
}
