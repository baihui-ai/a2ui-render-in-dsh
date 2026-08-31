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
	"card.updated": "已更新卡片",
	"card.required": "请先完成：",
	"todo.title": "会话导航",
	"todo.handle": "待办",
	"todo.tab.tasks": "任务",
	"todo.tab.pending": "待提交",
	"todo.sec.pending": "待提交任务",
	"todo.sec.done": "已提交任务",
	"todo.tab.all": "全部",
	"todo.unfilled": "未填写",
	"todo.skip": "无需填写",
	"todo.restore": "恢复",
	"todo.skipped": "已标记无需填写",
	"todo.empty": "没有待提交的表单 🎉",
	"todo.pending": "待填",
	"todo.done": "已交",
	"todo.filled": "已填",
	"todo.alldone": "已全部提交"
};

const en = {
	"card.title": "Interactive card",
	"card.building": "Building interface…",
	"card.invalid": "Could not parse the UI payload",
	"card.sending": "Submitting…",
	"card.sent": "Submitted",
	"card.error": "Submit failed:",
	"card.refill": "Refill",
	"card.updated": "Card updated",
	"card.required": "Please complete: ",
	"todo.title": "Session navigator",
	"todo.handle": "To-dos",
	"todo.tab.tasks": "Tasks",
	"todo.tab.pending": "Pending",
	"todo.sec.pending": "To submit",
	"todo.sec.done": "Submitted",
	"todo.tab.all": "All",
	"todo.unfilled": "Not filled",
	"todo.skip": "Not needed",
	"todo.restore": "Restore",
	"todo.skipped": "Marked not needed",
	"todo.empty": "Nothing pending 🎉",
	"todo.pending": "To fill",
	"todo.done": "Submitted",
	"todo.filled": "Filled",
	"todo.alldone": "All submitted"
};

export const name = "a2ui-client";
export const inject = ["slots", "locale", "connection"];

// Exposed for harness/tests; dsh itself only consumes apply/inject.
export { A2uiToolView, A2uiUpdateView };

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
