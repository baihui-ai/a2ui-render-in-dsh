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
export function matchTranscript(events) {
	const cards = []; // {callId, labels, claimed}
	const submitted = new Map();
	for (const event of Array.isArray(events) ? events : []) {
		if (event === null || typeof event !== "object") continue;
		if (event.type === "tool/call" && event.data?.name === "a2ui_render" && typeof event.data.callId === "string") {
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

/** One transcript scan per session, shared by every card on the page. */
const scans = new Map(); // sessionId -> Promise<Map(callId -> {text, at})>

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
			return matchTranscript(events ?? []);
		} catch {
			return new Map(); // offline / API shape drift — cards just stay unlocked
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
// Registry + floating panel (vanilla DOM: one fixed element per page).

const cards = new Map(); // callId -> {sessionId, title, fields, mirror, getNode, status, order}
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

function collapsedKey(sessionId) {
	return `dsh-a2ui:todo-collapsed:${sessionId}`;
}

function renderPanel() {
	if (typeof document === "undefined") return;
	const sessionId = currentSessionId();
	const list = [...cards.values()].filter((record) => record.sessionId === sessionId).sort((a, b) => a.order - b.order);
	if (sessionId === null || list.length === 0) {
		panel?.remove();
		panel = null;
		return;
	}
	if (panel === null) {
		panel = document.createElement("div");
		panel.id = "dsha2ui-todo";
		document.body.appendChild(panel);
	}
	const pending = list.filter((record) => record.status?.kind !== "done");
	let open = false;
	try { open = sessionStorage.getItem(collapsedKey(sessionId)) === "open"; } catch { /* default closed */ }
	const setOpen = (next) => {
		try { sessionStorage.setItem(collapsedKey(sessionId), next ? "open" : "closed"); } catch { /* ignore */ }
		queueRender();
	};

	panel.textContent = "";
	panel.dataset.open = open ? "1" : "0";

	if (!open) {
		// Collapsed: a slim handle docked to the right edge (Claude-style drawer tab).
		const handle = document.createElement("button");
		handle.type = "button";
		handle.className = "dsha2ui-todo-handle";
		handle.dataset.state = pending.length > 0 ? "pending" : "done";
		handle.title = tRef("todo.title");
		handle.innerHTML = "";
		const icon = document.createElement("span");
		icon.textContent = "📋";
		const count = document.createElement("span");
		count.className = "dsha2ui-todo-count";
		count.textContent = pending.length > 0 ? String(pending.length) : "✓";
		handle.append(icon, count);
		handle.onclick = () => setOpen(true);
		panel.appendChild(handle);
		return;
	}

	// Expanded: right-side drawer with header + close, rows below.
	const drawer = document.createElement("div");
	drawer.className = "dsha2ui-todo-drawer";
	const head = document.createElement("div");
	head.className = "dsha2ui-todo-head";
	const headTitle = document.createElement("span");
	headTitle.textContent = `${tRef("todo.title")}`;
	const headCount = document.createElement("span");
	headCount.className = "dsha2ui-todo-headcount";
	headCount.textContent = pending.length > 0 ? `${pending.length}/${list.length} ${tRef("todo.pending")}` : tRef("todo.alldone");
	const close = document.createElement("button");
	close.type = "button";
	close.className = "dsha2ui-todo-close";
	close.textContent = "✕";
	close.onclick = () => setOpen(false);
	head.append(headTitle, headCount, close);
	drawer.appendChild(head);

	const box = document.createElement("div");
	box.className = "dsha2ui-todo-list";
	for (const record of list) {
		const row = document.createElement("button");
		row.type = "button";
		row.className = "dsha2ui-todo-row";
		const done = record.status?.kind === "done";
		row.dataset.done = done ? "1" : "0";
		const { filled, total } = progressOf(record);
		const state = done
			? `✓ ${tRef("todo.done")}${typeof record.status.at === "number" ? ` ${new Date(record.status.at).getHours()}:${String(new Date(record.status.at).getMinutes()).padStart(2, "0")}` : ""}`
			: total > 0 ? `${tRef("todo.filled")} ${filled}/${total}` : tRef("todo.pending");
		const dot = document.createElement("span");
		dot.className = "dsha2ui-todo-dot";
		const titleEl = document.createElement("span");
		titleEl.className = "dsha2ui-todo-title";
		titleEl.textContent = record.title;
		const stateEl = document.createElement("span");
		stateEl.className = "dsha2ui-todo-state";
		stateEl.textContent = state;
		const main = document.createElement("span");
		main.className = "dsha2ui-todo-main";
		const topLine = document.createElement("span");
		topLine.className = "dsha2ui-todo-topline";
		topLine.append(titleEl, stateEl);
		main.appendChild(topLine);
		if (!done) {
			const preview = previewOf(record);
			if (preview !== "") {
				const previewEl = document.createElement("span");
				previewEl.className = "dsha2ui-todo-preview";
				previewEl.textContent = preview;
				main.appendChild(previewEl);
			}
		}
		row.append(dot, main);
		row.onclick = () => {
			const node = record.getNode?.();
			if (node === null || node === undefined) return;
			node.scrollIntoView?.({ behavior: "smooth", block: "center" });
			node.classList.remove("dsha2ui-flash");
			requestAnimationFrame(() => node.classList.add("dsha2ui-flash"));
		};
		box.appendChild(row);
	}
	drawer.appendChild(box);
	panel.appendChild(drawer);
}
