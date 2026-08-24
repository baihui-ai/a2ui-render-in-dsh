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
		onDataChange?.(path, value);
	};
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
	const content = text === undefined || text === null ? "" : String(text);
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

export function CheckBox({ label, bind, disabled, onDataChange }) {
	const initial = useInitial(bind);
	const write = useWriteBack(bind, onDataChange);
	const off = useDisabled() || disabled === true;
	const [checked, setChecked] = useState(initial === true);
	const toggle = (event) => {
		if (off) return;
		const next = event.target.checked;
		setChecked(next);
		write(next, { name: typeof label === "string" && label !== "" ? label : undefined, text: next ? "是" : "否" });
	};
	return (
		<label className="dsha2ui-check" data-disabled={off || undefined}>
			<input type="checkbox" checked={checked} onChange={toggle} disabled={off} />
			<span>{label === undefined ? "" : String(label)}</span>
		</label>
	);
}

export function MultipleChoice({ options, bind, maxAllowedSelections, disabled, onDataChange }) {
	const initial = useInitial(bind);
	const write = useWriteBack(bind, onDataChange);
	const off = useDisabled() || disabled === true;
	const [selected, setSelected] = useState(Array.isArray(initial) ? initial : []);
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
		<div className="dsha2ui-choice" role={single ? "radiogroup" : "group"}>
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
							<div className="dsha2ui-option-label">{option.label === undefined ? String(value) : String(option.label)}</div>
							{typeof option.description === "string" && option.description !== "" ? <div className="dsha2ui-option-desc">{option.description}</div> : null}
						</span>
					</div>
				);
			})}
		</div>
	);
}

export function TextField({ label, placeholder, multiline, bind, disabled, onDataChange }) {
	const initial = useInitial(bind);
	const write = useWriteBack(bind, onDataChange);
	const off = useDisabled() || disabled === true;
	const [text, setText] = useState(typeof initial === "string" ? initial : "");
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
	return (
		<label className="dsha2ui-field">
			{typeof label === "string" && label !== "" ? <span className="dsha2ui-field-label">{label}</span> : null}
			{multiline === true ? <textarea rows={3} {...shared} /> : <input type="text" {...shared} />}
		</label>
	);
}

export function Select({ options, bind, placeholder, multiple, maxAllowedSelections, disabled, label, onDataChange }) {
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
	const [open, setOpen] = useState(false);
	const rootRef = useRef(null);

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
		<div className="dsha2ui-field" ref={rootRef}>
			{typeof label === "string" && label !== "" ? <span className="dsha2ui-field-label">{label}</span> : null}
			<div className="dsha2ui-select" data-open={open || undefined} data-disabled={off || undefined}>
				<button type="button" className="dsha2ui-select-trigger" disabled={off} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((prev) => !prev)}>
					<span className={display !== "" ? "dsha2ui-select-value" : "dsha2ui-select-placeholder"}>
						{display !== "" ? display : typeof placeholder === "string" && placeholder !== "" ? placeholder : "请选择"}
					</span>
					<span className="dsha2ui-select-arrow" aria-hidden>▾</span>
				</button>
				{open ? (
					<div className="dsha2ui-select-panel" role="listbox" aria-multiselectable={multi}>
						{list.map((option, index) => {
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
										<span className="dsha2ui-option-label">{option.label !== undefined ? String(option.label) : String(value)}</span>
										{typeof option.description === "string" && option.description !== "" ? <span className="dsha2ui-option-desc">{option.description}</span> : null}
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
	Select,
	TextField
};
