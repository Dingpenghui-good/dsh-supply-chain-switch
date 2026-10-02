# Changelog

本项目的所有重要变更都记录在此文件。
All notable changes to this project are documented in this file.

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-10-02

### 新增 Added

- 插件详情页开关：在 DSH GUI 的「插件」页打开本插件后，用「宽松模式」开关 + 保存即可切换供应链策略，无需记命令。
  Plugin detail-page switch: open this plugin on the DSH GUI **Plugins** page and use the **Relaxed mode** switch plus Save, with no command to remember.
- `/supply-chain` 斜杠命令（后备入口）：`on` / `off` / `status`。
  `/supply-chain` slash command as a fallback entry point: `on` / `off` / `status`.
- 宿主轮询同步（3s）：把 settings 行 config 同步进 profile 的 `pnpm-workspace.yaml`，无需重启 DSH 即对下一次 pnpm 安装生效。
  Host-side polling sync (3s): mirrors the settings row config into the profile's `pnpm-workspace.yaml`, effective for the next pnpm install without restarting DSH.
- 状态记录：每次切换写入 profile 根目录的 `.dsh-supply-chain-switch.json`。
  State record: every switch writes `.dsh-supply-chain-switch.json` in the profile root.

### 修复 Fixed

- **行模块名**：patch 行原先声明 `@local/dsh-supply-chain-switch`（DSH 文档模板里的占位名），在 profile 中解析不到，导致该条目 `failed to import`。现改为真实包名 `@dingpenghui/dsh-supply-chain-switch`。
  **Row module name**: the patch row declared `@local/dsh-supply-chain-switch` (a placeholder from the DSH docs template) which resolves nowhere in a profile, so the entry failed to import. It now names the real package, `@dingpenghui/dsh-supply-chain-switch`.
- **可编辑表单**：宿主导出 `Config`，且两个字段标记 `.volatile()`。此前缺少 `Config` 使该行没有 schema；即使补上，未标 volatile 的字段也会被 settings 框架拒绝写入，详情页控件因此不可用。
  **Editable form**: the host exports `Config` with both fields marked `.volatile()`. Without `Config` the row had no schema, and without `volatile` the settings framework rejects every write, leaving the detail-page control disabled.
- **表单取值**：客户端改用页面宿主传入的 `form` prop，并回退到 `ctx.configForms.get('include:<行 id>')`；此前漏掉 `include:` 前缀，永远匹配不到条目。
  **Form lookup**: the client now uses the `form` prop the page owner supplies, falling back to `ctx.configForms.get('include:<row id>')`; the previous key omitted the `include:` prefix and never matched the entry.
- 客户端只注册 `plugins.row.config`：配置属于行，组合包级页面没有单一表单。
  The client registers only `plugins.row.config`: the configuration belongs to the row, and a bundle-wide page has no single form.
- `.gitignore` 原先混入 UTF-16 字节，导致 `.npmrc` 实际未被忽略；已重写为纯 UTF-8。
  `.gitignore` contained grafted UTF-16 bytes, so `.npmrc` was not actually ignored; rewritten as plain UTF-8.
- 移除失效的 `index.mjs` 改名步骤（tsdown 现已直接产出 `index.js`）。
  Removed a stale `index.mjs` rename step; tsdown now emits `index.js` directly.

### 说明 Notes

- 宽松模式写入 `minimumReleaseAge: 0` + `minimumReleaseAgeStrict: false`；默认模式写入 `1440` + `true`。
  Relaxed mode writes `minimumReleaseAge: 0` + `minimumReleaseAgeStrict: false`; default mode writes `1440` + `true`.
- 只改写上述两个 key，`pnpm-workspace.yaml` 的其他内容（如 `minimumReleaseAgeExclude`）原样保留。
  Only those two keys are rewritten; other content in `pnpm-workspace.yaml` (such as `minimumReleaseAgeExclude`) is preserved verbatim.
- 放宽策略存在供应链风险：刚发布的包可能尚未完成安全审查，用完请切回默认。
  Relaxing the policy carries supply-chain risk: freshly published packages may not have completed security review, so switch back to default when done.

## [1.0.0] - 2026-10-02

首个发布版本：仅提供 `/supply-chain` 命令，尚无客户端详情页。
Initial release: the `/supply-chain` command only, with no client detail page.

[1.1.0]: https://github.com/Dingpenghui-good/dsh-supply-chain-switch/releases/tag/v1.1.0
[1.0.0]: https://github.com/Dingpenghui-good/dsh-supply-chain-switch/releases/tag/v1.0.0
