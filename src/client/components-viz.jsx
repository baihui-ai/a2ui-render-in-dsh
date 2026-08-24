// Display-only visualization components for the A2UI catalog:
//   Chart   — ECharts option rendered verbatim (coordinate charts, pie, radar…)
//   Mermaid — Mermaid source (flowchart, mindmap, sequence, gantt, pie…)
//   Math    — KaTeX LaTeX formula
// None of these write to the data model; they coexist with interactive
// components on the same card.
import { useContext, useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import katex from "katex";
import "katex/dist/katex.min.css";
import { isDarkTheme } from "./theme.js";
import { ZoomableFigure } from "./zoomable.jsx";
import { compileExpression } from "./expr.js";
import { CardMirrorContext } from "./components.jsx";

function VizError({ message }) {
	return <div className="dsha2ui-viz-error">{message}</div>;
}

/**
 * Build the ECharts option for function-plot mode: sample each expression
 * densely across [xMin, xMax], breaking the line wherever the value leaves
 * the clipped y range (asymptotes) or the domain.
 */
function buildFunctionOption(functions, option, { xMin, xMax, samples, yClip }) {
	const lo = typeof xMin === "number" ? xMin : -10;
	const hi = typeof xMax === "number" && xMax > lo ? xMax : lo + 20;
	const count = Math.min(2000, Math.max(50, typeof samples === "number" ? Math.floor(samples) : 400));
	const clip = typeof yClip === "number" && yClip > 0 ? yClip : 10;
	const series = functions.map((entry) => {
		const expr = typeof entry === "string" ? entry : entry?.expr;
		const fn = compileExpression(expr); // throws on bad syntax; caught by caller
		const data = [];
		for (let index = 0; index <= count; index++) {
			const x = lo + ((hi - lo) * index) / count;
			const y = fn(x);
			data.push([x, y !== null && Math.abs(y) <= clip ? Number(y.toFixed(6)) : null]);
		}
		return {
			name: typeof entry?.name === "string" && entry.name !== "" ? entry.name : String(expr),
			type: "line",
			showSymbol: false,
			connectNulls: false,
			data
		};
	});
	const base = option !== null && typeof option === "object" ? option : {};
	return {
		backgroundColor: "transparent",
		tooltip: { trigger: "axis" },
		...functions.length > 1 ? { legend: {} } : {},
		...base,
		xAxis: { type: "value", min: lo, max: hi, ...typeof base.xAxis === "object" && !Array.isArray(base.xAxis) ? base.xAxis : {} },
		yAxis: { type: "value", min: -clip, max: clip, ...typeof base.yAxis === "object" && !Array.isArray(base.yAxis) ? base.yAxis : {} },
		series: [...series, ...Array.isArray(base.series) ? base.series : []]
	};
}

export function Chart({ option, height, width, functions, xMin, xMax, samples, yClip }) {
	const holder = useRef(null);
	const [error, setError] = useState(null);
	const functionMode = Array.isArray(functions) && functions.length > 0;

	useEffect(() => {
		const node = holder.current;
		if (node === null) return undefined;
		if (!functionMode && (option === null || typeof option !== "object")) return undefined;
		let chart;
		try {
			const resolved = functionMode
				? buildFunctionOption(functions, option, { xMin, xMax, samples, yClip })
				: { backgroundColor: "transparent", ...option };
			chart = echarts.init(node, isDarkTheme() ? "dark" : undefined);
			chart.setOption(resolved, true);
		} catch (err) {
			setError(String(err?.message ?? err));
			chart?.dispose();
			return undefined;
		}
		setError(null);
		let observer;
		if (typeof ResizeObserver !== "undefined") {
			observer = new ResizeObserver(() => chart.resize());
			observer.observe(node);
		}
		return () => {
			observer?.disconnect();
			chart.dispose();
		};
	}, [option, functions, xMin, xMax, samples, yClip, functionMode]);

	if (!functionMode && (option === null || typeof option !== "object")) return <VizError message="Chart: missing option" />;
	if (error !== null) return <VizError message={`Chart: ${error}`} />;
	return (
		<ZoomableFigure zoom={false} fullHeightClass="dsha2ui-fig-fill">
			<div ref={holder} className="dsha2ui-chart" style={{ height: height ?? 300, width: width ?? "100%" }} />
		</ZoomableFigure>
	);
}

let mermaidCounter = 0;

export function Mermaid({ code, caption }) {
	const [svg, setSvg] = useState(null);
	const [error, setError] = useState(null);
	const idRef = useRef(null);
	if (idRef.current === null) idRef.current = `dsha2ui-mmd-${++mermaidCounter}`;

	useEffect(() => {
		const source = typeof code === "string" ? code.trim() : "";
		if (source === "") return undefined;
		let cancelled = false;
		(async () => {
			try {
				const { default: mermaid } = await import("mermaid");
				mermaid.initialize({
					startOnLoad: false,
					securityLevel: "strict",
					theme: isDarkTheme() ? "dark" : "default"
				});
				const rendered = await mermaid.render(idRef.current, source);
				if (!cancelled) {
					setError(null);
					setSvg(rendered.svg);
				}
			} catch (err) {
				// mermaid can leave a partially built element behind on failure
				document.getElementById(`d${idRef.current}`)?.remove();
				document.getElementById(idRef.current)?.remove();
				if (!cancelled) setError(String(err?.message ?? err));
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [code]);

	if (typeof code !== "string" || code.trim() === "") return <VizError message="Mermaid: missing code" />;
	if (error !== null) return <VizError message={`Mermaid: ${error}`} />;
	if (svg === null) return <div className="dsha2ui-skeleton"><span className="dsha2ui-pulse">◇</span></div>;
	return (
		<ZoomableFigure caption={caption}>
			<div className="dsha2ui-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
		</ZoomableFigure>
	);
}

export function Video({ url, src, poster, loop, muted, autoplay }) {
	const source = typeof url === "string" && url !== "" ? url : src;
	if (typeof source !== "string" || source === "") return <VizError message="Video: missing url" />;
	return (
		<video
			className="dsha2ui-video"
			src={source}
			poster={typeof poster === "string" && poster !== "" ? poster : undefined}
			controls
			playsInline
			loop={loop === true}
			muted={muted === true || autoplay === true}
			autoPlay={autoplay === true}
		/>
	);
}

function MathFormula({ tex, block }) {
	const source = typeof tex === "string" ? tex : "";
	let html = null;
	let error = null;
	try {
		html = katex.renderToString(source, {
			displayMode: block === true,
			throwOnError: false,
			output: "htmlAndMathml"
		});
	} catch (err) {
		error = String(err?.message ?? err);
	}
	if (source === "") return <VizError message="Math: missing tex" />;
	if (error !== null) return <VizError message={`Math: ${error}`} />;
	const Tagname = block === true ? "div" : "span";
	return <Tagname className={block === true ? "dsha2ui-math-block" : "dsha2ui-math"} dangerouslySetInnerHTML={{ __html: html }} />;
}

const barGradient = (top, bottom) => ({
	type: "linear", x: 0, y: 0, x2: 0, y2: 1,
	colorStops: [{ offset: 0, color: top }, { offset: 1, color: bottom }]
});
const ANIM_FILL = {
	base: barGradient("#5b9cf5", "#1668dc"),
	highlight: barGradient("#f0a04b", "#d46b08"),
	sorted: barGradient("#7ab648", "#3c8618")
};

function animFrameData(frame, showLabels) {
	const highlight = new Set(Array.isArray(frame.highlight) ? frame.highlight : []);
	const sorted = new Set(Array.isArray(frame.sorted) ? frame.sorted : []);
	return frame.data.map((value, index) => ({
		value,
		itemStyle: {
			color: highlight.has(index) ? ANIM_FILL.highlight : sorted.has(index) ? ANIM_FILL.sorted : ANIM_FILL.base,
			borderRadius: [6, 6, 2, 2]
		},
		...showLabels === false ? {} : { label: { show: true, position: "top", fontWeight: 600 } }
	}));
}

/** Normalize one grid-mode frame into a list of {title?, data, read, write}. */
function animGrids(frame) {
	const raw = Array.isArray(frame.grids)
		? frame.grids
		: Array.isArray(frame.grid) ? [{ data: frame.grid, highlight: frame.highlight, accent: frame.accent }] : [];
	return raw
		.filter((grid) => grid !== null && typeof grid === "object" && Array.isArray(grid.data))
		.map((grid) => ({
			title: typeof grid.title === "string" ? grid.title : undefined,
			data: grid.data,
			read: new Set((Array.isArray(grid.highlight) ? grid.highlight : []).map(([r, c]) => `${r},${c}`)),
			write: new Set((Array.isArray(grid.accent) ? grid.accent : []).map(([r, c]) => `${r},${c}`))
		}));
}

function AnimGridFrame({ frame }) {
	const grids = animGrids(frame);
	if (grids.length === 0) return <VizError message="Anim: frame has no grid data" />;
	return (
		<div className="dsha2ui-anim-grids">
			{grids.map((grid, gridIndex) => {
				const cols = Math.max(1, ...grid.data.map((row) => (Array.isArray(row) ? row.length : 0)));
				return (
					<div key={gridIndex} className="dsha2ui-anim-grid">
						{grid.title !== undefined ? <div className="dsha2ui-anim-grid-title">{grid.title}</div> : null}
						<div className="dsha2ui-anim-grid-cells" style={{ gridTemplateColumns: `repeat(${cols}, minmax(34px, 52px))` }}>
							{grid.data.flatMap((row, r) => (Array.isArray(row) ? row : []).map((value, c) => (
								<span
									key={`${r}-${c}`}
									className="dsha2ui-anim-cell"
									data-state={grid.write.has(`${r},${c}`) ? "write" : grid.read.has(`${r},${c}`) ? "read" : undefined}
								>
									{value === null || value === undefined ? "" : String(value)}
								</span>
							)))}
						</div>
					</div>
				);
			})}
		</div>
	);
}

function AnimLegend({ kind }) {
	const items = kind === "grid"
		? [["#d46b08", "参与计算"], ["#3c8618", "写入结果"]]
		: [["#d46b08", "当前操作"], ["#3c8618", "已就位"]];
	return (
		<span className="dsha2ui-anim-legend">
			{items.map(([color, text]) => (
				<span key={text} className="dsha2ui-anim-legend-item">
					<span className="dsha2ui-anim-legend-dot" style={{ background: color }} />{text}
				</span>
			))}
		</span>
	);
}

export function Anim({ frames, interval, height, autoplay, labels }) {
	const holder = useRef(null);
	const chartRef = useRef(null);
	const mirror = useContext(CardMirrorContext);
	const list = Array.isArray(frames)
		? frames.filter((frame) => frame !== null && typeof frame === "object" && (Array.isArray(frame.data) || Array.isArray(frame.grid) || Array.isArray(frame.grids)))
		: [];
	const kind = list.length > 0 && (Array.isArray(list[0].grids) || Array.isArray(list[0].grid)) ? "grid" : "bars";
	const count = list.length;
	// Auto-play exactly once per card per tab: the conversation view can
	// unmount/remount this component (scrolling, stream updates), so the
	// "already auto-played" latch lives in sessionStorage, not component state.
	const latchKey = `${mirror?.animStorageKey ?? "dsh-a2ui:anim"}#${count}:${typeof list[0]?.note === "string" ? list[0].note.slice(0, 24) : ""}`;
	const alreadyPlayed = (() => {
		try {
			return sessionStorage.getItem(latchKey) === "1";
		} catch {
			return false;
		}
	})();
	const [index, setIndex] = useState(alreadyPlayed ? Math.max(0, count - 1) : 0);
	const [playing, setPlaying] = useState(autoplay !== false && !alreadyPlayed && count > 1);
	const stepMs = typeof interval === "number" && interval >= 100 ? interval : 800;

	useEffect(() => {
		if (!playing) return;
		try {
			sessionStorage.setItem(latchKey, "1");
		} catch {
			// storage unavailable — worst case the animation auto-plays again
		}
	}, [playing, latchKey]);

	useEffect(() => {
		const node = holder.current;
		if (node === null || count === 0 || kind !== "bars") return undefined;
		const peak = Math.max(...list.flatMap((frame) => frame.data.filter((v) => typeof v === "number")), 1);
		const chart = echarts.init(node, isDarkTheme() ? "dark" : undefined);
		chartRef.current = chart;
		chart.setOption({
			backgroundColor: "transparent",
			grid: { top: 28, bottom: 8, left: 8, right: 8, containLabel: true },
			xAxis: { type: "category", data: list[0].data.map((_, i) => String(i)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { show: false } },
			yAxis: { type: "value", show: false, max: peak * 1.15 },
			animationDurationUpdate: Math.min(stepMs * 0.6, 600),
			animationEasingUpdate: "cubicOut",
			series: [{ type: "bar", barCategoryGap: "25%", data: animFrameData(list[0], labels) }]
		});
		let observer;
		if (typeof ResizeObserver !== "undefined") {
			observer = new ResizeObserver(() => chart.resize());
			observer.observe(node);
		}
		return () => {
			observer?.disconnect();
			chart.dispose();
			chartRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [frames]);

	useEffect(() => {
		if (kind !== "bars") return;
		const frame = list[index];
		if (frame !== undefined) chartRef.current?.setOption({ series: [{ data: animFrameData(frame, labels) }] });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [index, frames, kind]);

	useEffect(() => {
		if (!playing || count <= 1) return undefined;
		const timer = setInterval(() => {
			setIndex((prev) => (prev + 1 < count ? prev + 1 : prev));
		}, stepMs);
		return () => clearInterval(timer);
	}, [playing, stepMs, count]);

	useEffect(() => {
		if (playing && index === count - 1 && count > 1) setPlaying(false);
	}, [index, playing, count]);

	if (count === 0) return <VizError message="Anim: missing frames" />;
	const frame = list[index];
	return (
		<ZoomableFigure zoom={false} fullHeightClass="dsha2ui-fig-fill">
			<div className="dsha2ui-anim">
				{kind === "bars"
					? <div ref={holder} className="dsha2ui-chart" style={{ height: height ?? 240, width: "100%" }} />
					: <div className="dsha2ui-anim-stage" style={{ minHeight: height ?? 160 }}><AnimGridFrame frame={frame} /></div>}
				<div className="dsha2ui-anim-progress"><span style={{ width: `${count > 1 ? (index / (count - 1)) * 100 : 100}%` }} /></div>
				<div className="dsha2ui-anim-note">
					<span className="dsha2ui-text-caption">{index + 1}/{count}</span>
					{typeof frame.note === "string" && frame.note !== "" ? <span className="dsha2ui-anim-note-text">{frame.note}</span> : null}
				</div>
				<div className="dsha2ui-anim-controls">
					<button type="button" className="dsha2ui-btn dsha2ui-btn-mini" onClick={() => { setPlaying(false); setIndex(0); }} title="重置">⏮</button>
					<button type="button" className="dsha2ui-btn dsha2ui-btn-mini" onClick={() => { setPlaying(false); setIndex((prev) => Math.max(0, prev - 1)); }} title="上一步">◀</button>
					<button type="button" className="dsha2ui-btn dsha2ui-btn-mini" data-variant="primary" onClick={() => {
						if (!playing && index === count - 1) setIndex(0);
						setPlaying((prev) => !prev);
					}} title={playing ? "暂停" : index === count - 1 && count > 1 ? "重新播放" : "播放"}>{playing ? "⏸" : index === count - 1 && count > 1 ? "↻" : "▶"}</button>
					<button type="button" className="dsha2ui-btn dsha2ui-btn-mini" onClick={() => { setPlaying(false); setIndex((prev) => Math.min(count - 1, prev + 1)); }} title="下一步">▶|</button>
					<AnimLegend kind={kind} />
				</div>
			</div>
		</ZoomableFigure>
	);
}

export const VIZ_CATALOG = { Chart, Mermaid, Math: MathFormula, Video, Anim };
