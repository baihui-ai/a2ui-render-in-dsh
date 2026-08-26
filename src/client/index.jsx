// dsh-a2ui client half: registers the a2ui_render toolview and its locale.
import { A2uiToolView, A2uiUpdateView } from "./toolview.jsx";
import { injectStyles } from "./styles.js";

injectStyles();

const NS = "a2ui";

const zh = {
	"card.title": "交互卡片",
	"card.building": "正在生成界面…",
	"card.invalid": "界面描述解析失败",
	"card.sending": "正在提交…",
	"card.sent": "已提交",
	"card.error": "提交失败：",
	"card.refill": "重新填写",
	"card.updated": "已更新卡片"
};

const en = {
	"card.title": "Interactive card",
	"card.building": "Building interface…",
	"card.invalid": "Could not parse the UI payload",
	"card.sending": "Submitting…",
	"card.sent": "Submitted",
	"card.error": "Submit failed:",
	"card.refill": "Refill",
	"card.updated": "Card updated"
};

export const name = "a2ui-client";
export const inject = ["slots", "locale", "connection"];

// Exposed for harness/tests; dsh itself only consumes apply/inject.
export { A2uiToolView };

export function apply(ctx) {
	ctx.effect(() => ctx.locale.register(NS, { zh, en }), "a2ui: dictionaries");
	const api = ctx.get("connection").api;
	const View = (props) => <A2uiToolView {...props} api={api} />;
	ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
		name: "tool.call.toolview",
		key: "a2ui_render",
		locale: NS
	}, View));
	ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
		name: "tool.call.toolview",
		key: "a2ui_update",
		locale: NS
	}, A2uiUpdateView));
}
