# DSH Supply-Chain Switch

DSH 插件：随时开启/关闭 DSH 的 supply-chain（`minimumReleaseAge`）策略，让刚发布的 npm 包可被安装。

## 背景

DSH 的 `plugin_manager` 安装 npm 包时默认启用 pnpm 的供应链策略：
刚发布、发布未满 24 小时（`minimumReleaseAge: 1440` 分钟）的包会被
`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` 拒掉。需要安装刚发布的包时，
临时放宽该策略很方便——本插件提供一个斜杠命令随时切换。

## 命令

在 DSH Web GUI 的会话输入框里输入：

| 命令 | 效果 |
|------|------|
| `/supply-chain on` | 宽松模式：`minimumReleaseAge: 0`、`minimumReleaseAgeStrict: false`，可装刚发布的包 |
| `/supply-chain off` | 默认模式：`minimumReleaseAge: 1440`、`minimumReleaseAgeStrict: true`，恢复 DSH 默认 24h 冷却 |
| `/supply-chain status` | 查看当前策略状态（无参数时默认 status） |

## 工作原理

插件在宿主进程里改写当前 DSH profile 的 `pnpm-workspace.yaml`：

- 宽松模式：写入 `minimumReleaseAge: 0` + `minimumReleaseAgeStrict: false`；
- 默认模式：写入 `minimumReleaseAge: 1440` + `minimumReleaseAgeStrict: true`。

DSH 的 `plugin_manager` pnpm 安装读这份配置，所以切换对**下一次安装**即时生效，
无需重启 DSH。

## 安装

```bash
# 通过 DSH 的 plugin_manager 安装（在 DSH GUI 的"插件"页或调用 plugin_manager 工具）
# target = @dingpenghui/dsh-supply-chain-switch
```

安装后插件自动启用。若当前宿主进程尚未重新组合（HMR 未覆盖 commands 服务），
重启 DSH 即可让 `/supply-chain` 命令注册到 commands 服务。

## 本地开发

```bash
cd dsh-supply-chain-switch
# 安装依赖（DSH 包需从本地或 DSH profile 复制，npm registry 上版本滞后）
npm install tsdown typescript @types/node --no-save
# 构建
npx tsdown
# 手动改名（tsdown 默认产出 .mjs/.d.mts）
Move-Item lib/index.mjs lib/index.js -Force
Move-Item lib/index.d.mts lib/index.d.ts -Force
```

## 注意

- 本插件只改写 `minimumReleaseAge` / `minimumReleaseAgeStrict` 两个 key，
  保留 `pnpm-workspace.yaml` 里其他内容（`minimumReleaseAgeExclude` 等）不变。
- 放宽策略有供应链风险：刚发布的包可能尚未完成安全审查，
  用完请记得 `/supply-chain off` 切回默认。

## License

MIT
