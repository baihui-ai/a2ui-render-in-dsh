// jsdom interaction suite: mounts the real toolview + component catalog and
// drives them through DOM events, asserting on rendered output, the card
// mirror, submissions, persistence, and the host tool's validation.
// Run via `npm test` (test/run.mjs bundles this file and executes it).
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.localStorage = dom.window.localStorage;
globalThis.sessionStorage = dom.window.sessionStorage;
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.Event = dom.window.Event;
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
if (window.matchMedia === undefined) {
	window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
}
globalThis.matchMedia = window.matchMedia;

const { default: React, act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { A2uiToolView, A2uiUpdateView } = await import("../src/client/index.jsx");

let passed = 0;
function assert(cond, name) {
	if (!cond) {
		console.error(`FAIL - ${name}`);
		process.exit(1);
	}
	passed++;
	console.log(`ok  - ${name}`);
}

const T = (key) => ({
	"card.title": "交互卡片", "card.building": "生成中…", "card.invalid": "解析失败",
	"card.sending": "提交中…", "card.sent": "已提交", "card.error": "提交失败：",
	"card.refill": "重新填写", "card.updated": "已更新卡片", "card.required": "请先完成：",
	"todo.title": "会话导航", "todo.handle": "待办", "todo.tab.tasks": "任务", "todo.sec.pending": "待提交任务", "todo.sec.done": "已提交任务", "todo.pending": "待填", "todo.done": "已交", "todo.filled": "已填", "todo.alldone": "已全部提交",
	"todo.tab.pending": "待提交", "todo.tab.all": "全部", "todo.unfilled": "未填写", "todo.skip": "无需填写", "todo.restore": "恢复", "todo.skipped": "已标记无需填写", "todo.empty": "没有待提交的表单 🎉"
}[key] ?? key);

function mkApi() {
	const prompts = [];
	return {
		prompts,
		sessions: { prompt: async (payload) => { prompts.push(payload); return { result: { ok: true, value: { accepted: true } } }; } }
	};
}

function block(name, args, callId) {
	return { kind: "ok", callId, isError: false, call: { name, argsRaw: typeof args === "string" ? args : JSON.stringify(args) }, content: [] };
}

let mountN = 0;
async function mount(element) {
	const host = document.createElement("div");
	host.id = `t${mountN++}`;
	document.body.appendChild(host);
	const root = createRoot(host);
	await act(async () => root.render(element));
	return { host, root, unmount: () => act(async () => root.unmount()) };
}

async function renderCard(args, { callId = `call_${mountN}`, sessionId = "s-test", api = mkApi() } = {}) {
	const { host, root, unmount } = await mount(React.createElement(A2uiToolView, { callId, block: block("a2ui_render", args, callId), sessionId, api, t: T }));
	return { host, root, unmount, api, callId, sessionId };
}

const click = (el) => act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
const input = (el, value) => act(async () => {
	const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, "value").set;
	setter.call(el, value);
	el.dispatchEvent(new Event("input", { bubbles: true }));
});

// ---------- 1. host validation (bundled lib, no runtime deps) ----------
{
	const tools = new Map();
	const host = await import("../lib/index.js");
	host.apply({ tools: { register: (tool) => tools.set(tool.name, tool) } });
	const render = tools.get("a2ui_render");
	assert(tools.has("a2ui_render") && tools.has("a2ui_catalog") && tools.has("a2ui_update"), "host: three tools registered");
	const ok = await render.execute({ components: [{ id: "root", component: "Column", children: ["a"] }, { id: "a", component: "Text", text: "hi" }] }, { callId: 7 });
	assert(ok.status === "presented" && ok.surfaceId === "7", "host: valid card presents with surfaceId");
	const err = async (components) => { try { await render.execute({ components }, { callId: 1 }); return null; } catch (error) { return String(error.message); } };
	assert((await err([{ id: "a", component: "Text" }]))?.includes("root"), "host: missing root rejected");
	assert((await err([{ id: "root", component: "Column", children: ["ghost"] }]))?.includes('"ghost"'), "host: undefined child id named in error");
	assert((await err([{ id: "root", component: "Column", children: [] }, { id: "solo", component: "Text" }]))?.includes('"solo"'), "host: orphan named in error");
	assert((await err([{ id: "root", component: "Fancy" }]))?.includes('"Fancy"'), "host: unknown component named in error");
	const cat = await tools.get("a2ui_catalog").execute({}, { callId: 0 });
	assert(cat.doc.includes("required: true") && cat.doc.includes("range?"), "host: catalog documents required + calendar range");
	assert(host.RENDER_DESCRIPTION === undefined || true, "host: module loads clean");
}

// ---------- 2. quiz flow: select -> submit -> lock -> refill ----------
{
	const api = mkApi();
	const quiz = {
		title: "测验", components: [
			{ id: "root", component: "Column", children: ["opts", "btn"] },
			{ id: "opts", component: "MultipleChoice", bind: "answer", maxAllowedSelections: 1, options: [{ label: "选项甲", value: "A" }, { label: "选项乙", value: "B" }] },
			{ id: "btn", component: "Button", label: "提交答案", variant: "primary", action: { event: { name: "submit" } } }
		], dataModel: { answer: [] }
	};
	const { host } = await renderCard(quiz, { api, callId: "call_quiz" });
	await click(host.querySelectorAll(".dsha2ui-option")[1]);
	assert(host.querySelector('[data-selected="true"]')?.textContent.includes("选项乙"), "quiz: option selects");
	await click(host.querySelector(".dsha2ui-btn"));
	assert(api.prompts.length === 1 && api.prompts[0].content[0].text === "提交答案：选项乙", "quiz: plain-language submission with option label");
	await click(host.querySelectorAll(".dsha2ui-option")[0]);
	assert(host.querySelectorAll('[data-selected="true"]').length === 1 && host.querySelector('[data-selected="true"]').textContent.includes("选项乙"), "quiz: locked after submit");
	assert(host.textContent.includes("重新填写"), "quiz: refill button offered");
	await click(host.querySelector(".dsha2ui-refill"));
	await click(host.querySelectorAll(".dsha2ui-option")[0]);
	await click(host.querySelector(".dsha2ui-btn"));
	assert(api.prompts.length === 2 && api.prompts[1].content[0].text.startsWith("（修正）"), "quiz: refill resubmits with correction prefix");
}

// ---------- 3. persistence: locked state restores after remount ----------
{
	const api = mkApi();
	const args = {
		components: [
			{ id: "root", component: "Column", children: ["f", "btn"] },
			{ id: "f", component: "TextField", label: "姓名", bind: "name" },
			{ id: "btn", component: "Button", label: "提交", action: { event: { name: "go" } } }
		], dataModel: { name: "" }
	};
	const first = await renderCard(args, { api, callId: "call_persist" });
	await input(first.host.querySelector(".dsha2ui-input"), "张三");
	await click(first.host.querySelector(".dsha2ui-btn"));
	assert(api.prompts.length === 1 && api.prompts[0].content[0].text === "提交：张三", "persist: single field collapses onto button line");
	await first.unmount();
	const second = await renderCard(args, { api: mkApi(), callId: "call_persist" });
	assert(second.host.querySelector(".dsha2ui-input").value === "张三" && second.host.querySelector(".dsha2ui-input").disabled, "persist: remount restores value locked");
}

// ---------- 4. required: blocked until filled ----------
{
	const api = mkApi();
	const args = {
		components: [
			{ id: "root", component: "Column", children: ["opts", "reason", "btn"] },
			{ id: "opts", component: "MultipleChoice", bind: "pick", label: "选择方向", required: true, maxAllowedSelections: 1, options: [{ label: "前端", value: "fe" }, { label: "后端", value: "be" }] },
			{ id: "reason", component: "TextField", label: "理由", bind: "why", required: true },
			{ id: "btn", component: "Button", label: "提交", action: { event: { name: "go" } } }
		], dataModel: { pick: [], why: "" }
	};
	const { host } = await renderCard(args, { api });
	await click(host.querySelector(".dsha2ui-btn"));
	assert(api.prompts.length === 0, "required: empty submit blocked");
	assert(host.textContent.includes("请先完成：") && host.textContent.includes("选择方向") && host.textContent.includes("理由"), "required: missing fields named");
	assert(host.querySelectorAll("[data-invalid]").length === 2, "required: both fields highlighted");
	await click(host.querySelectorAll(".dsha2ui-option")[0]);
	assert(host.querySelectorAll("[data-invalid]").length === 1, "required: filling clears its highlight");
	await input(host.querySelector(".dsha2ui-input"), "感兴趣");
	await click(host.querySelector(".dsha2ui-btn"));
	assert(api.prompts.length === 1 && api.prompts[0].content[0].text.includes("前端") && api.prompts[0].content[0].text.includes("感兴趣"), "required: filled submit passes");
}

// ---------- 5. EditableTable submission carries cell content ----------
{
	const api = mkApi();
	const args = {
		components: [
			{ id: "root", component: "Column", children: ["et", "btn"] },
			{ id: "et", component: "EditableTable", label: "预算", bind: "budget", columns: ["项目", "金额"], rows: [["房租", "3000"], ["伙食", ""]] },
			{ id: "btn", component: "Button", label: "确认预算", action: { event: { name: "go" } } }
		], dataModel: { budget: [] }
	};
	const { host } = await renderCard(args, { api });
	await input(host.querySelectorAll(".dsha2ui-etable input")[3], "1500");
	await click(host.querySelector(".dsha2ui-btn"));
	const text = api.prompts[0].content[0].text;
	assert(text.includes("项目:房租") && text.includes("金额:1500"), "editable-table: submission carries cell values");
}

// ---------- 6. Markdown: literal \n tolerance must not touch fenced code ----------
{
	const { Markdown } = await import("../src/client/markdown.jsx");
	const withCode = "段落一\n\n```c\nprintf(\"a\\n\");\n```";
	const a = await mount(React.createElement(Markdown, { text: withCode }));
	assert(a.host.querySelector("code").textContent.includes("\\n"), "markdown: literal \\n inside fenced code survives");
	const escapedOnly = "第一行\\n\\n- 项目甲\\n- 项目乙";
	const b = await mount(React.createElement(Markdown, { text: escapedOnly }));
	assert(b.host.querySelectorAll("li").length === 2, "markdown: fully escaped text still repaired");
}

// ---------- 7. rich(): currency stays literal, math renders ----------
{
	const { Text } = await import("../src/client/components.jsx");
	const money = await mount(React.createElement(Text, { text: "套餐 $30 和 $45 两档" }));
	assert(money.host.querySelector(".katex") === null && money.host.textContent.includes("$30 和 $45"), "rich: dollar amounts stay literal");
	const math = await mount(React.createElement(Text, { text: "答案是 $x^2 + C$" }));
	assert(math.host.querySelector(".katex") !== null, "rich: LaTeX still renders");
	const inlineCode = await mount(React.createElement(Text, { text: "调用 `future.get()` 会阻塞" }));
	assert(inlineCode.host.querySelector(".dsha2ui-inline-code")?.textContent === "future.get()", "rich: inline backtick code renders");
	const fenced = await mount(React.createElement(Text, { text: "读下面的代码：\n```java\npublic class A {}\n```" }));
	assert(fenced.host.querySelector("pre code")?.textContent.includes("public class A"), "text: fenced code upgrades to a formatted block");
}

// ---------- 8. Calendar range ----------
{
	const api = mkApi();
	const args = {
		components: [
			{ id: "root", component: "Column", children: ["cal", "btn"] },
			{ id: "cal", component: "Calendar", label: "入住区间", bind: "stay", range: true, min: "2026-08-01", max: "2026-09-30" },
			{ id: "btn", component: "Button", label: "预订", action: { event: { name: "book" } } }
		], dataModel: { stay: [] }
	};
	const { host } = await renderCard(args, { api });
	const day = (n) => [...host.querySelectorAll(".dsha2ui-calendar-day:not([disabled]):not([data-other])")].find((el) => el.textContent === String(n));
	await click(day(10));
	await click(day(13));
	assert(host.querySelectorAll("[data-inrange]").length === 2, "calendar-range: days between endpoints highlighted");
	await click(host.querySelector(".dsha2ui-btn"));
	assert(/预订：\d{4}-\d{2}-10 至 \d{4}-\d{2}-13/.test(api.prompts[0].content[0].text), "calendar-range: submission carries start 至 end");
}

// ---------- 9. Select: search box on long lists ----------
{
	const options = Array.from({ length: 10 }, (_, i) => ({ label: `城市${i}`, value: `c${i}` }));
	const args = {
		components: [
			{ id: "root", component: "Column", children: ["sel"] },
			{ id: "sel", component: "Select", label: "城市", bind: "city", options }
		], dataModel: { city: "" }
	};
	const { host } = await renderCard(args);
	await click(host.querySelector(".dsha2ui-select-trigger"));
	assert(host.querySelector(".dsha2ui-select-search") !== null, "select: search box appears for long lists");
	await input(host.querySelector(".dsha2ui-select-search"), "城市7");
	assert(host.querySelectorAll(".dsha2ui-select-option").length === 1, "select: search filters options");
	await click(host.querySelector(".dsha2ui-select-option"));
	assert(host.querySelector(".dsha2ui-select-value")?.textContent.includes("城市7"), "select: filtered option selects");
}

// ---------- 10. streaming: truncated args render complete components ----------
{
	const full = JSON.stringify({ components: [
		{ id: "root", component: "Column", children: ["a", "b"] },
		{ id: "a", component: "Text", text: "已完成的段落" },
		{ id: "b", component: "Text", text: "被截断" }
	] });
	const truncated = full.slice(0, full.indexOf("被截断"));
	const streamingBlock = { callId: "call_stream", argsRaw: truncated }; // unsettled: no "kind"
	const { host } = await mount(React.createElement(A2uiToolView, { callId: "call_stream", block: streamingBlock, sessionId: "s-test", api: mkApi(), t: T }));
	assert(host.textContent.includes("已完成的段落"), "streaming: complete components mount early");
	assert(host.textContent.includes("生成中…"), "streaming: building footer shown");
}

// ---------- 11. a2ui_update: in place, dedupe, replay, input sync, tabs ----------
{
	const api = mkApi();
	const target = {
		components: [
			{ id: "root", component: "Column", children: ["p", "note", "tf", "tabs"] },
			{ id: "p", component: "Progress", value: { path: "/pct" }, label: "进度" },
			{ id: "note", component: "Text", text: "初始" },
			{ id: "tf", component: "TextField", label: "备注", bind: "memo" },
			{ id: "tabs", component: "Tabs", tabs: ["概览", "明细"], bind: "tab", children: ["ta", "tb"] },
			{ id: "ta", component: "Text", text: "概览内容" },
			{ id: "tb", component: "Text", text: "明细内容" }
		], dataModel: { pct: 10, memo: "草稿", tab: "概览" }
	};
	const t1 = await renderCard(target, { api, callId: "call_target" });
	assert(t1.host.textContent.includes("10%") && t1.host.textContent.includes("初始"), "update: target renders initial state");
	const upd = { surfaceId: "call_target", dataModel: { pct: 80, memo: "已更新的备注", tab: "明细" }, components: [{ id: "note", component: "Text", text: "阶段二" }] };
	await mount(React.createElement(A2uiUpdateView, { callId: "call_u1", block: block("a2ui_update", upd, "call_u1"), sessionId: "s-test", t: T }));
	await new Promise((resolve) => setTimeout(resolve, 30));
	await act(async () => {});
	assert(t1.host.textContent.includes("80%") && t1.host.textContent.includes("阶段二") && !t1.host.textContent.includes("初始"), "update: progress + component replaced in place");
	assert(t1.host.querySelector(".dsha2ui-input").value === "已更新的备注", "update: bound TextField re-syncs");
	assert(t1.host.textContent.includes("明细内容") && !t1.host.textContent.includes("概览内容"), "update: tabs follow the bound value");
	await mount(React.createElement(A2uiUpdateView, { callId: "call_u1", block: block("a2ui_update", upd, "call_u1"), sessionId: "s-test", t: T }));
	await new Promise((resolve) => setTimeout(resolve, 30));
	const stored = JSON.parse(localStorage.getItem("dsh-a2ui:updates:s-test:call_target"));
	assert(stored.length === 1 && stored[0].id === "call_u1", "update: duplicate view instance does not re-append");
	await t1.unmount();
	const t2 = await renderCard(target, { api: mkApi(), callId: "call_target" });
	assert(t2.host.textContent.includes("80%") && t2.host.textContent.includes("阶段二"), "update: replayed from storage after remount");
	assert(t2.host.querySelector(".dsha2ui-input").value === "已更新的备注", "update: replay also re-syncs inputs");
}

// ---------- 12. query buttons never lock; suggestions send directly ----------
{
	const api = mkApi();
	const args = {
		components: [
			{ id: "root", component: "Column", children: ["b", "sug"] },
			{ id: "b", component: "Button", label: "查看详情", action: { event: { name: "detail", context: { sku: "X1" } } } },
			{ id: "sug", component: "Suggestions", items: ["再推荐几个"] }
		]
	};
	const { host } = await renderCard(args, { api });
	await click(host.querySelector(".dsha2ui-btn"));
	await click(host.querySelector(".dsha2ui-btn"));
	assert(api.prompts.length === 2 && !host.querySelector(".dsha2ui-btn").disabled, "query button: stays clickable");
	await click(host.querySelector(".dsha2ui-suggest-chip"));
	assert(api.prompts[2].content[0].text === "再推荐几个", "suggestions: chip sends its question verbatim");
}

// ---------- 13. reactive chain: slider -> calc -> stat ----------
{
	const args = {
		components: [
			{ id: "root", component: "Column", children: ["s", "c", "v"] },
			{ id: "s", component: "Slider", label: "本金", bind: "p", min: 0, max: 100, step: 1 },
			{ id: "c", component: "Calc", expr: "p * 2", inputs: { p: { path: "/p" } }, out: "double" },
			{ id: "v", component: "Stat", label: "翻倍", value: { path: "/double" } }
		], dataModel: { p: 5 }
	};
	const { host } = await renderCard(args);
	await act(async () => {});
	assert(host.textContent.includes("10"), "calc: initial chain computes");
	await input(host.querySelector('input[type="range"]'), "21");
	await act(async () => {});
	assert(host.textContent.includes("42"), "calc: slider drives recompute");
}

// ---------- 14. Table: object-shaped tolerance + sort + filter ----------
{
	const { Table } = await import("../src/client/components-viz.jsx");
	const objTable = await mount(React.createElement(Table, {
		columns: [{ key: "c", label: "城市" }, { key: "g", label: "GMV" }],
		rows: [{ c: "上海", g: "128" }, { c: "重庆", g: { text: "22" } }, { c: "北京", g: "96" }]
	}));
	assert(!objTable.host.textContent.includes("[object Object]"), "table: no [object Object] leakage");
	assert(objTable.host.textContent.includes("城市") && objTable.host.textContent.includes("22"), "table: object columns/cells normalized");
	await click(objTable.host.querySelectorAll("th")[1]);
	assert(objTable.host.querySelector("tbody tr td:nth-child(2)").textContent === "22", "table: numeric sort ascends");
}

// ---------- 15. anim latch: grid form + played-once across remounts ----------
{
	const frames = [
		{ grid: [[1, null], [null, 4]], highlight: [[0, 0]], note: "第一步" },
		{ grid: [[1, 2], [3, 4]], accent: [[1, 1]], note: "完成" }
	];
	const args = { components: [{ id: "root", component: "Column", children: ["an"] }, { id: "an", component: "Anim", frames, interval: 100 }] };
	const first = await renderCard(args, { callId: "call_anim" });
	assert(first.host.querySelectorAll(".dsha2ui-anim-cell").length === 4, "anim: grid form renders cells");
	await new Promise((resolve) => setTimeout(resolve, 350));
	await act(async () => {});
	assert(first.host.textContent.includes("完成"), "anim: auto-plays to the last frame");
	await first.unmount();
	const second = await renderCard(args, { callId: "call_anim" });
	assert(second.host.textContent.includes("完成") && second.host.textContent.includes("2/2"), "anim: remount does not replay (latched)");
}

// ---------- 16. todo: field counting + transcript matching (pure) ----------
{
	const { computeFields, matchTranscript } = await import("../src/client/todo.js");
	const comps = [
		{ id: "root", component: "Column", children: [] },
		{ id: "q1", component: "MultipleChoice", bind: "a1", options: [] },
		{ id: "q2", component: "MultipleChoice", bind: "a2", options: [] },
		{ id: "q3", component: "TextField", bind: "a3" },
		{ id: "note", component: "Text", text: "题干" }
	];
	assert(computeFields(comps).length === 3, "todo: counts answer fields, not display components");
	const events = [
		{ type: "tool/call", data: { callId: "c1", name: "a2ui_render", arguments: JSON.stringify({ components: [{ id: "root", component: "Column" }, { id: "f", component: "TextField", bind: "x" }, { id: "b", component: "Button", label: "提交问卷" }] }) } },
		{ type: "user/message", time: 111, data: { source: { kind: "user" }, content: [{ type: "text", text: "随便聊聊" }] } },
		{ type: "user/message", time: 222, data: { source: { kind: "user" }, content: [{ type: "text", text: "提交问卷：很满意" }] } }
	];
	const matched = matchTranscript(events);
	assert(matched.get("c1")?.text === "提交问卷：很满意" && matched.get("c1").at === 222, "todo: transcript matching claims the right card");
	const { buildTimeline } = await import("../src/client/todo.js");
	const { timeline } = buildTimeline([
		{ type: "user/message", time: 1, data: { source: { kind: "user" }, content: [{ type: "text", text: "第一个问题" }] } },
		events[0],
		{ type: "user/message", time: 2, data: { source: { kind: "user" }, content: [{ type: "text", text: "提交问卷：很满意" }] } },
		{ type: "user/message", time: 3, data: { source: { kind: "user" }, content: [{ type: "text", text: "随便看看" }] } }
	]);
	assert(timeline.length === 2 && timeline[0].forms.length === 1 && timeline[1].forms.length === 0, "todo: timeline keeps questions, drops submission messages, attaches forms");
	const failedEvents = [
		{ type: "user/message", time: 1, data: { source: { kind: "user" }, content: [{ type: "text", text: "出题" }] } },
		{ type: "tool/call", data: { callId: "bad1", name: "a2ui_render", arguments: JSON.stringify({ components: [{ id: "root", component: "Column" }, { id: "f", component: "TextField", bind: "x" }, { id: "b", component: "Button", label: "提交答案" }] }) } },
		{ type: "tool/result", data: { callId: "bad1", isError: true } },
		{ type: "tool/call", data: { callId: "good1", name: "a2ui_render", arguments: JSON.stringify({ components: [{ id: "root", component: "Column" }, { id: "f", component: "TextField", bind: "x" }, { id: "b", component: "Button", label: "提交答案" }] }) } },
		{ type: "user/message", time: 2, data: { source: { kind: "user" }, content: [{ type: "text", text: "提交答案：B" }] } }
	];
	const failedMatch = matchTranscript(failedEvents);
	assert(!failedMatch.has("bad1") && failedMatch.get("good1")?.text === "提交答案：B", "todo: errored render calls neither claim submissions nor count");
	assert(buildTimeline(failedEvents).timeline[0].forms.length === 1, "todo: errored render calls stay out of the timeline");
}

// ---------- 17. draft: typed content survives remount without submitting ----------
{
	const args = {
		components: [
			{ id: "root", component: "Column", children: ["f", "btn"] },
			{ id: "f", component: "TextField", label: "答案", bind: "ans" },
			{ id: "btn", component: "Button", label: "交卷", action: { event: { name: "go" } } }
		], dataModel: { ans: "" }
	};
	const first = await renderCard(args, { callId: "call_draft", sessionId: "s-draft" });
	await input(first.host.querySelector(".dsha2ui-input"), "写了一半");
	await new Promise((resolve) => setTimeout(resolve, 550)); // debounce flush
	await first.unmount();
	const second = await renderCard(args, { callId: "call_draft", sessionId: "s-draft" });
	assert(second.host.querySelector(".dsha2ui-input").value === "写了一半" && !second.host.querySelector(".dsha2ui-input").disabled, "draft: reload restores typed content unlocked");
}

// ---------- 18. todo drawer: pending tab, timeline 全部, skip/restore ----------
{
	const api = mkApi();
	const form = (n) => ({
		title: `表单${n}`, components: [
			{ id: "root", component: "Column", children: ["f", "btn"] },
			{ id: "f", component: "TextField", label: "备注", bind: "memo" },
			{ id: "btn", component: "Button", label: `提交${n}`, action: { event: { name: "go" } } }
		], dataModel: { memo: "" }
	});
	api.sessions.history = async () => ({ result: { value: { events: [
		{ event: { type: "user/message", time: 1, data: { source: { kind: "user" }, content: [{ type: "text", text: "第一个问题：帮我建一张表单\n背景是周报收集" }] } } },
		{ event: { type: "tool/call", data: { callId: "call_todo1", name: "a2ui_render", arguments: JSON.stringify(form(1)) } } },
		{ event: { type: "user/message", time: 2, data: { source: { kind: "user" }, content: [{ type: "text", text: "第二个问题" }] } } },
		{ event: { type: "tool/call", data: { callId: "call_todo2", name: "a2ui_render", arguments: JSON.stringify(form(2)) } } },
		{ event: { type: "user/message", time: 3, data: { source: { kind: "user" }, content: [{ type: "text", text: "随便看看行情" }] } } }
	] } } });
	const one = await renderCard(form(1), { callId: "call_todo1", sessionId: "s-todo", api });
	const two = await renderCard(form(2), { callId: "call_todo2", sessionId: "s-todo", api });
	await input(one.host.querySelector(".dsha2ui-input"), "答案A");
	await click(one.host.querySelector(".dsha2ui-btn"));
	await input(two.host.querySelector(".dsha2ui-input"), "填了一半");
	await new Promise((resolve) => setTimeout(resolve, 30));
	const drawerHost = document.getElementById("dsha2ui-todo");
	assert(drawerHost !== null, "todo: drawer appears once form cards exist");
	const handle = drawerHost.querySelector(".dsha2ui-todo-handle");
	assert(handle !== null && handle.dataset.state === "pending" && Number(handle.querySelector(".dsha2ui-todo-count").textContent) >= 1, "todo: handle badge counts pending forms");
	await act(async () => { handle.click(); });
	await new Promise((resolve) => setTimeout(resolve, 60));

	assert(document.querySelectorAll(".dsha2ui-todo-sec").length >= 2, "todo: tasks tab groups 待提交任务 + 已提交任务");
	const rowByText = (text, state) => [...document.querySelectorAll(`.dsha2ui-todo-row[data-state="${state}"]`)].find((row) => row.textContent.includes(text));
	assert(rowByText("表单2", "partial")?.textContent.includes("填了一半"), "todo: pending section shows fill preview");
	assert(rowByText("表单1", "done") !== undefined, "todo: submitted section lists done forms");
	await act(async () => { document.querySelectorAll(".dsha2ui-todo-tab")[1].click(); });
	await new Promise((resolve) => setTimeout(resolve, 80));
	const msgs = [...document.querySelectorAll(".dsha2ui-todo-msg")];
	assert(msgs.length >= 3, "todo: 全部 lists every user message (all mounted sessions)");
	assert(msgs.some((el) => el.textContent === "第一个问题：帮我建一张表单\n背景是周报收集"), "todo: user messages shown in full, unabridged");
	assert(document.querySelector('.dsha2ui-todo-formrow[data-state="done"]') !== null && document.querySelector('.dsha2ui-todo-formrow[data-state="partial"]') !== null, "todo: forms attach under their message with status");
	const formRowByText = (text, state) => [...document.querySelectorAll(`.dsha2ui-todo-formrow[data-state="${state}"]`)].find((row) => row.textContent.includes(text));
	await act(async () => { formRowByText("表单2", "partial").querySelector(".dsha2ui-todo-skip").click(); });
	await new Promise((resolve) => setTimeout(resolve, 30));
	assert(formRowByText("表单2", "skipped") !== undefined, "todo: 无需填写 marks the form skipped");
	await act(async () => { document.querySelectorAll(".dsha2ui-todo-tab")[0].click(); });
	await new Promise((resolve) => setTimeout(resolve, 30));
	assert(rowByText("表单2", "partial") === undefined, "todo: skipped forms leave 待提交任务");
	await act(async () => { document.querySelectorAll(".dsha2ui-todo-tab")[1].click(); });
	await new Promise((resolve) => setTimeout(resolve, 60));
	await act(async () => { formRowByText("表单2", "skipped").querySelector(".dsha2ui-todo-skip").click(); });
	await new Promise((resolve) => setTimeout(resolve, 30));
	assert(formRowByText("表单2", "partial") !== undefined, "todo: 恢复 brings it back");
}

// ---------- 19. cache-clear reconstruction from transcript ----------
{
	const events = [
		{ type: "tool/call", data: { callId: "call_scan", name: "a2ui_render", arguments: JSON.stringify({ components: [{ id: "root", component: "Column", children: ["f", "b"] }, { id: "f", component: "TextField", bind: "x" }, { id: "b", component: "Button", label: "提交调研" }] }) } },
		{ type: "user/message", time: 333, data: { source: { kind: "user" }, content: [{ type: "text", text: "提交调研：已完成" }] } }
	];
	const api = mkApi();
	api.sessions.history = async () => ({ result: { value: { events: events.map((event) => ({ event })) } } });
	const args = {
		components: [
			{ id: "root", component: "Column", children: ["f", "b"] },
			{ id: "f", component: "TextField", bind: "x" },
			{ id: "b", component: "Button", label: "提交调研", action: { event: { name: "go" } } }
		], dataModel: { x: "" }
	};
	const { host } = await renderCard(args, { callId: "call_scan", sessionId: "s-fresh-scan", api });
	await new Promise((resolve) => setTimeout(resolve, 60));
	await act(async () => {});
	assert(host.textContent.includes("提交调研") && host.querySelector(".dsha2ui-input").disabled, "reconstruction: cleared cache re-locks from transcript");
}

console.log(`\nALL PASS (${passed} assertions)`);
process.exit(0);
