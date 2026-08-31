// A2UI catalog implementations rendered by the @ant-design/x-card engine.
//
// Engine contract (x-card v0.9): every component receives its authored props
// with {"path": "/x"} display bindings already resolved to values, plus an
// injected onAction(name, context) and onDataChange(path, value). Interactive
// components additionally take our own `bind` prop — a dataModel key path
// WITHOUT a leading slash (a leading "/" in any string prop would be resolved
// as a read binding by the engine) — and write user input both into the
// engine's dataModel (for {"path"} display bindings and action context reads)
// and into the card mirror (so a submit always carries the full snapshot).
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ZoomableFigure } from "./zoomable.jsx";
import { compileScopedExpression } from "./expr.js";
import { rich } from "./richtext.jsx";
import { Steps } from "./components-viz.jsx";

export const CardMirrorContext = createContext(null);

const noopSubscribe = () => () => {};
const falseSnapshot = () => false;

/** Whether interaction is off: the card is submitting, or locked after submit. */
function useDisabled() {
	const mirror = useContext(CardMirrorContext);
	return useSyncExternalStore(
		mirror !== null ? mirror.subscribe : noopSubscribe,
		mirror !== null ? mirror.disabledSnapshot : falseSnapshot
	);
}

function toPath(bind) {
	if (typeof bind !== "string" || bind === "") return null;
	return bind.startsWith("/") ? bind : `/${bind}`;
}

/** Read the seeded/current value for a bind path from the card mirror. */
function useInitial(bind) {
	const mirror = useContext(CardMirrorContext);
	const path = toPath(bind);
	if (mirror === null || path === null) return undefined;
	return mirror.get(path);
}

function useWriteBack(bind, onDataChange) {
	const mirror = useContext(CardMirrorContext);
	const path = toPath(bind);
	return (value, display) => {
		if (path === null) return;
		mirror?.set(path, value);
		if (display !== undefined) mirror?.setDisplay(path, display);
		mirror?.clearInvalid(path);
		onDataChange?.(path, value);
	};
}

const defaultFilled = (value) => (Array.isArray(value) ? value.length > 0
	: typeof value === "boolean" ? value
	: typeof value === "number" ? true
	: value !== undefined && value !== null && String(value) !== "");

/**
 * Re-apply externally written values (a2ui_update dataModel) into an input's
 * local state: the mirror bumps extRev after applying an update, and the
 * input maps the fresh mirror value back into its own state.
 */
function useExternalValue(bind, apply) {
	const mirror = useContext(CardMirrorContext);
	const path = toPath(bind);
	const rev = useSyncExternalStore(mirror !== null ? mirror.subscribe : noopSubscribe, mirror !== null ? mirror.extSnapshot : falseSnapshot);
	const applyRef = useRef(apply);
	applyRef.current = apply;
	const lastRef = useRef(rev);
	useEffect(() => {
		if (mirror === null || path === null || rev === lastRef.current) return;
		lastRef.current = rev;
		const value = mirror.get(path);
		if (value !== undefined) applyRef.current(value);
	}, [rev, mirror, path]);
}

/**
 * Register a required field on the card mirror and report whether it is
 * currently flagged invalid (a blocked submit highlights missing fields).
 */
function useRequired(bind, required, label, test) {
	const mirror = useContext(CardMirrorContext);
	const path = toPath(bind);
	useEffect(() => {
		if (mirror === null || path === null || required !== true) return undefined;
		mirror.required.set(path, {
			label: typeof label === "string" && label !== "" ? label : path.slice(1),
			test: test ?? defaultFilled
		});
		return () => { mirror.required.delete(path); };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [required, path, label]);
	useSyncExternalStore(mirror !== null ? mirror.subscribe : noopSubscribe, mirror !== null ? mirror.invalidSnapshot : falseSnapshot);
	return mirror !== null && path !== null && mirror.invalid.has(path);
}

const GAP_DEFAULT = 8;

function gapOf(gap) {
	return typeof gap === "number" ? gap : GAP_DEFAULT;
}

export function Column({ gap, children }) {
	return <div className="dsha2ui-col" style={{ gap: gapOf(gap) }}>{children}</div>;
}

export function Row({ gap, align, children }) {
	return <div className="dsha2ui-row" style={{ gap: gapOf(gap), alignItems: align === "start" ? "flex-start" : align === "end" ? "flex-end" : "center" }}>{children}</div>;
}

export function Card({ title, children }) {
	return (
		<section className="dsha2ui-card">
			{typeof title === "string" && title !== "" ? <div className="dsha2ui-card-title">{title}</div> : null}
			{children}
		</section>
	);
}

export function List({ direction, gap, children }) {
	const horizontal = direction === "horizontal";
	return <div className={horizontal ? "dsha2ui-row" : "dsha2ui-col"} style={{ gap: gapOf(gap) }}>{children}</div>;
}

export function Grid({ columns, gap, minWidth, children }) {
	const count = typeof columns === "number" && columns >= 1 ? Math.floor(columns) : null;
	const min = typeof minWidth === "number" && minWidth > 0 ? minWidth : 180;
	const template = count !== null
		? `repeat(${count}, minmax(0, 1fr))`
		: `repeat(auto-fit, minmax(${min}px, 1fr))`;
	return <div className="dsha2ui-grid" style={{ gridTemplateColumns: template, gap: gapOf(gap) }}>{children}</div>;
}

const TEXT_VARIANTS = new Set(["h1", "h2", "h3", "body", "strong", "caption"]);

export function Text({ text, variant }) {
	const kind = TEXT_VARIANTS.has(variant) ? variant : "body";
	const content = rich(text);
	if (kind === "h1") return <h1 className="dsha2ui-text-h1">{content}</h1>;
	if (kind === "h2") return <h2 className="dsha2ui-text-h2">{content}</h2>;
	if (kind === "h3") return <h3 className="dsha2ui-text-h3">{content}</h3>;
	return <p className={`dsha2ui-text-${kind}`}>{content}</p>;
}

export function Image({ url, src, alt, width, height }) {
	const source = typeof url === "string" && url !== "" ? url : src;
	if (typeof source !== "string" || source === "") return null;
	return (
		<ZoomableFigure>
			<img className="dsha2ui-img" src={source} alt={typeof alt === "string" ? alt : ""} style={{ width, height }} loading="lazy" />
		</ZoomableFigure>
	);
}

export function Divider() {
	return <hr className="dsha2ui-divider" />;
}

const TAG_COLORS = new Set(["blue", "green", "red", "orange", "gray"]);

export function Tag({ text, color }) {
	return <span className="dsha2ui-tag" data-color={TAG_COLORS.has(color) ? color : "gray"}>{text === undefined ? null : String(text)}</span>;
}

export function Button({ label, variant, disabled, submit, action, onAction }) {
	const off = useDisabled();
	const click = () => {
		const eventName = typeof action?.event?.name === "string" && action.event.name !== "" ? action.event.name : "action";
		// __label / __submit ride the component context so the toolview can
		// compose the readable message and decide whether this click locks the card.
		const meta = {};
		if (typeof label === "string" && label !== "") meta.__label = label;
		if (typeof submit === "boolean") meta.__submit = submit;
		onAction?.(eventName, meta);
	};
	return (
		<button type="button" className="dsha2ui-btn" data-variant={variant === "primary" || variant === "danger" ? variant : "default"} disabled={disabled === true || off} onClick={click}>
			{label === undefined ? "OK" : String(label)}
		</button>
	);
}

export function CheckBox({ label, bind, required, disabled, onDataChange }) {
	const invalid = useRequired(bind, required, label);
	const initial = useInitial(bind);
	const write = useWriteBack(bind, onDataChange);
	const off = useDisabled() || disabled === true;
	const [checked, setChecked] = useState(initial === true);
	useExternalValue(bind, (value) => setChecked(value === true));
	const toggle = (event) => {
		if (off) return;
		const next = event.target.checked;
		setChecked(next);
		write(next, { name: typeof label === "string" && label !== "" ? label : undefined, text: next ? "是" : "否" });
	};
	return (
		<label className="dsha2ui-check" data-disabled={off || undefined} data-invalid={invalid || undefined}>
			<input type="checkbox" checked={checked} onChange={toggle} disabled={off} />
			<span>{label === undefined ? "" : rich(label)}</span>
		</label>
	);
}

export function MultipleChoice({ options, bind, label, required, maxAllowedSelections, disabled, onDataChange }) {
	const invalid = useRequired(bind, required, label);
	const initial = useInitial(bind);
	const write = useWriteBack(bind, onDataChange);
	const off = useDisabled() || disabled === true;
	const [selected, setSelected] = useState(Array.isArray(initial) ? initial : []);
	useExternalValue(bind, (value) => setSelected(Array.isArray(value) ? value : []));
	const list = Array.isArray(options) ? options.filter((option) => option !== null && typeof option === "object") : [];
	const max = typeof maxAllowedSelections === "number" && maxAllowedSelections > 0 ? maxAllowedSelections : Infinity;
	const single = max === 1;

	const toggle = (value, optionDisabled) => {
		if (off || optionDisabled === true) return;
		let next;
		if (single) next = selected.length === 1 && selected[0] === value ? [] : [value];
		else if (selected.includes(value)) next = selected.filter((item) => item !== value);
		else if (selected.length >= max) return;
		else next = [...selected, value];
		setSelected(next);
		const labelOf = (v) => {
			const hit = list.find((option) => (option.value !== undefined ? option.value : option.label) === v);
			return hit !== undefined && hit.label !== undefined ? String(hit.label) : String(v);
		};
		write(next, { text: next.map(labelOf).join("、") });
	};

	return (
		<div className="dsha2ui-choice" role={single ? "radiogroup" : "group"} data-invalid={invalid || undefined}>
			{list.map((option, index) => {
				const value = option.value !== undefined ? option.value : option.label;
				const isSelected = selected.includes(value);
				const optionOff = off || option.disabled === true;
				return (
					<div
						key={index}
						className="dsha2ui-option"
						data-selected={isSelected ? "true" : "false"}
						data-single={single ? "true" : "false"}
						data-disabled={optionOff || undefined}
						role={single ? "radio" : "checkbox"}
						aria-checked={isSelected}
						aria-disabled={optionOff || undefined}
						tabIndex={optionOff ? -1 : 0}
						onClick={() => toggle(value, option.disabled)}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								toggle(value, option.disabled);
							}
						}}
					>
						<span className="dsha2ui-option-mark">{isSelected ? "✓" : ""}</span>
						<span>
							<div className="dsha2ui-option-label">{option.label === undefined ? String(value) : rich(option.label)}</div>
							{typeof option.description === "string" && option.description !== "" ? <div className="dsha2ui-option-desc">{rich(option.description)}</div> : null}
						</span>
					</div>
				);
			})}
		</div>
	);
}

export function TextField({ label, placeholder, multiline, kind, bind, required, disabled, onDataChange }) {
	const invalid = useRequired(bind, required, label);
	const initial = useInitial(bind);
	const write = useWriteBack(bind, onDataChange);
	const off = useDisabled() || disabled === true;
	const [text, setText] = useState(typeof initial === "string" ? initial : "");
	useExternalValue(bind, (value) => setText(typeof value === "string" ? value : String(value ?? "")));
	const change = (event) => {
		setText(event.target.value);
		write(event.target.value, { name: typeof label === "string" && label !== "" ? label : undefined, text: event.target.value });
	};
	const shared = {
		className: "dsha2ui-input",
		value: text,
		placeholder: typeof placeholder === "string" ? placeholder : undefined,
		onChange: change,
		disabled: off
	};
	const inputType = kind === "number" || kind === "date" || kind === "time" ? kind : "text";
	return (
		<label className="dsha2ui-field" data-invalid={invalid || undefined}>
			{typeof label === "string" && label !== "" ? <span className="dsha2ui-field-label">{label}</span> : null}
			{multiline === true ? <textarea rows={3} {...shared} /> : <input type={inputType} {...shared} />}
		</label>
	);
}

export function Slider({ bind, label, min, max, step, unit, disabled, onDataChange }) {
	const initial = useInitial(bind);
	const write = useWriteBack(bind, onDataChange);
	const off = useDisabled() || disabled === true;
	const lo = typeof min === "number" ? min : 0;
	const hi = typeof max === "number" && max > lo ? max : lo + 100;
	const stepV = typeof step === "number" && step > 0 ? step : (hi - lo) / 100;
	const [value, setValue] = useState(typeof initial === "number" ? initial : lo);
	useExternalValue(bind, (next) => { if (typeof next === "number") setValue(next); });
	const suffix = typeof unit === "string" ? unit : "";
	const change = (event) => {
		const next = Number(event.target.value);
		setValue(next);
		write(next, { name: typeof label === "string" && label !== "" ? label : undefined, text: `${next}${suffix}` });
	};
	return (
		<div className="dsha2ui-field">
			{typeof label === "string" && label !== "" ? <span className="dsha2ui-field-label">{label}</span> : null}
			<div className="dsha2ui-slider" data-disabled={off || undefined}>
				<input type="range" min={lo} max={hi} step={stepV} value={value} onChange={change} disabled={off} />
				<span className="dsha2ui-slider-value">{value}{suffix}</span>
			</div>
		</div>
	);
}

/**
 * Conditional container. `value` is an engine-resolved binding ({"path": …});
 * shows children when the condition holds:
 *   equals — value === equals;  includes — array/string value contains it;
 *   notEmpty: true — value is a non-empty string/array/number.
 * With no condition props, truthiness of `value` decides.
 */
export function When({ value, equals, includes, notEmpty, children }) {
	let show;
	if (equals !== undefined) show = value === equals;
	else if (includes !== undefined) show = Array.isArray(value) ? value.includes(includes) : typeof value === "string" && value.includes(includes);
	else if (notEmpty === true) show = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== "";
	else show = Boolean(value);
	return show ? <div className="dsha2ui-when">{children}</div> : null;
}

export function Tabs({ tabs, bind, value, onDataChange, children }) {
	const write = useWriteBack(bind, onDataChange);
	const labels = Array.isArray(tabs) ? tabs.map((tab) => String(tab)) : [];
	const panes = Array.isArray(children) ? children : children !== undefined ? [children] : [];
	const [active, setActive] = useState(0);
	// Reverse binding: a resolved `value` ({"path"}) or an updated bind value
	// selects the matching pane, so a2ui_update can switch tabs.
	const external = typeof value === "string" ? value : null;
	useEffect(() => {
		if (external === null) return;
		const hit = labels.indexOf(external);
		if (hit >= 0) setActive(hit);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [external]);
	useExternalValue(bind, (next) => {
		const hit = labels.indexOf(String(next));
		if (hit >= 0) setActive(hit);
	});
	if (labels.length === 0) return <div className="dsha2ui-when">{children}</div>;
	const pick = (index) => {
		setActive(index);
		if (typeof bind === "string" && bind !== "") write(labels[index], { text: labels[index] });
	};
	return (
		<div className="dsha2ui-tabs">
			<div className="dsha2ui-tabs-bar" role="tablist">
				{labels.map((labelText, index) => (
					<button key={index} type="button" role="tab" aria-selected={index === active} className="dsha2ui-tab" data-active={index === active || undefined} onClick={() => pick(index)}>{labelText}</button>
				))}
			</div>
			<div className="dsha2ui-tabs-pane">{panes[active] ?? null}</div>
		</div>
	);
}

/**
 * Derived value: recomputes expr over engine-resolved numeric inputs and
 * writes the result at `out` (a bind path). Renders nothing by itself.
 */
export function Calc({ expr, inputs, out, digits, onDataChange }) {
	const write = useWriteBack(out, onDataChange);
	const scope = inputs !== null && typeof inputs === "object" ? inputs : {};
	// Rounding is DISPLAY-ONLY: with digits unset the full-precision value is
	// written, so chained Calcs (rate/1200 -> monthly -> interest) keep precision.
	const round = typeof digits === "number" && digits >= 0 && digits <= 8 ? Math.floor(digits) : null;
	const signature = Object.keys(scope).sort().map((key) => `${key}=${String(scope[key])}`).join(",") + "|" + String(expr);
	const lastRef = useRef(null);
	useEffect(() => {
		if (lastRef.current === signature) return;
		lastRef.current = signature;
		try {
			const fn = compileScopedExpression(String(expr), Object.keys(scope));
			const numericScope = {};
			for (const [key, value] of Object.entries(scope)) numericScope[key] = typeof value === "number" ? value : Number(value);
			const result = fn(numericScope);
			write(result === null ? null : round === null ? result : Number(result.toFixed(round)));
		} catch {
			write(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [signature]);
	return null;
}

const UPLOAD_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

export function Upload({ bind, label, max, required, disabled, onDataChange }) {
	const invalid = useRequired(bind ?? "uploads", required, label);
	const mirror = useContext(CardMirrorContext);
	const write = useWriteBack(bind ?? "uploads", onDataChange);
	const off = useDisabled() || disabled === true;
	const limit = typeof max === "number" && max >= 1 && max <= 6 ? Math.floor(max) : 3;
	const [files, setFiles] = useState([]);
	const inputRef = useRef(null);

	const sync = (next) => {
		setFiles(next);
		if (mirror !== null) mirror.uploads = next;
		write(next.map((file) => file.name), { name: typeof label === "string" && label !== "" ? label : "附件", text: next.map((file) => file.name).join("、") });
	};
	// Phone photos are routinely 5-10MB; downscale to <=1568px long edge and
	// re-encode as JPEG before base64-ing into the prompt (GIFs pass through
	// to keep animation).
	const MAX_EDGE = 1568;
	const loadOne = (file) => new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = () => {
			const dataUrl = String(reader.result);
			const asIs = () => {
				const comma = dataUrl.indexOf(",");
				resolve({ name: file.name, mediaType: UPLOAD_TYPES[file.type] !== undefined ? file.type : "image/png", data: dataUrl.slice(comma + 1), preview: dataUrl });
			};
			if (file.type === "image/gif") { asIs(); return; }
			const img = new window.Image();
			img.onload = () => {
				const scale = globalThis.Math.min(1, MAX_EDGE / globalThis.Math.max(img.width, img.height));
				if (scale === 1 && dataUrl.length < 700000) { asIs(); return; }
				try {
					const canvas = document.createElement("canvas");
					canvas.width = globalThis.Math.max(1, globalThis.Math.round(img.width * scale));
					canvas.height = globalThis.Math.max(1, globalThis.Math.round(img.height * scale));
					canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
					const out = canvas.toDataURL("image/jpeg", 0.85);
					resolve({ name: file.name.replace(/\.\w+$/, "") + ".jpg", mediaType: "image/jpeg", data: out.slice(out.indexOf(",") + 1), preview: out });
				} catch { asIs(); }
			};
			img.onerror = asIs;
			img.src = dataUrl;
		};
		reader.readAsDataURL(file);
	});
	const pick = (event) => {
		const chosen = [...event.target.files ?? []].slice(0, limit - files.length);
		event.target.value = "";
		if (chosen.length === 0) return;
		Promise.all(chosen.map(loadOne)).then((loaded) => sync([...files, ...loaded]));
	};
	return (
		<div className="dsha2ui-field">
			{typeof label === "string" && label !== "" ? <span className="dsha2ui-field-label">{label}</span> : null}
			<div className="dsha2ui-upload" data-invalid={invalid || undefined}>
				{files.map((file, index) => (
					<span key={index} className="dsha2ui-upload-item">
						<img src={file.preview} alt={file.name} />
						{!off ? <button type="button" className="dsha2ui-upload-x" aria-label="移除" onClick={() => sync(files.filter((_, i) => i !== index))}>✕</button> : null}
					</span>
				))}
				{files.length < limit && !off ? (
					<button type="button" className="dsha2ui-upload-add" onClick={() => inputRef.current?.click()}>＋<span>选择图片</span></button>
				) : null}
				<input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple style={{ display: "none" }} onChange={pick} />
			</div>
		</div>
	);
}

/** Suggested follow-up questions; a tap sends the question as the user's message. */
export function Suggestions({ items, onAction }) {
	const off = useDisabled();
	const list = Array.isArray(items) ? items.map((item) => String(item)).filter((item) => item !== "") : [];
	if (list.length === 0) return null;
	return (
		<div className="dsha2ui-suggest">
			{list.map((item, index) => (
				<button key={index} type="button" className="dsha2ui-suggest-chip" disabled={off}
					onClick={() => onAction?.("suggestion", { __label: item, __suggestion: item, __submit: false })}>{item}</button>
			))}
		</div>
	);
}

const ratePicked = (value) => typeof value === "number" && value > 0;

export function Rate({ bind, label, max, required, disabled, onDataChange }) {
	const invalid = useRequired(bind, required, label, ratePicked);
	const initial = useInitial(bind);
	const write = useWriteBack(bind, onDataChange);
	const off = useDisabled() || disabled === true;
	const total = typeof max === "number" && max >= 2 && max <= 10 ? Math.floor(max) : 5;
	const [value, setValue] = useState(typeof initial === "number" ? initial : 0);
	useExternalValue(bind, (next) => { if (typeof next === "number") setValue(next); });
	const [hover, setHover] = useState(0);
	const pick = (n) => {
		if (off) return;
		const next = n === value ? 0 : n;
		setValue(next);
		write(next, { name: typeof label === "string" && label !== "" ? label : undefined, text: next > 0 ? `${next}/${total}` : "" });
	};
	return (
		<div className="dsha2ui-field">
			{typeof label === "string" && label !== "" ? <span className="dsha2ui-field-label">{label}</span> : null}
			<div className="dsha2ui-rate" data-disabled={off || undefined} data-invalid={invalid || undefined} onMouseLeave={() => setHover(0)}>
				{Array.from({ length: total }, (_, index) => (
					<button
						key={index}
						type="button"
						className="dsha2ui-rate-star"
						data-on={(hover > 0 ? hover : value) > index || undefined}
						disabled={off}
						aria-label={`${index + 1}/${total}`}
						onClick={() => pick(index + 1)}
						onMouseEnter={() => { if (!off) setHover(index + 1); }}
					>★</button>
				))}
				<span className="dsha2ui-rate-num">{value > 0 ? `${value}/${total}` : ""}</span>
			</div>
		</div>
	);
}

export function Select({ options, bind, placeholder, multiple, maxAllowedSelections, required, disabled, label, onDataChange }) {
	const invalid = useRequired(bind, required, label);
	const initial = useInitial(bind);
	const write = useWriteBack(bind, onDataChange);
	const off = useDisabled() || disabled === true;
	const list = Array.isArray(options) ? options.filter((option) => option !== null && typeof option === "object") : [];
	const multi = multiple === true || (typeof maxAllowedSelections === "number" && maxAllowedSelections > 1);
	const max = multi && typeof maxAllowedSelections === "number" && maxAllowedSelections > 0 ? maxAllowedSelections : Infinity;
	const [selected, setSelected] = useState(() => {
		if (multi) return Array.isArray(initial) ? initial : [];
		return initial !== undefined && initial !== null && initial !== "" ? [initial] : [];
	});
	useExternalValue(bind, (value) => setSelected(multi ? (Array.isArray(value) ? value : []) : (value !== undefined && value !== null && value !== "" ? [value] : [])));
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const rootRef = useRef(null);

	useEffect(() => {
		if (!open) setQuery("");
	}, [open]);

	useEffect(() => {
		if (!open) return undefined;
		const onPointerDown = (event) => {
			if (rootRef.current !== null && !rootRef.current.contains(event.target)) setOpen(false);
		};
		const onKeyDown = (event) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	const valueOf = (option) => (option.value !== undefined ? option.value : option.label);
	const labelOf = (value) => {
		const hit = list.find((option) => valueOf(option) === value);
		return hit !== undefined && hit.label !== undefined ? String(hit.label) : String(value);
	};

	const commit = (next) => {
		setSelected(next);
		write(multi ? next : next[0] ?? "", {
			name: typeof label === "string" && label !== "" ? label : undefined,
			text: next.map(labelOf).join("、")
		});
	};

	const pick = (option) => {
		if (off || option.disabled === true) return;
		const value = valueOf(option);
		if (!multi) {
			commit(selected.length === 1 && selected[0] === value ? [] : [value]);
			setOpen(false);
			return;
		}
		if (selected.includes(value)) commit(selected.filter((item) => item !== value));
		else if (selected.length >= max) return;
		else commit([...selected, value]);
	};

	const display = selected.map(labelOf).join("、");
	return (
		<div className="dsha2ui-field" ref={rootRef} data-invalid={invalid || undefined}>
			{typeof label === "string" && label !== "" ? <span className="dsha2ui-field-label">{label}</span> : null}
			<div className="dsha2ui-select" data-open={open || undefined} data-disabled={off || undefined}>
				<button type="button" className="dsha2ui-select-trigger" disabled={off} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((prev) => !prev)}>
					<span className={display !== "" ? "dsha2ui-select-value" : "dsha2ui-select-placeholder"}>
						{display !== "" ? rich(display) : typeof placeholder === "string" && placeholder !== "" ? placeholder : "请选择"}
					</span>
					<span className="dsha2ui-select-arrow" aria-hidden>▾</span>
				</button>
				{open ? (
					<div className="dsha2ui-select-panel" role="listbox" aria-multiselectable={multi}>
						{list.length > 8 ? (
							<input
								className="dsha2ui-select-search"
								placeholder="搜索…"
								value={query}
								autoFocus
								onClick={(event) => event.stopPropagation()}
								onChange={(event) => setQuery(event.target.value)}
							/>
						) : null}
						{(query === "" ? list : list.filter((option) => `${option.label ?? ""}${option.description ?? ""}${option.value ?? ""}`.toLowerCase().includes(query.toLowerCase()))).map((option, index) => {
							const value = valueOf(option);
							const isSelected = selected.includes(value);
							const optionOff = option.disabled === true;
							return (
								<div
									key={index}
									className="dsha2ui-select-option"
									role="option"
									aria-selected={isSelected}
									aria-disabled={optionOff || undefined}
									data-selected={isSelected ? "true" : "false"}
									data-disabled={optionOff || undefined}
									onClick={() => pick(option)}
								>
									<span className="dsha2ui-select-mark">{isSelected ? "✓" : ""}</span>
									<span className="dsha2ui-select-texts">
										<span className="dsha2ui-option-label">{option.label !== undefined ? rich(option.label) : String(value)}</span>
										{typeof option.description === "string" && option.description !== "" ? <span className="dsha2ui-option-desc">{rich(option.description)}</span> : null}
									</span>
								</div>
							);
						})}
					</div>
				) : null}
			</div>
		</div>
	);
}

export function Wizard({ steps, children, submitLabel, onAction }) {
	const off = useDisabled();
	const labels = Array.isArray(steps) ? steps.map((step) => String(step)) : [];
	const panes = Array.isArray(children) ? children : children !== undefined ? [children] : [];
	const [current, setCurrent] = useState(0);
	if (labels.length === 0) return <div className="dsha2ui-when">{children}</div>;
	const last = current === labels.length - 1;
	return (
		<div className="dsha2ui-wizard">
			<Steps items={labels.map((title, index) => ({ title, status: index < current ? "done" : index === current ? "current" : "pending" }))} />
			<div className="dsha2ui-when">{panes[current] ?? null}</div>
			<div className="dsha2ui-wizard-nav">
				{current > 0 ? <button type="button" className="dsha2ui-btn" disabled={off} onClick={() => setCurrent(current - 1)}>上一步</button> : null}
				{!last ? <button type="button" className="dsha2ui-btn" data-variant="primary" disabled={off} onClick={() => setCurrent(current + 1)}>下一步</button>
					: <button type="button" className="dsha2ui-btn" data-variant="primary" disabled={off} onClick={() => onAction?.("wizard_submit", { __label: typeof submitLabel === "string" && submitLabel !== "" ? submitLabel : "提交" })}>{typeof submitLabel === "string" && submitLabel !== "" ? submitLabel : "提交"}</button>}
			</div>
		</div>
	);
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export function Calendar({ bind, label, min, max, range, required, disabled, onDataChange }) {
	const invalid = useRequired(bind, required, label);
	const initial = useInitial(bind);
	const write = useWriteBack(bind, onDataChange);
	const off = useDisabled() || disabled === true;
	const today = new Date();
	const parse = (value) => (typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value) : null);
	const ranged = range === true;
	const [span, setSpan] = useState(() => {
		if (ranged && Array.isArray(initial)) return { start: parse(initial[0]), end: parse(initial[1]) };
		return { start: ranged ? null : parse(initial), end: null };
	});
	const [view, setView] = useState(() => {
		const base = span.start ?? today;
		return { y: base.getFullYear(), m: base.getMonth() };
	});
	const fmt = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	useExternalValue(bind, (value) => {
		if (ranged && Array.isArray(value)) setSpan({ start: parse(value[0]), end: parse(value[1]) });
		else if (!ranged && typeof value === "string") setSpan({ start: parse(value), end: null });
	});
	const lo = parse(min);
	const hi = parse(max);
	const first = new Date(view.y, view.m, 1);
	const offset = (first.getDay() + 6) % 7;
	const cells = [];
	for (let i = 0; i < 42; i++) {
		const date = new Date(view.y, view.m, 1 - offset + i);
		cells.push(date);
	}
	const fieldName = typeof label === "string" && label !== "" ? label : "日期";
	const pick = (date) => {
		if (off) return;
		if (!ranged) {
			setSpan({ start: date, end: null });
			write(fmt(date), { name: fieldName, text: fmt(date) });
			return;
		}
		// Range: first tap sets the start, second completes (swapping if needed);
		// the value is written only once both ends are chosen.
		if (span.start === null || span.end !== null) {
			setSpan({ start: date, end: null });
			return;
		}
		const [s0, e0] = fmt(date) < fmt(span.start) ? [date, span.start] : [span.start, date];
		setSpan({ start: s0, end: e0 });
		write([fmt(s0), fmt(e0)], { name: fieldName, text: `${fmt(s0)} 至 ${fmt(e0)}` });
	};
	return (
		<div className="dsha2ui-field">
			{typeof label === "string" && label !== "" ? <span className="dsha2ui-field-label">{label}</span> : null}
			<div className="dsha2ui-calendar" data-invalid={invalid || undefined}>
				<div className="dsha2ui-calendar-head">
					<button type="button" onClick={() => setView((prev) => (prev.m === 0 ? { y: prev.y - 1, m: 11 } : { y: prev.y, m: prev.m - 1 }))}>‹</button>
					<span>{view.y} 年 {view.m + 1} 月{ranged && span.start !== null && span.end === null ? <span className="dsha2ui-calendar-hint">（选结束日期）</span> : null}</span>
					<button type="button" onClick={() => setView((prev) => (prev.m === 11 ? { y: prev.y + 1, m: 0 } : { y: prev.y, m: prev.m + 1 }))}>›</button>
				</div>
				<div className="dsha2ui-calendar-grid">
					{WEEKDAYS.map((day) => <span key={day} className="wd">{day}</span>)}
					{cells.map((date, index) => {
						const out = (lo !== null && fmt(date) < fmt(lo)) || (hi !== null && fmt(date) > fmt(hi));
						const key = fmt(date);
						const isSel = (span.start !== null && key === fmt(span.start)) || (span.end !== null && key === fmt(span.end));
						const inRange = span.start !== null && span.end !== null && key > fmt(span.start) && key < fmt(span.end);
						return (
							<button key={index} type="button" className="dsha2ui-calendar-day"
								data-selected={isSel || undefined}
								data-inrange={inRange || undefined}
								data-other={date.getMonth() !== view.m || undefined}
								disabled={off || out}
								onClick={() => pick(date)}>{date.getDate()}</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

export function RankList({ items, bind, label, disabled, onDataChange }) {
	const initial = useInitial(bind);
	const write = useWriteBack(bind, onDataChange);
	const off = useDisabled() || disabled === true;
	const source = Array.isArray(items) ? items.map((item) => String(item)) : [];
	const [order, setOrder] = useState(() => (Array.isArray(initial) && initial.length === source.length ? initial.map(String) : source));
	const move = (index, delta) => {
		if (off) return;
		const target = index + delta;
		if (target < 0 || target >= order.length) return;
		const next = [...order];
		[next[index], next[target]] = [next[target], next[index]];
		setOrder(next);
		write(next, { name: typeof label === "string" && label !== "" ? label : "排序", text: next.join(" > ") });
	};
	const dragFrom = useRef(null);
	const [dropAt, setDropAt] = useState(null);
	const drop = (target) => {
		const from = dragFrom.current;
		dragFrom.current = null;
		setDropAt(null);
		if (off || from === null || from === target) return;
		const next = [...order];
		const [moved] = next.splice(from, 1);
		next.splice(target, 0, moved);
		setOrder(next);
		write(next, { name: typeof label === "string" && label !== "" ? label : "排序", text: next.join(" > ") });
	};
	if (source.length === 0) return null;
	return (
		<div className="dsha2ui-field">
			{typeof label === "string" && label !== "" ? <span className="dsha2ui-field-label">{label}</span> : null}
			<div className="dsha2ui-ranklist">
				{order.map((item, index) => (
					<div
						key={item}
						className="dsha2ui-rank-item"
						draggable={!off}
						data-dragover={dropAt === index || undefined}
						onDragStart={(event) => { dragFrom.current = index; event.dataTransfer.effectAllowed = "move"; }}
						onDragOver={(event) => { event.preventDefault(); if (dropAt !== index) setDropAt(index); }}
						onDragLeave={() => { if (dropAt === index) setDropAt(null); }}
						onDrop={(event) => { event.preventDefault(); drop(index); }}
						onDragEnd={() => { dragFrom.current = null; setDropAt(null); }}
					>
						<span className="dsha2ui-rank-grip" aria-hidden>⠿</span>
						<span className="dsha2ui-rank-no">{index + 1}</span>
						<span className="dsha2ui-rank-label">{rich(item)}</span>
						<span className="dsha2ui-rank-btns">
							<button type="button" disabled={off || index === 0} onClick={() => move(index, -1)} aria-label="上移">↑</button>
							<button type="button" disabled={off || index === order.length - 1} onClick={() => move(index, 1)} aria-label="下移">↓</button>
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

export function Signature({ label, disabled, onDataChange }) {
	const mirror = useContext(CardMirrorContext);
	const off = useDisabled() || disabled === true;
	const canvasRef = useRef(null);
	const drawingRef = useRef(false);
	const [dirty, setDirty] = useState(false);
	const point = (event) => {
		// Map display coords into the canvas coordinate space: CSS max-width may
		// shrink the element, and the backing store is 2x for crisp strokes.
		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
	};
	const start = (event) => {
		if (off) return;
		drawingRef.current = true;
		const ctx = canvasRef.current.getContext("2d");
		const { x, y } = point(event);
		ctx.beginPath();
		ctx.moveTo(x, y);
		event.currentTarget.setPointerCapture?.(event.pointerId);
	};
	const draw = (event) => {
		if (!drawingRef.current) return;
		const ctx = canvasRef.current.getContext("2d");
		ctx.lineWidth = 4.4; // 2x backing store
		ctx.lineCap = "round";
		ctx.strokeStyle = "#1f2430";
		const { x, y } = point(event);
		ctx.lineTo(x, y);
		ctx.stroke();
		setDirty(true);
	};
	const finish = () => {
		if (!drawingRef.current) return;
		drawingRef.current = false;
		if (mirror !== null && canvasRef.current !== null) {
			const url = canvasRef.current.toDataURL("image/png");
			const comma = url.indexOf(",");
			mirror.uploads = [...(mirror.uploads ?? []).filter((file) => file.name !== "signature.png"), { name: "signature.png", mediaType: "image/png", data: url.slice(comma + 1), preview: url }];
		}
	};
	const clear = () => {
		const canvas = canvasRef.current;
		canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
		setDirty(false);
		if (mirror !== null) mirror.uploads = (mirror.uploads ?? []).filter((file) => file.name !== "signature.png");
	};
	return (
		<div className="dsha2ui-sign">
			{typeof label === "string" && label !== "" ? <span className="dsha2ui-field-label">{label}</span> : null}
			<canvas ref={canvasRef} width={840} height={280} style={{ width: "100%" }}
				onPointerDown={start} onPointerMove={draw} onPointerUp={finish} onPointerCancel={finish} />
			<div className="dsha2ui-sign-tools">
				<button type="button" className="dsha2ui-btn dsha2ui-btn-mini" disabled={off || !dirty} onClick={clear}>清除重签</button>
			</div>
		</div>
	);
}

export function EditableTable({ columns, rows, bind, label, disabled, onDataChange }) {
	const initial = useInitial(bind);
	const write = useWriteBack(bind, onDataChange);
	const off = useDisabled() || disabled === true;
	const cols = Array.isArray(columns) ? columns.map(String) : [];
	const seed = Array.isArray(initial) && initial.length > 0 ? initial : Array.isArray(rows) ? rows : [];
	const [grid, setGrid] = useState(() => seed.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
	const edit = (r, c, value) => {
		if (off) return;
		const next = grid.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row));
		setGrid(next);
		// The plain-language submission must carry the CELL CONTENT, not just
		// dimensions — serialize rows (capped) so the model reads what changed.
		let summary = next.map((row) => row.map((cell, i) => `${cols[i]}:${cell === "" ? "—" : cell}`).join("、")).join("\n");
		if (summary.length > 800) summary = `${summary.slice(0, 800)}…（共 ${next.length} 行）`;
		write(next, { name: typeof label === "string" && label !== "" ? label : "表格", text: summary });
	};
	if (cols.length === 0) return null;
	return (
		<div className="dsha2ui-field">
			{typeof label === "string" && label !== "" ? <span className="dsha2ui-field-label">{label}</span> : null}
			<div className="dsha2ui-tablewrap">
				<table className="dsha2ui-table dsha2ui-etable">
					<thead><tr>{cols.map((cell, index) => <th key={index}>{cell}</th>)}</tr></thead>
					<tbody>
						{grid.map((row, r) => (
							<tr key={r}>{cols.map((_, c) => (
								<td key={c}><input value={row[c] ?? ""} disabled={off} onChange={(event) => edit(r, c, event.target.value)} /></td>
							))}</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export const CATALOG = {
	Column,
	Row,
	Card,
	List,
	Grid,
	Text,
	Image,
	Divider,
	Tag,
	Button,
	CheckBox,
	MultipleChoice,
	Rate,
	Upload,
	Suggestions,
	Wizard,
	Calendar,
	RankList,
	Signature,
	EditableTable,
	Select,
	Slider,
	When,
	Tabs,
	Calc,
	TextField
};
