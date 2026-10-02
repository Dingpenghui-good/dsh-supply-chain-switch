/** Localization dictionaries (detail page supply-chain switch form) */
export const zh = {
  "title": "Supply-Chain 策略",
  "description": "切换 DSH 的 npm 供应链冷却策略（minimumReleaseAge），保存后即时生效。",
  "page.relaxed.label": "宽松模式（允许安装刚发布的 npm 包）",
  "page.relaxed.hint": "开启后 minimumReleaseAge=0 / minimumReleaseAgeStrict=false，可安装发布未满 24 小时的包；关闭后恢复 DSH 默认 24h 冷却策略。",
  "page.warning": "⚠ 宽松模式下 pnpm 供应链冷却期失效，所有刚发布的包都会被允许安装。安装完新包后建议及时关闭。",
  "form.unavailable": "该插件当前未加载，暂时无法配置。",
  "form.readOnly": "本部署的设置为只读。",
  "form.saveFailed": "保存未被接受，已保留供你修改。",
  "form.save": "保存",
  "form.saving": "保存中…",
  "form.discard": "放弃修改",
  "form.overridden": "已覆盖",
  "form.reset": "恢复默认",
  "form.invalid": "无效值",
} as const

export const en = {
  "title": "Supply-Chain Policy",
  "description": "Toggle the DSH npm supply-chain cooldown (minimumReleaseAge); takes effect immediately after saving.",
  "page.relaxed.label": "Relaxed mode (allow just-published npm packages)",
  "page.relaxed.hint": "When on: minimumReleaseAge=0 / minimumReleaseAgeStrict=false, packages published within 24h can be installed; when off the DSH default 24h cooldown is restored.",
  "page.warning": "⚠ With relaxed mode the pnpm supply-chain cooldown is disabled for all packages. Turn it off again shortly after installing fresh packages.",
  "form.unavailable": "This plugin is not loaded, so it cannot be configured right now.",
  "form.readOnly": "This deployment stores settings read-only.",
  "form.saveFailed": "The deployment did not accept these values; they were left for you to correct.",
  "form.save": "Save",
  "form.saving": "Saving…",
  "form.discard": "Discard changes",
  "form.overridden": "Overridden",
  "form.reset": "Reset to default",
  "form.invalid": "Invalid value",
} as const
