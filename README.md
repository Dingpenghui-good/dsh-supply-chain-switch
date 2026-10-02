# DSH Supply-Chain Switch

DSH 插件：随时开启/关闭 DSH 的 supply-chain（`minimumReleaseAge`）策略，让刚发布的 npm 包可被安装。

## 背景

DSH 的 `plugin_manager` 安装 npm 包时默认启用 pnpm 的供应链策略：
刚发布、发布未满 24 小时（`minimumReleaseAge: 1440` 分钟）的包会被
`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` 拒掉。需要安装刚发布的包时，
临时放宽该策略很方便——本插件提供**插件详情页开关**（推荐）与
`/supply-chain` 斜杠命令两种入口随时切换。

## 操作入口

### 1. 插件详情页（推荐）

在 DSH GUI 的「插件」页点击 **dsh-supply-chain-switch** 的插件名，
打开详情页；页面上的「宽松模式」开关 + 保存即可切换：

- 开启 = 宽松：`minimumReleaseAge: 0`、`minimumReleaseAgeStrict: false`；
- 关闭 = 默认：`minimumReleaseAge: 1440`、`minimumReleaseAgeStrict: true`。

保存后经宿主 settings 框架写回 profile 的 `cordis.patch.yml`，
插件的轮询（3s）把新值同步进 `pnpm-workspace.yaml`，无需重启 DSH
即对下一次 pnpm 安装生效。

### 2. `/supply-chain` 斜杠命令（保留）

在 DSH Web GUI 的会话输入框里输入：

| 命令 | 效果 |
|------|------|
| `/supply-chain on` | 宽松模式：`minimumReleaseAge: 0`、`minimumReleaseAgeStrict: false`，可装刚发布的包 |
| `/supply-chain off` | 默认模式：`minimumReleaseAge: 1440`、`minimumReleaseAgeStrict: true`，恢复 DSH 默认 24h 冷却 |
| `/supply-chain status` | 查看当前策略状态（无参数时默认 status） |

命令与详情页共用同一事实来源（settings 行 config `supply-chain-switch`），
行为一致。

## 工作原理

插件把行 config（settings 命名空间 `supply-chain-switch`，volatile 字段）
作为期望值，周期性（3s）同步进当前 DSH profile 的 `pnpm-workspace.yaml`：

- 宽松：写入 `minimumReleaseAge: 0` + `minimumReleaseAgeStrict: false`；
- 默认：写入 `minimumReleaseAge: 1440` + `minimumReleaseAgeStrict: true`。

同时把状态记录到 profile 根目录的 `.dsh-supply-chain-switch.json`。
DSH 的 `plugin_manager` pnpm 安装读这份配置，所以切换对**下一次安装**
即时生效，无需重启 DSH。

## 安装

```bash
# 通过 DSH 的 plugin_manager 安装（在 DSH GUI 的"插件"页或调用 plugin_manager 工具）
# target = @dingpenghui/dsh-supply-chain-switch
```

安装后插件自动启用。若当前宿主进程尚未重新组合（HMR 未覆盖
commands / settings 服务），重启 DSH 即可让命令与详情页开关注册生效。

## 本地开发

```bash
cd dsh-supply-chain-switch
pnpm install          # 安装 tsdown / typescript / lightningcss 等 dev 依赖
pnpm build            # tsdown：宿主 ESM (lib/index.js) + 客户端 CJS (lib/client.js)
```

## 注意

- 本插件只改写 `minimumReleaseAge` / `minimumReleaseAgeStrict` 两个 key，
  保留 `pnpm-workspace.yaml` 里其他内容（`minimumReleaseAgeExclude` 等）不变。
- 放宽策略有供应链风险：刚发布的包可能尚未完成安全审查，
  用完请记得在详情页关闭开关（或 `/supply-chain off`）切回默认。

## License

MIT
