/**
 * Shared constants usable by both the Host bundle and the Client bundle.
 * The client reads the settings namespace through this barrel so it never
 * value-imports a Host-only package such as `node:fs`.
 */

/** settings 命名空间 = 本插件的 Loader 行 id（cordis.patch.yml 的 id）。 */
export const SUPPLY_CHAIN_NAMESPACE = 'supply-chain-switch'

/**
 * Host 条目 id —— `configForms.get()` 要的键。
 * Loader 给 bundle patch 插入的行加 `include:` 前缀，因此这里是
 * `include:<行 id>`，既不是行 id 也不是包名。
 */
export const SUPPLY_CHAIN_ENTRY_ID = `include:${SUPPLY_CHAIN_NAMESPACE}`

/** npm 包名：`plugins.bundle.config` slot 的 key。 */
export const PLUGIN_PACKAGE_NAME = '@dingpenghui/dsh-supply-chain-switch'

/** `plugins.row.config` slot 的 key：`<package>#<row id>`。 */
export const PLUGIN_ROW_CONFIG_KEY = `${PLUGIN_PACKAGE_NAME}#${SUPPLY_CHAIN_NAMESPACE}`

/** 详情页编辑的字段 —— 行 config schema 的全部字段。 */
export interface SupplyChainSettings {
  /** pnpm minimumReleaseAge（分钟）。0 = 宽松，1440 = 默认 24h 冷却。 */
  minimumReleaseAge?: number
  /** pnpm minimumReleaseAgeStrict：true = 强制策略、无豁免。 */
  minimumReleaseAgeStrict?: boolean
}

/** 宽松模式的字段值对。 */
export const RELAXED_VALUES: Pick<SupplyChainSettings, 'minimumReleaseAge' | 'minimumReleaseAgeStrict'> = {
  minimumReleaseAge: 0,
  minimumReleaseAgeStrict: false,
}

/** 默认（24h 冷却）模式的字段值对。 */
export const DEFAULT_VALUES: Pick<SupplyChainSettings, 'minimumReleaseAge' | 'minimumReleaseAgeStrict'> = {
  minimumReleaseAge: 1440,
  minimumReleaseAgeStrict: true,
}
