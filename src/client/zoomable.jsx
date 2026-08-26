// Fullscreen viewing shell shared by Mermaid / Chart / Image: hover reveals an
// expand control; fullscreen (Fullscreen API, fixed-overlay fallback) adds
// wheel zoom and pointer panning when `zoom` is enabled. Esc/✕ exits.
import { useEffect, useRef, useState } from "react";

const SCALE_MIN = 0.2;
const SCALE_MAX = 10;

export function ZoomableFigure({ caption, zoom = true, fullHeightClass, extraTool, children }) {
	const boxRef = useRef(null);
	const [mode, setMode] = useState(null); // null | "fs" | "overlay"
	const [view, setView] = useState({ x: 0, y: 0, s: 1 });
	const dragRef = useRef(null);
	const active = mode !== null;

	// On entering fullscreen, scale the content up to fit ~85% of the viewport.
	const fitToViewport = () => {
		if (!zoom) return;
		requestAnimationFrame(() => {
			// Measure the content itself — the body stretches to the container.
			const body = boxRef.current?.querySelector(".dsha2ui-fig-body")?.firstElementChild;
			if (body === null || body === undefined) return;
			const width = body.offsetWidth ?? body.clientWidth;
			const height = body.offsetHeight ?? body.clientHeight;
			if (width <= 0 || height <= 0) return;
			const scale = Math.min((window.innerWidth * 0.85) / width, (window.innerHeight * 0.85) / height, 6);
			setView({ x: 0, y: 0, s: scale > 1 ? scale : 1 });
		});
	};

	useEffect(() => {
		const onChange = () => {
			const isSelf = document.fullscreenElement === boxRef.current;
			setMode((prev) => (isSelf ? "fs" : prev === "fs" ? null : prev));
			if (isSelf) fitToViewport();
			else setView({ x: 0, y: 0, s: 1 });
		};
		document.addEventListener("fullscreenchange", onChange);
		return () => document.removeEventListener("fullscreenchange", onChange);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [zoom]);

	// Esc exits the overlay fallback (the Fullscreen API handles its own Esc).
	useEffect(() => {
		if (mode !== "overlay") return undefined;
		const onKey = (event) => {
			if (event.key === "Escape") {
				setMode(null);
				setView({ x: 0, y: 0, s: 1 });
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [mode]);

	// Native wheel listener: React's synthetic wheel is passive, preventDefault would warn.
	useEffect(() => {
		const node = boxRef.current;
		if (node === null || !active || !zoom) return undefined;
		const onWheel = (event) => {
			event.preventDefault();
			setView((prev) => ({
				...prev,
				s: Math.min(SCALE_MAX, Math.max(SCALE_MIN, prev.s * Math.exp(-event.deltaY * 0.0015)))
			}));
		};
		node.addEventListener("wheel", onWheel, { passive: false });
		return () => node.removeEventListener("wheel", onWheel);
	}, [active, zoom]);

	const toggle = () => {
		const node = boxRef.current;
		if (node === null) return;
		if (mode === "fs") {
			document.exitFullscreen().catch(() => setMode(null));
		} else if (mode === "overlay") {
			setMode(null);
			setView({ x: 0, y: 0, s: 1 });
		} else if (typeof node.requestFullscreen === "function") {
			node.requestFullscreen().catch(() => {
				setMode("overlay");
				fitToViewport();
			});
		} else {
			setMode("overlay");
			fitToViewport();
		}
	};

	const onPointerDown = (event) => {
		if (!active || !zoom) return;
		dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
		event.currentTarget.setPointerCapture?.(event.pointerId);
	};
	const onPointerMove = (event) => {
		const drag = dragRef.current;
		if (drag === null || drag.id !== event.pointerId) return;
		const dx = event.clientX - drag.x;
		const dy = event.clientY - drag.y;
		dragRef.current = { id: drag.id, x: event.clientX, y: event.clientY };
		setView((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
	};
	const onPointerUp = (event) => {
		if (dragRef.current?.id === event.pointerId) dragRef.current = null;
	};

	return (
		<figure
			ref={boxRef}
			className={`dsha2ui-fig${mode === "overlay" ? " dsha2ui-fig-overlay" : ""}`}
			data-fs={active || undefined}
		>
			<span className="dsha2ui-fig-tools">
				{extraTool !== undefined && !active ? (
					<button type="button" className="dsha2ui-fig-expand" onClick={extraTool.onClick} title={extraTool.title}>{extraTool.icon}</button>
				) : null}
				<button type="button" className="dsha2ui-fig-expand" onClick={toggle} title={active ? "退出全屏 (Esc)" : "全屏查看"}>
					{active ? "✕" : "⛶"}
				</button>
			</span>
			<div
				className={`dsha2ui-fig-body${active && fullHeightClass !== undefined ? ` ${fullHeightClass}` : ""}`}
				style={active && zoom ? { transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`, cursor: "grab" } : undefined}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
				onDoubleClick={() => setView({ x: 0, y: 0, s: 1 })}
			>
				{children}
			</div>
			{typeof caption === "string" && caption !== "" && !active ? <figcaption className="dsha2ui-text-caption">{caption}</figcaption> : null}
		</figure>
	);
}
