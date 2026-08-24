// Build both halves of the plugin:
//   lib/index.js  — host cordis plugin (ESM, dsh packages external)
//   lib/client.js — browser bundle registered on window.__ModuleLoader__
//                   (react externals resolved by the dsh client module table;
//                    @ant-design/x-card is bundled in)
import { build, context } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const watch = process.argv.includes("--watch");

await mkdir(path.join(root, "lib"), { recursive: true });

const hostOptions = {
	entryPoints: [path.join(root, "src/host/index.js")],
	outfile: path.join(root, "lib/index.js"),
	bundle: true,
	format: "esm",
	platform: "node",
	target: "node20",
	external: ["@deepseek-ai/*"],
	logLevel: "info"
};

// Turn `import "katex/dist/katex.min.css"` into a JS style-injection module
// with the woff2 fonts inlined as data URIs (the plugin serves a single JS
// bundle, so the CSS cannot reference font files on disk).
const katexCssPlugin = {
	name: "katex-css-inline",
	setup(buildApi) {
		buildApi.onLoad({ filter: /katex(\.min)?\.css$/ }, async (loadArgs) => {
			const fontsDir = path.join(path.dirname(loadArgs.path), "fonts");
			let css = await readFile(loadArgs.path, "utf8");
			const fontCache = new Map();
			const inline = async (name) => {
				if (!fontCache.has(name)) {
					const data = await readFile(path.join(fontsDir, `${name}.woff2`));
					fontCache.set(name, `url(data:font/woff2;base64,${data.toString("base64")}) format("woff2")`);
				}
				return fontCache.get(name);
			};
			const srcPattern = /src:url\(fonts\/(KaTeX_[\w-]+)\.woff2\) format\("woff2"\)[^;}]*/g;
			const replacements = [];
			for (const match of css.matchAll(srcPattern)) replacements.push([match[0], `src:${await inline(match[1])}`]);
			for (const [from, to] of replacements) css = css.replace(from, to);
			const contents = `
				(function () {
					if (typeof document === "undefined") return;
					if (document.querySelector('style[data-plugin-css="dsh-a2ui/katex"]') !== null) return;
					var tag = document.createElement("style");
					tag.dataset.plugin = "dsh-a2ui";
					tag.dataset.pluginCss = "dsh-a2ui/katex";
					tag.textContent = ${JSON.stringify(css)};
					document.head.appendChild(tag);
				})();
			`;
			return { contents, loader: "js" };
		});
	}
};

const clientOptions = {
	entryPoints: [path.join(root, "src/client/index.jsx")],
	bundle: true,
	write: false,
	format: "cjs",
	platform: "browser",
	target: "es2022",
	jsx: "automatic",
	minify: true,
	external: ["react", "react-dom", "react/jsx-runtime"],
	define: { "process.env.NODE_ENV": "\"production\"" },
	plugins: [katexCssPlugin],
	logLevel: "info"
};

async function emitClient(outputFiles) {
	const code = outputFiles[0].text;
	const wrapped = `window.__ModuleLoader__.load({
	id: ${JSON.stringify(pkg.name)},
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
${code}
		return module.exports;
	}
});
`;
	await writeFile(path.join(root, "lib/client.js"), wrapped);
	console.log(`lib/client.js  ${(wrapped.length / 1024).toFixed(1)}kb`);
}

if (watch) {
	const hostCtx = await context(hostOptions);
	const clientCtx = await context({
		...clientOptions,
		plugins: [...clientOptions.plugins, {
			name: "emit-client",
			setup(buildApi) {
				buildApi.onEnd(async (result) => {
					if (result.errors.length === 0 && result.outputFiles !== undefined) await emitClient(result.outputFiles);
				});
			}
		}]
	});
	await Promise.all([hostCtx.watch(), clientCtx.watch()]);
	console.log("watching…");
} else {
	await build(hostOptions);
	const result = await build(clientOptions);
	await emitClient(result.outputFiles);
}
