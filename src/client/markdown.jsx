// Lightweight, injection-safe Markdown renderer: builds React elements
// directly (no innerHTML for text), covers headings, bold/italic, inline
// code, links, lists, quotes, fenced code, hr, paragraphs. Inline text runs
// through rich() so $...$ math works inside markdown too.
import { useState } from "react";
import { rich } from "./richtext.jsx";

function inline(text, keyBase) {
	const nodes = [];
	let rest = String(text);
	let key = 0;
	const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/;
	while (rest.length > 0) {
		const match = pattern.exec(rest);
		if (match === null) {
			nodes.push(<span key={`${keyBase}-${key++}`}>{rich(rest)}</span>);
			break;
		}
		if (match.index > 0) nodes.push(<span key={`${keyBase}-${key++}`}>{rich(rest.slice(0, match.index))}</span>);
		if (match[2] !== undefined) nodes.push(<strong key={`${keyBase}-${key++}`}>{inline(match[2], `${keyBase}b${key}`)}</strong>);
		else if (match[3] !== undefined) nodes.push(<em key={`${keyBase}-${key++}`}>{inline(match[3], `${keyBase}i${key}`)}</em>);
		else if (match[4] !== undefined) nodes.push(<code key={`${keyBase}-${key++}`}>{match[4]}</code>);
		else if (match[5] !== undefined) nodes.push(<a key={`${keyBase}-${key++}`} href={match[6]} target="_blank" rel="noopener noreferrer">{match[5]}</a>);
		rest = rest.slice(match.index + match[0].length);
	}
	return nodes;
}

export function Markdown({ text }) {
	// tolerate double-escaped newlines/tabs from model JSON
	const source = typeof text === "string" ? text.replaceAll("\\n", "\n").replaceAll("\\t", "\t") : "";
	if (source === "") return null;
	const lines = source.split("\n");
	const blocks = [];
	let index = 0;
	let key = 0;
	while (index < lines.length) {
		const line = lines[index];
		if (/^\s*$/.test(line)) { index++; continue; }
		if (line.startsWith("```")) {
			const buf = [];
			index++;
			while (index < lines.length && !lines[index].startsWith("```")) buf.push(lines[index++]);
			index++;
			blocks.push(<pre key={key++} className="dsha2ui-md-pre"><code>{buf.join("\n")}</code></pre>);
			continue;
		}
		const heading = /^(#{1,4})\s+(.*)$/.exec(line);
		if (heading !== null) {
			const level = heading[1].length;
			const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
			blocks.push(<Tag key={key++} className={`dsha2ui-md-h${level}`}>{inline(heading[2], `h${key}`)}</Tag>);
			index++;
			continue;
		}
		if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push(<hr key={key++} className="dsha2ui-divider" />); index++; continue; }
		if (/^\s*>\s?/.test(line)) {
			const buf = [];
			while (index < lines.length && /^\s*>\s?/.test(lines[index])) buf.push(lines[index++].replace(/^\s*>\s?/, ""));
			blocks.push(<blockquote key={key++} className="dsha2ui-md-quote">{inline(buf.join(" "), `q${key}`)}</blockquote>);
			continue;
		}
		const isUl = (value) => /^\s*[-*+]\s+/.test(value);
		const isOl = (value) => /^\s*\d+[.、)]\s+/.test(value);
		if (isUl(line) || isOl(line)) {
			const ordered = isOl(line);
			const items = [];
			while (index < lines.length && (ordered ? isOl(lines[index]) : isUl(lines[index]))) {
				items.push(lines[index].replace(ordered ? /^\s*\d+[.、)]\s+/ : /^\s*[-*+]\s+/, ""));
				index++;
			}
			const Tag = ordered ? "ol" : "ul";
			blocks.push(<Tag key={key++} className="dsha2ui-md-list">{items.map((item, i) => <li key={i}>{inline(item, `l${key}-${i}`)}</li>)}</Tag>);
			continue;
		}
		const buf = [line];
		index++;
		while (index < lines.length && !/^\s*$/.test(lines[index]) && !/^(#{1,4}\s|```|\s*[-*+]\s|\s*\d+[.、)]\s|\s*>)/.test(lines[index])) buf.push(lines[index++]);
		blocks.push(<p key={key++} className="dsha2ui-md-p">{inline(buf.join(" "), `p${key}`)}</p>);
	}
	return <MdShell source={source}>{blocks}</MdShell>;
}

function MdShell({ source, children }) {
	const [copied, setCopied] = useState(false);
	const copy = () => {
		try {
			navigator.clipboard?.writeText(source);
			setCopied(true);
			setTimeout(() => setCopied(false), 1200);
		} catch { /* clipboard unavailable */ }
	};
	return (
		<div className="dsha2ui-md-wrap">
			<button type="button" className="dsha2ui-copy-mini dsha2ui-md-copy" onClick={copy} title="复制原文">{copied ? "✓" : "复制"}</button>
			<div className="dsha2ui-md">{children}</div>
		</div>
	);
}
