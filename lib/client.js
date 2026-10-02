window.__ModuleLoader__.load({
	id: "@dingpenghui/dsh-supply-chain-switch",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-scc-css:E:\dsh-workspace\supply-chain-switch\src\client\PluginDetailPage.module.css.mjs
		const css = ".tsQCjq_page{flex-direction:column;gap:8px;padding-bottom:16px;display:flex}.tsQCjq_field{border-bottom:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:8px;padding:16px 0;display:flex}.tsQCjq_fieldText{flex-direction:column;gap:4px;display:flex}.tsQCjq_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}.tsQCjq_subHint{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:400;line-height:18px}.tsQCjq_warning{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));border-top:1px dashed var(--dsw-alias-border-l2);margin-top:8px;padding:8px 0 0;font-size:12px;font-weight:400;line-height:18px}.tsQCjq_error{color:var(--dsw-alias-label-error,var(--dsw-alias-label-primary));padding-top:4px;font-size:12px;font-weight:400;line-height:18px}.tsQCjq_actions{flex-direction:row;justify-content:flex-end;gap:8px;margin-top:8px;display:flex}.tsQCjq_primary,.tsQCjq_secondary{cursor:pointer;border-radius:6px;padding:5px 14px;font-size:13px;line-height:20px}.tsQCjq_primary{background:var(--dsw-alias-brand-primary,var(--dsw-alias-label-primary));color:var(--dsw-alias-label-inverse,#fff);border:1px solid #0000}.tsQCjq_secondary{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);background:0 0}.tsQCjq_primary:disabled,.tsQCjq_secondary:disabled{opacity:.5;cursor:not-allowed}";
		const tagId = "@dingpenghui/dsh-supply-chain-switch/PluginDetailPage.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dingpenghui/dsh-supply-chain-switch";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var PluginDetailPage_module_css_default = {
			"page": "tsQCjq_page",
			"actions": "tsQCjq_actions",
			"secondary": "tsQCjq_secondary",
			"field": "tsQCjq_field",
			"warning": "tsQCjq_warning",
			"error": "tsQCjq_error",
			"title": "tsQCjq_title",
			"primary": "tsQCjq_primary",
			"fieldText": "tsQCjq_fieldText",
			"subHint": "tsQCjq_subHint"
		};
		//#endregion
		//#region src/client/plugin-detail-page.tsx
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
		/** 行 config 的字段名（与宿主 Config schema 一致）。 */
		const FIELD_AGE = "minimumReleaseAge";
		const FIELD_STRICT = "minimumReleaseAgeStrict";
		const DEFAULT_AGE = 1440;
		const RELAXED_AGE = 0;
		/** 从宿主快照里读布尔字段；缺失时回落到 schema 默认值。 */
		function readBoolean(value, field, fallback) {
			const raw = value?.[field];
			return typeof raw === "boolean" ? raw : fallback;
		}
		/** 从宿主快照里读数值字段；缺失时回落到 schema 默认值。 */
		function readNumber(value, field, fallback) {
			const raw = value?.[field];
			return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
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
		function SupplyChainDetailPage(props) {
			const { t, view, form } = props;
			const snapshot = form?.state;
			const writable = form !== void 0 && snapshot?.writable === true;
			const committedAge = readNumber(snapshot?.value, FIELD_AGE, DEFAULT_AGE);
			const committedStrict = readBoolean(snapshot?.value, FIELD_STRICT, true);
			const committedRelaxed = committedAge === RELAXED_AGE && !committedStrict;
			const [draftRelaxed, setDraftRelaxed] = react.useState(void 0);
			const [busy, setBusy] = react.useState(false);
			const [failed, setFailed] = react.useState(false);
			react.useEffect(() => {
				setDraftRelaxed(void 0);
				setFailed(false);
			}, [snapshot?.revision]);
			if (view === "summary") return t("description");
			const relaxed = draftRelaxed ?? committedRelaxed;
			const dirty = draftRelaxed !== void 0 && draftRelaxed !== committedRelaxed;
			const disabled = !writable || busy;
			/** 保存：两个字段一次 mutate 提交，共享同一 revision 栅栏。 */
			const save = () => {
				if (form === void 0 || draftRelaxed === void 0) return;
				const next = draftRelaxed;
				setBusy(true);
				setFailed(false);
				form.mutate([{
					op: "set",
					path: [FIELD_AGE],
					value: next ? RELAXED_AGE : DEFAULT_AGE
				}, {
					op: "set",
					path: [FIELD_STRICT],
					value: !next
				}], snapshot?.revision).then((accepted) => {
					if (accepted) setDraftRelaxed(void 0);
					else setFailed(true);
				}).catch(() => {
					setFailed(true);
				}).finally(() => {
					setBusy(false);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PluginDetailPage_module_css_default.page,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PluginDetailPage_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: PluginDetailPage_module_css_default.fieldText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: PluginDetailPage_module_css_default.title,
								children: t("page.relaxed.label")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: PluginDetailPage_module_css_default.subHint,
								children: t("page.relaxed.hint")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
							checked: relaxed,
							onChange: (next) => {
								setDraftRelaxed(next);
							},
							label: t("page.relaxed.label"),
							disabled
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PluginDetailPage_module_css_default.warning,
						children: t("page.warning")
					}),
					failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PluginDetailPage_module_css_default.error,
						children: t("form.saveFailed")
					}) : null,
					!writable && !busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PluginDetailPage_module_css_default.subHint,
						children: t("form.unavailable")
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PluginDetailPage_module_css_default.actions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: PluginDetailPage_module_css_default.secondary,
							onClick: () => setDraftRelaxed(void 0),
							disabled: !dirty || busy,
							children: t("form.discard")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: PluginDetailPage_module_css_default.primary,
							onClick: save,
							disabled: !dirty || disabled,
							children: busy ? t("form.saving") : t("form.save")
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/locales/index.ts
		/** Localization dictionaries (detail page supply-chain switch form) */
		const zh = {
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
			"form.invalid": "无效值"
		};
		const en = {
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
			"form.invalid": "Invalid value"
		};
		//#endregion
		//#region src/shared.ts
		/**
		* Shared constants usable by both the Host bundle and the Client bundle.
		* The client reads the settings namespace through this barrel so it never
		* value-imports a Host-only package such as `node:fs`.
		*/
		/** settings 命名空间 = 本插件的 Loader 行 id（cordis.patch.yml 的 id）。 */
		const SUPPLY_CHAIN_NAMESPACE = "supply-chain-switch";
		/**
		* Host 条目 id —— `configForms.get()` 要的键。
		* Loader 给 bundle patch 插入的行加 `include:` 前缀，因此这里是
		* `include:<行 id>`，既不是行 id 也不是包名。
		*/
		const SUPPLY_CHAIN_ENTRY_ID = `include:${SUPPLY_CHAIN_NAMESPACE}`;
		/** `plugins.row.config` slot 的 key：`<package>#<row id>`。 */
		const PLUGIN_ROW_CONFIG_KEY = `@dingpenghui/dsh-supply-chain-switch#${SUPPLY_CHAIN_NAMESPACE}`;
		//#endregion
		//#region src/client/index.ts
		const DICT_NS = "settings.dsh-supply-chain-switch";
		const inject = ["slots", "locale"];
		function apply(ctx) {
			const slots = ctx.get("slots");
			const locale = ctx.get("locale");
			if (slots === void 0 || locale === void 0) return;
			ctx.effect(() => locale.register(DICT_NS, {
				zh,
				en
			}), "supply-chain-switch: dictionaries");
			const form = ctx.get("configForms")?.get(SUPPLY_CHAIN_ENTRY_ID);
			ctx.effect(() => slots.inject("plugins.row.config", () => slots.register({
				name: "plugins.row.config",
				key: PLUGIN_ROW_CONFIG_KEY,
				locale: DICT_NS,
				inject: () => form === void 0 ? {} : { form }
			}, SupplyChainDetailPage)), "supply-chain-switch: row config page");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map