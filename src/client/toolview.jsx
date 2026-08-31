// The a2ui_render toolview: renders the tool call's A2UI payload as a live
// interactive card, and turns a Button action into an ordinary user message
// (`[a2ui:<event>] {json}`) sent back through session.prompt.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box as XCardBox, Card as XCardSurface } from "@ant-design/x-card";
import { CATALOG, CardMirrorContext } from "./components.jsx";
import { VIZ_CATALOG } from "./components-viz.jsx";
import { Markdown } from "./markdown.jsx";
import { rich } from "./richtext.jsx";

const FULL_CATALOG = { ...CATALOG, ...VIZ_CATALOG, Markdown };

/**
 * Per-card store: dataModel snapshot mirror, per-field display texts (used to
 * compose the human-readable submission message), and a busy flag for buttons.
 */
function createMirror() {
	const listeners = new Set();
	let busy = false;
	let locked = false;
	const notify = () => {
		for (const listener of [...listeners]) listener();
	};
	const store = {
		data: {},
		seeded: false,
		displays: new Map(), // normalized path -> { name?, text }
		get(path) {
			const parts = path.replace(/^\//, "").split("/");
			return parts.reduce((current, key) => (current !== null && current !== undefined ? current[key] : undefined), store.data);
		},
		set(path, value) {
			const parts = path.replace(/^\//, "").split("/");
			let current = store.data;
			for (let index = 0; index < parts.length - 1; index++) {
				const key = parts[index];
				if (current[key] === null || typeof current[key] !== "object") current[key] = {};
				current = current[key];
			}
			current[parts[parts.length - 1]] = value;
		},
		setDisplay(path, entry) {
			store.displays.set(path.replace(/^\//, ""), entry);
		},
		seed(dataModel) {
			if (store.seeded || dataModel === null || typeof dataModel !== "object") return;
			store.seeded = true;
			store.data = JSON.parse(JSON.stringify(dataModel));
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		busySnapshot: () => busy,
		setBusy(next) {
			busy = next;
			notify();
		},
		disabledSnapshot: () => busy || locked,
		required: new Map(), // path (with slash) -> { label, test }
		invalid: new Set(),
		invalidRev: 0,
		invalidSnapshot: () => store.invalidRev,
		setInvalid(paths) {
			store.invalid = new Set(paths);
			store.invalidRev++;
			notify();
		},
		clearInvalid(path) {
			if (store.invalid.delete(path)) {
				store.invalidRev++;
				notify();
			}
		},
		extRev: 0,
		extSnapshot: () => store.extRev,
		bumpExt() {
			store.extRev++;
			notify();
		},
		lock() {
			locked = true;
			notify();
		},
		unlock() {
			locked = false;
			notify();
		},
		uploads: []
	};
	return store;
}

/** localStorage record of a card's submission; null when absent/unreadable. */
function readSubmissionRecord(storageKey) {
	try {
		const raw = localStorage.getItem(storageKey);
		if (raw === null) return null;
		const record = JSON.parse(raw);
		if (record !== null && typeof record === "object" && typeof record.text === "string") return record;
	} catch {
		// storage unavailable or corrupted — treat as no record
	}
	return null;
}

function writeSubmissionRecord(storageKey, record) {
	try {
		localStorage.setItem(storageKey, JSON.stringify(record));
		pruneStorage();
	} catch {
		// storage unavailable — the record still lives in the conversation
	}
}

// Submission/update records would otherwise accumulate forever; on every
// write, drop entries older than 30 days and cap the total at 300 newest.
const STORE_TTL_MS = 30 * 24 * 3600 * 1000;
const STORE_MAX = 300;
function pruneStorage() {
	try {
		const now = Date.now();
		const entries = [];
		for (let index = 0; index < localStorage.length; index++) {
			const key = localStorage.key(index);
			if (key === null || !key.startsWith("dsh-a2ui:")) continue;
			let at = 0;
			try {
				const value = JSON.parse(localStorage.getItem(key) ?? "null");
				if (Array.isArray(value)) at = Math.max(0, ...value.map((entry) => (entry !== null && typeof entry === "object" && typeof entry.at === "number" ? entry.at : 0)));
				else if (value !== null && typeof value === "object" && typeof value.at === "number") at = value.at;
			} catch { /* unparsable — treated as stale (at = 0) */ }
			entries.push({ key, at });
		}
		const keep = [];
		for (const entry of entries) {
			if (now - entry.at > STORE_TTL_MS) localStorage.removeItem(entry.key);
			else keep.push(entry);
		}
		keep.sort((a, b) => b.at - a.at);
		for (const entry of keep.slice(STORE_MAX)) localStorage.removeItem(entry.key);
	} catch { /* storage unavailable */ }
}

function formatTime(at) {
	if (typeof at !== "number") return "";
	const d = new Date(at);
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Close a truncated JSON prefix: balance strings/brackets outside strings. */
function closeJson(prefix) {
	let inString = false;
	let escaped = false;
	const stack = [];
	for (const ch of prefix) {
		if (escaped) { escaped = false; continue; }
		if (ch === "\\") { escaped = inString; continue; }
		if (ch === '"') { inString = !inString; continue; }
		if (inString) continue;
		if (ch === "{" || ch === "[") stack.push(ch);
		else if (ch === "}" || ch === "]") stack.pop();
	}
	let fixed = prefix;
	if (inString) fixed += '"';
	fixed = fixed.replace(/[,:]\s*$/, "");
	while (stack.length > 0) fixed += stack.pop() === "{" ? "}" : "]";
	return fixed;
}

/** Best-effort parse of a streaming (possibly truncated) args string. */
function tolerantParse(raw) {
	try { return JSON.parse(raw); } catch { /* keep repairing */ }
	let cut = raw.length;
	for (let attempt = 0; attempt < 24 && cut > 0; attempt++) {
		try { return JSON.parse(closeJson(raw.slice(0, cut))); } catch { /* trim to previous member */ }
		cut = raw.lastIndexOf(",", cut - 1);
	}
	return null;
}

/** Parse tool args from either lifecycle form; streaming args are repaired. */
function parseArgs(block) {
	const settled = "kind" in block;
	const argsRaw = (settled ? block.call?.argsRaw : block.argsRaw) ?? "";
	try {
		const value = JSON.parse(argsRaw);
		if (value !== null && typeof value === "object" && Array.isArray(value.components)) return value;
		return null;
	} catch {
		if (settled) return null;
	}
	const repaired = tolerantParse(argsRaw);
	if (repaired !== null && typeof repaired === "object" && Array.isArray(repaired.components)
		&& repaired.components.some((node) => node !== null && typeof node === "object" && node.id === "root")) {
		const complete = repaired.components.filter((node) => node !== null && typeof node === "object" && typeof node.id === "string" && typeof node.component === "string");
		return { ...repaired, components: complete, __streaming: true };
	}
	return null;
}

/**
 * Engine-resolved action context entries arrive as {value, label?} wrappers
 * for path bindings and bare values for literals; flatten into a uniform
 * [{key, label?, value}] list (the reserved __label entry is the button text).
 */
function contextEntries(context) {
	if (context === null || typeof context !== "object" || Array.isArray(context)) return [];
	const entries = [];
	for (const [key, value] of Object.entries(context)) {
		if (key === "__label" || key === "__submit") continue;
		if (value !== null && typeof value === "object" && !Array.isArray(value) && "value" in value && Object.keys(value).every((k) => k === "value" || k === "label")) {
			entries.push({ key, label: typeof value.label === "string" ? value.label : undefined, value: value.value });
		} else {
			entries.push({ key, value });
		}
	}
	return entries;
}

/** Render one submitted value as human-readable text. */
function formatValue(value) {
	if (value === null || value === undefined) return "";
	if (Array.isArray(value)) return value.map((item) => String(item)).join("、");
	if (typeof value === "boolean") return value ? "是" : "否";
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
}

/**
 * Compose the plain-language submission message: the button label, then the
 * touched fields (with option labels from the mirror) plus any action-context
 * values not already covered. One field collapses onto the button line.
 */
function buildSubmissionText(buttonLabel, context, mirror) {
	const fields = [];
	const covered = new Set();
	for (const [path, display] of mirror.displays) {
		if (typeof display.text !== "string" || display.text === "") continue;
		fields.push({ name: display.name ?? path.split("/").pop(), text: display.text });
		covered.add(JSON.stringify(mirror.get(path)));
	}
	for (const entry of contextEntries(context)) {
		if (covered.has(JSON.stringify(entry.value))) continue;
		const text = formatValue(entry.value);
		if (text === "") continue;
		fields.push({ name: entry.label ?? entry.key, text });
	}
	if (fields.length === 0) return buttonLabel;
	if (fields.length === 1) return `${buttonLabel}：${fields[0].text}`;
	return `${buttonLabel}\n${fields.map((field) => `${field.name}：${field.text}`).join("\n")}`;
}

/** Live surface registry: update calls route to mounted cards by callId. */
const SURFACES = new Map();

function updateCommands(surfaceId, update) {
	const cmds = [];
	if (Array.isArray(update.components) && update.components.length > 0) {
		cmds.push({ version: "v0.9", updateComponents: { surfaceId, components: update.components } });
	}
	if (update.dataModel !== null && typeof update.dataModel === "object") {
		for (const [key, value] of Object.entries(update.dataModel)) {
			cmds.push({ version: "v0.9", updateDataModel: { surfaceId, path: `/${key}`, value } });
		}
	}
	return cmds;
}

function readUpdates(key) {
	try {
		const raw = localStorage.getItem(key);
		const list = raw === null ? [] : JSON.parse(raw);
		return Array.isArray(list) ? list : [];
	} catch { return []; }
}

/** The a2ui_update tool row: applies the update to the target card and records it. */
export function A2uiUpdateView({ callId, block, sessionId, t }) {
	const settled = "kind" in block;
	const argsRaw = (settled ? block.call?.argsRaw : block.argsRaw) ?? "";
	const appliedRef = useRef(false);
	let update = null;
	try { update = JSON.parse(argsRaw); } catch { /* streaming */ }
	useEffect(() => {
		if (update === null || typeof update.surfaceId !== "string" || appliedRef.current) return;
		appliedRef.current = true;
		const storeKey = `dsh-a2ui:updates:${sessionId}:${update.surfaceId}`;
		// Dedupe by this update's own callId: a remounted update view must not
		// append the same record again (the target already replayed it).
		const list = readUpdates(storeKey);
		if (list.some((entry) => entry !== null && typeof entry === "object" && entry.id === callId)) return;
		try {
			list.push({ id: callId, at: Date.now(), components: update.components, dataModel: update.dataModel });
			localStorage.setItem(storeKey, JSON.stringify(list));
			pruneStorage();
		} catch { /* storage unavailable */ }
		SURFACES.get(update.surfaceId)?.(update);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [update !== null]);
	if (update === null) return <div className="dsha2ui-skeleton"><span className="dsha2ui-pulse">↺</span></div>;
	const parts = [];
	if (Array.isArray(update.components) && update.components.length > 0) parts.push(`${update.components.length} 个组件`);
	if (update.dataModel !== null && typeof update.dataModel === "object") parts.push(`${Object.keys(update.dataModel).length} 项数据`);
	return <div className="dsha2ui-skeleton"><span>↺</span><span>{t("card.updated")}{parts.length > 0 ? `（${parts.join("、")}）` : ""}</span></div>;
}

export function A2uiToolView({ callId, block, sessionId, api, t }) {
	const settled = "kind" in block;
	const isError = settled && block.isError === true;
	const args = useMemo(() => parseArgs(block), [block]);

	const submitMode = args !== null && args.submitMode === "multi" ? "multi" : "once";
	const storageKey = `dsh-a2ui:submitted:${sessionId}:${callId}`;
	// Cards with input components are forms (a submission locks them); cards
	// without inputs are browse-style — their buttons are queries and stay live.
	const hasInputs = args !== null && args.components.some(
		(node) => node !== null && typeof node === "object" && ["MultipleChoice", "CheckBox", "TextField", "Select", "Rate", "Slider", "Upload", "Calendar", "RankList", "Signature", "EditableTable", "Wizard"].includes(node.component)
	);

	const mirrorRef = useRef(null);
	if (mirrorRef.current === null) mirrorRef.current = createMirror();
	mirrorRef.current.animStorageKey = `dsh-a2ui:animplayed:${sessionId}:${callId}`;

	// Restore a recorded submission synchronously so the inputs mount with the
	// submitted values and (in "once" mode) already locked.
	const restoreRef = useRef(null); // null = not checked yet; false = none; object = record
	if (restoreRef.current === null && args !== null) {
		const record = readSubmissionRecord(storageKey);
		restoreRef.current = record ?? false;
		if (record !== null) {
			mirrorRef.current.seed(record.data !== null && typeof record.data === "object" ? record.data : args.dataModel);
			if (record.lock === true) mirrorRef.current.lock();
		}
	}
	if (args !== null) mirrorRef.current.seed(args.dataModel);

	const surfaceId = callId;
	const updatesKey = `dsh-a2ui:updates:${sessionId}:${callId}`;
	const [extraCommands, setExtraCommands] = useState(() => readUpdates(updatesKey).flatMap((update) => updateCommands(callId, update)));
	useEffect(() => {
		const applyUpdate = (update) => {
			// Keep the mirror in sync so submissions snapshot the updated values
			// and inputs re-render with them (useExternalValue).
			if (update.dataModel !== null && typeof update.dataModel === "object") {
				for (const [key, value] of Object.entries(update.dataModel)) mirrorRef.current.set(`/${key}`, value);
				mirrorRef.current.bumpExt();
			}
			setExtraCommands((prev) => [...prev, ...updateCommands(callId, update)]);
		};
		SURFACES.set(callId, applyUpdate);
		// Delete only our own registration — StrictMode double-mounts would
		// otherwise remove the newer mount's entry.
		return () => { if (SURFACES.get(callId) === applyUpdate) SURFACES.delete(callId); };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [callId]);
	const commands = useMemo(() => {
		if (args === null) return [];
		const queue = [
			{ version: "v0.9", createSurface: { surfaceId } },
			{ version: "v0.9", updateComponents: { surfaceId, components: args.components } }
		];
		if (args.dataModel !== null && typeof args.dataModel === "object") {
			for (const [key, value] of Object.entries(args.dataModel)) {
				queue.push({ version: "v0.9", updateDataModel: { surfaceId, path: `/${key}`, value } });
			}
		}
		return [...queue, ...extraCommands];
	}, [args, surfaceId, extraCommands]);

	const [sendState, setSendState] = useState({ kind: "idle" });

	// Surface a restored record in the footer once args have parsed.
	const ready = args !== null;
	useEffect(() => {
		if (!ready) return;
		let changed = false;
		for (const update of readUpdates(updatesKey)) {
			if (update !== null && typeof update === "object" && update.dataModel !== null && typeof update.dataModel === "object") {
				for (const [key, value] of Object.entries(update.dataModel)) {
					mirrorRef.current.set(`/${key}`, value);
					changed = true;
				}
			}
		}
		if (changed) mirrorRef.current.bumpExt();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ready]);
	useEffect(() => {
		const record = restoreRef.current;
		if (record !== null && record !== false) {
			setSendState({ kind: "sent", name: record.text.split("\n")[0] + (record.text.includes("\n") ? " …" : ""), at: record.at });
		}
	}, [ready]);

	const [resubmitting, setResubmitting] = useState(false);
	const handleAction = useCallback(async (payload) => {
		const meta = payload.context !== null && typeof payload.context === "object" ? payload.context : {};
		const buttonLabel = typeof meta.__label === "string" && meta.__label !== "" ? meta.__label : "已提交";
		const isSuggestion = typeof meta.__suggestion === "string" && meta.__suggestion !== "";
		const shouldLock = isSuggestion ? false : submitMode === "multi" ? false : typeof meta.__submit === "boolean" ? meta.__submit : hasInputs;
		const baseText = isSuggestion ? meta.__suggestion : buildSubmissionText(buttonLabel, payload.context, mirrorRef.current);
		const text = !isSuggestion && resubmitting ? `（修正）${baseText}` : baseText;
		if (!isSuggestion && hasInputs && meta.__submit !== false && mirrorRef.current.required.size > 0) {
			const missing = [];
			const bad = [];
			for (const [path, entry] of mirrorRef.current.required) {
				if (!entry.test(mirrorRef.current.get(path))) {
					missing.push(entry.label);
					bad.push(path);
				}
			}
			if (missing.length > 0) {
				mirrorRef.current.setInvalid(bad);
				setSendState({ kind: "error", name: buttonLabel, message: `${t("card.required")}${missing.join("、")}` });
				return;
			}
			mirrorRef.current.setInvalid([]);
		}
		setSendState({ kind: "sending", name: buttonLabel });
		mirrorRef.current.setBusy(true);
		try {
			let clientTimeZone;
			try {
				clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			} catch {
				clientTimeZone = undefined;
			}
			const images = isSuggestion ? [] : (mirrorRef.current.uploads ?? []).map((file) => ({ type: "image", mediaType: file.mediaType, data: file.data, ...file.name !== undefined ? { name: file.name } : {} }));
			const { result } = await api.sessions.prompt({
				sessionId,
				mode: "queue",
				content: [{ type: "text", text }, ...images],
				...clientTimeZone !== undefined ? { clientTimeZone } : {}
			});
			if (!result.ok) throw new Error(result.error?.message ?? result.error?.code ?? "prompt rejected");
			const at = Date.now();
			if (!isSuggestion) writeSubmissionRecord(storageKey, { text, at, data: mirrorRef.current.data, lock: shouldLock });
			if (shouldLock) mirrorRef.current.lock();
			setResubmitting(false);
			if (isSuggestion) setSendState({ kind: "idle" });
			else setSendState({ kind: "sent", name: text.split("\n")[0] + (text.includes("\n") ? " …" : ""), at });
		} catch (error) {
			setSendState({ kind: "error", name: buttonLabel, message: String(error?.message ?? error) });
		} finally {
			mirrorRef.current.setBusy(false);
		}
	}, [api, sessionId, storageKey, submitMode, hasInputs, resubmitting, t]);

	if (args === null) {
		return (
			<div className="dsha2ui-skeleton">
				<span className={isError ? "" : "dsha2ui-pulse"}>▤</span>
				<span>{isError || settled ? t("card.invalid") : t("card.building")}</span>
			</div>
		);
	}

	return (
		<div className="dsha2ui-wrap" data-tool="a2ui_render">
			<div className="dsha2ui-head">
				<span aria-hidden>▤</span>
				<span className="dsha2ui-head-title">{typeof args.title === "string" && args.title !== "" ? args.title : t("card.title")}</span>
			</div>
			<div className="dsha2ui-body">
				<CardMirrorContext.Provider value={mirrorRef.current}>
					<XCardBox commands={commands} components={FULL_CATALOG} onAction={handleAction}>
						<XCardSurface id={surfaceId} />
					</XCardBox>
				</CardMirrorContext.Provider>
			</div>
			{args.__streaming === true ? (
				<div className="dsha2ui-foot"><span className="dsha2ui-pulse">{t("card.building")}</span></div>
			) : sendState.kind !== "idle" ? (
				<div className="dsha2ui-foot" data-kind={sendState.kind}>
					{sendState.kind === "sending" ? <span className="dsha2ui-pulse">{t("card.sending")}</span> : null}
					{sendState.kind === "sent" ? <span>✓ {rich(sendState.name)}{typeof sendState.at === "number" ? ` · ${formatTime(sendState.at)}` : ""}</span> : null}
					{sendState.kind === "sent" && hasInputs ? (
						<button type="button" className="dsha2ui-refill" onClick={() => {
							mirrorRef.current.unlock();
							setResubmitting(true);
							setSendState({ kind: "idle" });
							try { localStorage.removeItem(storageKey); } catch { /* storage unavailable */ }
						}}>{t("card.refill")}</button>
					) : null}
					{sendState.kind === "error" ? <span>{t("card.error")} {sendState.message}</span> : null}
				</div>
			) : null}
		</div>
	);
}
