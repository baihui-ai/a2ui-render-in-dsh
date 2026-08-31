// Bundle test/entry.jsx (jsx + katex css stub) and run it under node.
import { build } from "esbuild";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// The suite imports ../lib/index.js — make sure the host half is built.
try {
	await readFile(path.join(root, "lib/index.js"));
} catch {
	console.error("lib/index.js missing — run `npm run build` first");
	process.exit(1);
}

const result = await build({
	entryPoints: [path.join(root, "test/entry.jsx")],
	bundle: true,
	write: false,
	format: "esm",
	platform: "node",
	target: "node20",
	jsx: "automatic",
	external: ["jsdom"],
	define: { "process.env.NODE_ENV": "\"test\"" },
	plugins: [{
		name: "katex-css-stub",
		setup(api) {
			api.onLoad({ filter: /katex(\.min)?\.css$/ }, () => ({ contents: "/* css stubbed in tests */", loader: "js" }));
			// The built host must load from lib/ itself (it requires ../package.json
			// relative to its own location) — keep it external at an absolute path.
			api.onResolve({ filter: /\.\.\/lib\/index\.js$/ }, () => ({ path: path.join(root, "lib/index.js"), external: true }));
		}
	}],
	logLevel: "warning"
});

const outDir = path.join(root, "test/.build");
await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, "suite.mjs");
await writeFile(outFile, result.outputFiles[0].text);

const child = spawn(process.execPath, [outFile], { stdio: "inherit", cwd: root });
child.on("exit", (code) => process.exit(code ?? 1));
