// Detect whether the surrounding dsh theme is dark. dsh paints the page
// background through --dsw-* tokens, so the body's computed background is the
// most reliable signal; fall back to the OS preference.
export function isDarkTheme() {
	try {
		const bg = getComputedStyle(document.body).backgroundColor;
		const match = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(bg);
		if (match !== null) {
			const [, r, g, b] = match;
			const luminance = 0.2126 * Number(r) + 0.7152 * Number(g) + 0.0722 * Number(b);
			return luminance < 128;
		}
	} catch {
		// jsdom or a detached document — fall through
	}
	try {
		return window.matchMedia("(prefers-color-scheme: dark)").matches;
	} catch {
		return false;
	}
}
