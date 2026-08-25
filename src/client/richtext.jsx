// Inline-math rich text: any authored text may embed KaTeX with $...$.
// Returns the plain string untouched when no math is present, otherwise an
// array of text segments and rendered formula spans.
import katex from "katex";

export function rich(value) {
	if (value === undefined || value === null) return "";
	const text = String(value);
	if (!text.includes("$")) return text;
	const parts = text.split(/\$([^$]+)\$/g);
	if (parts.length === 1) return text;
	return parts.map((segment, index) => {
		if (index % 2 === 0) return segment;
		let html;
		try {
			html = katex.renderToString(segment, { throwOnError: false, output: "htmlAndMathml" });
		} catch {
			return `$${segment}$`;
		}
		return <span key={index} className="dsha2ui-math" dangerouslySetInnerHTML={{ __html: html }} />;
	});
}
