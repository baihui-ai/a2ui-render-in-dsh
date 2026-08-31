// Inline-math + inline-code rich text: any authored text may embed KaTeX
// with $...$ and code with `...`. Plain strings pass through untouched.
import katex from "katex";

function splitCode(segment, keyBase) {
	if (typeof segment !== "string" || !segment.includes("`")) return segment;
	const parts = segment.split(/`([^`]+)`/g);
	if (parts.length === 1) return segment;
	return parts.map((part, index) => (index % 2 === 1
		? <code key={`${keyBase}-c${index}`} className="dsha2ui-inline-code">{part}</code>
		: part));
}

export function rich(value) {
	if (value === undefined || value === null) return "";
	const text = String(value);
	const hasMath = text.includes("$");
	if (!hasMath && !text.includes("`")) return text;
	const parts = hasMath ? text.split(/\$([^$]+)\$/g) : [text];
	const out = parts.map((segment, index) => {
		if (index % 2 === 0) return splitCode(segment, index);
		// Not everything between dollar signs is math: "套餐 $30 和 $45" would
		// otherwise render "30 和" as KaTeX. Pure numbers/currency, or CJK text
		// without any LaTeX command, stay literal.
		if (/^[\d,.\s]+$/.test(segment) || (/[\u4e00-\u9fff]/.test(segment) && !segment.includes("\\"))) return splitCode(`$${segment}$`, index);
		let html;
		try {
			html = katex.renderToString(segment, { throwOnError: false, output: "htmlAndMathml" });
		} catch {
			return `$${segment}$`;
		}
		return <span key={index} className="dsha2ui-math" dangerouslySetInnerHTML={{ __html: html }} />;
	});
	return out.flat(2);
}
