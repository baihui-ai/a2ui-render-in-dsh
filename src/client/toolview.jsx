// The a2ui_render toolview: renders the tool call's A2UI payload as a live
// interactive card, and turns a Button action into an ordinary user message
// (`[a2ui:<event>] {json}`) sent back through session.prompt.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box as XCardBox, Card as XCardSurface } from "@ant-design/x-card";
import { CATALOG, CardMirrorContext } from "./components.jsx";
import { VIZ_CATALOG } from "./components-viz.jsx";

const FULL_CATALOG = { ...CATALOG, ...VIZ_CATALOG };

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
		lock() {
			locked = true;
			notify();
		}
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
	} catch {
		// storage unavailable — the record still lives in the conversation
	}
}

function formatTime(at) {
	if (typeof at !== "number") return "";
	const d = new Date(at);
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse tool args from either lifecycle form; null while streaming/invalid. */
function parseArgs(block) {
	const settled = "kind" in block;
	const argsRaw = (settled ? block.call?.argsRaw : block.argsRaw) ?? "";
	try {
		const value = JSON.parse(argsRaw);
		if (value !== null && typeof value === "object" && Array.isArray(value.components)) return value;
	} catch {
		// streaming or malformed — caller shows the placeholder row
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

export function A2uiToolView({ callId, block, sessionId, api, t }) {
	const settled = "kind" in block;
	const isError = settled && block.isError === true;
	const args = useMemo(() => parseArgs(block), [block]);

	const submitMode = args !== null && args.submitMode === "multi" ? "multi" : "once";
	const storageKey = `dsh-a2ui:submitted:${sessionId}:${callId}`;
	// Cards with input components are forms (a submission locks them); cards
	// without inputs are browse-style — their buttons are queries and stay live.
	const hasInputs = args !== null && args.components.some(
		(node) => node !== null && typeof node === "object" && (node.component === "MultipleChoice" || node.component === "CheckBox" || node.component === "TextField" || node.component === "Select" || node.component === "Rate" || node.component === "Slider")
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
		return queue;
	}, [args, surfaceId]);

	const [sendState, setSendState] = useState({ kind: "idle" });

	// Surface a restored record in the footer once args have parsed.
	const ready = args !== null;
	useEffect(() => {
		const record = restoreRef.current;
		if (record !== null && record !== false) {
			setSendState({ kind: "sent", name: record.text.split("\n")[0] + (record.text.includes("\n") ? " …" : ""), at: record.at });
		}
	}, [ready]);

	const handleAction = useCallback(async (payload) => {
		const meta = payload.context !== null && typeof payload.context === "object" ? payload.context : {};
		const buttonLabel = typeof meta.__label === "string" && meta.__label !== "" ? meta.__label : "已提交";
		const shouldLock = submitMode === "multi" ? false : typeof meta.__submit === "boolean" ? meta.__submit : hasInputs;
		const text = buildSubmissionText(buttonLabel, payload.context, mirrorRef.current);
		setSendState({ kind: "sending", name: buttonLabel });
		mirrorRef.current.setBusy(true);
		try {
			let clientTimeZone;
			try {
				clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			} catch {
				clientTimeZone = undefined;
			}
			const { result } = await api.sessions.prompt({
				sessionId,
				mode: "queue",
				content: [{ type: "text", text }],
				...clientTimeZone !== undefined ? { clientTimeZone } : {}
			});
			if (!result.ok) throw new Error(result.error?.message ?? result.error?.code ?? "prompt rejected");
			const at = Date.now();
			writeSubmissionRecord(storageKey, { text, at, data: mirrorRef.current.data, lock: shouldLock });
			if (shouldLock) mirrorRef.current.lock();
			setSendState({ kind: "sent", name: text.split("\n")[0] + (text.includes("\n") ? " …" : ""), at });
		} catch (error) {
			setSendState({ kind: "error", name: buttonLabel, message: String(error?.message ?? error) });
		} finally {
			mirrorRef.current.setBusy(false);
		}
	}, [api, sessionId, storageKey, submitMode, hasInputs]);

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
			{sendState.kind !== "idle" ? (
				<div className="dsha2ui-foot" data-kind={sendState.kind}>
					{sendState.kind === "sending" ? <span className="dsha2ui-pulse">{t("card.sending")}</span> : null}
					{sendState.kind === "sent" ? <span>✓ {sendState.name}{typeof sendState.at === "number" ? ` · ${formatTime(sendState.at)}` : ""}</span> : null}
					{sendState.kind === "error" ? <span>{t("card.error")} {sendState.message}</span> : null}
				</div>
			) : null}
		</div>
	);
}
