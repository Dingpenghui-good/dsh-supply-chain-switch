# Changelog

本项目的所有重要变更都记录在此文件。
All notable changes to this project are documented in this file.

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-02

### 新增 Added

- 插件详情页开关：在 DSH GUI 的「插件」页打开本插件后，用「宽松模式」开关 + 保存即可切换供应链策略，无需记命令。
  Plugin detail-page switch: open this plugin on the DSH GUI **Plugins** page and use the **Relaxed mode** switch plus Save, with no command to remember.
- `/supply-chain` 斜杠命令（后备入口）：`on` / `off` / `status`。
  `/supply-chain` slash command as a fallback entry point: `on` / `off` / `status`.
- 宿主轮询同步（3s）：把 settings 行 config 同步进 profile 的 `pnpm-workspace.yaml`，无需重启 DSH 即对下一次 pnpm 安装生效。
  Host-side polling sync (3s): mirrors the settings row config into the profile's `pnpm-workspace.yaml`, effective for the next pnpm install without restarting DSH.
- 状态记录：每次切换写入 profile 根目录的 `.dsh-supply-chain-switch.json`。
  State record: every switch writes `.dsh-supply-chain-switch.json` in the profile root.

### 说明 Notes

- 宽松模式写入 `minimumReleaseAge: 0` + `minimumReleaseAgeStrict: false`；默认模式写入 `1440` + `true`。
  Relaxed mode writes `minimumReleaseAge: 0` + `minimumReleaseAgeStrict: false`; default mode writes `1440` + `true`.
- 只改写上述两个 key，`pnpm-workspace.yaml` 的其他内容（如 `minimumReleaseAgeExclude`）原样保留。
  Only those two keys are rewritten; other content in `pnpm-workspace.yaml` (such as `minimumReleaseAgeExclude`) is preserved verbatim.
- 放宽策略存在供应链风险：刚发布的包可能尚未完成安全审查，用完请切回默认。
  Relaxing the policy carries supply-chain risk: freshly published packages may not have completed security review, so switch back to default when done.

[1.0.0]: https://github.com/Dingpenghui-good/dsh-supply-chain-switch/releases/tag/v1.0.0
