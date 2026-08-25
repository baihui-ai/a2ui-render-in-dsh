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
import { compileScopedExpression } from "./expr.js";
import { CardMirrorContext } from "./components.jsx";
import { rich } from "./richtext.jsx";

function VizError({ message }) {
	return <div className="dsha2ui-viz-error">{message}</div>;
}

/**
 * Build the ECharts option for function-plot mode: sample each expression
 * densely across [xMin, xMax], breaking the line wherever the value leaves
 * the clipped y range (asymptotes) or the domain.
 */
function buildFunctionOption(functions, option, options) {
	const { xMin, xMax, samples, yClip } = options;
	const lo = typeof xMin === "number" ? xMin : -10;
	const hi = typeof xMax === "number" && xMax > lo ? xMax : lo + 20;
	const count = Math.min(2000, Math.max(50, typeof samples === "number" ? Math.floor(samples) : 400));
	const clip = typeof yClip === "number" && yClip > 0 ? yClip : 10;
	const paramScope = {};
	if (options.params !== null && typeof options.params === "object") {
		for (const [key, value] of Object.entries(options.params)) {
			const num = typeof value === "number" ? value : Number(value);
			if (Number.isFinite(num)) paramScope[key] = num;
		}
	}
	const series = functions.map((entry) => {
		const expr = typeof entry === "string" ? entry : entry?.expr;
		const fn = compileScopedExpression(String(expr), ["x", ...Object.keys(paramScope)]); // throws on bad syntax; caught by caller
		const data = [];
		for (let index = 0; index <= count; index++) {
			const x = lo + ((hi - lo) * index) / count;
			const y = fn({ x, ...paramScope });
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

export function Chart({ option, height, width, functions, params, xMin, xMax, samples, yClip }) {
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
				? buildFunctionOption(functions, option, { xMin, xMax, samples, yClip, params })
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
	}, [option, functions, JSON.stringify(params), xMin, xMax, samples, yClip, functionMode]);

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

const GRAPH_NODE_FILL = { active: "#d46b08", done: "#3c8618", seen: "#5b9cf5" };
const GRAPH_EDGE_STROKE = { active: "#d46b08", done: "#3c8618" };

/** Circle-layout fallback when nodes carry no coordinates (0-100 viewBox). */
function graphLayout(nodes) {
	const placed = new Map();
	const free = nodes.filter((node) => typeof node.x !== "number" || typeof node.y !== "number");
	nodes.forEach((node) => {
		if (typeof node.x === "number" && typeof node.y === "number") placed.set(node.id, { x: node.x, y: node.y });
	});
	free.forEach((node, index) => {
		const angle = (2 * globalThis.Math.PI * index) / free.length - globalThis.Math.PI / 2;
		placed.set(node.id, { x: 50 + 38 * globalThis.Math.cos(angle), y: 50 + 38 * globalThis.Math.sin(angle) });
	});
	return placed;
}

function AnimGraphFrame({ frame, layout }) {
	const graph = frame.graph;
	const nodes = Array.isArray(graph?.nodes) ? graph.nodes.filter((n) => n !== null && typeof n === "object" && n.id !== undefined) : [];
	const edges = Array.isArray(graph?.edges) ? graph.edges.filter(Array.isArray) : [];
	if (nodes.length === 0) return <VizError message="Anim: frame has no graph nodes" />;
	return (
		<svg className="dsha2ui-anim-graph" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
			{edges.map((edge, index) => {
				const a = layout.get(edge[0]);
				const b = layout.get(edge[1]);
				if (a === undefined || b === undefined) return null;
				const stroke = GRAPH_EDGE_STROKE[edge[2]] ?? "var(--dsw-alias-border-l1, rgba(128,128,128,.45))";
				return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={edge[2] !== undefined ? 1.6 : 0.9} />;
			})}
			{nodes.map((node) => {
				const pos = layout.get(node.id);
				if (pos === undefined) return null;
				const fill = GRAPH_NODE_FILL[node.state];
				return (
					<g key={node.id}>
						<circle cx={pos.x} cy={pos.y} r="6.5" fill={fill ?? "var(--dsw-alias-bg-base, #fff)"} stroke={fill ?? "var(--dsw-alias-border-l1, rgba(128,128,128,.55))"} strokeWidth="1.1" style={{ transition: "fill .3s, stroke .3s" }} />
						<text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central" fontSize="4.6" fontWeight="600" fill={fill !== undefined ? "#fff" : "var(--dsw-alias-label-primary, #333)"}>{String(node.label ?? node.id)}</text>
					</g>
				);
			})}
		</svg>
	);
}

function AnimLegend({ kind }) {
	const items = kind === "grid"
		? [["#d46b08", "参与计算"], ["#3c8618", "写入结果"]]
		: kind === "graph"
			? [["#d46b08", "当前访问"], ["#5b9cf5", "已入队"], ["#3c8618", "已完成"]]
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
		? frames.filter((frame) => frame !== null && typeof frame === "object" && (Array.isArray(frame.data) || Array.isArray(frame.grid) || Array.isArray(frame.grids) || (frame.graph !== null && typeof frame.graph === "object")))
		: [];
	const kind = list.length > 0 && list[0].graph !== undefined && typeof list[0].graph === "object" ? "graph"
		: list.length > 0 && (Array.isArray(list[0].grids) || Array.isArray(list[0].grid)) ? "grid" : "bars";
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
	const graphLayoutRef = useRef(null);
	if (kind === "graph" && graphLayoutRef.current === null) {
		const merged = new Map();
		for (const frame of list) for (const node of frame.graph?.nodes ?? []) if (node?.id !== undefined && !merged.has(node.id)) merged.set(node.id, node);
		graphLayoutRef.current = graphLayout([...merged.values()]);
	}
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
					: <div className="dsha2ui-anim-stage" style={{ minHeight: height ?? 160, ...kind === "graph" ? { height: height ?? 300 } : {} }}>
						{kind === "graph" ? <AnimGraphFrame frame={frame} layout={graphLayoutRef.current} /> : <AnimGridFrame frame={frame} />}
					</div>}
				<div className="dsha2ui-anim-progress"><span style={{ width: `${count > 1 ? (index / (count - 1)) * 100 : 100}%` }} /></div>
				<div className="dsha2ui-anim-note">
					<span className="dsha2ui-text-caption">{index + 1}/{count}</span>
					{typeof frame.note === "string" && frame.note !== "" ? <span className="dsha2ui-anim-note-text">{rich(frame.note)}</span> : null}
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

export function Table({ columns, rows, caption }) {
	const cols = Array.isArray(columns) ? columns : [];
	let rowsInput = rows;
	// dictionary binding: rows: {source: {…datasets…}, pick: "<key>"} (both engine-resolved)
	if (rowsInput !== null && typeof rowsInput === "object" && !Array.isArray(rowsInput) && rowsInput.source !== undefined) {
		const source = rowsInput.source;
		const key = rowsInput.pick;
		rowsInput = source !== null && typeof source === "object" && key !== undefined ? source[String(key)] : undefined;
	}
	const data = Array.isArray(rowsInput) ? rowsInput.filter((row) => Array.isArray(row)) : [];
	if (cols.length === 0 && data.length === 0) return <VizError message="Table: missing columns/rows" />;
	return (
		<figure className="dsha2ui-tablefig">
			<div className="dsha2ui-tablewrap">
				<table className="dsha2ui-table">
					{cols.length > 0 ? (
						<thead><tr>{cols.map((cell, index) => <th key={index}>{cell === null || cell === undefined ? "" : String(cell)}</th>)}</tr></thead>
					) : null}
					<tbody>
						{data.map((row, r) => (
							<tr key={r}>{row.map((cell, c) => <td key={c}>{cell === null || cell === undefined ? "" : rich(cell)}</td>)}</tr>
						))}
					</tbody>
				</table>
			</div>
			{typeof caption === "string" && caption !== "" ? <figcaption className="dsha2ui-text-caption">{caption}</figcaption> : null}
		</figure>
	);
}

const STAT_TRENDS = { up: ["▲", "#3c8618"], down: ["▼", "#d4380d"] };

export function Stat({ label, value, unit, trend, hint }) {
	let trendNode = null;
	if (trend !== undefined && trend !== null && trend !== "") {
		const text = String(trend);
		const dir = text.startsWith("-") || text.startsWith("↓") ? "down" : "up";
		const [arrow, color] = STAT_TRENDS[dir];
		trendNode = <span className="dsha2ui-stat-trend" style={{ color }}>{arrow} {text.replace(/^[-+↑↓]/, "")}</span>;
	}
	return (
		<div className="dsha2ui-stat">
			<span className="dsha2ui-stat-label">{label === undefined ? "" : String(label)}</span>
			<span className="dsha2ui-stat-value">
				{value === undefined || value === null ? "—" : String(value)}
				{typeof unit === "string" && unit !== "" ? <span className="dsha2ui-stat-unit">{unit}</span> : null}
			</span>
			<span className="dsha2ui-stat-foot">
				{trendNode}
				{typeof hint === "string" && hint !== "" ? <span className="dsha2ui-text-caption">{hint}</span> : null}
			</span>
		</div>
	);
}

const STEP_STATES = new Set(["done", "current", "pending"]);

export function Steps({ items }) {
	const list = Array.isArray(items) ? items.filter((item) => item !== null && typeof item === "object") : [];
	if (list.length === 0) return <VizError message="Steps: missing items" />;
	return (
		<ol className="dsha2ui-steps">
			{list.map((item, index) => {
				const status = STEP_STATES.has(item.status) ? item.status : "pending";
				return (
					<li key={index} className="dsha2ui-step" data-status={status}>
						<span className="dsha2ui-step-dot">{status === "done" ? "✓" : index + 1}</span>
						<span className="dsha2ui-step-body">
							<span className="dsha2ui-step-title">{item.title === undefined ? `步骤 ${index + 1}` : rich(item.title)}</span>
							{typeof item.description === "string" && item.description !== "" ? <span className="dsha2ui-step-desc">{rich(item.description)}</span> : null}
						</span>
					</li>
				);
			})}
		</ol>
	);
}

const CODE_TOKEN_RULES = [
	[/(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g, "cmt"],
	[/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, "str"],
	[/\b(function|return|if|else|for|while|const|let|var|class|import|export|from|async|await|def|print|public|private|static|void|int|new|try|catch|throw|switch|case|break|continue|type|interface|extends|implements|None|True|False|null|undefined|true|false|self|this)\b/g, "kw"],
	[/\b(\d+(?:\.\d+)?)\b/g, "num"]
];

/** Lightweight language-agnostic token coloring: comments, strings, keywords, numbers. */
function highlightCode(source) {
	const marks = [];
	for (const [pattern, kind] of CODE_TOKEN_RULES) {
		for (const match of source.matchAll(pattern)) {
			const start = match.index, end = start + match[0].length;
			if (!marks.some((m) => start < m.end && end > m.start)) marks.push({ start, end, kind });
		}
	}
	marks.sort((a, b) => a.start - b.start);
	const parts = [];
	let cursor = 0;
	for (const mark of marks) {
		if (mark.start > cursor) parts.push(<span key={cursor}>{source.slice(cursor, mark.start)}</span>);
		parts.push(<span key={mark.start} className={`dsha2ui-tok-${mark.kind}`}>{source.slice(mark.start, mark.end)}</span>);
		cursor = mark.end;
	}
	if (cursor < source.length) parts.push(<span key={cursor}>{source.slice(cursor)}</span>);
	return parts;
}

export function CodeBlock({ code, language, title }) {
	const source = typeof code === "string" ? code.replace(/\n$/, "") : "";
	const [copied, setCopied] = useState(false);
	if (source === "") return <VizError message="CodeBlock: missing code" />;
	const lines = source.split("\n");
	const copy = () => {
		try {
			navigator.clipboard?.writeText(source);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch { /* clipboard unavailable */ }
	};
	return (
		<div className="dsha2ui-code">
			<div className="dsha2ui-code-bar">
				<span>{typeof title === "string" && title !== "" ? title : typeof language === "string" ? language : "code"}</span>
				<button type="button" className="dsha2ui-code-copy" onClick={copy}>{copied ? "✓ 已复制" : "复制"}</button>
			</div>
			<div className="dsha2ui-code-body">
				<pre className="dsha2ui-code-lines" aria-hidden>{lines.map((_, i) => `${i + 1}\n`).join("")}</pre>
				<pre className="dsha2ui-code-src"><code>{highlightCode(source)}</code></pre>
			</div>
		</div>
	);
}

export function Progress({ value, max, label, color }) {
	const total = typeof max === "number" && max > 0 ? max : 100;
	const current = typeof value === "number" ? Math.max(0, Math.min(total, value)) : 0;
	const percent = Math.round((current / total) * 100);
	return (
		<div className="dsha2ui-progress">
			<div className="dsha2ui-progress-head">
				{typeof label === "string" && label !== "" ? <span className="dsha2ui-field-label">{label}</span> : <span />}
				<span className="dsha2ui-progress-num">{percent}%</span>
			</div>
			<div className="dsha2ui-progress-track" role="progressbar" aria-valuenow={current} aria-valuemax={total}>
				<span style={{ width: `${percent}%`, ...typeof color === "string" ? { background: color } : {} }} />
			</div>
		</div>
	);
}

export function Timeline({ items }) {
	const list = Array.isArray(items) ? items.filter((item) => item !== null && typeof item === "object") : [];
	if (list.length === 0) return <VizError message="Timeline: missing items" />;
	return (
		<ol className="dsha2ui-timeline">
			{list.map((item, index) => (
				<li key={index} className="dsha2ui-timeline-item">
					<span className="dsha2ui-timeline-dot" style={typeof item.color === "string" ? { background: item.color, borderColor: item.color } : undefined} />
					<span className="dsha2ui-timeline-body">
						{item.time !== undefined ? <span className="dsha2ui-timeline-time">{String(item.time)}</span> : null}
						<span className="dsha2ui-step-title">{item.title === undefined ? "" : String(item.title)}</span>
						{typeof item.description === "string" && item.description !== "" ? <span className="dsha2ui-step-desc">{item.description}</span> : null}
					</span>
				</li>
			))}
		</ol>
	);
}

const ICON_PATHS = {
	check: "M4 12l5 5L20 6", x: "M6 6l12 12M18 6L6 18", plus: "M12 5v14M5 12h14", minus: "M5 12h14",
	warning: "M12 3L2 20h20L12 3zm0 7v4m0 3v.5", info: "M12 8v.5M12 11v5M12 21a9 9 0 100-18 9 9 0 000 18z",
	star: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7L12 3z",
	heart: "M12 20s-7-4.6-9-9c-1.3-3 .8-6.5 4-6.5 2 0 3.7 1.2 5 3 1.3-1.8 3-3 5-3 3.2 0 5.3 3.5 4 6.5-2 4.4-9 9-9 9z",
	calendar: "M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zm-1 5h16M8 3v4m8-4v4",
	clock: "M12 21a9 9 0 100-18 9 9 0 000 18zm0-13v5l3.5 2",
	location: "M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zm0-8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
	user: "M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9a8 8 0 0116 0",
	search: "M10.5 17a6.5 6.5 0 100-13 6.5 6.5 0 000 13zm5-1.5L21 21",
	settings: "M12 15a3 3 0 100-6 3 3 0 000 6zm8-3l1.8 1.2-1.7 3-2.1-.5a7 7 0 01-1.7 1l-.3 2.2h-3.5l-.3-2.2a7 7 0 01-1.7-1l-2.1.5-1.7-3L4 12l-1.8-1.2 1.7-3 2.1.5a7 7 0 011.7-1L8 5h3.5l.3 2.2a7 7 0 011.7 1l2.1-.5 1.7 3L20 12z",
	mail: "M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm0 1l8 6 8-6",
	phone: "M6 3h3l2 5-2.5 1.5a12 12 0 006 6L16 13l5 2v3a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2z",
	home: "M4 11l8-7 8 7v9a1 1 0 01-1 1h-5v-6h-4v6H5a1 1 0 01-1-1v-9z",
	file: "M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zm7 0v4h4",
	link: "M9 15l6-6m-8 3l-2 2a4 4 0 105.7 5.7l2-2m2.6-8.4l2-2a4 4 0 10-5.7-5.7l-2 2",
	download: "M12 3v11m0 0l-4-4m4 4l4-4M4 19h16", upload: "M12 21V10m0 0l-4 4m4-4l4 4M4 5h16",
	play: "M7 4l13 8-13 8V4z", music: "M9 18a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm0 0V5l11-2v12m0 0a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z",
	image: "M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm4 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-4 7l5-5 3 3 4-4 5 5",
	cart: "M4 5h2l2.4 10.5a1 1 0 001 .8h8.7a1 1 0 001-.8L21 8H7M10 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z",
	tag: "M4 4h7l9 9-7 7-9-9V4zm4 4v.5", gift: "M4 10h16v10a1 1 0 01-1 1H5a1 1 0 01-1-1V10zm-1-4h18v4H3V6zm9-3v18m0-18c-2 0-4 .5-4 2s2 1.5 4 1m0-3c2 0 4 .5 4 2s-2 1.5-4 1",
	trophy: "M8 4h8v6a4 4 0 11-8 0V4zm-4 1h4v3a4 4 0 01-4-3zm16 0h-4v3a4 4 0 004-3zM12 14v4m-4 3h8",
	fire: "M12 3s5 4 5 9a5 5 0 11-10 0c0-2 1-3.5 2-5 0 2 1 3 2 3 0-3 .5-5.5 1-7z",
	bolt: "M13 3L5 13h5l-1 8 8-11h-5l1-7z", sun: "M12 17a5 5 0 100-10 5 5 0 000 10zm0-15v2m0 16v2M3 12H1m22 0h-2M5.6 5.6L4.2 4.2m15.6 15.6l-1.4-1.4m0-12.8l1.4-1.4M5.6 18.4l-1.4 1.4",
	moon: "M20 14A8 8 0 1110 4a7 7 0 0010 10z", cloud: "M7 18a4 4 0 010-8 5.5 5.5 0 0110.7 1.5A3.5 3.5 0 0117 18H7z",
	"thumbs-up": "M7 11l4-8a2 2 0 012 2v4h5a2 2 0 012 2.4l-1.2 6A2 2 0 0116.8 19H7m0-8v8m0-8H4v8h3"
};

export function Icon({ name, size, color }) {
	const path = ICON_PATHS[name];
	if (path === undefined) return null;
	const px = typeof size === "number" && size >= 10 && size <= 96 ? size : 18;
	return (
		<svg className="dsha2ui-icon" width={px} height={px} viewBox="0 0 24 24" fill="none" stroke={typeof color === "string" ? color : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label={name}>
			<path d={path} />
		</svg>
	);
}

export function Audio({ url, src, title }) {
	const source = typeof url === "string" && url !== "" ? url : src;
	if (typeof source !== "string" || source === "") return <VizError message="Audio: missing url" />;
	return (
		<div className="dsha2ui-audio">
			{typeof title === "string" && title !== "" ? <span className="dsha2ui-field-label">{title}</span> : null}
			<audio controls src={source} style={{ width: "100%" }} />
		</div>
	);
}

export function Flashcard({ front, back, frontLabel, backLabel }) {
	const [flipped, setFlipped] = useState(false);
	return (
		<button type="button" className="dsha2ui-flashcard" data-flipped={flipped || undefined} onClick={() => setFlipped((prev) => !prev)}>
			<span className="dsha2ui-flashcard-tag">{flipped ? (backLabel ?? "答案") : (frontLabel ?? "点击翻面")}</span>
			<span className="dsha2ui-flashcard-text">{rich((flipped ? back : front) ?? "")}</span>
		</button>
	);
}

export function Countdown({ to, seconds, label }) {
	const targetRef = useRef(null);
	if (targetRef.current === null) {
		if (typeof to === "string" && !Number.isNaN(Date.parse(to.replace(" ", "T")))) targetRef.current = Date.parse(to.replace(" ", "T"));
		else if (typeof seconds === "number" && seconds > 0) targetRef.current = Date.now() + seconds * 1000;
		else targetRef.current = 0;
	}
	const [now, setNow] = useState(Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);
	if (targetRef.current === 0) return <VizError message="Countdown: missing to/seconds" />;
	const left = Math.max(0, Math.floor((targetRef.current - now) / 1000));
	const days = Math.floor(left / 86400);
	const pad = (n) => String(n).padStart(2, "0");
	const clock = `${pad(Math.floor((left % 86400) / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
	return (
		<div className="dsha2ui-countdown" data-done={left === 0 || undefined}>
			{typeof label === "string" && label !== "" ? <span className="dsha2ui-field-label">{label}</span> : null}
			<span className="dsha2ui-countdown-num">{days > 0 ? `${days} 天 ` : ""}{clock}</span>
		</div>
	);
}

export const VIZ_CATALOG = { Chart, Mermaid, Math: MathFormula, Video, Anim, Table, Stat, Steps, CodeBlock, Progress, Timeline, Icon, Audio, Flashcard, Countdown };
