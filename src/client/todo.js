// 表单待办 (form to-dos): a per-session floating panel tracking every form
// card — how many fields are filled (12/30), which cards are submitted, and
// click-to-locate. Submitted state survives a cleared browser cache by being
// reconstructed from the session transcript (the only durable source: the
// render tool-calls and the plain-language submission messages themselves).
// Unsubmitted DRAFTS cannot outlive a cache clear — their content never left
// the browser — but they do survive reloads via localStorage (see toolview).

const INPUT_FIELDS = new Set([
	"MultipleChoice", "TextField", "Select", "Rate", "Calendar", "Upload", "RankList", "EditableTable"
]);

/** Extract the countable answer fields of a card: [{path, kind}]. */
export function computeFields(components) {
	const fields = [];
	for (const node of Array.isArray(components) ? components : []) {
		if (node === null || typeof node !== "object" || !INPUT_FIELDS.has(node.component)) continue;
		const bind = typeof node.bind === "string" && node.bind !== "" ? node.bind : node.component === "Upload" ? "uploads" : null;
		if (bind === null) continue;
		fields.push({ path: bind.startsWith("/") ? bind : `/${bind}`, kind: node.component });
	}
	return fields;
}

export function fieldFilled(value, kind) {
	if (kind === "Rate") return typeof value === "number" && value > 0;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return true;
	return value !== undefined && value !== null && String(value) !== "";
}

/**
 * Reconstruct submitted-state from transcript events: render calls carry a
 * callId and their button labels; a later user message whose first line is
 * one of those labels claims the earliest unclaimed matching card.
 * @returns Map(callId -> {text, at})
 */
/** Call ids whose tool execution ERRORED (host validation rejects) — they
 * rendered nothing and must not claim submissions or appear in timelines. */
function failedCallIds(events) {
	const failed = new Set();
	for (const event of Array.isArray(events) ? events : []) {
		if (event?.type !== "tool/result") continue;
		// flat shape (tests/other versions)
		if (event.data?.isError === true && typeof event.data.callId === "string") failed.add(event.data.callId);
		// dsh transcript shape: data.message.content[].{type:"tool-result", toolCallId, isError}
		for (const part of Array.isArray(event.data?.message?.content) ? event.data.message.content : []) {
			if (part?.type === "tool-result" && part.isError === true && typeof part.toolCallId === "string") failed.add(part.toolCallId);
		}
	}
	return failed;
}

export function matchTranscript(events) {
	const cards = []; // {callId, labels, claimed}
	const submitted = new Map();
	const failed = failedCallIds(events);
	for (const event of Array.isArray(events) ? events : []) {
		if (event === null || typeof event !== "object") continue;
		if (event.type === "tool/call" && event.data?.name === "a2ui_render" && typeof event.data.callId === "string" && !failed.has(event.data.callId)) {
			let args = null;
			try { args = JSON.parse(event.data.arguments); } catch { continue; }
			const components = Array.isArray(args?.components) ? args.components : [];
			if (computeFields(components).length === 0) continue; // browse cards have no submission to track
			const labels = new Set(["提交"]);
			for (const node of components) {
				if (node === null || typeof node !== "object") continue;
				if (node.component === "Button" && typeof node.label === "string" && node.label !== "") labels.add(node.label);
				if (node.component === "Wizard" && typeof node.submitLabel === "string" && node.submitLabel !== "") labels.add(node.submitLabel);
			}
			cards.push({ callId: event.data.callId, labels, claimed: false });
		} else if (event.type === "user/message" && event.data?.source?.kind === "user") {
			const part = Array.isArray(event.data.content) ? event.data.content.find((p) => p?.type === "text") : null;
			if (part === null || part === undefined || typeof part.text !== "string") continue;
			const firstLine = part.text.replace(/^（修正）/, "").split("\n")[0];
			const hit = cards.find((card) => !card.claimed && [...card.labels].some((label) => firstLine === label || firstLine.startsWith(`${label}：`)));
			if (hit !== undefined) {
				hit.claimed = true;
				submitted.set(hit.callId, { text: part.text.replace(/^（修正）/, ""), at: typeof event.time === "number" ? event.time : undefined });
			} else {
				// A correction re-submission targets an already-claimed card.
				const again = cards.find((card) => card.claimed && [...card.labels].some((label) => firstLine === label || firstLine.startsWith(`${label}：`)));
				if (again !== undefined) submitted.set(again.callId, { text: part.text.replace(/^（修正）/, ""), at: typeof event.time === "number" ? event.time : undefined });
			}
		}
	}
	return submitted;
}

/**
 * The 全部 tab's navigation timeline: every REAL user message (submission
 * messages and runtime snapshots excluded), each carrying the form cards the
 * model rendered in response (until the next user message).
 */
export function buildTimeline(events) {
	const submitted = matchTranscript(events);
	const claimedTexts = new Set([...submitted.values()].map((entry) => entry.text));
	const failed = failedCallIds(events);
	const timeline = [];
	let current = null;
	for (const event of Array.isArray(events) ? events : []) {
		if (event === null || typeof event !== "object") continue;
		if (event.type === "user/message" && event.data?.source?.kind === "user") {
			const part = Array.isArray(event.data.content) ? event.data.content.find((p) => p?.type === "text") : null;
			const text = typeof part?.text === "string" ? part.text : "";
			const plain = text.replace(/^（修正）/, "");
			if (text === "" || text.startsWith("<system-reminder>") || text.startsWith("Current runtime context")) continue;
			if (claimedTexts.has(plain)) continue; // card submissions are outcomes, not questions
			current = { text, time: typeof event.time === "number" ? event.time : undefined, forms: [] };
			timeline.push(current);
		} else if (event.type === "tool/call" && event.data?.name === "a2ui_render" && typeof event.data.callId === "string" && !failed.has(event.data.callId)) {
			try {
				const args = JSON.parse(event.data.arguments);
				if (computeFields(Array.isArray(args?.components) ? args.components : []).length === 0) continue;
				current?.forms.push({ callId: event.data.callId, title: typeof args.title === "string" && args.title !== "" ? args.title : "" });
			} catch { /* streaming残片 */ }
		}
	}
	return { submitted, timeline };
}

/** One transcript scan per session, shared by every card on the page. */
const scans = new Map(); // sessionId -> Promise<{submitted, timeline}>
const timelines = new Map(); // sessionId -> {submitted, timeline} (resolved)

export function scanSession(api, sessionId) {
	if (scans.has(sessionId)) return scans.get(sessionId);
	const promise = (async () => {
		try {
			let events = null;
			const viaApi = api?.sessions?.history;
			if (typeof viaApi === "function") {
				const { result } = await viaApi({ sessionId, maxMessages: 1000 });
				events = result?.value?.events?.map((entry) => entry?.event ?? entry);
			}
			if (!Array.isArray(events)) {
				const response = await fetch("/api/session.history", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ type: "client-request", rpcId: "a2ui-todo-scan", method: "session.history", payload: { sessionId, maxMessages: 1000 } })
				});
				const body = await response.json();
				events = body?.result?.value?.events?.map((entry) => entry?.event ?? entry);
			}
			const built = buildTimeline(events ?? []);
			timelines.set(sessionId, built);
			queueRender();
			return built;
		} catch {
			return { submitted: new Map(), timeline: [] }; // offline — cards stay unlocked
		}
	})();
	scans.set(sessionId, promise);
	return promise;
}

/** Drop the cached scan (a fresh submission makes it stale for later mounts). */
export function invalidateScan(sessionId) {
	scans.delete(sessionId);
}

// ---------------------------------------------------------------------------
// User-dismissable rows: 无需填写 marks a form as not-needed (kept, undoable).

function skipKey(sessionId, callId) {
	return `dsh-a2ui:skipped:${sessionId}:${callId}`;
}
export function isSkipped(sessionId, callId) {
	try { return localStorage.getItem(skipKey(sessionId, callId)) !== null; } catch { return false; }
}
function setSkipped(sessionId, callId, next) {
	try {
		if (next) localStorage.setItem(skipKey(sessionId, callId), JSON.stringify({ at: Date.now() }));
		else localStorage.removeItem(skipKey(sessionId, callId));
	} catch { /* storage unavailable */ }
}

// ---------------------------------------------------------------------------
// Registry + floating panel (vanilla DOM: one fixed element per page).

const cards = new Map(); // callId -> {sessionId, title, kind, fields, mirror, getNode, status, order}
let orderCounter = 0;
let panel = null;
let tRef = (key) => key;
let renderQueued = false;

function queueRender() {
	if (renderQueued) return;
	renderQueued = true;
	requestAnimationFrame(() => {
		renderQueued = false;
		renderPanel();
	});
}

export function registerTodoCard(entry) {
	const record = { ...entry, order: orderCounter++ };
	cards.set(entry.callId, record);
	tRef = entry.t ?? tRef;
	const unsubscribe = entry.mirror?.subscribe?.(queueRender) ?? (() => {});
	queueRender();
	return () => {
		unsubscribe();
		if (cards.get(entry.callId) === record) cards.delete(entry.callId);
		queueRender();
	};
}

export function updateTodoStatus(callId, status) {
	const record = cards.get(callId);
	if (record === undefined) return;
	record.status = status;
	queueRender();
}

export function pingTodo() {
	queueRender();
}

function currentSessionId() {
	let latest = null;
	for (const record of cards.values()) {
		if (latest === null || record.order > latest.order) latest = record;
	}
	return latest?.sessionId ?? null;
}

function progressOf(record) {
	const total = record.fields.length;
	let filled = 0;
	for (const field of record.fields) {
		if (fieldFilled(record.mirror?.get?.(field.path), field.kind)) filled++;
	}
	return { filled, total };
}

/** Short preview of what is already filled in (from the display texts). */
function previewOf(record) {
	const parts = [];
	for (const display of record.mirror?.displays?.values?.() ?? []) {
		if (typeof display?.text !== "string" || display.text === "") continue;
		parts.push(display.name !== undefined && display.name !== "" ? `${display.name}:${display.text}` : display.text);
	}
	const joined = parts.join("、").replace(/\n/g, " ");
	return joined.length > 42 ? `${joined.slice(0, 42)}…` : joined;
}

/**
 * Locate a user message inside the host chat DOM by text: pick the smallest
 * element containing the message's first line, scroll to and flash it.
 */
function findByText(needle) {
	let best = null;
	for (const el of document.body.querySelectorAll("div,p,span,section,article,li")) {
		if (el.closest("#dsha2ui-todo") !== null) continue;
		const content = el.textContent ?? "";
		if (!content.includes(needle)) continue;
		if (best === null || content.length <= (best.textContent ?? "").length) best = el;
	}
	return best;
}

/** The chat's scrollable ancestor (used to trigger lazy "load earlier"). */
function chatScroller() {
	for (const record of cards.values()) {
		let node = record.getNode?.();
		while (node !== null && node !== undefined && node !== document.body) {
			if (node.scrollHeight > node.clientHeight + 20) return node;
			node = node.parentElement;
		}
	}
	return document.scrollingElement ?? document.documentElement;
}

function flashNode(node) {
	node.scrollIntoView?.({ behavior: "smooth", block: "center" });
	node.classList.remove("dsha2ui-flash");
	requestAnimationFrame(() => node.classList.add("dsha2ui-flash"));
}

/**
 * Locate a user message by text. Older messages may not be in the DOM yet
 * (the chat lazy-loads history) — retry after scrolling the chat to the top
 * and clicking any visible 加载/更早/更多 control, up to 8 rounds.
 */
async function locateText(text) {
	const needle = String(text).split("\n")[0].trim().slice(0, 80);
	if (needle === "") return;
	for (let round = 0; round < 8; round++) {
		const hit = findByText(needle);
		if (hit !== null) {
			flashNode(hit);
			return;
		}
		const loader = [...document.querySelectorAll("button,[role=button]")].find((el) =>
			el.closest("#dsha2ui-todo") === null && /加载|更早|更多|earlier|more/i.test(el.textContent ?? ""));
		if (loader !== undefined) loader.click();
		else chatScroller().scrollTop = 0;
		await new Promise((resolve) => setTimeout(resolve, 650));
	}
}

function collapsedKey(sessionId) {
	return `dsh-a2ui:todo-collapsed:${sessionId}`;
}

function tabKey(sessionId) {
	return `dsh-a2ui:todo-tab:${sessionId}`;
}

/** Resolve a row's display state: done > skipped > partial > empty > browse. */
function rowState(record) {
	if (record.kind !== "form") return { key: "browse" };
	if (record.status?.kind === "done") return { key: "done", at: record.status.at };
	if (isSkipped(record.sessionId, record.callId)) return { key: "skipped" };
	const { filled, total } = progressOf(record);
	return { key: filled > 0 ? "partial" : "empty", filled, total };
}

function fmtAt(at) {
	if (typeof at !== "number") return "";
	const d = new Date(at);
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function stateLabel(state) {
	if (state.key === "done") return `✓ ${tRef("todo.done")}${typeof state.at === "number" ? ` ${new Date(state.at).getHours()}:${String(new Date(state.at).getMinutes()).padStart(2, "0")}` : ""}`;
	if (state.key === "skipped") return tRef("todo.skipped");
	if (state.key === "partial") return `${tRef("todo.filled")} ${state.filled}/${state.total}`;
	if (state.key === "empty") return state.total > 0 ? `${tRef("todo.unfilled")} 0/${state.total}` : tRef("todo.unfilled");
	return "";
}

function renderPanel() {
	if (typeof document === "undefined") return;
	const sessionId = currentSessionId();
	const list = [...cards.values()].filter((record) => record.sessionId === sessionId).sort((a, b) => a.order - b.order);
	const forms = list.filter((record) => record.kind === "form");
	if (sessionId === null || forms.length === 0) {
		panel?.remove();
		panel = null;
		return;
	}
	if (panel === null) {
		panel = document.createElement("div");
		panel.id = "dsha2ui-todo";
		document.body.appendChild(panel);
	}
	const pending = forms.filter((record) => ["empty", "partial"].includes(rowState(record).key));
	let open = false;
	let tab = "pending";
	try {
		open = sessionStorage.getItem(collapsedKey(sessionId)) === "open";
		tab = sessionStorage.getItem(tabKey(sessionId)) === "all" ? "all" : "pending";
	} catch { /* defaults */ }
	const setOpen = (next) => {
		try { sessionStorage.setItem(collapsedKey(sessionId), next ? "open" : "closed"); } catch { /* ignore */ }
		if (next) {
			scans.delete(sessionId); // refetch so 全部 sees the latest messages
			const anyApi = list.find((record) => record.api !== undefined)?.api;
			if (anyApi !== undefined) scanSession(anyApi, sessionId);
		}
		queueRender();
	};
	const setTab = (next) => {
		try { sessionStorage.setItem(tabKey(sessionId), next); } catch { /* ignore */ }
		queueRender();
	};

	panel.textContent = "";
	panel.dataset.open = open ? "1" : "0";

	if (!open) {
		// dsh-style panel-collapse toggle: a compact square icon button (like the
		// host's own sidebar toggle) with a pending-count badge.
		const handle = document.createElement("button");
		handle.type = "button";
		handle.className = "dsha2ui-todo-handle";
		handle.dataset.state = pending.length > 0 ? "pending" : "done";
		handle.title = `${tRef("todo.title")}${pending.length > 0 ? ` · ${pending.length} ${tRef("todo.tab.pending")}` : ""}`;
		handle.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M15 4.5v15"/><path d="M7.5 9.5h4M7.5 13h2.5"/></svg>';
		const count = document.createElement("span");
		count.className = "dsha2ui-todo-count";
		count.textContent = pending.length > 0 ? String(pending.length) : "✓";
		handle.appendChild(count);
		handle.onclick = () => setOpen(true);
		panel.appendChild(handle);
		return;
	}

	const drawer = document.createElement("div");
	drawer.className = "dsha2ui-todo-drawer";
	const head = document.createElement("div");
	head.className = "dsha2ui-todo-head";
	const headTitle = document.createElement("span");
	headTitle.className = "dsha2ui-todo-headtitle";
	headTitle.textContent = tRef("todo.title");
	const close = document.createElement("button");
	close.type = "button";
	close.className = "dsha2ui-todo-close";
	close.textContent = "✕";
	close.onclick = () => setOpen(false);
	head.append(headTitle, close);
	drawer.appendChild(head);

	const tabs = document.createElement("div");
	tabs.className = "dsha2ui-todo-tabs";
	const scanned = timelines.get(sessionId);
	if (scanned === undefined) {
		const anyApi = list.find((record) => record.api !== undefined)?.api;
		if (anyApi !== undefined) scanSession(anyApi, sessionId);
	}
	const allCount = scanned !== undefined ? scanned.timeline.length : list.length;
	for (const [key, text, badge] of [["pending", tRef("todo.tab.pending"), pending.length], ["all", tRef("todo.tab.all"), allCount]]) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "dsha2ui-todo-tab";
		button.dataset.active = tab === key ? "1" : "0";
		button.textContent = text;
		const chip = document.createElement("span");
		chip.className = "dsha2ui-todo-chip";
		chip.textContent = String(badge);
		button.appendChild(chip);
		button.onclick = () => setTab(key);
		tabs.appendChild(button);
	}
	drawer.appendChild(tabs);

	const box = document.createElement("div");
	box.className = "dsha2ui-todo-list";

	const messageOf = (callId) => timelines.get(sessionId)?.timeline.find((entry) => entry.forms.some((form) => form.callId === callId));
	const locateCard = (record) => {
		const node = record?.getNode?.();
		if (node !== null && node !== undefined) {
			flashNode(node);
			return;
		}
		const entry = messageOf(record?.callId);
		if (entry !== undefined) locateText(entry.text);
	};

	if (tab === "pending") {
		if (pending.length === 0) {
			const empty = document.createElement("div");
			empty.className = "dsha2ui-todo-empty";
			empty.textContent = tRef("todo.empty");
			box.appendChild(empty);
		}
		for (const record of pending) {
			const state = rowState(record);
			const row = document.createElement("div");
			row.className = "dsha2ui-todo-row";
			row.dataset.state = state.key;
			const main = document.createElement("button");
			main.type = "button";
			main.className = "dsha2ui-todo-mainbtn";
			const topLine = document.createElement("span");
			topLine.className = "dsha2ui-todo-topline";
			const titleEl = document.createElement("span");
			titleEl.className = "dsha2ui-todo-title";
			titleEl.textContent = record.title;
			const stateEl = document.createElement("span");
			stateEl.className = "dsha2ui-todo-state";
			stateEl.textContent = stateLabel(state);
			topLine.append(titleEl, stateEl);
			main.appendChild(topLine);
			if (state.key === "partial") {
				const preview = previewOf(record);
				if (preview !== "") {
					const previewEl = document.createElement("span");
					previewEl.className = "dsha2ui-todo-preview";
					previewEl.textContent = preview;
					main.appendChild(previewEl);
				}
			}
			const when = messageOf(record.callId)?.time;
			if (when !== undefined) {
				const timeEl = document.createElement("span");
				timeEl.className = "dsha2ui-todo-preview";
				timeEl.textContent = fmtAt(when);
				main.appendChild(timeEl);
			}
			main.onclick = () => locateCard(record);
			row.appendChild(main);
			const skip = document.createElement("button");
			skip.type = "button";
			skip.className = "dsha2ui-todo-skip";
			skip.textContent = tRef("todo.skip");
			skip.onclick = (event) => {
				event.stopPropagation();
				setSkipped(record.sessionId, record.callId, true);
				queueRender();
			};
			row.appendChild(skip);
			box.appendChild(row);
		}
	} else {
		// 全部：会话里每条用户消息都可定位；带表单的消息挂状态芯片。
		if (scanned === undefined) {
			const loading = document.createElement("div");
			loading.className = "dsha2ui-todo-empty";
			loading.textContent = "…";
			box.appendChild(loading);
		} else {
			for (const entry of scanned.timeline) {
				const row = document.createElement("div");
				row.className = "dsha2ui-todo-row";
				row.dataset.state = "browse";
				const main = document.createElement("button");
				main.type = "button";
				main.className = "dsha2ui-todo-mainbtn";
				const topLine = document.createElement("span");
				topLine.className = "dsha2ui-todo-topline";
				const titleEl = document.createElement("span");
				titleEl.className = "dsha2ui-todo-title dsha2ui-todo-msg";
				titleEl.textContent = entry.text; // 用户内容完整展示，换行不省略
				topLine.append(titleEl);
				main.appendChild(topLine);
				if (entry.time !== undefined) {
					const timeEl = document.createElement("span");
					timeEl.className = "dsha2ui-todo-preview";
					timeEl.textContent = fmtAt(entry.time);
					main.appendChild(timeEl);
				}
				main.onclick = () => locateText(entry.text);
				row.appendChild(main);
				box.appendChild(row);
				for (const form of entry.forms) {
					const record = cards.get(form.callId);
					const state = record !== undefined ? rowState(record)
						: scanned.submitted.has(form.callId) ? { key: "done", at: scanned.submitted.get(form.callId).at }
						: isSkipped(sessionId, form.callId) ? { key: "skipped" }
						: { key: "empty", filled: 0, total: 0 };
					const formRow = document.createElement("div");
					formRow.className = "dsha2ui-todo-row dsha2ui-todo-formrow";
					formRow.dataset.state = state.key;
					const formBtn = document.createElement("button");
					formBtn.type = "button";
					formBtn.className = "dsha2ui-todo-mainbtn";
					const line = document.createElement("span");
					line.className = "dsha2ui-todo-topline";
					const formTitle = document.createElement("span");
					formTitle.className = "dsha2ui-todo-title";
					formTitle.textContent = `▤ ${record?.title ?? form.title ?? ""}`;
					const formState = document.createElement("span");
					formState.className = "dsha2ui-todo-state";
					formState.textContent = stateLabel(state);
					line.append(formTitle, formState);
					formBtn.appendChild(line);
					formBtn.onclick = () => (record !== undefined ? locateCard(record) : locateText(entry.text));
					formRow.appendChild(formBtn);
					if (state.key === "empty" || state.key === "partial") {
						const skip = document.createElement("button");
						skip.type = "button";
						skip.className = "dsha2ui-todo-skip";
						skip.textContent = tRef("todo.skip");
						skip.onclick = (event) => {
							event.stopPropagation();
							setSkipped(sessionId, form.callId, true);
							queueRender();
						};
						formRow.appendChild(skip);
					} else if (state.key === "skipped") {
						const restore = document.createElement("button");
						restore.type = "button";
						restore.className = "dsha2ui-todo-skip";
						restore.textContent = tRef("todo.restore");
						restore.onclick = (event) => {
							event.stopPropagation();
							setSkipped(sessionId, form.callId, false);
							queueRender();
						};
						formRow.appendChild(restore);
					}
					box.appendChild(formRow);
				}
			}
		}
	}
	drawer.appendChild(box);
	panel.appendChild(drawer);
}